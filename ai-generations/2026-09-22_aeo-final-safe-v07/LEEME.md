# SEO/AEO · v07 · lecho proporcionado y firma dentro de él

16 piezas: cuatro conceptos × 4:5 / 1:1 / 9:16 / 16:9. Corrección autorizada; no publicadas ni pautadas.

## Corrección

La v05 elevó firma y lecho; la v06 sólo bajó la firma y dejó demasiado primer plano. La v07 edita las cuatro fotos verticales para reducir el lecho aproximadamente al quinto inferior y recuperar área narrativa. La firma se ubica dentro de la materia ya desenfocada, con aire respecto a su transición: centro 90% en estos cuatro plates, ancho 20% del lado corto. No es un preset ni una safe zone universal. Las primeras posiciones tocaban o quedaban por encima del lecho y se corrigieron antes de esta entrega.

El texto mantiene su posición protegida. El CTA de ¿Sales tú? conserva contorno naranja, pero cambia tinta a blanco: naranja midió 4,22:1 sobre el nuevo muro. Las otras tres variantes conservan sus tintas. Los otros doce PNG son idénticos a v06.

## Archivos y reproducción

`piezas.json` contiene copy, jerarquía, ejes, tamaños, CTA, firma y perfiles. `brief` contiene fichas y prompts íntegros compilados por foto:prompt; `plates` contiene fotos limpias. `PROVENANCE.json` registra cada referencia y hash; `origen-v06` conserva el paquete previo y sus cadenas. `GENERACIONES.json` identifica salidas reales del motor integrado. `CONCEPTOS-Y-EMBUDO.*` y `MATRIZ-FINALES.json` conservan intención, etapa, hipótesis, destino y medición.

Desde `02. Editables`:

```sh
node recomponer.cjs --out /ruta/nueva --repo /Users/jreye/Documents/greenhouse-eo
```

Ésta es la receta congelada de la misma campaña: `centerX` aún no migra al compositor consolidado sin alterar el render. No usar sus copias para una campaña nueva. Producción nueva: `pnpm foto:componer:cta <plan.json>` y `pnpm foto:cta:gate <plan.json>`, con las comprobaciones adicionales del contrato técnico §7. La auditoría que detecta los límites del gate y migración se archiva en Estrategia/Reglas. No se modificó el compositor canónico en esta revisión.

El runner recompone y firma una sola vez por render; ejecuta los validadores de contraste y bounds. Los SVG trazados se modifican desde el copy JSON y se regeneran. `dependencias.json` fija los archivos necesarios; las fuentes licenciadas se consumen desde el repo. El motor generativo no garantiza identidad pixel a pixel; el gráfico sobre plates archivados sí se puede reconstruir.

## QA y estado

`out/accesibilidad-cta.json`: mínimos locales, CTA/descriptor ≥4,5:1 y borde/controles ≥3:1. `out/qa-firma.txt`: contraste de la firma oficial ≥4,5:1. `out/safe-zones.json`: texto/CTA/cursor contra ventana conservadora y firma contra franja editorial por separado. La firma queda fuera del guardrail inferior de Reels; puede solaparse con caption/controles. No confundir PASS editorial con certificación de plataforma. Las máscaras son diagnósticos locales, no capturas live.

Revisar preview real de placement, URL, tracking y derechos antes de tráfico. Un PNG 9:16 no es un Video Ad de LinkedIn; usar 4:5/1:1 en el contexto de imagen del feed y verificar especificaciones al pautar. 16:9 es maestro horizontal, no 1.91:1. Los límites fotográficos genéricos del archivo v04/v06 permanecen como historia; no se promueve globalmente el catálogo 1:1.

La v06 sustituida se conserva en Pilotos. Finales contiene esta versión corregida con sus fuentes; no hay resultado de campaña medido.
