# TASK-1844 — Reconciliación de documentación y skills

Fecha: 2026-09-08. Owner: Identity / Platform. Tipo: ampliación documental posterior al cierre productivo.

El operador pidió actualizar todos los documentos y skills correspondientes y autorizó tres subagentes.
La revisión se dividió en arquitectura/API, documentación funcional/manuales y skills Codex/Claude; el
coordinador integró operaciones, invariantes, routers, índices, continuidad y el repo del gateway. Todos
trabajaron en los checkouts compartidos, con ámbitos de escritura separados y sin worktrees.

## Estado y fuentes

TASK-1844 conserva `complete`. Esta revisión no reabre el hook de implementación de una task cerrada:
documenta la entrega ya ejecutada y corrige instrucciones operativas que quedaron desactualizadas.
No cambia código ejecutable, permisos, flags, cohortes, migraciones, tokens ni runtime; no repite login,
revocación, canaries, carga o despliegues. Las consultas `--help` sólo validan sintaxis de los CLIs.

El contrato se contrastó con reader/roles/relaciones/entitlements, contexto/consentimiento/CIMD, policy y
resolver del gateway, deploy scripts y evidencia productiva de esta misma sesión:

- [Task completa](../../tasks/complete/TASK-1844-efeonce-mcp-internal-multi-organization-authority.md).
- [QA de implementación y runtime](TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).
- [Readback final](TASK-1844_FINAL_RUNTIME_2026-09-08.json), [clientes](TASK-1844_FINAL_CLIENTS_2026-09-08.json),
  [rollback](TASK-1844_ROLLBACK_RESTORE_2026-09-08.json) y [retiro](TASK-1844_FIXTURES_RETIRED_2026-09-08.json).

Estos registros prueban lo observado el 2026-09-08. Los manuales exigen nuevo readback antes de una acción
operativa; un SHA, conteo de organizaciones o estado del documento no se convierte en monitor de producción.

## Cobertura por dueño

| Capa | Fuentes revisadas y actualizadas | Resultado |
| --- | --- | --- |
| Uso diario | [Manual interno multiorganización](../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md) | Conectar Codex/Claude una vez, listar/paginar, elegir ID, incorporar organizaciones elegibles, diagnosticar y recuperar acceso |
| Producto y acceso | [Funcional interno](../../documentation/identity/acceso-mcp-interno-multiorganizacion.md), binding externo, sistema de identidad, autorizador y Admin Center | Organización, persona, sesión, consentimiento, capability y módulo son decisiones distintas |
| Manuales existentes | Efeonce ID interno, autorizador, Admin Center, gateway, inventario MCP, provider SEO y canary sintético | Retiro de recetas Entra como bootstrap vigente; enlace al manual dueño sin duplicar el flujo completo |
| Funcional de plataforma | Gateway, API ecosystem, Search Visibility y manuales servidos por MCP | Inventario global y Connected no equivalen a tools autorizadas; manual local no implica publicación en `get_greenhouse_skill` |
| Autoridad y OAuth | [ADR D8–D11](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md), contrato OAuth, ADR nativo, entry/consent por RP y federación de clientes | V1/v2 separados, SQL aplicada, consentimiento de clase dinámica, intersección CIMD soportada y límites externos |
| Permisos y relaciones | Entitlements, Identity Access V2, puntero histórico V1, roles/jerarquías y proyección Organization Workspace | Roles vigentes y overrides aprobados, target exacto y autorización de todos los espacios; sin fallback ambiguo |
| Gateway/MCP | ADR gateway, arquitectura MCP y router de skills | `organizations.list` interna v2, 50 por página, sin total global ni autoridad implícita; initial SEO-only |
| API | [Contrato API](../../api/GREENHOUSE_API_PLATFORM_V1.md), [OpenAPI](../../api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml), API reference y arquitectura API Platform | Parámetros condicionales externo/v1/v2, DTO actor/targets, cursor reautorizado, denied sin datos de autoridad, no-cache interno |
| Consumer Insights | Arquitectura Insights | La capacidad técnica de TASK-1844 está entregada; no concede por sí sola grants/capabilities Insights |
| Operación | Runbooks internos, MCP, auth-server, rollout TASK-1844 y README del deployable auth | Estado actual separado de historia, flags durables, revisión con tráfico, rollout compatible y recuperación por cliente |
| Reglas de agentes | AGENTS, CLAUDE, router JSON, reglas auth-server e invariantes Identity/MCP | Acceso dinámico y rutas canónicas alcanzables desde el arranque; detalle conservado en los dueños |
| Skills espejo | MCP platform y cuatro referencias; mcp-craft client-compatibility; QA security-qa; production-release | Ocho pares Codex/Claude idénticos, reglas reutilizables y enlaces al manual |
| Gateway independiente | `efeonce-mcp/README.md` y `AGENTS.md` | V2 certificada, alta de organizaciones sin reconexión, límites de población/provider, instrucciones de promoción exacta |
| Índices/continuidad | docs README, índices manual/funcional, Decisions Index, task completa, Handoff, changelog y project_context | Triple capa enlazada; estado de entrega coherente y continuidad compacta |

## Contradicciones y recetas corregidas

1. V2 y SQL seguían figurando como pendientes en referencias activas. Ahora se distinguen contrato vigente,
   migraciones aplicadas y snapshots históricos; no se promueve v1 ni se repite el apply.
2. Alta de organización se confundía con otra conexión o con acceso automático de cualquier miembro del
   tenant. Ahora se exige organización/espacios/clientes válidos, relación y permisos efectivos; listado nuevo
   y revalidación por llamada, sin OAuth por organización. Otra persona sí conserva su onboarding/cohorte.
3. Algunos manuales enseñaban bootstrap Entra, renovación por una hora o Connected como prueba de uso.
   El recorrido soportado usa Efeonce ID; se prueban eventos/payloads reales y refresh con familia/contexto
   vigentes. El vencimiento de una cookie web no revoca por sí solo la familia consentida.
4. El runbook genérico de auth aún ofrecía deploy directo con sólo `ENV`: los defaults multiorg false y
   cohorte vacía podían apagar el servicio compartido. Se sustituyó por el proceso gobernado y preservación
   explícita de configuración para cualquier break-glass autorizado. Defaults del script, variables GitHub
   y valores servidos se distinguen; no todas las flags tienen el mismo origen.
5. La prueba de deploy leía el template/última Ready, aunque el tráfico podía seguir en otra revisión.
   Ahora comienza por `status.traffic` y verifica SHA/digest/flags de la revisión servida.
6. `gv=max(memberships)` se presentaba sin delimitar población. Los internos usan el ancla firmada; la
   revisión de cada target no es credencial, caché ni versión del actor.
7. El DCR canary retirado y el CIMD permanente se confundían como ownership. El registro canary retenido,
   clientes CIMD compartidos y otras familias permanecen separados. No se declara observación hospedada
   ininterrumpida ni autorización para adelantar el cleanup global de TASK-1832.

El subagente de skills revisó de forma independiente los cambios del coordinador y detectó los puntos
4–7 y defaults contradictorios del README. Se corrigieron antes del cierre. Los presupuestos de CLAUDE y
project_context detectaron exceso durante la integración; se compactaron punteros, sin borrar historia.

## Límites y fuentes sin cambios

- Se conservan auditorías, snapshots y entregas históricas: sus resultados no se reescriben como si hubieran
  pasado bajo v2. TASK-1831/1836 y EPIC-044 mantienen los pendientes ajenos a TASK-1844.
- Los seis `docs/mcp/skills/*` son manuales de operación de sus tools, no un router de login. Se revisaron y
  no cambia su contrato; el nuevo manual de uso no se publica automáticamente como séptima skill del servidor.
  El manifiesto y artefacto generado permanecen sin diff. El adapter de manuales sigue con sus límites de población.
- Secret-hygiene y documentation-governor ya cubren custodia, evidencia y cierre. Browser diagnostics,
  task hooks y planner no requieren otra regla por esta entrega. No se crean skills duplicadas.
- Contexto comercial, copy de producto, política de clientes externos, providers/writes y autoservicio general
  no se amplían. La entrega inicial delega lectura SEO para una identidad, sin certificación masiva de tráfico.
- La recuperación de Claude Code después del rollback OFF requiere login estándar; las altas/bajas ordinarias
  de organizaciones no. Web/Desktop hospedados comparten familia; Codex y Claude Code tienen las suyas.

## Validación

Cobertura integrada: 71 archivos en Greenhouse y dos en el gateway; incluye tres archivos nuevos (manual,
documentación funcional y este expediente). Las áreas delegadas entregaron 18 fuentes técnicas, 19
funcionales/manuales y 16 archivos de skills (ocho pares). Las demás fuentes corresponden al coordinador.

| Comprobación | Resultado |
| --- | --- |
| Enlaces añadidos o modificados | 183 enlaces locales resueltos, cero faltantes; además, revisión focal de 114 enlaces técnicos y de los manuales/skills |
| OpenAPI | YAML sin claves duplicadas, 126 referencias resueltas, tres schemas compilados con AJV, ocho casos de contrato, seis variantes exclusivas de `oneOf` y rechazo de payload híbrido externo/interno |
| `pnpm skills:mirrors` | PASS; ocho pares actualizados byte a byte idénticos |
| `pnpm mcp:skills:check` | PASS; seis manuales servidos y artefacto sin cambios |
| `pnpm claude-md check` | PASS; 34.973 tokens y cero referencias huérfanas no autorizadas |
| `pnpm task:lint --task TASK-1844` | PASS; cero errores y advertencias, lifecycle `complete` conservado |
| `pnpm ops:lint --changed` | PASS; cero errores y 13 advertencias de paridad en epics ajenas a este cambio |
| `pnpm docs:closure-check` | PASS; ledger de flags e índice Creative Studio correctos; tres avisos revisados abajo |
| `pnpm docs:context-check:strict` | PASS después de compactar punteros; se ejecuta nuevamente como último gate antes del commit |
| Gateway `pnpm check` | PASS; TypeScript/build y 164 tests pasados, cero fallos u omitidos |
| `git diff --check` | PASS en ambos repos |

Los avisos de cierre corresponden a dos documentos grandes de arquitectura (API Platform e Identity V2),
cuya estructura histórica ya existía, y a la heurística de lifecycle por editar una task completa.
README/registro/task coinciden en `complete`; no se movió ni reabrió la task. Dividir esos dos documentos
enteros sería una reorganización ajena a la reconciliación focal y no se realizó. Las 13 advertencias de
epics no señalan archivos modificados por esta entrega.

La prueba funcional/productiva se reutiliza del cierre enlazado. Estos controles verifican documentación,
contrato e integridad del catálogo; no son una nueva certificación runtime ni otro despliegue productivo.
