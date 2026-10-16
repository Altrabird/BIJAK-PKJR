# Kredit aset

These 3D models in `assets/models/` come from [Poly Pizza](https://poly.pizza). The CC0 ones need no credit (given with thanks);
the **CC-BY 3.0** ones are used under https://creativecommons.org/licenses/by/3.0/ and credited here:

| File | Model | Author | Licence | Source |
|---|---|---|---|---|
| car_hatchback.glb | Car Hatchback | Kay Lousberg | CC0 | https://poly.pizza/m/BG0KAhmGDt |
| car_wagon.glb | Stationwagon | Kay Lousberg | CC0 | https://poly.pizza/m/vTTTjDoxhV |
| car_taxi.glb | Taxi | Kay Lousberg | CC0 | https://poly.pizza/m/u5PhZQ35XG |
| car_police.glb | Police Car | Kay Lousberg | CC0 | https://poly.pizza/m/Uj7i2vlmir |
| house_a.glb | House | Kenney | CC0 | https://poly.pizza/m/7VSVwAg2T3 |
| house_b.glb | Two story house | Kenney | CC0 | https://poly.pizza/m/htvFgnVP4d |
| house_c.glb | Two story house | Kenney | CC0 | https://poly.pizza/m/sGgL4Nt7I7 |
| shop.glb | Small Building | Kenney | CC0 | https://poly.pizza/m/gyjF60t7CG |
| tower.glb | Large Building | Kenney | CC0 | https://poly.pizza/m/3IhrYZp6tP |
| palm.glb | Palm Tree | Quaternius | CC0 | https://poly.pizza/m/A6cKJYFsIb |
| tree.glb | Tree | Quaternius | CC0 | https://poly.pizza/m/i4QMw4L64D |
| streetlight.glb | Streetlight | Kay Lousberg | CC0 | https://poly.pizza/m/vPFSLYh6sg |
| bicycle.glb | Bicycle | jeremy | CC-BY 3.0 | https://poly.pizza/m/axc03j3xKfz |
| kart.glb | Go kart | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/3hkutVs0AAV |
| motorcycle.glb | Vespa | Jasmine Roberts | CC-BY 3.0 | https://poly.pizza/m/blGLclvvdEM |
| bus.glb | Schoolbus | Poly by Google | CC-BY 3.0 | https://poly.pizza/m/8xacyNqdJ3t |

**People** (`person_kid_m`, `person_kid_f`, `person_man`, `person_woman`) were made with
[MakeHuman / MPFB 2](https://static.makehumancommunity.org/mpfb.html) and its CC0 `makehuman_system_assets` pack
(base mesh, young Asian skins, hair, eyebrows, eyes, `male_casualsuit03/06`, `shoes01/02`), so the models are CC0.
Their Idle/Walk/Run animations are baked from Quaternius' CC0 "Man" (https://poly.pizza/m/HMnuH5geEG, kept as
`tools/quaternius_man.glb`). `tools/build_people.py` rebuilds them in Blender. The game tints them into school
uniforms, polis, pengawas and orang awam. Tudung, caps, helmets and school bags are generated in code.

UI icons in `assets/icons/` are **Fluent Emoji 3D** © Microsoft, MIT licence
(https://github.com/microsoft/fluentui-emoji), taken from the `@lobehub/fluent-emoji-3d` package.
Fetch any new ones with `node tools/fetch_icons.mjs`. The line icons in `js/icons.js` are from Lucide (ISC licence).

Everything else (school, surau, road signs, traffic lights, roads, the BAS SEKOLAH signs and vehicle lights)
is generated in code for this project.
Three.js © three.js authors (MIT), vendored in `vendor/three/`.
Voices: Microsoft Edge neural TTS, ms-MY (Yasmin, Osman), pre-rendered.
