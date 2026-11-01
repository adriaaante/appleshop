import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPrice, parseCatalog } from '../src/parse.mjs';

const cfg = { markupPercent: 0, updatePostTtlDays: 14, excludeSections: ['Пломбы'] };
const parse = (text, date = '2026-10-29T07:00:00Z') =>
  parseCatalog([{ id: 1, date, text }], cfg, new Date('2026-10-29T12:00:00Z')).products;

test('цена: тире, точка и пробел как разделитель тысяч, артикулы после цены', () => {
  assert.equal(findPrice('18 Pro 256 Gb White - 116500').price, 116500);
  assert.equal(findPrice('256 Gray LTE - 83.500').price, 83500);
  assert.equal(findPrice('Poco F9 Ultra 16/512 Black 68 000').price, 68000);
  assert.equal(findPrice('17 256 Gb White - 73400').price, 73400);
  assert.equal(findPrice('PlayStation 5 Pro 2ТБ -119.500 2 рев 7100').price, 119500);
  assert.equal(findPrice('PS5 Slim Digital 825гб - рев2 60500 2118в').price, 60500);
  assert.equal(findPrice('PS5 Slim Digital 1tb 63500 2000в').price, 63500);
  assert.equal(findPrice('A07 4/64 Black 11400').price, 11400);
  assert.equal(findPrice('35w usb-c 6500₽').name, '35w usb-c');
  assert.equal(findPrice('Tangem wallet 2.0 2 карты - 6000').price, 6000);
  assert.equal(findPrice('iPad Air 13 M3 2025'), null); // год — не цена, это заголовок
});

test('iPhone: модель, память, цвет, регион, eSIM', () => {
  const [p] = parse('📱iPhone📱\n18 Pro Max 256 Gb Burgundy - 126000 🇺🇸(e-sim)');
  assert.equal(p.model, 'iPhone 18 Pro Max');
  assert.equal(p.category, 'iphone');
  assert.deepEqual([p.variant.storage, p.variant.color, p.variant.sim], [256, 'Burgundy', 'Только eSIM']);
  assert.deepEqual(p.regions, ['US']);
  assert.equal(p.price, 126000);
});

test('iPad берёт модель из заголовка раздела', () => {
  const [p] = parse('iPad Air 13 M4 2026\n1TB Purple LTE - 162.000');
  assert.equal(p.model, 'iPad Air 13 M4 2026');
  assert.deepEqual([p.variant.storage, p.variant.network], [1024, 'Wi‑Fi + Cellular']);
});

test('Samsung S25 FE — смартфон, а не Apple Watch; Watch — по «mm»', () => {
  const [s, w] = parse('S25 FE 8/512 S731B White 53800\nS12 46 mm Grey - 36700 🇺🇸 S/M');
  assert.equal(s.model, 'Samsung Galaxy S25 FE');
  assert.equal(s.variant.code, 'S731B');
  assert.equal(w.model, 'Apple Watch Series 12');
  assert.deepEqual([w.variant.size, w.variant.band], ['46 мм', 'S/M']);
});

test('стёкла: розничная цена из заголовка раздела, опт — отдельной ступенью', () => {
  const [p] = parse('⚫️ СТЁКЛА REMAX\n. розница 300₽ . опт от 10 шт 150₽\n• 12/13/14 pro - 150₽');
  assert.equal(p.model, 'Защитное стекло Remax для iPhone');
  assert.equal(p.price, 300);
  assert.deepEqual(p.variant.tiers, [{ from: 10, price: 150 }]);
});

test('исключённый раздел и ✖️ (нет в наличии)', () => {
  const ps = parse('🩹🩹Пломбы🩹🩹\n14 pro/14 pro Max - 600₽\n▪️Ellipal:\n• Ellipal Titan - 12.990 ✖️');
  assert.equal(ps.length, 1);
  assert.equal(ps[0].inStock, false);
});

test('пост «Обновили наличие» старше срока не попадает в каталог', () => {
  assert.equal(parse('🍏Обновили наличие и цены🍏\nPoco F9 Ultra 16/512 Black 68 000', '2026-09-01T00:00:00Z').length, 0);
  assert.equal(parse('🍏Обновили наличие и цены🍏\nPoco F9 Ultra 16/512 Black 68 000').length, 1);
});

test('наценка магазина: +5% с округлением вверх, история — в ценах прайса', async () => {
  const { roundPrice } = await import('../src/parse.mjs');
  assert.equal(roundPrice(116500, 5), 122400);
  assert.equal(roundPrice(300, 5), 320);
  assert.equal(roundPrice(1000, 5), 1100);
  assert.equal(roundPrice(8400, 0), 8400);
  const [p] = parseCatalog([{ id: 1, date: '2026-10-29T07:00:00Z', text: '📱iPhone📱\n17 256 Gb Sage - 72500 🇮🇳' }], { ...cfg, markupPercent: 5 }, new Date('2026-10-29T12:00:00Z')).products;
  assert.deepEqual([p.basePrice, p.price], [72500, 76200]);
});
