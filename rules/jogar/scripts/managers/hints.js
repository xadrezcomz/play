// HintController: três níveis de dica por fase.
// Dica 1 é grátis; as próximas passam por RULES.Monetization (hoje, grátis).
(function () {
  'use strict';
  var R = window.RULES, U = R.util;

  R.Hints = {
    sheet: null, list: null, moreBtn: null, level: null, onClose: null,

    init: function (sheet) {
      var self = this;
      this.sheet = sheet;
      this.list = sheet.querySelector('.hint-list');
      this.moreBtn = sheet.querySelector('[data-act="hint-more"]');
      sheet.querySelector('[data-act="hint-close"]').addEventListener('click', function () { self.close(); });
      sheet.addEventListener('pointerdown', function (e) { if (e.target === sheet) self.close(); });
      this.moreBtn.addEventListener('click', function () { self.more(); });
    },

    isOpen: function () { return this.sheet.classList.contains('open'); },

    open: function (level, onClose) {
      this.level = level;
      this.onClose = onClose;
      if (R.Save.hintTier(level.id) < 1) this.reveal(1);
      this.render();
      this.sheet.hidden = false;
      void this.sheet.offsetWidth;
      this.sheet.classList.add('open');
      R.Audio.play('click');
    },

    close: function () {
      if (!this.isOpen()) return;
      var sheet = this.sheet;
      sheet.classList.remove('open');
      setTimeout(function () { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 220);
      if (this.onClose) this.onClose();
      this.onClose = null;
    },

    reveal: function (tier) {
      var id = this.level.id;
      R.Save.setHintTier(id, tier);
      R.Analytics.track('hint_used', { level: id, tier: tier });
    },

    more: function () {
      var self = this, id = this.level.id, next = R.Save.hintTier(id) + 1;
      if (next > 3) return;
      if (!R.Monetization.canRevealHint(id, next)) {
        R.Monetization.requestHint(id, next).then(function (ok) { if (ok) { self.reveal(next); self.render(true); } });
        return;
      }
      this.reveal(next);
      this.render(true);
      R.Audio.play('pop');
    },

    render: function (animateLast) {
      var lv = this.level, tier = R.Save.hintTier(lv.id), list = this.list;
      list.innerHTML = '';
      for (var i = 1; i <= tier; i++) {
        var li = U.el('li', 'hint-item' + (animateLast && i === tier ? ' is-new' : ''), list);
        var n = U.el('span', 'hint-n', li); n.textContent = i;
        var t = U.el('span', 'hint-t', li); t.textContent = R.i18n.plain(lv.hints[i - 1]);
      }
      this.moreBtn.hidden = tier >= 3;
      this.moreBtn.textContent = R.i18n.t(tier === 1 ? 'UI_HINT_MORE' : 'UI_HINT_LAST');
    }
  };
})();
