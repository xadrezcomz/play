// Fontes (CC0, Quaternius) e dependências (npm): cache fora do repositório, com verificação SHA-1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// espelho público com o pacote completo (Universal Base Characters [Standard] + Universal Animation Library [Standard])
const WR = 'https://raw.githubusercontent.com/MateusJuni0/worldrpgs/main/art/models/';
const UBC = WR + 'quaternius-base-characters/Universal Base Characters[Standard]/';
const BASE = UBC + 'Base Characters/Godot - UE/';
const HAIR = UBC + 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/';
const UAL = WR + 'quaternius-animation-library/Universal Animation Library[Standard]/';
// segundo espelho (só corpos e texturas)
const TPG = 'https://raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/main/assets-source/universal-base-characters/gltf/';

export const FONTES = [
  ['Superhero_Male_FullBody.gltf', '00a1aca72391c92ce0741bb9513b55814b7d56c6', BASE, TPG],
  ['Superhero_Male_FullBody.bin', '1850f12739a596edebf191a7c1a317d7048c3a59', BASE, TPG],
  ['Superhero_Female_FullBody.gltf', '612acbae4e018ff0a6b7e0f8340562bca4790d66', BASE, TPG],
  ['Superhero_Female_FullBody.bin', '05c11dd4cb4616e3edd055b35242ac08c935ba37', BASE, TPG],
  ['T_Superhero_Male_Dark.png', '38d8b5e120a6c786ef85ccf3efd62a5e535378cc', BASE, TPG],
  ['T_Superhero_Female_Dark_BaseColor.png', 'a274b4d4f15a1b13e8a6a604c1215fdd1893aa77', BASE, TPG],
  ['T_Superhero_Male_Normal.png', 'c7512229106efd4bc5211d71b5b177dbd97228dc', BASE, TPG],
  ['T_Superhero_Female_Normal.png', '31ba6e368182f04dce4416390e2de1f237fb6899', BASE, TPG],
  ['T_Eye_Brown.png', '5d93178f09b303805c7de5026f7641bcc637a0e2', BASE, TPG],
  ['T_Hair_1_BaseColor.png', '766f8805348b791c566c317a811d1b1c2a484b2b', BASE, TPG],
  ['T_Hair_2_BaseColor.png', '6ecd00f6d58b05d4f40db1f3ad79fca106dde2cd', BASE, TPG],
  ['License_Standard.txt', 'a678dcf1753309da89d8a7d956e9802839ef657e', UBC],
  ['hair/Hair_SimpleParted.gltf', 'bb840404054aca056ccec6966800d82efe406611', HAIR],
  ['hair/Hair_SimpleParted.bin', '8a56c94ef2f40eb837bfbacb38ff834991634bf5', HAIR],
  ['hair/Hair_Buzzed.gltf', 'd5e8c81ef761a608430516f4e402f272b806e1b7', HAIR],
  ['hair/Hair_Buzzed.bin', '9046e6525a026a62aeeebf65253046f3444d4457', HAIR],
  ['hair/Hair_BuzzedFemale.gltf', '74aa98c9e89ba78f27f0fded35dc1b0157d77780', HAIR],
  ['hair/Hair_BuzzedFemale.bin', '771f71ebaaa0b33865fa2a48f26e279178c5e5ef', HAIR],
  ['hair/Hair_Long.gltf', '665e700db39d205ccda54efae50e86ecf236448a', HAIR],
  ['hair/Hair_Long.bin', '1c03ae78e923116a3371fd589ac194816e365ff0', HAIR],
  ['hair/Hair_Buns.gltf', '7669e686c1f7039d85d917a53f567a5149aaf5f0', HAIR],
  ['hair/Hair_Buns.bin', '22beb1e82d059cb3bd9344e26a61b35dc4c1a34a', HAIR],
  ['ual/UAL1_Standard.glb', 'c3fe59e5e4c21a6d08d060b600458ac466cc12dc', UAL + 'Unreal-Godot/'],
  ['ual/README.txt', '253705248e3ca348226b04fce97929e176a053f0', UAL],
  ['ual/License.txt', '4e06133f1c77807e55229ef0733f6287295fbf04', UAL]
];

export const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');
const enc = u => u.split('/').map((s, i) => i < 3 ? s : encodeURIComponent(s)).join('/');

async function baixar(url) {
  const r = await fetch(enc(url));
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return Buffer.from(await r.arrayBuffer());
}

// garante as fontes em <dir>; baixa o que falta (ou tudo, com force) e confere o SHA-1
export async function garantirFontes(dir, { force = false, log = console.log } = {}) {
  for (const [rel, hash, ...mirrors] of FONTES) {
    const dst = path.join(dir, rel);
    let ok = fs.existsSync(dst) && !force && (!hash || sha1(fs.readFileSync(dst)) === hash);
    if (ok) continue;
    let erro = null;
    for (const m of mirrors) {
      try {
        const buf = await baixar(m + path.basename(rel));
        if (hash && sha1(buf) !== hash) throw new Error('SHA-1 diferente: ' + rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, buf);
        log('  baixado ' + rel + ' (' + (buf.length / 1024).toFixed(0) + ' KB)');
        ok = true; break;
      } catch (e) { erro = e; }
    }
    if (!ok) throw new Error('fonte indisponível: ' + rel + ' — ' + (erro && erro.message));
  }
}

// dependências npm (registry.npmjs.org) instaladas em <dir>/node_modules — nunca no repositório
export const DEPS = { meshoptimizer: '1.3.0', pngjs: '7.0.0', 'jpeg-js': '0.4.4' };
export async function garantirDeps(dir, { log = console.log } = {}) {
  const nm = path.join(dir, 'node_modules');
  const falta = Object.entries(DEPS).filter(([k, v]) => {
    try { return JSON.parse(fs.readFileSync(path.join(nm, k, 'package.json'), 'utf8')).version !== v; } catch { return true; }
  });
  if (falta.length) {
    log('  instalando ' + falta.map(([k, v]) => k + '@' + v).join(' ') + ' em ' + dir);
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', '--prefix', dir,
      ...Object.entries(DEPS).map(([k, v]) => k + '@' + v)], { stdio: 'inherit' });
  }
  const imp = async rel => import(pathToFileURL(path.join(nm, rel)).href);
  const meshopt = await imp('meshoptimizer/index.js');
  const pngjs = await imp('pngjs/lib/png.js');
  const jpeg = await imp('jpeg-js/index.js');
  return { meshopt, PNG: (pngjs.default || pngjs).PNG, jpeg: jpeg.default || jpeg, decoderRef: path.join(nm, 'meshoptimizer', 'meshopt_decoder_reference.js'),
    meshoptLicense: path.join(nm, 'meshoptimizer', 'LICENSE.md') };
}
