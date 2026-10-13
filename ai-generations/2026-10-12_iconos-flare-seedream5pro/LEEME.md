# Cuatro iconos: Flare max y Seedream 5 Pro standard

Prueba interna solicitada el 2026-10-12: lupa, gráfico de tres barras, carpeta y escudo con check.
Objetivo: comparar acabado de porcelana mate, vidrio cian y titanio cepillado; no crear ni reemplazar glifos
canónicos de Efeonce/AXIS. No son assets adoptados por una UI ni una publicación.

Configuración compartida: 2048×2048, una imagen por icono, PNG, mismo prompt íntegro por pareja, sin referencias,
vista ortográfica tres cuartos, iluminación de estudio y fondo gris claro neutro. Flare usa OpenAI API directo,
`gpt-image-2.5-flare`, `quality: max`; Seedream usa BytePlus directo, `dola-seedream-5-0-pro-260628`,
`optimize_prompt_options.mode: standard`, watermark false. No se pide transparencia en esta prueba:
PNG no implica canal alfa. El acabado se juzga antes de matting o integración.

Los PNG de `flare/` y `seedream/` son las salidas originales. `comparison.png` es sólo una hoja de comparación
con miniaturas reducidas al mismo tamaño y rótulos determinísticos; no se retoca ni recolorea ninguna salida.
Cada prompt está en `prompts/`, la configuración en `brief.json` y `seedream-input.json`. `run.py` llama a los
CLIs canónicos de manera secuencial dentro de cada proveedor; ambas series se procesan en paralelo entre
proveedores. Sin retry automático ni edición para favorecer un brazo de la comparación.

`logs/` conserva comandos, latencias y uso devuelto por Flare; `receipts/<icono>/receipt.json`, request ID,
consumo y estimación de BytePlus sin URLs firmadas. `manifest.json` contiene hashes, verificación PNG/tamaño/alfa
y costos. Una salida por icono/motor no prueba consistencia en series ni una superioridad universal.

**Resultado:** ocho solicitudes completadas, ocho PNG nativos 2048×2048, opacos. Flare mantiene mejor
porcelana mate y detalle fino; Pro resuelve los cuatro conceptos, pero la porcelana pasa a brillante en
gráfico/carpeta/escudo. Costos estimados totales: Flare US$1,720140, Pro US$0,324000, no factura.
[Evaluación documentada](../../docs/audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md).

- [Hoja comparativa](comparison.png): Flare arriba, Pro abajo, mismo orden.
- [ZIP con ocho originales y manifiesto](8-iconos-originales-png.zip).
- Flare: [lupa](flare/01-lupa.png), [gráfico](flare/02-grafico.png), [carpeta](flare/03-carpeta.png), [escudo](flare/04-escudo.png).
- Pro: [lupa](seedream/01-lupa.png), [gráfico](seedream/02-grafico.png), [carpeta](seedream/03-carpeta.png), [escudo](seedream/04-escudo.png).

```bash
python3 ai-generations/2026-10-12_iconos-flare-seedream5pro/run.py flare
python3 ai-generations/2026-10-12_iconos-flare-seedream5pro/run.py seedream
node ai-generations/2026-10-12_iconos-flare-seedream5pro/contact-sheet.mjs
```

Los dos primeros comandos generan de nuevo y cobran: son receta, no recuperación de un job anterior.
