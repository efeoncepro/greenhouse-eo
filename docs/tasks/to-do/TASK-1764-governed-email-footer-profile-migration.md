# TASK-1764 — Governed Email Footer Profile Migration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `umbrella`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1764-email-footer-policy-profiles.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-042`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|ui|content|agency`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Gobierna la migración incremental de los footers de correo hacia perfiles canónicos resueltos por `EmailType`.
Efeonce será siempre la marca principal; Greenhouse sólo podrá aparecer como la plataforma de Efeonce. La umbrella
prohíbe un reemplazo global de `EmailLayout`: cada cohorte tendrá task, evidencia, canary y rollback propios.

## Why This Task Exists

El runtime tiene 30 `EmailType` y 28 templates productivos que consumen `EmailLayout`, pero el footer compartido
aplica el mismo disclaimer a contextos incompatibles. Ocho templates agregan además un segundo cierre dentro del
cuerpo y sólo tres conectan `unsubscribeUrl`. El resultado depende de decisiones locales del agente: un candidato
puede recibir “contacta a tu administrador”, mientras prioridad técnica `broadcast` se confunde con marketing.

Email es una de las superficies más estables del producto. Corregir esta deuda con un big bang aumentaría el blast
radius sobre auth, Hiring, Payroll, Finance, Growth y operaciones. La migración debe conservar el HTML legacy por
defecto y promover un conjunto pequeño de tipos sólo después de evidencia proporcional.

## Goal

- Definir una política exhaustiva `EmailType → EmailPresentationPolicy` que separe marca, propósito, respuesta,
  firma, preferencias y requisitos legales de la prioridad de entrega.
- Adoptar Efeonce como única marca principal de todos los correos; Greenhouse queda limitado a descriptor de
  producto o fuente operativa.
- Migrar por cohorts pequeñas, reversibles y verificadas, sin cambiar el footer global por herencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`
- `docs/epics/to-do/EPIC-042-efeonce-governed-email-presentation-program.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`

Reglas obligatorias:

- **Efeonce es siempre la marca principal.** Greenhouse sólo se nombra como plataforma/producto de Efeonce.
- `EmailPriority` no determina propósito ni footer: `broadcast !== marketing`.
- Todo tipo nace con política de unsubscribe `forbidden`; sólo una clasificación explícita como suscripción
  opcional o marketing puede cambiarla a `required`.
- Firma y footer son bloques distintos. Un template no inventa personas, equipos, reply-to ni identidad legal.
- RRSS nacen deshabilitadas y sólo se permiten en suscripción/marketing; son obligatorias en marketing y consumen
  YouTube, Instagram, LinkedIn y Threads desde `EFEONCE_SOCIAL_LINKS`. Dirección e identidad legal vienen del
  operating entity y las notas legales son específicas, nunca un disclaimer universal.
- Todo footer gobernado muestra como mínimo razón social, RUT y casa matriz. Es una decisión institucional
  conservadora de Efeonce, no una afirmación de que todas las jurisdicciones lo exijan para cada transaccional.
- El estado inicial de todo tipo es `legacy`; ningún cambio al primitive compartido altera automáticamente los
  correos no promovidos.
- Ninguna child task migra más de cuatro `EmailType` ni mezcla familias de dominio para “terminar más rápido”.
- No se inicia una cohorte externa si la anterior no tiene diff revisado, previews desktop/mobile, tests verdes,
  aprobación del operador y canary consentido verificado en un cliente real.
- Un correo transaccional no incorpora copy, CTA ni bloque promocional durante la migración.

## Normative Docs

- `docs/tasks/complete/TASK-408-copy-migration-notifications-emails.md`
- `docs/tasks/to-do/TASK-1057-email-palette-axis-adapter-migration.md`
- `src/config/efeonce-brand.ts`
- operating entity canónico `[resolver en child foundation; no hardcodear]`
- `src/lib/email/types.ts`
- `src/emails/components/EmailLayout.tsx`
- `src/lib/copy/dictionaries/es-CL/emails.ts`

## Dependencies & Impact

### Depends on

- `TASK-408` dejó copy institucional en el diccionario y snapshots parciales; esta umbrella no reabre su migración.
- La entrega centralizada, kill-switch por `email_type` y lifecycle de Resend existentes permanecen intactos.

### Blocks / Impacts

- Es la primera child de `EPIC-042` y debe cerrar inventario/decomposición antes de reservar la foundation.
- Bloquea cualquier migración masiva del footer o eliminación de `EmailBrand` sin child task aprobada.
- Las futuras child tasks impactarán `EmailLayout`, templates React Email, copy, previews y tests por cohorte.
- Coordina con `TASK-1057`: la política visual no adelanta la migración de paleta AXIS.

### Files owned

- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`
- `docs/ui/visual-directions/TASK-1764-email-footer-policy-profiles.md`
- `docs/ui/wireframes/TASK-1764-email-footer-policy-profiles.md`
- `docs/tasks/to-do/TASK-1764-governed-email-footer-profile-migration.md`

Las child tasks declararán ownership del código por cohort; esta umbrella no autoriza cambios de producción.

## Current Repo State

### Already exists

- `EmailLayout` centraliza masthead, contenedor, tagline, disclaimer y unsubscribe opcional.
- `EmailType`, `EMAIL_PRIORITY_MAP`, `AGENCY_BRANDED_EMAIL_TYPES` y reply-to viven en `src/lib/email/types.ts`.
- `src/config/efeonce-brand.ts` ya posee nombre, URL, slogan e identidad legal fallback canónicos.
- Resend ya diferencia prioridad, unsubscribe broadcast, suppression y entrega; no se crea otro sender.

### Gap

- No existe una política exhaustiva de presentación por `EmailType`.
- La marca se modela como `greenhouse|efeonce`, aunque Greenhouse es plataforma de Efeonce, no masterbrand paralela.
- Footer, firma, disclaimer, ayuda, preferencias e identidad legal están mezclados.
- RRSS, dirección y notas legales no tienen eligibility ni fuente tipada por `EmailType`.
- No hay cutover por tipo: modificar el layout compartido puede alterar 28 templates simultáneamente.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/emails/components/**`, `src/lib/email/**` y `src/lib/copy/**` dentro del runtime compartido
- Future candidate home: `ui-package`
- Boundary: `EmailPresentationPolicy` browser-safe + primitive React Email; templates consumen por `EmailType`
- Server/browser split: el contrato y copy son browser-safe; delivery, operating entity y provider permanecen server-only
- Build impact: `none`; no agrega dependencias ni filesystem inputs
- Extraction blocker: React Email y el registry de templates se compilan hoy dentro del runtime compartido y ops-worker

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: destinatarios externos e internos de correos Efeonce
- Momento del flujo: cierre persistente después del contenido principal del correo
- Resultado perceptible esperado: identificar a Efeonce, entender por qué llegó el correo y encontrar sólo las
  acciones de respuesta, preferencia o baja que correspondan
- Friccion que debe reducir: disclaimers genéricos, footers duplicados y unsubscribe fuera de contexto
- No-goals UX: rediseñar cuerpos, asuntos, CTAs, heroes o convertir el footer en una pieza promocional

### Surface & system decision

- Surface: footer compartido de React Email + previews del catálogo
- Nav placement: `none` — no agrega destino de navegación
- Composition Shell: `no aplica` — no es una superficie del portal
- Primitive decision: `new` — `EmailFooter` componible gobernado por `EmailPresentationPolicy`
- Adaptive density / The Seam: `no aplica` — renderer de email con estilos inline
- Floating/Sidecar/Dialog decision: no aplica
- Copy source: `src/lib/copy/dictionaries/*/emails.ts`
- Access impact: `none`

### State inventory

- Default: perfil legacy hasta promoción explícita del tipo
- Loading: fuera de scope; el email se renderiza completo antes del envío
- Empty: policy faltante rompe build/test; nunca se resuelve silenciosamente
- Error: render falla antes de entregar y conserva el lifecycle canónico de email
- Degraded / partial: cliente sin imágenes conserva toda la información textual
- Permission denied: fuera de scope
- Long content: footer no repite el cuerpo ni agrega párrafos promocionales
- Mobile / compact: una columna, links separables y sin overflow a 390 px
- Keyboard / focus: links con nombres inequívocos; orden DOM igual al orden visual
- Reduced motion: no existe motion

### Interaction contract

- Primary interaction: sólo links permitidos por la policy (`reply/support`, preferencias, unsubscribe, privacidad)
- RRSS: sólo links institucionales permitidos en suscripción/marketing; nunca CTA primario ni salida promocional en
  mensajes transaccionales
- Hover / focus / active: comportamiento nativo de link compatible con clientes de correo
- Pending / disabled: no aplica
- Escape / click-away: no aplica
- Focus restore: no aplica
- Latency feedback: no aplica
- Toast / alert behavior: no aplica

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica
- Layout morph: no aplica
- Stagger: no aplica
- Timing / easing token: no aplica
- Reduced-motion fallback: contenido estático equivalente
- Non-goal motion: cualquier animación en el footer

### Implementation mapping

- Route / surface: previews React Email; no ruta productiva nueva
- Primitive / variant / kind: `EmailFooter` + perfiles semánticos de policy
- Component candidates: `src/emails/components/EmailLayout.tsx`, nuevo `EmailFooter.tsx`
- Copy source: `src/lib/copy/dictionaries/es-CL/emails.ts` con paridad locale vigente
- Data reader / command: ninguno
- API parity: no aplica; no hay acción de negocio
- Access / capability: none
- States to implement: `legacy` y perfil promovido por `EmailType`; ausencia es error

### GVC scenario plan

- Scenario file: child task por cohorte; esta umbrella no crea escenario ejecutable global
- Route: catálogo/preview local de emails
- Viewports: 720 px desktop email + 390 px mobile
- Quality profile: `premium`
- Required steps: render legacy y candidate por tipo; comparar estructura y links
- Required captures: footer completo, unión cuerpo/firma/footer y versión sin imágenes cuando aplique
- Required `data-capture` markers: `email-footer`, `email-signature`, `email-unsubscribe` cuando exista
- Assertions: `scrollWidth === clientWidth`, links permitidos por policy, RRSS ausentes/presentes correctamente,
  identidad legal desde fixture gobernado y Efeonce como masterbrand
- Scroll-width checks: 720 y 390 px
- Reduced-motion / focus evidence: DOM/link order; motion no aplica
- Review dossier: uno por child task
- Baseline decision / surface ID: baseline legacy inmutable por `EmailType`

### Design decision log

- Decision: perfiles semánticos + bloques componibles con rollout explícito por tipo
- Alternatives considered: footer único global; footer libre por template; big-bang sobre `EmailLayout`
- Why this pattern: separa obligaciones y permite rollback pequeño sin duplicar JSX
- Reuse / extend / new primitive: nuevo primitive sobre tokens y layout existentes
- Open risks: clasificación incorrecta de mensajes mixtos y soporte real detrás de reply-to

### Visual verification

- GVC scenario: definido por cada child task
- Viewports: 720 y 390 px
- Required captures: before/after de cada tipo migrado
- Required `data-capture` markers: footer, firma y links
- Scroll-width check: obligatorio
- Accessibility/focus checks: contraste y orden/nombre de links
- Before/after evidence: obligatorio; diff fuera del footer bloquea promoción
- Known visual debt: `TASK-1057` gobierna paleta AXIS
- Visual scorecard: uno por cohorte cuando el cambio sea material
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

Esta umbrella sólo formaliza policy, dirección visual, cohorts, gates y child-task boundaries. No implementa código.

Orden de child tasks obligatorio:

1. Foundation compatible: baseline exhaustivo, policy registry y primitive con `legacy` como default; cero bytes
   visibles modificados.
2. Canary interno: uno a cuatro tipos internos de bajo riesgo.
3. Transaccionales de producto por familia y máximo cuatro tipos por task.
4. Access/security, Hiring externo y regulated transactional en tasks separadas; nunca comparten release.
5. Suscripción opcional/marketing sólo después de confirmar que existe un tipo real y su fuente de consentimiento.
6. Retiro del legacy únicamente cuando los 30 tipos tengan evidencia y aceptación individual.

## Out of Scope

- Modificar hoy `EmailLayout`, templates, sender, reply-to, Resend, tracking, dominios, flags o runtime.
- Crear campañas, marketing automation, nuevas suscripciones o preferencias.
- Agregar unsubscribe a mensajes transaccionales.
- Cambiar asuntos, cuerpos, CTAs, imágenes o lógica de negocio durante una migración de footer.
- Migrar paleta AXIS, responsabilidad de `TASK-1057`.

## Detailed Spec

La umbrella no define JSX final ni ejecuta cohorts. La ADR contiene la decisión compartida; el wireframe contiene
la anatomía y el mapping visual; cada child task debe copiar únicamente los tipos de su familia, declarar baseline,
diff permitido, fixture, preview, canary y rollback. Cualquier child que intente modificar el default global o
agrupar más de cuatro tipos contradice esta task y debe detenerse antes de código.

## Rollout Plan & Risk Matrix

Impact-only: toda implementación vive en child tasks pequeñas. `legacy` permanece como fallback hasta el cierre de
la última cohorte. No hay cutover global ni herencia automática desde `EmailLayout`.

### Slice ordering hard rule

Foundation byte-idéntica → canary interno → cohorts transaccionales pequeñas → access/security → Hiring externo →
regulated transactional → suscripción/marketing → retiro legacy. Un fallo detiene el grafo; no se “compensa”
migrando otra familia.

### Risk matrix

| Riesgo                           | Sistema             | Probabilidad | Mitigation                                               | Signal de alerta                                        |
| -------------------------------- | ------------------- | ------------ | -------------------------------------------------------- | ------------------------------------------------------- |
| Cambio global involuntario       | email UI            | high         | legacy default + child tasks + diff por tipo             | snapshots/capturas cambian fuera del footer             |
| Unsubscribe en transaccional     | delivery/compliance | medium       | policy `forbidden` por default + invariant test          | tipo forbidden renderiza unsubscribe                    |
| Marketing disfrazado de servicio | content/compliance  | medium       | no promotional content + revisión legal por jurisdicción | subject/body contiene promoción en perfil transactional |
| Marca Greenhouse paralela        | agency/UI           | medium       | Efeonce única masterbrand + snapshot assertion           | masthead/footer principal dice Greenhouse               |
| Cliente de correo rompe layout   | email UI            | medium       | inline/table-safe + canary real por cohorte              | overflow, links ilegibles o imágenes bloqueadas         |

### Feature flags / cutover

No se define un flag global en la umbrella. Cada `EmailType` conserva `legacy` hasta que su child task cambie la
asignación explícita. El kill-switch existente puede detener despacho, pero no sustituye rollback visual.

### Rollback plan per slice

| Slice           | Rollback                                                                        | Tiempo     | Reversible? |
| --------------- | ------------------------------------------------------------------------------- | ---------- | ----------- |
| Foundation      | revert del child commit; output legacy debe ser byte-idéntico                   | un release | sí          |
| Cohort por tipo | restaurar asignación `legacy` sólo para esos tipos y redeploy del runtime dueño | un release | sí          |
| Retiro legacy   | no inicia sin 30/30 tipos aceptados; revert restaura primitive legacy           | un release | sí          |

### Production verification sequence

1. Capturar baseline legacy por tipo antes del cambio.
2. Ejecutar tests/render/HTML diff local; cualquier cambio fuera del footer bloquea.
3. Revisar desktop 720 px, mobile 390 px y versión sin imágenes.
4. Obtener aprobación explícita del operador para esa cohorte.
5. Desplegar sólo la cohorte y realizar un canary consentido; no enviar correos reales por inferencia.
6. Verificar proveedor, cliente real, links, reply-to y ausencia/presencia correcta de unsubscribe.
7. Documentar aceptación o rollback antes de abrir la siguiente child task.

### Out-of-band coordination required

- Revisión del owner del dominio para cada cohorte.
- Validación con abogado habilitado antes de activar perfiles de marketing en una jurisdicción.
- Aprobación explícita para cada canary con destinatario real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La ADR fija Efeonce como única marca principal y Greenhouse como plataforma/producto.
- [ ] La policy separa `EmailPriority`, propósito, audience, reply, firma y unsubscribe.
- [ ] La policy incluye `socialLinksPolicy`, `legalIdentityMode` y `legalNoticePolicy` con defaults fail-closed.
- [ ] `unsubscribe` nace `forbidden` y sólo `optional_subscription|commercial_marketing` permiten `required`.
- [ ] RRSS nacen `none`; suscripción puede permitir `institutional`, marketing lo exige, y YouTube, Instagram,
      LinkedIn y Threads resuelven destino oficial desde `EFEONCE_SOCIAL_LINKS`, con nombre accesible y fallback
      textual.
- [ ] Razón social, RUT y casa matriz provienen del operating entity canónico; los países vienen del SSOT de marca,
      se muestran como lista compacta sin el rótulo `Operación en` y ningún template hardcodea esos datos, presenta
      los países como entidades legales locales ni usa Chile como límite geográfico.
- [ ] Todos los perfiles gobernados usan `legalIdentityMode='entity'` como mínimo; `full` agrega países y privacidad,
      pero nunca elimina razón social, RUT o casa matriz.
- [ ] No existe disclaimer legal universal; security/privacy/regulated se prueban por policy y propósito.
- [ ] Los 30 `EmailType` están inventariados y asignados a una cohorte, sin promoverlos todavía.
- [ ] Existe una child task foundation cuyo criterio principal es output byte-idéntico para los 28 templates.
- [ ] Cada child task posterior cubre una sola familia y máximo cuatro tipos.
- [ ] Ninguna child task puede comenzar hasta cerrar evidencia y canary de la anterior.
- [ ] No existe un cutover global de `EmailLayout` ni un flag que active todos los footers a la vez.
- [ ] Firma y footer se documentan como primitives separados.
- [ ] Cada cohorte declara rollback a `legacy` por tipo.
- [ ] La task declara `Execution profile: ui-ux`, `UI impact: primitive` y un wireframe existente.
- [ ] `UI ready` permanece `no` hasta que las child tasks posean mapping, GVC y decision log propios.
- [ ] El copy reusable se resuelve desde `src/lib/copy/*`; datos legales usan el SSOT de operating entity.
- [ ] El footer es completamente estático y el email conserva significado sin imágenes.
- [ ] Wordmark e íconos sociales usan PNG transparentes reproducibles mediante
      `scripts/email/generate-footer-assets.mjs`; el HTML del correo no depende de `next/image`, icon fonts, SVG
      remoto ni filtros CSS.
- [ ] La umbrella sólo puede cerrar cuando todas las child tasks estén cerradas con rollout honesto o formalmente retiradas.

## Verification

- `pnpm task:lint --task TASK-1764`
- `pnpm ui:wireframe-check --task TASK-1764`
- `pnpm docs:closure-check`
- Revisión manual contra los 30 `EmailType`, 28 consumers de `EmailLayout` y perfiles definidos en la ADR.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR, cohorts y estado de rollout quedaron sincronizados sin llamar “complete” a un diseño no desplegado.

## Follow-ups

- Crear una child task foundation después de aceptar la ADR.
- Crear cohorts sucesivas sólo cuando el gate anterior esté cerrado; reservar IDs justo antes de registrarlas.

## Open Questions

- Qué tipos de digest son servicio necesario y cuáles son suscripción opcional; resolver por propósito real.
- Qué canal de soporte/reply está atendido para cada familia; no mostrar uno sin readback operativo.
