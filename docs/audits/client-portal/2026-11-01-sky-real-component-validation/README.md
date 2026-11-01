# SKY — Medición Blog y componentes reales, 2026-11-01

Estado: **avance local verificado; elección A′/B pendiente**. TASK-2094 in-progress.
Discovery previo: `c618bc662`. Ningún cambio en runtime, datos compartidos o historia real de Diseño.

## Evidencia ejecutada

89 pruebas: **47 de contrato candidato, 15 de lógica AEO/Insights y 27 con PostgreSQL 16 real**.
[Recibo](results.json) conserva nombres, estados y hashes de fuentes. No son los 59 escenarios integrales
propuestos en el discovery ni las 97 pruebas del simulador TASK-2073.

Las pruebas CURRENT GAP pasan cuando reproducen el problema vigente; no prueban que se haya corregido.
El contrato candidato está fuera de `src`, sin consumidor productivo. La base contiene exclusivamente fixtures.

## Qué componentes son reales

| Frente | Ejecutado | Sustituido o no demostrado |
| --- | --- | --- |
| Identidad | Pool canónico PG, reader identity-store y vista session_360 extraída del SQL versionado | DDL de dependencias mínimo; módulos activos como tabla fixture; JWT/refresh/HTTP/grants efectivos fuera |
| Finance/comercial | resolveFinanceClientContext, guard instantiateClientForParty, transacción rollback | Sin P&L, invoices, reconciliación, locks concurrentes ni alta válida de un bridge hijo |
| Account360/Notion | resolveAccountScope y lectores Space/client contra PG | No ruta HTTP ni escritores/materialización Notion |
| Services | upsert real con replay y cron adapter syncServicesForCompany | Respuesta HubSpot y publicación outbox stub; no delivery/consumer real |
| Historia Insights | Store snapshot, tabla y triggers reales de la migración foundation; sello, UPDATE/DELETE denegados | Snapshot sintético vacío; no todas las dependencias/constraints, role productivo ni rematerialización ICO |
| AEO | Clasificación/reducer, adapter y validación de generation reales | Readers GA4/AEO, stores/transacciones/eventos en esa suite son stubs; collecting/composing no se ejecutan |
| Medición | Nuevo evaluator y primitives reales scope/window/GA4 | Recibos sintéticos confiables; no captura Google ni provenance autenticada |

[Detalle AEO](../../../../scripts/experiments/sky-measurement-bridge/aeo-insights-evidence.md).
No hay paridad completa del schema o RBAC: el rol fixture no es superuser pero recibe TRUNCATE para limpieza.
El privilegio no pretende modelar el rol de producción ni demostrar que un usuario no pueda truncar tablas.

## Comparación observada

| Comportamiento actual | A′: client por Space | B: client compartido | Consecuencia |
| --- | --- | --- | --- |
| Sesión del usuario comercial | Permanece en Diseño en este fixture | Empieza en SEO; metadata más reciente de Diseño la cambia | B exige selector/contexto explícito; A′ tampoco prueba acceso SEO del mismo usuario |
| Módulos por client | Diseño aislado del SEO | Diseño + SEO se mezclan | Revisar autorización además del menú |
| Revocar memberships | Sesión por bridge sigue activa | Igual | Ninguno resuelve revocación por sí mismo |
| Finance con perfil existente | Conserva owner comercial | Conserva owner comercial | Space elegido sigue siendo SEO; owner correcto no acredita atribución operativa |
| Finance sin perfil | Puede elegir client SEO | Mantiene client compartido | A′ necesita normalización explícita al owner; no trasladar perfil histórico |
| Alta comercial ordinaria | Rechaza segundo client | También rechaza duplicado | A′ necesita provisioning operativo distinto, sin copiar el cliente comercial |
| Notion por client SEO | Un candidato | Dos candidatos bajo LIMIT 1 | Scope por Space obligatorio; no confiar en orden incidental |
| Account360 | Agrega ambos Spaces | Agrega ambos Spaces | Agregación org no es autorización departamental |
| Replay Services | Misma identidad, puede sobrescribir owner | Igual | Guard temporal/idempotente antes de activar sync |
| Cron Services | client como Company y etapa omitida reproducidos | Igual | Reparación independiente del bridge |
| Snapshot sellado | Conserva hash; update/delete bloqueados | Igual | Protección de snapshots demostrada; historia completa todavía no |

**Decisión:** mantener Organization→Spaces como dirección y ADR Proposed. A′ ofrece compatibilidad con
lectores legacy, pero añade normalización comercial y provisioning. B evita duplicar ese identificador, pero
exige convertir consumidores a Space. El ensayo no establece todavía costo total ni aislamiento completo;
no hay fundamento para aceptar uno como listo. Las pruebas de ambos usan el mismo código productivo actual,
no implementaciones completas futuras de sus bridges.

## Contrato de medición

[Contrato candidato](../../../architecture/EFEONCE_INSIGHTS_BLOG_MEASUREMENT_CONTRACT_V1.md): host exacto,
binding/version, ventana/calendario por fuente, calidad y disponibilidad, recibo actual GA4 + GSC + AEO nativo.
Ausencia no equivale a cero; referrals GA4 no reemplazan corrida AEO. Comparación requiere métodos/paneles
compatibles. Top rows GSC se distingue de extracción completa y se coteja con control; umbrales son fixtures,
no policy aprobada para SKY. La prueba DST detecta el límite canónico del 06-09-2026 en Santiago y bloquea
certificación de esa frontera; no cambia window.ts.

## Lo que falta para elegir

1. **Identidad primero:** construir localmente contexto explícito Organization/Space/Service y ejercitar grants,
   usuario de ambos departamentos, usuario de uno, revocación, refresh y denegación cruzada mediante entrypoints
   reales. Comparar A′/B con cambios mínimos separados y medibles. No usar sesión/default como autoridad.
2. **Owner y escritura:** provisioning operativo candidato A′ sin alta comercial duplicada; P&L/perfil/invoice,
   allocations Space/Service, eventos y Notion replays fuera de orden. Probar conflictos/concurrencia y rollback.
3. **Historia y entrega:** ICO freeze/reconcile/rerun, atribución temporal, generación idempotente, render/issue,
   recurrencias y destinatarios por cuenta. Hash/readback antes/después con fixtures históricos representativos.
4. **Productores de medición:** readers reales contra transportes de API grabados/sintéticos; preservar metadata,
   filtros/host, paginación, disponibilidad/finalidad y denominadores. AEO nativo con SQL de selección y paneles.
   Los booleanos del candidato no deben poder ser afirmaciones enviadas por clientes.

El siguiente incremento recomendado es el punto 1: decide si ambos bridges pueden tener la misma autoridad
sin duplicar permisos y revela cuánto habría que modificar. La implementación de scope/reporting mantiene
TASK-2033/TASK-1960 como dueñas; esta unidad no sustituye su backlog ni autoriza alta real SKY.

## Reproducción y límites

[Manual local](../../../manual-de-uso/insights/validar-blog-y-bridge-localmente.md). El runner crea un cluster
exclusivo UNIX sin listener IP, sanea el entorno y bloquea red IP/lecturas de credenciales conocidas al proceso
de tests. Se probó denegación IP, rol no-superuser, DB/socket y cleanup. Es aislamiento accidental de este
harness, no sandbox general frente a código malicioso: UNIX sockets están permitidos por el perfil y la
allowlist efectiva de PG sale del entorno fijo/setup; no se ejecuta código externo no confiable.

[Gates y dictamen de QA](QA.md): cierre del incremento local separado de aceptación del puente.

## Incremento posterior — permisos/contexto

[78 pruebas nuevas, total 167](../2026-11-01-sky-space-context-validation/README.md): callbacks cookie, App
sessions y recurso/reader Insights reales; contexto/grants candidato funciona con A′ y B. Este recibo de 89
permanece histórico en `149aed558`; el nuevo receipt tiene hashes del runner ampliado.
