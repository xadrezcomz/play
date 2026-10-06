// InventoryManager — loja e inventário (GDD §42): comprar com moedas, equipar
// e voltar para a roupa básica. Tudo fica no save (inventory, equipped).
(function (EP) {
  'use strict';

  function InventoryManager(save, items) {
    this.save = save;
    this.items = items || [];
    this.byId = {};
    for (var i = 0; i < this.items.length; i++) this.byId[this.items[i].id] = this.items[i];
  }
  var P = InventoryManager.prototype;

  P.ensureStarters = function () {
    var s = this.save, self = this;
    this.items.forEach(function (it) {
      if (!it.starter) return;
      if (s.inventory.indexOf(it.id) < 0) s.inventory.push(it.id);
      if (!s.equipped[it.slot] || !self.byId[s.equipped[it.slot]]) s.equipped[it.slot] = it.id;
    });
    // remove itens que não existem mais (dados atualizados)
    for (var k in s.equipped) if (!this.byId[s.equipped[k]]) delete s.equipped[k];
  };

  P.owns = function (id) { return this.save.inventory.indexOf(id) >= 0; };

  P.canBuy = function (id, level) {
    var it = this.byId[id];
    if (!it) return { ok: false, reason: 'missing' };
    if (this.owns(id)) return { ok: false, reason: 'owned' };
    if (it.minLevel && (level || 1) < it.minLevel) return { ok: false, reason: 'level' };
    if (this.save.coins < it.price) return { ok: false, reason: 'coins' };
    return { ok: true, reason: null };
  };

  P.buy = function (id, level) {
    if (!this.canBuy(id, level).ok) return false;
    var it = this.byId[id];
    this.save.coins -= it.price;
    this.save.inventory.push(id);
    this.save.stats.itemsBought = (this.save.stats.itemsBought || 0) + 1;
    EP.events.emit('item_purchased', { id: id, price: it.price });
    return true;
  };

  P.equip = function (id) {
    var it = this.byId[id];
    if (!it || !this.owns(id)) return false;
    this.save.equipped[it.slot] = id;
    EP.events.emit('item_equipped', { id: id, slot: it.slot });
    return true;
  };

  P.starterFor = function (slot) {
    for (var i = 0; i < this.items.length; i++) if (this.items[i].starter && this.items[i].slot === slot) return this.items[i];
    return null;
  };

  P.unequip = function (slot) {
    var st = this.starterFor(slot);
    if (st) this.save.equipped[slot] = st.id; else delete this.save.equipped[slot];
  };

  P.equippedItem = function (slot) { return this.byId[this.save.equipped[slot]] || null; };

  P.byCategory = function (cat) {
    var R = EP.data.rarities || {};
    return this.items.filter(function (it) { return !it.starter && cat.slots.indexOf(it.slot) >= 0; })
      .sort(function (a, b) { return ((R[a.rarity] || {}).order - (R[b.rarity] || {}).order) || (a.price - b.price); });
  };

  P.ownedBySlot = function (slot) {
    var self = this;
    return this.items.filter(function (it) { return it.slot === slot && self.owns(it.id); });
  };

  P.ownedCount = function () {
    var self = this;
    return this.save.inventory.filter(function (id) { return self.byId[id] && !self.byId[id].starter; }).length;
  };

  EP.InventoryManager = InventoryManager;
})(window.EP);
