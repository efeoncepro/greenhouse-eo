# Paquete de producción de video: del storyboard aprobado al plan ejecutable (delta propuesto a ADR-025)

- **Status:** Proposed (2026-10-17) — espera decisión del operador
- **Extiende:** [ADR-025](EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) (plan declarativo por toma, ejecutores,
  compuertas, ledger). No la reemplaza: le agrega **de dónde sale el plan** y **cómo se aprueba**.
- **Program:** [EPIC-051](../../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md) ·
  [TASK-1989](../../tasks/to-do/TASK-1989-video-production-runner.md) (runner, sin empezar)
- **Método:** [producción narrativa](../../operations/creative-production/EFEONCE_NARRATIVE_VIDEO_PRODUCTION_METHOD_V1.md)
- **Caso fuente:** «¿Para cuándo?» — storyboard v4 canónico, `ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/TOMAS.json`
- **Reversibility:** `two-way` (archivos de datos y CLI local; se gradúa a Globe como ADR-025 D9)

## Decisión, en una frase

**Cada producción es un paquete de datos tipados —mundo, reparto, producto, tomas, audio y bloqueo— del que se derivan
tres cosas con el mismo compilador: la vista que aprueba el humano (el storyboard en el canvas), el plan ejecutable de
ADR-025 (`plan.json`) y los prompts de cada motor. La aprobación del humano se registra contra el hash de una revisión
del paquete; el runner sólo compila y ejecuta revisiones aprobadas, y cada paso es idempotente por huella.**

```text
                    ┌──────────────── paquete de producción (datos, versionado) ────────────────┐
                    │ production · world (planta, ejes, luz, física) · cast · products · shots  │
                    │ audio (líneas, música, SFX) · components (ids del kit AXIS) · assets.lock │
                    └───────────────────────────────┬───────────────────────────────────────────┘
                                                    │  video:package validate (esquema + reglas del mundo y del motor)
                         ┌──────────────────────────┼──────────────────────────┐
                         ▼                          ▼                          ▼
              video:board → vista canvas     video:plan → plan.json      video:prompts → prompt por toma y motor
              (el humano aprueba)            (grafo ADR-025)             (plantillas como datos)
                         │                          │
         video:approve --scope storyboard ──▶ ledger.jsonl ◀── video:run (ejecutores, compuertas, huellas, retome)
```

## 1. Contexto: por qué el prototipo actual no escala

La vista v4 funciona para un humano, pero no es todavía una fuente ejecutable. La prueba del **segundo consumidor**
(otra producción con los mismos generadores) falla en estos puntos del prototipo (`v2-gpt/generadores/`):

| # | Dónde | Qué pasa con una segunda producción |
|---|---|---|
| 1 | `storyboard.py:84-129` (`CARDS`) | Los componentes y sus textos son **código** (`lambda l: punch('Ya está')`); otra pieza exige reescribir el generador |
| 2 | `storyboard_v4.py:18` (`INICIO`), `animatic.py:12` y `components.py:16` (`BLOB`) | Ids de imágenes del canvas de esta producción fijados en el código |
| 3 | `storyboard_v4.py:146-154`, `components.py:7` | Título, marca, colaborador, rutas absolutas y reemplazos de texto del primer cliente en el código |
| 4 | `tomas_data.py` (`refs`, `cont`, `sonido`) | Referencias, continuidad y sonido son **texto libre**: un motor no puede resolver «Paula · SIN ASSET»; la continuidad se copia a mano de la biblia y puede divergir |
| 5 | `CONTINUIDAD.md` | La biblia es prosa: el 180°, el lado del portátil o la escala de la lata no se pueden **verificar** por máquina, sólo releer |

ADR-025 ya decidió el runner, los ejecutores, las compuertas, el ledger, la idempotencia por huella y la invalidación
`stale`. Lo que no decidió es **cómo nace el plan** de una producción narrativa ni **cómo se ata a lo que el humano
aprobó**. Este documento cubre ese tramo.

## 2. Decisiones

### P1. El paquete de producción es la fuente única

Una carpeta por producción con archivos JSON validados por esquemas Zod del núcleo (ADR-025 D9:
`scripts/ai/video/pipeline/core/**`, puro, sin red ni disco):

| Archivo | Contenido | Hoy vive en |
|---|---|---|
| `production.json` | id, título, master y formatos de entrega, línea gráfica, colaborador, modo (Efeonce/cliente), aprobadores por dimensión, tope de gasto | prosa del storyboard |
| `world/set.json` | planta: zonas, asientos, objetos con **dueño y lado**, ventanas, pantallas; ejes con posición y dirección de la cámara; qué **no** puede verse por eje | `CONTINUIDAD.md` §1–3 |
| `world/light.json` | tramos de luz con fuente, temperatura y planos | `CONTINUIDAD.md` §4 |
| `world/physics.json` | objetos que viajan con medidas reales, referencia humana, distancias al lente por toma | `CONTINUIDAD.md` §6 |
| `cast.json` | personaje → anclas aprobadas (sha256), **identidad por motor** (`byteplus: {account, group, assets}`), voz, regla de conducta, vestuario por estado | ledger BytePlus + Brand Cast |
| `products.json` | marca, referencia de producto (sha256), KV por formato | carpeta BREAKR |
| `shots.json` | por toma: tiempo en la grilla, beat, eje (id del set), cámara, acción tiempo a tiempo, **personajes presentes con visibilidad** (`cara`/`espalda`/`mano`/`fuera`), estado de cada objeto, tramo de luz, cuadros inicial/clave/final (assets), componentes (ids del kit AXIS + parámetros), señales de audio (ids), ruta deseada, intocables, plan B, dificultad | `TOMAS.json` |
| `audio.json` | líneas de diálogo por idioma y personaje, música (cues en la grilla), SFX (causa y momento) | fichas |
| `assets.lock.json` | cada archivo referenciado → sha256, rol (taxonomía §3.7), aprobación | — |
| `ledger.jsonl` | eventos de ADR-025 + aprobaciones de revisiones del paquete | — |

La **continuidad de cada toma no se escribe**: se **deriva** del mundo y del estado (quién está seco, dónde está el
portátil, qué luz hay). La vista y el prompt leen la misma derivación; no pueden contradecirse.

### P2. Tres salidas, un compilador

- `video:board` dibuja la vista del canvas desde el paquete (reemplaza los generadores Python). Los componentes se
  dibujan con el **kit de video de AXIS** por id (`video-punch`, `video-subtitle-glass`…), no con funciones propias.
- `video:plan` compila `plan.json` (ADR-025 D1): por toma, los pasos que su ruta exige (cuadros → aprobación → audio →
  borrador → aprobación → final → composición → conform).
- `video:prompts` compila el prompt de cada paso generativo desde **plantillas versionadas por motor y ruta** (datos)
  llenadas con los campos estructurados (cámara, acción, fondo del eje, luz del tramo, personajes por su token de
  identidad, producto, intocables como negativos). Un agente o una persona pueden agregar un `prompt_extra` por toma;
  nunca reemplazar la plantilla. El prompt compilado entra en la huella del paso.

### P3. La aprobación humana se ata a una revisión

- Cada cambio del paquete produce una **revisión** = hash de sus archivos normalizados. La vista muestra la revisión y
  el estado de cada toma.
- `video:approve <paquete> --scope storyboard|shot:<id>|ref:<asset> --dimension creativa --by <aprobador>` agrega el
  evento al ledger. El agente puede ejecutar el comando sólo citando la instrucción literal del operador; **nunca
  aprueba por su cuenta** (ADR-025).
- `video:plan` **se niega** a compilar si la revisión vigente no tiene la aprobación de storyboard; un cambio posterior
  invalida (`stale`) sólo las tomas afectadas (ADR-025 D6).
- Versión 1: la aprobación se hace por CLI. Versión 2 (abierta): un botón en el canvas que escribe la aprobación con la
  identidad del visitante en la base del artifact, y el CLI la importa al ledger.

### P4. Validación antes de gastar: reglas del mundo y del motor

`video:package validate` falla con código y mensaje por regla, sin llamar a ningún proveedor:

- **Integridad**: todo eje, personaje, objeto, asset, componente y señal de audio referenciado existe.
- **Mundo**: todas las cámaras de una escena del mismo lado de la línea de 180° (geometría de la planta); objeto con
  dueño en su lado; escala de objetos que viajan dentro de ±20 % del cálculo por distancia al lente; luz del tramo.
- **Motor** (por ruta, como datos del adaptador): Seedance genera ≥ 4 s; **una toma con un personaje en visibilidad
  `cara` exige identidad en la biblioteca del motor, si no queda `blocked` con la decisión que lo destraba**; un plano
  con rostros no puede ser primer cuadro; texto y logos nunca en un paso generativo (van a componentes); formato de
  generación compatible con las entregas.
- **Contenido**: textos de componentes y subtítulos sin placeholders («[X]»); hora del relato coherente con la luz.

### P5. Idempotencia y costo

Se toma tal cual de ADR-025: huella por paso (hash de entradas + prompt compilado + ejecutor y versión + parámetros);
misma huella con salida aprobada no se vuelve a pagar; `request_id` en el ledger antes de esperar; el final 1080p se
ata al **id del borrador aprobado** (`--from-draft`), así lo que se paga es exactamente lo que se vio. Estimación por
paso antes de correr y autorización de gasto del plan.

### P6. Ejecutores por paso

| Operación | Ejecutor hoy | Estado |
|---|---|---|
| Cuadros (inicio, clave, final) | `ai:image`, `ai:inpaint`, `creative:face:restore` | existen |
| Video por referencias o primer cuadro | `ai:byteplus --model seedance25` (`--draft`, `--from-draft`, `--references`, `asset://`) | existe |
| Plan B de video | `ai:omni` | existe, sin verificar con personas |
| Voces | **falta CLI**: hoy por la conexión de ElevenLabs o paso `humano` con salida registrada por hash | vacío |
| Música y SFX | paso `humano` (importar el archivo licenciado o aprobado) | vacío |
| Componentes y textos | renderer del kit de video de AXIS | contrato aprobado; renderer animado parcial |
| Pantallas e interfaces | `ai:image` + texto compuesto | existe |
| Conform, mezcla, recorte de formatos | `video:finish` (EPIC-051) | por construir |

### P7. Adaptable por producción

Otra producción = otro paquete; cero cambios de código. Las rutas de motor, las plantillas de prompt y los
componentes son datos o ids. El gate de validación **deriva** sus esperados del paquete (nunca literales del primer
cliente). Las pruebas incluyen un **segundo paquete de juguete** (2 tomas, otro set, otra marca) que tiene que pasar
`validate`, `board`, `plan` y `prompts` sin tocar el código.

## 3. Comandos

```bash
pnpm video:package init <slug>                  # carpeta desde la plantilla (biblia y ficha como datos)
pnpm video:package validate <paquete>           # esquema + mundo + motor + contenido; no gasta
pnpm video:board <paquete> [--publish]          # vista del canvas desde los datos
pnpm video:approve <paquete> --scope storyboard --dimension creativa --by <aprobador>
pnpm video:plan <paquete> [--estimate]          # plan.json desde la revisión aprobada
pnpm video:prompts <paquete> --shot 11a         # prompts compilados, para revisar
pnpm video:run <paquete> --stage frames|audio|draft|final|post [--shot <id>]
pnpm video:status <paquete>                     # grafo, revisión, compuertas, costo estimado y real
```

## 4. Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con generadores Python por producción | código acoplado al primer cliente (§1); cada pieza nueva reescribe el generador |
| Storyboard y plan como dos archivos editados a mano | dos fuentes que divergen; la aprobación no garantiza lo que se ejecuta |
| El agente escribe el prompt de cada toma en el momento | no reproducible ni auditable; la huella no captura la intención |
| Base de datos para el paquete | sin runtime de producto que lo pida (ADR-025); archivos versionados bastan |
| Construirlo en Globe | hibernado; ADR-024 y ADR-025 fijan CLI primero |
| El canvas como fuente de verdad | es una vista; editar ahí y en los datos duplica la fuente |

## 5. Cuatro pilares

| Pilar | Cómo se cumple |
|---|---|
| **Safety** | Nada se compila ni se paga sin aprobación de la revisión vigente; el agente no aprueba; validación de personas, marca y texto antes del motor; tope de gasto del plan (ADR-025) |
| **Robustness** | Esquemas tipados; integridad referencial; reglas del mundo verificables por máquina; huellas e idempotencia; el final atado al borrador aprobado |
| **Resilience** | Retome por `request_id`; invalidación sólo de lo afectado; cada toma bloqueada dice qué decisión la destraba; ledger append-only |
| **Scalability** | Una producción nueva es un paquete; plantillas y rutas como datos; tomas en paralelo con límite del proveedor; el formato se traduce a Narrative Project de Globe al graduar |

## 6. Reglas duras

- **NUNCA** escribir datos de una producción en el código del compilador, la vista o el validador.
- **NUNCA** compilar ni ejecutar un plan de una revisión sin aprobación de storyboard.
- **NUNCA** escribir a mano la continuidad de una toma: se deriva del mundo.
- **NUNCA** reemplazar la plantilla de prompt de un motor desde una toma; sólo `prompt_extra`.
- **NUNCA** mandar a un motor un plano con rostros fuera de su biblioteca.
- **SIEMPRE** que cambie el paquete, nueva revisión y `stale` de lo afectado.
- **SIEMPRE** probar el compilador con el segundo paquete de juguete.

## 7. Preguntas abiertas

- Dónde vive el paquete en git: recomendado versionar sólo JSON y lock dentro de la carpeta de la producción; los
  medios siguen las reglas de `ai-generations`.
- CLI de voces (ElevenLabs o Seed Speech de BytePlus) y su secreto: task aparte.
- Aprobación desde el canvas (P3 versión 2).
- Formato exacto de las plantillas de prompt por motor: se fija con las primeras tomas reales.

## 8. Roadmap propuesto (por slices, dentro de EPIC-051)

| Slice | Entrega | Gasto |
|---|---|---|
| 1 | Esquemas del paquete + `validate` con reglas de mundo y motor + paquete de juguete | 0 |
| 2 | Migrar «¿Para cuándo?» a paquete (desde `TOMAS.json`, `CONTINUIDAD.md` y `CARDS`) + `video:board` | 0 |
| 3 | Compilador de prompts con plantillas por ruta + `video:prompts` | 0 |
| 4 | `video:plan` + `video:approve` sobre el runner de TASK-1989 (slices 1–3 de ADR-025) | 0 |
| 5 | Ejecutor BytePlus borrador → final y ejecutores de imagen; `video:run --stage draft` | autorizado aparte |
| 6 | Audio (voces, música, SFX) y post (componentes AXIS, conform, formatos) | autorizado aparte |
| 7 | Primera corrida real: tomas listas de «¿Para cuándo?» (06, 07, 09, 13, 14, 15, 18) | autorizado aparte |
