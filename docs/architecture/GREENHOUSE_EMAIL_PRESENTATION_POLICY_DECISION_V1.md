# Greenhouse Email Presentation Policy Decision V1

- **Status:** Proposed
- **Date:** 2026-08-22
- **Owner:** Email Platform + Efeonce Brand; dominio dueño por `EmailType`
- **Scope:** `src/emails/**`, `src/lib/email/**`, `src/lib/copy/**`, sender/presentation metadata y previews
- **Reversibility:** two-way-but-slow
- **Confidence:** high en marca y separación semántica; medium en clasificación final de cada tipo
- **Validated as of:** 2026-08-22
- **Implementation umbrella:** `TASK-1764`
- **Program epic:** `EPIC-042`

## Context

Greenhouse entrega correo mediante React Email y una capa centralizada de Resend. El layout compartido mezcla hoy
masthead, marca, tagline, disclaimer, unsubscribe y ayuda bajo una única composición. Al mismo tiempo, varios
templates agregan cierres propios dentro del cuerpo. No existe una regla exhaustiva que responda qué footer
corresponde a cada `EmailType`.

La deuda no justifica un big bang: email es una superficie estable y de alto blast radius. Un cambio heredado desde
`EmailLayout` puede alterar simultáneamente auth, Hiring, Payroll, Finance, Growth y operaciones.

## Decision

### 1. Efeonce es la única marca principal

Todos los correos usan Efeonce como identidad remitente y visual. Greenhouse no es una segunda marca ni una opción
equivalente: es la plataforma de Efeonce y sólo puede aparecer como descriptor de producto o fuente operativa.

Patrón permitido: `Generado desde Greenhouse, la plataforma de Efeonce`.

### 2. Footer, firma y entrega son contratos separados

- La **firma** identifica a quien habla y vive al final del contenido principal.
- El **footer** identifica a Efeonce, explica el contexto de recepción y ofrece sólo acciones permitidas.
- `EmailPriority` controla entrega; nunca infiere marketing, consentimiento ni unsubscribe.
- Sender y reply-to se resuelven en la plataforma, no desde copy libre del template.

### 3. Política exhaustiva por tipo

La implementación objetivo tendrá un registro exhaustivo equivalente a:

```ts
EMAIL_PRESENTATION_POLICY satisfies Record<EmailType, EmailPresentationPolicy>
```

La policy separará como mínimo:

- `purpose`: access/security, transactional service, relationship transactional, regulated transactional,
  internal operational, optional subscription o commercial marketing;
- `replyMode`: monitored, support route o none;
- `signaturePolicy`: none, institutional team o runtime owner verificado;
- `unsubscribePolicy`: forbidden o required;
- `socialLinksPolicy`: none o institutional;
- `legalIdentityMode`: compact, entity o full;
- `legalNoticePolicy`: none, security, privacy o regulated;
- `rollout`: legacy o governed-v1.

Ausencia de policy es error de build/test, nunca fallback inferido.

### 4. Unsubscribe es excepción explícita

Todo tipo nace con `unsubscribePolicy='forbidden'`. Sólo `optional_subscription` y `commercial_marketing` pueden
declarar `required`. La prioridad `broadcast` no cambia esta regla.

Un transaccional no incorpora promoción durante la migración. Si asunto o cuerpo mezcla promoción, el tipo debe
reclasificarse y pasar revisión de consentimiento/compliance antes de enviarse.

Fuentes regulatorias usadas para la dirección —orientación, no asesoría legal—:

- FTC, CAN-SPAM: los mensajes puramente transaccionales/de relación están exentos de la mayoría de sus reglas;
  los mensajes mixtos se evalúan por su propósito principal:
  https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- ICO, PECR: los mensajes puramente administrativos o de servicio no son marketing directo; agregar promoción
  cambia la clasificación:
  https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/key-concepts-for-direct-marketing-using-electronic-mail/
- Chile, Ley 19.496 artículo 28 B: la vía de suspensión se exige a comunicaciones promocionales o publicitarias:
  https://www.bcn.cl/leychile/navegar?idNorma=61438&idParte=8542485

La activación de marketing internacional requiere validación con abogado habilitado en cada jurisdicción.

### 5. RRSS, dirección e información legal son bloques gobernados

- `socialLinksPolicy` nace `none`. Sólo `optional_subscription|commercial_marketing` pueden declarar
  `institutional`; access/security, transactional, Hiring, regulated e internal operational las prohíben.
- RRSS usan cuentas oficiales y activas desde un SSOT; los íconos son secundarios, monocromáticos, con nombre
  accesible y fallback textual. No se agregan parámetros de tracking por inferencia.
- `legalIdentityMode='compact'` muestra Efeonce; `entity` agrega razón social y país; `full` agrega dirección postal
  válida y privacidad. Los datos provienen del operating entity canónico, nunca de literales JSX.
- `legalNoticePolicy` activa sólo notas específicas de seguridad, privacidad o dominio regulado. Se prohíbe un
  párrafo universal de confidencialidad que no corresponda al propósito real.
- Marketing y suscripción adoptan `full` como baseline conservador del producto; transaccionales no heredan
  dirección postal ni RRSS por esa decisión. Cada jurisdicción sigue requiriendo validación profesional.

### 6. Migración incremental, legacy por defecto

- El primitive legacy permanece como default mientras exista un solo tipo no migrado.
- Ningún cambio a `EmailLayout` promueve por herencia todos los tipos.
- La foundation agrega policy/primitive/tests sin cambiar bytes visibles.
- Cada child task migra una familia y máximo cuatro tipos.
- Cada cohorte requiere baseline, HTML diff, tests, preview 720/390, aprobación humana, canary consentido en cliente
  real y rollback por tipo antes de abrir la siguiente.
- Access/security, Hiring externo y regulated transactional nunca comparten release de migración.
- El legacy sólo puede retirarse con aceptación 30/30.

## Perfiles base

| Purpose | Unsubscribe | RRSS | Identidad legal | Nota |
|---|---|---|---|---|
| `access_security` | forbidden | none | compact | security cuando corresponda |
| `transactional_service` | forbidden | none | compact | none o privacy por dominio |
| `relationship_transactional` | forbidden | none | compact/entity | none o privacy por dominio |
| `regulated_transactional` | forbidden | none | entity/full | regulated |
| `internal_operational` | forbidden | none | compact | none |
| `optional_subscription` | required | institutional opcional | full | privacy |
| `commercial_marketing` | required | institutional opcional | full | privacy |

## Alternatives Considered

### Un footer único global

Rechazado. Es simple, pero no puede representar correctamente seguridad, relación, regulación, internal-only,
suscripción y marketing sin texto genérico o incorrecto.

### Footer libre por template

Rechazado. Conserva la improvisación actual y no permite enforcement exhaustivo.

### Reemplazo big-bang de `EmailLayout`

Rechazado. Maximiza blast radius y hace difícil atribuir una regresión visual, legal o de cliente de correo.

### Perfiles semánticos + bloques componibles + rollout por tipo

Seleccionado. Mantiene una fuente de verdad, permite reglas mecánicas y conserva rollback acotado.

## Consequences

### Benefits

- Marca externa coherente con la arquitectura masterbrand de Efeonce.
- Ausencia de unsubscribe engañoso en mensajes esenciales.
- Nuevos tipos no pueden nacer sin clasificación.
- Migraciones pequeñas con evidencia y rollback atribuible.

### Costs and risks

- La migración completa requiere varias releases y revisión por dominio.
- El legacy coexistirá temporalmente con governed-v1.
- Clasificar mensajes mixtos exige juicio de propósito y revisión legal cuando haya promoción.
- Un reply-to visual sólo puede mostrarse si el buzón está realmente atendido.
- Una cuenta social, dirección o razón social stale convierte el footer en información falsa; sus fuentes requieren
  owner y readback antes de promoción.

## Runtime Contract

Este ADR está Proposed y no modifica runtime. La futura implementación tendrá como source of truth un registro
exhaustivo en `src/lib/email/**`; `EmailLayout`/`EmailFooter` serán consumidores. Copy reusable vivirá en
`src/lib/copy/**`; identidad Efeonce vendrá de `src/config/efeonce-brand.ts` y la identidad legal dinámica
preferirá el operating entity canónico.

Resend, delivery ledger, suppression, tracking, reply-to y kill-switch siguen en sus contratos existentes. La policy
de presentación no los duplica.

## Revisit When

- Greenhouse incorpora un motor real de campañas o journeys.
- Una jurisdicción nueva cambia requisitos de marketing/servicio.
- Efeonce adopta otra masterbrand o cambia su operating entity.
- El catálogo supera el modelo de perfiles y necesita policy por tenant/jurisdicción.
- Todos los tipos están migrated y existe evidencia para retirar legacy.
