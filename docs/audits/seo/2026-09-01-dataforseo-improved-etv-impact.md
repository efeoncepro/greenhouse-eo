# Auditoría DataForSEO Improved ETV — impacto en Greenhouse SEO

- Fecha: 2026-09-01
- Alcance: anuncio de fórmula ETV, siete consumers Labs, persistencia, readers, API/MCP, reporting y transición
- Tipo: discovery/documentación; sin cambio de código, schema, flags, scheduler, proveedor ni runtime
- Evidencia externa: aviso de cuenta DataForSEO recibido en Outlook + documentación pública oficial consultada
- Evidencia interna: código, migraciones, arquitectura, tests y ledger declarativo del checkout compartido
- Estado: contrato documentado; cutover no autorizado

## 1. Conclusión ejecutiva

DataForSEO anunció una nueva metodología para el campo existente `etv`. El cambio no rompe el shape: cambia la
semántica detrás del mismo número. Greenhouse no envía `use_improved_etv`, no persiste versión de fórmula y sus
claves append-only no permiten guardar legacy e improved para el mismo sujeto/mercado/fecha.

El riesgo P0 es una discontinuidad silenciosa: después del cutover anunciado para 2026-11-01, una captura puede
seguir pasando parsing/tests y entrar a la trayectoria como si fuera performance orgánica. El mismo peligro
existe hacia atrás si Historical Rank Overview recalcula períodos pasados.

Siete integraciones consumen ETV directamente. La foto de dominio, la visibilidad por sujeto y el diagnóstico de
prospectos tienen caminos declarados activos/accesibles; backfill, bulk, relevant pages y subdomains son runners o
primitives manuales sin caller productivo adicional observado. Esta auditoría no hizo readback live de flags ni
llamadas pagadas: el estado de activación viene del ledger/código vigente y debe reverificarse al ejecutar.

## 2. Qué confirmó DataForSEO y qué sigue abierto

### Confirmado por el aviso de cuenta

- ETV improved usa CTR dinámico según layout/features exactas de la SERP e intención principal.
- Normaliza el volumen de búsqueda con datasets clickstream multi-fuente.
- Busca acercarse mejor a tráfico observado en GSC, especialmente con AIO, snippets, local packs y zero-click.
- Early access: `use_improved_etv: true`.
- Legacy continúa por default hasta 2026-11-01; improved pasa a default después según el aviso.

### Confirmado por documentación pública vigente

- El modelo legacy se documenta como `search volume × CTR coefficient` por `rank_group`.
- `include_clickstream_data` es otro flag, default `false`; devuelve `clickstream_etv` y campos adicionales y
  duplica el precio del request.
- `estimated_paid_traffic_cost` se documenta como ETV orgánico × CPC pagado.
- Historical Rank Overview ofrece ETV desde 2020-10; los campos clickstream históricos, desde 2024-05.

Fuentes:

- https://dataforseo.com/help-center/how-is-etv-calculated
- https://dataforseo.com/help-center/whats-clickstream-estimated-traffic-volume-and-how-is-it-calculated
- https://dataforseo.com/help-center/how-is-traffic-cost-calculated
- https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/
- https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/

### Brecha contractual pública al 2026-09-01

Las páginas revisadas no contienen `use_improved_etv` y todavía explican la fórmula legacy. No existe una matriz
pública confirmada de endpoints/objetos, pricing, retroactividad, convivencia con `include_clickstream_data`,
hora/zona de corte o disponibilidad de legacy después del 1 de noviembre.

Preguntas que deben responder DataForSEO o una prueba acotada antes de implementar:

1. ¿Qué endpoints aceptan el flag y qué hacen si no lo soportan: error o ignore silencioso?
2. ¿Cambia sólo `organic.etv` o también paid, featured snippet, local pack, AIO reference y derivados?
3. ¿Tiene recargo y cómo factura junto a `include_clickstream_data`?
4. ¿Los históricos se recalculan al leerlos o el cambio aplica sólo hacia adelante?
5. ¿Una fecha histórica puede devolver valores distintos según flag o fecha de consulta?
6. ¿`estimated_paid_traffic_cost` se actualiza sincrónicamente con el nuevo ETV?
7. ¿`use_improved_etv: false` conserva legacy después del cutover y por cuánto tiempo?
8. ¿Cuál es la hora/zona exacta y existe rollback?

El borrador completo de diez preguntas, con destinatario y fallback de soporte, quedó en
`docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`. No fue enviado.

## 3. Inventario de impacto Greenhouse

| #   | Consumer                         | Campos/derivados                | Estado observado               | Impacto                                                            |
| --- | -------------------------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| 1   | `domain_rank_overview`           | ETV organic/paid + traffic cost | cron mensual declarado         | Valor y trayectoria cambian; parser no detecta metodología         |
| 2   | `historical_rank_overview`       | ETV/traffic cost por mes        | runner manual                  | Backfill legacy bloquea rebaseline; retroactividad desconocida     |
| 3   | `bulk_traffic_estimation`        | ETV organic/paid                | primitive sin caller adicional | Screening y comparaciones de mercado cambian                       |
| 4   | `ranked_keywords` URL visibility | ETV agregado + ETV por keyword  | cron mensual declarado         | Snapshot, top keywords y comparaciones target/competidor cambian   |
| 5   | `relevant_pages`                 | ETV por página                  | primitive on-demand            | Cambia valor y membresía top-N porque ordena provider-side por ETV |
| 6   | `subdomains`                     | ETV por subdominio              | primitive on-demand            | Mismo doble efecto sobre concentración                             |
| 7   | `ranked_keywords` prospect       | suma ETV de muestra orgánica    | on-demand declarado activo     | Cambia magnitud comercial `estimated_monthly_traffic`              |

### 3.1 Foto de dominio

- Parser: `src/lib/growth/seo/domain-overview/capture.ts:59-124`.
- Request sin fórmula: `capture.ts:437-451`.
- Persistencia: `domain-overview/persist.ts:157-205`.
- Reader/serie: `domain-overview/reader.ts:117-224`.
- Flag/scheduler declarativo: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md:140`.

`estimated_paid_traffic_cost` llega calculado por el proveedor; Greenhouse no lo recompone. Si DataForSEO
conserva su identidad ETV × CPC, cambia junto a ETV y requiere la misma versión metodológica.

### 3.2 Histórico y bulk

- Historical request: `domain-overview/history-backfill.ts:510-526`.
- Meses existentes/pre-check: `history-backfill.ts:264-287`.
- Bulk request: `domain-overview/traffic-estimation.ts:247-263`.
- Bulk parser/outcome: `traffic-estimation.ts:37-91,303-332`.

El backfill considera sembrado un mes por endpoint/fecha, no por fórmula. Un histórico legacy no puede
recomprarse como improved bajo el contrato actual. `correlate: true` relaciona datasets del proveedor, pero no
versiona metodología ni garantiza continuidad estadística.

### 3.3 Visibilidad por dominio/URL/subfolder

- Shape agregado/item: `src/lib/growth/seo/url-visibility/capture.ts:92-118`.
- Proyección ETV/top-N: `capture.ts:136-199`.
- Request sin fórmula: `capture.ts:414-442`.
- Persistencia: `url-visibility/persist.ts:126-174`.
- Flag/scheduler declarativo: `FEATURE_FLAG_STATE_LEDGER.md:139`.

`ranked_keywords` compra detalle ordenado por search volume; la fórmula cambia el ETV de los ítems, pero no su
membresía por ese `order_by` particular. El agregado `metrics` sí cambia.

### 3.4 Concentración de páginas/subdominios

- Request compartido: `url-visibility/relevant-pages.ts:214-229`.
- Exports: `relevant-pages.ts:344-370`.
- Reader, orden y recorte: `url-visibility/reader.ts:281-345`.

Estas primitives piden un límite ordenado por `metrics.organic.etv DESC`. La fórmula puede cambiar tanto el ETV
como qué páginas/subdominios son devueltos y persistidos. El reader vuelve a ordenar por ETV: hay efecto doble.

### 3.5 Diagnóstico SEO de prospectos

- Request: `src/lib/growth/seo/prospect/collect.ts:131-144`.
- Extracción/suma: `prospect/derive.ts:29-39,60-108`.
- Persistencia: `prospect/store.ts:175-203`.
- Flag declarativo: `FEATURE_FLAG_STATE_LEDGER.md:137`.

El hecho `estimated_monthly_traffic` suma hasta 1.000 filas orgánicas. El diagnóstico declara que la muestra puede
estar capped para conteos, pero el hecho de tráfico conserva `basis: etv_sum_organic` sin metodología ni señal
explícita de truncamiento. Formula versioning debe resolver ambos defectos, no sólo agregar el flag.

## 4. Persistencia: por qué el shadow no cabe hoy

### `seo_domain_overview_snapshots`

Clave única:

```text
(normalized_domain, location_code, language_code, capture_date)
```

Fuente: `migrations/20260827190156045_task-1775-seo-domain-overview.sql:35-121`.

No incluye fórmula, source endpoint ni instante. `ON CONFLICT DO NOTHING` descartaría uno de los modelos y el
trigger impide `UPDATE/DELETE`. El pre-check considera fresca una fila legacy aunque cambie la policy.

### `seo_url_visibility_snapshots`

Clave única:

```text
(subject_kind, normalized_subject, location_code, language_code, capture_date)
```

Fuente: `migrations/20260827194219636_task-1776-seo-url-visibility.sql:46-99`.

Tampoco versiona fórmula en snapshot, top keywords o clave.

### Prospect diagnostic/facts

La idempotencia diaria no distingue fórmula (`20260827185848695_task-1709-seo-prospect-diagnostic.sql:40-45`).
`detail_json` permite metadata aditiva, pero hoy sólo guarda la base de cálculo, no metodología (`:53-85`).

## 5. Readers, API y MCP

- Domain reader prioriza source endpoint, no fórmula: `domain-overview/reader.ts:117-203`.
- URL reader hace lo mismo: `url-visibility/reader.ts:105-208`.
- Lanes passthrough: `src/lib/api-platform/resources/ecosystem-growth-seo.ts:393-570`.
- MCP presenta ETV/trayectoria sin versión: `src/mcp/greenhouse/tools.ts:445-475`.
- Tipos DB no tienen metodología: `src/types/db.d.ts:7553-7587,7836-7871`.

Si se agregan dos modelos sin resolver el reader, una línea puede mezclar meses y no podrá explicar el salto.
API/MCP/provenance deben transportar la versión; no basta con conservarla sólo en PG.

## 6. Superficies sin impacto actual

- No existe consumo/persistencia de `clickstream_etv`.
- `keyword_overview` y discovery usan volumen/CPC/KD, no ETV.
- `domain_intersection` recibe posibles campos ETV, pero el parser actual usa posiciones, URL, features y
  keyword market data; no los consume.
- `competitors_domain` del prospect deriva dominio, posición e intersecciones, no ETV.
- `historical_serps` persiste `estimated_traffic = NULL`.
- SERP rank diario/top-N, GSC, Backlinks, OnPage y AEO no dependen del ETV Labs.
- La columna legacy `seo_rank_snapshots.estimated_traffic` no se puebla en el camino vigente.

## 7. Cobertura existente y huecos

Hay tests de parsing para domain, historical, bulk, URL, concentration y prospect. No existen pruebas de:

- selección explícita de fórmula;
- construcción de payload con la versión;
- provenance/clave formula-aware;
- convivencia legacy/improved;
- reader de una serie mixta;
- rebaseline/breakpoint;
- cambio de membresía provider-side;
- propagación API/MCP;
- detección de snapshots sin versión después del cutover.

Las pruebas futuras deben ejercer builders/readers y constraints reales. Un grep que busca el texto
`use_improved_etv` no verifica el comportamiento.

## 8. Qué hay que hacer

### P0 — antes de experimentar

1. **Obtener aclaración del proveedor.** Responder el correo con las ocho preguntas de §2 o esperar la matriz
   pública; una prueba sandbox/live acotada complementa, no sustituye, la definición de históricos/pricing.
2. **Abrir ADR + task propia.** Cambian API externa, schema append-only, proyecciones y metodología compartida.
3. **Definir policy canónica** `legacy_v1|improved_v2`; no inyectar el flag en el transporte genérico ni copiarlo
   en siete callsites.
4. **Diseñar provenance/schema formula-aware** para domain, URL y prospect; incluir pre-checks, idempotencia,
   readers, DTO, API y MCP.
5. **Elegir dónde vive el shadow.** Tabla experimental separada o clave productiva que incluya versión; jamás las
   tablas actuales sin migración.

### P1 — septiembre/octubre, con autorización de gasto

6. Ejecutar legacy/improved sobre cohorte representativa: Efeonce CL, Berel MX, competidores, dominios grandes y
   pequeños, intención informational/commercial/local y SERPs con/sin AIO.
7. Comparar contra GSC con período, propiedad, país y cobertura equivalentes: error, correlación, dirección y
   estabilidad. No promediar fuentes.
8. Probar valores y **membresía** de relevant pages/subdomains; revisar traffic cost y suma truncada de prospect.
9. Decidir con evidencia entre:
   - rebaseline versionado de histórico, si costo/retroactividad lo permiten; o
   - breakpoint visible desde una fecha explícita, conservando legacy sin comparar el salto.

### P2 — hardening y cutover

10. Tests conductuales de policy, payload, schema, reader, API/MCP y mixed-series failure.
11. Señales: filas sin versión, mezcla de versiones, configured ≠ served y legacy posterior al cutover.
12. Runbook/copy: toda cifra muestra lente estimada, versión/cutover y comparabilidad.
13. Cutover controlado antes del default del proveedor, con rollback y readback; no esperar al 1 de noviembre.

## 9. Criterio de cierre futuro

No se considera resuelto por agregar `use_improved_etv: true`. El cierre exige contrato oficial suficiente,
ADR aceptado, schema/provenance, shadow medido, decisión histórica, tests, rollout/readback y series que no
conviertan una revisión de modelo en performance SEO.

## 10. Artefactos de gobierno creados

- ADR aceptado, con implementación/costo/cutover gated:
  `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.
- Tasks canónicas `to-do`: `TASK-1805` para foundation formula-aware y `TASK-1806` para evaluación/cutover.
- Runbook de evaluación futura: `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`.
- Correo de aclaración: `docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`.

Estos artefactos cierran discovery y diseño pre-implementación. No son evidencia de código, migración, llamada al
proveedor, gasto, envío, deploy ni runtime.
