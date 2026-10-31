# SKY — Evaluación local del bridge de cuentas operativas

Fecha: **2026-10-27**. [ADR Proposed](../../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md)
· [TASK-2073](../../../tasks/complete/TASK-2073-operational-account-bridge-local-prototype.md)
· [Plan](../../../tasks/plans/TASK-2073-plan.md) · [Resultados reproducibles](results.json).

## Resultado y decisión recomendada

**Recomendar A′: un bridge operativo legacy por Space, con un owner comercial/financiero común.** Mantener una
Organization SKY, el Space histórico de Diseño y un Space futuro para Blog SEO/AEO. El experimento da evidencia
para seleccionar el puente; el ADR permanece Proposed y ningún alta, migration o rollout queda autorizado.

El driver de selección es conservar la separación de los selectores legacy mientras se migra el contexto.
No es una medición de tiempo de desarrollo ni de rendimiento. Ambas alternativas funcionan en los escenarios
con contexto explícito. A′ conserva además selectividad de los predicados client-only modelados; B exige retirar
todas esas inferencias antes de abrir el segundo Space. **La normalización Finance y el command hijo son gates
obligatorios de A′, no deuda que pueda diferirse hasta después de provisionar.**

## Comparación observada

Los conteos son de fixtures, **no de datos de SKY**. Modelos de predicados legacy contrastados con nueve anchors
de ocho archivos locales; no se ejecutaron los stores SQL productivos.

| Escenario con comportamiento legacy | A′: client operativo por Space | B: client compartido |
| --- | --- | --- |
| Proyectos devueltos por client de Diseño | Sólo Diseño | Diseño + SEO |
| Proyectos devueltos por client de SEO | Sólo SEO | Diseño + SEO |
| Fuentes Notion elegibles por client de Diseño | 1 | 2, elección ambigua |
| Contextos de sesión por client de SEO | 1 | 2, elección ambigua |
| Spaces candidatos por Company | 2, ambiguo | 2, ambiguo |
| Company incluye segundo Space inactivo | Sí | Sí |
| Cache por Organization/facet | Colisión | Colisión |
| Candidatos de factura sin normalizar owner | Sólo Diseño: falso candidato único | Diseño + SEO |

La prueba financiera es decisiva: añadir un bridge sin modificar el resolver puede **empeorar** la atribución.
Con normalización previa, ambas variantes producen dos candidatos; la factura sin señal de servicio permanece
`unresolved`. Si trae una señal explícita válida de SEO, se atribuye a SEO. No se modifica ni duplica la factura.

## Qué se ejecutó

**97 tests PASS, 0 fallos, 0 omitidos**, bajo filesystem restringido y red bloqueada. La evaluación contiene
**68 comprobaciones** (34 por variante); forman parte de los 97 tests, no son otra suite adicional.

- Aislamiento de cuentas con membership/capacidad vigentes; rol global y pertenencia a Organization no bastan.
- Selección de Space persistente tras refresh; revocación deniega cache hit y retry histórico.
- Cache separada por Space/Service/período/subject/versión de autoridad.
- Routing explícito, ambigüedad bloqueada, replay de fuente y rechazo a reasignar un proyecto de Diseño.
- Alta hija en memoria idempotente: una Organization, un owner y un perfil Finance. Sin invocar alta comercial.
- Alta bloqueada sin foundations de contexto/routing/Finance. Inactivar el nuevo Space no elimina el riesgo legacy.
- Historial de Diseño idéntico byte a byte antes/después de simulación y provisioning, en ambas variantes.
- Owner normalizado antes de candidatos; facturas duplicadas no sumadas y hechos contradictorios rechazados.
- Retry de edición sellada antes del mapping actual; nueva admisión exige mapping actual; key de otra cuenta
  denegada/conflictiva. La revocación actual sigue aplicando al recurso histórico.
- GA4/GSC/AEO nativo obligatorios por período y host; fuente ausente/stale/null no equivale a cero observado.
- AI referrals no sustituye AEO nativo. Un scope null/borrado no activa toda la Organization.
- Proyección de URLs excluye raíz, hosts parecidos, credenciales y puertos no previstos. En el panel sintético,
  dos citas repetidas son una respuesta con cita del Blog sobre **cuatro respuestas observadas**, no 2/2 ni 1/1.

El digest de historia fixture en ambos casos es
`61a8458f25a9f7b87c6272466a2cd8dda7fc92032f03677d46abd2125c007d50`.
Es un control de inmutabilidad sintético; no es hash ni certificación de la base productiva de Diseño.

## Reproducción

Desde el root del repo, con Node y macOS `sandbox-exec` disponibles:

```bash
bash scripts/experiments/operational-account-bridge/run-local.sh test
bash scripts/experiments/operational-account-bridge/run-local.sh evaluate
```

`test` ejecuta `node:test` en el mismo proceso para evitar el descubrimiento de archivos fuera de la allowlist.
`evaluate` emite JSON estable por stdout: no escribe archivos por sí mismo, no tiene modo apply ni acepta targets.
La salida no incluye timestamp variable, duraciones ni datos reales; dos ejecuciones se comparan en la suite.

El wrapper bloquea red mediante sandbox del sistema y restringe Node a la carpeta del prototipo y los ocho
archivos locales de anchors. No concede filesystem write ni child processes. Una prueba verifica que `.auth`,
`.env`, escrituras y procesos hijos estén denegados. Los módulos sólo importan builtins permitidos y archivos
del propio prototipo; la suite rechaza SDKs, stores, imports dinámicos, lectura de environment y ejecución arbitraria.

Implementación local en [scripts/experiments/operational-account-bridge](../../../../scripts/experiments/operational-account-bridge/).
`source-anchors.mjs` conserva predicados y publica línea/hash del archivo en `results.json`: si cambian los anchors,
la evaluación falla para exigir nueva revisión. Un cambio fuera del snippet puede requerir revisión semántica
aunque el anchor siga pasando; el hash permite detectarlo al comparar recibos.

## Evidencia de verificación

| Check | Resultado | Límite |
| --- | --- | --- |
| Test runner restringido | 97/97 PASS | Modelo local; no prueba driver o sesión desplegada |
| Evaluación A′/B | 68/68 PASS, preferencia A′ | Política explícita de compatibilidad legacy |
| Anchors | 9/9 verificados | 8 archivos; SQL no ejecutado |
| ESLint del prototipo | 0 errores, 0 warnings | Sólo tooling nuevo |
| `bash -n` y parseo Node | PASS | Sintaxis de archivos locales |
| Task lint | template=1, legacy=0, cero hallazgos | Registro/proceso, no rollout |
| `pnpm lint` baseline | 0 errores, 26 warnings existentes | Ejecutado antes del código del prototipo |
| Typecheck global baseline | No completó: heap agotado ~4 GB, SIGABRT | No se atribuye al sandbox; no se modificó TypeScript/producto |
| `ops:lint --changed` | Cero errores; 14 warnings de epics ajenos | No se corrigen fuera del scope |

Logs locales ignorados: `.captures/sky-bridge-prototype-2026-10-27/` (`task-hook.txt`, `tests.log`,
`lint-baseline.log`, `types-baseline.log`). El JSON versionado no contiene esas trazas ni credenciales.

## Qué falta antes de materializarlo

1. **Aceptar el ADR y el puente condicionado.** Definir owner canónico, rol del bridge y representación persistida;
   el mapping en memoria no decide un schema. Cerrar la política de consolidado y autoridad de cada operación.
2. **U01:** contexto/selección/refresh/memberships/revocación efectivos en los owners reales, usando un principal.
3. **U02:** mapping Servicio→Space y Fuente→Space determinista en todos los carriles; queues/robots compatibles.
4. **U02F:** owner Finance normalizado antes de candidatos/pesos y comandos/counters sin segundo cliente comercial.
5. **U03 sólo después:** command específico de alta operativa, transacción/idempotencia/concurrencia y recuperación
   demostradas en DB aislada; no reutilizar `instantiateClientForParty` o el wizard comercial sin rediseñarlos.
6. Readers/caches, bindings Proyecto→Servicio con vigencia, métricas/ICO/capacidad, productores GA4/GSC/AEO e
   Insights se certifican con sus unidades dueñas y las U04–U10 del plan integral.

El prototype **no** implementa relaciones Proyecto→Servicio, vigencias financieras, supersessions, vistas SQL,
APIs/session refresh reales, leases, concurrencia multitransacción, sharing/envío, corridas AEO o queries GA4/GSC.
La proyección AEO demuestra conservar un denominador de fixture, no aprueba una nueva fórmula del motor.
Los owners y gates de TASK-1852/1853/1854/1960/2033 permanecen vigentes, sin cambiar sus lifecycles.

No se consultó ni escribió producción en esta unidad. No se provisionó Space/bridge, reconfiguraron fuentes,
reasignaron servicios, tocaron hechos reales de Diseño, modificaron flags, enviaron mensajes ni hizo push/deploy.
