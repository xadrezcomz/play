# ESPEC-corredor — bake spec: Quaternius UBC → ENDLESS PACE runner

Status: spec v1 (2026-10-06). Target: one Node 22 ESM script, `ferramentas/assa-corredor.mjs` (assar = bake). No Blender.
Output: classic-script JS data files under `jogar/dados/modelos/` + a decoder module. The game must keep running from `file://`
and as the single HTML built by `ferramentas/arquivo-unico.mjs` (which inlines every `<script src>`; base64 contains no `<`).

All numbers below were checked on the actual files (prototype scripts in the session scratchpad: `spec/proto.mjs`,
`spec/slim.mjs`, `spec/sizetest.mjs`). Where a number is a tuning value it says so.

---------------------------------------------------------------------------------------------------------------------

## 0. What is in the source files (inspection results)

Sources (CC0): `verify-ubc/` = `Superhero_{Male,Female}_FullBody.gltf/.bin` + textures, `hair/*.gltf`, `ual/UAL1_Standard.glb`.

### 0.1 Bodies

| | Male | Female |
|---|---|---|
| glTF generator | Blender I/O 4.3.47 | same |
| nodes | `Armature` > {`Eyebrows`(mesh0), `Eyes`(mesh1), body(mesh2), `root`} | same |
| skin | 1 skin, **65 joints**, identical joint names in both | same |
| body mesh | `Sphere.005_Retopology.004`, mat `MI_Superhero_Male`: **7281 v / 12566 tris** | `Superhero_Female`: **7376 v / 12812 tris** |
| body topology (welded at 1e-5) | 6285 v, **0 boundary edges, 0 non-manifold, 1 component** (watertight) | 6408 v, watertight, 1 component |
| brows/lashes mesh | mesh0 (`Face`, mat `MI_Hair_1`) 984 tris: 2 brow cards × 424 + 2 upper-lash strips × 68 (strips are open: 120 boundary edges) | mesh0 (`Eyebrows`, `MI_Hair_2`) 1480 tris: 2 lash cards × 420 (y 1.649–1.663) + 2 brow cards × 320 (y 1.669–1.687), all closed |
| eyes | mesh1, `MI_Eyes`, 768 tris = 2 closed spheres × 384, center ≈ (±0.0338, 1.6985, 0.0696), front radius 0.011 | center ≈ (±0.0345, 1.6559, 0.0631), r 0.012 |
| eye UV | front (iris) vertex uv = (0.496, 0.501); **88 verts with u>1 (up to 1.215), all on the back of the eyeball** | all in [0,1] |
| bbox (bind) | x ±0.929 (T-pose), y −0.010…1.810, z −0.163…0.128 | x ±0.834, y −0.008…1.767 |
| other attributes | TEXCOORD_1 (unused lightmap-ish), COLOR_0 = all white, COLOR_1 constant → **ignore all of them** | same (+COLOR_2, TEXCOORD_2..4: ignore) |
| influences | ≤4, mostly 2 (4335 v); weights float | same |

Bind pose = node rest pose exactly (|inverse(IBM) − node world| = 0). **The mesh is in a strict T-pose**: `upperarm_l`→`lowerarm_l`
direction = (1.000, 0.000, −0.030). Units are meters, **up = +Y, front = +Z** (toes at +z), character's left (`_l`) at **+X**.
`root` has the Blender −90° X rotation; pelvis is under it. Use world matrices = `inverse(IBM)`; never trust node order.

Bind joint world positions (glTF frame):

| joint | male | female |
|---|---|---|
| pelvis | (0, 0.9491, −0.0430) | (0, 0.9318, −0.0457) |
| spine_01 / 02 / 03 | y 1.0720 / 1.1778 / 1.3109 | y 1.0546 / 1.1642 / 1.2906 |
| neck_01 | (0, 1.5205, −0.0414) | (0, 1.4849, −0.0406) |
| Head | (0, 1.5998, −0.0174) | (0, 1.5496, −0.0109) |
| clavicle_l | (0.0314, 1.4953, 0.0335) | (0.0293, 1.4305, 0.0160) |
| upperarm_l | (0.2120, 1.4555, −0.0654) | (0.1516, 1.4181, −0.0543) |
| lowerarm_l / hand_l | x 0.4630 / 0.7065 | x 0.3919 / 0.6411 |
| thigh_l | (0.1143, 0.9712, −0.0360) | (0.1114, 0.9441, −0.0518) |
| calf_l (knee) | (0.1143, 0.5424, −0.0361) | (0.1114, 0.5347, −0.0323) |
| foot_l (ankle) | (0.1143, 0.0865, −0.0875) | (0.1114, 0.0707, −0.0765) |
| ball_l / ball_leaf_l | z 0.0547 / 0.1336, y 0.0152 | z 0.0618 / 0.1299, y 0.0148 |

Joint list (65): root, pelvis, spine_01..03, neck_01, Head, clavicle_x, upperarm_x, lowerarm_x, hand_x, {index,middle,ring,pinky,thumb}_{01,02,03,04_leaf}_x, thigh_x, calf_x, foot_x, ball_x, ball_leaf_x (x = l/r).
Bone local axis convention (Blender): bone points along local +Y; for finger phalanges **local +X is the flexion axis** (positive = curl).

Triangles by dominant joint group (male / female): head 2544/2740, neck 352/380, torso (spine+clavicle) 1360/1653, pelvis 420/427,
upper arm 604/668, forearm 646/712, **hands 3356/3012**, thigh 880/896, shin 1092/1024, **feet 1312/1300**.
Mean edge length: torso 3.0 cm, thigh 3.8 cm, upper arm 3.1 cm, head 1.1 cm, hands 0.9 cm, feet 1.7 cm.
Consequence: garment shells need one subdivision level (§6.6); hands are over-dense (simplify, §10); feet are deleted (§7).

Muscle/underwear: geometry is superhero (huge traps, lats, deltoids, abs, thick neck); **the underwear is modelled in the geometry too**
(male boxer bulge + waistband ridge; female bra cups + brief edge) and painted dark grey in the albedo.

### 0.2 Textures

| file | size | notes |
|---|---|---|
| `T_Superhero_Male_Dark.png`, `T_Superhero_Female_Dark_BaseColor.png` | 2048² RGB | medium-tan skin with baked muscle shading, painted dark underwear, painted eyes in the face island, scalp painted brown, male stubble; female has dark eyeliner wings and freckles |
| `T_Superhero_{Male,Female}_Normal.png` | 2048² RGBA (A=255) | tangent space, glTF (OpenGL) convention |
| `*_Roughness.png` | 2048² | **ignore** (our shader sets specular per `mat`) |
| `T_Eye_Brown.png` | 256² RGBA (A=255) | iris centered at uv (0.5, 0.5) |
| `T_Hair_1/2_BaseColor.png`, normals | 2048² | strand texture; brows/lashes UVs into it render speckled/white → **never use for brows/lashes** |

UV layout (one 0..1 atlas per gender, glTF convention v down): coverage 71.5 % (m) / 72.2 % (f). Face island top-left, hands and feet
top-middle, torso/back/limbs as tall strips. **Largest free square with 8 px padding at 1024²: 113 px at (723,163) male,
122 px at (809,0) female** — enough for the eye tile and the neutral patch (§9). Do **not** hard-code UV rectangles: every
texture edit uses the texel→3D "position atlas" (§9.1).

JPEG sizes measured: skin 1024² q88 ≈ 60 KB, normal 512² q88 ≈ 43 KB.

### 0.3 Hair parts (`hair/*.gltf`, each skinned 100 % to `Head`, 65-joint skeleton)

Head bind is identical to the matching body: male hairs use Head (0, 1.5998, −0.0174), female hairs Head (0, 1.5496, −0.0109)
(the male hair files carry a slightly different arm skeleton; irrelevant, only Head matters).

| file | skeleton | tris | welded v / boundary edges / components | content |
|---|---|---|---|---|
| Hair_SimpleParted | male | 1301 | 695 / 87 / 1 | short side-parted |
| Hair_Buzzed | male | 830 | 466 / 100 / 1 | buzz cap |
| Hair_BuzzedFemale | female | 830 | 466 / 100 / 1 | buzz cap |
| Hair_Long | female | 2906 | 1521 / 124 / 7 | center part, straight, ends at y 1.501 (≈ trapezius); comps: back mass 1552, inner layer 430, 5 front strands 164–204 |
| Hair_Buns | female | 3284 | 1699 / 92 / 9 | scalp cap 1712 (centroid z −0.052), face-framing layer 480 (front, down to y 1.53), **two side buns 332 each, centroid (±0.108, 1.711, −0.089)**, 4 small bang strands |
| Hair_Beard | male | 1034 | 596 / 158 / 1 | optional, not used in v1 |
| Eyebrows_Regular / _Female | m / f | 984 / 1480 | = mesh0 of the bodies | redundant with the body files' mesh0 |

All hair shells are open (FrontSide shows holes from below) → §8.6 back-face strips.

### 0.4 UAL1_Standard.glb

43 animations, same 65 joint names. `Jog_Fwd_Loop` has a runner's fist: phalanges `_02`/`_03` ≈ quaternion (0.62334, 0, 0, 0.78195)
= 77° about local +X; `_01` and thumbs differ more. Used only as the **source of the relaxed-fist finger pose** (§4).

---------------------------------------------------------------------------------------------------------------------

## 1. Re-posing (T-pose → arms down) — method

Do it on the UBC skeleton, then linear-blend-skin the mesh once and take the result as the new rest mesh.

1. Local transforms `L_j` = node TRS of each joint. Override (before FK):
   - fingers and thumbs `{index,middle,ring,pinky,thumb}_0{1,2,3}_x`: `slerp(L_rest.rot, UAL_jog_mean.rot, 0.8)` (§4);
   - `hand_x`: `slerp(L_rest.rot, UAL_jog_mean.rot, 0.5)`.
2. FK: `W_j = W_parent · L_j` (root = node world of `root`).
3. World-space subtree rotations about the joint pivot, in this order, both sides (sx = +1 for `_l`, −1 for `_r` in glTF frame):
   - `clavicle_x`: rotate subtree about axis (0,0,1) by **−sx·8°** (drops the shoulder girdle; tuning).
   - `upperarm_x`: minimal rotation taking dir(`upperarm`→`lowerarm`) to `t = normalize(sx·sin α, −cos α, 0)`,
     **α = 10° male, 13° female** (abduction so the fist clears the thigh). Adaptive rule: after §6 is built, if the minimum distance
     between hand vertices and the outer surface of the loosest bottom garment (short) is < 15 mm, add 1° and redo (max 16°).
   - `lowerarm_x`: rotate so the forearm is collinear with the upper arm, then flex **8° forward** (towards +Z glTF / −Z game)
     about `normalize(cross(upperDir, (0,0,1)))` with the sign chosen so the wrist moves forward (assert wrist.z increases).
   - Palms must face the thigh (medial). Check: palm normal of `hand_l` (cross of (index_01−pinky_01) and (middle_01−hand)) has
     x-component < −0.7·|n| for the left hand in glTF frame. (Verified: the plain swing-down already gives this.)
4. Skin matrices `S_j = W'_j · IBM_j`; posed position `p' = Σ w_k S_k p`; normal `n' = normalize(Σ w_k R(S_k) n)` (rigid
   matrices, no scale). Apply to body, eyes and brows/lashes meshes (they are Head-only, so unchanged).
5. Measured on the prototype (α 10/13, clavicle 8°): male fist–thigh gap 43 mm, female 12 mm (rises after slimming, §2).
   Visual result: natural standing figure, fists beside the thighs (`spec/pm.png`, `pf.png`).

Hairs are authored in the T-pose bind but the head never moves in this re-pose → hair positions are used as-is (then §1.6 frame).

### 1.6 Final frame (applied to everything at the end of geometry processing)

    game = ( −x·s ,  (y − y_floor)·s + LIFT ,  −z·s )        // 180° about Y, uniform scale, lift onto the shoe sole

- 180° about +Y (not a mirror): glTF front +Z → game front −Z; UBC `_l` (glTF +X) → game −X = game `armL/legL` (matches
  `BodyModel.bonePos`: armL at negative x). Winding is preserved.
- `y_floor` = min y of the re-posed barefoot body (−0.010 m / −0.008 f).
- **Scale choice (documented): both genders baked in "1.76 space"** — barefoot height (skull top − sole) = **1.76 m for both**:
  `s_m = 1.76 / (1.810 + 0.010) = 0.96703`, `s_f = 1.76 / (1.767 + 0.008) = 0.99155`.
  The runtime formula `body.scale = height/1.76` stays unchanged and gives 1.76 m (m) and 1.68 m (f).
  Data also carries `heightReal` (1.76 / 1.68) for anyone who needs true meters.
- `LIFT = 0.022` m: shoe sole thickness under the heel (§7). Feet of the body stand on the insole at y = 0.022; the shoe outsole
  bottom is at **y = 0** (contract "feet on y = 0" refers to the shoe).

---------------------------------------------------------------------------------------------------------------------

## 2. Fit-runner body (muscle reduction) — runs after §1, before §3

All in the re-posed glTF frame (before §1.6), on welded vertices, then copied to UV-split duplicates.

### 2.1 Radial girth reduction per joint segment
For each vertex and each of its UBC influences `j` (weight `w`): segment `a = pos(j)`, `b = pos(child(j))` (table below);
`c` = closest point on segment ab; `r = p − c`; scaled point `q_j = c + (r.x·kx, r.y·(kx+kz)/2, r.z·kz)`.
New position = `Σ w·q_j` (joints not in the table contribute `p`). Factors (tuning values, validated visually):

| joint (child for the axis) | male kx, kz | female kx, kz |
|---|---|---|
| upperarm (→lowerarm) | 0.84, 0.86 | 0.93, 0.93 |
| lowerarm (→hand) | 0.90, 0.90 | 0.95, 0.95 |
| clavicle (→upperarm) | 0.80, 0.85 (traps) | 0.90, 0.90 |
| neck_01 (→Head) | 0.84, 0.88 | 0.90, 0.92 |
| spine_03 (→neck_01) | 0.88, 0.95 (lats) | 0.95, 0.94 (bust) |
| spine_02 (→spine_03) | 0.92, 0.95 | 0.96, 0.98 |
| spine_01 (→spine_02) | 0.95, 0.96 | 0.97, 0.98 |
| pelvis (→spine_01) | 0.97, 1.00 | 0.96, 1.00 |
| thigh (→calf) | 0.92, 0.94 | 0.93, 0.95 |
| calf (→foot) | 0.94, 0.95 | 0.96, 0.97 |

### 2.2 Taubin smoothing (removes abs/serratus/vein relief without shrinking)
Uniform-Laplacian Taubin, λ = 0.5, μ = −0.53, **8 iterations**, per-vertex strength `m` = sum of UBC weights on
{spine_*, pelvis, clavicle_*, upperarm_*, lowerarm_*, thigh_*, neck_01}; head, hands and feet get m = 0 (untouched).
Extra: underwear ridges/bulge — vertices whose texel (§9.1) is in the underwear mask get 6 extra Taubin iterations
(flattens the male bulge and the waistband/bra-edge ridges so tight garments do not show them).
Result (prototype `spec/sm.png`, `sf.png`): male reads as a fit recreational runner; female keeps a feminine figure, slimmer thighs.

### 2.3 Texture/normal de-emphasis — see §9.3 (albedo high-pass attenuation + normal-map flattening).

### 2.4 Female face softening (texture + small geometry), see §9.4. Brow cards: scale each female brow card about its centroid
by (1, 0.82, 1) (thinner); brows tinted from hair color (never black).

---------------------------------------------------------------------------------------------------------------------

## 3. Bones: mapping UBC → game, positions

### 3.1 Bone list (contract order + hair springs). Rest rotations identity, positions parent-relative.

| idx | name | parent | rest position source (world, final frame) |
|---|---|---|---|
| 0 | hips | – | midpoint of `thigh_l` and `thigh_r` (hip joints) |
| 1 | torso | hips | `spine_01` (lumbar pivot; old rig had it at hips — moving it up gives a real waist bend) |
| 2 | head | torso | `neck_01` (neck base) |
| 3 | armL | torso | `upperarm_l` after §1 (shoulder) |
| 4 | elbowL | armL | `lowerarm_l` after §1 |
| 5 | armR | torso | `upperarm_r` |
| 6 | elbowR | armR | `lowerarm_r` |
| 7 | legL | hips | `thigh_l` |
| 8 | kneeL | legL | `calf_l` |
| 9 | footL | kneeL | `foot_l` (ankle) |
| 10–12 | legR, kneeR, footR | | mirrored |
| 13 | pony | head | ponytail root (§8.3) |
| **14** | **pony2** | pony | mid ponytail (§8.3) — new spring bone |
| **15** | **hairA** | head | back of head, ear level (§8.4) — new spring bone for `longo` |
| **16** | **hairA2** | hairA | 13 cm below hairA (§8.4) — new spring bone |

Expected world positions (final frame, prototype values, ±5 mm after tuning):

| | male | female (1.76 space) |
|---|---|---|
| hips | (0, 0.971, 0.035) | (0, 0.966, 0.051) |
| torso | (0, 1.068, 0.007) | (0, 1.076, 0.015) |
| head (neck base) | (0, 1.502, 0.040) | (0, 1.502, 0.040) |
| armL | (−0.198, 1.415, 0.063) | (−0.147, 1.419, 0.054) |
| elbowL | (−0.240, 1.176, 0.063) | (−0.201, 1.187, 0.054) |
| wrist (anchor) | (−0.281, 0.946, 0.030) | (−0.256, 0.949, 0.019) |
| legL | (−0.111, 0.971, 0.035) | (−0.110, 0.966, 0.051) |
| kneeL | (−0.111, 0.556, 0.035) | (−0.110, 0.560, 0.032) |
| footL | (−0.111, 0.115, 0.085) | (−0.110, 0.100, 0.076) |
| toe tip (anchor) | (−0.111, 0.046, −0.129) | (−0.110, 0.045, −0.129) |

Note the new hip height (0.97) is higher than the old `HIP_H = 0.91`: the runtime must read `measures.hipY` (§11) instead.

### 3.2 Joint position checks (no silent changes)
For knee, ankle, elbow and wrist compute the centroid of the welded ring of limb vertices within ±1 cm along the bone axis; report the
perpendicular offset joint↔centroid. Keep the UBC joint unless the offset > 15 mm (then move only the perpendicular components to
the centroid and log it). UBC joints are expected to pass (weights were authored for them).

### 3.3 Weight collapse (UBC 65 → game)

| UBC joints | game bone |
|---|---|
| root, pelvis | hips |
| spine_01, spine_02, spine_03, clavicle_l, clavicle_r | torso |
| neck_01, Head | head |
| upperarm_x | armX |
| lowerarm_x, hand_x, all finger/thumb joints of side x | elbowX (hand is rigid with the forearm; no wrist bone) |
| thigh_x | legX |
| calf_x | kneeX |
| foot_x, ball_x, ball_leaf_x | footX |

Sum duplicates, keep the 4 largest, renormalize, quantize to Uint8 with **sum exactly 255** (add the rounding remainder to the
largest). Side `x`: `_l` → L (−X), `_r` → R. Hair/spring weights per §8. Clavicle→torso means the shoulder girdle never shrugs
(fine for running ±45°; the `celebrate` arms-up pose will pinch at the deltoid — known LBS limit, see §11.7).

Bind identity check (assert): with all game bones at rest (identity rotations), skinning the output reproduces the stored positions
with max error < 1e-5 m.

---------------------------------------------------------------------------------------------------------------------

## 4. Relaxed fist

Source: `UAL1_Standard.glb` → animation `Jog_Fwd_Loop` → per finger/thumb joint the **sign-aligned mean quaternion over all keys**
(normalize the sum, flipping keys whose dot with key 0 is negative). Joints: `{index,middle,ring,pinky}_0{1,2,3}_x`,
`thumb_0{1,2,3}_x`, `hand_x`. Apply as in §1 step 1: fingers/thumbs `slerp(rest, jog, 0.8)` (≈ 62° per phalanx — relaxed,
not clenched), wrist `slerp(rest, jog, 0.5)`. Copy **rotations only**, never translations (bone lengths stay UBC).
Then collapse hand/finger weights to `elbowX` (§3.3).
Checks: (a) no fingertip vertex inside the palm by > 2 mm (closest-point sign test against the hand's own triangles excluding the
finger's own chain); (b) close-up render §12 R7.

---------------------------------------------------------------------------------------------------------------------

## 5. Body labeling: regions, coordinates, cover masks

All in the final frame (§1.6), on the processed body (after §2, feet removed per §7.1).

### 5.1 Per-vertex coordinates
- Collapsed game weights `w[bone]`.
- `wArm = w[armX] + w[elbowX]`, `wLeg = w[legX] + w[kneeX] + w[footX]`, X = side of the vertex (`x < 0` → L).
- Arm parameter `sA` (meters from the shoulder joint along the limb): if `wArm < 0.5` → −1; else if `w[elbowX] < 0.5`:
  `sA = dot(p − S, û)`, û = normalize(E − S); else `sA = |E−S| + dot(p − E, f̂)`, f̂ = normalize(Wr − E). (S, E, Wr = shoulder,
  elbow, wrist of that side.)
- Leg parameter `sL` analogous from the hip joint (legX) through knee (kneeX) to ankle (footX); −1 if `wLeg < 0.5`.
- Torso slice data: for each 1 cm y-bin, centroid `c(y)` (xz) and 2D convex hull of non-arm vertices (`wArm < 0.3`).
- Landmarks: H = hips bone, T = torso bone, N = head bone (neck base), S/E/Wr, L/K/A (hip/knee/ankle), `Ychest` = male S.y − 0.12,
  female = y of the bust apex (most −z vertex with |x| in [0.04, 0.12] and y in [S.y − 0.25, S.y − 0.05]), `Ybra` = female
  under-bust line = lowest y below the apex where the front z-profile (min z per bin at |x| 0.06–0.1) has receded 60 % back to the
  ribcage (fallback S.y − 0.20).

### 5.2 Region ids (per vertex = from the dominant collapsed bone + rules; per triangle = majority, ties → lower id)

| id | name | rule |
|---|---|---|
| 0 | cabeca | UBC Head weight dominant |
| 1 | pescoco | UBC neck_01 dominant |
| 2 | troncoSup | torso, y ≥ Ychest − 0.06 |
| 3 | troncoInf | torso, y < Ychest − 0.06 |
| 4 | quadril | hips dominant |
| 5 / 8 | bracoL / bracoR | armX dominant |
| 6 / 9 | antebracoL / R | elbowX dominant and UBC hand+finger weight < 0.5 |
| 7 / 10 | maoL / R | UBC hand+finger weight ≥ 0.5 |
| 11 / 14 | coxaL / R | legX |
| 12 / 15 | canelaL / R | kneeX |
| 13 / 16 | peL / R | footX (only the collar band survives §7.1) |

### 5.3 Garment region functions R_g(p) (negative = inside fabric; ≈ signed meters)
Combine terms with smooth max `smax(a,b,k=0.01)`. Terms:
- `hem(Y) = Y − y` (fabric above Y); `top(Y) = y − Y` (fabric below Y).
- `sleeve(L) = sA − L` (arm vertices; for `sA = −1` the term is −1).
- `legEnd(L) = sL − L` (leg vertices; −1 when `sL = −1`).
- `noArm = wArm ≥ 0.5 ? +1 : −1`; `noLeg = wLeg ≥ 0.5 ? +1 : −1`.
- `neck(r, drop)`: `dx = x − N.x, dz = z − N.z, ρ = sqrt(dx² + (1.6·dz)²)`, `front = clamp(−dz/0.07,0,1)`, `back = clamp(dz/0.06,0,1)`,
  `cut = N.y − 0.022 − drop·front² + 0.012·back + 1.4·max(0, ρ − r)`, term = `y − cut`.
- `armhole(c, rx, ry, rz) = 0.04·(1 − |(p − c)/(rx,ry,rz)|²)` (positive inside the ellipsoid = no fabric), center
  `c = S + (sideSign·0.01 towards the body, −0.07, 0)`.
- `racerback`: if `z > N.z + 0.02` and `y > Ybra + 0.04`: `(|x| − 0.032 − max(0, (S.y + 0.03) − y)·0.75)·0.5`, else −1.

| kind (cover bit) | R_g (male / female where different) |
|---|---|
| camiseta (0) | smax(hem(H.y − 0.035 / −0.030), neck(0.068, 0.030), sleeve(0.135 / 0.115)) |
| regata (1) | smax(hem(H.y − 0.035), neck(0.075, 0.09 / 0.10), armhole(rx .075/.070, ry .15/.14, rz .115/.11), noArm) |
| top (2, female only) | smax(hem(Ybra − 0.02), neck(0.08, 0.12), armhole(.08,.16,.12), racerback, noArm) |
| manga-longa (3) | smax(hem(H.y − 0.035), neck(0.066, 0.025), sleeve(|E−S| + |Wr−E| − 0.015)) |
| corta-vento (4) | smax(hem(H.y − 0.075), neck(0.075, 0.005), sleeve(|E−S| + |Wr−E| + 0.005)) |
| short (5) | smax(top(T.y − 0.012), legEnd(0.25 / 0.135), noArm) |
| bermuda (6) | smax(top(T.y − 0.012), legEnd(|K−L| − 0.035), noArm) |
| legging (7) | smax(top(T.y + 0.02) (high waist), legEnd(|K−L| + |A−K| − 0.045), noArm) |
| saia-short (8, female only) | as female short (skirt is an explicit extra, §6.8) |
| meia (9) | smax(−(sL − (|K−L| + |A−K| − 0.10)), sL − (|K−L| + |A−K| + 0.02)) on leg vertices, +1 elsewhere |
| tenis (10) | shoe collar band: leg vertices with y < collarTop(z) (§7); bit kept for completeness |

Tops never include leg-dominant vertices below the crotch because their hem (H.y − 0.035) is above the crotch (≈ H.y − 0.09):
assert the hem slice at `Yhem` is a single closed loop.

### 5.4 Cover masks for skin culling
Per body triangle, `mask` (Uint32): bit g set if **all three vertices have R_g ≤ −0.015** (1.5 cm margin; triangles crossing a hem
stay, they are under the fabric). Hair bits 11..16 (curto, cacheado, rabo, coque, longo, raspado): set if, from each of the three
vertices, a ray along the vertex normal hits that hairstyle's shell within 4 cm (scalp hidden). Male and female computed separately.
Body triangles are **sorted by (mask, region)** into cells; within each cell the triangle order comes from
`MeshoptEncoder.reorderMesh` on the compacted cell submesh; then vertices are renumbered by first use over the concatenated
index (fetch order). The cell table (§11) lists `[mask, region, triCount]` in order.
Runtime: `coverMask = bit(top) | bit(bottom) | (socks ? bit9 : 0) | bit(11 + hairIndex)`; draw only triangles whose cell mask
`& coverMask == 0`.

---------------------------------------------------------------------------------------------------------------------

## 6. Clothing shells

### 6.1 Representation ("derived garment")
A garment vertex is **a barycentric point on a body triangle plus an offset**: `(tri: Uint16, b1: Uint8, b2: Uint8)` →
`base = (1 − b1/255 − b2/255)·P[c0] + b1/255·P[c1] + b2/255·P[c2]` where `c0,c1,c2` are the corners of body triangle `tri` **as the
decoder returns them** (the meshopt index codec may rotate corners: the baker must encode, decode back, and compute barycentrics
against the decoded corner order). `pos = base + off` (`off`: Int16×3, 0.1 mm units). Skin weights = barycentric blend of the three
corners' weights, top-4, renormalized (computed at runtime, deterministic). Normals = runtime `computeVertexNormals` (garment
vertices are welded, so the shell is smooth; hem lips have their own vertices → crisp edge). No UVs (runtime fills the neutral UV).

### 6.2 Build steps per garment g (male and female separately)
1. **Cut**: take every body triangle with any vertex `R_g < 0`; clip each against `R_g = 0` with marching triangles (R linear on edges);
   keep the inside polygons, triangulated. Every new point lies on a body edge → valid barycentric record. Weld cut points shared by
   neighbouring triangles (same body edge + same t).
2. **Subdivide once** (midpoint 1→4, also splitting the clipped polygons): edges ≈ 1.5 cm on the torso, enough for folds. New points
   stay inside their source body triangle (record = barycentric in that triangle; on shared edges either triangle).
3. **Offset** (`off` vector): `d(p)·n̂` with `n̂` = smooth body normal at the base point, plus kind-specific terms (§6.3–6.5).
4. **Drape fill** (tops; not `top`, see table): for each non-arm vertex, in its y-bin, `rv` = xz distance to `c(y)`, `rh` = distance from
   `c(y)` to the slice hull along the same direction; push radially by `max(0, rh − rv)·wfill(y)`. Then smooth the push field over the
   shell graph (4 Laplacian iterations, λ 0.5). This removes abdomen/spine concavity: the shirt falls straight from chest/bust.
5. **Folds** (displacement along n̂, see table) — noise = 3D value noise with a per-garment seed (mulberry32), deterministic.
6. **Collision**: closest point on the body (BVH); if signed distance < `dmin` (1.5 mm cotton, 1.0 mm tech) push along the body normal
   to `dmin`. Sleeve vertices are also tested against torso triangles and pushed out with `dmin`.
   Inner thighs (loose bottoms): clamp each leg's radial flare to half the gap to the other leg's surface minus 3 mm.
7. **Layering**: for every body base point inside both a top and a bottom region, top offset ≥ (max offset of all bottoms of that gender
   at that point) + 3 mm; same for bottoms over socks (+1.5 mm). Skirt (§6.8) counts as a bottom.
8. **Hem lip**: for each boundary loop, duplicate the boundary vertices and add a strip folded inwards: lip vertex offset =
   `max(1.5 mm, maxUnderlayOffset + 1.5 mm)`·n̂ (stays outside any lower layer). Lip slot = the band slot of that hem. Flags bit0.
9. **Slots** (§6.4), **AO** (§6.7).
10. **Simplify** LOD0 to the per-kind target with `MeshoptSimplifier.simplify(…, ['LockBorder'])`, target error 0.002 (relative);
    LOD1 at the LOD1 target, error 0.01. Simplified indices reference the same vertex records.

### 6.3 Per-kind parameters (d in meters; "flare" is radial from the limb axis, perpendicular to it)

| kind | mat | d (base) | drape `wfill(y)` | folds | LOD0 / LOD1 tris |
|---|---|---|---|---|---|
| camiseta | 1 cotton | 6 mm m / 5 mm f; sleeves 6 mm + 10 mm·smoothstep(0.03, Lsleeve, sA); last 6 cm of hem +4 mm | 0.9·smoothstep(Ychest, Ychest − 0.12, y) (f: from bust apex, 0.6→1 under bust) | waist ripples: amp 2 mm·smoothstep(Yhem + 0.14, Yhem + 0.03, y), λ 5 cm, horizontal, noise-warped; sleeve hem flare | 4000 / 1600 |
| regata | 1 | 5 mm | as camiseta | waist ripples 1.5 mm | 3000 / 1200 |
| top | 2 tech | 2.5 mm; under-band 3.5 mm | **bust bridge only**: front (z < c.z) & |x| < 0.06 & y in [Ybra, apex+0.03]: weight 1 (bridges cleavage), else 0 | none | 1800 / 700 |
| manga-longa | 1 | 5 mm; sleeves 5 mm, +2 mm last 4 cm (cuff) | 0.7 × camiseta | elbow bunching amp 1.5 mm, λ 3.5 cm, |sA − |E−S|| < 0.06; waist ripples 1.5 mm | 5000 / 2000 |
| corta-vento | 2 | 12 mm; sleeves 14 mm; last 3 cm of hem/cuffs taper to 6 mm (elastic) | 1.0 from Ychest down | big folds amp 3 mm, λ 4 cm (torso diagonal + sleeve rings) | 5500 / 2200 |
| short (m) | 1 | waist part 8 mm; leg flare `8 mm + 24 mm·smoothstep(0.03, 0.25, sL)` | – | 6–7 vertical folds around each leg, amp 2.5 mm·smoothstep(0.08, 0.25, sL) | 3000 / 1200 |
| short (f) | 1 | 6 mm; flare `4 mm + 10 mm·smoothstep(0.03, 0.135, sL)` | – | vertical folds 1.5 mm | 2400 / 1000 |
| bermuda | 1 | 8 mm; flare `6 mm + 16 mm·smoothstep(0.05, Lend, sL)` | – | vertical folds 2 mm, slight bunching at hem | 3500 / 1400 |
| legging | 2 | 2.5 mm; knee band ±6 cm 3 mm | – | creases behind the knee amp 0.8 mm λ 3 cm; ankle bunching 1 mm | 4000 / 1600 |
| saia-short (f) | 1 | as short f | – | as short f | 2400 / 1000 (+ skirt 480 / 200) |
| meia | 1 | 1.8 mm; top rib 2.5 mm | – | rib: amp 0.4 mm, 40 ribs around (top 1.8 cm only) | 400 / 160 |

Waist bands: bottoms' top 3.5 cm (legging 4.5 cm) get +1.5 mm (elastic band thickness).

### 6.4 Color slots (per vertex), by band distance `δ = −R_g` of the relevant term (meters)

Slot ids (shared by every part, §11.3): `skin 0, brow 1, lash 2, eye 3, hair 4, hairTie 5, shirt 6, shirtTrim 7, shirtAccent 8,
shorts 9, shortsTrim 10, shortsAccent 11, sock 12, sockTrim 13, shoe 14, shoeAccent 15, sole 16, midsole 17, lace 18, lining 19`.

| kind | rules (first match wins) |
|---|---|
| camiseta | neck δ < 0.016 → shirtTrim; sleeve hem δ < 0.018 → shirtTrim; bottom hem δ < 0.018 → shirtTrim; chest logo (x ∈ [−0.095, −0.05], y ∈ [S.y − 0.17, S.y − 0.13], front) → shirtAccent; else shirt |
| regata | neck/armhole δ < 0.014 → shirtTrim; hem δ < 0.018 → shirtTrim; else shirt |
| top | under-band δ < 0.035 → shirtTrim; neck/armhole/racerback δ < 0.010 → shirtTrim; else shirt |
| manga-longa | cuffs δ < 0.025, neck δ < 0.016, hem δ < 0.018 → shirtTrim; raglan seam line (|wArm − 0.5| < 0.08 and y > S.y − 0.08, 6 mm wide) → shirtAccent; else shirt |
| corta-vento | zipper strip |x| < 0.006 & front → shirtAccent; reflective band at y = S.y − 0.12 ± 0.006 (front and back) → shirtAccent; cuffs/hem δ < 0.02 → shirtTrim; else shirt |
| short / bermuda / saia-short | waistband δ < 0.035 → shortsTrim; leg hem δ < 0.015 → shortsTrim; side stripe (outer side of each leg: angle φ about the leg axis, |φ|·r < 0.0075) → shortsAccent; else shorts |
| legging | waistband δ < 0.045 → shortsTrim; hem δ < 0.012 → shortsTrim; side stripe 6 mm half-width full length → shortsAccent (runtime paints it = shorts color when the item has no stripe); else shorts |
| meia | top δ < 0.018 → sockTrim; else sock |

(Old palette rules stay valid: shirtTrim/shirtAccent/shortsTrim/shortsAccent derived from the item colors in `RunnerRig`.)

### 6.5 Arm/neck/leg holes — they are simply the `R_g = 0` contours of §5.3 (sleeve ends, neckline, armholes, racerback,
leg hems, waist). Hems are exact (cut, not snapped), with a lip (§6.2.8) so the fabric reads as having thickness.

### 6.6 Why subdivide-then-simplify: torso edges are 3 cm; one midpoint subdivision allows 4–5 cm folds and clean drape, then meshopt
removes vertices where the shell is flat, keeping the budget.

### 6.7 AO for garments: 32 cosine-weighted hemisphere rays per vertex, max distance 0.25 m, against body + this garment
(ignore other garments); `ao = 1 − 0.6·occluded_fraction`, stored Uint8.

### 6.8 Explicit extras (stored as full explicit parts inside the garment)
- **Skirt (saia-short)**: cone from y = H.y − 0.01 (top hidden under any top's hem; layering rule adds 3 mm to tops there) radius
  = hull radius at that height + 6 mm, to hem at y = H.y − 0.17 with +45 mm flare; 24 around × 5 rows, plus an inner layer (2 mm
  inside, reversed winding, slot shorts, ao 0.6) and a 1.5 cm hem band (shortsTrim). Weights: hips 0.55 + legL/legR 0.45·σ, σ =
  smoothstep(−0.3, 0.3, ±x/rHip) for the side.
- **Windbreaker collar (corta-vento)**: band around the neck from the neckline up 35 mm, radius = neck radius + 12 mm, 24 around ×
  3 rows, inner face shirtTrim, outer shirt, zipper strip shirtAccent; weights torso 0.6 / head 0.4.

---------------------------------------------------------------------------------------------------------------------

## 7. Shoes and socks

### 7.1 Feet are replaced, not covered
Delete body triangles with all three vertices below `collarTop(z) − 0.015` and `wLeg` dominant by footX/kneeX (the foot inside the
shoe). Keep the band between that line and the collar top (cover bit 10 for completeness). The body sits on the insole (LIFT, §1.6).

### 7.2 Parametric sneaker (one geometry; tenis / tenis-corrida / tenis-pro differ only in runtime colors)
Measure each re-posed bare foot (final frame, before deleting): heel point (max z of foot vertices), toe tip (min z), length `Lf`,
ball half-width `wb` at the ball joint, heel half-width `wh`, instep height at u = 0.55, ankle (footX) position.
Shoe space: `u ∈ [0,1]` heel→toe along the foot axis, `θ` around the foot. Build:
- **Upper**: 22 stations × 24 around, superellipse sections (exponent 2.6), half-width `w(u) = footHalfWidth(u) + 6 mm`
  (sampled from the foot, then smoothed), top line `h(u)`: toe box 45 mm, rising to `instep + 8 mm` at the throat (u 0.45–0.75),
  collar top `collarTop`: heel tab 105 mm (pull tab +8 mm), dipping to 75 mm at the ankle sides (u 0.2–0.35, below the malleoli),
  tongue top 110 mm at u 0.45. All heights above y = 0. Closed under by the insole plane y = LIFT.
- **Midsole** wall: from y = 8 mm to LIFT (22 mm) under the heel, 16 mm at the forefoot; overhang 4 mm outside the upper;
  **toe spring**: bottom rises by 12 mm·smoothstep(0.80, 1.0, u)².
- **Outsole**: y 0…8 mm slab with the same outline, lug pattern as slots only.
- **Inner collar lining**: the collar rim rolled inward 10 mm (slot lining).
- Triangles ≈ 1300 per shoe LOD0, 350 LOD1, 110 LOD2.
- Slots: outsole → sole; midsole wall → midsole; collar rim top 12 mm → shoeAccent, lining → lining; heel counter (u < 0.22 and
  y < 75 mm) → shoeAccent; side stripe (both sides, diagonal band from (u 0.32, y 25 mm) to (u 0.72, y 60 mm), 14 mm wide) →
  shoeAccent; laces: throat region |θ_top| < 0.18 rad, u ∈ [0.45, 0.78], alternating 11 mm bands lace/shoe; tongue → shoe; rest → shoe.
- Weights: footX 1.0; collar ring above `A.y − 0.01`: footX 0.75 + kneeX 0.25.
- mat 4. AO: rays against shoe + leg.
- Socks (§6.3 `meia`) run from 2 cm below the ankle joint (inside the shoe) to 10 cm above it. Runtime: socks on unless bottom is
  `legging` (current rule); `tenis-pro` paints the sock from the shoe color (current rule).

---------------------------------------------------------------------------------------------------------------------

## 8. Hair

### 8.1 Common processing
- Put each source hair in **Head-local space** (`inverse(HeadBind_src)`), then into the target body: same gender → `HeadBind_tgt`
  (identical); cross gender → about the skull bbox center with per-axis scale `S = skull_tgt / skull_src` (skull bbox = Head-dominant
  body vertices above the eye centers), then `HeadBind_tgt`.
- **Clearance**: closest point on the head/neck/shoulders (BVH); push hair vertices to ≥ 2 mm above the scalp (≥ 8 mm from neck,
  shoulders and back); smooth the push field (3 Laplacian iterations).
- **Tint**: no hair texture at runtime. Per-vertex `ao` byte = AO (rays vs head+hair) × tone, tone = luminance of `T_Hair_1/2`
  averaged over the vertex's adjacent UV triangles (16 samples each), divided by the texture's mean luminance, clamped [0.7, 1.15].
  Runtime color = hairColor × ao; the shader's `mat 3` strand streaks stay. mat 3, slot hair.
- Simplify to LOD0 ≤ 3000 tris, LOD1 ≤ 1000, LOD2 ≤ 250.
- Frame §1.6.

### 8.2 Style mapping

| style | male | female |
|---|---|---|
| curto | `Hair_SimpleParted` as is | **bob**: `Hair_Long` cut at jaw level: clip plane y = Hc.y − 0.085 (front strands 1.5 cm higher), ±6 mm noise, hem lip 4 mm inwards |
| raspado | `Hair_Buzzed`, +1.5 mm offset | `Hair_BuzzedFemale`, +1.5 mm |
| cacheado | procedural on `Hair_Buzzed` (§8.5), volume 20 mm | procedural on `Hair_BuzzedFemale`, volume 30 mm, nape extended 4 cm |
| rabo | cap = `Hair_Buns` minus the two bun components, refit to the male head, + generated ponytail (§8.3) | cap = `Hair_Buns` minus buns + ponytail |
| coque | cap (as rabo) + one bun relocated (§8.3) | same |
| longo | `Hair_Long` refit to the male head, lengthened (§8.4) | `Hair_Long` lengthened (§8.4) |

Bun components = components of `Hair_Buns` with |centroid.x| > 0.07 and centroid.z < −0.03 (glTF) — the two 332-tri pieces.

### 8.3 Ponytail and bun
- Head center `Hc` = centroid of skull vertices (Head-dominant, above the eye line). Scalp point in direction `d` = first hit of a ray
  from Hc along d against the hair cap, + 12 mm outward.
- **pony** bone = scalp point for `d = normalize(0, 0.45, +1)` (final frame; +Z = back). **pony2** = pony + (0, −0.12, +0.035).
- Tube along a Catmull-Rom path: pony, pony + (0, −0.02, 0.045), pony + (0, −0.12, 0.06), pony + (0, −0.24, 0.04); 14 rings × 12
  around + tip cap; radius r(t) = 20 mm at t=0 → 30 mm at t=0.25 → 6 mm at t=1, sections flattened (x 1.0, z 0.8), per-ring angular
  radius noise ±12 %, twist 0.6 rad along the length (strand look). Elastic: 12×4 torus at t = 0.03, +4 mm, slot hairTie.
  Assert ≥ 15 mm clearance from the neck at rest.
- Weights: t < 0.04 → head 1; t ∈ [0.04, 0.55]: head→pony→pony2 with `w_pony2 = smoothstep(0.30, 0.60, t)`,
  `w_head = 1 − smoothstep(0.0, 0.10, t)`, `w_pony = 1 − w_head − w_pony2` (clamped ≥ 0); t > 0.55 → pony2 (and a little pony:
  0.15). Tone: 0.85 near the root → 1.0, AO.
- **Bun (coque)**: take one bun component; rotate so its axis (Head center → bun centroid) aligns with `d = normalize(0, 0.55, +1)`
  (final frame), place its centroid at the scalp point + 35 mm along d, scale 1.15. Weight head 1.

### 8.4 Long hair (`longo`) and springs
- Lengthen: Head-local vertices below the ear line `y_ear = HeadJoint.y`: `y' = y_ear + (y − y_ear)·k`, `k = 1 + (kmax − 1)·b`,
  backness `b = smoothstep(−0.02, 0.04, z − Hc.z)` (final frame); choose `kmax` so the lowest back vertex reaches `N.y − 0.07`
  (upper back). Then collision push vs neck/shoulders/back (+8 mm) and smoothing.
- **hairA** = scalp point for `d = normalize(0, −0.15, +1)` + 10 mm; **hairA2** = hairA + (0, −0.13, +0.02).
- Weights: `h = clamp((hairA.y + 0.03 − y)/0.30, 0, 1)`; `w_spring = smoothstep(0, 0.35, h)·(0.35 + 0.65·b)`;
  `share = smoothstep(0.40, 0.85, h)`; hairA = w_spring·(1 − share), hairA2 = w_spring·share, head = 1 − w_spring.
  (Face-framing strands, b ≈ 0, swing at most 35 %.)
- Runtime (for the rig agent): hairA/hairA2 driven by the same damped spring as `_ponyStep`, limits rotation.x ∈ [−0.25, 0.6] rad
  so the hair never enters the back.

### 8.5 Curly (`cacheado`) procedural
Subdivide the buzz cap once (830 → 3320 tris). For female first extend the nape: vertices below the ear line stretched ×1.6 down.
Displace along the normal: `vol·(0.75 + 0.25·smoothstep(hairline, hairline + 0.03, dist))` + curl bumps
`0.009·(1 − clamp(F1/0.011, 0, 1))²` (Worley F1, 16 mm cells, seed fixed) + 4 mm low-frequency noise. Tone = 0.78 + 0.22·bump.
Simplify to the LOD0 target. Weight head 1.

### 8.6 Open shells
For hair triangles within 3 cm (graph distance) of a boundary edge, add a back-face copy (reversed winding, normals flipped,
ao × 0.7). Same for the male open lash strips. Counted in the budgets.

### 8.7 Brows, lashes, eyes
- Brows/lashes: from body mesh0; **flat tint** (no texture): slot brow / lash, mat 3, ao from AO only. Female brows thinned (§2.4).
  Simplify: brows to 160 tris per card, lashes 120 (female) / keep 68 (male) + back faces. LOD1: brows 40 per card, lashes dropped.
  LOD2: none.
- Eyes: keep 384 tris each at LOD0, 64 at LOD1, none at LOD2 (the skin texture has painted eyes). mat 5, slot eye (runtime white),
  UVs remapped into the eye tile (§9.5); male back-of-eye vertices with u outside [0,1] get the sclera texel UV.

---------------------------------------------------------------------------------------------------------------------

## 9. Textures

### 9.1 Position atlas (tool used by every edit)
Rasterize the processed body's UV triangles at 1024² (and 512² for normals) storing per texel: rest position (final frame), region id,
collapsed weights. Texels outside islands = empty. All masks below are defined in 3D and read through this atlas.

### 9.2 Skin base color → tintable detail map (per gender, 1024² JPEG)
1. Decode PNG (pngjs), convert sRGB→linear, 2×2 box downsample to 1024².
2. **Underwear removal**: mask = texels in regions {quadril, troncoInf, coxa top 15 cm, (female) troncoSup bust band} whose HSV
   value < 0.32 and saturation < 0.35, dilated 3 px. Fill with push-pull (pyramid) inpainting from the surrounding skin; then add
   high-frequency skin grain copied from the texel 6 cm higher in the same island (or from the abdomen) at 50 % strength.
3. **Muscle shading attenuation** (§2.3): on regions troncoSup/Inf, quadril, braco, antebraco, coxa, canela, pescoco (not head, hands):
   `D ← B + 0.45·(D − B)`, B = Gaussian σ = 10 px.
4. Mean skin `M` = median linear RGB over island texels excluding lips/eyes/brows/scalp (head texels above the hairline and within 2 cm
   of eye centers excluded). Detail `D = T / M` per channel; chroma retention: `D = lerp(lum(D), D, 0.65)`; clamp [0, 1.9].
5. Store **`sRGB(D · 0.5)`** (so D = 1 → linear 0.5 → sRGB 188). Runtime: material color = (2, 2, 2) linear, map sRGB-decoded,
   vertex color = skin tone (linear) × ao → final albedo = D × tone. Neutral patch (§9.5) = exactly D = 1.
6. **Island padding**: before JPEG, extend island borders 8 px into empty space (push-pull), to avoid seams in mips/JPEG chroma.
7. JPEG via jpeg-js, quality 88, 1024². Scalp keeps its painted hair (always under a hair cap).

### 9.3 Normal map (per gender, 512² JPEG, tangent space, glTF/OpenGL convention)
Downsample 2048 → 512 by averaging decoded normals and renormalizing. Flatten: `n = normalize(lerp(n, (0,0,1), k))`, k = 0.65 on
torso/arms/legs/pelvis, 0.3 neck, 0 head/hands; k = 1 in the underwear mask. Neutral patch and eye tile = flat (128,128,255). Pad
islands. Runtime uses it only on non-lite quality, `normalScale (0.8, 0.8)`; orientation must be confirmed by render R9 (if relief
is inverted, use `(0.8, −0.8)`).

### 9.4 Female face softening (texture)
Using the position atlas around each eye center (female): texels at 6–22 mm from the eye center, outside the eye opening, with
luminance < 0.6 × local mean (σ 8 px) → lift towards the local blur by 70 % (removes the eyeliner wings). Nasolabial band (Head-local
|x| ∈ [0.015, 0.045], y between mouth and nose base, front): dark detail −40 %. Lips: saturation −20 %. Optional, default **off**:
mouth-corner lift 1.0 mm (vertices within 6 mm of the lip corners). Male: no edits.

### 9.5 Atlas extras (inside each gender's 1024² skin texture, in the largest free square found automatically with 8 px padding)
- Eye tile 96×96: `T_Eye_Brown` resized (Lanczos), stored as `sRGB(linear(eye) · 0.5)` (true color after ×2). Eye UVs remapped:
  `u' = u0 + u·96/1024`, `v' = v0 + v·96/1024`.
- Neutral patch 16×16 of sRGB 188 (linear 0.5). All non-skin parts (garments, hair, shoes, brows, lashes) use its center UV.
- Both written into the normal map as flat.

---------------------------------------------------------------------------------------------------------------------

## 10. LODs (meshoptimizer only, offline)

Tools: `meshoptimizer@1.3.0` npm tarball (MIT): `MeshoptSimplifier.simplify(indices, positions, 3, targetIndexCount, targetError,
flags)` and `MeshoptEncoder` (reorderMesh, encodeVertexBuffer, encodeIndexBuffer). **All LODs are index subsets of the LOD0 vertex
buffers** (simplify never invents vertices) → LOD1/LOD2 cost only index data.

| part | LOD0 | LOD1 (NPC near, ~6–8k total) | LOD2 (NPC far, ~2k total) |
|---|---|---|---|
| body | per cell, LockBorder; hands cells ratio 0.45 error 0.0006 (fists are over-dense); others untouched | per cell, LockBorder, ratio 0.45 (head 0.35), error 0.01 | **per NPC cover mask**: union of visible cells simplified as one mesh, LockBorder (hem borders stay matched), target 700 tris, error 0.05 |
| garments | §6.3 targets | §6.3 targets | ratio to ≈ 300 (top) / 280 (bottom) / 40 (socks), LockBorder |
| hair | ≤ 3000 | ≤ 1000 | ≤ 250 |
| shoes | ~1300 each | 350 | 110 |
| eyes | 2×384 | 2×64 | – |
| brows/lashes | §8.7 | brows only | – |

NPC cover masks for body LOD2 = those of `RunnerRig.NPC_OUTFITS` (the baker reads the same list from a config constant and asserts
it matches the file `jogar/js/runner/RunnerRig.js` by regex). Unknown combos fall back to body LOD1 at runtime.
Budget asserts (male and female, every top × bottom × hair combo at LOD0): ≤ 25 000 visible triangles (expected worst ≈ 21–22k:
body visible 4–7k + top ≤ 5.5k + bottom ≤ 4k + hair ≤ 3k + shoes 2.6k + socks 0.4k + eyes 0.77k + brows ≤ 0.8k).

---------------------------------------------------------------------------------------------------------------------

## 11. Output files, data format, decoder

### 11.1 Files
- `jogar/dados/modelos/corredor-m.js`, `corredor-f.js` — body (vertices, LOD index sets, cells), eyes, brows/lashes, shoes, bones,
  anchors, measures, textures. (Socks are a derived garment in `roupas.js`.)
- `jogar/dados/modelos/roupas.js` — derived garments for both genders (+ explicit extras).
- `jogar/dados/modelos/cabelos.js` — 6 styles × 2 genders, explicit parts with LOD index sets.
- `jogar/vendor/meshopt-decoder-ref.js` — `meshopt_decoder_reference.js` from the same meshoptimizer 1.3.0 tarball (pure JS, sync,
  `ready = Promise.resolve()`), wrapped as a classic script: license header kept, the trailing `export { MeshoptDecoder };` replaced by
  `window.MeshoptDecoder = MeshoptDecoder;`, whole file inside `(function () { … })();`. ~15 KB. (No WASM, no fetch.)
- `jogar/js/runner/CharData.js` — the decoder/assembler (§11.5), IIFE, namespace `EP`.
- `index.html`: add after `dados/aparencia.js`: the four data files; after `vendor/three-0.128.0.min.js`: `vendor/meshopt-decoder-ref.js`;
  `js/runner/CharData.js` before `js/runner/BodyModel.js`/`RunnerRig.js`. `arquivo-unico.mjs` needs no change (inlines all `src`).
- `jogar/modelos/LICENCAS/`: `Quaternius-UBC-License_Standard.txt` (copy of `License_Standard.txt`),
  `Quaternius-UAL-Readme.txt` (copy of the UAL readme), `meshoptimizer-LICENSE.md` (MIT notice for the vendored decoder),
  `LEIA-ME.txt` (one paragraph: what came from where, CC0, modified by us). Credits line in `endless-pace/README.md`:
  "Corredores: Universal Base Characters e Universal Animation Library por Quaternius (CC0) — quaternius.com; decodificador
  meshoptimizer (MIT, Arseny Kapoulkine)." Each data file starts with a one-line comment with the same credit.
- Report: `ferramentas/saida-ver/relatorio.json` (gitignored).

Each data file:

    // ENDLESS PACE — corredor masculino (Quaternius UBC, CC0). Gerado por ferramentas/assa-corredor.mjs — não editar.
    (function (EP) {
      'use strict';
      var M = EP.data.models = EP.data.models || {};
      M.corredor = M.corredor || {};
      M.corredor.m = { /* §11.2 */ };
    })(window.EP);

(`roupas.js` sets `M.roupas = { m: {...}, f: {...} }`, `cabelos.js` sets `M.cabelos = { m: {...}, f: {...} }`.)

### 11.2 Objects

**Buffer** (string): standard base64 (RFC 4648, with padding) of a meshopt-encoded stream. Which codec is implied by the field:
vertex streams use the meshopt **vertex codec** (`decodeVertexBuffer(target, count, stride, src)`), `I` uses the **index codec**
(`decodeIndexBuffer(target, count, 2, src)`, Uint16 output). Encoder: `encodeVertexBuffer` / `encodeIndexBuffer` (default version;
the reference decoder accepts vertex 0xa0/0xa1 and index 0xe1). No meshopt filters.

**Part** (explicit mesh: body, eyes, brows, shoes, hair, extras):

    {
      n: 6624,                 // vertex count
      q: [x0,y0,z0, x1,y1,z1], // position box (meters, final rest frame)
      P: "…",  // n×8  B: Uint16 qx,qy,qz,0     → p = q0 + (q/65535)·(q1 − q0)
      N: "…",  // n×4  B: Int8 ox,oy,0,0        → octahedral normal (decode below)
      T: "…",  // n×4  B: Uint16 u,v / 65535    (glTF convention, v down; texture.flipY = false)
      J: "…",  // n×4  B: Uint8 bone indices (0..16, §3.1)
      W: "…",  // n×4  B: Uint8 weights, sum = 255 (unused slots 0)
      A: "…",  // n×4  B: Uint8 mat, slot, ao (0..255 → 0..1), flags (bit0 hem lip, bit1 back-face copy)
      lods: [ { t: 12000, I: "…", cells: [[mask, region, triCount], …] },   // LOD0 (cells only on the body)
              { t: 5200,  I: "…", cells: […] },                             // LOD1
              { t: 2000,  I: "…" } ],                                       // LOD2 (non-body parts)
      lod2ByMask: { "1569": { t: 700, I: "…" }, … }                         // body only (§10)
    }

Octahedral decode: `x = ox/127, y = oy/127, z = 1 − |x| − |y|; t = max(−z, 0); x += x ≥ 0 ? −t : t; y += y ≥ 0 ? −t : t;` normalize.
Encode: `n /= |x|+|y|+|z|; if z < 0: (x, y) = ((1 − |y|)·sgn x, (1 − |x|)·sgn y)` with sgn(0) = +1; round(·127).
Body `T` exists; other parts may omit `T` (runtime fills the neutral UV). Eyes have `T` (eye tile).

**Garment** (derived, §6.1):

    {
      kind: "camiseta", mat: 1, coverBit: 0, layer: 3,     // layer: socks 1, bottoms 2, tops 3
      n: 2210,
      G: "…",  // n×8 B: Uint16 tri, Uint8 b1, Uint8 b2, Uint8 slot, Uint8 ao, Uint8 flags, Uint8 0
      O: "…",  // n×8 B: Int16 dx,dy,dz (0.1 mm), Int16 0
      lods: [ { t, I }, { t, I }, { t, I } ],
      extra: Part | null,                                  // skirt / collar
      bodyId: "m-3f9a1c2e"                                 // must equal corredor.m.id (hash of the body P/T/J/W/LOD0-I streams)
    }

`tri` indexes the **body LOD0 triangle list as decoded** (corner order as returned by the decoder).

**Character** (`EP.data.models.corredor.m`):

    {
      v: 1, id: "m-3f9a1c2e", gender: "m",
      space: 1.76, heightReal: 1.76, lift: 0.022,
      bones: { names: [17 names §3.1], parent: [-1,0,1,1,3,1,5,0,7,8,0,10,11,2,13,2,15],
               pos: [[x,y,z] × 17 parent-relative] },
      measures: { hipY, thigh, shin, ankleY, footLen, shoulderW, hipW },            // final frame, for the gait/IK agent
      anchors: {                                // bone-local positions for accessories (replace HC/HIP_H constants)
        skull: { bone: "head", center: [..], radii: [rx, ry, rz], top: y },          // caps, bands, beanies
        eyes:  { bone: "head", center: [..], spacing: d, front: z },                  // glasses
        ears:  { bone: "head", left: [..], right: [..] },                             // headphones
        wristL:{ bone: "elbowL", pos: [..], radius: r },                              // watch
        back:  { bone: "torso", pos: [..] },                                          // pacer flag
        waist: { bone: "hips", y: .., rx: .., rz: .. }
      },
      slots: ["skin","brow","lash","eye","hair","hairTie","shirt","shirtTrim","shirtAccent","shorts","shortsTrim",
              "shortsAccent","sock","sockTrim","shoe","shoeAccent","sole","midsole","lace","lining"],
      mats: ["skin","cotton","tech","hair","shoe","eye"],
      coverBits: { camiseta:0, regata:1, top:2, "manga-longa":3, "corta-vento":4, short:5, bermuda:6, legging:7,
                   "saia-short":8, meia:9, tenis:10, "hair:curto":11, "hair:cacheado":12, "hair:rabo":13,
                   "hair:coque":14, "hair:longo":15, "hair:raspado":16 },
      textures: { skin: "data:image/jpeg;base64,…", normal: "data:image/jpeg;base64,…",
                  uvNeutral: [u, v], eyeTile: [u0, v0, u1, v1] },
      body: Part, eyes: Part, brows: Part, shoes: Part
    }

`cabelos.js`: `M.cabelos.m.curto = Part` (… 6 styles × 2 genders; `rabo` includes the hair tie; spring weights inside J/W).
`roupas.js`: `M.roupas.m.camiseta = Garment` (male: camiseta, regata, manga-longa, corta-vento, short, bermuda, legging, meia;
female: + top, saia-short).

### 11.3 Decoder / assembler API (`jogar/js/runner/CharData.js`, IIFE, `EP.CharData`)

    EP.CharData.ok()                       // true when EP.data.models.corredor.{m,f} and window.MeshoptDecoder exist
    EP.CharData.char(g)                    // → character header (bones, anchors, measures, textures, slots, coverBits)
    EP.CharData.part(g, name, lod)         // name: 'body'|'eyes'|'brows'|'shoes' → Mesh (cached; vertex arrays decoded once per part)
    EP.CharData.hair(g, style, lod)        // → Mesh
    EP.CharData.garment(g, kind, lod)      // → Mesh (derived: needs body; positions/weights/normals resolved)
    EP.CharData.assemble(g, outfit, lod)   // outfit {top, bottom, hair, socks:boolean} → Mesh with everything concatenated,
                                           //   culled body (cells, or lod2ByMask), uv filled, key string; cached by key
    EP.CharData.texture(g, kind)           // 'skin'|'normal' → THREE.Texture (flipY false, skin sRGBEncoding, normal Linear,
                                           //   anisotropy 4, mipmaps), created lazily from the data URI, shared

    Mesh = { n, position: Float32Array(n*3), normal: Float32Array(n*3), uv: Float32Array(n*2),
             skinIndex: Uint8Array(n*4), skinWeight: Float32Array(n*4), mat: Uint8Array(n), slot: Uint8Array(n),
             ao: Float32Array(n), index: Uint16Array|Uint32Array, key }

Decode steps for a Part: base64 → Uint8Array (`atob`), `MeshoptDecoder.decodeVertexBuffer` into `Uint8Array(n·stride)`, view as the
typed array of the stream, dequantize (P, T, N, W/255, ao/255). Index: `decodeIndexBuffer(new Uint8Array(t·3·2), t·3, 2, src)` →
Uint16Array. Garment: decode G and O, then per vertex resolve base point and weights from the body (§6.1), `pos = base + O·1e-4`,
normals by area-weighted face normals over the garment index. Assembly concatenates and, for NPC LODs, compacts unreferenced vertices.
Total decode for both genders + all garments + hairs: target < 60 ms on a mid phone (pure JS); decode lazily per part to spread it.

### 11.4 Size budget (base64, measured codec ratios: positions 54 %, normals 49 %, UV 74 %, joints 23 %, weights 54 %, index ≈ 1.1–1.4 B/tri)

| item | estimate |
|---|---|
| bodies (2 × ~6.6k v, LOD0–2 indices) | 2 × 130 KB |
| garments (20, derived) | ≈ 500 KB |
| hairs (12) | ≈ 480 KB |
| shoes, eyes, brows (2 genders) | ≈ 110 KB |
| textures (2 × skin 1024 JPEG ~60 KB + normal 512 ~43 KB) | ≈ 275 KB |
| decoder + CharData | ≈ 25 KB |
| **total** | **≈ 1.65 MB** (hard fail at 3.0 MB) |

### 11.5 Runtime integration notes (for the RunnerRig agent; not part of the bake)
1. `BodyModel` is replaced by a thin shim over `EP.CharData` keeping `BONES` (now 17), `C` (slot ids = §6.4 names), `MAT`,
   `bonePos(g)` (from `char(g).bones.pos`), `ready/has` (always true once decoded), `prepare(cb)` (sync decode, then cb),
   `assemble` → `Mesh`. The Worker and Sculpt.js are no longer needed for the runner.
2. `HIP_H` → `char(g).measures.hipY`; `HC`/accessory offsets → `anchors`; `hairClass` → skull radii per style (store a per-style
   `capScale` in `cabelos` parts: radius growth of the hair over the skull).
3. Material `runnerSkin`: add `map = texture(g,'skin')`, `color = (2,2,2)`, `normalMap` (non-lite), keep `vertexColors` and the
   `mat` attribute shader; skinIndex as `Uint8` attribute (non-normalized) and skinWeight Float32 (or Uint8 normalized) both work
   in r128. Paint: `color = palette[slot] × ao` (skin slot = skin tone; eye slot = white; neutral-UV parts = palette color).
   One material per gender (different skin texture) or swap `map` per mesh via `onBeforeRender`.
4. Springs: `pony`+`pony2` (rabo), `hairA`+`hairA2` (longo) — same damped spring as `_ponyStep`, child gets ~1.6× the parent's
   lag. Unused bones stay at rest.
5. Skirt accessory (`ACC.skirt`) is obsolete (baked skirt); `outfitOf` must keep `saia-short` for females, map it to `short` for males.
6. Old LOD API (0/1/2) maps 1:1.
7. Known limit: arms raised overhead (`celebrate`, π·0.95) pinch at the deltoid (clavicle has no game bone). Suggest capping the
   celebrate arm raise at ~2.3 rad or accepting it.

---------------------------------------------------------------------------------------------------------------------

## 12. Verification plan

### 12.1 Automatic checks in the baker (fail the bake on violation; write `relatorio.json`)
- Bind identity (§3.3), weight sums = 255, bone indices < 17, parents valid, no NaN.
- Heights: barefoot skull top − sole = 1.760 ± 0.002 (both, 1.76 space); shoe outsole min y = 0 ± 0.0005.
- Bone positions within ±0.01 of the §3.1 table (after tuning, update the table and the test together).
- Fist: fist–thigh and fist–bottom-garment gap ≥ 15 mm; palm-facing test (§1).
- Garments: at rest, every garment vertex is outside the body by ≥ dmin (BVH signed distance); hem slices closed; layering rule holds
  for all top×bottom pairs; no garment triangle with area < 1e-8.
- Pose sweep (CPU LBS replicating three.js): 24 poses sampled from `RunnerRig.animate()` math at speeds 4/10/16/21 m/s × 6 phases
  + idle + celebrate; for each, kept-but-covered skin triangles (cells with mask bits of the equipped garment's hem band,
  i.e. R_g ∈ (−0.015, 0)) must not pierce the garment: segment test of body vertices against the posed garment surface
  (count < 0.5 % of those vertices; report worst).
- Budgets: per-combo triangle counts (LOD0 ≤ 25k, LOD1 ≤ 8k, LOD2 ≤ 2.2k), file sizes (total ≤ 3.0 MB), texture sizes
  (skin ≤ 1024², normal ≤ 512²).
- Decoder round trip in Node: import the vendored decoder (strip the IIFE), decode every buffer, compare with pre-encode arrays
  (exact for quantized data; garment barycentrics resolve to the same positions within 0.1 mm).
- Determinism: two runs → identical output bytes.

### 12.2 Renders (Playwright 1.56 at `/opt/node-tools/node_modules/playwright`, chromium headless, WebGL via SwiftShader)
Harness: `ferramentas/ver-corredor.html` loads `vendor/three-0.128.0.min.js`, the decoder, the four data files and `CharData.js`
(the real runtime module), builds `SkinnedMesh`es with the game's bone hierarchy and a copy of the runner material (map + vertex
colors + `mat` shader), neutral grey background, key light (0.5, 1, 0.8) + hemisphere fill. Driver: `ferramentas/ver-corredor.mjs`
writes PNGs to `ferramentas/saida-ver/` (gitignored). Each render must be looked at; acceptance in brackets.

| id | render | accept |
|---|---|---|
| R1 | rest pose front/side/back, orthographic, m and f, default outfit (m camiseta+short+curto, f top+legging+rabo), 1200×800 | arms hang beside the body, fists by the thighs, nothing floating, shoes flat on y=0, proportions = fit runner (compare with `spec/sm.png`, `sf.png`) |
| R2 | garment sheet: each top with the default bottom and each bottom with the default top, 3/4 view, both genders (≈ 20 tiles) | hems clean with visible lip, no skin through fabric, trims/stripes where specified, drape hides abs, skirt/collar right |
| R3 | hair sheet: 6 styles × 2 genders × {front, side, back}, hair color #4b2f1c; plus one row of the 5 hair colors on `rabo` | no scalp holes, no forehead clipping, ponytail/bun placed at the back, long hair rests on the back, curly reads as curls |
| R4 | skin tones: 5 tones × 2 genders, face close-up and full body | uniform tinting, no leftover underwear tint, lips/cheeks plausible on every tone |
| R5 | run cycle: 4 phases × speeds 4/10/16/21 m/s, side and 3/4 views, both genders, outfits camiseta+short and manga-longa+legging | no garment tearing, elbows/knees bend in the right direction (elbow forward, shin back), feet plant, hands stay fists |
| R6 | spring hair: rabo and longo, 8 frames of a 1 s run + stop, side view | hair swings and settles, never enters the back/neck |
| R7 | face close-ups m/f, front and 3/4, at 600×600 | brows/lashes flat-tinted (no speckles/white), eyes looking forward (iris centered), female expression softer than `shots/female_face.png` |
| R8 | LOD strip: LOD0/1/2 side by side at 3 m, 10 m, 25 m, each NPC combo | silhouettes consistent; LOD2 has no holes at hems |
| R9 | normal-map orientation: male forearm and face under a top light with/without normal map | relief lit from the top (else flip normalScale.y) |
| R10 | debug overlay: kept-but-covered skin triangles painted magenta, run cycle frames of R5 | magenta pixel count < 0.1 % of character pixels |
| R11 | in-game: `jogar/index.html` via `file://` and the single HTML from `node ferramentas/arquivo-unico.mjs` (also `file://`), character creation screen and 10 s of running, hero + NPCs | loads with no network and no console errors; FPS not lower than the old rig on the same machine |

### 12.3 CLI and dependencies
    npm install --no-save --prefix ferramentas/.deps meshoptimizer@1.3.0 pngjs@7.0.0 jpeg-js@0.4.4   # tarballs from the npm registry
    node ferramentas/assa-corredor.mjs --fonte <dir with verify-ubc contents> [--saida jogar/dados/modelos] [--relatorio] [--so m|f]
    node ferramentas/ver-corredor.mjs [--r R1,R2,…]
Sources are not committed (≈ 30 MB of PNG); the script checks SHA-256 of the glTF/bin/texture files against a table in the script
and refuses unknown inputs. `ferramentas/.deps/` and `ferramentas/saida-ver/` go in `.gitignore`.
Random: mulberry32 seeded per part name → deterministic output.

### 12.4 Order of implementation (each step ends with its render)
1. Load + re-pose + fist + frame (R1 bare, no garments). 2. Slimming + weight collapse + bones (R1, R5 bare). 3. Textures (R4, R7, R9).
4. Regions/cells + garments (R2, R10). 5. Shoes/socks (R1, R5). 6. Hair (R3, R6). 7. LODs + encoding + data files + decoder (R8,
size report). 8. Game integration check (R11).
