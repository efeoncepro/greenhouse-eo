# Configurar mercados AEO

## Estado y límites

TASK-1863 está desplegada en staging; `main` permanece en espera. Las dos migraciones y el backfill
de 27 perfiles están aplicados. Vercel staging tiene multimer­cado ON; ops-worker compartido conserva
OFF para no activar recurrencia secundaria antes de main. Ejecuta los lotes explícitos de staging.
El worker y PostgreSQL son compartidos entre ambientes; consulta la auditoría para el canary vigente.
Configurar un país no concede derechos de servicio. No se usa el formulario público para lotes.

## API y commands

Prefijo: `/api/admin/growth/ai-visibility`. Todas las escrituras pasan por los commands del dominio.
La sesión debe ser interna; gestión exige `growth.ai_visibility.market.manage` y ejecución `run.operator`.
Lecturas exigen `report.read_operator`. Se reutilizan las vistas del cockpit existente; no hay navegación
ni pantalla nueva en esta task. TASK-1861 podrá exponer los mismos commands por MCP.

| Método / ruta | Datos |
| --- | --- |
| GET `/markets?organizationId=…` | Mercados, aliases, competidores vigentes y señales |
| POST `/markets` | `organizationId`, `marketCode`, `locale` opcional |
| POST `/markets/{id}/primary` | Cambia el principal atómicamente |
| POST `/markets/{id}/pause` o `/resume` o `/archive` | Conserva histórico; archivo no admite reanudación |
| PUT `/markets/{id}/competitors` | `competitors`: nombre, aliases y matchMode; `reason` obligatorio |
| PUT `/markets/{id}/regrade` | `enabled`, `cadence`: weekly/monthly/quarterly |
| PUT `/profiles/{id}/aliases` | `aliases`: `{name,matchMode}`; `reason` |
| POST `/run-batches` | `organizationId`, `markets`: primary/all_active/array IDs, `mode`, `idempotencyKey` |
| GET `/run-batches?organizationId=…&batchRef=…` | Progreso por run |
| GET `/market-matrix?organizationId=…` | Última medición reportable por mercado; sin score combinado |

Los paths son planos bajo el prefijo del dominio, una simplificación de los paths anidados de la spec
inicial. La organización se valida en los commands; ningún id de mercado permite cruzar perfil.
El portal conserva POST `/api/client-portal/growth/ai-visibility/run`: body opcional con `marketId` y
`idempotencyKey`; sin body mide el principal. Nunca acepta `organizationId` desde el body.

## Ejemplo de configuración

1. Lee el perfil y los mercados de la organización.
2. Agrega `MX/es-MX`, `US/en-US` o `US/es-US`, según el público que se quiere medir. No cambies una
   fila existente para corregir el país: crea la configuración correcta y pausa la anterior.
3. Define competidores por mercado. `word_ci` ignora mayúsculas y acentos; `word_cs` diferencia
   `Gol` de `gol`. Los aliases permiten reconocer `LATAM` como `LATAM Airlines` sin renombrar evidencia.
4. Usa una clave única de solicitud para el lote. Repetir la misma clave/selección devuelve el lote;
   cambiar la selección con esa clave produce conflicto. Revisa costo total y derechos de servicio.
5. Lee el progreso y la matriz. Un lote parcial conserva los resultados válidos y muestra los faltantes.

## Secuencia de rollout y continuidad

1. Revalidar `pnpm pg:doctor`, migraciones pendientes y ausencia de runs pending/running antes del
   cambio de policy. No mezclar observaciones legacy con una policy nueva en un run en curso.
2. Conservar perfiles legacy activos: múltiples perfiles no prueban duplicidad. Efeonce confirmó
   CL/CO/PE/MX; sus cuatro perfiles están registrados como CL y conservan históricos/competidores.
   El archivado inicial fue revertido y auditado; no repetir esa reconciliación automática.
3. DDL aplicado: `20260928094832901_task-1863-market-rollout.sql` y
   `20260928095058691_task-1863-preserve-legacy-market-profiles.sql`. La segunda retira la unicidad
   por organización para conservar las configuraciones legacy. El backfill conserva cada perfil.
4. Ejecutar `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/backfill-grader-markets.ts`.
   Dry-run por defecto; `--apply` es transacción atómica. Copia mercados principales, sets y cadencias;
   enlaza configuraciones de prompts legacy al principal original. No reescribe runs históricos.
5. Publicar Vercel + ops-worker coordinados, con `GROWTH_AI_VISIBILITY_MULTI_MARKET_ENABLED=false`.
   El código de catálogo/snapshot requiere la migración incluso con el flag OFF.
6. Verificar una medición principal por command/API y su snapshot, prompts, observaciones, scoring,
   cobertura e informe. Después habilitar multimer­cado y verificar el lote de Sky con derechos y
   competidores confirmados. La habilitación en el worker afecta a ambos ambientes.
7. Vigilar `market_primary_missing`, `market_unresolved`, `run_batch_partial` y la demora de cola.

No se cierra la task con un canary del adapter: falta el recorrido por el runtime publicado y el lote
cliente. Los canaries locales no publican reportes ni envían correos/CRM.

## Reproducción local

- Catálogo gratuito: `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/verify-market-catalogs.ts`.
- Canary (dry-run por defecto): mismo runner con `scripts/growth/smoke-multilingual-ai-mode.ts`.
  `--spend` compra cinco solicitudes; `--all --spend` verifica los 23 mercados (Cuba hace skip sin compra).
- PostgreSQL efímero: inicia una instancia dedicada en `/tmp/task-1863-pg`, puerto 55463, usuario local.
  `TASK_1863_LOCAL_PG=true node scripts/growth/verify-market-schema-local.mjs` crea y retira una base de prueba,
  aplica Up→Down→Up y comprueba triggers. Rechaza otro data_directory.
- `market-batch.local.test.ts` requiere opt-in y el esquema nuevo aplicado a la base `postgres` de ESA
  instancia efímera. Su fixture trunca sólo esa base verificada. No usa credenciales de Cloud SQL.

## Migraciones

El DDL aditivo vive en `migrations/20260928094832901_task-1863-market-rollout.sql` y la corrección
permisiva en `migrations/20260928095058691_task-1863-preserve-legacy-market-profiles.sql`.
Ambas fueron aplicadas a la instancia compartida el 2026-09-28. El retiro de columnas legacy sigue
fuera del runner en `TASK-1863-primary-profile-contract.sql.pending`; no aplicar antes de main.
Los perfiles antiguos mantienen su estado activo, competidores y vínculo de runs; no asignarles países
nuevos por inferencia. Las configuraciones nuevas CL/CO/PE/MX se operan por el command de mercados.

## Efeonce: identidad y mercados

Efeonce es una agencia de marketing con servicios creativos, SEO y RevOps. El perfil operativo
`EO-GAVP-0020` usa `sector:marketing_services`; `b2b_service_provider` clasifica el comprador.
“Growth Operating System” no es la categoría competitiva de esta medición. La corrección del operador
fue auditada; snapshots de corridas anteriores conservan su categoría original.

Los cuatro perfiles legacy siguen activos. El perfil operativo tiene CL/es-CL, CO/es-CO, PE/es-PE y
MX/es-MX. Los competidores de CL se conservaron; los demás sets quedan vacíos hasta confirmación,
porque los perfiles anteriores no identificaban inequívocamente su país. No asignarlos por orden.

## Otras marcas y puntos de entrada

La capacidad aplica a cualquier marca con categoría resoluble y permisos vigentes. No copies la
categoría ni los competidores de Efeonce a otros perfiles. Los arquetipos distinguen consumo, retail,
SaaS, marketplace, institución y servicios B2B; un modelo explícito se conserva. Las entradas antiguas
sin modelo usan el clasificador de su categoría en el command común; si la categoría no puede
resolverse, el gate detiene la medición antes del gasto. País sin soporte Google produce skip explícito.
Operador, portal, formulario, API y recurrencia convergen en los mismos comandos; el worker ejecuta
el contexto persistido. La tool multimer­cado MCP sigue bajo TASK-1861, sin una implementación paralela.
