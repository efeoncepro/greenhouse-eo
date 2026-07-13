# TASK-1406 / Simulador de precios HubSpot — bloque `#simulador` en `/servicios/hubspot/precios/`

> **Enhancement sobre TASK-1401**, no reemplazo. Motor: **TASK-1405** (el pricebook + el estimador puro).
> 🎯 **Su única razón de existir: que el waiver se vea ponerse en cero.**

## Meta

- Status: `draft`
- Owner task: `TASK-1406`
- **Product Design asset:** ✅ **no requerido.** Es una tabla, unos controles y una banda destacada.
  🎯 **El "wow" es el número, no el widget.** Un simulador con dirección de arte pesada **le quitaría seriedad
  justo al momento en que le pedimos al CFO que nos crea un cálculo.**
- Intended consumers: sitio público (WordPress/Ohio, marketing lane) + 🎯 **el crawler**, que lee el **estado por
  defecto server-rendered** como un ejemplo completo.
- Copy source: contenido de página pública, validado con `greenhouse-ux-writing`.
- Primitive decision: `one-off` en la UI · **`reuse` en la lógica** (`estimateHubSpotCost()` de TASK-1405).
  🔴 **Cero cálculo propio.**
- Motion: **hereda el contract del hub.** Tier **restraint** — con **una distinción fina** (ver motion contract).
- UI ready target: `yes` una vez que TASK-1405 exista y el copy esté cerrado.

## Brief

- **Primary user:** el mismo de TASK-1401 — **CFO / RevOps / CMO**, tráfico frío, **que vino por el número y no
  quiere hablar con un vendedor**.
- **User moment:** 🎯 **ya leyó las trampas.** Entendió que los créditos no se suman, que hay saltos y que existe
  un onboarding obligatorio. **Y ahora quiere su número.**
- **Job to be done:** **saber cuánto le sale a él** — y poder llevarlo a una reunión de comité.
- **Primary decision signal:** 🎯 **ver el onboarding ponerse en cero.** Y, de paso, notar algo que nadie le va a
  explicar pero que va a registrar: **nuestro número es más alto que el de la grilla oficial de HubSpot** —
  *porque está completo*. **Un vendedor que te da un número más alto que el del vendor no te está vendiendo: te
  está avisando.**
- **Fricción que reduce:** la última que quedaba — *"ya entendí el modelo, ¿pero cuánto me sale a mí?"*.
- **Non-goals:** 🔴 **no cotiza la implementación** · **no pide email** · **no reemplaza el contenido estático** ·
  no promete un precio vinculante.

## 🔴 Reglas duras del contenido

1. 🔴 **Enhancement, no reemplazo.** Sin JS, la página es TASK-1401 **completa** + el estado por defecto del
   simulador **como tabla estática**. 🎯 **La citabilidad es el activo del hub.**
2. 🔴 **El default se renderiza server-side.** **Nunca arranca en `0`.** Un count-up **renderiza `00` sin JS** y
   sería, literalmente, el bug que la página vieja de HubSpot tenía y que esta corrige.
3. 🔴 **Cero cálculo propio.** El bloque llama a `estimateHubSpotCost()`. **Si hay una multiplicación de precios
   en el JS de la página, está mal hecho** (y viola Full API Parity).
4. 🔴 **La implementación no tiene número.** *"Te la cotizamos con tus números, sin costo."*
5. 🔴 **Los ❌ se dicen** (*"HubSpot no publica este monto"*), **nunca un `0` ni un guion mudo**.
   **Los ⚠️ salen como rango.**
6. 🔴 **`as-of` visible** junto al resultado.
7. 🔴 **Sin gate de email.** 🎯 **Pedirlo reproduciría exactamente el gate que la página denuncia.**
8. 🔴 **El desglose reserva su altura.** Cambiar de Hub **no empuja la página** (CLS).

---

## Layout Skeleton

| # | Slot | Propósito | Componente |
|---|---|---|---|
| **S0** | **Encabezado** | *"¿Cuánto te saldría a ti?"* + **`as-of` a la derecha** | Section header |
| **S1** | **Controles** | **Hubs** (checkboxes) · **tier** (radios) · **seats de pago** + **seats view-only** · **contactos de marketing** | 🔴 **`<fieldset>` + controles NATIVOS.** Nada de sliders con `div` |
| **S2** | 🎯 **El desglose** | `<table>`: licencia · seats de pago · **seats view-only → USD 0 ✓** · contactos (**banda**) · **créditos incluidos (el `max`, con ⓘ)** · **onboarding obligatorio** → **total año 1 comprando directo** | `<table>` semántica, **altura reservada** |
| **S3** | 🎯 **LA BANDA DEL WAIVER** *(el momento)* | *"Con Efeonce (partner certificado)"* → **Onboarding: USD 0** ← *31% menos* → **Año 1: USD 9.600** | Banda destacada. **La única con acento visual del bloque** |
| **S4** | **La implementación** | 🔴 **Sin número.** *"Te la cotizamos con tus números, sin costo."* + **CTA** | Línea + CTA |

> 🎯 **El bloque va DESPUÉS de las trampas (R6 créditos, R7 onboarding), no antes.**
> **Primero entiendes por qué el número es así; después juegas con él.** Un simulador arriba del fold sería un
> juguete. Abajo de las trampas, **es una demostración.**

---

## Copy Ledger

| Copy id | Slot | Texto | Notas |
|---|---|---|---|
| `hs.sim.title` | S0 | **"¿Cuánto te saldría a ti?"** | Directo. **No** *"Calculadora de precios"* |
| `hs.sim.asof` | S0 | "Precios de lista verificados el **{FECHA}**" | 🔴 Junto al resultado, no en el footer |
| `hs.sim.seats_free` | S1 | "Seats **view-only** (gratis)" | 🎯 **El regalo, en el label del control** — antes de que calcule nada |
| `hs.sim.viewonly_line` | S2 | "Seats view-only ({n}) — **USD 0** ✓" | La primera línea que le da una alegría |
| `hs.sim.banda` | S2 | "Contactos (banda de {n}) — **incluidos**" · al saltar: **"⚠️ Cruzaste la banda: +USD {x}/mes"** | 🎯 **La trampa, demostrada en vivo** |
| `hs.sim.creditos` | S2 | "Créditos incluidos: **{max}/mes**" + ⓘ *"No se suman entre Hubs: manda el tier más alto. Y no hay rollover."* | 🔴 **`max`, jamás `sum`** |
| `hs.sim.onboarding` | S2 | "Onboarding obligatorio de HubSpot — **USD {n}**" | 🔴 **Obligatorio**, dicho |
| `hs.sim.total_directo` | S2 | "**Año 1 comprando directo — USD {n}**" | El número honesto **(más alto que la grilla oficial)** |
| 🎯 `hs.sim.waiver.title` | **S3** | **"Con Efeonce (partner certificado)"** | Sin adjetivos |
| 🎯 `hs.sim.waiver.line` | **S3** | "Onboarding — **USD 0**" · badge: **"{n}% menos en el año 1"** | 🎯 **El momento entero de la página** |
| `hs.sim.waiver.nota` | S3 | "El onboarding de HubSpot es **coaching**: te enseñan y lo haces tú. **El nuestro es implementación: te lo construimos.**" | La distinción que lo hace valer |
| 🔴 `hs.sim.impl` | S4 | "**Implementación:** depende de tus Hubs, tu migración y tus integraciones. **Te la cotizamos con tus números, sin costo — y en 48 horas.**" | 🔴 **NUNCA un número ni un rango inventado** |
| `hs.sim.cta` | S4 | "Agenda una reunión" | → Meetings + UTM |
| `hs.sim.disclaimer` | S4 | "Estimado no vinculante, sobre precios de lista. **Los descuentos por término y volumen se negocian — y ahí también te ayudamos.**" | Honesto **y** comercial |

---

## State Copy

| Estado | Copy | Nota |
|---|---|---|
| **Default (server-rendered)** | Marketing Pro · 5 seats · 12 view-only · 2.000 contactos → **12.600 → 9.600** | 🔴 **En el HTML.** El crawler lee un ejemplo completo, **con el waiver** |
| 🎯 **Cruce de banda** | *"⚠️ Cruzaste la banda de contactos: **+USD {x} al mes**. Los saltos no son lineales."* | **La trampa, en vivo** |
| 🎯 **2.º Hub Enterprise** | *"Créditos: siguen siendo **{max}**. **No se suman entre Hubs.**"* | 🔴 **El invariante, visible** |
| **Dato `notPublished`** | *"**HubSpot no publica este monto.** Pídelo por escrito antes de firmar."* | 🔴 **Nunca `0`, nunca un guion mudo** |
| **Dato `secondary`** | *"~USD {rango} — las fuentes públicas no coinciden. El monto exacto depende de tu contrato."* | 🔴 **Nunca precio exacto** |
| 🔴 **El catálogo no carga** | **El simulador no se monta.** La página queda como TASK-1401 | 🎯 **Degradación honesta: no mostramos un simulador roto** |
| 🔴 **Sin JS** | **El estado por defecto, como tabla estática** | **No es degradación: es el estado del HTML** |

---

## Accessibility Contract

- 🔴 **Controles nativos:** `<fieldset>` + `<legend>` · `<input type="checkbox">` (Hubs) · `<input type="radio">`
  (tier) · `<input type="number">` (seats, contactos). **Nada de sliders custom con `div`.**
  *(Un slider de contactos se ve mejor y **hace imposible escribir "2.001" exacto** — que es justo el número que
  demuestra la trampa. **La accesibilidad y el argumento piden lo mismo.**)*
- 🔴 **El resultado se anuncia:** el contenedor del total lleva `aria-live="polite"`.
  **Un usuario de lector de pantalla tiene que saber que el número cambió** — si no, el simulador no existe para él.
- La tabla del desglose es `<table>` semántica con `<th scope>`.
- 🔴 **El `USD 0` del waiver no se comunica solo por color.** Va **escrito**, con su porcentaje.
- Focus ring visible (AA) en todos los controles. Touch targets ≥ 44 px.
- El ⓘ de créditos es un `<button>` con `aria-expanded` **o** texto siempre visible. 🎯 **Preferir texto visible:**
  es el dato más importante del bloque, **y esconderlo detrás de un tooltip sería enterrar el argumento**.
- 390 px: controles apilados; **el desglose y el waiver siguen visibles sin scroll horizontal de página**.

---

## Implementation Mapping

| Slot | Implementación | Notas |
|---|---|---|
| S0 | Section header + `as-of` | Texto servido |
| S1 | `<fieldset>` + controles nativos | Sin librerías |
| S2 | **`<table>` con altura reservada** | 🔴 **CLS 0 al recalcular** |
| S3 | Banda destacada, page-scoped | 🎯 El único acento visual del bloque |
| S4 | Línea + `<a>` a Meetings | 🔴 **Sin número** |
| **Lógica** | 🔴 **`estimateHubSpotCost()` de TASK-1405** — server (default) **y** client (recálculo) | **La misma función pura. Cero duplicación** |
| Motion | Hereda el contract del hub | **Ver la distinción count-up vs state-transition** |

🔴 **Cero primitives nuevas. Cero backend. Cero librerías. Cero cálculo propio.**

---

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-precios` (**se extiende el de TASK-1401**) · Viewports **1440 + 390**
- Pasos: cargar → **capturar el default** → Marketing Pro + 5 seats → 🎯 **cruzar 2.000 → 2.001 y capturar el
  salto** → agregar un 2.º Hub Enterprise → 🎯 **verificar que los créditos NO se suman** → capturar
  **la banda del waiver** → click CTA.
- Capturas: **default** · **el salto de banda** · **los créditos con 2 Hubs** · 🎯 **el waiver (línea en cero)** ·
  **reduced-motion** · **390 px** · **sin-JS**.
- **Assertions:**
  - 🔴 **Sin JS:** el bloque muestra **su default completo, con el waiver**, en el HTML servido.
  - 🔴 **Ningún número arranca en `0`** al cargar *(anti count-up)*.
  - 🔴 **Créditos con 2 Hubs Enterprise = `max`, no la suma** *(assertion sobre el DOM)*.
  - 🔴 **La línea de implementación NO tiene número.**
  - 🔴 **No existe `<input type="email">` en el bloque.**
  - 🔴 **`notPublished` se muestra como texto**, nunca `0`.
  - `as-of` visible · **CLS < 0,05 al recalcular** · `aria-live` presente · controles nativos.

---

## Design Decision Log

- **Decisión: enhancement sobre la página estática, no la página.** **Alternativa descartada:** *reemplazar el
  contenido por el simulador* — es lo natural, y **destruye el activo del hub**: los crawlers de IA no ejecutan
  JS, así que perderíamos la citación de *"cuánto cuesta HubSpot"* — **que es la razón por la que la página
  existe**.
- **Decisión: el default se renderiza server-side.** Así el crawler lee **un ejemplo completo con el waiver
  incluido** — 🎯 **el simulador nos hace *más* citables, no menos.**
- 🔴 **Decisión: controles nativos, y el de contactos es un `<input type=number>`, no un slider.** Un slider se ve
  mejor **y hace imposible escribir 2.001 exacto** — que es justo el número que demuestra el salto de banda.
  **La accesibilidad y el argumento piden lo mismo: es una buena señal.**
- **Decisión: la implementación no tiene número.** **Alternativa descartada:** *un rango* — un rango inventado es
  *"mentir con precisión"*, que es exactamente lo que la página denuncia. **Va sin número hasta que el cotizador
  real lo calcule (TASK-1407).**
- **Decisión: sin gate de email.** No se discute: **la página existe para denunciar el gate**
  (*"agenda una demo para saber el precio"*). Ponerle uno la convierte en lo que critica.
- **Decisión: el bloque va después de las trampas.** Primero entiendes, después juegas.
  **Arriba del fold sería un juguete; abajo, es una demostración.**
- 🎯 **El efecto secundario más valioso, y es deliberado:** **nuestro número sale más alto que el de la grilla
  oficial de HubSpot**, porque incluye lo que ellos no muestran. **Nadie va a decirlo en el copy — pero el CFO lo
  va a notar.** Y es el argumento más fuerte que la página puede hacer.

## Acceptance Checklist

- [ ] 🔴 **Sin JS: la página es TASK-1401 completa + el default del simulador como tabla estática, con el waiver.**
- [ ] 🔴 **Ningún count-up.** Ningún número arranca en `0`.
- [ ] 🔴 **Cero cálculo propio** — llama a `estimateHubSpotCost()`.
- [ ] 🎯 **El waiver se ve ponerse en cero**, con su porcentaje escrito.
- [ ] 🎯 **El salto de banda** y **los créditos que no se suman** son demostrables en vivo.
- [ ] 🔴 **La implementación no tiene número.** 🔴 **No hay campo de email.**
- [ ] `notPublished` como texto · `secondary` como rango · **`as-of` visible**.
- [ ] Controles nativos · `aria-live="polite"` · focus AA · **CLS < 0,05** · sin scroll horizontal.
- [ ] Si el catálogo no carga, **el simulador no monta** y la página sigue perfecta.
- [ ] GVC 1440 + 390 + reduced-motion + **before/after**, capturado **y mirado**.
