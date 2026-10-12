# Cuatro iconos clay 3D: Flare max y Seedream 5 Pro standard

Prueba interna solicitada el 2026-10-12, continuación de la comparación de vidrio/porcelana/metal.
Mismos cuatro conceptos: lupa, gráfico de tres barras, carpeta con una hoja y escudo con check.
Nuevas generaciones independientes; no se editaron ni sustituyeron los originales de la prueba anterior.
No son glifos canónicos de Efeonce/AXIS ni assets adoptados por una UI.

Material exclusivo: plastilina mate blanca cálida y cian pastel, volumen redondeado e inflado, superficie
táctil fina y discretas marcas de modelado; sin vidrio, metal, porcelana ni reflejos especulares. La lupa
debe conservar un centro vacío, la carpeta una hoja y el gráfico exactamente tres barras ascendentes.
Mismos prompts por pareja, sin referencias; fondo neutro opaco para evaluar material antes de recorte.

Ambos PNG 2048×2048 solicitados. OpenAI directo: `gpt-image-2.5-flare`, max; BytePlus directo:
`dola-seedream-5-0-pro-260628`, standard, watermark false. `brief.json`, `prompts/` y `seedream-input.json`
contienen la receta. `run.py` ejecuta CLIs canónicos, cuatro solicitudes secuenciales por proveedor,
ambas series en paralelo; sin retry automático. Ejecutarlo otra vez genera y cobra de nuevo.

Los originales se conservan en `flare/` y `seedream/`. `comparison.png` sólo es una hoja con miniaturas
al mismo tamaño y rótulos, sin retocar ni recolorear. `manifest.json` contiene hashes, uso, costos y
readback de PNG/dimensiones/alfa; `logs/` y `receipts/` preservan evidencia sin claves ni URLs firmadas.
No se pide alfa en esta prueba: PNG no significa fondo transparente.

[Prueba y evaluación conjunta](../../docs/audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md).
[Prueba anterior](../2026-10-12_iconos-flare-seedream5pro/LEEME.md).

**Resultado:** ocho solicitudes exitosas sin retry, ocho PNG nativos 2048² opacos. Ambos mantienen el mate.
Flare tiene formas más infladas y regulares; Pro muestra trazas manuales más visibles y añade una pequeña
placa en la pestaña de la carpeta. Costos estimados: Flare US$1,720970; Pro US$0,324000, no factura.

- [Comparación](comparison.png): Flare arriba y Pro abajo.
- [ZIP de ocho originales, manifiesto y prompts](8-iconos-clay-originales-png.zip).
- Flare: [lupa](flare/01-lupa.png), [gráfico](flare/02-grafico.png), [carpeta](flare/03-carpeta.png), [escudo](flare/04-escudo.png).
- Pro: [lupa](seedream/01-lupa.png), [gráfico](seedream/02-grafico.png), [carpeta](seedream/03-carpeta.png), [escudo](seedream/04-escudo.png).

```bash
node ai-generations/2026-10-12_iconos-clay-flare-seedream5pro/verify.mjs
node ai-generations/2026-10-12_iconos-clay-flare-seedream5pro/contact-sheet.mjs
```
