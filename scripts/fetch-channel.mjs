// Забирает посты канала в data/posts.json.
// Источник 1 — веб-версия канала t.me/s/<канал> (видны все посты и их текущий текст после правок).
// Источник 2 — события бота (getUpdates), если задан APPLESHOP_TELEGRAM_BOT_TOKEN: даёт текст постов,
// которые веб-версия не показывает («Please open Telegram to view this post»).
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = new URL('..', import.meta.url);
const config = JSON.parse(await readFile(new URL('site.config.json', root), 'utf8'));
const postsFile = new URL('data/posts.json', root);
const stateFile = new URL('data/bot-state.json', root);

// curl, а не fetch: так работают и прокси окружения, и раннер GitHub Actions без зависимостей.
async function get(url) {
  const { stdout } = await run('curl', ['-sS', '-f', '-m', '30', '--retry', '3', '--retry-all-errors', url], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

const decode = (s) =>
  s
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');

function parsePage(html) {
  const out = [];
  for (const chunk of html.split('<div class="tgme_widget_message_wrap').slice(1)) {
    const id = +(chunk.match(/data-post="[^/"]+\/(\d+)"/) || [])[1];
    if (!id) continue;
    const date = (chunk.match(/<time datetime="([^"]+)"/) || [])[1] || null;
    const m = chunk.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const text = m ? decode(m[1]).trim() : '';
    const hidden = chunk.includes('tgme_widget_message_media_not_supported') || chunk.includes('Please open Telegram');
    const author = (chunk.match(/tgme_widget_message_from_author"[^>]*>([^<]*)</) || [])[1] || '';
    out.push({ id, date, edited: /&nbsp;edited\b/.test(chunk), author: decode(author).trim(), text, hidden });
  }
  return out;
}

async function scrapeWeb() {
  const seen = new Map();
  let before = '';
  for (let page = 0; page < 200; page++) {
    const html = await get(`https://t.me/s/${config.channel}${before ? `?before=${before}` : ''}`);
    const posts = parsePage(html);
    if (!posts.length) break;
    let fresh = 0;
    for (const p of posts) if (!seen.has(p.id)) (seen.set(p.id, p), fresh++);
    const first = Math.min(...posts.map((p) => p.id));
    if (!fresh || first <= 1 || String(first) === before) break;
    before = String(first);
  }
  return [...seen.values()];
}

async function botUpdates() {
  const token = process.env.APPLESHOP_TELEGRAM_BOT_TOKEN;
  if (!token) return [];
  const state = JSON.parse(await readFile(stateFile, 'utf8').catch(() => '{}'));
  const allowed = encodeURIComponent(JSON.stringify(['channel_post', 'edited_channel_post']));
  const res = JSON.parse(await get(`https://api.telegram.org/bot${token}/getUpdates?offset=${state.offset || 0}&allowed_updates=${allowed}`));
  if (!res.ok) throw new Error(`getUpdates: ${res.description}`);
  const out = [];
  for (const u of res.result) {
    const msg = u.channel_post || u.edited_channel_post;
    if (msg && msg.chat.id === config.channelId) {
      out.push({
        id: msg.message_id,
        date: new Date(msg.date * 1000).toISOString(),
        editedAt: msg.edit_date ? new Date(msg.edit_date * 1000).toISOString() : null,
        text: msg.text || msg.caption || '',
      });
    }
    state.offset = u.update_id + 1;
  }
  await writeFile(stateFile, JSON.stringify(state, null, 2) + '\n');
  return out;
}

const store = JSON.parse(await readFile(postsFile, 'utf8').catch(() => '{"posts":[]}'));
const byId = new Map(store.posts.map((p) => [p.id, p]));
const now = new Date().toISOString();

const web = await scrapeWeb();
if (!web.length) throw new Error(`t.me/s/${config.channel}: не найдено ни одного поста — разметка страницы изменилась?`);
const webIds = new Set(web.map((p) => p.id));

for (const p of web) {
  const old = byId.get(p.id);
  // Пост, скрытый в веб-версии, сохраняет текст, полученный ботом.
  const text = p.hidden && old?.source === 'bot' ? old.text : p.text;
  byId.set(p.id, {
    ...old,
    id: p.id,
    date: p.date,
    edited: p.edited,
    author: p.author,
    hidden: p.hidden,
    text,
    source: text === p.text ? 'web' : 'bot',
    removed: false,
    changedAt: old && old.text === text ? old.changedAt : now,
  });
}
// Полный обход прошёл — пост, которого нет в веб-версии, удалён из канала.
for (const p of byId.values()) if (!webIds.has(p.id)) p.removed = true;

for (const p of await botUpdates()) {
  const old = byId.get(p.id) || {};
  byId.set(p.id, { ...old, ...p, source: 'bot', removed: false, changedAt: old.text === p.text ? old.changedAt : now });
}

const posts = [...byId.values()].sort((a, b) => a.id - b.id);
await writeFile(postsFile, JSON.stringify({ channel: config.channel, fetchedAt: now, posts }, null, 2) + '\n');
console.log(`posts: ${posts.length} (в канале ${posts.filter((p) => !p.removed).length}, скрытых в веб-версии ${posts.filter((p) => p.hidden && !p.removed).length})`);
