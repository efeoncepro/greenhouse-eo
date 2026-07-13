# TASK-1406 — Simulador de precios HubSpot — Flow Contract

> Enhancement sobre **TASK-1401**. Motor: **TASK-1405**.
> Fuente: `docs/ui/wireframes/TASK-1406-hubspot-price-simulator.md`.

## Meta

- Status: `draft`
- Owner task: `TASK-1406`
- Surfaces: bloque `#simulador` dentro de `efeoncepro.com/servicios/hubspot/precios/` →
  **HubSpot Meetings** (externo) · el **catálogo público** de TASK-1405 (`GET /api/public/growth/hubspot-pricing/catalog`)
- Coordina: **una** interacción in-page (el recálculo) · **una** navegación externa (Meetings)
- **NO** coordina: modal, drawer, sidecar, popover, form de captura — **ninguno**

## Flow Brief

🎯 **El flujo tiene un solo objetivo, y es un momento:**

```
el usuario ya entendió las trampas (R6, R7 de TASK-1401)
   →  ahora quiere SU número
   →  lo arma en 15 segundos con cuatro controles
   →  ve el total: USD 12.600      ← más alto que la grilla oficial. Y eso es la prueba.
   →  activa "con Efeonce"
   →  🎯 el onboarding SE PONE EN CERO.  USD 9.600.  −31%.
   →  y entonces sí: "y la implementación, ¿cuánto?"  → la reunión
```

**Fíjate en el orden causal: el CTA no lo dispara un botón. Lo dispara el número.**

Y hay dos flujos más, que **el usuario descubre solo** y que valen tanto como el waiver:

| Lo que hace | Lo que ve | Por qué importa |
|---|---|---|
| Sube contactos de **2.000 → 2.001** | **El total salta de golpe** | 🎯 **La trampa del escalonamiento, demostrada.** En la grilla de HubSpot es invisible |
| Agrega un **2.º Hub Enterprise** | **Los créditos NO se duplican** | 🎯 **La trampa de los créditos, demostrada.** Es el dato más citable del hub |

🔴 **Y el cuarto usuario, otra vez, es el crawler.** Lee el **estado por defecto server-rendered** — un ejemplo
completo, **con el waiver adentro**. 🎯 **El simulador nos hace *más* citables, no menos:** antes el crawler
leía la explicación; ahora lee **la explicación y un caso resuelto.**

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | El bloque `#simulador` | Todo el recorrido | Esta task |
| 2 | 🎯 **El estado por defecto en el HTML servido** | **Lo que lee el crawler.** Un ejemplo completo | Esta task |
| 3 | **El estimador puro** `estimateHubSpotCost()` | 🔴 **La lógica. Server y client corren el MISMO código** | **TASK-1405** |
| 4 | `GET /api/public/growth/hubspot-pricing/catalog` | El catálogo, cacheable, sin auth | **TASK-1405** |
| 5 | **HubSpot Meetings** | El CTA — *"te cotizamos la implementación"* | HubSpot |
| — | 🔴 **Formulario de captura** | **NO EXISTE en el bloque.** Sin email, sin gate | — |

## Flow Map

```
      llega a /precios/ (tráfico frío desde Google)
                     │
                     ▼
      ┌──────────────────────────────────────────┐
      │  R2-R7 de TASK-1401 (estático, servido)  │
      │  cómo se cobra · seats · saltos ·         │
      │  🎯 LOS CRÉDITOS · el onboarding         │
      │                                           │
      │  ← acá ENTIENDE. Todavía no juega.       │
      └────────────────────┬─────────────────────┘
                           ▼
      ┌──────────────────────────────────────────┐
      │  S0-S1  "¿Cuánto te saldría a ti?"       │
      │  [Hubs] [tier] [seats] [contactos]        │
      │  ← estado por defecto YA CALCULADO,      │
      │    servido en el HTML                     │
      └────────────────────┬─────────────────────┘
                           │  toca un control
                           ▼
      ┌──────────────────────────────────────────┐
      │  S2  EL DESGLOSE (recálculo instantáneo) │
      │  licencia · seats view-only = USD 0 ✓    │
      │  contactos (banda) · créditos (max) ⓘ    │
      │  onboarding obligatorio                   │
      │  ─────────────────────────────────────    │
      │  Año 1 comprando directo:  USD 12.600     │
      │                                           │
      │  🎯 (más alto que la grilla oficial —     │
      │      porque está completo. Nadie lo dice, │
      │      pero el CFO lo nota.)                │
      └────────────────────┬─────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐
 │ sube a      │   │ agrega 2.º   │   │ activa             │
 │ 2.001       │   │ Hub Ent.     │   │ "con Efeonce"      │
 │ contactos   │   │              │   │                    │
 │             │   │ créditos     │   │ 🎯 ONBOARDING → 0  │
 │ 🎯 EL TOTAL │   │ NO se        │   │    Año 1: 9.600    │
 │    SALTA    │   │ duplican     │   │    −31%            │
 │             │   │              │   │                    │
 │ "la trampa, │   │ "la trampa,  │   │  ◄── EL MOMENTO    │
 │  en vivo"   │   │  en vivo"    │   └─────────┬──────────┘
 └─────────────┘   └──────────────┘             │
                                                 ▼
                            ┌────────────────────────────────────┐
                            │  S4  "¿y la implementación?"       │
                            │  🔴 SIN NÚMERO.                    │
                            │  "Te la cotizamos con tus números, │
                            │   sin costo, en 48 horas."         │
                            │       [ Agenda una reunión ]       │
                            └────────────────────────────────────┘

  ─── y en paralelo, siempre ───
  🔴 CRAWLER / SIN JS ──► lee el estado por defecto COMPLETO,
                           con el waiver adentro. Nos cita.
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Cambiar un Hub / tier / seats / contactos | 🎯 **Recálculo local, síncrono, instantáneo** | El desglose se actualiza. **Sin round-trip, sin spinner** |
| Cruzar una banda de contactos | El total **salta** + aparece la nota *"cruzaste la banda"* | 🎯 **La trampa, demostrada** |
| Agregar un 2.º Hub Enterprise | Los créditos **se mantienen en el `max`** + nota | 🎯 **El invariante, visible** |
| Activar **"con Efeonce"** | 🎯 **La línea del onboarding pasa a `USD 0`** + badge de % | **El momento de la página** |
| Click **"Agenda una reunión"** (S4) | Navegación externa | **HubSpot Meetings** + UTM · `target=_blank` `rel="noopener"` |
| 🔴 **Ningún trigger pide un email** | — | **No existe el campo** |

🔴 **Ninguna interacción es requisito para ver un número.** El default ya está calculado y servido.
🎯 **Y ninguna interacción tiene latencia:** el estimador es puro y el catálogo ya está en la página.
**Si aparece un spinner, alguien metió un round-trip que no hacía falta.**

## State Machine

```
 (server) render del default ──► HTML con el desglose completo + el waiver
     │
     ├──► 🔴 SIN JS / CRAWLER ──► se queda ahí. Y está COMPLETO.
     │                             (no es degradación: es el estado)
     │
     └──► (JS carga) ──► el bloque se vuelve interactivo
             │
             ├──► cambia control ──► recálculo síncrono ──► desglose nuevo
             │                              │
             │                              ├──► cruzó banda   ──► nota + salto
             │                              └──► 2.º Hub Ent.  ──► créditos = max + nota
             │
             ├──► activa "con Efeonce" ──► 🎯 onboarding = 0 ──► total nuevo + %
             │
             ├──► click CTA ──► pestaña nueva (Meetings)
             │
             └──► 🔴 el catálogo NO carga ──► el bloque NO se monta
                                              (la página queda como TASK-1401,
                                               y sigue siendo buena)
```

🎯 **Nótese que el estado inicial no es "vacío" ni "cargando": es un resultado.** Esa es toda la diferencia entre
un simulador que suma citabilidad y uno que la destruye.

## Routing Contract

- **No hay rutas nuevas.** El simulador vive en `#simulador`, dentro de `/servicios/hubspot/precios/`.
- El ancla `#simulador` es navegable *(el CTA secundario del hero de TASK-1401 puede apuntar acá, o seguir
  apuntando a `#creditos` — **recomendado: seguir en `#creditos`**, porque **el dato convence antes que el
  juguete**)*.
- **HubSpot Meetings** → pestaña nueva.
- 🔴 **El catálogo se pide a `GET /api/public/growth/hubspot-pricing/catalog`** — mismo origen, cacheable.
  Si falla, **el bloque no se monta** *(no se reintenta con backoff ni se muestra un error: **no hay nada que
  arreglar del lado del usuario**)*.

## Focus & Accessibility

- 🔴 **Controles nativos**: `<fieldset>` + `<legend>` · checkboxes (Hubs) · radios (tier) ·
  `<input type="number">` (seats, contactos). **Nada de sliders custom.**
  🎯 **Y hay una razón de argumento, no solo de a11y:** un slider **hace imposible escribir `2.001` exacto** —
  que es justo el número que demuestra el salto de banda. **La accesibilidad y el argumento piden lo mismo.**
- 🔴 **`aria-live="polite"` en el contenedor del total.** Un usuario de lector de pantalla **tiene que enterarse
  de que el número cambió** — si no, el simulador no existe para él.
- 🔴 **El `USD 0` del waiver va escrito**, con su porcentaje. **Nunca solo en color.**
- La nota de créditos es **texto visible**, no un tooltip. 🎯 **Es el dato más importante del bloque: esconderlo
  detrás de un ⓘ sería enterrar el argumento.**
- Tabla del desglose semántica (`<th scope>`). Focus ring AA. Touch targets ≥ 44 px.
- Orden de tabulación: Hubs → tier → seats → contactos → *"con Efeonce"* → CTA. **Natural, sin traps.**

## Data & Command Boundaries

- 🔴 **Ningún reader ni command nuevo de esta task.** El bloque es **consumer** del estimador de TASK-1405.
- 🔴 **Cero cálculo propio.** **Si en el JS de la página aparece una multiplicación de precios, la task está mal
  hecha** — y viola Full API Parity (la lógica vive en `src/lib/**`, no en el componente).
- **Cero PII, cero write, cero auth.** El catálogo son **precios que HubSpot ya publica**.
- Agendamiento → **HubSpot Meetings** (externo).
- 🔴 **El estimado no se persiste, no se envía por email y no se comparte por token.** *(Hacerlo lo convertiría en
  lead magnet y abriría la puerta al gate de email — que es lo que la página denuncia. Si algún día se comparte,
  **se comparte sin pedir nada**.)*

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| 🔴 **JS deshabilitado / crawler** | **El default completo, con el waiver, en el HTML** | **No es fallback: es el flujo principal** |
| 🔴 **El catálogo no carga** | **El bloque NO se monta.** La página queda como TASK-1401 | 🎯 **Degradación honesta: no mostramos un simulador roto** |
| **Un dato es `notPublished`** | La línea dice *"HubSpot no publica este monto — pídelo por escrito"* | 🔴 **Nunca `0`, nunca un guion mudo** |
| **Un dato es `secondary`** | Sale como **rango**, con nota | 🔴 **Nunca precio exacto** |
| **El `as-of` está viejo** | La nota de TASK-1401 aplica: *"confírmalos con nosotros"* | 🎯 **Y el gate de CI de TASK-1405 ya debería haberlo impedido** |
| **Meetings caído** | El usuario **ya tiene su número**. La página cumplió | **No dependemos de convertir** |

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-precios` (**extiende** el de TASK-1401) · Viewports **1440 + 390**
- Pasos: cargar → **capturar el default** → Marketing Pro + 5 seats → 🎯 **cruzar 2.000 → 2.001 y capturar el
  salto** → agregar un 2.º Hub Enterprise → 🎯 **verificar créditos = `max`** → activar *"con Efeonce"* →
  🎯 **capturar el waiver en cero** → click CTA.
- Capturas: default · **el salto de banda** · **los créditos con 2 Hubs** · 🎯 **el waiver** · **reduced-motion** ·
  **390 px** · **sin-JS** · **before/after**.
- **Assertions:**
  - 🔴 **Sin JS:** el default completo **con el waiver** está en el HTML servido.
  - 🔴 **Ningún número arranca en `0`** *(anti count-up)*.
  - 🔴 **Créditos con 2 Hubs Enterprise = `max`, NO la suma.**
  - 🔴 **La línea de implementación no tiene número.**
  - 🔴 **No existe `<input type="email">`** en el bloque.
  - `aria-live` presente · controles nativos · **CLS < 0,05 al recalcular** · `as-of` visible.
  - Sin scroll horizontal (1440 y 390).

## Design Decision Log

- 🎯 **Decisión: el CTA lo dispara el número, no un botón.** Todo el flujo existe para llegar a un momento —
  **ver el onboarding ponerse en cero** — y recién ahí pedir la reunión. **El waiver en prosa es un claim; el
  waiver en pantalla es una demostración.**
- 🔴 **Decisión: el estado inicial es un resultado, no un vacío.** Se renderiza server-side.
  **Alternativa descartada:** *arrancar vacío / en 0 y llenar con JS* — es el patrón por defecto de todo
  simulador **y destruye la citabilidad**, que es el activo del hub. *(Y es, literalmente, el bug que
  encontramos en la página viva de HubSpot: contadores que renderizan `00` al `fetch` sin JS.)*
- 🎯 **Decisión: el simulador nos hace MÁS citables.** Antes el crawler leía la explicación de las trampas;
  ahora lee **la explicación y un caso resuelto con el waiver aplicado**. **Es contenido nuevo, no menos.**
- 🔴 **Decisión: `<input type=number>` para contactos, no slider.** El slider se ve mejor y **hace imposible
  escribir 2.001 exacto** — el número que demuestra la trampa. **La a11y y el argumento coincidieron.**
- **Decisión: sin gate de email, y no se discute.** La página existe para denunciar el gate.
  **Ponerle uno la convierte en lo que critica.**
- **Decisión: la implementación no tiene número.** Un rango inventado es *"mentir con precisión"*.
  **Va sin número hasta que el cotizador real lo calcule (TASK-1407)** — y ese día, **la línea cambia sola, sin
  rediseñar nada.**
- **Decisión: si el catálogo no carga, el bloque no monta.** **No se muestra un simulador roto ni un error:**
  la página sin simulador **sigue siendo buena**. *(Eso es lo que significa que sea enhancement.)*

## Acceptance Checklist

- [ ] 🔴 **Sin JS: el default completo, con el waiver, está en el HTML servido.**
- [ ] 🔴 **Ningún count-up.** El estado inicial **es un resultado**, no un vacío.
- [ ] 🎯 **El waiver se ve ponerse en cero.** **El salto de banda** y **los créditos que no suman** son demostrables.
- [ ] 🔴 **Cero cálculo propio** — consume `estimateHubSpotCost()` de TASK-1405.
- [ ] 🔴 **No hay campo de email.** No se persiste ni se comparte el estimado.
- [ ] Recálculo **síncrono, sin spinner**. **CLS < 0,05.**
- [ ] Controles nativos · `aria-live="polite"` · focus AA · sin scroll horizontal.
- [ ] Si el catálogo no carga, **el bloque no monta** y la página sigue perfecta.
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
