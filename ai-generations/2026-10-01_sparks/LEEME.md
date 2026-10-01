# Sparks · el Spark base · v02 (2026-10-01)

Los Sparks son los agentes de Efeonce que acompañan a Nexa (TASK-1941). Ésta es la versión completa del **Spark base**:
26 vistas aisladas, cada una con fondo de estudio y con fondo transparente, más 4 escenas de escala con Nexa. Reemplaza
a la v01 (que tenía 9 vistas).

**Diseño (decisión de Julio Reyes, 2026-10-01):** el Spark de la destacada «Agents», alejado de Astro Bot con rasgos de
la marca — dirección **B «La órbita»** más las **tres ventanas** de la dirección C «La nave»:
- esfera blanca brillante con paneles navy, sin piernas: **flota**, con un brillo azul debajo;
- visor navy con dos ojos y una sonrisa en arco de LED azul (la sonrisa del Nexa Mark);
- la **chispa de cuatro puntas** del Nexa Mark encendida como antena;
- un **anillo de órbita** inclinado (más alto en su lado izquierdo) con su **esfera**;
- **tres ventanas** redondas en la panza, como las de la nave Efeonce;
- colores: sólo blanco, navy `#001A33` y azul `#0375DB`.

## Vistas (1600 × 1600 PNG, en «Fondo de estudio» y en «Transparente»)

| # | Vista | Para qué |
|---|---|---|
| 01–03 | frente · tres cuartos izquierda · tres cuartos derecha | lo básico |
| 04 · 10 | perfil · perfil derecho | los dos lados (no se espeja: el anillo se invertiría) |
| 05 · 11 · 12 | espalda tres cuartos · espalda recta · tres cuartos trasero izquierdo | de espaldas |
| 06 · 07 | contrapicado (se ve su luz de flotación) · picado | cámara baja y alta |
| 08 · 09 | mira arriba · mira abajo | junto a una persona / trabajando |
| 20–25 | expresiones: atento · trabajando (ojos en carga) · pide revisión · listo · sorprendido · pensando | casting |
| 30–32 | luz cine: frente · tres cuartos · mira arriba (ambiente oscuro, lo ilumina su propio LED) | escenas cine con Nexa |
| 40–43 | acciones: volando · señalando · presenta una chispa en la palma · entrega una tarjeta | narrativa |
| 50 | grupo de tres | equipo |

En el recorte de «volando» la estela de luz no se conserva (no es parte del cuerpo); está en la versión de estudio.

## Con Nexa (4:5, 1024 × 1280, registro cine)

Sobre el hombro · sobre la palma y el antebrazo · en el escritorio · entregándole una tarjeta. Fijan la escala: **nunca
más grande que la cabeza de la persona, siempre por encima de la cintura**. Nexa con la chaqueta del uniforme; bordado
verificado al 100 %.

## Por línea de negocio (aprobado 2026-10-01: «Aprobados todos»)

El **mismo** Spark con el LED en el acento de cada línea, en la carpeta «Por línea»: las 26 vistas con fondo
transparente y frente y tres cuartos con fondo de estudio. Engine (el azul de las carpetas de arriba) es el defecto; las
demás se usan sólo en piezas de esa línea.

| Carpeta | Línea | Acento |
|---|---|---|
| `growth` | Growth | `#36C8BF` |
| `brand` | Brand | `#FF6500` |
| `voice` | Voice | `#F83902` |
| `revenue-hubspot` | Revenue HubSpot | `#E86BD0` |
| `revenue-salesforce` | Revenue Salesforce | `#2FB8FF` |

En `foto:prompt`: `{ "objeto": "spark", "vista": "…", "color": "growth" }`. Brand y Voice son cálidos: pruébalos en una
foto oscura antes de usarlos ahí. Salesforce casi no se distingue de Engine en un LED pequeño.

## Cómo usarlo

En una foto de marca el Spark se declara desde el catálogo (`"objetos": [{ "objeto": "spark", "vista": "…" }]` en la
ficha de `pnpm foto:prompt`), nunca se describe «un robot» a mano. Registro cine o puesta en escena, nunca documental.
Trabaja con contexto y siempre con una persona que supervisa; nunca reemplaza personas ni aparece decidiendo solo.

**Pendiente (TASK-1941):** los cinco Sparks del plantel (investigación, contenido, CRM/datos, servicio y reportes, que
se diferencian por accesorio y gesto), la guarda que impide describir robots sin declarar un Spark, la ficha de
personaje `SPARKS_V1.md` y la revisión de colisión del nombre «Sparks».

Archivos de trabajo, prompts y fichas en greenhouse-eo `ai-generations/2026-10-01_sparks/`.
Integridad: `manifiesto.json` (SHA-256).
