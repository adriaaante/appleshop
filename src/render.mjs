// HTML-шаблоны страниц. Все ссылки относительные (base = путь до корня), чтобы сайт работал
// и на домене, и в подпапке (GitHub Pages), и при открытии файлов локально.
import { deviceKind, deviceSvg } from './devices.mjs';
import { REGIONS } from './parse.mjs';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = new Intl.NumberFormat('ru-RU');
export const rub = (n) => `${nf.format(n)}\u00a0₽`;
const gb = (n) => (n >= 1024 ? `${n / 1024}\u00a0ТБ` : `${n}\u00a0ГБ`);
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
export const count = (n, one, few, many) => `${nf.format(n)}\u00a0${plural(n, one, few, many)}`;

const tz = 'Europe/Moscow';
export function when(iso, now) {
  const d = new Date(iso);
  const day = (x) => x.toLocaleDateString('ru-RU', { timeZone: tz });
  const time = d.toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  if (day(d) === day(now)) return `сегодня в\u00a0${time}`;
  if (day(d) === day(new Date(now - 864e5))) return `вчера в\u00a0${time}`;
  return `${d.toLocaleDateString('ru-RU', { timeZone: tz, day: 'numeric', month: 'long' })} в\u00a0${time}`;
}

// Подпись варианта: «256 ГБ · Burgundy · Только eSIM»
export function variantParts(v) {
  return [
    v.ram && v.storage ? `${v.ram}/${gb(v.storage).replace('\u00a0', '\u00a0')}` : v.storage && gb(v.storage),
    v.size, v.network, v.color, v.band && `ремешок ${v.band}`, v.glass, v.sim, v.year && `${v.year}\u00a0г.`,
    v.revision, v.code && `модель ${v.code}`, v.compat && `для ${v.compat}`,
  ].filter(Boolean);
}

export const regionLabel = (codes) => codes.map((c) => REGIONS[c] || c).join(', ');
const flagEmoji = (code) => (code === 'EU' ? '🇪🇺' : String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)));

function regionChip(codes) {
  if (!codes.length) return '';
  return `<span class="region" title="Версия для рынка: ${esc(regionLabel(codes))}">${codes.map((c) => `<b>${esc(c)}</b>`).join('')}<span>${esc(regionLabel(codes))}</span></span>`;
}

function head({ title, description, base, canonical, jsonld, config }) {
  const metrika = config.metrikaId
    ? `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${+config.metrikaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script>`
    : '';
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="ru_RU">
<meta name="theme-color" content="#eceef1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d1014" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}assets/fonts/geologica-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
${metrika}
</head>`;
}

function header({ base, config, categories, current }) {
  return `<a class="skip" href="#main">К содержимому</a>
<header class="top">
  <div class="top-row wrap">
    <a class="brand" href="${base}" aria-label="${esc(config.brand)} — на главную">${brandMark(config.brand)}</a>
    <form class="search" action="${base}search/" role="search">
      <label class="sr" for="q">Поиск по каталогу</label>
      <input id="q" name="q" type="search" autocomplete="off" placeholder="Модель, память, цвет" data-base="${base}">
      <div class="suggest" id="suggest" hidden></div>
    </form>
    <a class="tg-link" href="${esc(contactUrl(config))}" target="_blank" rel="noopener">${tgIcon}<span>Написать</span></a>
  </div>
  <nav class="cats wrap" aria-label="Разделы каталога">
    ${categories.map((c) => `<a href="${base}c/${c.slug}/"${c.slug === current ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('')}
  </nav>
</header>`;
}

// Знак «Кнопочки»: четыре клавиши, одна нажата (акцентом и ниже остальных).
const keysMark = `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="19" height="19" rx="6"/><rect x="26" y="3" width="19" height="19" rx="6"/><rect x="3" y="26" width="19" height="19" rx="6"/><rect class="pressed" x="26" y="29" width="19" height="16" rx="6"/></svg>`;

function brandMark(brand) {
  return `${keysMark}<span class="brand-name">${esc(brand.toLowerCase())}</span>`;
}

const tgIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M21.4 4.6 2.9 11.7c-1 .4-1 1.6 0 1.9l4.6 1.5 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.4 4.6 3.4c.7.5 1.7.1 1.9-.8l3.1-15.2c.2-1-.9-1.8-1.8-1.4zM9.6 14.5l-.4 4-1.4-4.4 10-6.4z" fill="currentColor"/></svg>`;

export function contactUrl(config) {
  const tg = (config.contacts.telegram || '').replace(/^@|^https?:\/\/t\.me\//, '');
  return tg ? `https://t.me/${tg}` : `https://t.me/${config.channel}`;
}

function footer({ base, config, info, categories, meta }) {
  const c = config.contacts;
  const lines = [
    c.address && `<p>${esc(c.address)}</p>`,
    c.phone && `<p><a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a></p>`,
    `<p><a href="${esc(contactUrl(config))}" target="_blank" rel="noopener">${c.telegram ? esc('@' + c.telegram.replace(/^@/, '')) : 'Telegram-канал @' + esc(config.channel)}</a></p>`,
    (c.hours || info.hours) && `<p>${esc(c.hours || info.hours)}</p>`,
  ].filter(Boolean);
  return `<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="brand" href="${base}">${brandMark(config.brand)}</a>${lines.join('')}</div>
    <nav aria-label="Каталог">${categories.map((x) => `<a href="${base}c/${x.slug}/">${esc(x.name)}</a>`).join('')}</nav>
    <div class="foot-note"><p>Цены и наличие берутся из канала <a href="https://t.me/${esc(config.channel)}" target="_blank" rel="noopener">@${esc(config.channel)}</a> и обновляются автоматически. Проверено ${esc(meta.checked)}.</p><p>Цена действительна на момент обновления. Перед покупкой менеджер подтвердит наличие.</p></div>
  </div>
</footer>`;
}

function orderDialog(config) {
  return `<dialog class="order" id="order" aria-labelledby="order-title">
  <form method="dialog" class="order-box" id="order-form" novalidate>
    <div class="order-head">
      <h2 id="order-title">Заявка</h2>
      <button class="x" value="cancel" aria-label="Закрыть" formnovalidate>×</button>
    </div>
    <div class="order-item" id="order-item"></div>
    <label for="o-name">Как к вам обращаться</label>
    <input id="o-name" name="name" autocomplete="name" required>
    <label for="o-contact">Телефон или ник в Telegram</label>
    <input id="o-contact" name="contact" autocomplete="tel" required placeholder="+7 900 000-00-00 или @username">
    <label for="o-comment">Комментарий <span class="muted">— необязательно</span></label>
    <textarea id="o-comment" name="comment" rows="2" placeholder="Например, нужна доставка или trade-in"></textarea>
    <p class="order-err" id="order-err" role="alert" hidden></p>
    <div class="order-actions">
      <button class="btn btn-accent" id="o-send" value="send">${config.leadEndpoint ? 'Отправить заявку' : 'Отправить в Telegram'}</button>
      <button class="btn btn-ghost" id="o-copy" type="button">Скопировать текст</button>
    </div>
    <p class="order-done" id="order-done" hidden></p>
    <p class="muted small">${config.leadEndpoint ? 'Менеджер ответит в течение рабочего дня.' : 'Откроется чат с менеджером, текст заявки уже будет в поле сообщения.'}</p>
  </form>
</dialog>`;
}

function page({ base, config, categories, current, info, meta, main, ...h }) {
  return `${head({ base, config, ...h })}
<body>
${header({ base, config, categories, current })}
<main id="main">
${main}
</main>
${footer({ base, config, info, categories, meta })}
${orderDialog(config)}
<script>window.SHOP=${JSON.stringify({ tg: (config.contacts.telegram || '').replace(/^@/, ''), channel: config.channel, lead: config.leadEndpoint || '', metrika: +config.metrikaId || 0 })}</script>
<script src="${base}assets/site.js" defer></script>
</body>
</html>`;
}

function modelCard(m, base) {
  const colors = [...new Map(m.variants.filter((v) => v.variant.colorHex).map((v) => [v.variant.colorHex, v.variant.color])).entries()];
  const first = m.variants.find((v) => v.inStock) || m.variants[0];
  const drop = m.variants.some((v) => v.change < 0);
  return `<a class="card" href="${base}p/${m.slug}/">
    <div class="card-art">${deviceSvg(deviceKind(m.name), first.variant.colorHex, m.name)}</div>
    <div class="card-body">
      <h3>${esc(m.name)}</h3>
      ${colors.length > 1 ? `<div class="dots" aria-label="${esc(colors.map((c) => c[1]).join(', '))}">${colors.slice(0, 7).map(([hex]) => `<i style="--c:${hex}"></i>`).join('')}${colors.length > 7 ? `<span>+${colors.length - 7}</span>` : ''}</div>` : ''}
      <p class="card-meta">${m.variants.length > 1 ? count(m.variants.length, 'вариант', 'варианта', 'вариантов') : esc(variantParts(first.variant).join(' · ') || 'В наличии')}</p>
      <p class="card-price">${m.inStock ? `${m.min !== m.max ? '<span>от</span> ' : ''}${rub(m.min)}` : '<span class="out">Нет в наличии</span>'}${drop ? '<em class="tag-down">Цена снижена</em>' : ''}</p>
    </div>
  </a>`;
}

// Флагман в каждом цвете — веером: первое, что видит покупатель, — реальная модель из прайса.
function heroArt(models, base) {
  const phones = models.filter((m) => m.category === 'iphone' && m.inStock);
  const colorsOf = (m) => [...new Map(m.variants.filter((v) => v.inStock && v.variant.colorHex).map((v) => [v.variant.colorHex, v.variant.color])).entries()];
  const m = phones.sort((a, b) => colorsOf(b).length - colorsOf(a).length || b.max - a.max)[0];
  if (!m) return '';
  const colors = colorsOf(m).slice(0, 5);
  return `<a class="hero-art" href="${base}p/${m.slug}/" style="--n:${colors.length}">
    <div class="fan">${colors.map(([hex, name], i) => `<div class="fan-item" style="--i:${i}">${deviceSvg(deviceKind(m.name), hex, `${m.name}, ${name}`)}</div>`).join('')}</div>
    <div class="hero-tag"><b>${esc(m.name)}</b><span>${esc(colors.map((c) => c[1]).join(' · '))}</span><em>от ${rub(m.min)}</em></div>
  </a>`;
}

export function homePage(ctx) {
  const { base, config, categories, models, products, meta, info, updates } = ctx;
  const inStock = products.filter((p) => p.inStock).length;
  const top = categories.map((c) => {
    const ms = models.filter((m) => m.category === c.slug);
    const min = Math.min(...ms.filter((m) => m.inStock).map((m) => m.min));
    const hero = [...ms].sort((a, b) => b.inStock - a.inStock || b.variants.length - a.variants.length)[0];
    const hex = (hero.variants.find((v) => v.variant.colorHex && v.inStock) || hero.variants[0]).variant.colorHex;
    return `<a class="cat" href="${base}c/${c.slug}/">
      <div class="cat-art">${deviceSvg(deviceKind(hero.name), hex, c.name)}</div>
      <div><h3>${esc(c.name)}</h3><p>${count(ms.length, 'модель', 'модели', 'моделей')} · от ${rub(min)}</p></div>
    </a>`;
  });
  const changes = products.filter((p) => p.change && p.inStock).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 9);
  const warranty = info.warranty;
  const main = `
<section class="hero wrap">
  <div class="hero-text">
  <p class="eyebrow"><span class="live" aria-hidden="true"></span>Цены изменились ${esc(meta.changed)}</p>
  <h1>${count(inStock, 'позиция', 'позиции', 'позиций')} техники с ценами на сегодня</h1>
  <p class="lead">iPhone, iPad, Apple Watch, AirPods, Samsung, Pixel, PlayStation и криптокошельки. Каталог собирается из нашего Telegram-канала: изменили цену в канале — она меняется и здесь.</p>
  <form class="hero-search" action="${base}search/" role="search">
    <label class="sr" for="hq">Что ищете</label>
    <input id="hq" name="q" type="search" placeholder="Например, 17 Pro Max 256 или PS5 Slim" autocomplete="off">
    <button class="btn btn-accent">Найти</button>
  </form>
  </div>
  ${heroArt(models, base)}
  <ul class="facts">
    <li><b>Проверка до активации</b><span>Сколы, царапины и заводской брак смотрим вместе с вами</span></li>
    <li><b>Гарантия 7 дней</b><span>На заводской брак. На Pencil и AirPods — 1 день, на Dyson — 3 дня</span></li>
    <li><b>Версия по стране</b><span>У каждого варианта указано, для какого рынка он выпущен</span></li>
  </ul>
</section>

<section class="wrap block" aria-labelledby="cats-h">
  <div class="block-head"><h2 id="cats-h">Каталог</h2></div>
  <div class="cats-grid">${top.join('')}</div>
</section>

${changes.length ? `<section class="wrap block" aria-labelledby="ch-h">
  <div class="block-head"><h2 id="ch-h">Цены за неделю</h2><p>Изменения по сравнению с прошлым прайсом</p></div>
  <ul class="ticker">${changes.map((p) => `<li><a href="${base}p/${p.modelSlug}/"><span class="t-name">${esc(p.model)} <span class="muted">${esc(variantParts(p.variant).join(' · '))}</span></span><span class="t-price">${rub(p.price)}</span><span class="${p.change < 0 ? 'down' : 'up'}">${p.change < 0 ? '−' : '+'}${rub(Math.abs(p.change))}</span></a></li>`).join('')}</ul>
</section>` : ''}

${updates.items.length ? `<section class="wrap block" aria-labelledby="new-h">
  <div class="block-head"><h2 id="new-h">Свежее поступление</h2><p>Пост в канале ${esc(updates.when)}</p></div>
  <ul class="pricelist">${updates.items.map((p) => `<li><a href="${base}p/${p.modelSlug}/"><span>${esc(p.model)} <span class="muted">${esc(variantParts(p.variant).join(' · '))}</span></span><span class="pl-dots" aria-hidden="true"></span><b>${rub(p.price)}</b></a></li>`).join('')}</ul>
</section>` : ''}

<section class="wrap block split" aria-labelledby="how-h">
  <div>
    <h2 id="how-h">Как купить</h2>
    <ol class="steps">
      <li><b>Выберите вариант</b><span>Память, цвет и версию страны — цена на сайте у каждого варианта своя.</span></li>
      <li><b>Оставьте заявку</b><span>Кнопка «Заказать» откроет чат с менеджером, текст заявки подставится сам.</span></li>
      <li><b>Проверьте устройство</b><span>Осматриваем до активации: после активации претензии к внешнему виду не принимаются.</span></li>
      <li><b>Оплатите и заберите</b><span>Гарантия на заводской брак — 7 дней с покупки.</span></li>
    </ol>
  </div>
  <div class="regions-box">
    <h2>Что значит страна у варианта</h2>
    <p>Техника выпускается в версиях для разных рынков. От версии зависят набор SIM-карт, комплектация и цена, поэтому один и тот же iPhone может стоить по-разному.</p>
    <dl class="regions-list">${['HK', 'JP', 'US', 'EU', 'IN', 'KR', 'AE', 'RU'].map((c) => `<div><dt><b>${c}</b></dt><dd>${esc(REGIONS[c])}</dd></div>`).join('')}</dl>
    <p class="muted small">Пометка «Только eSIM» — у такой версии нет лотка под физическую SIM. Остальные отличия версии менеджер расскажет перед покупкой.</p>
  </div>
</section>

${warranty ? `<section class="wrap block" aria-labelledby="w-h">
  <div class="note"><h2 id="w-h">Гарантия и проверка</h2>${warrantyHtml(warranty.text)}</div>
</section>` : ''}`;
  return page({
    ...ctx,
    title: `${config.brand} — смартфоны, планшеты, часы и приставки${config.city ? ` в ${config.city}` : ''}`,
    description: `${count(inStock, 'позиция', 'позиции', 'позиций')} в наличии: iPhone от ${rub(Math.min(...models.filter((m) => m.category === 'iphone').map((m) => m.min)))}, iPad, Apple Watch, AirPods, Samsung, Pixel, PlayStation. Цены обновляются автоматически.`,
    canonical: config.siteUrl ? config.siteUrl.replace(/\/?$/, '/') : '',
    main,
    jsonld: { '@context': 'https://schema.org', '@type': 'Store', name: config.brand, url: config.siteUrl || undefined, telephone: config.contacts.phone || undefined, address: config.contacts.address || undefined, sameAs: [`https://t.me/${config.channel}`] },
  });
}

function warrantyHtml(text) {
  const lines = text.split('\n').map((l) => l.replace(/[\p{Extended_Pictographic}\uFE0F\u20E3]|🔤/gu, '').replace(/(\d)\s*(дн|день|дня)/g, '$1 $2').trim()).filter(Boolean);
  const spaced = lines.map((l) => l.replace(/(\p{L})(\d)/gu, '$1 $2').replace(/(\d)(\p{Ll})/gu, '$1 $2').replace(/\s-\s/g, ' — '));
  return `<ul>${spaced.filter((l) => !/^Гарантия$|^Исключения:?$/i.test(l)).map((l) => `<li>${esc(l.replace(/^[-–]\s*/, ''))}</li>`).join('')}</ul>`;
}

export function categoryPage(ctx, cat) {
  const { base, models, config } = ctx;
  const ms = models.filter((m) => m.category === cat.slug);
  const brands = [...new Set(ms.map((m) => m.brand))];
  const main = `
<section class="wrap page-head">
  <nav class="crumbs" aria-label="Навигация"><a href="${base}">Главная</a><span>${esc(cat.name)}</span></nav>
  <h1>${esc(cat.name)}</h1>
  <p class="lead">${count(ms.length, 'модель', 'модели', 'моделей')}, ${count(ms.reduce((n, m) => n + m.variants.length, 0), 'вариант', 'варианта', 'вариантов')} · от ${rub(Math.min(...ms.filter((m) => m.inStock).map((m) => m.min)))}</p>
  ${brands.length > 1 ? `<div class="chips" role="group" aria-label="Бренд" data-filter-cards><button class="chip" aria-pressed="true" data-brand="">Все</button>${brands.map((b) => `<button class="chip" aria-pressed="false" data-brand="${esc(b)}">${esc(b)}</button>`).join('')}</div>` : ''}
</section>
<section class="wrap block">
  <div class="cards">${ms.map((m) => modelCard(m, base).replace('<a class="card"', `<a class="card" data-brand="${esc(m.brand)}"`)).join('')}</div>
</section>`;
  return page({
    ...ctx,
    current: cat.slug,
    title: `${cat.name} — цены и наличие | ${config.brand}`,
    description: `${cat.name}: ${ms.slice(0, 6).map((m) => m.name).join(', ')}. ${count(ms.length, 'модель', 'модели', 'моделей')} от ${rub(Math.min(...ms.map((m) => m.min)))}.`,
    canonical: config.siteUrl ? `${config.siteUrl.replace(/\/$/, '')}/c/${cat.slug}/` : '',
    main,
    jsonld: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Главная', item: config.siteUrl || undefined }, { '@type': 'ListItem', position: 2, name: cat.name }] },
  });
}

// Фильтры варианта: только параметры, у которых в модели больше одного значения.
const FILTERS = [
  ['storage', 'Память', (v) => v.variant.storage && (v.variant.ram ? `${v.variant.ram}/${gb(v.variant.storage)}` : gb(v.variant.storage))],
  ['size', 'Размер', (v) => v.variant.size],
  ['network', 'Связь', (v) => v.variant.network],
  ['color', 'Цвет', (v) => v.variant.color],
  ['region', 'Версия', (v) => v.regions.length && regionLabel(v.regions)],
];

// Силуэт в каждом цвете модели: фильтр цвета на странице переключает их без перерисовки.
function modelArt(m, first) {
  const kind = deviceKind(m.name);
  const colors = [...new Map(m.variants.filter((v) => v.variant.colorHex).map((v) => [v.variant.colorHex, v.variant.color])).entries()];
  if (colors.length < 2) return deviceSvg(kind, first.variant.colorHex, m.name);
  const start = first.variant.colorHex || colors[0][0];
  return colors.map(([hex, name]) => deviceSvg(kind, hex, `${m.name}, ${name}`, ` data-hex="${hex}"${hex === start ? '' : ' hidden'}`)).join('');
}

export function modelPage(ctx, m) {
  const { base, config, categories, meta } = ctx;
  const cat = categories.find((c) => c.slug === m.category);
  const vs = m.variants;
  const first = vs.find((v) => v.inStock) || vs[0];
  const filters = FILTERS.map(([key, label, get]) => {
    const values = [...new Set(vs.map(get).filter(Boolean))];
    return values.length > 1 ? { key, label, values, get } : null;
  }).filter(Boolean);
  const colorOf = Object.fromEntries(vs.filter((v) => v.variant.color).map((v) => [v.variant.color, v.variant.colorHex]));
  const rows = vs.map((v) => {
    const attrs = filters.map((f) => `data-${f.key}="${esc(f.get(v) || '')}"`).join(' ');
    const parts = variantParts(v.variant);
    const item = { id: v.id, model: m.name, variant: parts.join(', '), region: regionLabel(v.regions), price: v.price, notes: v.notes };
    return `<tr ${attrs} data-hex="${esc(v.variant.colorHex || '')}"${v.inStock ? '' : ' class="is-out"'}>
      <td class="v-name"><div>${v.variant.colorHex ? `<i class="sw" style="--c:${v.variant.colorHex}"></i>` : ''}<span>${esc(parts.join(' · ') || m.name)}${v.notes.length ? `<small>${esc(v.notes.join(' · '))}</small>` : ''}${v.variant.tiers ? `<small>${v.variant.tiers.map((t) => `от ${t.from} шт — ${rub(t.price)}`).join(' · ')}</small>` : ''}</span></div></td>
      <td class="v-region">${regionChip(v.regions)}</td>
      <td class="v-price">${rub(v.price)}${v.change ? `<small class="${v.change < 0 ? 'down' : 'up'}">${v.change < 0 ? '−' : '+'}${rub(Math.abs(v.change))}</small>` : ''}</td>
      <td class="v-buy">${v.inStock ? `<button class="btn btn-buy" data-order='${esc(JSON.stringify(item))}'>Заказать</button>` : '<span class="out">Нет в наличии</span>'}</td>
    </tr>`;
  });
  const related = ctx.models.filter((x) => x.category === m.category && x.slug !== m.slug).slice(0, 4);
  const main = `
<section class="wrap model">
  <nav class="crumbs" aria-label="Навигация"><a href="${base}">Главная</a><a href="${base}c/${cat.slug}/">${esc(cat.name)}</a><span>${esc(m.name)}</span></nav>
  <div class="model-grid">
    <div class="model-art" id="model-art">${modelArt(m, first)}</div>
    <div class="model-info">
      <h1>${esc(m.name)}</h1>
      <p class="model-price">${m.inStock ? `${m.min !== m.max ? '<span>от</span> ' : ''}${rub(m.min)}${m.min !== m.max ? ` <span>до ${rub(m.max)}</span>` : ''}` : '<span class="out">Нет в наличии</span>'}</p>
      <p class="muted">${count(vs.length, 'вариант', 'варианта', 'вариантов')} · цены обновлены ${esc(when(m.updated, meta.now))} · <a href="https://t.me/${esc(config.channel)}/${m.posts[0]}" target="_blank" rel="noopener">пост в канале</a></p>
      ${filters.length ? `<div class="filters" id="filters">${filters.map((f) => `<div class="filter"><p class="filter-label">${f.label}</p><div class="chips" role="group" aria-label="${f.label}">${f.values.map((val) => `<button class="chip" aria-pressed="false" data-key="${f.key}" data-val="${esc(val)}">${f.key === 'color' && colorOf[val] ? `<i class="sw" style="--c:${colorOf[val]}"></i>` : ''}${esc(val)}</button>`).join('')}</div></div>`).join('')}</div>` : ''}
    </div>
  </div>
  <div class="variants-wrap">
    <table class="variants" id="variants">
      <caption class="sr">Варианты и цены ${esc(m.name)}</caption>
      <thead><tr><th scope="col">Вариант</th><th scope="col">Версия</th><th scope="col">Цена</th><th scope="col"><span class="sr">Заказ</span></th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <p class="empty" id="no-match" hidden>Такого сочетания сейчас нет. Снимите один из фильтров или <a href="${esc(contactUrl(config))}" target="_blank" rel="noopener">спросите менеджера</a> — привезём под заказ.</p>
  </div>
</section>
${related.length ? `<section class="wrap block"><div class="block-head"><h2>Ещё в разделе «${esc(cat.name)}»</h2></div><div class="cards cards-fit">${related.map((x) => modelCard(x, base)).join('')}</div></section>` : ''}`;
  const offers = vs.filter((v) => v.inStock);
  return page({
    ...ctx,
    current: cat.slug,
    title: `${m.name} — купить, цена от ${rub(m.min)} | ${config.brand}`,
    description: `${m.name}: ${count(vs.length, 'вариант', 'варианта', 'вариантов')}${filters.find((f) => f.key === 'storage') ? `, память ${filters.find((f) => f.key === 'storage').values.join(', ')}` : ''}. Цена от ${rub(m.min)}, в наличии. Проверка до активации, гарантия 7 дней.`,
    canonical: config.siteUrl ? `${config.siteUrl.replace(/\/$/, '')}/p/${m.slug}/` : '',
    main,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: m.name,
      brand: { '@type': 'Brand', name: m.brand },
      category: cat.name,
      offers: offers.length
        ? { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: m.min, highPrice: m.max, offerCount: offers.length, availability: 'https://schema.org/InStock' }
        : { '@type': 'Offer', priceCurrency: 'RUB', price: m.min, availability: 'https://schema.org/OutOfStock' },
    },
  });
}

export function searchPage(ctx) {
  const main = `
<section class="wrap page-head">
  <nav class="crumbs" aria-label="Навигация"><a href="${ctx.base}">Главная</a><span>Поиск</span></nav>
  <h1 id="search-title">Поиск</h1>
  <form class="hero-search" action="./" role="search">
    <label class="sr" for="sq">Что ищете</label>
    <input id="sq" name="q" type="search" placeholder="Например, 17 Pro Max 256 или PS5 Slim" autocomplete="off">
    <button class="btn btn-accent">Найти</button>
  </form>
</section>
<section class="wrap block"><ul class="results" id="results" data-base="${ctx.base}"></ul></section>`;
  return page({ ...ctx, title: `Поиск — ${ctx.config.brand}`, description: 'Поиск по каталогу', main });
}

export function notFoundPage(ctx) {
  const main = `<section class="wrap page-head nf"><h1>Такой страницы нет</h1><p class="lead">Возможно, модель закончилась и пропала из прайса. Посмотрите <a href="${ctx.base}">весь каталог</a> или найдите похожую через поиск вверху.</p></section>`;
  return page({ ...ctx, title: `Страница не найдена — ${ctx.config.brand}`, description: '', main });
}
