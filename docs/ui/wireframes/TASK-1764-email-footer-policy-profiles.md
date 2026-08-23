# TASK-1764 / Email — Canonical Footer Profiles

## Meta

- Status: `draft`
- Owner task: `TASK-1764`
- Product Design asset: `docs/ui/visual-directions/TASK-1764-email-footer-policy-profiles.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: React Email templates de Efeonce
- Copy source: `src/lib/copy/dictionaries/*/emails.ts`
- Primitive decision: `new` — `EmailFooter` gobernado por policy
- UI ready target: `no`; cada child task logra readiness por cohorte
- Approval state: `approved starting contract`
- Reference route: `/admin/emails/footer-profiles/mockup`
- Reference implementation: `src/views/greenhouse/admin/email-footer-profiles/mockup/{EmailFooterProfilesMockupView.tsx,data.ts}`

## Brief

- Primary user: destinatario externo o interno de un correo Efeonce
- User moment: después de leer y actuar sobre el contenido principal
- Job to be done: confirmar quién envía, por qué se recibió y qué control o ayuda corresponde
- Primary decision signal: acción permitida — responder, obtener ayuda, gestionar preferencias o darse de baja
- Non-goals: vender, repetir el cuerpo, reemplazar la firma o decorar el cierre

## Desktop Target — 720×variable

```text
┌────────────────────────────────────────────────────────┐
│                   MASTHEAD EFEONCE                     │
├────────────────────────────────────────────────────────┤
│ BODY                                                   │
│                                                        │
│ Cierre del mensaje                                     │
│ Firma opcional, alineada a la izquierda                │
└────────────────────────────────────────────────────────┘

                       ───────────
                       Efeonce
          [contexto de recepción según policy]
        [ayuda/respuesta] [preferencias/baja sólo si aplica]
               [RRSS sólo suscripción/marketing]
             [razón social · RUT · casa matriz]
                 [nota legal específica]
```

El footer vive fuera de la card y centrado. La firma nunca se mueve al footer.

## Mobile Target — 390×variable

Misma secuencia en una columna. Cada link puede ocupar su propia línea; dirección legal y privacidad envuelven sin
desbordamiento. Se conserva una separación visual inequívoca entre firma y footer.

## Action Hierarchy

- Primary: ninguna acción universal; la policy decide si existe ayuda/respuesta
- Secondary: preferencias sólo para suscripción opcional
- Destructive: unsubscribe sólo en `optional_subscription|commercial_marketing`
- Institutional: RRSS opcionales en `optional_subscription`, obligatorias en `commercial_marketing` y visualmente secundarias
- Selection vs action: no aplica
- Pending / disabled: no aplica; links inexistentes no se renderizan

## Visual Fidelity Mapping

| Source cue                  | Greenhouse token / primitive / recipe                    | Intent preserved                               | Literal value rejected                           |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Footer actual fuera de card | `EmailLayout` + `EMAIL_COLORS.background`                | separación cuerpo/metadata                     | nueva card de footer                             |
| Wordmark Efeonce            | `public/branding/email/footer/efeonce-wordmark-gray.png` | masterbrand única y compatible con email       | filtro CSS sobre SVG o logo Greenhouse principal |
| Motivo y ayuda              | `EMAIL_COLORS.secondary`                                 | contexto legible antes de la metadata legal    | un único gris para todo el footer                |
| Metadata legal              | `EMAIL_COLORS.muted` + peso 600/400                      | entidad visible; países/dirección subordinados | gris por debajo de contraste AA                  |
| Links                       | `EMAIL_COLORS.primaryHover` + underline                  | reconocibilidad y contraste AA a 13 px         | CTA tipo botón o azul `primary` bajo 4.5:1       |
| RRSS                        | Font Awesome Brands sólido → PNG transparentes           | isotipos sólidos, redondeados y accesibles     | círculo añadido, outline, dibujo o icon font     |

## Layout Skeleton

| Region | Slot            | Purpose                                                                      | Component candidate     | Data source                       |
| ------ | --------------- | ---------------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| 0      | Masthead        | Identidad principal Efeonce                                                  | `EmailLayout`           | `efeonce-brand.ts`                |
| 1      | Body            | Mensaje y CTA principal                                                      | template                | props/context                     |
| 2      | Signature       | Quién habla, cuando corresponda                                              | future `EmailSignature` | policy + runtime owner verificado |
| 3      | Footer identity | Efeonce                                                                      | `EmailFooter`           | brand SSOT                        |
| 4      | Footer context  | Por qué llegó / Greenhouse como plataforma                                   | `EmailFooter`           | policy + copy                     |
| 5      | Footer controls | Reply/help/preferences/unsubscribe                                           | `EmailFooter`           | policy + URLs runtime             |
| 6      | Social          | Cuentas institucionales oficiales cuando aplica                              | `EmailFooter`           | brand/social SSOT + policy        |
| 7      | Legal           | Razón social, RUT y casa matriz siempre; países/privacidad/nota según policy | `EmailFooter`           | operating entity + policy         |

## Copy Ledger

| Copy id                             | Region   | Text                                                                 | Dynamic values                                          | Notes                                                                                                                         |
| ----------------------------------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `emails.footer.brand`               | identity | `Efeonce`                                                            | none                                                    | siempre                                                                                                                       |
| `emails.footer.platformContext`     | context  | `Enviado desde Greenhouse, la plataforma de Efeonce.`                | none                                                    | sólo cuando aporta contexto                                                                                                   |
| `emails.footer.internalContext`     | context  | `Aviso interno enviado desde Greenhouse, la plataforma de Efeonce.`  | none                                                    | internal-only                                                                                                                 |
| `emails.footer.relationshipContext` | context  | `Este mensaje forma parte de tu proceso con Efeonce.`                | none                                                    | relationship transactional                                                                                                    |
| `emails.footer.marketingContext`    | context  | `Recibes este correo porque elegiste recibir contenidos de Efeonce.` | none                                                    | marketing/subscription                                                                                                        |
| `emails.footer.managePreferences`   | controls | `Gestionar preferencias`                                             | preferencesUrl                                          | optional subscription                                                                                                         |
| `emails.footer.unsubscribe`         | controls | `Dejar de recibir estos correos`                                     | unsubscribeUrl                                          | sólo perfiles required                                                                                                        |
| `emails.footer.privacy`             | legal    | `Privacidad`                                                         | privacyUrl                                              | marketing/full legal                                                                                                          |
| `emails.footer.socialYouTube`       | social   | `YouTube`                                                            | `EFEONCE_SOCIAL_LINKS.youtube`                          | obligatorio en marketing                                                                                                      |
| `emails.footer.socialInstagram`     | social   | `Instagram`                                                          | `EFEONCE_SOCIAL_LINKS.instagram`                        | obligatorio en marketing                                                                                                      |
| `emails.footer.socialLinkedIn`      | social   | `LinkedIn`                                                           | `EFEONCE_SOCIAL_LINKS.linkedin`                         | obligatorio en marketing                                                                                                      |
| `emails.footer.socialThreads`       | social   | `Threads`                                                            | `EFEONCE_SOCIAL_LINKS.threads`                          | obligatorio en marketing                                                                                                      |
| `emails.footer.legalIdentity`       | legal    | runtime                                                              | legalName, taxId, headquartersAddress, operatingMarkets | `entity` es mínimo para todo perfil gobernado; `full` agrega países como lista separada por `·`, sin el rótulo `Operación en` |
| `emails.footer.securityNotice`      | legal    | por definir en child                                                 | none                                                    | sólo policy security                                                                                                          |

El copy definitivo de cada child task se valida con el owner de dominio; esta umbrella no lo publica.

## State Copy

| State                | Title        | Body                             | CTA / recovery    | Notes                     |
| -------------------- | ------------ | -------------------------------- | ----------------- | ------------------------- |
| legacy               | none         | footer vigente byte-idéntico     | vigente           | default hasta promoción   |
| governed             | none         | bloques permitidos por policy    | según purpose     | opt-in por tipo           |
| missing-policy       | render error | no se envía                      | corregir registry | nunca fallback silencioso |
| missing-required-url | render error | no se envía marketing incompleto | corregir contexto | fail closed               |

## Accessibility Contract

- Heading order: el footer no introduce headings
- Chart/table alternatives: no aplica
- Aria labels: texto visible describe controles; logotipos de RRSS son decorativos dentro de links cuyo accessible
  name es el nombre de la red
- Focus notes: orden DOM identidad → contexto → controles → social opcional → legal
- Semantic groups: controles, RRSS e identidad legal son listas nativas; la matriz de la lámina usa tabla nativa y
  anuncia su desplazamiento horizontal en móvil
- Touch targets: links funcionales tienen al menos 24 px de alto y los links sociales 32 × 32 px; todos conservan
  foco visible
- Color-independent state labels: todos los controles usan texto y underline; no dependen del color

## Implementation Mapping

- Route / surface: previews React Email; sin nueva ruta de producto. La lámina temporal de aprobación vive en
  `/admin/emails/footer-profiles/mockup` y usa fixtures locales sin tocar templates ni delivery.
- Primitives: `EmailLayout`, futuro `EmailFooter`, futura separación `EmailSignature`
- Variants / kinds: purpose profiles + blocks; `legacy|governed-v1` es rollout, no estilo
- Component candidates: `src/emails/components/EmailLayout.tsx`, `src/emails/components/EmailFooter.tsx`
- Copy source: `src/lib/copy/dictionaries/*/emails.ts`
- Data reader / command: ninguno; operating entity se hidrata server-side para todo footer gobernado
- API parity: no aplica
- Access / capability: none
- Runtime consumers: web/ops-worker mediante templates existentes
- Print/email/PDF considerations: email usa tablas/inline styles; no extiende esta policy a PDF
- Asset delivery: la implementación React Email usa URLs públicas absolutas para los PNG generados por
  `scripts/email/generate-footer-assets.mjs`; `next/image`, icon fonts y filtros CSS pertenecen sólo al mockup y no
  cruzan al HTML del correo
- GVC markers: `email-footer`, `email-signature`, `email-social-links`, `email-legal`, `email-unsubscribe`
- Parity rule: el mockup aprobado gobierna jerarquía, espaciado, tipografía, color, responsive, legal y RRSS; sus
  fixtures no se convierten en policy runtime ni reemplazan el operating entity/copy canónicos
- Deviation rule: sólo una limitación medida de cliente de correo, accesibilidad o dato runtime permite desviarse;
  la child task registra before/after, motivo y aprobación

## GVC Scenario Plan

- Scenario file: uno por child task/cohorte
- Route: email preview local
- Viewports: 720 px y 390 px
- Quality profile: `premium`
- Required steps: render legacy y governed con mismo fixture; bloquear imágenes; inspeccionar links
- Required captures: before/after completo y crop footer
- Required `data-capture` markers: footer, firma y unsubscribe cuando corresponda
- Assertions: Efeonce masterbrand; Greenhouse sólo descriptor; unsubscribe/RRSS/legal conforme a policy y RRSS
  accesibles aun con imágenes bloqueadas
- Scroll-width checks: `scrollWidth === clientWidth` en ambos viewports
- Accessibility/focus checks: contraste y orden/nombre de links
- Reduced-motion evidence: no motion
- Review dossier: `required`
- Baseline: requerido por `EmailType` antes de migrar
- Client matrix: Outlook Desktop Windows (motor Word), Outlook Web, Gmail y un cliente WebKit
- Images blocked: obligatorio; conserva contexto, identidad legal y fallback textual/accesible de RRSS
- Profile mapping: operación interna → `internal_operational`; acceso y seguridad → `access_security`; relación y
  servicio → `transactional_service|relationship_transactional`; operaciones reguladas →
  `regulated_transactional`; marketing y suscripciones → `optional_subscription|commercial_marketing`, sin
  perder la diferencia de RRSS opcionales versus obligatorias

## Design Decision Log

- Decision: bloques semánticos gobernados, rollout legacy por tipo
- Alternatives considered: footer universal; footer por template; big-bang global
- Why this pattern: menor blast radius, enforcement y rollback atribuible
- Reuse / extend / new primitive: nuevo `EmailFooter` integrado gradualmente con `EmailLayout`
- Open risks: mensajes mixtos, buzones no atendidos, RRSS stale y legal identity no hidratada
- Follow-up: child foundation y cohorts con máximo cuatro tipos

## Acceptance Checklist

- [x] All visible strings are in the copy ledger at umbrella granularity.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives — no aplica; no hay charts.
- [x] State and aria copy is ready for child-task refinement.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for una child task.
- [x] Design decision log explains reuse/extend/new before JSX starts.
