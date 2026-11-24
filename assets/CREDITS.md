# Credits and licences

## Textures (in `assets/tex/`)
All from Poly Haven (polyhaven.com), licence CC0 (public domain), downloaded 24.11.2026 as 1k JPG and
shrunk to 256-1024 px. Used inside the texture atlas and the floor (see `js/v2/mat.js`).

| File | Poly Haven asset | Author | Link |
|---|---|---|---|
| floor_color.jpg | Terrazzo Tiles (diffuse) | Amal Kumar | https://polyhaven.com/a/terrazzo_tiles |
| oak.jpg | Oak Wood Planks (diffuse) | Dimitrios Savva | https://polyhaven.com/a/oak_wood_planks |
| woodwall.jpg | Wood Plank Wall (diffuse) | Dimitrios Savva | https://polyhaven.com/a/wood_plank_wall |
| marble.jpg | Marble 01 (diffuse) | Rob Tuytel | https://polyhaven.com/a/marble_01 |
| metal.jpg | Metal Plate (diffuse) | Rob Tuytel | https://polyhaven.com/a/metal_plate |
| plaster.jpg | Painted Plaster Wall (diffuse) | Amal Kumar | https://polyhaven.com/a/painted_plaster_wall |
| fabric.jpg | Fabric Pattern 07 (colour 1) | Rob Tuytel | https://polyhaven.com/a/fabric_pattern_07 |

Signs, neon, screens, stickers and the terrazzo chips are painted in code on a canvas.

## Models
All models are built in code (`js/v2/models.js`, `js/v2/models2.js`). No model files were downloaded.

## Courier
`assets/courier.glb` is the project's own character, built and animated in Blender (`blender/`).

## Background people
`assets/crowd/person-*.glb` and `crowd-anim.glb`: the project's own characters, made from the courier body and skeleton (see `blender/crowd/` and `blender/CREDITS.md`). Body base: Blender Studio Human Base Meshes (CC0). Walk / idle / talk clips: Quaternius Universal Animation Library (CC0).

## Libraries (in `vendor/`)
- three.js r170, MIT licence, `vendor/three.LICENSE`
- GLTFLoader.js, BufferGeometryUtils.js and SkeletonUtils.js from three.js r170 examples, MIT licence, `vendor/three.LICENSE`
- postprocessing 6.36.4 (pmndrs), Zlib licence, `vendor/postprocessing.LICENSE`. Bundled from the local copy in `video-tools/three-fx`, used for bloom, tone mapping and vignette.
