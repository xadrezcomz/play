# ESPEC-corredor — bake spec: Quaternius UBC → ENDLESS PACE runner

Status: **spec v3 (2026-10-06) — implemented**. §13 lists the v3 changes (review vq1); where a v3 change overrides an
earlier section, §13 wins. Older text marked **[v2]** still explains the v2 reasoning.
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
