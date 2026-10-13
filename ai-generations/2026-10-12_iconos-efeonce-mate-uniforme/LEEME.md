# Iconos Efeonce · 3D mate uniforme

Cuatro conceptos nuevos respecto del catálogo consultado el 12-10-2026: binoculares, metrónomo,
sello de aprobación e imán. Bases planas aprobadas por el operador. Flare seleccionado por el operador para esta ronda; catálogo sin publicar.

- **`alpha/flare/` y `alpha/seedream-smooth-clean/`: PNG transparentes para probar en composiciones.**
  La transparencia se deriva con el color-key canónico de AXIS. No es alfa nativo del proveedor.
- `flare/`: cuatro originales Flare max, una pasada.
- `seedream/`: cuatro originales Seedream 5 Pro standard, primera pasada.
- `seedream-smooth/`: cuatro ediciones de superficie Seedream, segunda pasada.
- `comparison-first-pass.png`: comparación controlada con los mismos prompts/referencias.
- `comparison.png`: Flare una pasada / Seedream dos pasadas, rotulado.
- `transparencia-flare.png` y `transparencia-seedream-smooth-clean.png`: alfa sobre papel para inspección.
- `flat/selected/`: vectores JSON candidatos y aprobación. `flat/control/`: SVG de control medidos.
- `references/`: una referencia plana por icono. `prompts/`: recetas exactas por etapa.
- `manifest.json`: dimensiones reales, bytes, hashes, usage, costos estimados y transparencia.
- `receipts/`, `receipts-smooth/`, `logs/`: evidencia de las solicitudes y QA, sin credenciales.

Los originales son PNG opacos 2048×2048. Los PNG RGBA derivados conservan la resolución del archivo
fuente; no se ejecutó el comando de publicación que comprime a 1024. El azul de las láminas es presentación;
los archivos de `alpha/` pueden colocarse sobre otros fondos.

Flare obtuvo un mate visualmente más liso, suave y uniforme entre las cuatro formas. Seedream primera
pasada conserva microtextura y extrusión más fuerte; la edición adicional reduce el grano. El metrónomo
abre dos ventanas en vez del calado único plano, y aparecen uniones de componentes en ambos motores.
Por ello estas salidas no son una aprobación de arte ni reemplazan el catálogo de marca.

Costos estimados USD: preparación plana común 0,438502; cuatro volúmenes Flare 1,751348;
cuatro Seedream iniciales 0,324; cuatro ajustes Seedream 0,324. Total de esta prueba: 2,837850.
Seedream final de dos pasadas: 0,162 por icono; Flare promedio 0,437837. No son facturas liquidadas.

El adaptador `keycheck-candidates.mjs` sólo permite key/check con las bases aprobadas de esta prueba.
No modifica AXIS ni publica. Avisos completos en los logs de cada motor; revisión visual y eventual
adopción del catálogo requieren decisión del operador.

Auditoría: `docs/audits/ai-tooling/2026-10-12-efeonce-iconos-mate-uniforme.md` en Greenhouse.

Seedream: el color-key inicial retuvo sombras y ruido azul. La entrega limpia añade un filtro de alfa
por cromaticidad del original cálido sobre navy (R−B <=2 transparente; fundido hasta >=12). RGB sin cambio;
`alpha/seedream-smooth/` conserva el derivado canónico previo. Parámetros y conteos en `blue-spill-cleanup.json`.

## Selección del operador

12-10-2026: «Bien, quedemonos para esta ronda con los de flare, pero ya sabemos lo que puede hacer cada uno».
Se conservan las cuatro versiones Flare transparentes como selección de esta ronda. Seedream y la comparación
quedan como evidencia. Esta elección no cambia el modelo por defecto global ni publica el catálogo; los
avisos de geometría documentados siguen disponibles. `selection.json` fija los cuatro hashes elegidos.
