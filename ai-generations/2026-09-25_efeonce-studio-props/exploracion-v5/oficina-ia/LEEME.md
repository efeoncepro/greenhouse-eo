# Oficina en foto (lámina 4.9) — 2026-09-25/26

Las nueve aplicaciones de oficina de la lámina 4.3 fotografiadas con IA. Método del merch: el arte plano (`arte/`)
es la referencia exacta; GPT Image 2.5 Sunburst `xhigh` sólo pone espacio, material y luz, en registro documental.

- `items.mjs` — genera las 9 tomas (`out/`). `node items.mjs [id,id]`.
- `edits.mjs` — corrige por edición (`out-v2/`): pasillo y muro de voz (el modelo pintó las notas de la lámina),
  sala (espacio antes del punto) y puesto (logo del carnet repuesto con `arte/logo-oficial.png`).
- `final/` — el set aprobado: recepcion, pizarra, estado-sala, cocina y cabinas desde `out/`; pasillo, muro-voz,
  sala y puesto desde `out-v2/`.

Lección: el arte de referencia no debe llevar leyendas de lámina; el modelo las imprime en el muro.
Publicado en el canvas (4.9, v60), en AXIS (`#oficina-foto`, commit 4aa9dd0) y en el PDF (hoja 12).
