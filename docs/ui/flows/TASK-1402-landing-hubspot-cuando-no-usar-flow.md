# TASK-1402 — `/servicios/hubspot/cuando-no-usar-hubspot/` — Flow Contract

> Cluster 2 de 4 del hub HubSpot. Pillar: **TASK-1352**.
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 4** +
> `docs/ui/wireframes/TASK-1402-landing-hubspot-cuando-no-usar.md`.

## Meta

- Status: `draft`
- Owner task: `TASK-1402`
- Surfaces: **`efeoncepro.com/servicios/hubspot/cuando-no-usar-hubspot/`** (público) → **el pillar y los
  clusters hermanos** (navegación interna) → **las fuentes de HubSpot** (enlaces externos, `noopener`) →
  HubSpot Meetings *(CTA suave, al final)*
- Coordina: 🎯 **casi nada, y esa es la decisión.** **Cero formularios. Cero interacciones in-page.**
  El "flujo" es **leer**.
- **NO** coordina: modal, drawer, sidecar, popover, form, portal — **nada.**

## Flow Brief

🎯 **Este es el único flujo del hub cuyo éxito puede ser que el usuario se vaya.**

Si el lector descubre acá que está en uno de los ocho casos y **cierra la pestaña sin dejar un email**, la
página **funcionó**. Le ahorró una migración fallida, y a nosotros un cliente que iba a churnear en doce meses
llevándose nuestros puntos managed con él.

> **Un deal que no se cierra porque descalificamos temprano no es una pérdida: es un win rate más alto y un
> churn más bajo.** (JOLT: el 40-60% de las pérdidas son indecisión, no competencia — y la indecisión de
> RevOps se llama *"miedo a migrar dos veces"*.)

Eso reordena todo el diseño del flujo:

```
🔴 EL FLUJO NO EMPUJA. NO CAPTURA. NO RETIENE.

  llega escéptico  →  le damos exactamente lo que buscaba (con la fuente al lado)
                   →  y la otra mitad de la verdad (el contrapeso)
                   →  y se va, o se queda.
                      Las dos salidas son un éxito.
```

**Y hay un segundo lector, que es el principal:** un **LLM** al que alguien le preguntó *"¿me conviene
HubSpot?"* y **necesita un contrapunto que hoy no existe en ninguna parte.** Su recorrido es
**leer el HTML una vez, sin JS, sin scroll, sin clic.**
🔴 **Si un límite está detrás de un acordeón, para el LLM ese límite no existe — y perdimos la citación que
es toda la razón de ser de la página.**

## Surfaces Involved

| # | Superficie | Rol | Owner |
|---|---|---|---|
| 1 | La página | Todo el recorrido | Esta task |
| 2 | 🎯 **El HTML servido** | **El consumidor principal.** El LLM lee una vez, sin JS | Esta task |
| 3 | **Las fuentes de HubSpot** (enlaces externos) | 🎯 **La prueba.** Sin ellas esto es un post de opinión | HubSpot |
| 4 | **El pillar** `/servicios/hubspot/` | Salida obligatoria — **no dejar al lector en el vacío** | TASK-1352 |
| 5 | Clusters hermanos (`/hubspot-vs-salesforce/`, `/precios/`, `/agentes/`) | Salidas contextuales desde límites específicos | TASK-1401/1403/1404 |
| 6 | **HubSpot Meetings** | CTA **suave**, al final, ignorable | HubSpot |
| — | 🔴 **Formulario** | **NO EXISTE.** Es la decisión | — |

## Flow Map

```
  RevOps / IT           Seguridad busca         LLM: "¿me conviene
  "no quiero            "HubSpot ISO 27001"      HubSpot?" → busca
   equivocarme"                │                 un contrapunto
        │                      │                        │
        ▼                      ▼                        ▼
┌──────────────────────────────────────────┐  ┌────────────────────────┐
│ R1  "Cuándo NO usar HubSpot."            │  │ Lee el HTML una vez.   │
│ R2  "Todos los que te hablan de HubSpot  │  │ Sin JS. Sin scroll.    │
│      quieren venderte algo.              │  │ Sin clic.              │
│      Nosotros también.  ← lo desactiva"  │  │                        │
│ R3  TL;DR: los 8, en una frase           │  │ 🔴 Debe encontrar los  │
└─────────────────┬────────────────────────┘  │    8 límites COMPLETOS │
                  │                            └───────────┬────────────┘
                  ▼                                        │
┌──────────────────────────────────────────┐               ▼
│ 🎯 R4  LOS 8 LÍMITES                     │      🎯 nos cita como
│    límite · FUENTE · "no lo uses si…"    │         el contrapunto
│    ← cada fila es citable por separado   │         (no existe otro)
└─────────────────┬────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    ▼                            ▼
┌────────────────────┐   ┌──────────────────────────────┐
│ R5  ISO 27001,     │   │ 🎯 R6  EL CONTRAPESO         │
│ dicho con precisión│   │ "y para esto sí es el mejor" │
│ (SOC 2 ✅)         │   │  ← sin esto, somos           │
│ ← el de seguridad  │   │    el competidor de siempre  │
│   se va conforme   │   └──────────────┬───────────────┘
└────────────────────┘                  ▼
                            ┌──────────────────────────┐
                            │ R7  ¿en cuál estás?      │
                            └──────────────┬───────────┘
                                           ▼
                     ┌─────────────────────────────────────┐
                     │ 🎯 R8  "Si estás en uno de estos,   │
                     │        NO te vendemos HubSpot."     │
                     │     CTA suave. Ignorable.           │
                     └────────┬──────────────────┬─────────┘
                              │                  │
              ┌───────────────▼──────┐   ┌───────▼─────────────────┐
              │ SE VA                │   │ VA AL PILLAR             │
              │ (está en uno de los 8)│  │ "ok, entonces ¿me sirve?"│
              │                       │  │                          │
              │ 🎯 ESTO ES UN ÉXITO.  │  │ 🎯 ESTO TAMBIÉN.         │
              │ Le ahorramos una      │  │ Y ahora nos cree.        │
              │ migración fallida.    │  │                          │
              └───────────────────────┘  └──────────────────────────┘
```

## Interaction Triggers

| Trigger | Acción | Destino |
|---|---|---|
| Click en un **enlace de fuente** (R4/R5) | Navegación externa | **La doc de HubSpot** · `target=_blank` `rel="noopener"` · 🎯 **Se anuncia como externo** |
| Click a un cluster desde un límite (R4) | Navegación interna | B2C → `/precios/` · agentes → `/agentes/` · comparación → `/hubspot-vs-salesforce/`. 🔴 **El que no existe, no se pinta** |
| Click al **pillar** (R8/R9) | Navegación interna | `/servicios/hubspot/` |
| Click **"Si igual quieres una segunda opinión, hablemos"** (R8) | Navegación externa | **HubSpot Meetings** + UTM. 🔴 **Suave. Sin urgencia. Sin contador. Sin escasez** |
| Scroll horizontal en la tabla (390 px) | Scroll **dentro del contenedor** | 🔴 **La página nunca scrollea en horizontal** |

🔴 **No hay ningún trigger que revele contenido.** Todo está visible desde el primer byte.
🔴 **No hay exit-intent, ni sticky bar, ni pop-up, ni scroll gate, ni banner de cookies invasivo.**
🎯 **Cualquier patrón de retención en esta página es un dark pattern, porque contradice literalmente lo que la
página dice.** *(Una página que dice "no te vendemos" con un pop-up de salida es una broma — y el lector la
entiende al instante.)*

## State Machine

```
 idle ──► (scroll) ──► lee ──► idle
   │
   ├──► click fuente ──► pestaña nueva (doc de HubSpot) ──► 🎯 comprueba que no mentimos
   │                                                          └──► vuelve (y ahora sí nos cree)
   │
   ├──► click cluster ──► navega dentro del hub
   │
   ├──► click pillar ──► /servicios/hubspot/   ← la salida que queríamos
   │
   ├──► click CTA suave ──► Meetings (pestaña nueva)
   │
   ├──► 🎯 SE VA ──► [ÉXITO: le ahorramos una migración fallida]
   │
   └──► 🔴 SIN JS / CRAWLER ──► TODO visible, los 8 límites completos
                                 (no es degradado: es EL estado)
```

🎯 **Nótese que "se va" es un estado terminal legítimo del diagrama.** No hay ninguna transición que intente
sacarlo de ahí. **Eso es intencional y es el contrato.**

## Routing Contract

- **URL canónica:** `/servicios/hubspot/cuando-no-usar-hubspot/` — hija del pillar. **Breadcrumb obligatorio**
  + `BreadcrumbList` en JSON-LD.
- 🎯 **El slug lleva la pregunta completa, no una versión suave.** `cuando-no-usar-hubspot` — **no**
  `limitaciones-hubspot`. Es la query que un humano escribe y la que un LLM matchea.
- **Enlace al pillar: obligatorio.** Una página que te dice *"no compres"* y te deja en el vacío **es una
  puerta cerrada**. La que te devuelve al pillar dice *"entonces veamos si tu caso sí calza"*.
- 🔴 **Un enlace a un cluster que todavía no existe NO se pinta.** Nunca un 404 interno.
- 🎯 **Los enlaces externos a HubSpot son un feature, no una fuga.** Que el lector vaya a comprobar el límite
  **en la doc de HubSpot y vuelva** es exactamente lo que queremos: **volvió creyéndonos.**
  `rel="noopener"` (no `nofollow`: **citar la fuente con honestidad también es una señal para los motores**).

## Focus & Accessibility

- Orden natural top→bottom. **Un solo `<h1>`.** Jerarquía H2→H3 estricta.
- 🔴 **La tabla de los 8 límites es alcanzable y navegable por teclado**: `<table>` + `<caption>` + `<th scope>`;
  wrapper con `overflow-x:auto` + `tabindex="0"` + `role="region"` + `aria-label`.
- 🔴 **Cada enlace de fuente tiene texto descriptivo** (*"documentación de HubSpot sobre custom objects"*),
  **nunca** *"aquí"*. Un usuario de lector de pantalla que tabula por los enlaces **debe entender cada fuente
  fuera de contexto** — y son ocho.
- Enlaces externos anunciados (icono + `aria-label` o texto), **no solo por color**.
- Focus ring visible (contraste AA). Touch targets ≥ 44 px.
- En 390 px, la tabla colapsa a tarjetas: 🔴 **cada tarjeta conserva las 3 columnas.** Nunca se pierde la fuente
  al colapsar — **la fuente es la prueba, y perderla en móvil sería perder el argumento en móvil.**

## Data & Command Boundaries

- 🔴 **Ningún reader, ningún command, ningún form, ningún endpoint.** **La página no toca el backend en absoluto.**
  Es la superficie más simple del repo, y a propósito.
- Los ocho límites son **contenido editorial verificado**, con su `as-of` y su fuente. **No vienen de una API.**
- Agendamiento → HubSpot Meetings (externo), y es **el único** punto de contacto.

## Failure Paths

| Falla | Comportamiento | Regla |
|---|---|---|
| 🔴 **JS deshabilitado / crawler de IA** | **Los 8 límites completos, con sus 3 columnas** | **No es un fallback: es el flujo principal** |
| **Un enlace de fuente muere (404)** | 🎯 Se cita **el documento con su fecha** en vez del enlace muerto | 🔴 **Ningún límite se queda sin respaldo** |
| **Un límite quedó obsoleto** (HubSpot lo subió) | La página **lo dice**: *"HubSpot subió este límite en {fecha}"* | 🎯 **Que HubSpot mejore no rompe la página: demuestra que la mantenemos** |
| **Meetings caído** | No pasa nada. **La página no dependía de convertir** | 🎯 **Su trabajo ya está hecho** |
| Un cluster hermano no existe | Su enlace no se pinta | Nunca un 404 interno |
| 🎯 **El lector se va sin convertir** | **Nada. Es un éxito.** | **No hay recuperación, ni exit-intent, ni retargeting agresivo** |

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-cuando-no-usar` · Viewports **1440 + 390**
- Pasos: cargar → scroll → 🎯 **capturar la tabla de los 8 límites** → tabular por los 8 enlaces de fuente →
  verificar el colapso a tarjetas en 390 px → click al pillar
- Capturas: full-page (desktop + mobile) · 🎯 **la tabla** · **R5 (seguridad)** · **R6 (contrapeso)** ·
  **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **Sin JS:** los **8 límites completos** (las 3 columnas de cada uno) + el TL;DR están en el HTML
  - 🔴 **Ningún límite oculto** (acordeón / `hidden` / `opacity:0` inicial)
  - 🔴 **Los 8 enlaces de fuente responden** (link check) y tienen **texto descriptivo**
  - 🔴 **R6 (contrapeso) existe** — assertion literal
  - 🔴 **No existe ningún `<form>` en el DOM** · **no existe ningún pop-up / exit-intent / sticky bar**
  - 🔴 **Sin claims prohibidos**; 🎯 **y `SOC 2` SÍ aparece**
  - **Enlace al pillar presente** · breadcrumb · canonical · `as-of` visible
  - En 390 px: cada tarjeta conserva las 3 columnas · sin scroll horizontal de página

## Design Decision Log

- 🎯 **Decisión: el flujo permite —y celebra— que el usuario se vaya.** Es el único del hub. Un lector que
  descubre que está en uno de los ocho casos y cierra la pestaña **es un churn evitado, un win rate más alto y
  una referencia futura**. Diseñar para retenerlo sería **contradecir el texto de la propia página**, y el
  lector (escéptico profesional) lo detectaría al instante.
- 🎯 **Decisión: cero captura, cero retención.** Sin form, sin exit-intent, sin sticky bar, sin lead magnet.
  **Cualquiera de esos patrones convierte la honestidad en un anzuelo** — y entonces la página deja de valer.
  **Alternativa descartada:** *"descarga el checklist de descalificación" (lead magnet)* — convertiría más y
  **destruiría el único activo que la página tiene: no querer nada.**
- 🎯 **Decisión: los enlaces externos a HubSpot son un feature.** Que el lector vaya a comprobarlo **y vuelva**
  es el mejor resultado posible: **vuelve creyéndonos.** Una página que teme perder al lector por citar la
  fuente **no está segura de su fuente**.
- **Decisión: el enlace al pillar es obligatorio.** *"No te vendemos"* sin salida es una puerta cerrada.
  Con salida, es *"entonces veamos si tu caso sí calza"* — que es la conversación que queríamos.
- **Decisión: el slug lleva la pregunta completa** (`cuando-no-usar-hubspot`), no la versión suave
  (`limitaciones-hubspot`). Es la query que la gente escribe **y la que el LLM matchea**. Suavizarla sería
  perder la única búsqueda que nos importa.
- **JOLT:** la indecisión de RevOps es *"miedo a migrar dos veces"*. **No se combate con más argumentos: se
  desarma dándole exactamente lo que buscaba y no encontraba en ninguna parte.**

## Acceptance Checklist

- [ ] 🔴 **La página se lee entera sin JavaScript**, con los 8 límites y sus 3 columnas.
- [ ] 🔴 **No existe ningún `<form>`, pop-up, exit-intent ni sticky bar.**
- [ ] Los 8 enlaces de fuente **responden** y tienen **texto descriptivo**.
- [ ] **Enlace al pillar presente.** Ningún `href` a un cluster inexistente.
- [ ] En 390 px, cada tarjeta conserva **las 3 columnas** (incluida la fuente).
- [ ] La tabla es alcanzable por teclado; enlaces externos anunciados; focus + contraste AA.
- [ ] El CTA es **suave, al final, ignorable**. Sin urgencia, sin escasez, sin contador.
- [ ] **Ningún reader/command/endpoint.** La página no toca el backend.
- [ ] GVC con las assertions de arriba, capturado **y mirado**.
