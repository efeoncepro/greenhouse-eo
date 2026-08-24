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
- Status real: `Diseño aprobado; precondiciones de runtime abiertas (ver Delta 2026-08-24)`
- Rank: `TBD`
- Domain: `delivery|ui|content|agency`
- Blocked by: `unsubscribe-mechanism-repair (ID por reservar)`
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

## Delta 2026-08-24 — verificación contra runtime

Revisión con `arch-architect` + `greenhouse-email` + skills de marca, ejercitando el runtime real en vez de la
documentación. El gobierno de la migración se confirma y no cambia: legacy por defecto, cohorts de máximo cuatro
tipos, prohibición de big-bang y rollback por tipo siguen siendo la forma correcta. Lo que cambia es lo que la
implementación debe cerrar **antes** de promover un tipo. Detalle en
`GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md` §`Delta 2026-08-24`.

| Hallazgo | Efecto sobre esta task |
|---|---|
| El mecanismo de baja no es accionable por ningún método (link GET → 405, one-click POST → 500, POST → 400) y el default `?? 'broadcast'` lo agrega solo en el carril batch | Precondición bloqueante fuera de la umbrella; ningún tipo declara `required` antes |
| Tres decisores gobiernan el unsubscribe y ya divergen; cero tests de coherencia | Entregable de foundation |
| `en-US.emails` es un alias del objeto es-CL; el bug ya es visible en correos en inglés | Entregable de foundation |
| Cero archivos de correo tocan identidad legal; hay tres políticas de ausencia distintas en el repo | Entregable de foundation + decisión adoptada en la ADR |
| El envío es multi-runtime: 20 worker, 6 Vercel, 3 ambos, 1 sin emisor | Secuencia de despliegue, rollback y canary |
| El lockup `Efeonce Greenhouse` sobrevive en cinco cadenas | Child task 0 (`TASK-1274` reanclada) |

Correcciones a supuestos previos de esta task, verificadas: el masthead **ya** usa el wordmark de Efeonce en las 30
plantillas —la deuda de marca es de copy, no de logo, y Greenhouse sí es una marca del portafolio (platform brand)—;
y el footer **sí** tiene red de regresión, porque vive en un solo archivo cubierto por `EmailLayout.test.tsx` y por
los 17 snapshots de `EmailTemplateBaseline`. El hueco de cobertura es de cuerpo (11 plantillas sin caso), no de pie,
y pertenece a las cohorts, no a la foundation.

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
- `docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `src/views/greenhouse/admin/email-footer-profiles/mockup/EmailFooterProfilesMockupView.tsx`
- `src/views/greenhouse/admin/email-footer-profiles/mockup/data.ts`
- `public/branding/email/footer/*`
- `scripts/email/generate-footer-assets.mjs`

Reglas obligatorias:

- **Efeonce lidera; Greenhouse es la platform brand, nunca un lockup compuesto.** Son capas distintas de la misma
  jerarquía, no alternativas excluyentes. Efeonce lidera la identidad remitente y visual; Greenhouse se nombra en
  sintaxis de endoso cuando aporta claridad (`Enviado desde Greenhouse, la plataforma de Efeonce`). **`Efeonce
  Greenhouse` queda prohibido en cualquier superficie**, con o sin `™`. Canon:
  `EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md` §4 + `09_marca-agencia.md` §Arquitectura de marca.
- **Nombrar Greenhouse a quien no usa la plataforma no aclara: confunde.** La audiencia es dimensión de policy, no
  preferencia local del template.
- `EmailPriority` no determina propósito ni footer: `broadcast !== marketing`.
- Todo tipo nace con política de unsubscribe `forbidden`; sólo una clasificación explícita como suscripción
  opcional o marketing puede cambiarla a `required`.
- **Ningún tipo puede declarar `required` mientras el mecanismo de baja no funcione en sus tres capas** (link GET,
  header one-click RFC 8058 y handler). Hoy no funciona en ninguna; ver Delta 2026-08-24.
- **El registro de policy es el único decisor del unsubscribe.** `BROADCAST_EMAIL_TYPES`, el gate del carril batch y
  el default `?? 'broadcast'` se derivan de él, se retiran, o rompen el build por divergencia.
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
- La lámina `/admin/emails/footer-profiles/mockup` ya fue revisada y define el punto de partida aprobado para los
  cinco grupos visuales: operación interna, acceso y seguridad, relación y servicio, operaciones reguladas, y
  marketing y suscripciones.
- La vista, sus fixtures, el SSOT de marca, los PNG transparentes y los contratos UI ya fijan jerarquía, copy de
  referencia, responsive desktop/mobile, legal, controles y RRSS. No corresponde rediseñarlos al implementar.

### Gap

- No existe una política exhaustiva de presentación por `EmailType`.
- La marca se modela como `greenhouse|efeonce`, aunque Greenhouse es plataforma de Efeonce, no masterbrand paralela.
- Footer, firma, disclaimer, ayuda, preferencias e identidad legal están mezclados.
- RRSS, dirección y notas legales no tienen eligibility ni fuente tipada por `EmailType`.
- No hay cutover por tipo: modificar el layout compartido puede alterar 28 templates simultáneamente.
- El mockup todavía no es un primitive React Email ni está conectado a una policy exhaustiva por `EmailType`;
  sus fixtures de aprobación no son un SSOT runtime.
- El mecanismo de baja no es accionable por ningún método y el sistema lo agrega por defecto al carril batch.
- Tres decisores gobiernan hoy el unsubscribe (`EMAIL_PRIORITY_MAP`, `BROADCAST_EMAIL_TYPES`, rama batch/secuencial)
  sin ningún test de coherencia entre ellos.
- El namespace `emails` de `en-US` es un alias del objeto es-CL; el tipo queda satisfecho y el build verde.
- Ningún archivo de `src/lib/email/**` ni `src/emails/**` toca identidad legal, y no existe política de ausencia.
- El envío es multi-runtime: 20 tipos salen del ops-worker, 6 de Vercel, 3 de ambos y 1 no tiene emisor.
- La cadena `Efeonce Greenhouse` sobrevive en remitente, tagline, alt del logo y dos cuerpos de invitación, con tres
  comentarios en el código que ya la declaran deuda y un test que la prohíbe sólo en una superficie.

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

- Route / surface: previews React Email; la referencia aprobada vive en `/admin/emails/footer-profiles/mockup` y
  no es una ruta productiva de correo
- Primitive / variant / kind: `EmailFooter` + perfiles semánticos de policy
- Component candidates: `src/emails/components/EmailLayout.tsx`, nuevo `EmailFooter.tsx`
- Copy source: `src/lib/copy/dictionaries/es-CL/emails.ts` con paridad locale vigente
- Approved presentation source: vista + data del mockup, `src/config/efeonce-brand.ts`,
  `public/branding/email/footer/*`, wireframe y dirección visual de `TASK-1764`
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
- Mockup audit 2026-08-23: cinco perfiles revisados en desktop/mobile (10 estados), sin overflow; contraste mínimo
  4.51:1; controles de texto con target de 24 px, RRSS 32 × 32 px y foco visible de 2 px.
- Semántica verificada: headings `h1 → h2 → h3`, footer sin headings, controles/RRSS/legal como listas nativas y
  matriz de policy como tabla nativa con instrucción de scroll en móvil.
- GVC local final: 1440 × 900 e iPhone 13 con `consoleErrorCount=0`, `pageErrorCount=0`,
  `hydrationWarningCount=0`, `httpFailureCount=0` y `qualityFindings=[]`; los dossiers viven en `.captures/` y no
  prueban React Email ni rollout.

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

Esta umbrella formaliza policy, dirección visual, cohorts, gates y child-task boundaries, y conserva el mockup local
aprobado. No implementa el primitive React Email, policy runtime, cohorts, envío ni rollout.

**Precondición fuera de esta umbrella (bloqueante):** el arreglo del mecanismo de unsubscribe —link, header
one-click y handler— más el retiro del default `?? 'broadcast'`. No es trabajo de footer y no puede resolverse dentro
de una cohorte de presentación; ver Delta 2026-08-24 §D1. Ninguna cohorte declara `required` antes de ese cierre.

Orden de child tasks obligatorio:

0. Alineación de marca (`TASK-1274`, reanclada al epic): retirar el lockup `Efeonce Greenhouse` de los cinco sitios.
   Es cambio de cadenas, no de estructura; rompe a propósito los 17 snapshots y los tests que hoy lo afirman.
1. Foundation compatible: baseline exhaustivo, policy registry y primitive con `legacy` como default; cero bytes
   visibles modificados. Entregables adicionales no negociables, todos verificables sin promover ningún tipo:
   (a) test de coherencia policy ↔ `EMAIL_PRIORITY_MAP` ↔ carril de envío, molde `candidate-reply-to.test.ts`;
   (b) `dictionaries/en-US/emails.ts` real + test de paridad por mecánica, molde
   `hiring-desk-stage-locale-parity.test.ts`;
   (c) hidratación de la identidad legal en el contexto antes de `resolveTemplate`, con la degradación del
   `efeonce-pdf-footer` portada tal cual y señal de observabilidad al degradar;
   (d) índice único parcial sobre `is_operating_entity = TRUE`;
   (e) absorción de `AGENCY_BRANDED_EMAIL_TYPES` como dimensión `audience` de la policy —no borrarlo: hoy marca
   exactamente a los destinatarios que no usan la plataforma.
2. Canary interno: uno a cuatro tipos internos de bajo riesgo.
3. Transaccionales de producto por familia y máximo cuatro tipos por task.
4. Access/security, Hiring externo y regulated transactional en tasks separadas; nunca comparten release.
5. Suscripción opcional/marketing sólo después de confirmar que existe un tipo real y su fuente de consentimiento.
6. Retiro del legacy únicamente cuando los 30 tipos tengan evidencia y aceptación individual.

### Contrato aprobado de implementación

La foundation y las cohorts parten de `/admin/emails/footer-profiles/mockup`; no vuelven a diseñar el footer. Deben
traducir su composición a HTML/estilos compatibles con React Email conservando:

- paridad visual a 720 px y 390 px, sin overflow y con degradación legible cuando las imágenes estén bloqueadas;
- wordmark Efeonce gris, separación clara respecto de firma/cuerpo y jerarquía tipográfica/color definida;
- razón social, RUT y casa matriz en todos los perfiles gobernados; países sólo en modo `full`;
- RRSS institucionales sólidas y redondeadas únicamente donde la policy las permite, con accessible name;
- preferencias, baja, privacidad, ayuda, nota legal y referencia sólo cuando la policy del `EmailType` lo exige.

Los cinco perfiles del mockup son grupos de presentación para aprobación. No colapsan los `purpose` de la ADR ni
autorizan importar `FOOTER_PROFILE_MOCKS` en producción. La implementación resuelve policy/copy/operating entity por
los caminos canónicos. Una diferencia sólo es admisible si una limitación medida de cliente de correo,
accesibilidad o dato runtime la exige; requiere evidencia before/after y aprobación explícita.

Mapping obligatorio de presentación a policy:

| Perfil visual             | `purpose`                                             | Regla diferencial                                                                   |
| ------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Operación interna         | `internal_operational`                                | Referencia operativa condicional                                                    |
| Acceso y seguridad        | `access_security`                                     | Ayuda/nota de seguridad condicional                                                 |
| Relación y servicio       | `transactional_service`, `relationship_transactional` | Contexto y reply/help por tipo                                                      |
| Operaciones reguladas     | `regulated_transactional`                             | Nota, referencia y controles por obligación                                         |
| Marketing y suscripciones | `optional_subscription`, `commercial_marketing`       | Baja requerida en ambos; RRSS opcionales en suscripción y obligatorias en marketing |

## Out of Scope

- Modificar hoy `EmailLayout`, templates, sender, reply-to, Resend, tracking, dominios, flags o runtime.
- Crear campañas, marketing automation, nuevas suscripciones o preferencias.
- Agregar unsubscribe a mensajes transaccionales.
- Cambiar asuntos, cuerpos, CTAs, imágenes o lógica de negocio durante una migración de footer.
- Migrar paleta AXIS, responsabilidad de `TASK-1057`.

## Detailed Spec

La umbrella no ejecuta cohorts. La ADR contiene la decisión compartida; el mockup aprobado, el wireframe y la
dirección visual contienen la referencia concreta de composición y contenido. Cada child task debe copiar únicamente
los tipos de su familia, declarar baseline, diff permitido, fixture, preview, paridad con el mockup, canary y
rollback. Cualquier child que intente rediseñar sin evidencia, modificar el default global o agrupar más de cuatro
tipos contradice esta task y debe detenerse antes de código.

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
| Skew entre runtimes emisores     | delivery            | high         | mapear runtimes por tipo; desplegar y revertir en todos  | el mismo tipo rinde dos footers según automático vs reenvío |
| Footer es-CL a destinatario en inglés | content/i18n   | high         | `en-US/emails.ts` real + test de paridad por mecánica    | copy del diccionario sale en castellano con locale `en` |
| Identidad legal stale o divergente | legal/content     | medium       | operating entity + cierre previo de `TASK-1650`          | la dirección del correo no coincide con la lámina aprobada |

### Feature flags / cutover

No se define un flag global en la umbrella. Cada `EmailType` conserva `legacy` hasta que su child task cambie la
asignación explícita. El kill-switch existente puede detener despacho, pero no sustituye rollback visual.

### Rollback plan per slice

| Slice           | Rollback                                                                        | Tiempo     | Reversible? |
| --------------- | ------------------------------------------------------------------------------- | ---------- | ----------- |
| Foundation      | revert del child commit; output legacy debe ser byte-idéntico                   | un release | sí          |
| Cohort por tipo | restaurar asignación `legacy` sólo para esos tipos y redeploy de **todos** los runtimes emisores | un release | sí |
| Retiro legacy   | no inicia sin 30/30 tipos aceptados; revert restaura primitive legacy           | un release | sí          |

### Production verification sequence

1. Capturar baseline legacy por tipo antes del cambio.
2. Ejecutar tests/render/HTML diff local; cualquier cambio fuera del footer bloquea.
3. Revisar desktop 720 px, mobile 390 px y versión sin imágenes.
4. Renderizar la matriz mínima: Outlook Desktop Windows (motor Word), Outlook Web, Gmail y un cliente WebKit.
5. Bloquear imágenes y verificar lectura, identidad y fallback textual/accesible de RRSS.
6. Obtener aprobación explícita del operador para esa cohorte.
7. Mapear los runtimes emisores de cada tipo de la cohorte antes de desplegar. El envío ocurre en el proceso que
   invoca `sendEmail`: 20 tipos salen del ops-worker, 6 de Vercel y 3 de ambos. `payroll_export`, `payroll_receipt` y
   `notification` exigen los dos despliegues; un despliegue parcial hace que el mismo documento salga con dos footers
   según haya sido automático o reenviado a mano.
8. Desplegar la cohorte en **todos** sus runtimes emisores y realizar un canary consentido; no enviar correos reales
   por inferencia. Ejercitar además el carril de reintento del admin y `/api/admin/emails/preview`, que re-renderizan
   cualquier tipo desde Vercel.
9. Verificar proveedor, cliente real, links, reply-to y ausencia/presencia correcta de unsubscribe.
10. Verificar identidad legal contra la base, no contra el fixture: razón social, RUT y casa matriz deben coincidir
    con el operating entity vigente, y la degradación a constantes debe haber emitido señal si ocurrió.
11. Documentar aceptación o rollback antes de abrir la siguiente child task.

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

- [ ] La ADR fija Efeonce como marca que lidera y Greenhouse como platform brand nombrable por endoso, alineada a
      `EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`.
- [ ] El lockup `Efeonce Greenhouse` no existe en ninguna superficie de correo: remitente, tagline, alt del logo y los
      dos cuerpos de invitación (es-CL y en-US).
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
- [ ] Los 30 `EmailType` están inventariados y asignados a una cohorte, sin promoverlos todavía. El inventario
      declara el runtime emisor de cada uno y registra que `payroll_liquidacion_v2` tiene template y preview pero
      **ningún emisor**: se resuelve si es futuro o quedó huérfano antes de clasificarlo.
- [ ] Existe una child task foundation cuyo criterio principal es output byte-idéntico para los 28 templates.
- [ ] Cada child task posterior cubre una sola familia y máximo cuatro tipos.
- [ ] Ninguna child task puede comenzar hasta cerrar evidencia y canary de la anterior.
- [ ] No existe un cutover global de `EmailLayout` ni un flag que active todos los footers a la vez.
- [ ] Firma y footer se documentan como primitives separados.
- [ ] Cada cohorte declara rollback a `legacy` por tipo.
- [ ] La task declara `Execution profile: ui-ux`, `UI impact: primitive` y un wireframe existente.
- [x] `/admin/emails/footer-profiles/mockup`, su vista/data, `src/config/efeonce-brand.ts`, assets PNG y docs UI
      figuran como contrato aprobado de partida; los fixtures no se importan como policy runtime.
- [ ] Foundation y cohorts prueban paridad 720/390 con el mockup en jerarquía, espaciado, color, legal, RRSS y
      controles, además de la versión con imágenes bloqueadas.
- [ ] Toda desviación del mockup identifica una limitación medida, adjunta before/after y tiene aprobación explícita.
- [ ] Los cinco perfiles visuales mapean explícitamente a los siete `purpose`; `optional_subscription` y
      `commercial_marketing` conservan reglas distintas de RRSS aunque compartan presentación base.
- [ ] Cada cohorte prueba Outlook Desktop Windows, Outlook Web, Gmail, un cliente WebKit e imágenes bloqueadas, con
      fallback textual y nombre accesible para cada RRSS.
- [ ] `UI ready` permanece `no` hasta que las child tasks posean mapping, GVC y decision log propios.
- [ ] El copy reusable se resuelve desde `src/lib/copy/*`; datos legales usan el SSOT de operating entity.
- [ ] El footer es completamente estático y el email conserva significado sin imágenes.
- [ ] Wordmark e íconos sociales usan PNG transparentes reproducibles mediante
      `scripts/email/generate-footer-assets.mjs`; el HTML del correo no depende de `next/image`, icon fonts, SVG
      remoto ni filtros CSS.
- [ ] El mecanismo de baja funciona en sus tres capas y el default `?? 'broadcast'` fue retirado, antes de que
      cualquier tipo declare `required`.
- [ ] Existe un test que rompe el build si la policy, `EMAIL_PRIORITY_MAP` y el carril de envío divergen sobre qué
      tipo lleva unsubscribe.
- [ ] Existe `dictionaries/en-US/emails.ts` real, el alias a es-CL fue retirado y un test de paridad detecta por
      mecánica que ambas claves vuelvan a ser el mismo objeto.
- [ ] La identidad legal se hidrata en el contexto antes de `resolveTemplate`, degrada a las constantes de marca con
      señal observable, y el RUT se omite cuando falta en vez de inventarse.
- [ ] `TASK-1650` está cerrada antes de promover cualquier cohorte que imprima casa matriz.
- [ ] Cada cohorte declara sus runtimes emisores y demuestra despliegue y rollback en todos ellos.
- [ ] La umbrella sólo puede cerrar cuando todas las child tasks estén cerradas con rollout honesto o formalmente retiradas.

## Verification

- `pnpm task:lint --task TASK-1764`
- `pnpm ui:wireframe-check --task TASK-1764`
- `pnpm docs:closure-check`
- `pnpm qa:gates --changed --agent codex --task TASK-1764 --ui --docs`
- `pnpm design:lint`
- `pnpm exec eslint src/views/greenhouse/admin/email-footer-profiles/mockup/{EmailFooterProfilesMockupView.tsx,data.ts}`
- `pnpm exec tsc --noEmit --pretty false`
- GVC local desktop + iPhone 13 sobre `/admin/emails/footer-profiles/mockup`, más loop Playwright de 10 estados
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

- `weekly_executive_digest` es el caso que fuerza la definición: hoy lleva baja cuando va a varios destinatarios y
  no la lleva cuando va a uno. Clasificarlo resuelve de paso el contrato de los digest.
- Qué canal de soporte/reply está atendido para cada familia; no mostrar uno sin readback operativo.
- Casa matriz: `of 05` (base) u `Of 1105` (constante de marca y lámina aprobada). Decisión del operador, dueña
  `TASK-1650`. Bloquea toda cohorte que imprima identidad legal.
- Display name definitivo del remitente único (`Efeonce`), y su aplicación en Vercel y ops-worker como cambio de env
  var verificado en ambos.
- `payroll_liquidacion_v2`: ¿tipo futuro o huérfano? Hoy nadie lo emite.
