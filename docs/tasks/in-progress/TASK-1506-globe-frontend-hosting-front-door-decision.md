# TASK-1506 — Globe Frontend Hosting and Front Door Decision

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Decisión arquitectónica pendiente; runtime internal-smoke vivo en Cloud Run`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1506-globe-frontend-hosting-front-door-decision`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Decidir y documentar el hosting de largo plazo de la superficie humana/BFF de Efeonce Globe y el front door
canónico de `globe.efeoncepro.com`. La decisión compara formalmente el runtime Cloud Run actual con una separación
Vercel web/BFF → Cloud Run API y produce el contrato ejecutable de la task posterior, sin aplicar infraestructura,
DNS, OAuth ni tráfico dentro de esta task.

## Why This Task Exists

`TASK-1454` y `TASK-1455` desplegaron un piloto internal-only en Cloud Run y difirieron explícitamente Production,
custom domain y la elección del frontend stack de largo plazo. Después, `apps/studio-web` evolucionó a un servidor
Node nativo desplegado dos veces desde el mismo artefacto: `globe-studio-internal` en modo `web` y
`globe-api-internal` en modo `api`. El Model Lab se habilitó sólo en `api`, pero ese cambio no reemplazó el Studio.

Hoy no existe una ADR que decida dónde termina `globe.efeoncepro.com`. Adoptar un Global External Application Load
Balancer consolidaría Cloud Run como web/BFF para esta release y agrega costo fijo; mover la web a Vercel exige una
migración real de runtime, OAuth/sesión, WIF, observabilidad y trust boundary. Además, sesiones, transacciones OAuth,
experimentos, evaluaciones y spend fence siguen en memoria, y los servicios Cloud Run vivos aún no están gobernados
íntegramente por Terraform. Resolver el dominio sin cerrar esta decisión convertiría el piloto accidental en
arquitectura sin ownership ni criterios de reversión.

## Goal

- Emitir una ADR aceptada que elija el hosting del web/BFF y el front door para la release internal-only y declare
  explícitamente cuándo reconsiderarlo.
- Definir dónde termina `globe.efeoncepro.com`, cómo permanece privada `globe-api-internal` y qué contratos de
  DNS, TLS, OAuth, ingress, IAM, observabilidad, costo y rollback debe implementar la task sucesora.
- Ordenar el grafo de EPIC-028 para que dominio estable, persistencia durable, ejecución async y acceso externo no se
  confundan entre sí.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`

Reglas obligatorias:

- Globe conserva runtime, datos, assets, secretos y ejecución propios; Greenhouse no hospeda lógica creativa ni
  comparte DB, cookie o credenciales de provider.
- El dominio browser-facing nunca sustituye el audience exacto de `globe-api-internal`; la API permanece privada y
  autenticada service-to-service.
- Un dominio internal-only no equivale a Production, alta disponibilidad ni autorización para clientes externos.
- No escalar `globe-studio-internal` por encima de una réplica mientras sesiones/transacciones OAuth sigan en memoria.
- La decisión debe privilegiar causa raíz, reversibilidad y costo total de operación; ahorrar el costo de un front
  door no justifica migrar silenciosamente auth/BFF entre clouds.

## Normative Docs

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/tasks/complete/TASK-1454-efeonce-globe-identity-sdk-bridge.md`
- `docs/tasks/complete/TASK-1455-globe-internal-launch-brand-shell.md`
- `docs/tasks/complete/TASK-1464-globe-iac-keyless-platform-foundation.md`
- `docs/tasks/to-do/TASK-1465-globe-workspace-tenancy-persistence-audit.md`
- `docs/tasks/to-do/TASK-1469-globe-governed-run-lifecycle-submission-fence.md`
- `docs/tasks/to-do/TASK-1474-globe-professional-studio-workbench.md`
- `docs/tasks/to-do/TASK-1475-globe-greenhouse-projections-events-deep-links.md`
- `docs/tasks/to-do/TASK-1480-globe-commercial-external-readiness-gate.md`
- `docs/tasks/to-do/TASK-1505-globe-creative-producer-surface.md`

## Dependencies & Impact

### Depends on

- Foundations completas `TASK-1454`, `TASK-1455`, `TASK-1464` y `TASK-1481`.
- Runtime vivo verificable en GCP: `globe-studio-internal` (`web`) y `globe-api-internal` (`api`) en
  `southamerica-west1`.
- Documentación oficial vigente de Google Cloud y Vercel para custom domains, Cloud Run ingress/serverless NEG,
  OIDC/WIF, límites runtime y pricing.

### Blocks / Impacts

- Debe cerrarse antes de implementar la primera superficie humana funcional de `TASK-1505` y antes del rollout del
  workbench de `TASK-1474`.
- Debe cerrarse antes del canary/cutover de `TASK-1469`, que requiere una public base URL HTTPS estable.
- Debe cerrar el URL canónico antes de publicar deep links en `TASK-1475`.
- La implementación internal-only derivada puede preceder `TASK-1480`; Production o clientes externos permanecen
  bloqueados por `TASK-1480` y un release posterior explícito.
- Debe aclarar si `TASK-1465` absorbe el store durable de sesión/OAuth bajo `apps/studio-web` o si nace una child task
  específica antes de permitir más de una réplica.

### Files owned

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (nuevo ADR)
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/` sólo para registrar la task sucesora y sincronizar dependencias/lifecycle.

No posee infraestructura ni código de runtime. Cualquier cambio futuro a `../efeonce-globe/infra/terraform/`,
`../efeonce-globe/apps/studio-web/`, GCP, Vercel, DNS u OAuth pertenece a la task de implementación derivada.

## Current Repo State

### Already exists

- `../efeonce-globe/apps/studio-web/src/main.ts` es un servidor Node nativo, no la implementación Next.js que aún
  describe la arquitectura objetivo histórica.
- El mismo artefacto se despliega en Cloud Run como web y API con `GLOBE_SERVICE_MODE` distinto.
- `globe-studio-internal` sirve shell/SSO humano; `globe-api-internal` sirve el workload privado y Model Lab.
- Cloud Run usa `min=0`, `max=1`; la API conserva IAM + verificación de ID token en app.
- `efeoncepro.com` usa DNS de terceros y `globe.efeoncepro.com` todavía no resuelve.

### Gap

- No existe ADR de hosting/frontend/front door ni owner de `globe.efeoncepro.com`.
- El runtime real y la arquitectura objetivo divergen (`node:http` vivo versus Next.js declarado).
- Los servicios Cloud Run y su postura de ingress/env/scale no están completamente bajo Terraform.
- La web usa stores en memoria y la identidad `globe-web-runtime` conserva permisos de provider que deben revisarse
  con least privilege antes de un rollout más amplio.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `decisión y gobierno en greenhouse-eo; runtime candidato en efeonce-globe/GCP o Vercel según ADR`
- Future candidate home: `remain-shared`
- Boundary: `browser front door de Globe, web/BFF y API privada; sin mover dominio creativo a Greenhouse`
- Server/browser split: `browser sólo entra por el front door web; OAuth/session/BFF server-side; API/provider/secrets privados`
- Build impact: `none en esta task; la ADR debe declarar el build/deploy impact de cada alternativa`
- Extraction blocker: `OAuth callback y session store in-memory, WIF project scoping, API audience y runtime drift`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline verificable y matriz de decisión

- Congelar la topología viva, costos/configuración, modos `web|api`, IAM, ingress, env, scaling, persistencia y
  workflow de deploy sin imprimir secretos.
- Comparar como mínimo: (A) Cloud Run web/BFF + Global External Application Load Balancer/serverless NEG y
  (B) Vercel web/BFF + `globe-api-internal` privado mediante OIDC/WIF.
- Evaluar costo fijo/variable, latencia, auth/PKCE/cookies, stores durables, límites de runtime, previews/rollback,
  observabilidad, blast radius, vendor lock-in, IAM y carga operativa a 12/36 meses.

### Slice 2 — ADR y arquitectura objetivo por horizonte

- Emitir `EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` con decisión, alternativas, consecuencias,
  reversibilidad, confidence, validated-as-of y triggers de reconsideración.
- Definir por separado: front door internal-only inmediato, target antes de Production y condiciones para una futura
  migración de frontend si se elige Cloud Run para esta release.
- Definir el contrato de dominio/TLS/DNS/OAuth/ingress y confirmar que `globe-api-internal` no recibe custom domain
  ni exposición browser.
- Resolver el drift entre Next.js objetivo y servidor Node vivo: adoptar explícitamente uno, o declarar migración
  y su owner antes de `TASK-1505`.

### Slice 3 — Grafo ejecutable y handoff

- Registrar una task de implementación separada, con paths/owner/ADR exactos, plan Terraform o Vercel, preflight de
  DNS/OAuth, smoke, observabilidad, costo y rollback; la ADR por sí sola no autoriza apply.
- Corregir dependencias de `TASK-1465`, `TASK-1469`, `TASK-1474`, `TASK-1475` y `TASK-1505` sólo donde el resultado
  de la ADR sea load-bearing.
- Declarar el gate durable de sesiones/OAuth/experimentos/evaluaciones/spend fence y el ownership de IAM/secret
  least privilege antes de escalar o habilitar clientes.

## Out of Scope

- Crear, actualizar o borrar recursos GCP/Vercel, proyectos, load balancers, serverless NEGs, IPs o certificados.
- Cambiar DNS de `efeoncepro.com`, `GLOBE_PUBLIC_BASE_URL`, redirect URIs OAuth, ingress, IAM, secrets o tráfico.
- Migrar `apps/studio-web`, implementar Next.js, crear un proyecto Vercel o cambiar el workflow Cloud Run.
- Implementar persistencia durable, ejecución async, workbench, Producer UI o deep links.
- Habilitar Production, clientes externos, pricing, publicación o gasto adicional de providers.

## Detailed Spec

La ADR debe distinguir tres afirmaciones que hoy aparecen mezcladas:

1. **URL estable internal-only:** puede habilitarse antes de `TASK-1480` si conserva SSO/capabilities, una réplica y
   rollback explícito; no constituye disponibilidad productiva.
2. **Escalabilidad/HA:** requiere stores durables y ejecución async antes de aumentar réplicas o prometer continuidad.
3. **Acceso externo/Production:** requiere `TASK-1480`, rollout dedicado y evidencia legal/security/finance/ops.

Si la ADR conserva Cloud Run para esta release, la implementación sucesora debe evaluar como baseline recomendado:
IP global, Global External Application Load Balancer, serverless NEG `southamerica-west1` sólo hacia
`globe-studio-internal`, certificado administrado, HTTP→HTTPS, DNS, `GLOBE_PUBLIC_BASE_URL`, callback OAuth exacto,
smokes y posterior ingress `internal-and-cloud-load-balancing`; `globe-api-internal` queda IAM-private con audience
`run.app`. El mapping directo de Cloud Run no es candidato productivo mientras siga Preview/no disponible en la región.

Si la ADR elige Vercel, la task sucesora debe tratarlo como migración: proyecto dedicado Globe, build/runtime,
durable sessions, OAuth/BFF, WIF scoped al nuevo project/environment, trusted actor/audit, observabilidad cross-cloud,
cutover y rollback. Un rewrite cosmético hacia `run.app` no satisface el contrato.

## Rollout Plan & Risk Matrix

Task de decisión sin mutación runtime. Su rollout es documental y afecta qué implementación puede comenzar.

### Slice ordering hard rule

- Baseline verificable → matriz comparativa → ADR aceptada → task sucesora → sincronización del grafo.
- Ninguna infraestructura, DNS, OAuth o exposición puede mutarse antes de aceptar la ADR y aprobar el plan de la
  task sucesora.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Consolidar un piloto accidental como arquitectura definitiva | Globe platform | high | ADR con horizonte/revisit trigger y comparación real | implementación de dominio sin ADR aceptada |
| Migrar a Vercel sólo para ahorrar el front door | Auth/runtime | medium | valorar costo total y contratos WIF/session, no sólo fee mensual | rewrite/proxy sin trusted actor ni store durable |
| Llamar escalable a un backend in-memory | Session/Lab | high | gate max=1 + owner durable explícito | más de una réplica o restart con pérdida de estado |
| Exponer API o secretos mediante el front door web | Security | low | dominio sólo web, IAM privado, least-privilege audit | API browser-reachable o web runtime leyendo provider secrets |
| Drift entre Terraform y deploy workflow | Cloud/IaC | medium | definir ownership por campo y drift gate en task sucesora | console mutation no representada en plan |
| Dominio internal-only interpretado como Production | Product/Ops | medium | estados/gates separados en ADR y handoff | cliente externo habilitado antes de TASK-1480 |

### Feature flags / cutover

N/A — esta task no cambia runtime. La ADR debe exigir defaults fail-closed y cutover reversible en la task sucesora.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Baseline/matriz | corregir evidencia y reemitir la comparación | <30 min | sí |
| ADR | marcar `superseded` mediante nueva decisión; nunca reescribir historia | depende de evidencia | sí, con nueva ADR |
| Grafo/handoff | revert documental y restaurar dependencias previas | <30 min | sí |

### Production verification sequence

N/A — no hay despliegue. Verificación: fuentes oficiales actuales + runtime read-only + consistencia documental +
gates de task/ops/docs. La task sucesora define staging/canary/cutover/rollback.

### Out-of-band coordination required

- Owner de GCP/billing e infraestructura Globe.
- Owner del DNS `efeoncepro.com` en HostGator y verificación de propiedad del dominio.
- Owner del OAuth broker/redirect allowlist en Greenhouse.
- Product/Security para aceptar explícitamente internal-only versus Production.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una ADR aceptada que decide Cloud Run+ALB o Vercel+Cloud Run para la release actual y declara horizonte,
      alternativas, costo, consecuencias, reversibilidad, confidence y triggers de reconsideración.
- [ ] El ADR identifica inequívocamente dónde termina `globe.efeoncepro.com`; `globe-api-internal` permanece privado
      y su Google ID-token audience no se deriva del dominio browser.
- [ ] El drift Next.js objetivo versus Node nativo vivo queda resuelto o asignado con owner/gate anterior a 1505.
- [ ] El dominio internal-only, la escalabilidad/HA y Production/clientes externos quedan modelados como gates distintos.
- [ ] Existe una task sucesora de implementación; la ADR no se interpreta como autorización de apply.
- [ ] El owner de sesión/OAuth durable bajo `apps/studio-web` queda dentro de `TASK-1465` o en una child task explícita.
- [ ] La task sucesora incluye ownership Terraform/deploy de servicios, ingress, scale/env, OAuth, DNS/TLS,
      observabilidad, costo, least privilege, smoke y rollback.
- [ ] `TASK-1469`, `TASK-1474`, `TASK-1475` y `TASK-1505` expresan dependencias coherentes con la decisión.
- [ ] Ningún recurso, DNS, OAuth, IAM, secreto, flag, tráfico o cliente externo cambia durante esta task.

## Verification

- `pnpm task:lint --task TASK-1506`
- `pnpm ops:lint --changed`
- `pnpm docs:context-check`
- `pnpm docs:closure-check`
- Revisión manual de runtime GCP y Vercel en modo read-only, sin imprimir secretos.
- Verificación de fuentes oficiales de Google Cloud y Vercel con fecha registrada en la ADR.

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados con el estado real.
- [ ] `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y EPIC-028 sincronizados.
- [ ] `docs/architecture/creative-studio/DECISIONS_INDEX.md` registra la ADR.
- [ ] `GLOBE_RUNTIME_HANDOFF.md` declara decisión, límites y siguiente paso ejecutable.
- [ ] La task sucesora queda registrada, pero ningún apply/cutover queda implícitamente autorizado.
- [ ] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.

## Follow-ups

- Task de implementación del front door/custom domain según la alternativa aceptada.
- Scope durable de sesión/OAuth y stores de runtime antes de `max instances > 1`.
- Release externo posterior a `TASK-1480` si se habilitan Production o clientes.

## Open Questions

- ¿El dominio internal-only debe salir inmediatamente tras la ADR o junto al primer slice funcional de Producer?
- ¿La arquitectura objetivo conserva Next.js como requisito o adopta formalmente el servidor Node nativo para esta release?
