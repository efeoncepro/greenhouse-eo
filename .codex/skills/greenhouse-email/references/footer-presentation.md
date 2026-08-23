# Presentación gobernada de footers

Lee esta referencia al clasificar, diseñar, implementar o revisar marca, firma, footer, identidad legal, RRSS,
preferencias o unsubscribe de un correo. La autoridad durable es
`docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`; `EPIC-042` gobierna el programa y
`TASK-1764` su foundation y migración. Mientras la ADR siga `Proposed`, no presentes este contrato como runtime
activo.

## Verdad visual aprobada

La lámina `/admin/emails/footer-profiles/mockup` define la anatomía, jerarquía y densidad aprobadas. Es un mockup
local con fixtures: no es un template React Email, no envía correo y no prueba rollout. Sus documentos de handoff
son:

- `docs/ui/visual-directions/TASK-1764-email-footer-policy-profiles.md`
- `docs/ui/wireframes/TASK-1764-email-footer-policy-profiles.md`

El mockup agrupa siete propósitos de policy en cinco perfiles visuales:

| Perfil visual             | Propósito de policy                                   |
| ------------------------- | ----------------------------------------------------- |
| Operación interna         | `internal_operational`                                |
| Acceso y seguridad        | `access_security`                                     |
| Relación y servicio       | `transactional_service`, `relationship_transactional` |
| Operaciones reguladas     | `regulated_transactional`                             |
| Marketing y suscripciones | `optional_subscription`, `commercial_marketing`       |

La agrupación visual no elimina diferencias de policy. En particular, las RRSS son opcionales para
`optional_subscription` y obligatorias para `commercial_marketing`; ambos requieren baja porque su recepción es
voluntaria.

## Contrato de contenido y marca

- **Efeonce es siempre la masterbrand.** Greenhouse sólo puede aparecer como descriptor: `Greenhouse, la
plataforma de Efeonce`. Nunca uses Greenhouse como marca principal del remitente o del footer.
- La firma pertenece al cuerpo, queda alineada a la izquierda e identifica un equipo institucional o un owner
  runtime verificado. No inventes personas, equipos ni buzones. El footer es un bloque separado y centrado.
- Orden visual vigente: separador → wordmark gris de Efeonce → contexto/ayuda → controles permitidos → RRSS
  opcionales → identidad legal/países/dirección → nota o referencia específica.
- Conserva 12 px entre el wordmark del footer y el primer texto. El motivo/ayuda usa tinta secundaria; links
  funcionales tienen contraste, peso 600 y subrayado; razón social/RUT usa peso 600; metadata legal usa tinta
  muted y peso 400. No reduzcas metadata por debajo del equivalente a `caption`.
- No repitas el rol o dato principal del cuerpo en el hero, título y footer. El footer explica contexto e
  identidad; no reescribe el mensaje.

## Contrato tipográfico, semántico y de interacción

- Contexto e instrucciones funcionales usan el equivalente email-safe de `body2` (14 px); controles y metadata
  legal no bajan del equivalente de `caption` (13 px). Pesos permitidos en el footer: 400 para lectura, 600 para
  controles/entidad/referencia. No uses 500 ni reduzcas el texto para comprimir una dirección.
- El footer no introduce headings. En el mockup, la lámina conserva jerarquía `h1 → h2 → h3`; el `h3` pertenece
  al cuerpo ilustrativo, no al footer. La apariencia tipográfica nunca justifica un salto semántico.
- Controles, RRSS e identidad legal son listas nativas. Cada control mantiene texto visible, subrayado, foco
  visible y un target mínimo de 24 px de alto; cada RRSS conserva target de 32 × 32 px y nombre accesible.
- El contexto, la advertencia de seguridad y la instrucción regulada preceden a la metadata legal. Seguridad usa
  tinta `warning` sobre `warningBg` además del copy; el estado nunca depende sólo del color.
- Referencias operativas/transaccionales usan numerales tabulares. Dirección, países y avisos permiten wrap
  natural y una medida acotada; no se truncan, justifican ni convierten en una línea ilegible.
- La tabla nativa y su indicación de scroll pertenecen a la lámina de gobierno, no al HTML del correo. El email
  traduce únicamente el footer a tablas/inline styles compatibles con la matriz de clientes.

## Elegibilidad de bloques

La futura policy es exhaustiva por `EmailType`; una entrada ausente rompe build/test. Sus ejes son independientes
de `EmailPriority`:

| Purpose                      | Unsubscribe | RRSS                        | Identidad | Nota                               |
| ---------------------------- | ----------- | --------------------------- | --------- | ---------------------------------- |
| `access_security`            | `forbidden` | `none`                      | `entity`  | seguridad si corresponde           |
| `transactional_service`      | `forbidden` | `none`                      | `entity`  | ninguna o privacidad del dominio   |
| `relationship_transactional` | `forbidden` | `none`                      | `entity`  | ninguna o privacidad del dominio   |
| `regulated_transactional`    | `forbidden` | `none`                      | `entity`  | regulada y resuelta por el dominio |
| `internal_operational`       | `forbidden` | `none`                      | `entity`  | ninguna o referencia operativa     |
| `optional_subscription`      | `required`  | `institutional` opcional    | `full`    | privacidad                         |
| `commercial_marketing`       | `required`  | `institutional` obligatorio | `full`    | privacidad                         |

Todo tipo nace con unsubscribe prohibido y RRSS deshabilitadas. `broadcast` no significa marketing. Si asunto,
cuerpo o CTA mezcla promoción con servicio, detén la migración y exige reclasificación, consentimiento y revisión
legal aplicable; no agregues un enlace de baja para encubrir un tipo incorrecto.

Todos los footers gobernados muestran como mínimo razón social, identificador tributario y casa matriz. Es un
estándar institucional conservador, no una afirmación de cumplimiento legal universal. `full` agrega
`Chile · Estados Unidos · Colombia · México · Perú` sin el rótulo `Operación en`; esa lista describe presencia de
marca, no entidades legales locales.

## Fuentes y assets

- Marca, mercados y RRSS: `src/config/efeonce-brand.ts`. Usa `EFEONCE_SOCIAL_LINKS` para YouTube, Instagram,
  LinkedIn y Threads; no dupliques URLs ni agregues tracking por inferencia.
- Identidad legal runtime: operating entity canónico. Los valores `EFEONCE_*_FALLBACK` son fallback/fixture, no
  permiso para hardcodearlos en JSX o copy.
- Assets aprobados: wordmark gris y glyphs Font Awesome Brands `square-youtube`, `square-instagram`, `linkedin` y
  `square-threads`, generados por `scripts/email/generate-footer-assets.mjs` en
  `public/branding/email/footer/*.png`.
- Los isotipos son sólidos y de bordes redondeados; no uses variantes outline ni los encierres en un círculo
  adicional. Se muestran monocromáticos, visualmente secundarios y con nombre accesible. El render normal puede
  mostrar sólo el isotipo, pero el enlace conserva nombre y fallback textual cuando las imágenes están bloqueadas.
- En React Email usa PNG con URL pública absoluta, dimensiones declaradas, tablas/inline styles y alt apropiado.
  No traslades `next/image`, icon fonts, SVG, filtros CSS o componentes MUI del mockup al HTML del correo.

## Compatibilidad de cliente como gate

La paridad con el mockup se valida en HTML de email real, no sólo en navegador. Cada cohorte cubre como mínimo:

- Outlook Desktop para Windows con motor Word;
- Outlook Web;
- Gmail web o aplicación móvil;
- un cliente WebKit, como Apple Mail o Mail de iOS;
- el mismo mensaje con imágenes bloqueadas.

Verifica tablas y estilos inline, URLs HTTPS absolutas, dimensiones reservadas, wrapping a 720/390 px y ausencia de
dependencias en JavaScript, hover, SVG remoto, icon fonts o filtros. Los links sociales conservan un nombre
comprensible cuando la imagen no carga mediante `alt` apropiado o un fallback textual email-safe que haya sido
probado en la matriz; `aria-label` del mockup web no basta como evidencia para Outlook.

## Rollout sin big bang

1. La foundation agrega registry, primitive y tests con output legacy byte-idéntico. `legacy` sigue siendo el
   default de todo `EmailType` no promovido; modificar `EmailLayout` nunca activa todos los perfiles por herencia.
2. Cada child task migra una familia y como máximo cuatro tipos. No mezcles access/security, Hiring externo o
   transaccionales regulados en la misma release.
3. Por tipo, captura el baseline y compara HTML/links; revisa 720 px, 390 px y modo sin imágenes; exige cero
   overflow, contraste/nombres accesibles y ausencia de cambios fuera del footer.
4. Antes de promover la siguiente cohorte exige tests verdes, revisión humana, canary consentido en cliente real,
   readback observable y rollback por tipo.
5. Durante una migración de footer no cambies asunto, cuerpo, CTA, hero, lógica de negocio, sender, reply-to,
   tracking, suppression o delivery. Una regresión detiene el grafo; no se compensa avanzando otra familia.
6. Retira legacy sólo con aceptación individual de los 30 tipos.

Una implementación local o un preview aprobado sigue siendo `code complete, rollout pendiente` hasta deploy del
runtime dueño, habilitación, canary y readback del provider.
