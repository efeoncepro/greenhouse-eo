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

## Delta 2026-07-09 — auditoría del Home live contra el Why/Growth OS

La revisión del Home público live (`https://efeoncepro.com/`, 2026-07-09) confirmó que la decisión de este PDR sigue correcta, pero que el estado vivo **no cumple todavía** el rol definido:

- **Alineación parcial:** el Home ya menciona estrategia, creatividad, tecnología, IA, ecosistema, resultados medibles y `120+` empresas. Hay semillas del sistema.
- **Gap principal:** el Why no manda el primer viewport. El hero actual vende principalmente "marcas que inspiran, venden y escalan"; eso comunica una agencia creativa/digital competente, pero no todavía el sistema operativo de crecimiento ni la co-creación con capacidad/memoria.
- **Falta de mecanismo:** "ecosistema", "IA", "resultados" y "crecimiento" aparecen como claims, pero no quedan encadenados con suficiente fuerza al mecanismo: operación visible, software, datos, aprendizaje, red y memoria acumulada.
- **Bloqueador de confianza:** persiste residuo de template Ohio/Elementor/ThemeForest en contenido visible/indexable: `Quality fonts`, `Google Fonts`, `Responsive and retina ready images`, `WooCommerce pages`, `WPBakery + Elementor`, reviews de ThemeForest y links de demo/theme. Esto no es deuda estética: contradice la promesa de agencia grande, reconocida y global-ready.

Conclusión operativa: **el Home no requiere un retoque de copy; requiere rework de pitch y limpieza estructural de contenido**. Mientras haya contenido de template visible/indexable, la Home no puede considerarse alineada a PDR-010/PDR-012 aunque algunas frases suenen correctas.

## Decisión

1. **La Home ES el pitch de la agencia.** El copy trabajado "para `/agencia`" se convierte en el copy de la Home. La Home absorbe las tres funciones que PDR-008 le asignó a `/agencia`:
 - **Posicionamiento de categoría** (growth partner con sistema propio, no commodity).
 - **Captura del head term** "agencia de marketing digital" (~2.400/mes de cluster de categoría, Semrush CL) en `<title>`/H1/meta de la Home — es la página con más autoridad del sitio, el mejor candidato para rankearlo.
 - **Repartición de link equity** hacia las spokes `/servicios/*`.

2. **`/agencia` como URL separada no se construye.** Su contenido vive en la Home. **TASK-1358 se reorienta** de "crear `/agencia`" a "rework de la Home como el pitch". No se crea una página near-duplicada (habría sido canibalización de keyword Home↔`/agencia`).

3. **Toda la doctrina de PDR-008 sigue vigente — solo cambia el contenedor.** El reencuadre *no-es-X-es-Y*, las dos capas (posicionamiento vs descubrimiento), el anti-ICP (sin señales de precio SMB), los casos citables (Sky/Bresler/Berel), las reglas de voz es-LATAM, el JSON-LD (`Organization`+`Service`), la doctrina CRO y el grader como nodo compartido — **se aplican a la Home**.

4. **La Home vende el sistema, no el catálogo interno.** Tras PDR-012, el encuadre público de la Home es **Growth Operating System / ASaaS**: estrategia, creatividad, medios, datos y software propio como una sola operación. Eso NO significa convertir la Home en una página de producto ni listar Greenhouse/Kortex/Verk como inventario. La Home debe vender el mecanismo y la prueba; el detalle de identidad (4 unidades, ICO, Loop Marketing, ecosistema de producto nombrado) va al About Us.

5. **About Us es el gap real.** `/about-us-efeonce/` (249770) existe pero hace de nodo de confianza básico; el trabajo pendiente es **rehacerlo como página de identidad / E-E-A-T** (historia, las 4 unidades, método, equipo, creencias). Se bajará a su propio PDR + task.

6. **La limpieza de template es requisito de aceptación.** Un rework del Home no puede cerrar con contenido, CTAs, links, testimonios o bloques de demo/theme ajenos a Efeonce. Cualquier vestigio de Ohio/Elementor/ThemeForest visible, indexable o rastreable como contenido editorial es blocker de publicación.

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
- Coherente con PDR-012: la Home vende **Growth Operating System / ASaaS** como categoría pública, pero sin convertirse en inventario de plataformas ni duplicar el About Us.
- El rework debe partir de una auditoría de contenido live: eliminar blocks de template, links de demo, testimonios no-Efeonce, categorías dummy y copy genérico antes de optimizar CRO o motion.

## Reglas duras

- **NUNCA** construir `/agencia` como página separada near-duplicada de la Home (canibalización). Su contenido es el de la Home.
- **SIEMPRE** cargar el head term "agencia de marketing digital" en `<title>`/H1 de la Home **con** el reencuadre *no-es-X-es-Y* de PDR-008 §1 en la misma sección.
- **SIEMPRE** abrir desde el sistema: Efeonce como Growth Operating System / ASaaS, no como lista de servicios ni como agencia creativa/digital competente.
- **NUNCA** meter el material de identidad profunda (4 unidades, ICO, Loop, Greenhouse/Kortex/Verk nombrados como catálogo) en la Home — va al About Us. La Home conserva el mecanismo: operación visible, software propio, datos, aprendizaje y memoria.
- **NUNCA** dejar residuos de template o demo (`Quality fonts`, `WooCommerce`, `WPBakery`, ThemeForest reviews, links a demos/theme docs, categorías dummy) en contenido visible/indexable.
- **SIEMPRE** preservar la doctrina de PDR-008 (dos capas, anti-ICP, casos citables, voz es-LATAM, JSON-LD, CRO, grader compartido) aplicada a la Home.
- **SIEMPRE** registrar el cambio de owner de ruta (`/agencia` → no se crea; Home asume el rol) en el [route-ownership matrix](././operations/public-site-route-ownership-matrix-20260616.md) antes de indexar.

## Enlaces

- Refina: [PDR-008](PDR-008-landing-agencia-marketing-digital-posicionamiento.md) (ver su Delta 2026-07-08).
- Hermanos: [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (IA/dos capas), [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (ecosistema/capas).
- Ejecución: [`TASK-1358`](././tasks/to-do/TASK-1358-landing-agencia.md) reorientada (Home = pitch). About Us → PDR + task por definir.
- Contexto: `docs/context/09_marca-agencia.md`, `05_voz-tono-estilo.md`, `13_icp-buyer-personas-jtbd.md`.
