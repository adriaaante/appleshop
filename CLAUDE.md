# CLAUDE.md — adriaaante/appleshop

## Что это
Сайт-витрина «Кнопочки» (бренд утверждён владельцем 29.10.2026, знак — четыре клавиши, одна нажата; `brandMark` в `src/render.mjs`): каталог техники (iPhone, iPad, Watch, AirPods, Android, PlayStation, криптокошельки,
аксессуары) с ценами из Telegram-канала поставщика @Tm148sg (id -1001204672105) **+ наценка 5%** (`markupPercent`, решение владельца
01.11.2026). Канал — не магазина: на сайте его НЕ упоминать и не ссылаться (решение владельца 01.11.2026). Цены в канале
правят прямо в постах — сайт пересобирается сам. История цен (`data/history.json`) — в ценах канала, без наценки. Node 22, без фреймворков; генератор статических страниц.

## Структура проекта
- `site.config.json` — бренд, контакты (менеджер в Telegram — @grsh535, на него «Написать» и заявки; 01.11.2026), наценка `markupPercent`, срок жизни постов «Обновили наличие» (`updatePostTtlDays`),
  исключённые разделы прайса (`excludeSections`: «Пломбы» — не для витрины), `siteUrl`, `metrikaId`, `leadEndpoint`.
- `scripts/fetch-channel.mjs` — посты канала → `data/posts.json` (веб-версия `t.me/s/Tm148sg` + события бота, если есть токен).
- `src/parse.mjs` — разбор строк прайса в товары (модель, память, цвет, регион по флагу, цена); правила проверяет `test/parse.test.mjs`.
- `scripts/build.mjs` — каталог `data/catalog.json`, история цен `data/history.json`, сайт в `dist/`.
- `src/render.mjs` (шаблоны страниц), `src/devices.mjs` (SVG-силуэты устройств в цвете варианта — фото в канале нет),
  `src/site.css`, `src/site.js` (поиск, фильтры вариантов, заявка), `src/favicon.svg`.
- `photos/` — фото товаров: `sources.json` (модель → официальный снимок производителя, по цветам) → `scripts/photos.py` →
  `photos/<модель>/<цвет>.webp` (без фона, по центру квадрата 1000×1000 — все на одной «студийной» подложке) и `index.json`.
  Нет снимка (02.11.2026: Яндекс Станции, SafePal, Tangem, OneKey, Ellipal, Keystone Essential/Pro, Pixel 11/11 Pro XL/
  11 Pro Fold/8, Honor TURBO/X5e S, Watch Ultra 2, Fitbit, стекло) — объёмный силуэт того же размера, в разделе — после моделей с фото.
  Где брать официальные снимки: Xiaomi/POCO — mi.com/<uk|es|my>/product/<модель>/buy (`*operatorx*`, `*_item_*`); Honor —
  www-file.honor.com/…/product-series/<модель>/<модель>-id-<цвет>-back.png (со страницы honor.com/global/phones/); Huawei —
  consumer.huawei.com/dam/…/pdp/phones/<модель>/list-<цвет>.png; OnePlus — oneplus.com/<cc>/<модель>/specs (`*-1080x1080.png`);
  Nothing — eu.nothing.tech/products/<handle>.json (по одному запросу, без частых повторов); Google — store.google.com
  (почти одни жизненные фото); CoolWallet, Keystone — Shopify `/products/<handle>.json`.
- `src/hero.webp|avif` — обложка (сгенерирована в Higgsfield, gpt_image_2_5: студийные клавиши — знак бренда; 01.11.2026).
- `dist/` — генерируется, в git не хранится. Шрифты Geologica/Onest — из npm (`@fontsource-variable/*`), копируются при сборке.

## Деплой
- Боевой сайт будет на хостинге со своим доменом (решение владельца 01.11.2026; хостинг и домен ещё не выбраны).
- Тестовая копия: https://adriaaante.github.io/appleshop/ — `.github/workflows/update.yml` каждые 30 мин (и при push)
  fetch → build → коммит `data/` в `main` → готовый `dist/` форс-пушем в ветку `gh-pages` (Pages: Deploy from a branch →
  `gh-pages` / root — так решил владелец 01.11.2026). Копия закрыта от поисковиков (`APPLESHOP_PREVIEW_URL` → noindex, `Disallow: /`).
- ⚠ ГРАБЛИ (01.11.2026): `git merge` с конфликтом в `data/posts.json` + `git add -A` закоммитили конфликтные метки в main.
  Данные двух веток не сливать: взять чистую версию файла и пересобрать (`npm run update`).
- ⚠ ГРАБЛИ (30–31.10.2026): пока репо был приватным, запуски Actions падали без шагов — «recent account payments have
  failed or your spending limit…». С 01.11 репо публичный, Actions бесплатны.

## Переменные окружения
- `APPLESHOP_TELEGRAM_BOT_TOKEN` — токен бота @tgbestshopp_bot (админ канала, без прав публикации); секрет GitHub Actions.
  Без него работает только веб-версия канала. Значение в git не хранить.

## Команды
- Фото: `pip install "rembg[cpu]"` (нужен только для "cutout") → `python3 scripts/photos.py [модель …]`, затем глазами
  проверить контакт-лист. Магазин Apple отдаёт packshot по имени: `store.storeimages.cdn-apple.com/1/as-images.apple.com/is/<имя>`
  (имена — в HTML страниц apple.com/shop/buy-…); Samsung — `p6pim/<страна>/<sku>/gallery/…-thumb-…?$1300_1038_PNG$` со страниц
  категорий samsung.com/<cc>/smartphones/galaxy-a/. GSMArena (антибот), Яндекс (капча), safepal/onekey (JS/403) — не обходить.
- `npm run update` — забрать посты и собрать сайт; `npm test` — тесты парсера (должно быть `# fail 0`).
- Посмотреть локально: `cd dist && python3 -m http.server 8765`.

## Грабли
- В веб-версии канала посты-разделители содержат только «.», а пост о гарантии (9547) — с премиум-эмодзи; текст гарантии
  при этом читается. Бот не может получить историю канала — только новые посты/правки (getUpdates хранит их ~24 ч).
- Цена в строке прайса: число после последнего тире; «83.500» и «33 500» — тысячи; год («iPad Air 13 M3 2025») — не цена.
  `S12 42 mm` — Apple Watch, а `S25 FE` — Samsung: часы определяются по «mm», не по букве S.
- Стёкла Remax: в строках стоит оптовая цена 150, розница 300 — в заголовке раздела; парсер берёт розницу, опт — ступенью.
- Опечатки в прайсе (AirPods 4 ANC «99900» вместо ~10 000, 01.11.2026): цена, прыгнувшая в 2,5+ раза от прошлой, на сайте
  «уточняется», в сборке — предупреждение `⚠ подозрительная цена`.
- Тема: кнопка в шапке (`#theme-btn`) ставит `data-theme` на <html> и пишет `localStorage.theme`; скрипт в <head> применяет
  выбор до отрисовки (без вспышки). Не выбрано — как в системе. Цвета — только токены в `:root` и двух тёмных блоках `site.css`.
- Проверка всего сайта перед выкладкой: Playwright по всем страницам (ошибки, 404, битые фото, ссылки, прокрутка на 390 px,
  фильтры, поиск, тема) — 02.11.2026 на 133 страницах проблем не было.
- Анимации появления при прокрутке — только сдвиг, без opacity: иначе невидимые блоки на полном скриншоте и в превью.
- `✖️` у позиции = нет в наличии (так трактуем; подтвердить у владельца).
