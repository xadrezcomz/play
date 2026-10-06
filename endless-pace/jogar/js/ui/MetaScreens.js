// MetaScreens — telas "em volta" da corrida (GDD §37–57): loja, equipar,
// conquistas, missões do dia, avisos (popups) e o bloco de XP do resumo.
// Só desenha; quem compra, equipa e salva é o GameManager (via EP.Meta).
(function (EP) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = function (k, p) { return EP.i18n.t(k, p); };
  var L = EP.i18n;

  // cria um elemento com classe e texto
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function btn(cls, text, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function coinTag(n, cls, plus) {
    var s = el('span', 'preco ' + (cls || ''));
    s.appendChild(el('i', 'moeda'));
    s.appendChild(el('b', null, (plus ? '+' : '') + L.num(n)));
    return s;
  }
  function bar(ratio, cls) {
    var b = el('span', 'barra-p ' + (cls || ''));
    var i = el('i');
    i.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + '%';
    b.appendChild(i);
    return b;
  }
  // número com as casas que ele tem (13,29 · 42,195 · 384.400)
  function exact(v) {
    var d = (String(v).split('.')[1] || '').length;
    return L.num(v, Math.min(d, 4));
  }

  var MU = EP.MetaUI = {
    init: function (game) {
      this.game = game;
      this.shopCat = null;
      this.achCat = null;
    },

    // ------------------------------------------------------------ textos
    itemName: function (it) { return it ? t(it.text) : t('equip.none'); },
    rarity: function (it) { return (EP.data.rarities || {})[it.rarity] || { color: '#9aa5b1', text: 'rarity.comum' }; },
    statDef: function (id) { return (EP.data.stats || []).filter(function (s) { return s.id === id; })[0] || { id: id, text: 'stat.' + id, icon: '•' }; },
    // efeito de N pontos de um atributo, em palavras ("Velocidade máxima +3,2%")
    statEffect: function (id, pts) {
      var f = EP.data.statEffects || {}, o = EP.data.offline || {}, v = 0, h = 0;
      switch (id) {
        case 'speed': v = pts * f.speed * 100; break;
        case 'energy': v = pts * f.energy; break;
        case 'recovery': v = pts * f.recovery * 100; break;
        case 'flow': v = pts * f.flow * 100; break;
        case 'flowWindow': v = pts * f.flowWindow * 100; break;
        case 'flowBonus': v = pts * f.flowBonus * 100; break;
        case 'efficiency': v = Math.min(f.efficiencyCap || 0.35, pts * f.efficiency) * 100; break;
        case 'offline': v = pts * f.offlineRate * 100; h = (o.baseHours || 8) + pts * f.offline; break;
      }
      var r = function (x) { return L.num(x, Math.abs(x - Math.round(x)) > 0.01 ? 1 : 0); };
      return t('stat.' + id + '.fx', { v: r(v), h: r(h) });
    },
    statLine: function (id, pts) {
      var d = this.statDef(id);
      return d.icon + ' ' + (pts > 0 ? '+' : '') + pts + ' ' + t(d.text);
    },
    profileColors: function () {
      var a = EP.RunnerRig.resolve(this.game.save.profile);
      return { shirt: a.shirt, shorts: a.shorts, shoes: a.shoes };
    },
    icon: function (it, cls) {
      var s = el('span', 'ic-item ' + (cls || ''));
      s.innerHTML = EP.ItemIcons.svg(it, this._colors || (this._colors = this.profileColors()));
      s.style.setProperty('--rar', this.rarity(it).color);
      return s;
    },
    rewardChips: function (rw) {
      var box = el('span', 'premios'), M = EP.Meta;
      if (!rw) return box;
      if (rw.coins) box.appendChild(coinTag(rw.coins, 'mais', true));
      if (rw.xp) box.appendChild(el('span', 'xp-tag', '+' + L.num(Math.round(rw.xp)) + ' XP'));
      var self = this;
      (rw.items || (rw.item ? [rw.item] : [])).forEach(function (id) {
        if (M.itemsById[id]) box.appendChild(el('span', 'item-tag', '🎁 ' + self.itemName(M.itemsById[id])));
      });
      return box;
    },

    // ------------------------------------------------------------ tela inicial
    home: function (save) {
      var M = EP.Meta;
      if (!M || !M.levels) return;
      this._colors = null;
      var p = M.levels.progress();
      $('i-nivel').textContent = p.level;
      $('i-titulo').textContent = t(M.levels.title(p.level));
      $('i-xp').style.width = Math.round(p.ratio * 100) + '%';
      $('i-xp-txt').textContent = L.num(Math.floor(p.xp)) + ' / ' + L.num(p.need) + ' XP';
      var badge = function (id, n) {
        var b = $(id);
        b.hidden = !(n > 0);
        b.textContent = n > 9 ? '9+' : String(n);
      };
      badge('i-conquistas-selo', M.unseenCount());
      badge('i-missoes-selo', M.pendingMissions());
      // loja: quantos itens novos dá para comprar agora (fora os que vêm de presente de nível)
      var lv = save.profile.level, can = M.items.filter(function (it) { return !it.starter && !M.rewardLevel(it.id) && M.inv.canBuy(it.id, lv).ok; }).length;
      badge('i-loja-selo', can);
    },

    // ------------------------------------------------------------ loja
    shop: function (catId) {
      var M = EP.Meta, save = this.game.save, self = this, cats = EP.data.shopCategories;
      this._colors = null;
      if (catId) this.shopCat = catId;
      if (!this.shopCat) this.shopCat = cats[0].id;
      $('loja-moedas').textContent = L.num(save.coins);
      var tabs = $('loja-abas');
      tabs.innerHTML = '';
      cats.forEach(function (c) {
        var b = btn('aba' + (c.id === self.shopCat ? ' sel' : ''), c.icon + ' ' + t(c.text), function () { EP.AudioManager.ui(); self.shop(c.id); $('loja-lista').scrollTop = 0; });
        tabs.appendChild(b);
      });
      var cat = cats.filter(function (c) { return c.id === self.shopCat; })[0];
      var list = $('loja-lista'), lv = save.profile.level;
      list.innerHTML = '';
      M.inv.byCategory(cat).forEach(function (it) {
        var owned = M.owns(it.id), eq = M.isEquipped(it.id), locked = !owned && it.minLevel && lv < it.minLevel;
        var rar = self.rarity(it);
        var card = btn('item-card' + (owned ? ' dono' : '') + (eq ? ' equipado' : '') + (locked ? ' bloq' : ''), null, function () { EP.AudioManager.ui(); self.item(it.id); });
        card.style.setProperty('--rar', rar.color);
        card.appendChild(self.icon(it));
        var info = el('span', 'ic-info');
        info.appendChild(el('b', 'ic-nome', self.itemName(it)));
        info.appendChild(el('span', 'ic-rar', t(rar.text)));
        var st = el('span', 'ic-stats');
        Object.keys(it.stats || {}).forEach(function (k) { st.appendChild(el('span', null, self.statLine(k, it.stats[k]))); });
        info.appendChild(st);
        var gift = !owned && M.rewardLevel(it.id);
        if (gift) info.appendChild(el('span', 'ic-presente', '🎁 ' + t('shop.freeAt', { n: gift })));
        card.appendChild(info);
        var foot = el('span', 'ic-pe');
        if (eq) foot.appendChild(el('span', 'tag ok', '✓ ' + t('shop.equipped')));
        else if (owned) foot.appendChild(el('span', 'tag', t('shop.owned')));
        else if (locked) foot.appendChild(el('span', 'tag bloq', '🔒 ' + t('shop.levelTag', { n: it.minLevel })));
        else foot.appendChild(coinTag(it.price, save.coins < it.price ? 'caro' : ''));
        card.appendChild(foot);
        list.appendChild(card);
      });
    },

    // detalhe do item (comprar, comparar, equipar) · bought: acabou de comprar
    item: function (id, bought) {
      var M = EP.Meta, G = this.game, save = G.save, self = this, it = M.itemsById[id];
      if (!it) return;
      var box = $('item-corpo'), rar = this.rarity(it), owned = M.owns(id), eq = M.isEquipped(id);
      box.innerHTML = '';
      box.style.setProperty('--rar', rar.color);
      var top = el('div', 'it-topo');
      top.appendChild(this.icon(it, 'grande'));
      var head = el('div', 'it-cab');
      if (bought) head.appendChild(el('span', 'it-comprado', '✓ ' + t('shop.bought')));
      head.appendChild(el('h1', 'tit', this.itemName(it)));
      var tags = el('div', 'it-tags');
      tags.appendChild(el('span', 'rar-pill', t(rar.text)));
      tags.appendChild(el('span', 'slot-pill', (EP.data.itemSlots.filter(function (s) { return s.id === it.slot; })[0] || {}).icon + ' ' + t('slot.' + it.slot)));
      if (it.set) tags.appendChild(el('span', 'slot-pill', t('shop.set', { name: t('set.' + it.set) })));
      head.appendChild(tags);
      top.appendChild(head);
      box.appendChild(top);

      // atributos e o que cada um faz na corrida
      var keys = Object.keys(it.stats || {});
      if (keys.length) {
        box.appendChild(el('h2', null, t('shop.effects')));
        var ul = el('div', 'efeitos');
        keys.forEach(function (k) {
          var row = el('div', 'efeito');
          row.appendChild(el('b', null, self.statLine(k, it.stats[k])));
          row.appendChild(el('span', null, self.statEffect(k, it.stats[k])));
          ul.appendChild(row);
        });
        box.appendChild(ul);
      } else box.appendChild(el('p', 'nota', t('shop.noStats')));

      // comparação com o que está equipado no mesmo espaço
      if (!eq) {
        var cur = M.inv.equippedItem(it.slot);
        box.appendChild(el('h2', null, t('shop.compare')));
        var cmp = el('div', 'comparar');
        cmp.appendChild(el('p', 'nota', t('shop.current', { name: this.itemName(cur) })));
        var d = M.equip.compare(save.equipped, id), any = false;
        var diffs = el('div', 'difs');
        (EP.data.stats || []).forEach(function (s) {
          var v = d[s.id];
          if (!v) return;
          any = true;
          diffs.appendChild(el('span', 'dif ' + (v > 0 ? 'mais' : 'menos'), s.icon + ' ' + (v > 0 ? '+' : '') + v + ' ' + t(s.text)));
        });
        if (!any) diffs.appendChild(el('span', 'dif', t('shop.same')));
        cmp.appendChild(diffs);
        box.appendChild(cmp);
      }

      // ações
      var act = el('div', 'it-acoes');
      if (owned) {
        if (eq) act.appendChild(btn('btn sec largo', '✓ ' + t('shop.equipped'))).disabled = true;
        else act.appendChild(btn('btn pri largo', bought ? t('shop.equipNow') : t('shop.equip'), function () { G.equipItem(id); self.item(id); }));
        if (bought) act.appendChild(btn('btn sec largo', t('shop.keep'), function () { EP.AudioManager.ui(); EP.UI.hide('tela-item'); self.shop(); }));
      } else {
        var can = M.inv.canBuy(id, save.profile.level), gift = M.rewardLevel(id);
        if (gift) act.appendChild(el('p', 'nota presente', '🎁 ' + t('shop.freeAtDesc', { n: gift })));
        var b = btn('btn pri largo comprar', null, function () { G.buyItem(id); });
        b.appendChild(el('span', null, t('shop.buy')));
        b.appendChild(coinTag(it.price));
        b.disabled = !can.ok;
        act.appendChild(b);
        if (can.reason === 'coins') act.appendChild(el('p', 'nota motivo', t('shop.needCoins', { n: L.num(it.price - save.coins) })));
        if (can.reason === 'level') act.appendChild(el('p', 'nota motivo', '🔒 ' + t('shop.needLevel', { n: it.minLevel })));
      }
      box.appendChild(act);
      EP.UI.show('tela-item');
    },

    // ------------------------------------------------------------ equipar
    equip: function () {
      var M = EP.Meta, G = this.game, save = G.save, self = this;
      this._colors = null;
      // bônus somados e o que eles fazem
      var tot = $('eq-total');
      tot.innerHTML = '';
      tot.appendChild(el('h2', null, t('equip.totals')));
      var any = false, grid = el('div', 'eq-bonus');
      (EP.data.stats || []).forEach(function (s) {
        var v = M.totals[s.id];
        if (!v) return;
        any = true;
        var row = el('div', 'efeito');
        row.appendChild(el('b', null, self.statLine(s.id, v)));
        row.appendChild(el('span', null, self.statEffect(s.id, v)));
        grid.appendChild(row);
      });
      if (!any) grid.appendChild(el('p', 'nota', t('equip.noBonus')));
      tot.appendChild(grid);

      var box = $('eq-slots');
      box.innerHTML = '';
      // roupa primeiro (é o que mais muda o boneco), depois os acessórios
      var order = ['shoes', 'shirt', 'shorts', 'head', 'eyes', 'ears', 'wrist'];
      EP.data.itemSlots.slice().sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); }).forEach(function (slot) {
        var cur = M.inv.equippedItem(slot.id), owned = M.inv.ownedBySlot(slot.id);
        var sec = el('div', 'eq-slot');
        var h = el('div', 'eq-cab');
        h.appendChild(el('span', 'eq-ic', slot.icon));
        h.appendChild(el('b', null, t(slot.text)));
        var nm = el('span', 'eq-atual', cur ? self.itemName(cur) : t('equip.none'));
        if (cur) nm.style.color = self.rarity(cur).color;
        h.appendChild(nm);
        sec.appendChild(h);
        var row = el('div', 'eq-linha');
        // acessórios podem ficar vazios
        if (!M.inv.starterFor(slot.id)) {
          var none = btn('mini-card nenhum' + (!cur ? ' sel' : ''), null, function () { G.unequipSlot(slot.id); });
          none.appendChild(el('span', 'ic-item vazio', '∅'));
          none.appendChild(el('span', 'mc-nome', t('equip.none')));
          row.appendChild(none);
        }
        owned.forEach(function (it) {
          var c = btn('mini-card' + (cur && cur.id === it.id ? ' sel' : ''), null, function () { G.equipItem(it.id); });
          c.style.setProperty('--rar', self.rarity(it).color);
          c.appendChild(self.icon(it));
          c.appendChild(el('span', 'mc-nome', self.itemName(it)));
          row.appendChild(c);
        });
        var cat = EP.data.shopCategories.filter(function (c) { return c.slots.indexOf(slot.id) >= 0; })[0];
        var more = btn('mini-card loja', null, function () { G.openShop(cat ? cat.id : null); });
        more.appendChild(el('span', 'ic-item vazio', '+'));
        more.appendChild(el('span', 'mc-nome', t('equip.toShop')));
        row.appendChild(more);
        sec.appendChild(row);
        box.appendChild(sec);
      });
    },

    // ------------------------------------------------------------ conquistas
    achProgressText: function (def, pr) {
      var c = def.cond || {};
      var km = function (m) { return L.num(m / 1000, m >= 100000 ? 0 : 1); };
      if (c.stat === 'totalDistance' || c.stat === 'offlineDistance' || c.record === 'longestRun') {
        return km(Math.min(pr.value, pr.target)) + ' / ' + exact(pr.target / 1000) + ' km';
      }
      if (c.record === 'topSpeed') return L.num(Math.min(pr.value, pr.target), 1) + ' / ' + pr.target + ' km/h';
      if (c.stat === 'draftTime') return L.duration(Math.min(pr.value, pr.target), true) + ' / ' + L.duration(pr.target, true);
      if (c.recordLte) return (pr.value ? t('ach.best', { v: L.num(pr.value, 1) + ' s' }) + ' · ' : '') + t('ach.goal', { v: pr.target + ' s' });
      if (c.rarity) return pr.done ? '1 / 1' : '0 / 1';
      return L.num(Math.min(pr.value, pr.target)) + ' / ' + L.num(pr.target);
    },
    achDesc: function (def, done) {
      if (def.cat === 'distancia') {
        var kmv = def.ref ? def.ref.km : def.cond.gte / 1000;
        var d = t(def.text + '.d', { km: exact(kmv) + ' km' });
        return t(done ? 'ach.doneRef' : 'ach.goalRef', { d: d });
      }
      return t(def.text + '.d');
    },
    achievements: function (catId) {
      var M = EP.Meta, self = this, cats = EP.data.achievementCats, all = M.ach.list();
      // as novidades valem enquanto a tela está aberta: trocar de aba não apaga os selos
      if (!catId || !this._achUnseen) this._achUnseen = (M.save.unseen.achievements || []).slice();
      var unseen = this._achUnseen;
      if (catId) this.achCat = catId;
      if (!this.achCat) this.achCat = cats[0].id;
      $('cq-conta').textContent = '🏆 ' + M.ach.count() + ' / ' + all.length;
      var tabs = $('cq-abas');
      tabs.innerHTML = '';
      cats.forEach(function (c) {
        var mine = all.filter(function (a) { return a.def.cat === c.id; });
        var got = mine.filter(function (a) { return a.unlocked; }).length;
        var news = mine.filter(function (a) { return unseen.indexOf(a.def.id) >= 0; }).length;
        var b = btn('aba' + (c.id === self.achCat ? ' sel' : ''), c.icon + ' ' + t(c.text) + ' ' + got + '/' + mine.length, function () {
          EP.AudioManager.ui(); self.achievements(c.id); $('cq-lista').scrollTop = 0;
        });
        if (news) b.appendChild(el('em', 'ponto'));
        tabs.appendChild(b);
      });
      var list = $('cq-lista');
      list.innerHTML = '';
      all.filter(function (a) { return a.def.cat === self.achCat; }).forEach(function (a) {
        var d = a.def, pr = a.progress, isNew = unseen.indexOf(d.id) >= 0;
        var row = el('div', 'conq' + (a.unlocked ? ' feita' : '') + (isNew ? ' nova' : ''));
        row.appendChild(el('span', 'cq-ic', d.icon));
        var txt = el('div', 'cq-txt');
        var tl = el('b', null, t(d.text + '.t'));
        if (isNew) tl.appendChild(el('span', 'tag novo', t('ach.new')));
        txt.appendChild(tl);
        txt.appendChild(el('span', 'cq-desc', self.achDesc(d, a.unlocked)));
        if (a.unlocked) {
          var dt = new Date(a.at);
          txt.appendChild(el('small', 'cq-data', '✓ ' + t('ach.unlockedOn', { d: dt.toLocaleDateString(L.lang) })));
        } else {
          txt.appendChild(bar(pr.ratio));
          txt.appendChild(el('small', 'cq-prog', self.achProgressText(d, pr)));
        }
        row.appendChild(txt);
        row.appendChild(self.rewardChips(d.reward));
        list.appendChild(row);
      });
      M.seeAchievements();
    },

    // ------------------------------------------------------------ missões
    missionIcon: { distance: '🏃', flowTime: '🌀', perfects: '✨', overtakes: '➡️', combo: '🎯', challenges: '✅', topSpeed: '💨', draftTime: '🌬️', pacers: '🚩', runs: '🔁' },
    // valor de uma missão no formato da unidade (1,5 km · 45 s · 2 min · 14 km/h)
    missionValue: function (def, v, bare) {
      var u = def && def.unit;
      if (bare && (u === 'km' || u === 'kmh')) return u === 'km' ? L.num(v / 1000, v % 1000 ? 1 : 0) : L.num(v, v % 1 ? 1 : 0);   // progresso: a unidade vem depois do alvo
      if (u === 'km') return L.num(v / 1000, v % 1000 ? 1 : 0) + ' km';
      if (u === 's') return v >= 120 && v % 60 === 0 ? L.num(v / 60) + ' min' : v >= 60 ? L.duration(v, true) + ' min' : L.num(Math.floor(v)) + ' s';
      if (u === 'kmh') return L.num(v, Number.isInteger(v) ? 0 : 1) + ' km/h';
      return L.num(Math.floor(v));
    },
    missionText: function (m) {
      var M = EP.Meta, def = M.missions.def(m);
      if (!def) return m.id;
      var key = def.text;
      if (m.target === 1 && L.has(key + '.1')) key += '.1';
      return t(key, { n: this.missionValue(def, m.target) });
    },
    missions: function () {
      var M = EP.Meta, G = this.game, self = this;
      M.refreshDay();
      var now = new Date(), midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      var left = Math.max(60, (midnight - now) / 1000);
      $('ms-reset').textContent = '⏳ ' + t('mis.reset', { t: L.duration(left) });
      var list = $('ms-lista');
      list.innerHTML = '';
      M.missions.list().forEach(function (m, i) {
        var def = M.missions.def(m) || {};
        var row = el('div', 'missao' + (m.done ? ' feita' : '') + (m.claimed ? ' resgatada' : ''));
        row.appendChild(el('span', 'cq-ic', self.missionIcon[m.metric] || '🎯'));
        var txt = el('div', 'cq-txt');
        txt.appendChild(el('b', null, self.missionText(m)));
        txt.appendChild(bar(m.target ? m.progress / m.target : 0));
        txt.appendChild(el('small', 'cq-prog', self.missionValue(def, Math.min(m.progress, m.target), true) + ' / ' + self.missionValue(def, m.target)));
        txt.appendChild(self.rewardChips(def.reward));
        row.appendChild(txt);
        if (m.claimed) row.appendChild(el('span', 'tag ok', '✓ ' + t('mis.claimed')));
        else if (m.done) row.appendChild(btn('btn pri resgatar', t('mis.claim'), function () { G.claimMission(i); }));
        list.appendChild(row);
      });
      // bônus do dia
      var all = M.missions.list(), claimed = all.filter(function (m) { return m.claimed; }).length;
      var bonus = el('div', 'missao bonus' + (M.save.missions.bonusClaimed ? ' resgatada' : ''));
      bonus.appendChild(el('span', 'cq-ic', '🎁'));
      var bt = el('div', 'cq-txt');
      bt.appendChild(el('b', null, t('mis.bonus')));
      bt.appendChild(el('span', 'cq-desc', t('mis.bonusDesc')));
      bt.appendChild(bar(all.length ? claimed / all.length : 0, 'ouro'));
      bt.appendChild(el('small', 'cq-prog', claimed + ' / ' + all.length));
      bt.appendChild(self.rewardChips(EP.data.missions.bonus));
      bonus.appendChild(bt);
      if (M.save.missions.bonusClaimed) bonus.appendChild(el('span', 'tag ok', '✓ ' + t('mis.claimed')));
      else if (M.missions.allClaimed()) bonus.appendChild(btn('btn pri resgatar', t('mis.claim'), function () { G.claimBonus(); }));
      list.appendChild(bonus);
    },

    // ------------------------------------------------------------ avisos (um de cada vez)
    // p: { type, data } de EP.Meta.popups · done(action)
    popup: function (p, done) {
      var box = $('av-caixa'), self = this, d = p.data || {};
      box.innerHTML = '';
      box.className = 'caixa aviso-caixa ' + p.type;
      var big = el('div', 'av-ic'), title = '', lines = [], reward = null, extra = null, toWear = null;
      switch (p.type) {
        case 'offline':
          big.textContent = '🌙';
          title = t('pop.offline.t');
          lines.push(t('pop.offline.d', { h: L.duration(d.hours * 3600), d: L.dist(d.meters) }));
          if (d.capped) lines.push(t('pop.offline.cap', { h: L.num(d.capHours, d.capHours % 1 ? 1 : 0) }));
          reward = { coins: d.coins, xp: d.xp };
          break;
        case 'level':
          big.textContent = '⭐';
          big.appendChild(el('b', 'av-nivel', String(d.level)));
          title = t('pop.level.t', { n: d.level });
          lines.push(t('pop.level.d', { title: t(EP.Meta.levels.title(d.level)) }));
          reward = { coins: 0, items: [] };
          (d.rewards || []).forEach(function (r) {
            if (r.coins) reward.coins += r.coins;
            if (r.item) reward.items.push(r.item);
            // presente que o jogador já tinha comprado: devolve as moedas
            if (r.refund && EP.Meta.itemsById[r.refund]) lines.push(t('pop.level.refund', { item: self.itemName(EP.Meta.itemsById[r.refund]) }));
          });
          // "Equipar agora" só para item novo que ainda não está no corpo
          var toWear = reward.items.filter(function (id) { return !EP.Meta.isEquipped(id); });
          break;
        case 'achievement':
          big.textContent = d.icon || '🏆';
          title = t('pop.ach.t');
          lines.push(t(d.text + '.t'));
          extra = this.achDesc(d, true);
          reward = d.reward;
          break;
        case 'region':
          big.textContent = '🧭';
          title = t('pop.region.t');
          lines.push(t('pop.region.d', { name: t(d.text) }));
          break;
        case 'gift':
          big.textContent = '🎁';
          title = t('pop.gift.t');
          lines.push(t('pop.gift.d', { n: L.num(d.coins) }));
          break;
      }
      box.appendChild(big);
      box.appendChild(el('h1', 'tit', title));
      lines.forEach(function (s, i) { box.appendChild(el('p', i ? 'nota' : 'av-txt', s)); });
      if (extra) box.appendChild(el('p', 'nota', extra));
      if (reward && (reward.coins || reward.xp || reward.item || (reward.items && reward.items.length))) box.appendChild(self.rewardChips(reward));
      var acts = el('div', 'av-acoes');
      if (p.type === 'gift') {
        acts.appendChild(btn('btn pri largo', '🛍️ ' + t('pop.gift.go'), function () { done('shop'); }));
        acts.appendChild(btn('btn sec largo', t('pop.later'), function () { done('ok'); }));
      } else if (p.type === 'level' && toWear && toWear.length) {
        acts.appendChild(btn('btn pri largo', t('pop.equip'), function () { done('equip'); }));
        acts.appendChild(btn('btn sec largo', t('pop.ok'), function () { done('ok'); }));
      } else acts.appendChild(btn('btn pri largo', t('pop.ok'), function () { done('ok'); }));
      box.appendChild(acts);
      EP.UI.show('tela-aviso');
      setTimeout(function () { var b = box.querySelector('.btn'); if (b) b.focus(); }, 30);
    },

    // ------------------------------------------------------------ resumo da corrida
    // info: { xp, levelFrom, levelTo, achievements: [def], missions: [m] }
    summary: function (info) {
      var box = $('r-meta'), M = EP.Meta, self = this;
      box.innerHTML = '';
      if (!M || !M.levels) return;
      var p = M.levels.progress();
      var xp = el('div', 'r-xp');
      var top = el('div', 'r-xp-topo');
      top.appendChild(el('span', 'nivel-mini', t('lvl.short') + ' ' + p.level));
      top.appendChild(el('span', 'r-xp-t', info.levelTo > info.levelFrom ? '⭐ ' + t('sum.levelUp', { n: info.levelTo }) : t(M.levels.title(p.level))));
      top.appendChild(el('b', 'xp-tag', '+' + L.num(Math.round(info.xp)) + ' XP'));
      xp.appendChild(top);
      xp.appendChild(bar(p.ratio, 'xp'));
      box.appendChild(xp);
      if (info.achievements.length) {
        box.appendChild(el('h2', null, t('sum.achievements')));
        info.achievements.forEach(function (d) {
          var row = el('div', 'r-linha');
          row.appendChild(el('span', 'r-ic', d.icon));
          row.appendChild(el('b', null, t(d.text + '.t')));
          row.appendChild(self.rewardChips(d.reward));
          box.appendChild(row);
        });
      }
      if (info.missions.length) {
        box.appendChild(el('h2', null, t('sum.missions')));
        info.missions.forEach(function (m) {
          var row = el('div', 'r-linha');
          row.appendChild(el('span', 'r-ic', self.missionIcon[m.metric] || '🎯'));
          row.appendChild(el('b', null, self.missionText(m)));
          box.appendChild(row);
        });
        box.appendChild(el('p', 'nota', t('sum.missionsHint')));
      }
    },

    // ------------------------------------------------------------ aviso na corrida (conquista, missão, nível)
    runToast: function (icon, label, text) {
      var q = this._rq || (this._rq = []);
      q.push({ icon: icon, label: label, text: text });
      if (!this._rqBusy) this._nextRunToast();
    },
    _nextRunToast: function () {
      var self = this, n = this._rq.shift(), e = $('h-meta');
      if (!n) { this._rqBusy = false; return; }
      this._rqBusy = true;
      $('h-meta-ic').textContent = n.icon;
      $('h-meta-rot').textContent = n.label;
      $('h-meta-txt').textContent = n.text;
      e.hidden = false;
      e.classList.remove('mostra'); void e.offsetWidth; e.classList.add('mostra');
      clearTimeout(this._rqT);
      this._rqT = setTimeout(function () { e.classList.remove('mostra'); setTimeout(function () { e.hidden = true; self._nextRunToast(); }, 300); }, 2800);
    },
    clearRunToasts: function () {
      this._rq = [];
      this._rqBusy = false;
      clearTimeout(this._rqT);
      var e = $('h-meta');
      if (e) { e.hidden = true; e.classList.remove('mostra'); }
    }
  };
})(window.EP);
