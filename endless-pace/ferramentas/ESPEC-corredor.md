# ESPEC-corredor — bake spec: Quaternius UBC → ENDLESS PACE runner

Status: **spec v8 (2026-10-07) — implemented**. §13 lists the v3 changes (review vq1), §14 the v5 changes (draped
clothes, real sneakers, hair polish), §15 the v6 changes (cloth that moves like cloth), §16 the v7 changes (pose-fitted
weights, rebuilt sneakers and skirt, folds that read) and §17 the v8 changes (mesh hygiene, soft folds, tight legging
shell, leg linings, armpit gusset weights, running-shoe sole and laces); where a later change overrides an earlier
section, the later section wins. Older text marked **[v2]** still explains the v2 reasoning.
Every place where v1 was changed during implementation is marked **[v2]** with the reason.

- Tool: `node ferramentas/bake-corredor.mjs` (Node 22, ESM). Helper modules live in `ferramentas/bake-corredor/*.mjs`. No Blender.
  **[v2]** v1 called it `assa-corredor.mjs`.
- Output: classic-script data files `jogar/dados/modelos/{corredor-m,corredor-f,roupas,cabelos}.js`.
- Runtime decoder: `jogar/js/runner/ModelData.js` (`EP.ModelData`). **[v2]** v1 used `CharData.js` plus a separate
  `vendor/meshopt-decoder-ref.js`. Now the meshopt reference decoder (vertex and index codecs only) is embedded in
  `ModelData.js`, so integration needs one `<script>` tag instead of two.
- Preview: `ferramentas/preview-corredor.html`. It renders through the real decoder with a `SkinnedMesh` on the game bones;
  Playwright calls `window.render(spec)`.
- The game must keep running from `file://` and as the single HTML built by `ferramentas/arquivo-unico.mjs`.
  - The data files contain no `<` at all (base64 + JSON).
  - `ModelData.js` has `<` only as JS operators; the bundler escapes `</script`.

Nothing in the game is wired yet. Integration (`index.html`, `RunnerRig.js`, `BodyModel.js`) is a separate step, see §11.5.

---------------------------------------------------------------------------------------------------------------------

## 0. Sources, cache, dependencies

### 0.1 Command line

    node ferramentas/bake-corredor.mjs [--cache DIR] [--saida DIR] [--so m|f] [--baixar] [--rapido]

- `--cache`: a folder **outside the repository** (the tool refuses a path inside it). Default `$EP_BAKE_CACHE` or
  `~/.cache/endless-pace-bake`. It contains:
  - `fontes/`: the CC0 sources;
  - `node_modules/`: the npm dependencies.
- `--saida`: default `jogar/dados/modelos`.
- `--so m|f`: bake one gender only. Writes only that gender's data and skips the checks; use it for debugging.
- `--baixar`: re-download every source even if it is already cached.
- `--rapido`: 8 AO rays instead of 20–24. Use it only for iteration; the committed data is a full bake.

Run time is about 35 s for a full bake (v3). Output is deterministic: two runs produce byte-identical files (checked by SHA-1).

### 0.2 Sources (`bake-corredor/fontes.mjs`)

Missing sources are downloaded and checked against a SHA-1 table.

- **Mirror 1 (everything):** `raw.githubusercontent.com/MateusJuni0/worldrpgs/main/art/models/`
  - `quaternius-base-characters/Universal Base Characters[Standard]/`:
    - `Base Characters/Godot - UE/`: bodies and textures;
    - `Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/`: hair;
    - `License_Standard.txt`.
  - `quaternius-animation-library/Universal Animation Library[Standard]/`: `Unreal-Godot/UAL1_Standard.glb`, `README.txt` and
    `License.txt`.
- **Mirror 2 (bodies and textures only):** `raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/main/assets-source/universal-base-characters/gltf/`.

Every file was verified git-blob-identical to the research copies.

| file | SHA-1 |
|---|---|
| Superhero_Male_FullBody.gltf / .bin | 00a1aca7… / 1850f127… |
| Superhero_Female_FullBody.gltf / .bin | 612acbae… / 05c11dd4… |
| T_Superhero_Male_Dark.png / T_Superhero_Female_Dark_BaseColor.png | 38d8b5e1… / a274b4d4… |
| T_Superhero_{Male,Female}_Normal.png | c7512229… / 31ba6e36… |
| T_Eye_Brown.png, T_Hair_1/2_BaseColor.png | 5d93178f…, 766f8805…, 6ecd00f6… |
| hair/Hair_{SimpleParted,Buzzed,BuzzedFemale,Long,Buns}.gltf/.bin | see `FONTES` in `fontes.mjs` |
| ual/UAL1_Standard.glb | c3fe59e5… |

### 0.3 Dependencies

The npm dependencies come only from registry.npmjs.org and are installed automatically into `<cache>/node_modules`:

- `meshoptimizer@1.3.0` (MIT): simplifier, encoder, and the reference decoder that `ModelData.js` copies;
- `pngjs@7.0.0`;
- `jpeg-js@0.4.4`.

Playwright for the renders is `/opt/node-tools/node_modules/playwright`; the driver script is not part of the repository.

### 0.4 Source facts (inspection, still valid)

- **Bodies:**
  - 65-joint skin; bind pose = node rest pose, error < 5e-7. Mesh roles are identified by material: `*Eyes*` = eyes,
    `*Hair*` = brows/lashes, otherwise the body.
  - Strict T-pose. Up +Y, front +Z, `_l` at +X.
  - Male 7281 v / 12566 tris, female 7376 / 12812. Both watertight once welded.
- **Hair parts:** positions are bind-world, 100 % Head. The Head rotation is identity in both skeletons, so a cross-gender
  refit is translate + scale.
- **UAL `Jog_Fwd_Loop`:** source of the fist pose.

---------------------------------------------------------------------------------------------------------------------

## 1. Re-pose (T → arms down), relaxed fist, final frame (`body.mjs`)

1. **Local transforms.** Finger and thumb `_01.._03` take `slerp(rest, UAL jog mean, 0.8)`; `hand_x` takes
   `slerp(rest, jog, 0.5)`. The jog mean is the sign-aligned mean quaternion over all keys. Rotations only.
2. **FK** from the node TRS.
3. **Arm rotations (world space)**, on both sides:
   - `clavicle_x`: −sx·8° about +Z.
   - `upperarm_x`: minimal rotation onto `(sx·sin α, −cos α, 0)`.
   - `lowerarm_x`: made collinear, then flexed 8° forward. The sign is chosen so that the wrist z grows; the tool asserts it.
4. **Palm check [v2].** The v1 cross-product test was handedness-dependent and gave a false failure on one side. Now the
   curled-finger direction (middle_03 − middle_01, made perpendicular to the hand axis) must point medially:
   `−dir.x·sx ≥ 0.7`. Measured 0.99 (m) and 0.99 (f).
5. **Adaptive abduction [v2].** v1 decided α after building the garments. Now the pose → skin → slim chain runs in a loop:
   α starts at 10° (m) or 13° (f) and grows by 1° until the fist–thigh vertex gap is ≥ 30 mm, up to 16°. This leaves room
   for the short. Result: **α = 10° male, 16° female**. Measured gaps:
   - male: fist–thigh 38 mm, fist–short 21 mm;
   - female: fist–thigh 38 mm, fist–short 28 mm.
6. **Skinning:** `S_j = W'_j·IBM_j`, linear blend of positions and normals, applied to body, eyes and brows.
7. **Final frame:** `game = (−x·s, (y − y_floor)·s + 0.022, −z·s)`.
   - The barefoot skull top − sole is **1.760 m for both genders** ("1.76 space"): s_m = 0.96725, s_f = 0.99152. At runtime
     `body.scale = height/1.76` gives 1.76 / 1.68 m. `heightReal` is stored for anyone who needs true meters.
   - `LIFT = 0.022`: the shoe outsole is at y = 0, the barefoot sole at 0.022, the skull top at 1.782.

## 2. Fit-runner body (`body.mjs` `slimBody`, `skin.mjs`)

- **Radial girth reduction per segment:** the v1 §2.1 tables, female unchanged. **[v2]** The male upper body is slimmer
  than v1, because the first renders still read broad and superhero-like (traps, deltoids, lats):

  | segment | v1 (kx, kz) | v2 (kx, kz) |
  |---|---|---|
  | upperarm | 0.84, 0.86 | 0.80, 0.83 |
  | lowerarm | 0.90, 0.90 | 0.88, 0.88 |
  | clavicle | 0.80, 0.85 | 0.74, 0.82 |
  | neck_01 | 0.84, 0.88 | 0.82, 0.86 |
  | spine_03 | 0.88, 0.95 | 0.85, 0.94 |
  | spine_02 | 0.92, 0.95 | 0.90, 0.95 |
- **Taubin smoothing:** λ 0.5 / μ −0.53, 8 iterations, masked by trunk/limb weight. Vertices whose albedo texel is
  underwear (dark, low saturation, in the pelvis/trunk/thigh joints) get 6 more iterations. The mask is dilated 2 rings
  at 0.6.
- **Textures:** see §9. Muscle shading is attenuated to 45 % and the normal map is flattened.
- **Female face:**
  - Eyeliner lift. Texels 6–24 mm from each eye centre that are darker than 0.6 × the local blur are lifted 70 % towards it.
  - Lash cards are scaled (0.88, 0.6) about their centroid **[v2]**, because the card geometry itself carries the eyeliner
    "wing".
  - Brow cards are scaled 0.82 in y.
  - Mouth corners: not done.

## 3. Bones (contract order + 4 hair springs; rest rotations identity; positions parent-relative)

`names = hips, torso, head, armL, elbowL, armR, elbowR, legL, kneeL, footL, legR, kneeR, footR, pony, pony2, hairA, hairA2`.
`parent = [-1,0,1,1,3,1,5,0,7,8,0,10,11,2,13,2,15]`.

| bone | source | male world (m) | female world (1.76 space) |
|---|---|---|---|
| hips | mid of hip joints (x=0) | (0, 0.971, 0.035) | (0, 0.966, 0.051) |
| torso | spine_01 (x=0) | (0, 1.068, 0.007) | (0, 1.076, 0.015) |
| head | neck_01 (neck base, x=0) | (0, 1.502, 0.040) | (0, 1.503, 0.040) |
| armL | upperarm_l | (−0.198, 1.415, 0.063) | (−0.147, 1.420, 0.054) |
| elbowL | lowerarm_l | (−0.240, 1.176, 0.063) | (−0.213, 1.191, 0.054) |
| legL | thigh_l | (−0.111, 0.971, 0.035) | (−0.110, 0.966, 0.051) |
| kneeL | calf_l | (−0.111, 0.556, 0.035) | (−0.110, 0.560, 0.032) |
| footL | foot_l (ankle) | (−0.111, 0.115, 0.085) | (−0.110, 0.100, 0.076) |
| pony | rabo cap: ray from skull centre along (0, .45, 1) + 12 mm | (0, 1.768, 0.093) | (0, 1.768, 0.101) |
| pony2 | pony + (0, −0.12, 0.035) | (0, 1.648, 0.128) | (0, 1.648, 0.136) |
| hairA | longo: ray along (0, −.15, 1) + 10 mm | (0, 1.710, 0.124) | (0, 1.709, 0.133) |
| hairA2 | hairA + (0, −0.13, 0.02) | (0, 1.580, 0.144) | (0, 1.579, 0.153) |

The R side mirrors L. The table matches the v1 prototype values to ≤ 1 mm, except the female elbow (α is now 16°).

- **Weight collapse:** as v1 §3.3. Hand and fingers go to elbowX; there is no wrist bone. Each vertex keeps its top 4
  weights as Uint8 with the sum exactly 255.
- **Rig contract signs** (verified in the preview test pose):
  - `rotation.x > 0` swings a hanging arm or leg forward (−Z);
  - `knee.x < 0` bends the shin back;
  - `elbow.x > 0` bends the forearm forward.
- **[v2] Hair-spring sign.** The hair hangs *behind* the head (+Z), so `rotation.x > 0` on pony/pony2/hairA/hairA2 swings it
  forward *into* the head. Trailing behind while running is a **negative** `rotation.x`.
  - Suggested runtime limits: pony/pony2 x ∈ [−1.2, 0.15]; hairA/hairA2 x ∈ [−0.6, 0.1].
  - v1 §8.4 gave [−0.25, 0.6], which had the wrong sign.
  - The old `_ponyStep` drives a positive x, so its target needs a minus sign.

## 4. Relaxed fist: as in §1.1. The fists render as loose runner fists (render R7/R5).

## 5. Labeling, regions, cover masks (`label.mjs`)

- **Per-vertex attributes:** position, normal, the 17 collapsed weights, sA, sL, wArm, wLeg, UBC hand/Head/neck weight.
  They are computed on the welded body and are linearly interpolatable, so garment cut points reuse them.
- **Regions:** the 17 ids of v1 §5.2.
- **Landmarks [v2]:**
  - `Ybra` (female under-bust) uses ray-cast front profiles at x = ±0.08 instead of vertex bins, which were too sparse on
    3 cm edges. Result Ybra = 1.268 with the bust apex at 1.338.
  - `cz` is the torso centre z at chest height (rays front and back).
- **Torso slices [v2]:** exact horizontal sections (triangle–plane intersections, arms and head excluded) every 1 cm,
  from H.y − 0.2 to S.y + 0.05. Vertex binning left holes in the convex hull and made the skirt and the drape wrong.
- **Garment regions R_g:** v1 §5.3 terms, plus:
  - all tops have a `noHead` term (UBC Head ≥ 0.5 → no fabric; without it the shirt covered the chin);
  - **corta-vento** hem is at H.y − 0.05 **[v2]** (v1 had −0.075, which crossed the crotch and made the hem jagged);
  - **top** (sports bra) is rebuilt **[v2]**. v1's neck/armhole/racer terms produced spikes and floating straps. Now:
    - `R = smax(smin(smax(hem(Ybra−0.02), line), smax(strap, hem)), noArm, noHead)`;
    - `line` is the top edge as a function of the angle around the torso: apex + 0.035 at the front, Ybra + 0.075 under the
      arm, Ybra + 0.05 at the back;
    - `strap` is the 3-D distance − 0.017 to a polyline per side. The polyline is cup top → upper chest → over the
      trapezius at x ±0.10 → upper back → converging at the spine. It is resampled every 8 mm and snapped to the skin,
      which gives a racerback.
- **Body cover masks:**
  - **Garment bits:** bit g is set if all three welded vertices have R_g ≤ −0.015.
  - **Hair bits 11–16:** a welded head or neck vertex whose normal ray hits that style's hair within 4 cm.
  - **Cells:** body triangles are sorted by (mask, region) into cells; LOD0 has 65 (m) / 72 (f).
  - Feet inside the shoes are deleted permanently (§7), so bit 10 (`tenis`) is never set.
- **Garment-under-garment cells [v2, new].** Every *bottom* triangle carries a mask of the tops that fully cover it
  (all 3 vertices with R_top ≤ −0.02 at the vertex's body base point). Socks carry the same mask for the bottoms.
  - The assembler drops bottom cells hidden by the equipped top.
  - This removes the shorts waistband under the shirt, the main source of poke-through at LOD1/2 and in bends.
  - The skirt extra is never culled.

## 6. Clothing (`garments.mjs`)

### 6.1 Representation [v2]

Garments are **explicit parts**: positions, normals, joints/weights, attributes. v1's derived barycentric records are not
used.

- **Why:** a uniform decoder, no dependency on body triangle order, and room for exact color cuts with seams. It costs
  about 30 % more data but stays within budget (`roupas.js` = 738 KB for 18 garments).
- **Weights** are still the barycentric blend of the base body point's weights, computed at bake time.
- **Extras** (skirt, windbreaker collar) carry their own weights.

### 6.2 Build per garment (male and female separately)

1. **Cut.** Marching-triangle clip of the welded body at R_g = 0. Cut points are welded per body edge, and attributes are
   interpolated.
2. **Subdivide** once (1 → 4).
3. **Smooth the base surface [v2].** Taubin on the base positions with the border fixed (8 iterations for tops, 4 for
   bottoms), then recompute the normals. Without this, the navel, abdominals and other small dips printed through the
   fabric as spikes.
4. **Offset:** v1 §6.3 thicknesses, flares, folds and waist bands.
   - Loose legs flare radially from the leg axis, weighted by smoothstep(0.35, 0.75, wLeg).
   - **Drape:** non-arm vertices are pushed out to the torso slice hull, using the v1 wfill rules. The radial push field is
     smoothed (4 iterations).
5. **Inner-thigh clamp** for short, bermuda and saia: the flare towards the other leg is at most gap/2 − 3 mm.
6. **Collision:** BVH closest point; the signed distance must be ≥ 1.5 mm (cotton) or 1.0 mm (tech), pushed along the
   interpolated body normal.
7. **Layering [v2].** The order is socks → bottoms → tops, and each garment is tested against *all* lower garments of the
   gender, including the skirt and the lips.
   - For each vertex, a ray goes from its body base point outward along the body normal. The first hit is the lower layer's
     thickness at that point. It counts only if the hit is ≤ 35 mm out and the hit normal faces the same way (dot ≥ 0.4).
   - The required offset is that thickness + **4.5 mm** (tops) or **2 mm** (bottoms). It is dilated over 2 rings of the
     shell graph so that lower-garment *edges* are covered, then applied, then collision runs again.
   - v1 used closest-point layering, which missed edges (dark lines through the shirt) and grabbed far surfaces (spikes).
8. **Relax [v2].** Each displacement is clamped to 1.6 × its neighbours' mean + 3 mm, the field is smoothed twice, and
   collision runs again. This removes isolated spikes at hems.
9. **Color slots by exact cuts [v2].** Each slot rule is a continuous field. The shell is cut along each field's zero line
   (marching triangles), and every triangle gets one slot from the signs of the fields. Vertices on a slot border are
   duplicated (a seam). The result is crisp trims, stripes, zipper and bands at any LOD; per-vertex slots smeared colors
   across triangles. Fields, all in meters, negative = inside the band:
   - camiseta: trim = min(δneck − .016, δsleeve − .018, δhem − .018). The chest logo was dropped: too small for the vertex
     budget.
   - regata: trim = min(δneck − .014, δarmhole − .012, δhem − .018).
   - top: trim = min(δR − .008, y − (Ybra + .02)), i.e. the edges plus the under-band.
   - manga-longa: trim at cuffs .025, neck .016 and hem .018; accent on the raglan line.
   - corta-vento: zip (|x| < 6 mm, front), cuffs/hem trim .02, reflective band at S.y − 0.12 ± 6 mm (accent).
   - short / bermuda / saia-short: waistband .035 and leg hem .015 → shortsTrim; outer-leg stripe (arc distance from the
     outer line ≤ 7.5 mm) → shortsAccent.
   - legging: waistband .045, hem .012, stripe 6 mm.
   - meia: top .018 → sockTrim.
10. **Simplify.** All LODs are index subsets of the LOD0 vertices.
    - **LOD0:** meshopt `LockBorder + ErrorAbsolute`, error 2.5 mm, target = v1 target − hem-lip triangles.
    - **LOD1 [v2]:** `Permissive` (color seams may collapse), error 12 mm, **no hem lip**. Socks use no lock.
    - **LOD2:** no lock, error 0.05.
11. **Hem lip [v2].** Each boundary loop gets a strip folded inward along the body normal by `min(cur − under, 8 mm)`.
    Its slot is the slot of the adjacent shell triangle; flags bit0 is set. It is in LOD0 only. v1 folded down to the body,
    which spanned the crotch with long spikes. The windbreaker neck loop has no lip because the collar covers it.
12. **AO:** 24 cosine rays against body + garment, `ao = 1 − 0.6·occluded`. Lips × 0.8, skirt lining × 0.6.
13. **Normals:** area-weighted on the color-welded LOD0, so seams don't break the shading; lips get the outward tangent.

### 6.3 Extras

- **Skirt (saia-short) [v2]:**
  - 28 around × 6 rows.
  - Top at H.y − 0.04, so it emerges just under a shirt hem.
  - Radius per row = max(waist hull + 13 mm + 45 mm·t^1.2, row-slice hull + 22 mm + 20 mm·t). The second term keeps the hips
    and the short inside.
  - Inner layer 2 mm in (lining, flags bit1); the last row is shortsTrim.
  - Weights: hips 0.55 + legL/legR 0.45·σ.
  - In LOD0 and LOD1; dropped at LOD2.
- **Windbreaker collar:**
  - The neck loop is resampled to 36 points, then 3 rows rise 35 mm, closing to the neck radius + 12 mm.
  - Inner face shirtTrim, zipper strip accent.
  - Weights torso 1 → 0.6 / head 0 → 0.4 with height.

## 7. Shoes and socks (`shoes.mjs`) [v2: rebuilt]

v1's single-SDF idea and a first SDF implementation gave a slipper or clog look with a messy collar. The shoe is now a
**lofted parametric surface per foot**.

- **Foot measurements** (final frame), from foot-dominant vertices below 0.14 m:
  - heel = max z, toe = min z, and the axis and lateral direction between them;
  - per station (24): lateral min/max and top;
  - leg ellipse at y 0.085–0.14, within 7.5 cm of the ankle.
- **Loft:** 26 stations (cosine spacing) × 28 around, closed with end-cap fans. The shoe runs from 20 mm behind the heel to
  17 mm past the toe.
  - Section: superellipse (exponent 8 below, so the base is flat; 2.6 above).
  - Half-width: measured + 6 mm, kept at the forefoot max towards the toe for a round toe box.
  - Height profile: heel collar 96 mm → sides 82 → tongue 94 → forefoot → toe 42 mm.
  - Each section radius is raised to the **foot's polar hull + 5.5 mm** (foot vertices within ±3 % of the station, binned
    by angle, ±1 bin), then smoothed. This guarantees the foot never shows (check: 0–1 foot vertices outside, all < 1 mm).
  - Midsole step: +3.5 mm outward below the midsole top. Toe spring: 12 mm·smoothstep(0.78, 1, s)².
- **Collar opening:** the top of the loft inside the leg ellipse (+5 mm, kept ≥ 7 mm inside the heel back) and above
  55 mm is removed. A lining wall (two rings, down to y = 0.042) and an insole fan close it.
- **Slots by exact cuts:**
  - outsole: y < 7.5 mm (+spring);
  - midsole: up to midTop (22 → 16 mm);
  - collar ring (≤ 11 mm from the opening) → shoeAccent; lining → lining;
  - laces: top band sin φ > 0.9, s 0.47–0.78, alternating 9.5 mm lace/shoe;
  - heel counter (s < 0.16, y < 65 mm) → shoeAccent;
  - diagonal side stripe (s 0.30 → 0.70, y 30 → 62 mm, 14 mm wide) → shoeAccent.
- **Weights:** footX 1, plus kneeX up to 0.25 near the collar (smoothstep around the ankle height).
- **AO:** shoe + leg. **mat** 4.
- **LODs:** 1300 / 350 / 110 per shoe (LOD2 uses `Permissive`).
- **Feet deleted:** body triangles with all 3 vertices inside the shoe (ray-parity test against the shell), below 0.11 m,
  and outside the leg ellipse unless below 0.045. That is 964 (m) / 1050 (f) triangles. The leg continues into the lined
  opening.
- **Socks:** a garment (`meia`) from 2 cm below the ankle joint to 10 cm above it.
  - The lower loop (inside the shoe) has no lip.
  - Runtime rule unchanged: socks are on unless the bottom is `legging`.

Three sneaker kinds (tenis / tenis-corrida / tenis-pro) share one mesh; only the runtime colors differ.

## 8. Hair (`hair.mjs`)

- **Placement:** sources are used in bind-world. Cross-gender pieces are scaled about the skull box centre by the per-axis
  skull size ratio (Head-dominant vertices above the eye line), then the target frame is applied.
- **Clearance:** ≥ 2 mm over the scalp and ≥ 8 mm from neck and shoulders, pushed along the body normal. The push field is
  averaged over the welded shell, smoothed 3 times, and its magnitude is kept at least the original.
- **Tone:** no hair texture at runtime. Per vertex, the luminance of T_Hair_1/2 (256² downsample, 5-tap) is divided by the
  texture mean and clamped to [0.7, 1.15].
  - `A.ao = ao × tone / 1.15`. Runtime color = hairColor × ao, and the mat-3 strand shader stays.
- **Back faces:** reversed copies of the triangles within 3 cm (graph distance) of an open border; tone × 0.7, flags bit1.
- **Styles:**
  - curto: m = SimpleParted; f = **bob** (Hair_Long cut by marching triangles at Hc.y − 0.085, front 1.5 cm higher, ±6 mm
    noise).
  - raspado: Buzzed / BuzzedFemale + 1.5 mm. **[v2] mat 1 (matte)**, because the mat-3 specular made a shiny helmet.
  - cacheado: the buzz cap subdivided once; the female nape stretched 1.6× below the ear line. Displacement:
    `vol·(0.75 + 0.25·edge falloff)`, plus Worley curl bumps (16 mm cells, 9 mm), plus 4 mm noise; vol = 20 mm (m) / 30 mm (f).
    Tone 0.78 + 0.22·bump.
  - rabo: Hair_Buns minus its two side buns (components with |x| > 0.07 behind the skull centre), plus a generated ponytail
    and hair tie.
    - Ponytail: Catmull-Rom tube, 14 rings × 14 around + tip.
    - **[v2] Radius** 22 → 38 mm at t = 0.22 → 8 mm at the tip (v1's 20/30/6 read as a thin spike); section 1.0 × 0.85,
      ±12 % noise, 0.6 rad twist.
    - Tie: 12×4 torus, slot hairTie.
    - Weights as v1 (head → pony → pony2).
  - coque: the cap + one bun rotated so its axis points along (0, .55, 1), centred 35 mm out from the scalp, scaled 1.15.
  - longo: Hair_Long. Below the ear line it is stretched by k = 1 + (kmax − 1)·backness, with kmax set so the back reaches
    N.y − 0.07 (kmax ≈ 2.7). Spring weights as v1 §8.4.
- **LODs:** 3000 / 900 / 250 (LOD1 and LOD2 may use `Permissive`).

Measured LOD0 tris (m / f): curto 1883 / 2810, cacheado 2999, rabo 3000, coque 3000, longo 3000, raspado 1330 / 1320.

**Brows / lashes:**

- Connected components above the eye line + 12 mm are brows, the rest are lashes.
- **[v2] mat 1** (matte, flat tint), slot brow or lash. mat 3's strand streaks made the brows look like carved wood.
- **LOD0:** brows simplified to 160 triangles per card. Lashes: 120 per card (f) or all 68 (m), plus back faces.
- **LOD1:** brows only, 40 per card. **LOD2:** none.

**Eyes:**

- 2 × 384 triangles at LOD0, 2 × 64 at LOD1, none at LOD2.
- mat 5, slot eye (runtime white).
- UVs remapped into the eye tile. The male back-of-eye u > 1 is clamped.

## 9. Textures (`skin.mjs`)

1. A position atlas at 1024² comes from rasterizing the body UVs (barycentric per texel).
2. **Underwear:**
   - Mask: texels in quadril, troncoInf, the upper thigh (y > H.y − 0.2) and the female chest below the shoulders, with
     V < 0.32 and S < 0.35. Dilated 3 px.
   - Filled by push-pull inpainting.
   - Grain is added back from the texel 6–20 cm higher, found through a 1 cm spatial hash of texel positions, at 50 %.
3. **Muscle shading:** D ← B + 0.45(D − B) with a masked Gaussian (σ = 10 px) on the trunk, limbs and neck.
4. **Female eyeliner lift** (§2).
5. **Detail map:** D = T / M (median skin over the trunk and limbs), 65 % chroma, clamped to [0, 1.9]. Stored as sRGB(D·0.5),
   so D = 1 is sRGB 188.
6. **Free square:** the largest one at 1024² with 8 px padding, (723,165,114) m and (812,8,115) f.
   - Eye tile: 96², `T_Eye_Brown` stored as sRGB(lin·2·0.5).
   - Neutral patch: 16², exactly 188, placed at (x + 97, y).
7. **Padding:** push-pull outside the islands. **Encoding:** JPEG q88, 1024². Size 72 KB (m) / 70 KB (f).
8. **Normal map 512²:**
   - Box-averaged from 2048 and renormalized.
   - Flattened with k = 0.65 on the body, 0.3 on the neck, 0 on the head and hands, 1 under the underwear mask.
   - The eye tile and neutral patch are flat.
   - Push-pull padding, JPEG q88. Size 38 / 30 KB.
   - Orientation is glTF/OpenGL; the preview uses `normalScale (0.8, 0.8)`.
9. **Runtime:** material color (2,2,2); `map` = skin (sRGB); vertex color = palette[slot] × ao.
   - Skin: D × tone. Non-skin parts use `uvNeutral`, giving palette × ao.

## 10. LODs and budgets (measured, v3)

| part | LOD0 | LOD1 | LOD2 |
|---|---|---|---|
| body (all cells) | 9614 m / 9980 f (hands at 0.45) | 4024 / 4154 (ratio 0.38, head 0.30, LockBorder) | per street mask (16 per gender): 744–860 (head 250 @ 4 mm, limbs, trunk; §13.1) |
| shoes (pair) | ~3200 (incl. laces, lining) | ~680 | 128 |
| eyes | 768 | 128 | 128 |
| brows + lashes | 592 m / 800 f | 80 | – |
| garments (m / f) | camiseta 3682/3604, regata 2860/2768, top –/2452, manga-longa 4474/4358, corta-vento 5346/5260, short 2337/2538, bermuda 2796/3008, legging 3654/3711, saia-short –/3580, meia ~900 | 950–2160 | 230–310 (main colour only) |
| hair | ≤ 3000 (cacheado 3711/3746) | 690–885 (sloppy, inflated) | 260–370 |

**Visible-triangle checks** (`ModelData.assemble`, all top × bottom × hair combos), worst case:

- **LOD0:** 21 896 (m, corta-vento + bermuda + cacheado) / 24 228 (f, top + saia-short + cacheado). Limit 25 000.
- **LOD1:** street outfits 6.3–7.4k (limit 8k). The worst player combo is 7.1k (m) / 8.6k (f); LOD1 is meant for NPCs.
- **LOD2:** street outfits 1.77–1.96k (limit 2.2k), socks on and off. Other combos fall back to LOD1 body cells (warning).

The NPC outfit list is a constant in `pipeline.mjs`; it is checked by regular expression against `RunnerRig.NPC_OUTFITS`.

## 11. Output format

### 11.1 Files and sizes (full bake)

| file | bytes |
|---|---|
| `jogar/dados/modelos/corredor-m.js` | 343 120 |
| `jogar/dados/modelos/corredor-f.js` | 333 051 |
| `jogar/dados/modelos/roupas.js` | 957 990 |
| `jogar/dados/modelos/cabelos.js` | 499 187 |
| **total** | **2.13 MB** (limit 3 MB) |
| `jogar/js/runner/ModelData.js` | ≈ 20 KB |

Each data file starts with two comment lines (generated-by, credits) and has this shape:

    (function (EP) { 'use strict'; var M = EP.data.models = EP.data.models || {};
      M.corredor = M.corredor || {}; M.corredor.m = {…}; })(window.EP);

`roupas.js` sets `M.roupas = { m: {…}, f: {…} }` and `cabelos.js` sets `M.cabelos = { m: {…}, f: {…} }`.

**Licenses** go in `jogar/modelos/LICENCAS/`:

- `Quaternius-UBC-License_Standard.txt`, `Quaternius-UAL-Readme.txt`, `Quaternius-UAL-License.txt`;
- `meshoptimizer-LICENSE.md` (for the decoder embedded in `ModelData.js`);
- `LEIA-ME.txt`.

The credit line is in `endless-pace/README.md`. The report goes to `ferramentas/saida-ver/relatorio.json` (git-ignored),
together with the debug images `pele-m.png` and `pele-f.png`.

### 11.2 Objects

**Stream** (string): RFC 4648 base64 of a meshopt-encoded buffer (`encodeVertexBuffer` / `encodeIndexBuffer`, default
version, no filters).

- Vertex streams decode with the meshopt vertex codec; headers 0xa0/0xa1.
- `I` decodes with the index codec (0xe1) to Uint16, and the corner order may rotate within a triangle.

**Part** (body, eyes, brows, shoes, every garment, every hair):

    {
      n: vertexCount,
      q: [x0,y0,z0, x1,y1,z1],      // position box, final rest frame (meters, 1.76 space)
      P: stream n×8 B,   Uint16 qx,qy,qz,0        → p = q0 + q/65535·(q1 − q0)
      N: stream n×4 B,   Int8 ox,oy,0,0          → octahedral normal: x=ox/127, y=oy/127, z=1−|x|−|y|,
                                                  t=max(−z,0), x+=x≥0?−t:t, y+=y≥0?−t:t, normalize
      T: stream n×4 B,   Uint16 u,v /65535        (body and eyes only; glTF convention v down, texture.flipY = false)
      J: stream n×4 B,   Uint8 bone indices (0..16, §3)
      W: stream n×4 B,   Uint8 weights, sum = 255
      A: stream n×4 B,   Uint8 mat, slot, ao (0..255 → 0..1), flags (bit0 hem lip, bit1 back face / lining, bit2 skirt)
      lods: [ { t: triCount, I: stream, cells?: [[mask, region, triCount], …] }, … ],
      lod2ByMask?: { "<coverMask>": { t, I } }   // body only
    }

- Body: `lods` = [LOD0, LOD1]. `cells` partition the index list into contiguous runs, in order. **[v3]** LOD0 and LOD1
  have their own cell lists (the hair cover bits differ per LOD, §13.1).
- Garments and hair: `lods` = [LOD0, LOD1, LOD2]. Eyes and brows: [LOD0, LOD1]. A part is absent at a LOD index ≥ `lods.length`.
- **[v3]** A LOD may use vertices that LOD0 does not (garments, shoes: every LOD is cut separately; hair: inflated LOD1/2
  copies). Vertex order is first use over LOD0, then LOD1, then LOD2; the decoder is unchanged.
- Garment parts also carry `kind`, `mat`, `coverBit`, `layer` (socks 1, bottoms 2, tops 3) and `bodyId`.
  - Bottoms and socks have `cells` per LOD: `[maskOfCoveringGarments, 0, triCount]`. The mask holds top bits for bottoms and
    bottom bits for socks.
- Hair parts carry `style` and `bodyId`.

**Character** (`EP.data.models.corredor.m|f`):

    { v: 1, id: "m-<8 hex>", gender, space: 1.76, heightReal: 1.76|1.68, lift: 0.022,
      bones: { names[17], parent[17], pos[17][3] (parent-relative) },
      measures: { hipY, thigh, shin, ankleY, footLen, shoulderW, hipW, upperArm, foreArm, neckY, headTop },
      anchors: { skull{bone,center,radii,top}, eyes{bone,center,spacing,front}, ears{bone,left,right},
                 wristL{bone,pos,radius}, back{bone,pos}, waist{bone,y,rx,rz,cz} },   // bone-local, rest
      slots: [skin,brow,lash,eye,hair,hairTie,shirt,shirtTrim,shirtAccent,shorts,shortsTrim,shortsAccent,
              sock,sockTrim,shoe,shoeAccent,sole,midsole,lace,lining],
      mats: [skin,cotton,tech,hair,shoe,eye],
      coverBits: { camiseta:0, regata:1, top:2, "manga-longa":3, "corta-vento":4, short:5, bermuda:6, legging:7,
                   "saia-short":8, meia:9, tenis:10, "hair:curto":11, …, "hair:raspado":16 },
      textures: { skin: dataURI JPEG 1024², normal: dataURI JPEG 512², uvNeutral:[u,v], eyeTile:[u0,v0,u1,v1] },
      body, eyes, brows, shoes }

### 11.3 Runtime API (`EP.ModelData`, implemented)

    ok()                        both genders loaded
    char(g)                     character header (the object above)
    part(g, 'body'|'eyes'|'brows'|'shoes'), hair(g, style), garment(g, kind)   → Mesh (vertex arrays decoded once, cached)
    index(mesh, lod)            → Uint16Array (decoded once)
    normOutfit(g, outfit)       same defaults as RunnerRig: f → top/legging/rabo, m → camiseta/short/curto;
                                m: top→regata, saia-short→short; socks = bottom ≠ legging
    coverMask(g, outfit)        → bits of top | bottom | (socks ? meia) | hair
    assemble(g, outfit, lod)    → one Mesh (body cells culled, LOD2 per-mask body if available, garment cells culled,
                                eyes/brows absent at LOD2, neutral UV filled, unused vertices dropped), cached by key.
                                [v3] At LOD2 the body UVs all point at the neutral patch (vertex colour only, §13.1);
                                a LOD2 request whose mask was not pre-baked logs one console.warn and uses LOD1 body cells.
    geometry(mesh)              → THREE.BufferGeometry: position, normal, uv, skinIndex (Uint8), skinWeight, mat (Uint8)
    texture(g, 'skin'|'normal') → THREE.Texture (flipY false, sRGB/Linear, anisotropy 4), created once from the data URI

    Mesh = { n, position, normal, uv, skinIndex, skinWeight, mat, slot, ao, flags, index, key, outfit, coverMask }

Decoding everything (both genders, all parts) takes ≈ 130–155 ms in Node with the pure-JS reference decoder; one assembly decodes
only what it uses.

**[v3] Textures load asynchronously.** `texture()` returns the `THREE.Texture` before its data-URI image has loaded
(`needsUpdate` is set in `onload`). The game must keep its render loop running, or re-render after the image loads; a
single render right after creation draws the skin black. The preview waits for `texReady()` (image complete and
`texture.version > 0`) before its first render. **Next step for integration:** add `ModelData.js` and the four data files to `index.html`.

### 11.5 Runtime integration notes (for the RunnerRig agent)

1. Replace the BodyModel sculpt with `EP.ModelData`.
   - Bones: `char(g).bones` (17 names; the new springs are pony2, hairA, hairA2).
   - `HIP_H` → `measures.hipY` (0.971 m / 0.966 f, in 1.76 space).
   - `HC` and accessory offsets → `anchors`.
2. Material: add `map = texture(g,'skin')`, `color (2,2,2)`, and `normalMap` on non-lite quality; keep `vertexColors` and the
   `mat` attribute shader.
   - Color = palette[slot] × ao (skin slot = tone; eye slot = white).
   - One material per gender (different skin maps).
3. **Springs:** pony→pony2 (rabo) and hairA→hairA2 (longo). Mind the **sign** (§3): trailing = negative x.
4. The skirt accessory `ACC.skirt` is obsolete (baked). `outfitOf` should keep `saia-short` for females.
5. Known LBS limit: arms raised overhead (`celebrate`) pinch at the deltoid, because the clavicle has no game bone.
   **[v3]** Cap the raise at **2.2 rad** (`RunnerRig._idle` uses π·0.95 ≈ 2.98, the stretch pose up to 2.7). At 2.2 rad the
   sleeves and straps stay on the shoulder (render `zcel22`, preview pose `celebrate22`); at π·0.95 the sleeve still lifts.
6. **[v3] NPCs at LOD2** must use the exact `NPC_OUTFITS` objects (hair included). The body LOD2 is pre-baked for each
   street outfit with socks on and off (16 masks). Any other combination falls back to the LOD1 body (~4–5k tris) and
   `ModelData` logs a warning once per key.
7. **[v3] Material:** mat 2 (technical fabric) specular 0.16 / shininess 9 and mat 3 (hair) specular 0.3 × AO /
   shininess 16 in the preview (was 0.7/22 and 1.1/36, which read as latex and plastic). The preview passes `ao` as the
   `aov` attribute so hair specular dies in the inner layers. Use the same values in `Materials.js`.
8. **[v3] Brows:** palette brow = hair × 0.65 blended 15 % to skin, then clamped to ≤ 40 % of the skin luminance (dark
   skin tones no longer get light-brown brow stickers).

## 12. Verification

### 12.1 Automatic checks (`bake-corredor/checks.mjs`)

These run after writing the files, through the real `ModelData.js` in a Node `vm`. Any failure gives exit code 1. Last
full bake: **0 failures**.

| check | result |
|---|---|
| bone hierarchy reproduces the world positions | error ≤ 1.2e-5 |
| bones vs the §3 table | ≤ 0.8 mm |
| **[v3] skull holes:** 1500 Fibonacci rays from the skull anchor against the assembled mesh, every hair style × LOD 0/1/2 (camiseta/short and every street outfit); a ray that exits above the neck base with no hit fails | 0 rays |
| **[v3] LOD2 body pre-baked** for every street outfit, socks on and off | pass |
| every vertex: weight sum 255, bone index < 17, no NaN; every LOD index in range | pass |
| barefoot height | 1.760 (both) |
| outsole min y | 0.0000 |
| fist–thigh / fist–short | 37.8 / 21.2 mm (m), 37.8 / 28.1 mm (f) |
| garment vertices inside the body (excl. lips and inside the shoe), all LODs | report only. **[v3]** tops 2.5–7 % by design (the allowance of §13.2, only where the skin underneath is culled); bottoms ≤ 2 %, under-short of saia-short ≈ 10 % within 2 mm (hidden by the skirt) |
| budgets per combo | §10 |
| total size | ≤ 3 MB (2.13 MB in v3) |
| NPC outfit list | matches `RunnerRig.NPC_OUTFITS` |
| determinism | two full bakes byte-identical |

### 12.2 Renders

Renders come from `ferramentas/preview-corredor.html?driver`, driven by Playwright with SwiftShader WebGL.

| set | content |
|---|---|
| R1 | front/side/back |
| R2 | garment sheets |
| R3 | 6 hair styles × 3 views × 2 genders, plus the 5 hair colors |
| R4 | 5 skin tones (face and body) |
| R5 | run cycle at 4/10/16/21 m/s |
| R6 | contract test pose and hair springs |
| R7 | faces |
| R8 | LOD strips at rest and running |

### 12.3 Known gaps (v2)

- **Shoes:** they read as clean low sneakers at game distance, but up close they are simple. There is no separate tongue,
  no eyelets, and the throat is an elliptic opening.
- **Garments:**
  - small notches can remain where a color cut meets a hem;
  - loose shorts show the natural gap between the thighs up to the crotch;
  - `celebrate` deformation is untested.
- **Female top:** the strap junction at the back is slightly zig-zag.
- **Female face:** the painted eyeliner is reduced but still present.
- **Not implemented from v1:**
  - the per-vertex pose sweep (§12.1 v1) and the "kept-but-covered" magenta check (R10);
  - female mouth-corner lift;
  - the beard (Hair_Beard is not used).
- **Garment simplification:** LOD1 uses `Permissive`, so trims and stripes may wobble at mid distance.

---------------------------------------------------------------------------------------------------------------------

## 13. v3 changes (review vq1)

All changes are in `ferramentas/bake-corredor/*`, `jogar/js/runner/ModelData.js` and `ferramentas/preview-corredor.html`.
`RunnerRig.js` is untouched (see §11.5 for the runtime asks). Full bake ≈ 35 s, still byte-deterministic.

### 13.1 Scalp holes (blocker) and LODs

- **Hair cover bits** (`hair.mjs`): a welded head/neck vertex is covered only when
  - five rays (along the skin normal, and tilted ±45° on both tangent axes) all hit that style's hair within 4/6 cm, and
  - fringe/part styles (curto, rabo, coque, longo) never cover the forehead or temples (z in front of the skull centre −15 mm,
    above eye height − 3 cm), and
  - the cover is eroded by one ring.
  A body triangle gets the bit only when, in addition, its 3 corners, 3 edge midpoints and centroid are all behind the
  hair as seen from **both** skull centres (hair-fit centre and the `anchors.skull` centre).
- **Per-LOD bits:** LOD0 cells use the LOD0 hair; LOD1 cells (also the base of LOD2) require the LOD1 **and** LOD2 hair.
- **Hair LOD1/LOD2:** `simplifySloppy` over the front faces (900 / 380 tris) instead of edge collapse, which opened bald
  strips between separate locks. Each LOD1/2 vertex that sits under the LOD0 hair (seen radially from the skull centre)
  gets an inflated copy 1 mm above it (max 15 mm, welded positions inflate together); `rep.cabelo_<style>_inflado`.
- **Check:** `checks.mjs` `skullHoles()` — see §12.1. Result: 0 rays for all 6 styles × 3 LODs × both genders and every
  street outfit (vq1 measured up to 27 % at f curto LOD2).
- **LOD2 body:** simplified per group (head 250 tris at 4 mm error, each arm, each leg, trunk) with borders locked, so
  the face keeps its shape and no triangle bridges arm and trunk. Pre-baked for every street outfit with socks on and
  off. At LOD2 the runtime uses vertex colour only for the skin (no skin texture: the decimated UVs smeared the eyes).
- **LOD2 garments:** main colour only (no trim/stripe), no cuts. Eyes keep their LOD1 sphere at LOD2.

### 13.2 Garments (`garments.mjs`, `label.mjs`)

- **Body proxy for tops:** tops are cut from a smoothed copy of the body (Taubin 30 iterations for fitted tops, 120 for
  the windbreaker, which also flattens the arms); the female bust gets 10/16 extra pure-Laplacian iterations. In the
  pipeline the real torso is also pre-smoothed (female bust, male pecs/abs), so nipples no longer print.
- **Collision allowance:** under a top, far from any skin that stays visible (graph distance > 3 cm), the fabric may sit
  up to 25 mm (f) / 15 mm (m) inside the real body; that skin is culled by the cover mask anyway. Near visible skin the
  allowance fades to 0.
- **Offsets:** camiseta 6.5–7.5 mm, regata/manga-longa 6.5 mm, corta-vento 22 mm (trunk) / 16 mm (sleeve); layering margin
  over bottoms 6 mm. Layering rays now consider every surface of the lower garment along the ray.
- **Colour bands:** the shell is simplified **first**, then each LOD is cut. Before cutting, triangles crossed by a colour
  line are refined by longest-edge bisection (LEPP) to ≤ 5 mm (LOD0) / 10 mm (LOD1); fields are evaluated exactly at new
  points. Fields:
  - trims/hems/cuffs/waistbands: Euclidean distance (in base-body space) to the polyline of the matching boundary loop
    (neck, sleeve, hem, waist, leg, sock top) minus the width — the line runs parallel to the real edge;
  - side stripe: `|u| − half width`, where `u` is the signed distance to a smoothed lateral seam polyline per leg
    (outermost point of each 1 cm slice, moving average ±4 cm, snapped to the skin);
  - corta-vento: zipper `max(|x| − 6 mm, z − cz)`, reflective band **back only** (no more "+" on the chest);
  - manga-longa: raglan band removed (it produced the shoulder slivers);
  - top: trim by distance to the shell border (no more specks at the cup/strap junction).
- **Islands:** any colour island smaller than 1.5 cm² (LOD0) / 4 cm² (LOD1) goes to the neighbouring slot with the longest
  shared border. A 0.6 mm (LOD1: 1.5 mm) border-locked simplification then removes cut slivers.
- **Hem lips:** boundary loops are smoothed along the loop (20 iterations) before lips are built; the lip folds towards
  the base point on the body (not along the normal) and is skipped where the shell bridges a gap > 2 cm (crotch).
- **Leg hem plane:** short/bermuda/saia leg ends are planes perpendicular to the thigh axis (the `sL` field rose in a
  "V" at the gluteal fold).
- **Sports top:** the racerback polyline continues into the band (two extra points) and the strap/band blend radius is
  18 mm, so the junction is one strip.
- **Skirt (saia-short):** starts at the waistband (T.y + 2 mm). Radius per direction = outermost surface (short shell or
  body without arms) sampled every 3 mm, accumulated top-down + 4.5 mm; a fitted yoke down to the T-shirt hem height, then
  +17 mm and a 5 cm flare; the radius also clears the inflated LOD1 short. 12 rows (trim row duplicated for a hard
  edge). Weights: those of the closest point on the under-short (thigh/hips), blended to pure hips over the top 2–11 cm,
  then smoothed over the skirt mesh (6 iterations, the lining copies the outer face) — a raised thigh carries the skirt
  instead of cutting through it. The under-short of `saia-short` is tight (4.5 mm, no flare). Skirt vertices have flags bit2; the yoke 2 cm inside a top's hem is culled under
  that top (cells), and tops ignore the skirt when layering.
- **Shoulder weights for raised arms:** in tops, the torso→arm weight transition is spread over the shell (8 Laplacian
  iterations on welded positions, only where arm weight is mixed, dilated 2 rings).

### 13.3 Body and face (`body.mjs`, `pipeline.mjs`)

- **Male slimming v3:** upperarm (0.70, 0.74), clavicle (0.62, 0.76), spine_03 (0.80, 0.92), neck (0.80, 0.85); the whole
  arm moves 20 mm towards the body; 10 extra Taubin iterations over clavicle/upperarm/spine_03/neck. α stays 10°
  (fist–thigh 32 mm).
- **Thumb:** after the fist pose, the thumb chain is rotated (search + 4 CCD rounds on thumb_02/01) until the tip is
  ~9 mm from the side of the index finger near the palm; then the index chain curls (6 CCD rounds) until its tip meets
  the thumb's distal phalanx (11–15 mm). No more "OK" ring (render `zhand`).
- **Brows:** cards 0.72 (m) / 0.66 (f) in height, outline smoothed (8 iterations along the border), pushed to 0.3–0.6 mm
  above the skin, normals copied from the skin under them.

### 13.4 Hair (`hair.mjs`)

- **Inner layers:** AO × (1 − 0.35 × over) where `over` = another lock above the vertex along the radial direction (5 cm);
  faces turned towards the head × 0.7–1; downward faces × 0.85. Hair specular is scaled by AO in the shader (§11.5).
- **Ponytail:** 6-point path with a smooth exit from the tie, 22 rings × 16 sides, radius 18 → 32 mm (body) → 22 mm with a
  rounded (elliptic) tip, shallow strand grooves; weights blend head → pony → pony2 over t 0–0.85.
- **Cacheado:** the cap is subdivided twice; curls are 2.4 cm Worley domes (12 mm) plus a finer 1.1 cm level (3 mm),
  valleys darker (tone 0.6–1.0); LOD0 budget 3800 tris.
- **Raspado:** hairline loop smoothed (12 iterations, first inner ring follows half way) and the border vertices take the
  skin slot, so the cap fades into the skin across one triangle row.

### 13.5 Shoes and socks (`shoes.mjs`)

- Loft radius = foot hull + clearance as a floor, then a smooth envelope (local max, 3 blur passes, 8 floor-clamped
  Laplacian passes): no toe/instep lumps.
- Each LOD simplifies the open shell first (LOD0 760 tris with the opening locked, LOD1 130, LOD2 56) and is cut after;
  LOD1/2 have only sole/midsole/upper colours.
- Collar trim = Euclidean distance to the opening polyline (9 mm). Accent stripe = band between two smooth curves,
  tapering at both ends. Heel counter accent below 6 cm, back 10 %.
- **Laces:** 6 raised bars (3 mm, `lace` slot) across the tongue in LOD0.
- Lining: only on the ankle opening loop (LOD0 wall + insole, LOD1 single wall, LOD2 a cap).
- **Collar weights** follow the knee/foot weights of the ankle skin nearby (above 5 cm, blended to 9 cm), like the sock.
- **Foot deletion:** inside the ankle opening ellipse, all body triangles below 7.5 cm are deleted (heel skin no longer
  shows when the ankle flexes); elsewhere the inside test as before.

### 13.6 Sources

`ual/README.txt` and `ual/License.txt` are now SHA-1 pinned (253705248e3c…, 4e06133f1c77…).

### 13.7 Known gaps (v3)

- Raising the arms to π·0.95 still lifts the T-shirt sleeve off the shoulder (LBS without a clavicle bone). Fixing it in the
  bake would need a helper bone; the recommended fix is the 2.2 rad cap in `RunnerRig` (§11.5 item 5).
- The female camiseta/manga-longa still follow the bust shape (by design, no more nipple points); the corta-vento reads
  loose.
- The hair still uses the source geometry; at close range the locks read as cards, not strands.
- `Materials.js` (game) still has the old mat 2/3 specular values; the preview shows the intended ones.

---------------------------------------------------------------------------------------------------------------------

## 14. v5 changes — draped clothes, real sneakers, hair polish

User feedback: "the clothes look like a piece of cloth glued on". In v4 every shirt was a normal-offset shell of the body
(proxy-smoothed), so it still showed the bust/pecs, the under-bust hollow, the navel, the waist curve and the shoulder
blades. v5 replaces the shell with **draped volumes**. Only `ferramentas/bake-corredor/*` changed (new module
`drape.mjs`); the data format, `ModelData.js` and the rig contract are unchanged. `EP_OLD_GARMENTS=1` still builds the
v4 garments (for comparison only).

### 14.1 Draped volumes (`drape.mjs`)

- **Tubes.** A garment is the smooth union of tubes around the body:
  - the trunk/pelvis: horizontal slices every 1 cm, without arm, hand and head triangles;
  - each arm, forearm, thigh or shin: rings perpendicular to the bone (frame u = outwards, v = forwards on both sides).
  - For each ring, the body section is reduced to its **support function** h(φ) (96 directions). That is its convex hull:
    it bridges the gap between the breasts, the under-bust, the navel, the spine groove and the gluteal fold.
- **Shaping**, all on h(φ), so every ring stays convex:
  - **ease** e(s, φ): yoke → chest → hem flare. Less ease at the sides near the armpit and on the inner side of the
    sleeve, so the sleeve and trunk meet only in the armpit.
  - **drape**: from the widest ring (chest/shoulder blades for tops, gluteus for shorts, thigh root for legs), each
    following ring contains the previous one shrunk by `slope·ds`. Fabric falls from the bust and shoulder blades and
    can only come back in slowly: tee 0.14 (m) / 0.24 (f) m/m, windbreaker 0.10–0.16, long sleeve 0.30–0.40. Shorts
    legs fall from the hip.
  - **smoothing**: Gaussian along the axis (cloth tension) and around φ.
- **Radial table and field.** Each tube gets a radial table r(k, θ) around a smoothed Steiner centre. The field is
  F = ρ − r − fold(s, θ). Tube ends are closed by a rounded cap (smooth max) or a dome.
  - Separating planes: per height, the midpoint between the trunk's outermost x and the arm's innermost x. The trunk
    tube cannot pass it and the sleeve tube cannot cross it from the other side, so there is no web between sleeve and
    trunk.
  - The union radius is height-dependent for tops: 12 mm over the shoulder (round seam), 3 mm under the arm.
- **Tight bottoms (legging, under-short of saia-short).** The pelvis is the body SDF (4 mm voxels, closing 16 mm, so
  the crotch "V", gluteal fold and small dips are filled) + 2.6 mm. The legs are tubes (convex rings) + 2.6 mm, and the
  union radius is 15 mm.
- **Sports top.** One trunk tube with a compression drape (slope 1.1 from the bust apex down to the band). This gives
  a single smooth bust shape, no separation and a wide under-band.
- **Folds** (in the field, so they shade):
  - long vertical "pipes" from the chest to the hem, stronger at front/back than at the side seams;
  - diagonal pulls from the armpit;
  - sleeve-hem waves;
  - elbow accordion and cuff gathering on long sleeves;
  - leg-hem waves on shorts and bermudas;
  - gathers under the elastic waistband;
  - small compression creases behind the knee on leggings.
- **Mesh.** Surface nets at 4.5 mm (socks 3 mm). Every component at least 15% of the largest is kept (socks are two
  pieces).
- **Records.** Each vertex takes its weights and attributes from the closest body point on its own tube's BVH (trunk /
  armL / armR / legL / legR). The weights are smoothed over the mesh (60 iterations) only where the cloth is more than
  4 mm off the skin and inside the junction band between two tubes (< 3 cm), with 4 global iterations at λ 0.3. New
  record fields: `dr` (draped), `tb` (tube role 0/1/2), `sx` (axial coordinate), `jn` (signed gap to the second tube;
  0 = armhole line).
- **Cut.** The region terms `R_g` still define the openings. The sleeve term uses the tube axial coordinate on draped
  records, so the trunk is never cut by the sleeve.
- **After the cut** (`garments.mjs buildDraped`):
  - 3 Taubin passes (grid steps);
  - collision ≥ 3 mm for loose cloth, 1.2–1.6 mm for tight;
  - layering over the lower garments by rays from 4 cm inside along the surface normal, margin 5 mm (tops) / 2 mm
    (bottoms);
  - then the v3 pipeline: simplify, LEPP refine, exact colour cuts, islands, LODs, AO.

### 14.2 Finishing

- **Raised trims.** Neck rib, sleeve band, hem band, waistband, leg band and sock top are raised along the normal
  inside the trim band (0.7–1.6 mm by edge type) and are 0 at the colour line. They read as doubled fabric.
- **Hems of loose garments** (`hemFinish`, LOD0) replace the v3 lip:
  - a rolled edge: a half-round of thickness 2.4–2.6 mm (3 intermediate rings), flags bit0;
  - an inner facing: the shell within 1.2–4 cm of the edge, offset inwards by the thickness with flipped faces, flags
    bit1 (AO × 0.6).
  - Seen from below, the hem has thickness and the inside reads as fabric, not a hole.
- **Seams.** Armhole seam: a 3 mm band on the zero of `jn` (two signed fields), shirtTrim, LOD0 only.
- **Shorts drawcord** (short, bermuda): two 6-sided cords with tips, hanging 6.5 cm in front of the waistband. Hips
  weight, LOD0 only.
- **Legging.** The female legging is now a **capri** (thigh + 0.55 shin). The lateral panel is 2.6 cm wide at the hip
  and 2.6 → 1.3 cm wide down to the hem (half-width 13 → 24 mm). The seam is taken from the garment surface itself
  (`garmentSeam`), so the body bumps do not wiggle it.
- **Sports top.** Racerback: both straps converge into one centre strap, which flares into the band (`back` term,
  Y shape).
- **Skirt (saia-short).**
  - Extra rows at the tops' hem heights, so the hidden yoke culls on a clean line.
  - Clearance over the under-short is +6 mm, plus 12 mm below the waistband.
  - Leg weights: the leg starts driving the skirt below the tee-hem row (earlier at the front). Coefficients at the
    hem: 0.38 + 0.62·front + 0.42·back.
  - AR 44.
  - The cull under a top uses a no-arm BVH (the hanging hand gave arm records) and reaches 6 mm below the top's hem.

### 14.3 Body culling (`pipeline.mjs`)

- `GM.cullMargin(kind)`: loose garments hide the skin only at R ≤ −3.5 cm, tight ones at R ≤ −1.5 cm as before.
  Looking up a sleeve or under a hem shows facing and skin, never a void. The garment AO uses the same visible-skin set.
- Skin within 5.5 cm of each armpit is never culled by a loose top (the armhole slit opens when the arm swings back).

### 14.4 Sneakers (`shoes.mjs`)

- **Upper.** The v4 loft with:
  - a rounded heel (circular arc over the last 14%, with the back wall kept high) and an elliptic toe;
  - an instep bump of 88 mm;
  - instep skin up to 13 cm outside the ankle opening added to the clearance hull. Without it the instep poked through
    in front of the throat.
  - The upper is cut below the midsole line.
  - Colour cuts are refined (LEPP ≤ 6 mm): rubber **toe cap**, **heel counter**, swoosh-like **side stripe** rising
    from the midsole and tapering, and **collar**, all shoeAccent. The accent areas are raised 0.6 mm.
- **Sole.**
  - **Midsole** (slot midsole): thick, 31 mm at the heel and 21 mm at the forefoot (10 mm drop). The wall is flared
    7 mm at the heel and 3.5 mm at the arch, bulges 1.2 mm and has a crease. A top flange tucks under the upper.
  - **Outsole** (slot sole): a 4.5 mm wall chamfered 1.1 mm inwards and a flat bottom (ear-clipped outline) with toe
    spring.
- **Collar.** Padded collar roll (shoeAccent outside, lining inside), thicker at the Achilles; heel pull tab
  (shoeAccent).
- **Tongue** (shoe front, lining back): from under the laces to 1.9 cm above the opening, with a shoeAccent top edge.
- **Laces** (slot lace): 5 arched bars plus a bow with two loops and two hanging ends (LOD0). LOD1 has 3 bars and no
  bow.
- **Lining.** The opening lining wall and insole as before.
- **Budgets.** Per shoe: 2.21–2.27k tris (LOD0), 466–477 (LOD1), 94–96 (LOD2: upper + 10-point sole, no tongue).
- The foot inside the shoe is still deleted.

### 14.5 Socks

Draped tube from 17 cm above to 5.5 cm below the ankle. The rings are clipped at 6.5 cm sideways/back and 13 cm
forwards, so the sock covers the instep seen through the shoe's throat. Draped records are cut at sL = LL + 4.5 cm,
inside the shoe.

### 14.6 Hair (`hair.mjs`)

- **No grey/white streaks.** The per-vertex tone from T_Hair_1/2 is averaged over the welded mesh (8 iterations) and
  compressed: tone = clamp(1 + 0.5·(t − 1), 0.86, 1.06). The AO is smoothed inside each card (2 iterations).
- **Ponytail.**
  - A bundle of 6 clumps (7-sided tubes that separate, twist 0.9 rad and taper to points at different lengths
    t = 0.88–1.0) around a core tube that fills the gaps near the root.
  - A ruffled **scrunchie** (18×6 torus, 9 ruffles, slot hairTie).
  - Spring weights head → pony → pony2 as before.
- **Long hair.** Below the ear, the strands are pulled together into 24 clumps. The pull is stronger at the tips
  (−62% of the angular offset), the tip lengths vary by up to 2.8 cm, and the gaps between clumps are darker (tone
  × 0.78). The springs are unchanged.
- **Brows** stay mat 1, solid.

### 14.7 Measured (full bake v5)

| item | m | f |
|---|---|---|
| worst assembled LOD0 (limit 28k) | 25 208 (corta-vento + bermuda + cacheado) | 25 814 (camiseta + saia-short + cacheado) |
| worst LOD1, any combo / street outfits (limit 8k) | 7 522 / 7 030 | 9 208 / 7 093 |
| street LOD2 (limit 2.2k) | 1 960–2 127 | 1 861–2 050 |
| camiseta / regata / manga-longa / corta-vento LOD0 | 4651 / 3940 / 5037 / 5789 | 4822 / 3538 / 4790 / 5649 |
| top / short / bermuda / legging / saia-short / meia LOD0 | – / 3657 / 4109 / 3450 / – / 427 | 1707 / 3604 / 4004 / 3509 / 4221 / 419 |
| shoes (pair) LOD0 / LOD1 / LOD2 | 4534 / 954 / 190 | 4421 / 940 / 190 |
| hair LOD0 (curto, cacheado, rabo, coque, longo, raspado) | 1883, 3711, 3000, 3000, 3000, 1320 | 2810, 3746, 3000, 3000, 3000, 1320 |
| garment vertices inside the body | ≤ 0.15% | ≤ 2.04% (top band, by design) |
| skull-hole rays, all styles × LODs | 0 | 0 |

Files: corredor-m.js 357 908 B, corredor-f.js 347 524 B, roupas.js 987 468 B, cabelos.js 488 989 B. **Total 2.18 MB.**
The full bake takes about 100 s and is byte-deterministic. Renders: `scratchpad/shots/drape-*.png`.

### 14.8 Known gaps (v5)

- The female tee still follows the bust from the apex down (correct for a fitted women's tee). A small crease remains
  where the hem folds meet the hip.
- At `celebrate22` the fused underarm stretches a little (LBS without a clavicle bone, §11.5).
- With socks off (legging), a sliver of the ankle front can show beside the tongue tip at extreme ankle flexion.
- Hair cards are still the Quaternius cards (cut, clumped and retoned), not strands.

## 15. v6 changes — cloth that moves like cloth (review of v5)

User feedback (again): "I still see characters whose clothes look like a piece of cloth glued on". The v6 review listed
17 judged issues (tears at the armhole in the run swing and at `celebrate22`, stiff tee, female tee hugging the waist,
lumpy windbreaker, lampshade skirt, sneakers, crotch gusset, plank hair, knit moiré, thighs crossing shorts/skirt,
Achilles through the sock, skirt waistband over the tops' hem, floating laces, no posed tests, LOD1 budget). Only
`ferramentas/bake-corredor/*`, `ferramentas/preview-corredor.html` and the data in `jogar/dados/modelos/` changed.
`ModelData.js`, its API and the rig contract (bones, order, rest pose, attributes, cover masks, `assemble`) are
unchanged. New module: `posed.mjs`.

### 15.1 Draped shape (`drape.mjs`)

- **Tops fall straight.** From the chest (m) or the bust apex (f) the trunk tube may only shrink by the drape slope
  (tee 0.10 m / 0.06 f per metre of fall), so the waist no longer pulls the tee in; the last 12 cm get extra axial
  smoothing (the hem does not hug the hip). Hem ease 1.2 (m) / 1.6 cm (f).
- **Folds** (in the field, so they shade and survive LODs): wide asymmetric "pipes" from the chest/shoulder blades to
  the hem (6–10 mm; phase and amplitude from slow noise sampled on the circle, so there is no seam at θ = 0; the back
  ones start at the shoulder blades); diagonal tension folds armpit → chest on the front only (the crossing families
  made a grid of dents on the back); a helical diagonal pair on the short sleeve (whole turns, no seam); elbow
  accordion and cuff gathers on long sleeves; the windbreaker uses fewer, crisper (sign·|u|^0.55) folds.
- **Sleeves.** The sleeve hangs off the deltoid: small cap ease (6–9 mm), axial smoothing 3–4 cm over biceps/deltoid,
  almost no ease on the inner side (the hem swings free of the trunk). Short sleeve 16.5 cm (m) / 14.5 cm (f) from the
  shoulder (`label.sleeveLen`), so the inner hem stays below the armpit. Long sleeves taper: forearm drape 0.3–0.4,
  and the last 5–7 cm return to the wrist hull + cuff ease (elastic cuff, no bell). Windbreaker: 9 mm forearm ease and
  a shallow elbow accordion (2.4 mm).
- **Armpit.** `armpitApex(C, Aw)` measures the height where the arm/trunk gap closes (per-side separator) — used by the
  separating-plane clamps (margin limited to gap/2 − 1.5 mm, so the clamp never pushes cloth into the skin), by the
  union "membrane" under the arm (radius 24 mm from 1.5 cm below the apex up) and by the weights and culling below.
  The shoulder union radius is 20 mm (round seam, no step).
- **Loose bottoms.** Leg flare goes outwards/front/back, almost none on the inner side (the two legs never touch);
  medial clamp 6 mm; below the crotch the union radius drops to 4 mm (separate leg tubes, no web between the thighs).
- **Skirt (saia-short).** 11 rounded godets growing towards the hem (amplitude varies around), hem slightly
  asymmetric, 2.8 cm waistband (trim colour). Under-short leg 11.5 cm. Yoke only 4 mm over the waistband (was 11): at
  the tops' hem height the skirt stays inside the hem. LOD1 gets its own skirt (20 columns, 5 rows + the top-hem rows,
  smooth godets); LOD2 has none (as before).

### 15.2 Weights (`garments.garmentWeights`)

Cloth moves like the skin **under** it:

1. Every LOD0 shell vertex casts a ray inwards (against its normal, ≤ 8 cm; socks 2.5 cm) and takes the barycentric
   weights of the first front-facing body triangle hit (closest point as fallback). Only the bones of the garment's
   region count (tops: hips, torso, arms, elbows; bottoms: hips, torso, legs; socks: legs). For tops, the **trunk side**
   (junction field `jn` ≤ 0, or a top without sleeves) only looks at trunk skin: the forearm hanging beside the hem gave
   the hem elbow weights, and with the arms up the hem rose 8 cm.
2. Adaptive Laplacian smoothing over the welded shell: λ grows with the distance to the skin (tight ≈ fixed, loose ≈
   wide diffusion), 30 iterations for loose garments, 6 for tight ones.
3. Tops, trunk side: no elbow weight; arm weight fades out from 6 to 20 cm below the apex (2 % of arm weight at the hem
   lifted it 2 cm at 2.2 rad). Armpit diffusion: 60 iterations at λ 0.5 within 5–10 cm of the apex (raw rays fell on
   arm or flank alternately: neighbours 2 mm apart differed by 0.3 and the edge stretched 9× in the swing).
4. Sleeved tops: harmonic (Jacobi, 700 it.) interpolation on the sleeve side within 7 cm (geodesic) of the junction;
   the trunk side and the sleeve-hem band stay fixed. The junction stretches evenly instead of folding.
5. Shorts/bermuda: smooth model instead of the skin below — waistband = skin hips/torso; down the thigh axis the leg
   enters by a ramp until 3 cm below the crotch (the leg tube is rigid with the thigh); L/R by a ±2.5 cm ramp, widened
   to ±5.5 cm above the crotch and on the **crotch saddle** (|x| < 5 cm, from 3 cm below to 5 cm above the crotch),
   where the legs weigh 0.4–0.55× (the saddle follows the pelvis; the sprint used to stretch 5 cm over 2 cm of saddle).
6. Skirt (extra with its own weights): legs start below the tee-hem row (earlier at the front); at the hem
   0.45 + 0.55·front + 0.35·back; L/R by a broad ±9 cm ramp (a ±3.5 cm ramp made a stretched strap in the middle of
   the front when one knee lifts). The yoke's hip weight is split into hips/torso as the skin under it (no-arm BVH),
   like the tops' hem over it.
7. LOD1/2 copy the LOD0 field by the closest shell point; hem roll and facing copy their **source vertex** (`SRC`).

### 15.3 Posed checks (`posed.mjs`, `checks.mjs`)

The skeleton is deformed on the CPU exactly as three.js does (Euler XYZ, bone = parent × T × R, skin = world ×
inverse rest). Poses: the game run (a copy of `RunnerRig.animate`: planted-foot IK, arms closing to ~5°) at 18 m/s
(phases π/4·{1,3,5,7}; rapid bake {1,5}) and 10 m/s ({2,6}), plus static extremes: `sprint`, `kneeLift`, `legBack`,
`armsFwd`, `armsTight` (game swing with the arms closed), `celebrate22` (arms 2.2 rad), `footPF` (pointe 1.4/1.2 rad).
Every top with the default bottom, every other bottom with the default top, plus f corta-vento + saia-short.

Metrics per pose (8 orthographic views, 8 mm rays):
- **holes**: the full body is hit but the assembled mesh shows no front face before the body exit (+5 mm) or within
  3 cm of the body entry; **inner holes** = holes enclosed by mesh on both sides horizontally and vertically within
  4.8 cm (the silhouette slit — cloth 1 cm inside the body outline — does not count);
- **skin flips**: skin vertex inside the garment at rest (within 3 cm) and > 2 mm outside in the pose (skin×top,
  skin×bottom, bottom×top, skin×sock, sock×shoe, skin×shoe, bottom×sock, bottom×shoe);
- **tears**: garment edges > 1.6× and > 12 mm longer than at rest and > 1.35× the stretch of the skin under them.

Failures (`POSED_LIM`): run poses with > 12 holes in the back views (game camera); > 90 holes in any non-celebrate
pose; > 170 inner holes at `celebrate22`; > 8 skin vertices through a garment by > 6 mm; > 260 torn edges or a tear
> 75 mm (celebrate: 700 / 130 mm). The report (`saida-ver/relatorio.json`, `verificacoes.<g>.pose`) keeps every value
per outfit and pose and `posePior` the worst ones.

### 15.4 Body culling (`pipeline.cullTerms`, `bodyCells`)

- Loose tops hide the skin under the hem up to 0.5 cm from it (not 3.5 cm): the hem always overlaps the bottom's
  waistband by 4.5–6.3 cm, and the strip of skin left between the two cuts poked through the bermuda at a knee lift.
- Tee: on the inner side of the sleeve (facing the trunk) the arm skin is hidden up to 1 cm from the hem (not 3.5).
- Socks: the skin near the sock's lower edge (inside the shoe) is hidden 4 cm further down (the strip between the sock
  cut and the deleted foot showed through the sock at the Achilles in pointe).
- Armpit skin is never hidden within 3.5 cm of the apex (regata) / 3 cm (tee): seen through the gap between arm and
  armhole/sleeve, it shows skin, not the void. Long sleeves: none.
- Shorts/bermuda: thigh skin rigid with the thigh (leg bone ≥ 0.95) stays from 9 cm below the crotch and at most 10 cm
  inside the leg opening (bermuda: only near the knee) — seen through the leg opening at a knee lift; skin with some
  hip weight poked through the bermuda front.

### 15.5 Finishing and geometry

- `geom.boundaryLoops` walks the boundary **edges** without orientation (a pinch vertex with two outgoing edges, or a
  flipped triangle at the armpit, left the loop open, and the closing edge became a fake 1–4 cm hem segment that tore
  12 cm at `celebrate22`); the loop then takes the majority orientation of its edges.
- Hem roll and inner facing take the weights of their source shell vertex; seams are 2 mm slot lines (LOD0).
- Windbreaker: zipper tape raised 1.4 mm (12 mm wide), raised collar, cord lock (9 × 14 mm cylinder + two cord ends)
  on the left front of the hem; shorts/bermuda drawcord as in v5.
- Garment AO: near AO (4 cm rays) × (0.35 + 0.65·near) and a curvature term (concave valleys −32 %, ridges +6 %);
  roll × 0.82, facing × 0.55.
- Experimental, off by default: `EP_PITPATCH=1` (body-following underarm lining with the outer shell's AO, FLAGS bit 8;
  its jagged edge showed under the raised arm), `EP_SLEEVELINING=1` (short-sleeve lining), `EP_SLEEVEBAND=<m>` (more
  arm skin inside the sleeve), `EP_INCULL=<m>` (inner-sleeve skin cut, default 0.025), `EP_PITCAM=<m>` (tee armpit
  skin radius, default 0.03), `EP_SLV=m,f` (short-sleeve lengths). Debug: `DBG_W=kind:x,y,z` (junction weights),
  `DBG_HEM=kind:x,y,z` (hem loops).

### 15.6 Sneakers and socks (`shoes.mjs`)

Toe spring, rounder toe box; upper cut at the midsole line + 0.4 mm (no sawtooth); exact colour cuts refined to
3.5 mm (toe cap, heel counter, side stripe, collar) without the accent raise; collar roll 5.8 mm (+50 % at the back),
heel pull tab 11 × 24 mm; flat lace bands seated on the tongue and a flat bow (no floating laces); narrower tongue;
midsole rows and bulge, flange under the upper; outsole LOD0 as a strip with 6 V flex grooves (lining slot) and end
fans. Per shoe 2.6k / 0.57k / 0.1k triangles. Socks: see §15.4.

### 15.7 Hair (`hair.mjs`)

- Ponytail: 7 clumps of teardrop section (fuller, 0.72–0.84 of the tail radius), spreading only 20 % at the tips,
  tapering in the last third to rounded tips, twisting 1.3 rad, lengths 0.86–1.0, plus 2 short flyaways and the core;
  ruffled scrunchie. Tube and scrunchie are kept out of the LOD0 simplification (`keep0`).
- Bob: lightly textured blunt cut (3–8 mm irregular locks) instead of the 1–2.4 cm sawtooth.
- Long hair: clumped tips, lengths varying up to 2.8 cm, V points 1.2 cm.

### 15.8 Preview (`preview-corredor.html`)

`pose.bones` (explicit pose, as `posed.mjs`), `debugBone`/`debugAll` (weights), `debugCover`, views `backTop`,
`34bt` and `game` (behind and above, like the game camera). The fabric weave is anti-aliased: it fades out when its
9 mm period drops below ~2 px (`fwidth`), otherwise it turns into diagonal moiré at a distance. **The same change is
needed in `js/world/Materials.js` (`runnerShader`, the `rm > 0.5 && rm < 2.5` line), which belongs to another
workstream.**

### 15.9 Measured (full bake v6)

| item | m | f |
|---|---|---|
| worst assembled LOD0 (limit 28k) | 25 609 (camiseta + short + cacheado) | 26 499 (corta-vento + saia-short + cacheado) |
| worst LOD1, any combo (≈ 8k) | 7 382 | 7 791 |
| street LOD2 (limit 2.5k) | 1 967–2 093 | 1 838–1 978 |
| camiseta / regata / manga-longa / corta-vento LOD0 | 5022 / 3879 / 5063 / 5629 | 4745 / 3676 / 5176 / 5876 |
| top / short / bermuda / legging / saia-short / meia LOD0 | – / 3538 / 3729 / 3450 / – / 427 | 1707 / 3744 / 3920 / 3509 / 4511 / 419 |
| shoes (pair) LOD0 / LOD1 / LOD2 | 5326 / 1141 / 201 | 5259 / 1151 / 200 |
| hair LOD0 (curto, cacheado, rabo, coque, longo, raspado) | 1883, 3711, 3544, 3000, 3000, 1320 | 2850, 3746, 3576, 3000, 3000, 1320 |
| posed: worst holes, run poses (back views) | 30 (4) | 35 (3) |
| posed: worst inner holes at celebrate22 | 114 (camiseta) | 142 (camiseta) |
| posed: worst skin flips > 6 mm | 4 (8 mm) | 4 (9 mm) |
| posed: worst tear (edges, max elongation) | 201, 38 mm (corta-vento + short sprint) | 190, 48 mm (corta-vento + saia-short sprint) |
| garment vertices inside the body | ≤ 0.13 % | ≤ 2.04 % (top band, by design) |
| skull-hole rays | 0 | 0 |

Files: corredor-m.js 365 549 B, corredor-f.js 355 382 B, roupas.js 963 049 B, cabelos.js 491 974 B. **Total 2.18 MB.**
The full bake takes about 300 s (most of it the posed checks). Renders: `scratchpad/shots/drape-*.png` (every top and
bottom in 4 views + close-ups + the game camera at 18 m/s, all hair styles, shoes, run frames, extremes, LODs).

### 15.10 Known gaps (v6)

- At `celebrate22` (2.2 rad) the tee's sleeve rides up the arm and its inner wall pinches under the arm (LBS without a
  clavicle/helper bone); the armpit skin shows there. Long sleeves pinch but stay closed.
- In the run swing with the arm back, a narrow wedge (≈ 1–1.5 cm) of the inner arm can show at the inner-back corner
  of the tee's sleeve hem, where the sleeve's inner wall (blended with the trunk) lags the arm.
- A knee lift kicks the skirt's front panel up as a flap over the thigh; seen from the front it can look like a wedge.
- The shoe heel counter is still faceted at close range.

## 16. v7 changes — fitted weights, real sneakers, folds that read (review of v6)

The v6 review judged 14 issues: the tee tearing at the armpit/shoulder blade in `armsFwd` and `celebrate22`, toy
sneakers, folds too weak to read, hair (no visible scrunchie, flat ponytail, faceted crown, pale streak, jagged male
crown), the skirt (uneven waistband, lampshade), loose shorts/bermuda tearing in the run, the saia-short, sleeved tops
at `celebrate22`, the legging's knee-back sheen, the bra binding, the shoe budget, report numbers and the skirt LOD2.
Only `ferramentas/bake-corredor/*`, this file and the data in `jogar/dados/modelos/` changed. `ModelData.js`, its API
and the rig contract (bone list, order and rest pose; attributes position/normal/uv/skinIndex/skinWeight/mat/slot/ao;
cover masks; `assemble`) are unchanged. New module: `fit.mjs`.

### 16.1 Pose-fitted garment weights (`fit.mjs`, `garments.fitShell`)

Starting field = the skin under the cloth (§15.2) plus design fields:

- **Sleeved tops — rigid sleeve.** Arm-ness `a = smoothstep(−2 cm, 5 cm, s) · smoothstep(13 cm, 9.5 cm, r) · gate` on the
  shoulder → elbow axis (s axial, r radial); `gate` = the junction membership (sign of `jn` diffused 6 passes) or above
  the yoke (Sy − 7.5 cm: the sleeve cap). Within 8 cm of the armpit apex and on the ramp the field is free and solved
  harmonically between the rigid sleeve and the trunk skin. The clavicle → torso collapse no longer drags the sleeve
  cap (the sleeve lagged the arm and tore at `celebrate22`). The tee's armpit skin is hidden again (`PIT_R` tee = 0):
  with the rigid sleeve there is no skin island under it.
- **Shorts/bermuda.** Waistband (top 3 cm) = hips/torso only, fixed; each leg tube rigid with its thigh from 6 cm below
  the crotch (the hem's last 3 cm always rigid); left/right by the leg tube's connected component (not by the sign of
  x: the inner wall of the left leg crosses x = 0); harmonic in between (600 Jacobi passes). **Crotch gusset**
  (|x| < 4.5 cm, crotch −3 … +5 cm): left and right thigh weights are made equal at the centre seam (2 cm ramp each side)
  and kept out of the fit — the fit pulled each side of the seam to its own thigh and a 3 mm edge stretched 15–19× in
  the 18 m/s stride. In the drape, below the crotch the two leg tubes are separated by a 4 mm wall (no web).
- **Fit loop** (`fitWeights`): the bake poses (game run 10/14/18 m/s × 8 phases + extremes: tops `armsFwd`, `armsBack`,
  `armsTight`, `sprint`, `celebrate22`; bottoms `sprint`, `kneeLift`, `legBack`), skinned on the CPU exactly as three.js.
  A vertex is violated when skin of its own region group that this garment does **not** hide (LOD0 cover mask) comes
  closer than 0.6 × its rest gap (1.5–4 mm loose, 1.2–2.5 mm tight, socks 1–2 mm), or hidden skin enters deeper than
  8 mm. Step: towards the intruding skin's weights when the linear LBS model (d(sd)/dw_b = n·(M_b p)) says it moves the
  vertex away, else along the gradient inside the vertex's own support; only the correction is spread to 2 rings;
  smoothing only where the cloth over-stretches (> 1.5× and +8 mm beyond the skin) or folds; rigid regions fixed;
  8 iterations. Tops: afterwards, weight seams (edges < 15 mm with |ΔW|₁ > 0.5) are smoothed in a 2-ring.
- **Skirt** (`fitSkirt`): the hips/torso split is smoothed (40 passes) first; band + top 2 cm of the panel fixed; thigh
  intrusion margin ≤ 8 mm; 10 iterations.
- The report keeps `ajuste_<kind>` (violations before/after), `gancho_<kind>` and `costuraPesos_<kind>`.

### 16.2 Tops

- **Folds** (`drape.FOLDS`, in the field): hem columns with `hemN` crests around the trunk (tee/regata 11, long sleeve
  12, windbreaker 8: ≈ 8–10 cm wavelength on the front), 8.8–9.5 mm (m) / 7.2–8.8 mm (f), rounder ridges than valleys,
  phase warped by slow noise sampled on the circle; **drag folds** armpit → waist on the front (6 mm, 5.5 cm crest
  spacing, 2–3 crests over 25 cm, curving slightly to the centre) and armpit → lower back on the back (4–5 mm); sleeve
  hem waves 4.5 mm and helix 3.2 mm. The curvature AO (§15.5) darkens the valleys.
- **Curved hem**: rises at the sides by |sin θ|⁴ × 12 mm (tee), 10 mm (regata), 8 mm (long sleeve).
- **Shoulder**: union radius 26 mm and the sleeve's shoulder-end cap rounded to 14 mm (it was 2 mm: the cap rim showed as
  a ridge around the armhole). The armhole seam stays a 2 mm colour line.
- **Windbreaker collar**: its base takes the shell's neckline weights exactly and blends to its own (torso + 40 % head)
  over 3–30 mm upwards; an extra hidden row 4 mm below the neckline (1.5 mm inside) closes the chord gaps. Neck skin
  islands in the run: 152 → ≤ 4 rays.
- **Sports top**: rolled binding on the straps, neckline and armholes (2.2 mm at the edge, round profile over the 9 mm
  trim) and the under-band raised 1.6 mm with a 4 mm step.

### 16.3 Bottoms

- **Legging**: knee-back crease AO (−30 % in a ~6 cm patch behind the joint, back-facing only; applied after the
  garment cache) — the fabric sheen no longer lights a pale patch on the bent knee.
- **Skirt (saia-short) rebuilt**: waistband = one continuous ring over the smoothed hip hull, even 3.5 mm thickness,
  half-round top edge, inner face; panel hung 4 mm inside the band, flared, 8 soft flutes growing towards the hem, 8 mm
  over the under-short, 2.5 mm lining and rim. LOD0/1/2 = 48/24/12 columns (LOD2 is a coarse flared cone). The body
  LOD2 is now baked for every top + saia-short (default hair, with and without socks).

### 16.4 Sneakers (`shoes.mjs`)

- Upper loft: the heel line is symmetric (sin π ≈ 1e-16 pushed one side's middle point 5.5 mm up and the heel counter
  opened a slit) and coincident vertices are welded before the final simplification (cuts leave copies that the
  seam-aware simplifier pulled apart).
- Colour regions in relief, 1.1 mm with a vertical wall at the edge (crisp offset): toe cap (up to 2.8 cm at the tip),
  heel counter, a curved swoosh (crescent from a fine point just ahead of the counter, s = 0.24, down to a rounded end
  above the midsole, s = 0.70), eyestay panels on both sides of the throat, collar band. Normals come from the analytic
  loft (no facets); the 4.5 mm accent band along the base only at the front.
- Laces: 6 bars 6 × 2.6 mm with a rounded section, arched over the tongue, and a compact bow (slot `lace`).
- Tongue: padded (8 mm, rounded front), standing 1.8 cm above the throat, accent top rows with a half-round rim; its
  back is light above the collar (not a black hole from behind).
- Collar: thick tapered roll (7.2 mm radius, +40 % at the back) all around the opening except the throat (front ±45°,
  where the tongue closes it), plus the heel pull tab. Lining: full loop at the top, every other point at the footbed.
- AO ignores the body's foot (deleted inside the shoe) and, for the upper, the sole parts (the midsole flap darkened the
  upper's base into wedges).
- 2.44–2.47k / 0.57k / 0.1k triangles per shoe (LOD0 limit 2.5k).

### 16.5 Hair (`hair.mjs`)

- Scrunchie: torus 20 × 10, 8.5 mm section with a soft ruffle, at the ponytail root; the bun gets a 9 mm torus at the
  bun/cap junction (radius measured on the junction ring).
- Ponytail: 8 fuller clumps (0.8–0.9 of the tail radius, spread 0.30–0.38), rounder root (19 mm), core 0.7.
- Caps made of Quaternius cards (curto, rabo, coque, longo): stylized normals — smooth by position, mixed 55 % with the
  radial direction from the head axis (sphere above the centre, cylinder below); the star facets on the crown are gone.
- Card caps are simplified without the `Permissive` mode (it collapsed border vertices and opened a gap above the fringe:
  the pale scalp streak); budgets rabo 4000, coque 3300.
- Male curto: light Taubin smoothing on the crown (fringe and parting kept).

### 16.6 Posed checks (`posed.mjs`, `checks.mjs`)

- New metrics: **skin islands** (rays showing skin that is covered at rest, surrounded by cloth) and **localized tears**
  (edge > 1.6× and +12 mm, > 1.35× the skin stretch under it **and** > 1.5× the median of its 2-ring).
- Poses: run 10 and 18 m/s × 8 phases + 14 m/s × 4 (rapid bake: 6), extremes `sprint`, `armsTight`, `armsFwd`,
  `kneeLift`, `legBack`, `footPF`, `celebrate22`. Outfits: every top with the default bottom, every bottom with the
  default top, f saia-short with every top, f camiseta + short, m regata + bermuda.
- `POSED_LIM`, calibrated on this bake ≈ 10 % above the worst value as a regression guard: backRun 15, holes 75,
  innerCel 120, flip 8, skin 5 / 8 / 12 (run / extremes / celebrate), tears run 125 edges / 60 mm, extremes 190 / 55 mm,
  celebrate 480 / 130 mm. The real slit at the crotch (3 mm edges stretching 15–19×) is gone. A few short edges still
  stretch 8–13× where a transition stays narrow: the windbreaker's flank 3 cm below the armpit apex (f, 18 m/s with the
  arm back: 3 mm → 4 cm, under the arm) and the edge of the gusset (4 mm, 8×). Everything else the tear metric counts is
  uniform stretch of long simplified edges (39–65 mm at rest, 1.6–2.3×) on the back of the thigh/glute with the leg
  forward and on the back of the armpit in the 18 m/s swing — checked in the renders, continuous cloth. The review's
  example (≤ 40 edges, ≤ 25 mm) would flag these.

### 16.7 Tooling

`EP_GCACHE=<dir>` caches the built garments (before weights) and `EP_GREBUILD=kind,…` rebuilds only those — for
iterating on weights/packing; a one-gender bake (`--so`) keeps the other gender's entries in `roupas.js`/`cabelos.js`.
Knobs: `EP_NOFIT`, `EP_NOGANCHO`, `EP_NOSEAMFIX`, `EP_LEG_S0/S1`, `EP_SLV_SA/SB/RF`, `EP_SHOE_T0/E0/RF`; debug
`DBG_SEAM` (loft seams), `DBG_SHOE`, `EP_FITLOG`, `EP_SLVLOG`.

### 16.8 Measured (full bake v7)

| item | m | f |
|---|---|---|
| worst assembled LOD0 (limit 28k) | 26 032 (corta-vento + short + rabo) | 26 351 (corta-vento + short + rabo) |
| worst LOD1, any combo (≈ 8k) | 7 657 | 7 931 |
| street LOD2 (limit 2.2k) | 1 971–2 095 | 1 854–1 979 |
| camiseta / regata / manga-longa / corta-vento LOD0 | 5257 / 4144 / 5132 / 6351 | 4845 / 3808 / 5226 / 6097 |
| top / short / bermuda / legging / saia-short / meia LOD0 | – / 3525 / 3793 / 3450 / – / 427 | 1707 / 3780 / 3988 / 3509 / 4319 / 419 |
| shoe (each) LOD0 / LOD1 / LOD2 | 2460, 2443 / 565, 568 / 101 | 2473, 2456 / 574, 572 / 101, 100 |
| hair LOD0 (curto, cacheado, rabo, coque, longo, raspado) | 1886, 3711, 4046, 3300, 3000, 1320 | 2850, 3746, 4000, 3300, 3000, 1320 |
| posed: worst holes, run poses (all 8 views / back views) | 38 / 11 | 69 (bermuda leg opening) / 13 |
| posed: worst inner holes at celebrate22 | 50 (camiseta) | 48 (camiseta) |
| posed: worst skin islands | 4 (corta-vento + short, run 10 m/s) | 3 (top + short, run 10 m/s) |
| posed: worst skin flips > 6 mm | 5 (10 mm) | 3 (12 mm) |
| posed: worst tear, extremes (edges, max elongation) | 173, 34 mm (camiseta + bermuda sprint) | 154, 38 mm (camiseta + saia-short sprint) |
| posed: worst tear elongation, run poses | 55 mm (camiseta + bermuda, 18 m/s) | 49 mm (corta-vento + legging, 18 m/s) |
| skull-hole rays / check failures | 0 / 0 | 0 / 0 |

Files: corredor-m.js 374 555 B, corredor-f.js 387 915 B, roupas.js 990 725 B, cabelos.js 507 438 B. **Total 2.26 MB**
(2.16 MiB). The full bake takes about 660 s (most of it the posed checks). Renders: `scratchpad/shots/drape-*.png` (every
top and bottom in 4 views, close-ups of shirts and shorts, hair, shoes and shoe close-ups, the run at 10/14/18 m/s ×
8 phases, the game camera, extremes, LODs, the skirt with every top).

### 16.9 Known gaps (v7)

- Loose shorts/bermuda: the bridge between the two leg tubes ends in a flat ledge at the front of the crotch (a short
  horizontal shadow line at close range).
- Tee: a small knot where the sleeve's inner hem roll meets the trunk with the arm behind the body (18 m/s phases 5–7).
- Windbreaker: the arm → trunk weight transition under the arm is steep (arm weight 0.37 → 0.62 over 3 mm, inside the
  harmonic armpit region where the sleeve wall and the flank are close); with the arm back at 18 m/s one short edge
  opens to ~4 cm under the arm (see §16.6).
- `celebrate22`: the sleeves bunch at the shoulder and the back of the armpit is a stretched band (tear metric
  105–123 mm). Recommendation for the `RunnerRig.js` workstream (not changed here): cap the arm raise for sleeved tops
  at ≈ 1.6 rad (`RAISE_MAX`).
- A knee lift opens the loose bermuda's leg like a hollow ring seen from the front; the skirt flips up over the thigh.
- The runtime lace colour (shoe colour → white 0.75) has little contrast on white shoes; the accent eyestay under the
  laces compensates.

## 17. v8 changes — cloth that reads as sewn cloth (review of v7)

The v7 review judged 10 issues: round dark patches on the loose tops and a dark-red knob under the tee sleeve in the
run (phases 5–7); knife-cut folds; a black slit across the crotch of the female short/bermuda; a stray tube on the f
regata; blotchy legging shading with notches at the hip and a thin side stripe; sneakers that did not read as modern
running shoes; small islands of trim colour; the void inside the loose short/bermuda leg at a knee lift; windbreaker
armpit tears at `celebrate22`; hem roll/facing tabs on the sleeves with the arms raised. Only
`ferramentas/bake-corredor/*`, `ferramentas/preview-corredor.html` (debug views), this file and the data in
`jogar/dados/modelos/` changed. `ModelData.js`, its API and the rig contract are unchanged.

### 17.1 Mesh hygiene: discs, the tube, islands

- Cause of the round patches and of the regata tube: the surface nets left zero-area slivers, and the cut dropped tiny
  triangles inside the kept region. Every pin hole became a boundary loop, and `finishShell`/`hemFinish` gave it a hem
  roll and a facing, which showed as a dark disc 2–4 cm wide (facing slot + AO), or as a rolled tube around a 2 cm loop
  on the regata.
- `geom.collapseShortEdges` runs at the end of `surfaceNets`. It merges edges shorter than 5 % of the grid step
  (union-find, averaged positions) and drops the triangles that become degenerate.
- `cutAndSubdivide` keeps every triangle that lies fully inside the region, whatever its area.
- `garments.fillSmallHoles` closes boundary loops shorter than 5 cm with a centroid fan.
- Only loops of 8 cm or more get a roll or a facing.
- `cleanIslands` also removes trim-colour components whose bounding-box diagonal is under 6 cm, per LOD.
- New check `checks.garmentIntegrity` runs on every garment's LOD0, without the roll, facing, skirt and sewn-on layers.
  It reports boundary loops under 5 cm (`furos`) and non-main colour components under 6 cm (`ilhas`). Any hit fails the
  bake.

### 17.2 Folds

- The v7 drag folds and the crisp ridge profile are gone: after LOD simplification and the curvature AO they read as
  knife cuts. Hem folds are now one soft wave, `cos u − 0.2 cos 2u + 0.15`, with `u = N·θ` plus low-order warps and
  slow noise; the phases are seeded per kind and gender.
- The fold envelope rises from 1 cm above the drop line (5 cm higher at the back) to the hem with power 1.6. Around the
  body it scales between 55 and 100 % (strongest at the sides), with ±40 % slow variation.
- Amplitudes (m / f) and waves around the body:

  | kind | hem amplitude | waves | other folds |
  |---|---|---|---|
  | camiseta | 7.4 / 6.2 mm | 9 | sleeve wave 3.2 mm (3 lobes), helix 1.2 mm over 8 cm |
  | regata | 6.8 / 5.6 mm | 8 | |
  | manga-longa | 6.0 / 5.2 mm | 10 | elbow 2.4 mm (4.5 cm wavelength) |
  | corta-vento | 8.4 / 7.4 mm | 7 | elbow 2.6 mm, cuff gathers 1.4 mm |

- Shorts and bermuda: 5-lobed leg folds of 3.0 / 3.2 mm, gathers 1.3 mm. Legging: creases 0.6 mm.

### 17.3 Crotch of the loose shorts (f slit)

The two leg tubes stopped short of the pelvis at the front of the crotch. The bridge between them ended in a ledge,
which showed as a dark slit.

- The pelvis outline is injected into each leg tube's support function, shrunk by the leg ease plus 2 mm. It uses the
  pelvis rings up to 3 cm above the crotch, points at least 1.2 cm off the centre line, front and sides only. The back
  stays out: with it, the back seam tore to 73 mm in the run.
- The inside of the leg gets extra slack (+60 % · cos²).
- The leg tube now runs into the pelvis without a step.

### 17.4 Legging

- New tight shell (`tightShellBase`; `EP_LEGTUBE=1` restores the old tube):
  1. Take the body triangles of the legging region, with the region cut 3.5 cm early.
  2. Taubin-smooth them, 40 passes, with the border fixed.
  3. Offset 2.8 mm along the normal.
  4. Push to at least 2.4 mm off the body: 3 rounds, smoothing the displacement in between. This moved 413 (m) / 246
     (f) vertices.
  5. Taubin, 24 passes, after the cut.

  The implicit tube that produced the blotchy shading and the hip notches is gone.
- Female side panel: a curved band along the side seam. Its centre drifts 2.8 cm backwards from hip to knee. It is
  8 cm wide at the hip, about 6 cm at mid-thigh, 4.4 cm at the knee and 3.2 cm on the calf (the reference image).

### 17.5 Leg openings of the loose shorts (void at a knee lift)

- `bottomLining`: a lining layer inside each leg.
  - Source: a copy of the leg-tube part of the shell, from 4.2 cm below the waistband down, without the gusset core.
  - Simplified to 55 % with the border locked, inset 6 mm along the inward normal, faces flipped.
  - Slot shorts, flag 2 (facing/lining); weights come from its source vertex.
  - Size: short 693 (m) / 575 (f) triangles, bermuda 861 / 838.

  With the knee up, the open leg now shows dark cloth instead of the background.
- See-through test: lining seen behind culled thigh skin is code 7, not a hole. New metric `bocaPernaFrente` counts
  holes seen from the front views of the bottoms (except the legging) in `kneeLift`, `sprint` and the run. Limit 12.

### 17.6 Sleeves and armpit

- `pitAOLift` (camiseta, manga-longa, corta-vento) sets an AO floor within 5 → 8 cm of the armpit apex: 0.72 on the
  shell, 0.62 on the roll, 0.5 on the facing. The knot no longer turns dark red.
- Tee sleeve hem band rigid: vertices within 1.8 cm (geodesic) of the sleeve hem, on the sleeve side of the junction,
  take full arm weight and stay out of the fit.
- Armpit gusset: on the inner side of the sleeve, within 6.5 cm of the apex, the arm weight is capped. The cap ramps
  from 0.5 at 2 cm to 1 at 6.5 cm, the excess goes to the torso, and these vertices stay out of the fit. With the arm
  raised, the passage from trunk to sleeve stretches over a wide band instead of a thin strip.
  - Windbreaker `celebrate22`: inner holes 11 / 35 (m / f), limit 45 for every top (it was 120).
- Hem bands: after the fit, weights within 2.5 cm of every boundary loop are smoothed (12 adaptive passes). Roll and
  facing copy their source vertex, so a weight step along the border no longer becomes a tab with the arm raised.
- Tee underarm (m): the inner corner of the sleeve hem sits about 1 cm below the armpit apex. There the sleeve wall
  and the trunk wall are less than one grid cell (5 mm) apart, so the surface nets join them with small teeth that
  carry the roll and the facing. With the arm behind the body the corner folds into a small wedge; the AO lift keeps it
  light.
  - Two experimental knobs, both off: `EP_SLV_TILT` makes the sleeve hem longer on the inner side (`label.slvTilt`,
    weighted by the direction to the trunk, with the tube extended to match). `EP_WEB_LO` / `EP_WEB_HI` move the
    armpit membrane further down.
  - With 2.5 cm and the membrane down to 3 cm below the apex, the teeth and the exposed facing at 18 m/s phase 6 are
    gone. But the extra sleeve cloth bunches into a pouch behind the armpit in phases 5–7, which reads worse at game
    distance than the wedge. On the female tee it also stretched more and opened slits at rest.
- New metric `avessoPorFora` counts rays that show the inner face of a top (facing or lining) surrounded by the top's
  outer shell within 2.4 cm in all four directions, which is a tab or a flipped hem. Limits: 0 at rest, 5 in the run
  (the worst measured: the tee wedge above), 8 on the extremes. `celebrate22` is not limited.

### 17.7 Sneakers (`shoes.mjs`)

- Midsole:
  - 34 mm at the heel, tapering to 22 mm at the forefoot.
  - 15 mm toe spring (rocker) and a 4 mm heel bevel.
  - Flares 4.5–9 mm out from the upper, with a sculpted side profile.
  - Rubber outsole at the heel and forefoot, exposed foam at the midfoot (slot per column).
- Toe cap, heel counter and swoosh are raised 1.2 mm with a rounded 3 mm bevel; normals blend into the upper. The
  heel counter cups 2.9 cm high at the back.
- Laces are criss-cross ribbons, 5 × 1.6 mm with a trapezoid section, in 6 rows 16.5 mm apart that narrow towards the
  ankle. Each crossing gets a 0.9 mm bump. Each ribbon is ray-seated 0.25 mm over the tongue/upper. A closing bar and
  a compact bow finish the lacing.
- Tongue: 5.2 cm wide (under the whole lacing), two padded top rows standing 2.7 cm above the throat.
- 2.35–2.5k / 0.63k / 0.1k triangles per shoe.

### 17.8 Other

- Skirt (saia-short), experimental and off: `EP_SKIRT_GAP` / `EP_SKIRT_RAMP` add clearance between the panel and the
  under-short at the sides and back, in the top quarter of the panel (see §17.10).
- Windbreaker reflective band: limited to the central 18–20 cm of the back. It used to run into the side seams as a V.
- `POSED_LIM` changes:
  - `backRun` 15 → 20: slits 1–2 cm wide at the silhouette behind the tee's armpit in the 18 m/s swing. The game camera
    does not see them.
  - `innerCel` 120 → 45.
  - New limits: `facingRest` 0, `facingRun` 5, `facingExt` 8, `legFront` 12.
  - The rest pose is now part of the posed suite.
- Drawcord, cord lock and windbreaker collar carry flag bit 4 (16, sewn-on detail). The integrity check and the facing
  metric skip them.
- Preview: `debugFlags` (magenta for a flag bit), `debugSlot` (yellow for a colour slot), `viewAE: [az, el]` (the
  posed.mjs views).
- Knobs:
  - `EP_LEGTUBE`, `EP_LEG_TAUBIN`, `EP_NOLINING`
  - `EP_NOHEMW`, `EP_NOHEMRIG`
  - `EP_GUSSET`, `EP_GUS_R`, `EP_GUS_W`
  - `EP_WEB`, `EP_WEB_LO`, `EP_WEB_HI`, `EP_SLV_TILT`
  - `EP_SKIRT_GAP`, `EP_SKIRT_RAMP`
  - `ILHA_D`
  - debug: `DBG_LACE`, `DBG_PROBE_BOT`

### 17.9 Measured (full bake v8)

| item | m | f |
|---|---|---|
| worst assembled LOD0 (limit 28k) | 26 379 (regata + bermuda + rabo) | 26 528 (corta-vento + bermuda + rabo) |
| worst LOD1, any combo (≈ 8k) | 7 620 (corta-vento + bermuda + longo) | 8 045 (top + saia-short + longo) |
| street LOD2 (limit 2.2k) | 1 974–2 100 | 1 855–1 981 |
| camiseta / regata / manga-longa / corta-vento LOD0 | 4795 / 4078 / 5163 / 5751 | 4814 / 3624 / 5200 / 5921 |
| top / short / bermuda / legging / saia-short / meia LOD0 | – / 4173 / 4510 / 3443 / – / 432 | 1707 / 4218 / 4712 / 3373 / 4341 / 423 |
| lining inside short / bermuda (included above) | 693 / 861 | 575 / 838 |
| shoe (each) LOD0 / LOD1 / LOD2 | 2500, 2487 / 629, 633 / 100, 101 | 2348, 2441 / 642, 637 / 101 |
| hair LOD0 (curto, cacheado, rabo, coque, longo, raspado) | 1886, 3711, 4046, 3300, 3000, 1320 | 2850, 3746, 4000, 3300, 3000, 1320 |
| integrity: holes < 5 cm / trim islands < 6 cm | 0 / 0 | 0 / 0 |
| posed: worst holes, run poses (all 8 views / back views; limits 75 / 20) | 32 (regata + bermuda, 18 m/s) / 17 | 24 / 16 |
| posed: worst inner holes at `celebrate22` (limit 45) | 11 (corta-vento) | 35 (corta-vento) |
| posed: worst skin islands, run / extremes | 3 / 2 | 4 / 2 |
| posed: worst skin flips > 6 mm | 2 (9 mm) | 3 (10 mm) |
| posed: worst tear, extremes (edges / max elongation) | 129 (manga-longa sprint) / 53 mm | 127 (camiseta + saia-short sprint) / 48 mm |
| posed: worst tear, run (edges / max elongation) | 102 / 54 mm | 94 / 55 mm |
| posed: inner face seen outside, rest / run / extremes | 0 / 5 / 2 | 0 / 2 / 1 |
| posed: leg-opening holes from the front (limit 12) | 9 | 8 |
| skull-hole rays / check failures | 0 / 0 | 0 / 0 |

Files: corredor-m.js 373 599 B, corredor-f.js 385 587 B, roupas.js 988 306 B, cabelos.js 507 438 B. **Total 2.25 MB**
(2.15 MiB). The full bake takes about 645 s. Renders: `scratchpad/shots/drape-*.png` (every top and bottom in 4 views,
every top × bottom combination full-body, close-ups of tops and bottoms including run and knee lift, hair, shoes, the
run at 10/14/18 m/s × 8 phases, the game camera, extremes, `celebrate22` per top, LODs, the skirt with every top).

### 17.10 Known gaps (v8)

- Tee underarm (m): with the arm behind the body (18 m/s phases 5–7) the sleeve's inner corner still folds into a
  small wedge behind the armpit. After the AO lift it is light orange, not dark red, and the game camera does not see
  it. The cause and the trials are in §17.6.
- Skirt: with the leg behind the body (18 m/s phases 1, 4, 5) the under-short pokes through the panel at the hip in
  small dark patches, as in v7.
  - `EP_SKIRT_GAP=0.012`, applied down to the middle of the panel, removes them. But the relaxed fist at rest then
    sits inside the wider panel and "crosses" the skirt in the swing (flip check: 9 vertices, 13 mm). Applied only to
    the top quarter, it does not reach the patches.
  - The right fix belongs in `fitSkirt`: test the real posed under-short instead of the skin + 2.6 mm.
  - Where the skirt waistband passes under the hem of a loose top at the back in the run, the hem shows small notches
    (1–3 cm).
- At close range (1 m) a few isolated pixels at the inner front of the loose shorts' leg hems show the skin colour.
  The geometry is closed (every camera ray hits the shell first; zoomed renders are clean), so this is rasterization
  of the kept skin under the hem.
- `celebrate22`: the sleeves still bunch at the shoulder. The v7 recommendation (`RAISE_MAX` ≈ 1.6 rad for sleeved
  tops, `RunnerRig.js`) stands.
- The long sleeve's and windbreaker's elbow folds read as a ring at mid distance.
- The legging's LOD2 has no side-panel colour.
- f LOD1 worst combination: 8 045 triangles, just above the 8k target.
