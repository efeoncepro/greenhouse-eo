# EPIC-050 — Creative Workbench: producción de campañas a escala

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño — tasks hijas registradas 2026-10-02; sin implementación`
- Rank: `TBD`
- Domain: `cross-domain` (creative production / tooling)
- Owner: `unassigned`
- Branch: `epic/EPIC-050-creative-workbench-campaign-scale-production` (documental en Greenhouse; la implementación vive en `efeoncepro/creative-workbench`)
- GitHub Issue: `none`

## Summary

Convierte el Creative Workbench, que hoy compone bien una pieza por vez, en una línea de producción de
despliegues de campaña completos. Los despliegues de SKY son gigantescos: muchas ofertas, seis mercados
con monedas distintas y 126 formatos nativos. La meta es que un despliegue salga de un brief de campaña,
no de cientos de jobs escritos a mano, y que la revisión humana se concentre en las excepciones.

## Why This Epic Exists

La revisión v6 → v7 de la prueba de 24 adaptaciones (2026-10-01) mostró dónde se pierde el tiempo.
El render es rápido (≈6 s por pieza, determinista, sin proveedores), pero lo que lo rodea no escala:

- **Autoría:** cada `workbench.design-job.v1` declara el copy campo por campo con IDs de nodo Figma; el
  catálogo SKY tiene 1.196 campos en 126 formatos y 175 siguen clasificados como `other-copy`.
- **Volumen:** `marca:lote` admite como máximo 126 jobs por lote y compone en secuencia
  (`docs/manual/design-batches.md`: "no es todavía una cola distribuida").
- **Fotografía:** sólo tres formatos admiten una foto nueva (`workbench-sky-photo-frame.md`); las pruebas
  usan la foto histórica de referencia.
- **Fidelidad:** las reglas se fijaron a mano por pin. 54 de 62 pies legales quedaron con una alineación
  distinta a la de su fuente Figma hasta la corrección v7; cada KV nuevo repetiría ese riesgo.
- **Revisión:** la v7 se revisó pieza por pieza a ojo. Con miles de piezas eso no escala, y un cambio del
  motor no tiene hoy un antes/después automático que diga qué piezas cambiaron.

No cabe en una task: cruza autoría, motor, fotografía, ejecución y entrega, con dependencias entre sí.

## Outcome

- Un despliegue SKY completo (ofertas × mercados × formatos) se produce desde un brief de campaña con
  datos de tarifa importados, sin escribir jobs campo por campo.
- Antes de componer se sabe qué copy no cabe en qué formato, con la variante corta a usar.
- Las reglas de composición salen de la fuente Figma sellada por defecto; un cambio del motor produce un
  informe automático de piezas cambiadas e idénticas, y la revisión humana se limita a excepciones.
- Cualquier destino con foto admitida se compone en todos los formatos que la necesitan, con encuadre
  verificado.
- La salida llega empaquetada por canal, archivada con rutas y SHA, y sin copiar binarios licenciados.

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- Workbench: `docs/architecture/workbench-native-harness.md`, `workbench-design-batches.md`,
  `workbench-kv-zones.md`, `workbench-composition-recipes.md`, `workbench-sky-designer-content-rules.md`,
  `workbench-sky-destination-content-flow.md`, `workbench-sky-photo-frame.md`, `workbench-cloud-boundary.md`

Invariantes del programa: una marca por corrida y sin marca por defecto; los jobs llevan contenido, nunca
geometría; el motor no achica texto (lo que no cabe se rechaza o usa una variante declarada); corridas y
outputs inmutables; ningún gasto de proveedor sin la autorización vigente de TASK-1947; ningún binario
licenciado (Metric) sale del equipo sin TASK-1946.

## Child Tasks

Orden contractual: `TASK-1955 → TASK-1953 → TASK-1954`; `TASK-1956` puede correr en paralelo con
`TASK-1953` una vez cerrado el Slice 1 de `TASK-1955`.

- `TASK-1955` — Fidelidad derivada de la fuente y regresión visual del motor: reglas desde el Figma
  sellado por defecto, clasificación de `other-copy`, suite canónica con diff automático en CI y clases de
  revisión por excepción. Es la red de seguridad de todo lo demás.
- `TASK-1953` — Plan de campaña a escala: brief semántico que se expande en oferta × mercado × formato,
  perfiles de mercado (moneda, legal, idioma), importación de tarifas y preflight de ajuste.
- `TASK-1954` — Ejecución a escala y entrega: lotes por campaña sin tope de 126, ejecución paralela,
  caché por contenido, paquetes por canal y archivo gobernado.
- `TASK-1956` — Biblioteca de fotografía por destino: fotos admitidas con punto focal y recorte por
  proporción, habilitadas en todos los formatos que llevan foto.

## Existing Related Work

- `TASK-1945` (in-progress) — foundation multimarca; dueña de la segunda marca y del onboarding.
- `TASK-1946` (in-progress) — paquetes y licencias; dueña de la distribución de Metric.
- `TASK-1947` (in-progress) — entrada IA, broker y presupuesto; dueña de cualquier generación pagada.
- `TASK-1952` (to-do) — identidad Efeonce ID del Workbench.
- Corrección v7: auditoría Workbench `docs/audits/sky-layout-correction-v7-2026-10-01.md`;
  estado en `docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md`.

## Exit Criteria

- [ ] Un despliegue de prueba con al menos 3 ofertas × 3 mercados × todos los formatos de una familia se
      produce desde un brief de campaña, con preflight, ejecución y paquete por canal, sin editar jobs.
- [ ] Un cambio del motor genera en CI el informe de piezas cambiadas/idénticas sobre la suite canónica y
      bloquea el merge si cambia una pieza no declarada.
- [ ] Las alineaciones y espaciados de un KV nuevo se derivan de su fuente sin reglas manuales por pin, y
      las excepciones quedan registradas con razón.
- [ ] Al menos un destino con foto nueva se compone en todos los formatos de su familia con encuadre
      verificado.
- [ ] Throughput, porcentaje de piezas aprobadas por clase y días "KV nuevo → receta productiva" quedan
      medidos sobre un despliegue real.

## Non-goals

- Generación IA de imágenes o video (gobernada por TASK-1947 y su presupuesto).
- Motion/video de las piezas (stories/reels animados): candidato a epic posterior.
- Superficie de revisión nueva en el Lab: follow-up que consume los datos de TASK-1955/1954.
- Publicación o pauta en plataformas de medios; la entrega termina en el paquete por canal.
- Segunda marca (Berel) y onboarding del equipo (TASK-1945).
