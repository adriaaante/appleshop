// Разбор прайс-постов канала в список товаров.
// Пост = строки «товар — цена — флаг страны». Строка без цены — заголовок раздела (даёт контекст
// следующим строкам: «iPad mini 7» → «256 Gray LTE - 83.500»). Порядок правил важен, см. test/parse.test.mjs.

export const REGIONS = {
  HK: 'Гонконг', JP: 'Япония', US: 'США', EU: 'Европа', IN: 'Индия', AE: 'ОАЭ', GB: 'Великобритания',
  KR: 'Корея', CN: 'Китай', AU: 'Австралия', BR: 'Бразилия', RU: 'Россия', KZ: 'Казахстан', ZA: 'ЮАР',
  MY: 'Малайзия', CA: 'Канада', CL: 'Чили', SG: 'Сингапур', TH: 'Таиланд', VN: 'Вьетнам', ID: 'Индонезия',
  TR: 'Турция', MX: 'Мексика', TW: 'Тайвань', DE: 'Германия', FR: 'Франция', IT: 'Италия', ES: 'Испания',
};

export const CATEGORIES = [
  { slug: 'iphone', name: 'iPhone', test: /^iPhone/ },
  { slug: 'ipad', name: 'iPad', test: /^iPad/ },
  { slug: 'watch', name: 'Часы', test: /^(Apple Watch|Google Fitbit)/ },
  { slug: 'airpods', name: 'AirPods', test: /^AirPods/ },
  { slug: 'airpods-parts', name: 'AirPods по отдельности', test: /^(Кейс|Амбушюры|Наушник) AirPods/ },
  { slug: 'android', name: 'Смартфоны Android', test: /^(Samsung(?! Galaxy SmartTag)|Google Pixel|Honor|Huawei|Nothing|OnePlus|Xiaomi|Redmi|POCO)\b/ },
  { slug: 'consoles', name: 'PlayStation', test: /^PlayStation/ },
  { slug: 'speakers', name: 'Умные колонки', test: /^Яндекс/ },
  { slug: 'crypto', name: 'Криптокошельки и ключи', test: /^(Ledger|SafePal|Tangem|CoolWallet|Ellipal|OneKey|Keystone|YubiKey)\b/ },
  { slug: 'accessories', name: 'Аксессуары', test: /./ },
];

// Цвета: имя в прайсе → [название на сайте, цвет образца]. Сначала длинные: «Black Velvet» раньше «Black».
const COLORS = Object.entries({
  'night sky': ['Night Sky', '#2b3142'], 'black ocean': ['Black Ocean', '#1d2733'], 'golden white': ['Golden White', '#efe6d2'],
  'desert gold': ['Desert Gold', '#d9c3a0'], 'sprout green': ['Sprout Green', '#b9cf9a'], 'velvet black': ['Velvet Black', '#1b1b1d'],
  'velvet gray': ['Velvet Gray', '#8a8d93'], 'forest green': ['Forest Green', '#3d5a45'], 'midnight black': ['Midnight Black', '#16181d'],
  'sunrise gold': ['Sunrise Gold', '#e3c48e'], 'blaze purple': ['Blaze Purple', '#7a4fa0'], 'blush gold': ['Blush Gold', '#e6c3ad'],
  'graphite black': ['Graphite Black', '#2a2c30'], 'orange ocean': ['Orange Ocean', '#e9733c'], 'black velvet': ['Black Velvet', '#1b1b1d'],
  'silk green': ['Silk Green', '#9fb7a2'], 'ultra violet': ['Ultra Violet', '#6d4f9c'], 'sand storm': ['Sand Storm', '#cdb89a'], 'infinite black': ['Infinite Black', '#121316'],
  graygreen: ['Gray Green', '#7f8c80'], lightgray: ['Light Gray', '#c9ccd1'], icyblue: ['Icy Blue', '#bcd6e8'],
  midnight: ['Midnight', '#232a35'], starlight: ['Starlight', '#ece4d6'], burgundy: ['Burgundy', '#6e2433'], glacier: ['Glacier', '#cfe1ea'],
  sage: ['Sage', '#a9b79b'], lavender: ['Lavender', '#c8bfe4'], lavander: ['Lavender', '#c8bfe4'], obsidian: ['Obsidian', '#26272b'],
  frost: ['Frost', '#dfe7ee'], fog: ['Fog', '#c7cbd0'], berry: ['Berry', '#9b3a5a'], charcoal: ['Charcoal', '#3a3c40'],
  lilac: ['Lilac', '#c6a9d6'], navy: ['Navy', '#22324f'], lime: ['Lime', '#cfe38a'], violet: ['Violet', '#7d5fb2'],
  bronze: ['Bronze', '#a77b55'], silver: ['Silver', '#d6d8db'], gold: ['Gold', '#e2cfa6'], orange: ['Orange', '#f07a2c'],
  purple: ['Purple', '#a48fd0'], green: ['Green', '#5e8f6a'], pink: ['Pink', '#efb7c4'], blue: ['Blue', '#4f79b8'],
  black: ['Black', '#1c1d20'], white: ['White', '#f4f4f2'], gray: ['Gray', '#8e9298'], grey: ['Gray', '#8e9298'],
  'черный': ['Черный', '#1c1d20'], 'чёрный': ['Черный', '#1c1d20'], 'голубой': ['Голубой', '#8db8e0'], 'серый': ['Серый', '#8e9298'],
  'зеленая': ['Зелёный', '#5e8f6a'], 'зелёная': ['Зелёный', '#5e8f6a'], 'оранжевая': ['Оранжевый', '#f07a2c'],
  'фиолетовая': ['Фиолетовый', '#7d5fb2'], 'фолетовая': ['Фиолетовый', '#7d5fb2'],
}).sort((a, b) => b[0].length - a[0].length);

// Пометки в строке, которые относятся к состоянию/комплектации, а не к названию.
const NOTES = [
  [/\(?\s*у[цч]енка\s*\)?/i, 'Уценка'],
  [/дефект коробки/i, 'Дефект коробки'],
  [/без зарядки/i, 'Без зарядного устройства'],
  [/с русским языком/i, 'С русским языком'],
  [/\(?\s*новый\s*,\s*не актив\s*,\s*без коробки\s*\)?/i, 'Новый, не активирован, без коробки'],
];

const FLAG_RE = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu;
const flagToIso = (a, b) => String.fromCharCode(a.codePointAt(0) - 0x1f1e6 + 65, b.codePointAt(0) - 0x1f1e6 + 65);

function extractRegions(line) {
  const regions = [];
  let rest = line.replace(FLAG_RE, (_, a, b) => (regions.push(flagToIso(a, b)), ' '));
  // Без флага страна иногда написана буквами («Obsidian CA - 50000»).
  rest = rest.replace(/(^|\s)(CA|AU|HK|JP|US|EU|UK)(?=\s|$)/g, (_, sp, code) => (regions.push(code === 'UK' ? 'GB' : code), sp));
  return { regions: [...new Set(regions)], rest };
}

function stripDecor(s) {
  return s
    .replace(/(?<=\S\s*)⚪️?/gu, ' White ')
    .replace(/(?<=\S\s*)⚫️?/gu, ' Black ')
    .replace(/[\p{Extended_Pictographic}️‍\u{1F1E6}-\u{1F1FF}•▪◾▫]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Цена: число после последнего тире («- 116500», «-7000», «Max-1000 ₽»); без тире — последнее число строки.
// «83.500» и «33 500» — тысячи; пробел как разделитель — только в конце строки, иначе «17 256 Gb» склеится.
const NUM_RE = /(?<![\p{L}\d/.,])(\d{1,3}(?:\.\d{3})+|\d{1,3}(?: \d{3})+(?=\s*(?:₽|руб|$))|\d+)(?![\p{L}\d/]|[.,]\d)(\s*(?:₽|руб\.?))?/gu;

export function findPrice(line) {
  const nums = [];
  for (const m of line.matchAll(NUM_RE)) {
    const value = +m[1].replace(/[ .]/g, '');
    const isYear = !m[2] && value >= 2015 && value <= 2035;
    if (value >= 100 && !isYear) nums.push({ value, start: m.index, end: m.index + m[0].length });
  }
  if (!nums.length) return null;
  let dash = -1;
  for (const m of line.matchAll(/[-–—]/g)) {
    const before = line[m.index - 1] || ' ';
    const after = line[m.index + 1] || ' ';
    if (/\p{L}/u.test(before) && /\p{L}/u.test(after)) continue; // USB-C, e-sim
    if (nums.some((n) => n.start > m.index)) dash = m.index;
  }
  const hit = dash >= 0 ? nums.find((n) => n.start > dash) : nums[nums.length - 1];
  const nameEnd = dash >= 0 ? dash : hit.start;
  return {
    price: hit.value,
    name: line.slice(0, nameEnd).trim(),
    extra: (line.slice(nameEnd + (dash >= 0 ? 1 : 0), hit.start) + ' ' + line.slice(hit.end)).trim(),
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Полное название из строки прайса и заголовка раздела.
function fullTitle(name, ctx) {
  let t = name.replace(/\s+/g, ' ').trim();
  const sec = ctx.section || '';
  t = t.replace(/([A-Za-z])(\d{1,2}\s*\/\s*\d{2,4})/g, '$1 $2'); // «Pro XL16/512GB» — память слиплась с названием
  t = t.replace(/^Air Pods/i, 'AirPods').replace(/^Google fit ?bit/i, 'Google Fitbit');
  let m;
  if ((m = t.match(/^(?:Air)?Pods (.+?) (левое|правое)( ANC)?$/i))) return `Наушник AirPods ${m[1]}${m[3] || ''} ${m[2].toLowerCase() === 'левое' ? 'левый' : 'правый'}`;
  if ((m = t.match(/^Кейс\s+(?:Air)?Pods\s+(.+)$/i))) return `Кейс AirPods ${m[1].replace(/TYPE C/i, 'USB-C')}`;
  if ((m = t.match(/^Амбушюры\s+(?:AirPods\s+)?Pro\s?(\d)$/i))) return `Амбушюры AirPods Pro ${m[1]}`;
  if (/^iPad/.test(sec) && /^\d/.test(t)) return `${sec} ${t}`;
  if (/^Watch$/i.test(sec) || /\d{2}\s*mm\b/i.test(t)) {
    if ((m = t.match(/^SE ?(\d)\b(.*)$/))) return `Apple Watch SE ${m[1]}${m[2]}`;
    if ((m = t.match(/^S(\d{1,2})\b(.*)$/))) return `Apple Watch Series ${m[1]}${m[2]}`;
    if (/^Ultra/.test(t)) return `Apple Watch ${t}`;
  }
  if (/^iPhone$/i.test(sec) && !/^iPhone/i.test(t)) return `iPhone ${t}`;
  if (/^Apple Power Adapter$/i.test(sec)) return `Адаптер питания Apple ${t.replace(/^(\d+)\s*w\b/i, '$1 Вт').replace(/usb-c/i, 'USB-C')}`;
  if (/^СТ[ЁЕ]КЛА/i.test(sec)) return `Защитное стекло Remax для iPhone ${t.replace(/\b(pro|plus|air)\b/g, (w) => cap(w)).replace(/(\d)pro/g, '$1 Pro')}`;
  if (/^(A|S|M|Z)\d{2}[a-z]?\b/.test(t)) return `Samsung Galaxy ${t}`;
  if (/^Galaxy\b/.test(t)) return `Samsung ${t}`;
  if (/^Ledger|^SafePal|^Tangem|^CoolWallet|^Ellipal|^OneKey|^Keystone|^YubiKey/i.test(t)) return t;
  if ((m = t.match(/^PS5 (Slim .+)$/))) return `PlayStation 5 ${m[1]}`;
  if ((m = t.match(/^PS5 (VR2.*)$/))) return `PlayStation ${m[1].replace(/\s*\+\s*Game (.+)/, ' + игра $1').replace('Montain', 'Mountain')}`;
  if ((m = t.match(/^PS5 Portal(.*)$/))) return `PlayStation Portal${m[1]}`;
  if ((m = t.match(/^Умная колонка (.+)$/i))) return m[1].replace(/^Яндекс[. ]Станция/, 'Яндекс Станция');
  if (/^Poco\b/i.test(t)) return t.replace(/^Poco/i, 'POCO').replace(/POCO x /i, 'POCO X');
  if (/^Pencil/.test(t)) return `Apple ${t}`;
  return /^i[A-Z]/.test(t) ? t : cap(t);
}

// Разбирает название на модель (страница сайта) и параметры варианта.
export function splitVariant(title) {
  const v = {};
  let t = ` ${title} `;
  let cut = t.length; // где кончается название модели
  let m0;
  const take = (re, fn) => {
    const m = t.match(re);
    if (!m) return;
    fn(m);
    cut = Math.min(cut, m.index);
    t = t.slice(0, m.index) + ' '.repeat(m[0].length) + t.slice(m.index + m[0].length);
  };
  if ((m0 = title.match(/^(Защитное стекло Remax для iPhone) (.+)$/))) return { model: m0[1], variant: { compat: m0[2] }, leftover: '' };
  const gb = (n, unit) => (/t|т/i.test(unit) ? +n * 1024 : +n);
  take(/ (\d{1,2})\s*\/\s*(\d{1,4})\s*(GB|Gb|TB|Tb|гб|тб)?(?=\s)/i, (m) => {
    v.ram = +m[1];
    v.storage = gb(m[2], m[3] || (+m[2] <= 2 ? 'TB' : 'GB'));
  });
  if (!v.storage) take(/ (\d{2,4}|[12])\s*(GB|Gb|TB|Tb|ГБ|гб|ТБ|тб)(?=\s)/, (m) => (v.storage = gb(m[1], m[2])));
  if (!v.storage) take(/ (64|128|256|512)(?=\s)/, (m) => (v.storage = +m[1]));
  if (!v.storage && /^ PlayStation/.test(t)) take(/ (825|1|2)\s*(гб|тб|tb|gb)(?=\s)/i, (m) => (v.storage = gb(m[1], m[2])));
  take(/ (\d{2})\s*mm(?=\s)/i, (m) => (v.size = `${m[1]} мм`));
  take(/ (LTE|WiFi|Wi-Fi)(?=\s)/i, (m) => (v.network = /lte/i.test(m[1]) ? 'Wi‑Fi + Cellular' : 'Wi‑Fi'));
  if (/^ iPad/.test(t)) take(/ Nano(?=\s)/, () => (v.glass = 'Нанотекстура'));
  take(/ (S\/M|M\/L)(?:\s*,\s*(S\/M|M\/L))?(?=\s)/, (m) => (v.band = [m[1], m[2]].filter(Boolean).join(', ')));
  // артикулы модели (S731B, CPH2749, PLK110) — не часть названия
  take(/ (S\d{3}[A-Z]|CPH\d{4}|PLK\d{3})(?=\s)/, (m) => (v.code = m[1]));
  // Цвет — в хвосте после модели.
  const tail = t.slice(0).toLowerCase();
  for (const [key, [name, hex]] of COLORS) {
    const re = new RegExp(`(^|\\s)${key.replace(/ /g, '\\s+')}(?=\\s|$)`, 'i');
    const m = tail.match(re);
    if (m) {
      v.color = name;
      v.colorHex = hex;
      const at = m.index + m[1].length;
      cut = Math.min(cut, at);
      t = t.slice(0, at) + ' '.repeat(m[0].length - m[1].length) + t.slice(at + m[0].length - m[1].length);
      break;
    }
  }
  const model = title.slice(0, Math.max(0, cut - 1)).replace(/\s+/g, ' ').trim() || title;
  const leftover = t.slice(cut).replace(/\s+/g, ' ').trim();
  return { model, variant: v, leftover };
}

export function slugify(s) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  return s
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => map[c])
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Цена на сайте = цена из прайса + наценка магазина (site.config.json → markupPercent), округление вверх:
// до 10 ₽ у дешёвого (стекло 300 → 320), до 100 ₽ у остального (116 500 → 122 400).
export const roundPrice = (p, markup) => {
  if (!markup) return p;
  const v = p * (1 + markup / 100);
  const step = v < 1000 ? 10 : 100;
  return Math.ceil(v / step - 1e-9) * step;
};

// posts: [{id, date, text, removed}] → { products, info }
export function parseCatalog(posts, config, now = new Date()) {
  const products = [];
  const skipped = [];
  const info = {};
  const ttl = (config.updatePostTtlDays ?? 14) * 864e5;
  for (const post of posts) {
    if (post.removed || !post.text || post.text.length < 20) continue;
    const isUpdate = /обновили наличие/i.test(post.text);
    if (isUpdate && now - new Date(post.date) > ttl) continue;
    if (/гарантия/i.test(post.text) && !/\d{3,}\s*(₽|$)/m.test(post.text.replace(/\d+\s*(дн|день|дня)/g, ''))) {
      info.warranty = { post: post.id, text: post.text };
      continue;
    }
    let section = '';
    let sectionRetail = null;
    let excluded = false;
    let last = null;
    for (const [lineNo, raw] of post.text.split('\n').entries()) {
      const out = raw.includes('✖');
      const { regions, rest } = extractRegions(raw);
      const line = stripDecor(rest);
      if (!line || /^[.\d]$/.test(line)) continue;
      if (/обновили наличие/i.test(line)) continue;
      if (/розница|опт от/i.test(line)) {
        const r = line.match(/розница\s*(\d+)/i);
        sectionRetail = r ? { retail: +r[1], note: line.replace(/^[.\s]+/, '').replace(/\s*\.\s*/g, '; ') } : null;
        continue;
      }
      if (/^от\s*\d+\s*шт/i.test(line) && last) {
        const p = findPrice(line);
        if (p) last.variant.tiers = [...(last.variant.tiers || []), { from: +line.match(/\d+/)[0], price: roundPrice(p.price, config.markupPercent) }];
        continue;
      }
      const found = findPrice(line);
      if (!found || !found.name) {
        section = line.replace(/:$/, '').trim();
        excluded = (config.excludeSections || []).some((s) => section.toLowerCase().includes(s.toLowerCase()));
        sectionRetail = null;
        continue;
      }
      if (excluded) continue;
      const title = fullTitle(found.name, { section });
      const { model, variant, leftover } = splitVariant(title);
      const notes = [];
      let extra = `${leftover} ${found.extra}`;
      for (const [re, label] of NOTES) if (re.test(extra)) (notes.push(label), (extra = extra.replace(re, ' ')));
      if (/[еe]-?sim/i.test(extra)) (variant.sim = 'Только eSIM'), (extra = extra.replace(/\(?\s*[еe]-?sim\s*\)?/i, ' '));
      const band = extra.match(/(S\/M|M\/L)(?:\s*,\s*(S\/M|M\/L))?/);
      if (band) (variant.band = [band[1], band[2]].filter(Boolean).join(', ')), (extra = extra.replace(band[0], ' '));
      const year = extra.match(/\((20\d\d)\)/);
      if (year) (variant.year = +year[1]), (extra = extra.replace(year[0], ' '));
      const rev = extra.match(/(?:рев\s*(\d)|(\d)\s*рев)/i);
      if (rev) (variant.revision = `${rev[1] || rev[2]}-я ревизия`), (extra = extra.replace(rev[0], ' '));
      const code = extra.match(/(?<!\d)(\d{4})\s*([A-Za-zА-Яа-я]?)(?=\s|$)/u);
      if (code && /PlayStation/.test(model)) (variant.code = code[1] + ({ а: 'A', в: 'B' }[code[2].toLowerCase()] ?? code[2].toUpperCase())), (extra = extra.replace(code[0], ' '));
      extra = extra.replace(/[()+,]/g, ' ').replace(/\s+/g, ' ').trim();
      if (extra) notes.push(cap(extra));
      let price = found.price;
      if (sectionRetail) {
        const opt = sectionRetail.note.match(/опт от (\d+) шт\D*(\d+)/i);
        if (opt) variant.tiers = [{ from: +opt[1], price: roundPrice(+opt[2], config.markupPercent) }];
        price = sectionRetail.retail;
      }
      const category = CATEGORIES.find((c) => c.test.test(model));
      const p = {
        id: slugify(`${model} ${Object.values(variant).join(' ')} ${regions.join(' ')} ${notes.join(' ')}`),
        model,
        modelSlug: slugify(model),
        category: category.slug,
        title,
        variant,
        regions,
        notes,
        price: roundPrice(price, config.markupPercent),
        basePrice: price, // из прайса, без наценки — по ней история цен
        inStock: !out,
        source: { post: post.id, line: lineNo, date: post.date, update: isUpdate },
        raw: raw.trim(),
      };
      // Одинаковая позиция в нескольких постах — берём более свежий пост.
      const dup = products.findIndex((x) => x.id === p.id);
      if (dup >= 0) products.splice(dup, 1);
      products.push(p);
      last = p;
    }
  }
  return { products, info, skipped };
}
