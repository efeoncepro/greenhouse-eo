# ADR — Efeonce Factory: su marca

- **Status:** Accepted (2026-10-05)
- **Date:** 2026-10-05
- **Owner:** Efeonce Brand
- **Scope:** la marca visual de [Efeonce Factory](EFEONCE_FACTORY_COMMERCIAL_ROUTE_DECISION_V1.md) (logo, lockups,
  símbolo y su primera aplicación: Notion y el anuncio al equipo). No decide la clasificación de Factory en la
  arquitectura de marca, ni precio, ni oferta.
- **Reversibility:** two-way-but-slow. Los archivos se regeneran en minutos; una vez en Notion, cotizaciones y piezas
  comerciales, el cambio tiene inercia de marca.
- **Confidence:** high en la forma: la eligió y ajustó el operador viéndola. Medium en el concepto: el logo dice
  «es de Efeonce» y no «encargo cerrado» (ver Consecuencias).
- **Validated as of:** 2026-10-05, sesión de diseño con el operador (canvas «Efeonce Factory — Logo»).

## Contexto

La [decisión de la vía Factory](EFEONCE_FACTORY_COMMERCIAL_ROUTE_DECISION_V1.md) dejó abierta su identidad visual.
El operador pidió un logo «así como» los de Search Visibility 360, AEO y Marketing Studio, y una portada para el
teamspace de Notion, sus bases de datos y un anuncio al equipo.

## Decisión

1. **Ruta A, «la órbita en la o».** «Factory» en Poppins Bold, pasado a contornos; la «o» es un anillo fino en la tinta
   de la palabra con la esfera a la 1:30 en el acento **Growth** (`#0e8c82` sobre papel, `#36c8bf` sobre oscuro), el de
   la marca madre: Factory es una vía de Efeonce, no una línea de servicio. Mismo método que la familia
   ([Marketing Studio](marketing-studio/EFEONCE_MARKETING_STUDIO_NAMING_AND_MARK_DECISION_V1.md), SV360, AEO).
2. **Terminaciones del anillo concéntricas a la esfera, en toda la familia.** A pedido del operador («ajusta las
   terminaciones»), el corte alrededor de la esfera es un círculo concéntrico a ella: el aire entre anillo y esfera queda
   parejo por dentro y por fuera, como el planeta del logo de Efeonce. Nació en Factory y el mismo día el operador la
   extendió a la familia («la familia debería tener esas terminaciones»): SV360, AEO, AEO Assessment, AI Visibility
   Report, Insights y Marketing Studio se regeneraron con el mismo corte (viewBox, esfera y anillo iguales; sólo cambian
   los extremos). Todos los generadores toman el anillo de [`scripts/brand/orbit-ring.mjs`](../../scripts/brand/orbit-ring.mjs).
3. **Símbolo: la F rodeada por la órbita.** Es el avatar del teamspace de Notion, el favicon y la barra colapsada.

| Pieza | Archivo (`factory-*`) | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| Factory** | `lockup` | Por defecto: portadas de Notion, anuncios, cotizaciones, decks |
| Compacto **efeonce Factory** | `compact` | Chips y espacios muy angostos |
| Apilado (Efeonce arriba, Factory debajo) | `stacked-lockup` | Portadas y formatos cuadrados |
| Símbolo: la **F** en órbita | `isotype` | Avatar del teamspace, favicon, barra colapsada; nunca junto al nombre |
| Ícono: la nave de Efeonce sobre «Factory» liso | `icon` | Sólo lo que circula suelto (una sola esfera: la de la nave) |
| La palabra sola | `logo` | Insumo de las anteriores y portada del teamspace |

Las seis piezas existen en `positive`, `negative` y `white` (18 SVG). Las genera
[`scripts/brand/build-factory-logos.mjs`](../../scripts/brand/build-factory-logos.mjs), se publican selladas en
`@efeoncepro/axis-brand-assets` 0.4.22 y nunca se editan a mano.

## Aplicación aprobada: Notion y el anuncio al equipo

- **Portadas de Notion** (1500 × 600, 5:2; exportadas también a 3000 × 1200): Teamspace (la palabra con la órbita),
  Proyectos, Tareas y Sprints (lockup arriba y el nombre de la base en Bricolage 760). Lo que importa vive en la banda
  central de ~1170 × 230 px, porque Notion recorta arriba y abajo según el ancho de la ventana.
- **Avatar del teamspace:** la F en órbita sobre el oscuro Efeonce, 512 × 512 (variante transparente en navy).
- **Anuncio al equipo** (1920 × 1080): sólo el lockup y «Nueva vía On-Demand». El operador descartó el titular y el
  texto de apoyo: el mensaje va en el texto del anuncio, no en la imagen.
- **Fondo:** un estudio de producción de contenido de noche, todo fuera de foco (cámara, monitor de edición, paneles
  LED), sólo luz azul, sin personas ni texto legible. La oscuridad cae de a poco hacia la izquierda, donde va el texto;
  sin velo encima. Generado con `pnpm foto:generar` (fichas `ficha-bokeh-v2.json` y `ficha-anuncio-16x9.json` en
  `ai-generations/2026-10-05_factory-notion-bokeh/`). Una primera toma con la esquina de una pared se descartó porque
  se leía como un recorte mal hecho. Las PNG no están en git (`.gitignore`): viven en `entrega/` de esa carpeta.
- La órbita decorativa se quitó de las portadas con foto: la línea gráfica no deja que la órbita cruce el sujeto.

## Alternativas descartadas

| Ruta | Por qué no |
| --- | --- |
| B · esfera a las 12 («vuelta completa») | Es la que más cerca estaba de decir «encargo cerrado», pero SV360 ya usa esa posición con otro sentido |
| C · esfera a las 3 («la pieza sale») | Rompe el ángulo de la familia y a tamaño chico la esfera se lee como un punto mal puesto |
| D · la F en órbita como logo | Queda como símbolo, no como logo |
| E · «Factory On-Demand» como descriptor fijo | Explica con texto; queda como etiqueta suelta («Nueva vía On-Demand») |
| F · acento Brand | Ata Factory a Creative Services, que según su ADR es el arranque y no el límite |

## Consecuencias

- **Positivas:** Factory se reconoce como parte de la familia de producto de Efeonce al primer vistazo; las portadas de
  Notion forman un sistema (cambia sólo la palabra).
- **Riesgo conocido:** el logo estático no expresa el concepto («una necesidad, una entrega, cerrada»); lo carga la
  palabra. Se propuso expresarlo en movimiento (la esfera da una vuelta y se detiene, nunca como loader); no está
  construido.
- **Riesgo conocido:** «Factory» connota volumen y producción en serie; lo compensan el descriptor «On-Demand» y la
  ficha comercial.
- **Pendiente:** las copias de los SVG de la familia en otros lugares (decks del composer, `efeonce-think`, Marketing
  Studio) siguen con el corte recto hasta que se actualicen; el deck exige rebaseline del visual gate.
