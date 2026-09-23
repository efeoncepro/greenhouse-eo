# SEO/AEO · v07 · lecho proporcionado y firma dentro de él

16 piezas: cuatro conceptos × 4:5 / 1:1 / 9:16 / 16:9. Corrección autorizada; no publicadas ni pautadas.

## Corrección

La v05 elevó firma y lecho; la v06 sólo bajó la firma y dejó demasiado primer plano. La v07 edita las cuatro fotos verticales para reducir el lecho aproximadamente al quinto inferior y recuperar área narrativa. La firma se ubica dentro de la materia ya desenfocada, con aire respecto a su transición: centro 90% en estos cuatro plates, ancho 20% del lado corto. No es un preset ni una safe zone universal. Las primeras posiciones tocaban o quedaban por encima del lecho y se corrigieron antes de esta entrega.

**Delta 2026-09-23 · firma de las stories dentro de AXIS.** Por decisión del operador, la firma de las cuatro stories sube a centro 85,65 % (caja 1619–1670 px) para quedar dentro de la zona segura de AXIS para story, cuyo borde inferior está al 87 % del alto. Se apoya en la materia desenfocada del lecho; en 01 queda en su borde superior, sobre la transición. Contraste: 10,86 · 15,46 · 5,60 (navy) · 6,53:1. Nada más cambia: las otras 12 piezas son idénticas byte a byte, y su firma sigue 19–20 px bajo el límite de la zona feed de AXIS. En OneDrive («03. Finales») se reemplazaron CMP001-05, 06 y 07. CMP001-04 («Sales tú») sigue con la firma anterior: el archivo está sólo en la nube y OneDrive no lo deja descargar ni sobrescribir («Operation timed out», 2026-09-23).

El texto mantiene su posición protegida. El CTA de ¿Sales tú? conserva contorno naranja, pero cambia tinta a blanco: naranja midió 4,22:1 sobre el nuevo muro. Las otras tres variantes conservan sus tintas. Los otros doce PNG son idénticos a v06.

## Archivos y reproducción

`piezas.json` contiene copy, jerarquía, ejes, tamaños, CTA, firma y perfiles. `brief` contiene fichas y prompts íntegros compilados por foto:prompt; `plates` contiene fotos limpias. `PROVENANCE.json` registra cada referencia y hash; `origen-v06` conserva el paquete previo y sus cadenas. `GENERACIONES.json` identifica salidas reales del motor integrado. `CONCEPTOS-Y-EMBUDO.*` y `MATRIZ-FINALES.json` conservan intención, etapa, hipótesis, destino y medición.

Desde `02. Editables`:

```sh
node preparar-repo-congelado.cjs --out /ruta/repo-congelado --repo /Users/jreye/Documents/greenhouse-eo
node recomponer.cjs --out /ruta/nueva --repo /ruta/repo-congelado
```

Desde el 2026-09-22 a las 17:20 (commit `8dcc449b3`), el repo tiene otra versión de `axis-advertising.mjs`, y `recomponer.cjs` se niega, con razón, a correr contra ella. `preparar-repo-congelado.cjs` recupera de git la versión exacta que fija `dependencias.json` y enlaza `node_modules`, que NO queda congelado. La prueba de que la reproducción es fiel está en `REPRODUCCION-VERIFICADA.json`: 16 de 16 idénticas byte a byte, con las 12 piezas sin cambios iguales a la entrega del 2026-09-22.

Ésta es la receta congelada de la misma campaña: `centerX` aún no migra al compositor consolidado sin alterar el render. No usar sus copias para una campaña nueva. Producción nueva: `pnpm foto:componer:cta <plan.json>` y `pnpm foto:cta:gate <plan.json>`, con las comprobaciones adicionales del contrato técnico §7. La auditoría que detecta los límites del gate y migración se archiva en Estrategia/Reglas. No se modificó el compositor canónico en esta revisión.

El runner recompone y firma una sola vez por render; ejecuta los validadores de contraste y bounds. Los SVG trazados se modifican desde el copy JSON y se regeneran. `dependencias.json` fija los archivos necesarios; las fuentes licenciadas se consumen desde el repo. El motor generativo no garantiza identidad pixel a pixel; el gráfico sobre plates archivados sí se puede reconstruir.

## QA y estado

`out/accesibilidad-cta.json`: mínimos locales, CTA/descriptor ≥4,5:1 y borde/controles ≥3:1. `out/qa-firma.txt`: contraste de la firma oficial ≥4,5:1. `out/safe-zones.json`: texto/CTA/cursor contra ventana conservadora y firma contra franja editorial por separado. La firma queda fuera del guardrail inferior de Reels; puede solaparse con caption/controles. No confundir PASS editorial con certificación de plataforma. El gate vigente (`pnpm foto:cta:gate --reproducir`) no reproduce este plan: `03-referencia-916` centra su bloque sobre un eje corrido (0,29), y desde el 2026-09-23 el compositor lo rechaza por el comentario del operador del 2026-09-22: «ahí se vería mejor alineada a la izquierda». La pieza no se tocó. Las máscaras son diagnósticos locales, no capturas live.

Revisar preview real de placement, URL, tracking y derechos antes de tráfico. Un PNG 9:16 no es un Video Ad de LinkedIn; usar 4:5/1:1 en el contexto de imagen del feed y verificar especificaciones al pautar. 16:9 es maestro horizontal, no 1.91:1. Los límites fotográficos genéricos del archivo v04/v06 permanecen como historia; no se promueve globalmente el catálogo 1:1.

La v06 sustituida se conserva en Pilotos. Finales contiene esta versión corregida con sus fuentes; no hay resultado de campaña medido.
