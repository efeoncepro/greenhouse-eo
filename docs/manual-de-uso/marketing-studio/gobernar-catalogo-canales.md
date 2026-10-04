# Gobernar el catálogo de canales

**Estado al 2026-10-04:** migraciones Studio y seed v1 de 52 canales aplicados y verificados en staging y producción. Validación en `warn`, ICP desactivado y backfill histórico sin aplicar. Los comandos de este manual no autorizan nuevas escrituras ni cambios de flags. [Contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md) · [Release](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md) · [Pruebas locales previas](../../audits/marketing-studio/TASK-1905-local-verification.md).

## Preparación y permisos

Trabajar desde el repositorio hermano `efeonce-marketing-studio`, con su configuración habitual de base de datos y sin imprimir credenciales. Verificar entorno, migraciones y estado del catálogo antes de aplicar. Las migraciones Studio nuevas son `1791144092031_channel-catalog.sql` y `1791144092429_channel-key-expand.sql`; la migración Greenhouse de capability es `docs/tasks/pending-migrations/TASK-1905-marketing-studio-catalog-capability.sql.pending`. El SQL Greenhouse está parqueado fuera de `migrations/`: el operador de release debe recrearlo con `pnpm migrate:create` y un timestamp nuevo antes de aplicarlo. Las dos migraciones Studio se aplicaron posteriormente en staging y producción durante el [release autorizado del 04/10](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md); Greenhouse sigue pendiente.

Las primitivas globales de backfill rechazan operadores con `onlyOrganizationId`: un operador restringido a una organización no puede ejecutar mantenimiento de toda la instalación.

El catálogo se gobierna con `marketing_studio.catalog.manage` (`create`/`update`) y autoridad admin/operations. Nunca asignar este permiso a account/designer por necesidad de una campaña. Los commands usan revisión e idempotencia del kernel; los catálogos publicados no se editan. Hoy las mutaciones globales requieren `operator_cli` sin restricción organizacional: declarar la capability o enviar un bearer no concede esa autoridad. La CLI HTTP de Greenhouse permite descubrir el contrato y leerlo, pero sus bearers de servicio/usuario no habilitan gobierno global. Consultar `/api/v1/channels`, `/api/v1/channel-catalog/versions` y `/api/v1/channel-aliases` para readback.

## Seed

La primera invocación sólo valida el archivo y muestra el plan; no abre una base de datos:

```sh
pnpm channels:seed --dry-run
```

El archivo por defecto es `packages/database/seeds/channel-catalog-v1.json`, versión 1. Se puede elegir `--file` y `--version` explícitos. Revisar procedencia, límites y taxonomía antes de autorizar su publicación. Para aplicar en el entorno ya seleccionado:

```sh
pnpm channels:seed --apply --actor operador-identificado
```

El comando crea borrador, guarda canales y publica por los commands gobernados; usa digest e idempotencia deterministas y verifica el seed mediante readback. Repetir exactamente el mismo seed publicado es idempotente. Una versión publicada diferente, otra versión existente o un borrador ajeno no se sobrescriben. No usar `--apply` junto a `--dry-run`.

## Backfill e inventario

El inventario productivo del 04/10 encontró 134 registros sin mapear; no se aplicó backfill. Los valores ambiguos requieren decisión de Operaciones. El dry-run consulta la base pero no escribe:

```sh
pnpm channels:backfill --dry-run
pnpm channels:backfill --dry-run --version 1 --map 'literal histórico=clave_canonica'
```

Los valores del ejemplo son placeholders: usar el literal exacto observado y una clave activa de la versión publicada. Repetir `--map` para cada equivalencia aprobada. No crear mapeos por similitud o traducción automática. El resultado separa sin mapear, versiones mixtas, canal no disponible y otros estados; revisar el inventario antes de aplicar.

```sh
pnpm channels:backfill --apply --actor operador-identificado --version 1 --map 'literal histórico=clave_canonica'
```

**Snapshots existentes:** si una fila ya tiene versión de catálogo y claves canónicas no vacías, el backfill la conserva aunque cambien los alias. Esto incluye arrays deduplicados y arrays parcialmente resueltos en modo warn. Esas filas requieren revalidación explícita; el backfill sólo completa claves nulas o vacías.

El proceso toma exclusión mediante `ops_run`, registra alias, aplica lotes de 500 y realiza readback. Puede terminar parcial si persisten valores no resueltos o cambios concurrentes. No borrar esas señales para declarar éxito. Los literales y las UTM no se reescriben.

Para inspeccionar una reversión y después aplicar sólo la reversión aprobada:

```sh
pnpm channels:backfill --dry-run --revert-alias 'literal histórico'
pnpm channels:backfill --apply --actor operador-identificado --revert-alias 'literal histórico' --confirm
```

La reversión compara el snapshot completo de la fila: conserva cambios posteriores al backfill. No combinar `--map` y `--revert-alias`. Bajar una migración es una decisión distinta; no usar un rollback de schema para remediar un alias equivocado.

## Findings y revalidación explícita

Desde Greenhouse, consultar el contrato disponible sin escribir:

```sh
pnpm studio describe studio.campaign.channel_findings.list
pnpm studio describe studio.campaign.channels.revalidate
```

Usar los nombres exactos que devuelva `pnpm studio list --filter channel` si cambia la versión del servidor. Leer findings por campaña y revisión; conservar los históricos. La revalidación exige revisión e idempotencia, evalúa contra el catálogo publicado y actualiza snapshots sólo para entidades válidas; puede terminar parcial. Revisar el resultado y leer otra vez la campaña. `validatedWithPreviousSpec` informa antigüedad de especificación: no es una orden para reescribir silenciosamente.

## Activación gradual

1. Verificar migraciones, permisos efectivos y publicación del seed en el entorno elegido.
2. Mantener `STUDIO_CHANNEL_VALIDATION_MODE=warn`, inventariar legacy y revisar findings de escrituras reales.
3. Resolver alias explícitos y repetir inventario/readback. Confirmar que los límites duros provienen de fuentes vigentes.
4. Probar `enforce` en un entorno controlado: canal conocido, desconocido, hard limit, recommendation, dry-run y ausencia de writes en errores.
5. Autorizar promoción del flag por entorno. `off` suspende la validación futura; no elimina findings ni modifica lo ya guardado.

ICP permanece desactivado por defecto. No habilitarlo como sustituto de TASK-1906/TASK-1892: se requiere consumer real, contrato y readback autorizado. No federar escrituras `T1` antes del carril de TASK-2003 ni presentar una tool declarada como canary MCP completado.
