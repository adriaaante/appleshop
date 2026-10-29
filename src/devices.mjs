// Силуэты устройств (SVG) в цвете варианта: в канале нет фото, поэтому витрина рисует сам корпус.
// viewBox 0 0 120 160; fill — цвет корпуса, детали затемняются от него.

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

const lens = (cx, cy, r = 5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0c0e"/><circle cx="${cx - r / 3}" cy="${cy - r / 3}" r="${r / 3.5}" fill="#3a4250"/>`;

const shapes = {
  'iphone-pro': (c, d) => `<rect x="30" y="8" width="60" height="144" rx="14" fill="${c}"/><rect x="35" y="14" width="34" height="34" rx="9" fill="${d}"/>${lens(43, 22)}${lens(43, 39)}${lens(59, 30)}<circle cx="61" cy="43" r="2" fill="#f5f0e0"/>`,
  'iphone-air': (c, d) => `<rect x="32" y="8" width="56" height="144" rx="13" fill="${c}"/><rect x="34" y="14" width="52" height="16" rx="8" fill="${d}"/>${lens(43, 22, 4.5)}<circle cx="56" cy="22" r="2" fill="#0b0c0e"/>`,
  iphone: (c, d) => `<rect x="30" y="8" width="60" height="144" rx="14" fill="${c}"/><rect x="35" y="14" width="18" height="34" rx="9" fill="${d}"/>${lens(44, 23, 5)}${lens(44, 39, 5)}`,
  'iphone-duo': (c, d) => `<rect x="14" y="12" width="44" height="136" rx="11" fill="${c}"/><rect x="62" y="12" width="44" height="136" rx="11" fill="${c}"/><rect x="57" y="12" width="6" height="136" fill="${d}"/><rect x="68" y="18" width="32" height="15" rx="7.5" fill="${d}"/>${lens(76, 25.5, 4)}${lens(90, 25.5, 4)}`,
  pixel: (c, d) => `<rect x="30" y="8" width="60" height="144" rx="15" fill="${c}"/><rect x="30" y="26" width="60" height="16" rx="8" fill="${d}"/>${lens(42, 34, 4.5)}${lens(56, 34, 4.5)}`,
  android: (c, d) => `<rect x="31" y="8" width="58" height="144" rx="10" fill="${c}"/>${lens(41, 20, 5)}${lens(41, 34, 5)}${lens(41, 48, 5)}<rect x="52" y="17" width="4" height="4" rx="2" fill="${d}"/>`,
  ipad: (c, d) => `<rect x="14" y="16" width="92" height="128" rx="10" fill="${c}"/>${lens(26, 28, 4)}<rect x="20" y="22" width="12" height="12" rx="4" fill="none" stroke="${d}" stroke-width="1.5"/>`,
  watch: (c, d) => `<rect x="45" y="2" width="30" height="156" rx="7" fill="${d}"/><rect x="33" y="42" width="54" height="66" rx="15" fill="${c}"/><rect x="38" y="47" width="44" height="56" rx="11" fill="#0b0c0e"/><rect x="87" y="58" width="5" height="14" rx="2" fill="${d}"/>`,
  tracker: (c, d) => `<rect x="47" y="2" width="26" height="156" rx="7" fill="${c}"/><rect x="40" y="50" width="40" height="58" rx="13" fill="${d}"/><rect x="44" y="56" width="32" height="46" rx="9" fill="#0b0c0e"/>`,
  airpods: (c, d) => `<rect x="24" y="44" width="72" height="66" rx="24" fill="${c}"/><path d="M24 70 h72" stroke="${d}" stroke-width="2"/><circle cx="60" cy="88" r="3" fill="${d}"/>`,
  'airpods-max': (c, d) => `<path d="M30 92 V60 a30 30 0 0 1 60 0 V92" fill="none" stroke="${d}" stroke-width="8" stroke-linecap="round"/><rect x="18" y="80" width="28" height="48" rx="13" fill="${c}"/><rect x="74" y="80" width="28" height="48" rx="13" fill="${c}"/>`,
  earbud: (c, d) => `<circle cx="56" cy="56" r="20" fill="${c}"/><rect x="58" y="62" width="14" height="62" rx="7" fill="${c}"/><circle cx="50" cy="52" r="6" fill="${d}"/>`,
  console: (c, d) => `<path d="M36 14 q-12 66 0 132 h14 V14z" fill="${c}"/><path d="M84 14 q12 66 0 132 h-14 V14z" fill="${c}"/><rect x="50" y="14" width="20" height="132" rx="4" fill="#15171b"/>`,
  vr: (c, d) => `<rect x="18" y="56" width="84" height="48" rx="22" fill="${c}"/><rect x="26" y="64" width="68" height="18" rx="9" fill="#15171b"/><path d="M18 80 h-6 M102 80 h6" stroke="${d}" stroke-width="6" stroke-linecap="round"/>`,
  portal: (c, d) => `<rect x="6" y="58" width="108" height="48" rx="22" fill="${c}"/><rect x="30" y="56" width="60" height="38" rx="4" fill="#0b0c0e"/><circle cx="18" cy="82" r="4" fill="${d}"/><circle cx="102" cy="82" r="4" fill="${d}"/>`,
  crypto: (c, d) => `<rect x="36" y="26" width="48" height="108" rx="10" fill="${c}"/><rect x="42" y="34" width="36" height="56" rx="5" fill="#0b0c0e"/><circle cx="60" cy="110" r="8" fill="${d}"/>`,
  key: (c, d) => `<rect x="44" y="24" width="32" height="88" rx="8" fill="${c}"/><rect x="50" y="112" width="20" height="26" rx="3" fill="#b9bdc4"/><circle cx="60" cy="40" r="6" fill="${d}"/><circle cx="60" cy="74" r="9" fill="#d3a84b"/>`,
  speaker: (c, d) => `<rect x="30" y="34" width="60" height="96" rx="24" fill="${c}"/><path d="M38 56 h44 M38 66 h44 M38 76 h44 M38 86 h44 M38 96 h44 M38 106 h44" stroke="${d}" stroke-width="2" stroke-linecap="round"/><rect x="48" y="24" width="24" height="14" rx="7" fill="${d}"/>`,
  pencil: (c, d) => `<g transform="rotate(35 60 80)"><rect x="54" y="6" width="12" height="130" rx="4" fill="${c}"/><path d="M54 136 L60 154 L66 136 Z" fill="${d}"/></g>`,
  mouse: (c, d) => `<rect x="34" y="20" width="52" height="120" rx="26" fill="${c}"/><path d="M60 28 v28" stroke="${d}" stroke-width="2"/>`,
  adapter: (c, d) => `<rect x="30" y="48" width="60" height="60" rx="10" fill="${c}"/><rect x="42" y="30" width="8" height="20" rx="2" fill="#b9bdc4"/><rect x="70" y="30" width="8" height="20" rx="2" fill="#b9bdc4"/><rect x="48" y="84" width="24" height="7" rx="3.5" fill="${d}"/>`,
  glass: (c, d) => `<rect x="30" y="8" width="60" height="144" rx="14" fill="${c}" fill-opacity=".35" stroke="${d}" stroke-width="2" stroke-dasharray="5 4"/><path d="M42 30 l14 -14 M42 52 l36 -36" stroke="#ffffff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>`,
  tag: (c, d) => `<rect x="32" y="40" width="56" height="76" rx="20" fill="${c}"/><circle cx="60" cy="56" r="7" fill="none" stroke="${d}" stroke-width="4"/>`,
};

const DEFAULTS = { airpods: '#f4f4f2', 'airpods-max': '#d6d8db', earbud: '#f4f4f2', console: '#f4f4f2', vr: '#f4f4f2', portal: '#f4f4f2', crypto: '#22252a', key: '#1c1d20', speaker: '#3a3c40', pencil: '#f4f4f2', mouse: '#f4f4f2', adapter: '#f4f4f2', glass: '#cfe1ea', tag: '#1c1d20', ipad: '#8e9298' };

export function deviceKind(model) {
  const rules = [
    [/^iPhone Duo/, 'iphone-duo'], [/^iPhone Air/, 'iphone-air'], [/^iPhone \d+ Pro/, 'iphone-pro'], [/^iPhone/, 'iphone'],
    [/^iPad/, 'ipad'], [/^Apple Watch/, 'watch'], [/Fitbit/, 'tracker'], [/^AirPods Max/, 'airpods-max'], [/^AirPods/, 'airpods'],
    [/^Наушник|^Амбушюры/, 'earbud'], [/^Кейс AirPods/, 'airpods'], [/^Google Pixel/, 'pixel'], [/SmartTag/, 'tag'],
    [/^(Samsung|Honor|Huawei|Nothing|OnePlus|Xiaomi|Redmi|POCO)/, 'android'], [/VR2/, 'vr'], [/Portal/, 'portal'],
    [/^PlayStation/, 'console'], [/^(YubiKey|Tangem|OneKey KeyTag)/, 'key'], [/^(Ledger|SafePal|CoolWallet|Ellipal|OneKey|Keystone)/, 'crypto'],
    [/^Яндекс/, 'speaker'], [/Pencil/, 'pencil'], [/Mouse/, 'mouse'], [/Адаптер/, 'adapter'], [/стекло/, 'glass'],
  ];
  return (rules.find(([re]) => re.test(model)) || [null, 'android'])[1];
}

export function deviceSvg(kind, color, label = '', attrs = '') {
  const c = color || DEFAULTS[kind] || '#8e9298';
  const d = shade(c, 0.78);
  return `<svg class="device" viewBox="0 0 120 160" role="img" aria-label="${label}"${attrs}><ellipse cx="60" cy="156" rx="40" ry="3" class="device-floor"/>${shapes[kind](c, d)}</svg>`;
}
