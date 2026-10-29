// Поиск с подсказками, фильтры вариантов, заявка. Без зависимостей.
(() => {
  const SHOP = window.SHOP || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rub = (n) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`;
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const goal = (name) => { try { if (window.ym && SHOP.metrika) window.ym(SHOP.metrika, 'reachGoal', name); } catch (e) { /* метрика не обязательна */ } };

  // ---------- поиск ----------
  const ALIASES = [
    [/айфон|iphon/g, 'iphone'], [/айпад/g, 'ipad'], [/эйрподс|аирподс|airpod(?!s)/g, 'airpods'], [/самсунг|галакси/g, 'samsung'],
    [/пиксель/g, 'pixel'], [/плейстейшен|плойка|\b(?:ps|пс)\s?5\b/g, 'playstation 5'], [/часы|вотч/g, 'watch'], [/макс/g, 'max'],
    [/про(?=\s|$)/g, 'pro'], [/эпл|эппл|apple/g, ''], [/хонор/g, 'honor'], [/хуавей/g, 'huawei'], [/сяоми|ксиаоми/g, 'xiaomi'],
    [/(\d+)\s*(tb|тб|терабайт)/g, '$1тб'], [/(\d+)\s*(gb|гб|гигабайт)/g, '$1'], [/ё/g, 'е'],
  ];
  const norm = (s) => ALIASES.reduce((a, [re, to]) => a.replace(re, to), String(s).toLowerCase().replace(/ /g, ' ')).replace(/(\d)\s+(гб|тб)/g, (m, d, u) => (u === 'тб' ? d + 'тб' : d)).replace(/\s+/g, ' ').trim();

  let catalog = null;
  async function loadCatalog(base) {
    if (!catalog) {
      catalog = fetch(`${base}catalog.json`).then((r) => r.json()).then((items) => items.map((x) => ({ ...x, k: norm(`${x.m} ${x.v} ${x.r} ${x.s.replace(/-/g, ' ')}`) })));
    }
    return catalog;
  }
  function find(items, q) {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    const hits = items.filter((x) => words.every((w) => x.k.includes(w)));
    const m = norm(q);
    return hits.sort((a, b) => a.o - b.o || (norm(b.m).startsWith(m) - norm(a.m).startsWith(m)) || a.p - b.p);
  }

  const q = $('#q');
  const box = $('#suggest');
  if (q && box) {
    const base = q.dataset.base || '';
    let sel = -1;
    const render = async () => {
      const items = await loadCatalog(base);
      const hits = find(items, q.value);
      sel = -1;
      if (!q.value.trim()) return (box.hidden = true);
      // по одной строке на модель: самый дешёвый подходящий вариант
      const seen = new Map();
      for (const h of hits) if (!seen.has(h.s)) seen.set(h.s, { ...h, n: hits.filter((x) => x.s === h.s).length });
      const rows = [...seen.values()].slice(0, 7);
      box.innerHTML = rows.length
        ? rows.map((r) => `<a href="${base}p/${r.s}/" role="option"><b>${esc(r.m)}</b><small>${r.n > 1 ? `${r.n} ${plural(r.n, 'подходящий вариант', 'подходящих варианта', 'подходящих вариантов')}` : esc(r.v || r.r || '')}</small><em>${r.n > 1 ? 'от ' : ''}${rub(r.p)}</em></a>`).join('') +
          `<a class="all" href="${base}search/?q=${encodeURIComponent(q.value)}">Все результаты: ${hits.length}</a>`
        : `<p class="muted small" style="padding:10px">Ничего не нашлось. Попробуйте короче: «17 Pro» или «A57».</p>`;
      box.hidden = false;
    };
    q.addEventListener('input', render);
    q.addEventListener('focus', () => q.value && render());
    q.addEventListener('keydown', (e) => {
      const links = $$('a', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.setAttribute('aria-selected', i === sel));
      } else if (e.key === 'Enter' && sel >= 0 && links[sel]) {
        e.preventDefault();
        location.href = links[sel].href;
      } else if (e.key === 'Escape') box.hidden = true;
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.hidden = true; });
  }

  const results = $('#results');
  if (results) {
    const base = results.dataset.base || '';
    const query = new URLSearchParams(location.search).get('q') || '';
    $('#sq').value = query;
    loadCatalog(base).then((items) => {
      const hits = find(items, query);
      $('#search-title').textContent = query ? `«${query}»: ${hits.length ? `${hits.length} ${plural(hits.length, 'вариант', 'варианта', 'вариантов')}` : 'ничего не нашлось'}` : 'Поиск';
      results.innerHTML = hits.slice(0, 200).map((r) => `<li><a href="${base}p/${r.s}/"><span>${esc(r.m)}</span><small>${esc([r.v, r.r].filter(Boolean).join(' · '))}${r.o ? ' · нет в наличии' : ''}</small><em>${rub(r.p)}</em></a></li>`).join('');
    });
  }

  // ---------- фильтры по бренду в разделе ----------
  const brandChips = $('[data-filter-cards]');
  if (brandChips) {
    brandChips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      $$('.chip', brandChips).forEach((c) => c.setAttribute('aria-pressed', c === b));
      $$('.card[data-brand]').forEach((c) => (c.hidden = !!b.dataset.brand && c.dataset.brand !== b.dataset.brand));
    });
  }

  // ---------- фильтры вариантов на странице модели ----------
  const table = $('#variants');
  if (table) {
    const rows = $$('tbody tr', table);
    const chips = $$('#filters .chip');
    const state = {};
    const arts = $$('#model-art .device');
    const show = (hex) => {
      if (!hex || arts.length < 2) return;
      const t = arts.find((a) => a.dataset.hex === hex);
      if (t) arts.forEach((a) => a.toggleAttribute('hidden', a !== t)); // у SVG нет свойства .hidden
    };
    const matches = (row, except) => Object.entries(state).every(([k, v]) => k === except || row.dataset[k] === v);
    const apply = () => {
      let n = 0;
      for (const r of rows) {
        const ok = matches(r);
        r.hidden = !ok;
        if (ok) n++;
      }
      $('#no-match').hidden = n > 0;
      for (const c of chips) {
        c.setAttribute('aria-pressed', state[c.dataset.key] === c.dataset.val);
        c.classList.toggle('is-off', !rows.some((r) => r.dataset[c.dataset.key] === c.dataset.val && matches(r, c.dataset.key)));
      }
      const visible = rows.find((r) => !r.hidden);
      if (visible) show(visible.dataset.hex);
    };
    chips.forEach((c) =>
      c.addEventListener('click', () => {
        const { key, val } = c.dataset;
        if (state[key] === val) delete state[key];
        else state[key] = val;
        apply();
      }),
    );
    rows.forEach((r) => r.addEventListener('mouseenter', () => show(r.dataset.hex)));
  }

  // ---------- заявка ----------
  const dlg = $('#order');
  const form = $('#order-form');
  let item = null;
  const text = () => {
    const f = new FormData(form);
    return [
      'Здравствуйте! Хочу заказать:',
      `${item.model}${item.variant ? ', ' + item.variant : ''}`,
      item.region && `Версия: ${item.region}`,
      `Цена на сайте: ${rub(item.price)}`,
      '',
      `Имя: ${f.get('name')}`,
      `Контакт: ${f.get('contact')}`,
      f.get('comment') && `Комментарий: ${f.get('comment')}`,
      location.href.split('#')[0],
    ].filter((x) => x !== '' && x).join('\n');
  };
  const say = (el, msg) => { el.textContent = msg; el.hidden = !msg; };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-order]');
    if (!b || !dlg) return;
    item = JSON.parse(b.dataset.order);
    $('#order-item').innerHTML = `<b>${esc(item.model)}</b><span>${esc([item.variant, item.region].filter(Boolean).join(' · '))}</span><em>${rub(item.price)}</em>`;
    say($('#order-err'), '');
    say($('#order-done'), '');
    goal('order_open');
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute('open', '');
    $('#o-name').focus();
  });
  const valid = () => {
    if (!form.name.value.trim() || form.contact.value.trim().length < 3) {
      say($('#order-err'), 'Заполните имя и телефон или ник в Telegram — по ним менеджер с вами свяжется.');
      return false;
    }
    return true;
  };
  const copy = async (s) => {
    try {
      await navigator.clipboard.writeText(s);
      return true;
    } catch (e) {
      return false;
    }
  };
  if (form) {
    $('#o-copy').addEventListener('click', async () => {
      if (!valid()) return;
      say($('#order-done'), (await copy(text())) ? 'Текст заявки скопирован.' : 'Не удалось скопировать — выделите текст вручную.');
    });
    form.addEventListener('submit', async (e) => {
      if (e.submitter && e.submitter.value === 'cancel') return;
      e.preventDefault();
      if (!valid()) return;
      say($('#order-err'), '');
      goal('order_send');
      if (SHOP.lead) {
        try {
          const r = await fetch(SHOP.lead, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, ...Object.fromEntries(new FormData(form)), page: location.href }) });
          if (!r.ok) throw new Error(r.status);
          say($('#order-done'), 'Заявка отправлена. Менеджер свяжется с вами в ближайшее время.');
          form.reset();
        } catch (err) {
          say($('#order-err'), 'Заявка не ушла — проблема со связью. Скопируйте текст и отправьте его нам в Telegram.');
        }
        return;
      }
      const msg = text();
      if (SHOP.tg) {
        window.open(`https://t.me/${SHOP.tg}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
        say($('#order-done'), 'Открыли чат с менеджером — осталось нажать «Отправить».');
      } else {
        const ok = await copy(msg);
        window.open(`https://t.me/${SHOP.channel}`, '_blank', 'noopener');
        say($('#order-done'), ok ? 'Текст заявки скопирован — вставьте его в сообщение менеджеру.' : 'Скопируйте текст заявки и отправьте его нам в Telegram.');
      }
    });
  }
})();
