// data/posts.json → каталог (data/catalog.json), история цен (data/history.json) и сайт (dist/).
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { CATEGORIES, parseCatalog } from '../src/parse.mjs';
import { categoryPage, homePage, modelPage, notFoundPage, regionLabel, searchPage, variantParts, when } from '../src/render.mjs';

const root = new URL('..', import.meta.url);
const read = async (p, fallback) => JSON.parse(await readFile(new URL(p, root), 'utf8').catch(() => fallback));
const write = async (p, s) => {
  const url = new URL(p, root);
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, s);
};

const config = await read('site.config.json');
// Тестовая копия (GitHub Pages): APPLESHOP_PREVIEW_URL — её адрес; закрыта от поисковиков, чтобы не спорить с боевым доменом.
const preview = process.env.APPLESHOP_PREVIEW_URL || '';
const store = await read('data/posts.json');
const now = new Date(process.env.BUILD_NOW || Date.now());
const { products, info } = parseCatalog(store.posts, config, now);
if (products.length < 50) throw new Error(`В каталоге всего ${products.length} позиций — прайс в канале не разобрался, сайт не обновляю`);

// Часы работы — из подписи постов («148 Работаем до 20:30»).
const sign = store.posts.map((p) => p.author).find((a) => /работаем/i.test(a || ''));
if (sign) info.hours = sign.replace(/^\d+\s*/, '');

// История цен: запись добавляется, только когда цена или наличие изменились.
const history = await read('data/history.json', '{}');
history.createdAt ||= now.toISOString();
history.items ||= {};
const t = now.toISOString();
const current = new Set(products.map((p) => p.id));
for (const p of products) {
  const rec = (history.items[p.id] ||= []);
  const last = rec.at(-1);
  if (!last || last.gone || last.p !== p.price || !!last.out !== !p.inStock) rec.push({ t, p: p.price, ...(p.inStock ? {} : { out: 1 }) });
}
for (const [id, rec] of Object.entries(history.items)) if (!current.has(id) && !rec.at(-1).gone) rec.push({ t, gone: 1 });

const WEEK = 7 * 864e5;
for (const p of products) {
  const rec = history.items[p.id].filter((r) => !r.gone);
  const cur = rec.at(-1);
  const prev = rec.slice(0, -1).reverse().find((r) => r.p !== cur.p);
  if (prev && now - new Date(cur.t) < WEEK) p.change = cur.p - prev.p;
}

// Модели = страницы сайта.
const models = [];
for (const p of products) {
  let m = models.find((x) => x.slug === p.modelSlug);
  if (!m) models.push((m = { slug: p.modelSlug, name: p.model, category: p.category, brand: brandOf(p.model), variants: [], posts: [] }));
  m.variants.push(p);
  if (!m.posts.includes(p.source.post)) m.posts.push(p.source.post);
}
for (const m of models) {
  m.variants.sort((a, b) => (a.variant.storage || 0) - (b.variant.storage || 0) || (a.variant.size || '').localeCompare(b.variant.size || '') || a.price - b.price);
  const live = m.variants.filter((v) => v.inStock);
  m.inStock = live.length > 0;
  m.min = Math.min(...(live.length ? live : m.variants).map((v) => v.price));
  m.max = Math.max(...(live.length ? live : m.variants).map((v) => v.price));
  const changed = m.posts.map((id) => store.posts.find((x) => x.id === id)?.changedAt).filter(Boolean).sort().at(-1);
  m.updated = changed || store.fetchedAt;
}
const categories = CATEGORIES.filter((c) => models.some((m) => m.category === c.slug)).map(({ slug, name }) => ({ slug, name }));

function brandOf(model) {
  if (/^(iPhone|iPad|Apple|AirPods|Наушник|Кейс AirPods|Амбушюры|Magic Mouse|Адаптер питания Apple)/.test(model)) return 'Apple';
  if (/^Samsung/.test(model)) return 'Samsung';
  if (/^Google/.test(model)) return 'Google';
  if (/^(PlayStation)/.test(model)) return 'Sony';
  if (/^(Xiaomi|Redmi|POCO)/.test(model)) return 'Xiaomi';
  if (/^Яндекс/.test(model)) return 'Яндекс';
  if (/^Защитное стекло Remax/.test(model)) return 'Remax';
  return model.split(' ')[0];
}

const lastChange = store.posts.filter((p) => !p.removed && p.changedAt).map((p) => p.changedAt).sort().at(-1) || store.fetchedAt;
const meta = { now, checked: when(store.fetchedAt, now), changed: when(lastChange, now) };
const updatePost = store.posts.filter((p) => !p.removed && /обновили наличие/i.test(p.text || '')).at(-1);
const updates = {
  when: updatePost ? when(updatePost.date, now) : '',
  items: updatePost ? products.filter((p) => p.source.post === updatePost.id) : [],
};

// Каталог для поиска на сайте и для истории в git.
const catalog = products.map((p) => ({
  id: p.id, s: p.modelSlug, m: p.model, c: p.category, v: variantParts(p.variant).join(' · '),
  r: regionLabel(p.regions), p: p.price, o: p.inStock ? 0 : 1, h: p.variant.colorHex || '',
}));
await write('data/catalog.json', JSON.stringify({ updatedAt: lastChange, products }, null, 1) + '\n');
await write('data/history.json', JSON.stringify(history) + '\n');

// Сайт.
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(new URL('assets/fonts/', dist), { recursive: true });
await cp(new URL('src/site.css', root), new URL('assets/site.css', dist));
await cp(new URL('src/site.js', root), new URL('assets/site.js', dist));
await cp(new URL('src/favicon.svg', root), new URL('assets/favicon.svg', dist));
for (const [pkg, name] of [['geologica', 'geologica'], ['onest', 'onest']])
  for (const subset of ['cyrillic', 'latin'])
    await cp(new URL(`node_modules/@fontsource-variable/${pkg}/files/${name}-${subset}-wght-normal.woff2`, root), new URL(`assets/fonts/${name}-${subset}.woff2`, dist));

const ctx = { config, noindex: !!preview, categories, models, products, meta, info, updates };
const basePath = new URL(preview || config.siteUrl || 'http://x/').pathname.replace(/\/?$/, '/');
await write('dist/index.html', homePage({ ...ctx, base: '' }));
await write('dist/search/index.html', searchPage({ ...ctx, base: '../' }));
await write('dist/404.html', notFoundPage({ ...ctx, base: basePath }));
for (const c of categories) await write(`dist/c/${c.slug}/index.html`, categoryPage({ ...ctx, base: '../../' }, c));
for (const m of models) await write(`dist/p/${m.slug}/index.html`, modelPage({ ...ctx, base: '../../' }, m));
await write('dist/catalog.json', JSON.stringify(catalog));

const site = (config.siteUrl || '').replace(/\/$/, '');
if (site) {
  const urls = ['/', ...categories.map((c) => `/c/${c.slug}/`), ...models.map((m) => `/p/${m.slug}/`)];
  await write('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${site}${u}</loc><lastmod>${lastChange.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
}
await write('dist/robots.txt', preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`);

console.log(`каталог: ${products.length} позиций, ${models.length} моделей, ${categories.length} разделов → dist/`);
