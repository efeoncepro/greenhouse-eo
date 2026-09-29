# Creative Workbench — Efeonce

Este es el taller del equipo creativo de Efeonce: diseño, redacción, fotografía de marca y
producción con IA para **Efeonce, Berel y Sky**. Aquí trabajan personas y agentes (Claude y Codex).

El repo está **gobernado desde `efeoncepro/greenhouse-eo`**. Las skills, los CLIs, los documentos de
marca y estas mismas reglas llegan desde allá por un proceso de sincronización y quedan sellados en
`.workbench/sync.lock.json`. El equipo trabaja en `projects/`; lo demás se usa, pero no se edita.

Habla con las personas en español neutro, claro y cercano (tuteo, sin voseo: *puedes*, *agrega*,
*corre*). El copy de cada pieza usa la voz del cliente, no la de Efeonce: Berel habla en español de
México.

## Qué es tuyo y qué es gestionado

| Zona | Quién la edita | Qué hay |
|---|---|---|
| `projects/<cliente>/<pieza>/` | **El equipo** (por PR) | Brief, `pieza.json`, prompts, fichas y notas de cada pieza |
| Todo archivo listado en `.workbench/sync.lock.json` | **Sólo greenhouse-eo** | `.claude/`, `.codex/`, `scripts/`, `src/`, `docs/`, `clients/`, `gates/`, `tools/`, `AGENTS.md`, `CLAUDE.md`, `package.json` |

Si algo gestionado está mal o falta (una skill, una regla, un brand pack), **no lo edites**: abre un
issue en este repo con el cambio propuesto. Julio lo porta a greenhouse-eo y vuelve por el sync. Un
archivo gestionado editado aquí hace fallar el gate `managed-drift` y el próximo sync lo pisa.

## Flujo de una pieza

1. `pnpm pieza:nueva <cliente> <slug>` crea `projects/<cliente>/<slug>/` desde la plantilla.
2. Completa `brief.md` y `pieza.json` (formato, responsable y aprobador).
3. Produce. Las salidas van a `projects/<cliente>/<slug>/salidas/`, que **no entra a git**.
4. `pnpm pieza:subir projects/<cliente>/<slug>` sube las salidas al bucket de trabajo y registra cada
   entregable (ruta `gs://` + sha256) en `pieza.json`.
5. Abre un PR. El CI corre los gates y la revisión ocurre ahí: el aprobador revisa y, cuando está
   conforme, cambia `estado` a `aprobada` con su nombre y la fecha.
6. **Publicar no ocurre desde aquí.** Una persona entrega o publica fuera del repo y luego marca la
   pieza como `entregada`.

Estados de `pieza.json`: `brief` → `en-produccion` → `en-revision` → `aprobada` → `entregada`
(o `descartada`).

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm instalar` | Instala dependencias (credencial efímera de GitHub para los paquetes AXIS) |
| `pnpm doctor` | Revisa tu equipo: Node, pnpm, `gh`, `gcloud`, credenciales, `.env.local`, referencias y fuente Guttery |
| `pnpm assets:pull` | Baja del bucket canon las referencias aprobadas (identidades, kits, poses) y verifica cada huella |
| `pnpm pieza:nueva <cliente> <slug>` | Crea una pieza desde la plantilla |
| `pnpm pieza:subir <carpeta>` | Sube `salidas/` al bucket del cliente y registra los entregables |
| `pnpm pieza:bajar <carpeta>` | Baja los entregables registrados de una pieza (para revisar) |
| `pnpm gates` | Corre localmente los mismos gates que el CI |
| `pnpm ai:image`, `pnpm ai:fal`, `pnpm ai:omni`, `pnpm ai:image:rmbg` | Generación y edición con IA (imagen, video, fondo) |
| `pnpm foto:*` | Fotografía de marca **Efeonce** (ver abajo) |

## IA generativa

- Las llaves de los proveedores **no están en tu equipo ni en este repo**. `.env.local` sólo tiene
  *nombres* de secretos; los CLIs leen la llave en memoria con tu identidad Google, si Julio te dio
  acceso. Si un CLI dice que no está configurado, corre `pnpm doctor` y, si sigue, pide acceso.
- **Antes de gastar**, elige el modelo con la skill `ai-model-selection` y estima el costo. Los CLIs
  tienen tope por corrida (`fal`, `higgsfield`) y estimación gratuita: úsala.
- Nunca imprimas, copies ni pegues una llave. Nunca llames a la API de un proveedor por fuera de los
  CLIs (curl, SDK propio, script ad hoc): el gasto dejaría de ser visible.
- Todo lo que generes para un cliente va a la carpeta de su pieza, nunca a `public/` ni a la raíz.
  Pasa siempre `--out projects/<cliente>/<slug>/salidas/...`.

## Fotografía de marca Efeonce (`pnpm foto:*`)

Aplica sólo a la marca propia de Efeonce (equipo, oficina, Nexa, merch y logo 3D en escena). Canon:
`docs/operations/brand-photography/README.md`.

- Orden: `pnpm foto:doctor` → `pnpm foto:prompt` → `pnpm foto:validar` → `pnpm foto:generar`.
- **Nunca** armes el prompt concatenando bloques a mano: `foto:prompt` lo compone desde la ficha.
- Los assets de marca (ropa, lanyard, logo 3D, mascotas) siguen
  `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`: lo sensible se compone y el modelo
  sólo pone material y luz. El plate nace **sin logo ni texto**; la firma se compone después.
- Las referencias que usa el catálogo se bajan con `pnpm assets:pull`. Si faltan, `foto:validar` falla
  antes de gastar: es el comportamiento correcto.

## Assets

- Binarios (imágenes, video, audio, PSD, AI) **nunca en git**. Viven en GCS:
  - **canon**: referencias aprobadas. Sólo lectura para el equipo.
  - **work**: entregables por cliente (`<cliente>/<slug>/…`). Puedes subir, pero no borrar ni
    sobrescribir. Cada versión nueva es un archivo nuevo.
- Sólo ves los clientes que te asignaron. No hay listado del bucket: los entregables se ubican por
  la ruta exacta registrada en `pieza.json`.
- Referencias de un cliente que todavía no son canon (moodboards, material que mandó el cliente):
  `projects/<cliente>/<slug>/referencias-locales/` (no entra a git) o súbelas como parte de la pieza.

## Skills disponibles

Están en `.claude/skills/` (Claude) y `.codex/skills/` (Codex), con el mismo contenido.

| Necesitas… | Skill |
|---|---|
| Idea, concepto o dirección creativa | `creative-direction` |
| Dirección de arte, key visual, auditar una imagen | `design-studio` |
| Escribir o afinar copy persuasivo, titulares, CTAs | `copywriting` |
| Motor de contenidos: calendario, atomización, distribución | `content-marketing-studio` |
| Piezas sociales, trendjacking, estacionalidad, memes | `social-media-studio` |
| Piezas publicitarias con texto (posts, stories, banners, OOH) | `efeonce-advertising-creative` |
| Línea gráfica Efeonce «La órbita», firma de piezas | `efeonce-graphic-line` |
| Marca Efeonce (voz, identidad) | `efeonce-brand-studio` |
| Tokens y contratos visuales AXIS | `axis-design-system` |
| Tipografía | `typography-design` |
| Gráficos y visualización de datos | `dataviz-design` |
| Qué modelo de IA usar y cuánto cuesta | `ai-model-selection` |
| Producir una imagen con IA | `greenhouse-ai-image-generator` |
| Higgsfield | `higgsfield-provider` |
| Video y motion | `motion-design-studio` |
| Audio, voz, música | `audio-studio` |
| Cualquier trabajo de Berel | `berel-content-production` |

Algunas skills citan documentos internos de Greenhouse que **no viajan** a este repo (finanzas,
contratación, arquitectura de la plataforma). Si una ruta citada no existe aquí, no la busques ni la
reconstruyas: trabaja con lo que sí está y, si te hace falta, pídela por issue.
`.workbench/export-report.json` lista esas rutas por skill.

## Clientes

Cada cliente tiene su brand pack en `clients/<cliente>/README.md`: voz, reglas, qué está codificado y
qué no. Léelo antes de producir. **Si el brand pack dice que algo no está codificado, no lo inventes.**
Pide la referencia al responsable de la cuenta.

## Reglas duras (personas y agentes)

- **Nunca** edites un archivo gestionado. Propón el cambio por issue.
- **Nunca** subas binarios, `.env.local` ni llaves a git.
- **Nunca** pidas, muestres ni copies una llave de proveedor, ni leas `.env.local` para mostrarlo.
- **Nunca** llames APIs de IA por fuera de los CLIs del repo.
- **Nunca** empujes directo a `main` ni uses `--force`: todo entra por PR.
- **Nunca** publiques, programes ni envíes nada a un cliente o red social desde aquí.
- **Nunca** subas material de un cliente a la carpeta de otro.
- **Siempre** registra en `pieza.json` lo que generaste para un cliente y con qué modelo.
