# TASK-1944 — Wireframe: módulos canónicos de correo Efeonce en Greenhouse

Creado el 2026-09-29 desde la dirección aprobada por el operador. Describe, región por región, lo que TASK-1944 debe
producir en React Email: los cuatro módulos canónicos (pie, `cta-primary`, `cta-agenda` y bloque de marca) y su primera
aplicación, el correo de entrega de Efeonce Insights, en sus tres modalidades.

> **Estado 2026-09-29:** dirección **aprobada** («Quedó aprobadísimo este mail, canonízalo») y canon **publicado** en
> AXIS `v0.3.38` (`main` `c92160b`). La dirección y sus tres tableros son el contrato de fidelidad:
> [`EFEONCE_EMAIL_MODULES_V1-direction.md`](../visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md).
> `UI ready` sigue en `no`: faltan la decisión del propósito del correo de Insights (Open Questions de la task), el
> mapeo contra el HTML real de React Email y el plan GVC ejecutado en clientes de correo.

- Visual direction mode: source-led (aprobada el 2026-09-29).
- Product Design asset: `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/insights-enlace-escritorio.png`
  (también `insights-enlace-movil.png` e `insights-pdf-adjunto.png`, más `fuente-canvas-2026-09-29.tar.gz` con las
  tres fuentes `.dc.html`).
- **Fuente editable:** canvas «Correo de Efeonce Insights», página «Correo», versión 21:
  <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd> (`Main.dc.html`, `Movil.dc.html`, `Adjunto.dc.html`).
- **Canon de valores:** AXIS. Tokens `efeonceEmail` (`@efeoncepro/axis-tokens` `0.3.38`); contrato
  `efeonce.email-modules` `0.1.0` `candidate` (`@efeoncepro/axis-ui-contracts` `0.3.38`, resolver
  `resolveEmailModulesIntent`, schema del manifiesto `axis.email-modules-composition.v1`); PNG para correo en
  `@efeoncepro/axis-brand-assets` `0.4.6` (`EMAIL_ASSET_SEALS`); Lab <https://axis.efeonce.org/references/email/>; ADR
  `docs/architecture/EMAIL_MODULES_DECISION_V1.md` y guía `docs/agent-composition/email-modules.md` en el repo
  `axis-design-system`. **Donde este wireframe y AXIS difieran, manda AXIS** y la diferencia se reporta.
- **Qué es canon y qué es aplicación.** Los cuatro módulos son canon y los reutiliza cualquier correo Efeonce. El cuerpo
  del correo de Insights (cabecera, «Lo esencial», tarjeta de decisión, avisos, grilla de adjuntos) es **una
  aplicación** (`efeonceEmail.applications[0]`, `efeonce-insights-delivery`, línea `growth`): no es la plantilla de los
  demás correos.

## Regiones

El orden de pintura del correo completo, de arriba abajo. Las regiones marcadas «canon» salen del manifiesto de AXIS;
las marcadas «aplicación» son del correo de Insights.

| # | Región | Tipo | Contenido | Fuente de valores |
|---|---|---|---|---|
| R1 | Cabecera Insights | aplicación | lockup «Efeonce \| Insights» negativo a la izquierda, píldora del mes a la derecha, eyebrow «Informe mensual · [organización]», H1, bajada, fila de metadatos | dirección §«Qué es sólo aplicación»; lockup `insights-lockup-negative` de `axis-brand-assets` |
| R2 | Saludo y párrafo | aplicación | «Hola [nombre]:» y el párrafo de entrega | copy de `src/lib/copy/insights.ts` |
| R3 | Nota del responsable de cuenta | aplicación, opcional | filete, cita, firma «[nombre] · [cargo], responsable de tu cuenta» | prop `message` + firma; no va en el adjunto |
| R4 | «Lo esencial del mes» | aplicación, opcional | banda oscura, título, contador, órbita de medida con la cifra principal, dos cifras de apoyo con descripción y fuente | datos de la edición, cableados por TASK-1849; órbita horneada (ver «Órbita de medida») |
| R5 | «Para decidir en la reunión» | aplicación, opcional | tarjeta navy con título y texto | idem R4; no va en el adjunto |
| R6 | `cta-primary` | **canon** | píldora oscura a todo el ancho «Ver el informe completo  →» y nota de alcance debajo | `efeonceEmail.modules.ctaPrimary`; no va en el adjunto |
| R7 | Aviso | aplicación | enlace: «Tu enlace es personal y vence el [fecha]» + URL de respaldo; adjunto: aviso de irrevocabilidad; portal: sin aviso de vencimiento | copy de `insights.ts` |
| R8 | Grilla de adjuntos | aplicación, sólo `attachment` | dos tarjetas: «Informe completo — PDF · A4 · N páginas · [tamaño]» y «Presentación — PDF · 16:9 · N láminas · [tamaño]» | outputs del `DeliveryIntent` |
| R9 | Pie | **canon** | ver la anatomía del pie abajo | `efeonceEmail.modules.footer` |

### Anatomía del pie (R9, canon)

Banda de ancho completo sobre `efeonceEmail.palette.ground` (`#001a33`), en este orden fijo
(`efeonceEmail.modules.footer.order`):

1. **`cta-agenda`.** Tarjeta `palette.navy` de radio 16: título «¿Lo revisamos juntos?», bajada «Elige un horario y te
   mostramos qué mover primero, con los datos de este informe.» y píldora blanca «Agendar una reunión». Destino:
   `https://efeoncepro.com/contacto/` con `utm_medium=email`, `utm_source=<producto>` (`efeonce-insights`),
   `utm_content=pie` y, si la aplicación lo da, `utm_campaign` (`insights-report`). **Nunca** `mailto:`.
2. **Bloque de marca.** Logo `email-logo-negative` (220×52) y, debajo, el eslogan de la línea `email-slogan-{line}-negative`
   separado por `gapBelowLogoImagePx` del sello. Dos imágenes apiladas en celdas, nunca un PNG compuesto.
3. **Enlaces.** Burbuja `url-bubble-baked-dark-email` (163×32 en escritorio, 142×28 en celular) enlazada a
   `https://efeoncepro.com`, y las cuatro redes en el orden aprobado: LinkedIn, Instagram, YouTube, Threads
   (`email-social-*-white`, 40×40).
4. **Filete** antes del bloque legal.
5. **Bloque legal** en texto vivo: «**Efeonce Group SpA** · RUT 77.357.182-1»; la dirección; teléfonos con `tel:` y
   correo con `mailto:`.
6. **Filete** antes de preferencias.
7. **Preferencias y baja:** «Preferencias de correo» y el enlace de baja, subrayados.
8. **Motivo y ©:** «Recibes este correo porque tu organización trabaja con Efeonce.» y «© [año] Efeonce Group SpA.
   Todos los derechos reservados.».

### Órbita de medida (R4, aplicación)

- Geometría del canvas: `viewBox` 260 a 240 px, centro (130, 130), radio 110.
- Orden de pintura: anillo → marca de partida a las 12 → **recorrido** → estela de 50° → halo → esfera.
- **Recorrido** (canon de La órbita desde `efeonce.graphic-line-orbit` `0.5.0`): arco desde las 12 hasta la esfera, en
  el acento, a opacidad 0,6 y 0,75 × el trazo de la estela (`efeonceGraphicLine.trajectory.measure.travelledPath`). Al
  100 % es el anillo completo; en 0 % no existe.
- El dato sigue siendo la posición de la esfera en `valor × 3,6°`.
- **En correo va horneada a PNG @2x** (480×480) sobre `#001a33`, con `alt` que lleva la cifra y su leyenda completas.
  AXIS prohíbe SVG en línea (`emailSafe.inlineSvg: false`). Cómo se materializa el PNG por edición es una Open Question
  de la task.

## Desktop Target

Tablero de referencia: `insights-enlace-escritorio.png` (680×2750) y `insights-pdf-adjunto.png` (680×2400).

- Marco de bandeja de 680 px sólo en la vista previa (`palette.previewFrame` `#e9ecef`); **el correo es la tarjeta de
  600 px** (`efeonceEmail.width.desktop.cardPx`), radio 20, gutter lateral de 48 px.
- `cta-primary`: padding `20px 28px`, cuerpo 17 px, módulo `36px 48px 8px`, nota a 14 px de la píldora.
- `cta-agenda`: dos columnas (texto `1fr` + botón a su ancho), gap 24, tarjeta con padding `24px 28px`, botón
  `13px 22px` sin partir.
- Pie: padding `48px 48px 40px`; bloque de marca `40px 0 30px`; burbuja y cuatro círculos en una fila, 16 px de aire
  tras la burbuja y 12 entre círculos; filetes con márgenes `32px 0 24px` y `24px 0 20px`.
- Cabecera Insights: padding `44px 48px 52px`, lockup de 208 px, H1 de 52 px.

## Mobile Target

Tablero de referencia: `insights-enlace-movil.png` (390×2900).

- A sangre, fondo blanco, sin radio, gutter lateral de 24 px (`efeonceEmail.width.mobile`).
- `cta-primary`: padding `18px 20px`, cuerpo 16 px, módulo `30px 24px 4px`, nota corta.
- `cta-agenda`: apilada (gap 14), botón a todo el ancho `13px 18px`.
- Pie: padding `40px 24px 36px`; bloque de marca `32px 0 26px`; la burbuja arriba y los cuatro círculos debajo, gap 10;
  filetes con márgenes `28px 0 22px` y `22px 0 18px`.
- **Apilado sin media queries:** columnas híbridas (`inline-block` con `max-width`) para que la agenda y «Lo esencial»
  se apilen también en Gmail con cuentas no Google, que ignora `@media`.

## Action Hierarchy

1. **Primaria del cuerpo:** `cta-primary`, «Ver el informe completo  →», al informe (enlace compartido o portal según la
   modalidad). Una sola por correo (`cta-primary-duplicate`). No existe en la modalidad `attachment`.
2. **Secundaria, única comercial:** `cta-agenda`, «Agendar una reunión», a la agenda con UTM. Una sola vez, arriba del
   pie (`cta-agenda-duplicate`).
3. **Terciarias:** burbuja URL, redes, `tel:`, `mailto:`, preferencias y baja.
4. **Retirada:** «Suscribirme». AXIS la rechaza (`cta-subscribe-retired`); ningún correo la vuelve a pintar.

## Visual Fidelity Mapping

| Rasgo del tablero | Token o fuente | Nota |
|---|---|---|
| Fondo del pie y de las bandas oscuras | `efeonceEmail.palette.ground` | declarado dos veces por celda: `bgcolor` + `background-color` |
| Tarjeta de agenda y de decisión | `efeonceEmail.palette.navy` | |
| Tinta sobre oscuro / suave / apagada | `palette.inkOnDark`, `softOnDark`, `mutedOnDark` | contraste medido 13,49:1 y 8,16:1 sobre `#001a33` |
| Filetes y borde de redes translúcidos | `palette.hairlineOnDark`, `socialBorderOnDark` | precompuestos a HEX para Outlook (`#213a53`, `#2e465f`); el borde de redes ya va horneado en su PNG |
| «Empower your» del eslogan | `palette.sloganLeadOnDark` (va horneado en el PNG) | a ~12 px la palabra va en tinta, no en el acento (`accentFromPx` 24) |
| Tipografía | `efeonceEmail.type` (Bricolage Grotesque para títulos, Poppins para texto, `fallback` de AXIS) | el correo se lee completo con la fuente de reserva |
| Medidas de módulos | `efeonceEmail.modules.*` por canal (`desktop` / `mobile`) | el resolver de AXIS ya las entrega por canal |
| Dimensiones de cada `<img>` | `EMAIL_ASSET_SEALS[id].width/height` de `axis-brand-assets` | no del ancho calculado del eslogan (140,8 vs 141 px) |
| Datos legales y de contacto | `src/config/efeonce-brand.ts` (y `getOperatingEntityIdentity()` en runtime) | AXIS los espeja en `efeonceEmail.institutional`; un test compara ambos |
| Orden de redes | `efeonceEmail.modules.footer.links.social.order` | el orden de `EFEONCE_SOCIAL_LINKS` es otro (YouTube primero); manda el del pie |

**Ninguna medida, HEX, nombre de asset ni línea legal se copia del canvas ni de la dirección**: el renderer consume el
manifiesto resuelto y los ids de asset. `EMAIL_COLORS` (paleta Greenhouse) no se usa en los módulos y no se migra
aquí (eso es de TASK-1057).

## Copy Ledger

Canon de AXIS (se toma del manifiesto, no se reescribe): «Agendar una reunión», «Preferencias de correo», el enlace de
baja (AXIS: «Dejar de recibir estos correos»; el canvas decía «…estos informes», ver Open Questions de la task), el
motivo y el ©.

De la aplicación, en `src/lib/copy/insights.ts` (Insights) y `src/lib/copy/dictionaries/es-CL/emails.ts` (lo que sea
compartido entre correos), validado con `greenhouse-ux-writing`, es-CL con tuteo, y su versión `en`:

- Asunto y preheader por modalidad: enlace «[Mes]: [titular]. Tu informe está listo» / adjunto «Tu informe de [mes], en
  PDF».
- Cabecera: eyebrow «Informe mensual · [organización]», H1 y bajada (de la edición), metadatos «Período · Corte ·
  Edición».
- Saludo «Hola [nombre]:» y párrafo de entrega.
- `cta-primary`: «Ver el informe completo  →» (flecha tras dos espacios) y la nota de alcance, larga en escritorio
  («3 capítulos · 17 figuras con su tabla · plan de 5 acciones · listo para presentar») y corta en celular.
- `cta-agenda`: título «¿Lo revisamos juntos?» y bajada «Elige un horario y te mostramos qué mover primero, con los
  datos de este informe.». Otro correo trae su propio título y bajada; el botón es canon.
- Avisos: «Tu enlace es personal y vence el [fecha].» con la regla de un enlace por persona y la URL de respaldo; y el
  de adjunto: «Estos archivos quedan en tu correo. A diferencia de un enlace, un adjunto no se puede retirar después
  de enviado…».
- Motivo: «Recibes este correo porque tu organización trabaja con Efeonce.».

## State Copy

| State | Qué se ve | Regla y recuperación |
|---|---|---|
| ready | correo completo según la modalidad (enlace, portal o adjunto) con el pie canónico | el HTML pasa los seis checks del adapter de AXIS |
| loading | no aplica: el correo se renderiza en el servidor antes del envío | un render lento no manda un correo parcial; el despacho sigue el camino actual de `dispatch.ts` |
| empty | sin nota, sin «Lo esencial» o sin tarjeta de decisión: esas regiones no se pintan y el cuerpo sube | nunca una banda vacía ni una cifra en 0; la órbita no se dibuja sin dato |
| partial | imágenes bloqueadas: se leen los `alt` («Efeonce», «efeoncepro.com», nombre de cada red, cifra de la órbita) y todo el texto vivo; fuente de reserva sin cortes raros | el bloque legal, los CTA, preferencias y motivo nunca dependen de una imagen |
| error | el resolver de AXIS devuelve `status: 'invalid'` o el render falla | el correo no sale con un pie a medias: el error se registra con `captureWithDomain` y el despacho queda en su estado de fallo actual (reintento acotado); nunca se cae a un pie inventado |
| denied | no aplica en el correo: los destinatarios se validan antes (`insights.delivery.send`) | un enlace vencido o revocado lo resuelve Think (TASK-1875), no el correo |
| modalidad `attachment` | sin `cta-primary`, sin nota ni tarjeta de decisión; grilla de adjuntos y aviso de irrevocabilidad | el pie es el mismo |
| modalidad `portal_link` | `cta-primary` al portal; sin aviso de vencimiento | hoy la modalidad está cerrada (`INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE = false`); se diseña pero no se habilita aquí |
| locale `en` | mismo diseño con el copy `en` | los datos legales no se traducen |
| nombres largos | la organización y el título ajustan línea | nunca «…» |

## Accessibility Contract

- Texto vivo para el bloque legal, los CTA, preferencias, baja, motivo y ©; el contraste de cada tinta sobre su fondo
  llega a 4,5:1 (check `footer-contrast`; valores medidos en la dirección).
- Todo `<img>` con `alt` útil, `width` y `height` explícitos; las redes llevan el nombre de la red como nombre accesible.
- Los enlaces del pie van subrayados (`underlined-footer-links`); el botón nunca es una imagen.
- `lang` del documento según el locale; `role="presentation"` en las tablas de maquetación.
- Modo oscuro de los clientes: `color-scheme: light` como hoy, el fondo oscuro declarado en cada celda y ningún texto
  crítico que dependa de que el blanco del cuerpo se conserve.

## Reglas de cliente de correo

- Tablas `role="presentation"`, contenedor de 600 px, estilos en línea (`efeonceEmail.emailSafe`).
- PNG @2x con dimensiones explícitas para todo lo que no es texto; **sin SVG en línea**.
- Botones a prueba de clientes: enlace dentro de una celda con `bgcolor`, padding en el `<a>` y `mso-padding-alt`; en
  Outlook para Windows, `v:roundrect` con `arcsize="50%"` (sin eso queda cuadrado, degradación aceptada).
- Colores translúcidos precompuestos a HEX (Outlook ignora `rgba`); filetes como celdas de 1 px con `font-size: 0` y
  `line-height: 0`.
- Los PNG de AXIS son RGBA con fondo transparente: el fondo oscuro se declara en cada celda
  (`darkMode: 'ground-declared-on-cell'`).
- Los PNG se sirven desde un origen público estable, con el mismo patrón que `EFEONCE_LOGO_URL`
  (`GREENHOUSE_PUBLIC_MEDIA_BUCKET`, carpeta `emails/`), y su SHA-256 coincide con `EMAIL_ASSET_SEALS`.
- El enlace personal con token no pasa por tracking de clics (TASK-1848). La agenda sí lleva UTM. Si el tipo lleva baja,
  va además la cabecera `List-Unsubscribe`.

## Implementation Mapping

- **Adapter del manifiesto** [propuesta de ruta; se confirma en el plan]: `src/emails/efeonce-modules/resolve.ts`
  arma el intent (`line`, `channel`, `product`, `campaign`, `modules`, `footer`) desde el contexto del correo y llama a
  `resolveEmailModulesIntent`; convierte cada id de asset en URL pública y precompone los `rgba`.
- **Componentes** [propuesta]: `src/emails/efeonce-modules/EfeonceEmailFooter.tsx`, `EmailCtaPrimary.tsx`,
  `EmailCtaAgenda.tsx` y `EfeonceEmailBrandBlock.tsx`. Piezas componibles: **no** cambian el default de
  `EmailLayout.tsx` (TASK-1764 lo prohíbe) ni reemplazan `EmailButton.tsx` (sigue para los demás correos).
- **Consumidor inicial:** `src/emails/InsightsEditionDeliveryEmail.tsx` (dos `EmailType`:
  `insights_edition_delivery` e `insights_edition_delivery_attachment`), registrado en `src/lib/email/templates.ts`
  (`resolveInsightsEditionDelivery`, preview en `registerPreviewMeta`). El despacho no cambia
  (`src/lib/efeonce-insights/delivery/dispatch.ts`).
- **Datos institucionales:** `src/config/efeonce-brand.ts`; test de deriva contra `efeonceEmail.institutional`.
- **Copy:** `src/lib/copy/insights.ts` y `src/lib/copy/dictionaries/es-CL/emails.ts`.
- **Primitive decision:** `new` para los cuatro módulos (no existe primitive de correo equivalente en
  `src/emails/components/`), `extend` para el correo de Insights.
- `Nav placement: none`.

## GVC Scenario Plan

- Quality profile: premium.
- Scenario: vista previa del admin `/admin/emails/preview` con el tipo `insights_edition_delivery` (y el de adjunto), a
  680 px y a 390 px; `pnpm fe:capture --route=/admin/emails/preview --env=staging` o un scenario en
  `scripts/frontend/scenarios/` que elija el tipo y la modalidad.
- Captures: las tres modalidades en escritorio y celular, lado a lado con los tres tableros aprobados.
- **Clientes de correo reales** (lo que el preview no prueba): Gmail web y app, Outlook para Windows (motor Word),
  Outlook web y Apple Mail, en claro y en oscuro, y con imágenes bloqueadas. Es la condición que AXIS pone para
  promover el contrato a `trial`.
- Assertions: los seis checks del adapter (`images-png-with-dimensions`, `no-inline-svg-in-email`,
  `legal-block-live-text`, `bulletproof-buttons`, `footer-contrast`, `dark-mode-safe`); snapshot del HTML;
  test de deriva institucional verde.
- Scroll-width: el HTML a 390 px no produce scroll horizontal en el preview.
- Baseline surface ID: `email.insights-edition-delivery` (nuevo tras la aprobación).
- Review dossier: `docs/ui/reviews/TASK-1944-efeonce-email-modules-adoption/`.

## Design Decision Log

- **Módulos, no plantilla** (operador, 2026-09-29): el pie, los dos CTA y el bloque de marca se reutilizan; el cuerpo de
  Insights es una aplicación.
- **La palabra del eslogan sigue la línea de servicio** (Growth, Brand, Engine, Voice, Revenue); el correo de Insights
  firma Growth.
- **«Agendar una reunión» reemplaza a «Suscribirme» en todo correo**, a la agenda con UTM, nunca a un correo.
- **Logo y eslogan en dos PNG**, nunca uno: el SSOT de marca los trata como elementos independientes.
- **Piezas componibles junto a `EmailLayout`, no un nuevo default**: evita el big bang que TASK-1764 prohíbe.
- **Un correo que no deba llevar agenda o redes no se arregla quitando módulos en el adapter**: eso es una versión
  nueva del contrato en AXIS (ADR de AXIS §7).
- Descartado: pie claro de TASK-1764 para Insights (no es lo aprobado para esta superficie); eslogan en el acento
  (a ~12 px no llega a 24 px); agenda como `mailto:`; SVG en línea.
