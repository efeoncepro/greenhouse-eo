# Overlay Efeonce / Greenhouse — índice (motion-design-studio)

> Aterriza el conocimiento portable de motion cinematográfico en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van la marca, las herramientas y los boundaries reales.
> **Reverifica el estado en el repo y en las plataformas** (el landscape IA cambia por mes).

## Cuándo usar este overlay

Cuando el motion toca la marca Efeonce, sus canales/superficies (Think/Glitch/grader, sitio
público) o un cliente Globe. Para motion genérico basta `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real: Higgsfield (Cinema Studio/Soul ID/MCP) + Runway/Seedance/Veo/Kling + Magnific + AE/Blender/DaVinci + handoff. |
| `MOTION_BOUNDARY.md` | La costura vs motion-design / gsap / microinteractions-auditor / design-studio / social-media-studio / digital-marketing. |
| `CLIENT_DELIVERY.md` | Motion as-a-service para clientes Globe: films/spots multi-marca, aprobaciones, licencia limpia. |

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo público/audiovisual es **marca Efeonce** (agencia). SSOT: `src/config/efeonce-brand.ts`
  (arquitectura de marca, eslogan, footer). Importar de ahí; nunca hardcodear.
- **Mascota Nexa**: hay una decisión de **mascota viva** (tilt hero / Rive / la imagen IA alimenta el
  rig, no el runtime — parkeada). Un **brand film** o **title sequence** con Nexa es caso directo de esta
  skill: dirige el arco, la cámara y el sonido; la consistencia del personaje se ancla con Soul ID/refs.
  Nexa e ilustraciones propietarias (`characters/greenhouse-*.png`) son **obra del equipo creativo**, NO stock.
- **AXIS** es el design system **interno**; el `AxisWordmark` NUNCA en piezas públicas/marketing.
- **`DESIGN.md`** es el contrato visual agent-facing; leerlo si la pieza toca UI (pero recuerda: motion de
  UI runtime NO es esta skill).

## Ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003`)

Dónde entra el motion:

- **Think** (blog *Marketing con Manzanitas* → newsletter *Glitch* + *AI Visibility Grader*): openers/title
  sequences, explainers y brand films que hacen a Think memorable y compartible.
- **`efeoncepro.com`**: hero video de las landings de servicio (ej. `/aeo-2/`), spots.
- **El grader** es la costura top→bottom: un explainer cinematográfico del grader es pieza social-nativa que
  demuestra expertise. Motion + `social-media-studio` lo llevan a cada red (formato por red allá).

## Coherencia con las skills hermanas

motion-design-studio es **producción cinematográfica**. Encadena con: `design-studio` (dirección de arte +
KV que se anima + matriz de modelos de imagen para keyframes), `greenhouse-ai-image-generator` (keyframes/stills),
`social-media-studio` (formato/duración por red del master), `digital-marketing` (estrategia de campaña),
`typography-design` (tipo kinética), `motion-design` (motion de UI runtime, distinto), `efeonce-public-site-wordpress`
(publica el hero video), `efeonce-agency` (doctrina de marca). Detalle en `MOTION_BOUNDARY.md`.
