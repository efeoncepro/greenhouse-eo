# PDR-010 — La Home ES el pitch de la agencia; `/agencia` se pliega; About Us es el gap

> **Tipo:** Product Decision Record (IA + posicionamiento del sitio público).
> **Estado:** Accepted — sesión de diseño de la Home con el operador, 2026-07-08.
> **Refina:** [PDR-008](PDR-008-landing-agencia-marketing-digital-posicionamiento.md) (§Arquitectura de información: el split Home ≠ `/agencia`). NO invalida su doctrina de copy/CRO/SEO — la reubica en la Home.
> **Skills:** `copywriting`, `growth-marketing-cro`, `digital-marketing`, `seo-aeo`, `efeonce-public-site-wordpress`, `commercial-expert`.
> **No-duplicación:** cita PDR-008 y `docs/context/09_marca-agencia.md` / `05_voz-tono-estilo.md`; no recopia su sustrato.

## Contexto

Al escribir el copy de la Home (encuadre "agencia premium", PDR-008 §posicionamiento) y ponerlo lado a lado con el copy de `/agencia`, el operador detectó que **eran el mismo discurso** y aplicó la heurística correcta: *si hay que forzar tanto la distinción, la distinción no existe.*

La causa raíz: **una agencia tiene un solo trabajo de venta arriba del embudo** — el pitch de la agencia. Efeonce no es un SaaS multi-producto ni un marketplace multi-audiencia cuya home tenga que repartir entre mundos distintos. Quien llega a la Home quiere una sola cosa —*"¿qué es esto y debería hablar con ellos?"*— que es **exactamente** el trabajo que PDR-008 le asignó a `/agencia`. Modelar la Home como un "lobby que no argumenta" separado del pitch fue teoría de IA sobre una necesidad que no existe.

Estado real que lo simplifica:

- **`/agencia` nunca se construyó** (TASK-1358 en `to-do`; PDR-008 §canonical: "página nueva → sin 301 entrante"). No hay página que plegar ni equity que preservar.
- **El About Us sí existe** — `/about-us-efeonce/` (page_id 249770), que ya carga el posicionamiento masterbrand ("El crecimiento real no se compra por partes. Se orquesta." · eyebrow "Agencia de crecimiento integrada").

## Decisión

1. **La Home ES el pitch de la agencia.** El copy trabajado "para `/agencia`" se convierte en el copy de la Home. La Home absorbe las tres funciones que PDR-008 le asignó a `/agencia`:
   - **Posicionamiento de categoría** (growth partner con sistema propio, no commodity).
   - **Captura del head term** "agencia de marketing digital" (~2.400/mes de cluster de categoría, Semrush CL) en `<title>`/H1/meta de la Home — es la página con más autoridad del sitio, el mejor candidato para rankearlo.
   - **Repartición de link equity** hacia las spokes `/servicios/*`.

2. **`/agencia` como URL separada no se construye.** Su contenido vive en la Home. **TASK-1358 se reorienta** de "crear `/agencia`" a "rework de la Home como el pitch". No se crea una página near-duplicada (habría sido canibalización de keyword Home↔`/agencia`).

3. **Toda la doctrina de PDR-008 sigue vigente — solo cambia el contenedor.** El reencuadre *no-es-X-es-Y*, las dos capas (posicionamiento vs descubrimiento), el anti-ICP (sin señales de precio SMB), los casos citables (Sky/Bresler/Berel/SSilva, NUNCA GEA), las reglas de voz es-LATAM, el JSON-LD (`Organization`+`Service`), la doctrina CRO y el grader como nodo compartido — **se aplican a la Home**.

4. **El material de identidad se relocaliza al About Us.** Lo que PDR-008 asumía en "la home (marca + ecosistema ASaaS)" — las 4 unidades (Globe/Efeonce Digital/Reach/Wave), ICO, Loop Marketing, el ecosistema de producto Greenhouse/Kortex/Verk — **no es pitch, es identidad**. Va al About Us. La Home conserva solo el *beat de prueba* "lo ves en vivo" (la transparencia operativa como mínimo), **sin nombrar productos**.

5. **About Us es el gap real.** `/about-us-efeonce/` (249770) existe pero hace de nodo de confianza básico; el trabajo pendiente es **rehacerlo como página de identidad / E-E-A-T** (historia, las 4 unidades, método, equipo, creencias). Se bajará a su propio PDR + task.

## El modelo de IA resultante

Hay **un** trabajo de venta arriba del embudo y **dos** trabajos que no son venta:

| Página | Trabajo | ¿Pitch? |
| --- | --- | --- |
| **Home** (`/`) | Vender la agencia + rankear la categoría + repartir a spokes | **Sí** — el pitch (ex-`/agencia`) |
| **`/servicios/*`** | Vender un servicio puntual por keyword | Sí, específico |
| **About Us** (`/about-us-efeonce/`) | Identidad, historia, método, equipo (E-E-A-T) | No |
| **Think** | Educar / autoridad | No |
| **Casos** | Prueba | No |
| **Grader** | Lead magnet / diagnóstico | Nodo de conversión compartido |

La Home no es un tercer género de página: es la fachada = el pitch.

## Consecuencias

- Menos superficie que mantener; se elimina el riesgo de **canibalización de keyword** entre Home y un `/agencia` casi-idéntico.
- La Home concentra la autoridad del dominio para el head term de categoría (mejor que un pillar secundario).
- El gap se traslada a un lugar donde sí es real y distinto: el **About Us**.
- `/servicios` sigue siendo el hub navegacional SEO-neutro (PDR-002, sin cambios). La Home reparte a las spokes igual que iba a hacerlo `/agencia`.
- Coherente con el encuadre elegido por el operador ("agencia premium", NO pivot a "ecosistema de producto"): el ecosistema/producto se cuenta en About Us como identidad, no se vende en la Home.

## Reglas duras

- **NUNCA** construir `/agencia` como página separada near-duplicada de la Home (canibalización). Su contenido es el de la Home.
- **SIEMPRE** cargar el head term "agencia de marketing digital" en `<title>`/H1 de la Home **con** el reencuadre *no-es-X-es-Y* de PDR-008 §1 en la misma sección.
- **NUNCA** meter el material de identidad (4 unidades, ICO, Loop, Greenhouse/Kortex/Verk nombrados) en la Home — va al About Us. La Home conserva solo el beat "lo ves en vivo" sin nombrar productos.
- **SIEMPRE** preservar la doctrina de PDR-008 (dos capas, anti-ICP, casos citables, voz es-LATAM, JSON-LD, CRO, grader compartido) aplicada a la Home.
- **SIEMPRE** registrar el cambio de owner de ruta (`/agencia` → no se crea; Home asume el rol) en el [route-ownership matrix](../../operations/public-site-route-ownership-matrix-20260616.md) antes de indexar.

## Enlaces

- Refina: [PDR-008](PDR-008-landing-agencia-marketing-digital-posicionamiento.md) (ver su Delta 2026-07-08).
- Hermanos: [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (IA/dos capas), [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (ecosistema/capas).
- Ejecución: [`TASK-1358`](../../tasks/to-do/TASK-1358-landing-agencia.md) reorientada (Home = pitch). About Us → PDR + task por definir.
- Contexto: `docs/context/09_marca-agencia.md`, `05_voz-tono-estilo.md`, `13_icp-buyer-personas-jtbd.md`.
