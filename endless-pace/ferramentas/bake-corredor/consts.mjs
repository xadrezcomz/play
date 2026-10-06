// Constantes compartilhadas do formato (§11.2): espaços de cor, materiais e bits de cobertura.
export const SLOTS = ['skin', 'brow', 'lash', 'eye', 'hair', 'hairTie', 'shirt', 'shirtTrim', 'shirtAccent', 'shorts', 'shortsTrim', 'shortsAccent',
  'sock', 'sockTrim', 'shoe', 'shoeAccent', 'sole', 'midsole', 'lace', 'lining'];
export const SL = Object.fromEntries(SLOTS.map((s, i) => [s, i]));
export const MATS = ['skin', 'cotton', 'tech', 'hair', 'shoe', 'eye'];
export const MI = Object.fromEntries(MATS.map((s, i) => [s, i]));
export const COVER_BITS = { camiseta: 0, regata: 1, top: 2, 'manga-longa': 3, 'corta-vento': 4, short: 5, bermuda: 6, legging: 7, 'saia-short': 8, meia: 9, tenis: 10,
  'hair:curto': 11, 'hair:cacheado': 12, 'hair:rabo': 13, 'hair:coque': 14, 'hair:longo': 15, 'hair:raspado': 16 };
export const HAIRS = ['curto', 'cacheado', 'rabo', 'coque', 'longo', 'raspado'];
