# Operar el contrato creativo por ruta de Globe

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude (TASK-1633)
> **Documentacion tecnica:** [ADR-022 — contrato creativo versionado por ruta](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md)

## Para qué sirve

Para hacer los cuatro cambios que el contrato creativo por ruta te pide hacer **como dato**, sin
tocar ninguna pantalla, y desplegarlos a Globe con evidencia:

- agregar o modificar una **ruta** del catálogo del Producer;
- agregar un **código de rechazo** nuevo (y clasificarlo, que no es opcional);
- agregar un **control de dirección creativa** (cámara, luz, ritmo…);
- ejecutar la **secuencia de rollout de Globe** y verificar la revisión que quedó viva.

Todo lo de acá vive en el repo hermano `efeonce-globe`. Greenhouse gobierna la decisión; Globe
la ejecuta. La skill que carga los invariantes es `greenhouse-globe`.

## Antes de empezar

- El repo hermano está en `/Users/jreye/Documents/efeonce-globe`. Los comandos `pnpm check`,
  `pnpm build` y los workflows se corren **desde ahí**, no desde Greenhouse.
- Lee primero la decisión: **ADR-022** y sus dos Deltas del 2026-08-02. Son cortos y evitan el
  error más común, que es meter un valor donde va un descriptor de soporte. Regla base:
  **`creativeControls` declara qué controles honra una ruta y por qué mecanismo; NUNCA transporta
  el valor.** El valor de dirección creativa viaja por el canal que ya existe,
  `prompt XOR structuredBrief`.
- **Duración, relación de aspecto y resolución NO son controles creativos.** Son forma de salida y
  su dueño es `RouteConstraintsV1` + `OutputShapeV1`. Si te encuentras declarando `resolution` como
  control, estás duplicando un vocabulario que ya existe.
- Necesitas `gh` autenticado contra `efeoncepro/efeonce-globe` y `gcloud` contra el proyecto
  `efeonce-globe` (región `southamerica-west1`).
- **No hay deploy automático en push a `main`.** Los tres workflows son `workflow_dispatch` con SHA
  explícito y eso es deliberado: un push a `main` no despliega nada hasta que alguien lo pide con
  el SHA en la mano.

## Paso a paso

### 1. Agregar o modificar una ruta del catálogo

El catálogo es **dato**, no código de pantalla: vive en
`packages/domain/src/producer-catalog.ts` (constante `PRODUCER_ROUTE_CATALOG`), y los tipos
públicos en `packages/contracts/src/producer-catalog.ts`.

1. Declara o edita la ruta con sus cinco ejes: `operation`, `inputSlots`, `inputCombinations`,
   `creativeControls`, `outputContract`.
2. **Bumpea `PRODUCER_CATALOG_VERSION`** (`packages/domain/src/producer-catalog.ts`, hoy `1.7.0`).
   Un catálogo que cambia sin cambiar de versión es un catálogo que nadie puede reconciliar.
3. Corre `pnpm check`. El guard de carga corre al **cargar el catálogo**, así que un descriptor mal
   formado no llega a runtime: aborta ahí mismo.

Lo que el guard de carga exige, y por qué:

| Regla | Por qué existe |
|---|---|
| Todos los controles del vocabulario deben quedar declarados | Un control ausente no es "no soportado": es una promesa que nadie escribió |
| Un control **honrado** DEBE declarar `valueShape` | Sin forma de valor, el fail-closed pre-spend no alcanza a este eje: prometes algo que nadie puede validar |
| Un control `unsupported` **NO** puede declarar `valueShape` | Ofrecer una forma para algo que la ruta no honra es prometer una afordancia falsa |
| Todo slot declarado participa en **al menos una** combinación | Un slot que ninguna combinación usa es peso muerto que igual valida y confunde |
| Cero slugs / IDs de proveedor en el descriptor | El descriptor es browser-safe: nombre público sí, identidad del proveedor nunca |

### 2. Agregar un código de rechazo nuevo

Dos archivos, **el mismo commit**. Si separas los pasos, el build rompe (a propósito).

1. Agrega el código al array que corresponda en
   `apps/creative-runner/src/production-route-compiler.ts`:
   `PRODUCTION_ROUTE_DEPENDENCY_REASONS` o `PRODUCTION_ROUTE_DENIAL_CODES`.
2. **Clasifícalo** en `packages/domain/src/governed-run-failure-policy.ts`.
3. Corre `pnpm check`. Si te saltaste el paso 2,
   `apps/creative-runner/src/production-route-failure-classification.test.ts` rompe el build
   **nombrando cuál falta**. No es un test que "te avise": es el que impide que el olvido llegue a
   producción.

Criterio de admisión — decide por comportamiento observado, no por intuición:

- **`terminal`** — si dos entregas separadas por una hora dan el mismo resultado sin que nadie
  toque nada. Un desajuste de contrato es determinista: reintentarlo sólo gasta.
- **`transient`** — si se recupera solo: circuito abierto, falla de persistencia.
- **`unknown`** — sólo los dos catch-all legítimos, y **con su razón declarada**. Nombran "algo
  falló y no sé qué"; ahí el tope de 3 reintentos es la respuesta prudente, no un olvido.

> Contexto de por qué esto se endureció: de 35 razones que el compiler sabía nombrar, sólo **dos**
> estaban clasificadas. Las otras 33 caían a `unknown` y gastaban tres entregas cada una en algo
> determinista. Acordarse no funciona; lo que funciona es que el build no deje.

### 3. Agregar un control de dirección creativa

Los dos vocabularios deben quedar **alineados 1:1**:

- `BRIEF_INGREDIENT_KINDS` — `packages/contracts/src/structured-briefs.ts` (el **valor** que pide
  el usuario).
- `ROUTE_CREATIVE_CONTROLS` — `packages/contracts/src/producer-catalog.ts` (el **soporte** que
  declara la ruta).

Pasos:

1. Agrega el nombre a **ambos** lados, con el mismo nombre para el mismo concepto.
2. Si el control es una excepción legítima sin ingrediente (hoy: `prompt`, `negative-prompt`,
   `seed`), declárala explícitamente; el test verifica también la honestidad de las excepciones.
3. Corre `pnpm check`. `packages/domain/src/structured-brief-vocabulary.test.ts` verifica la
   alineación **en ambas direcciones**.
4. **Deriva** los fixtures del vocabulario; no lo copies. Ver "Problemas comunes (b)".

Recordatorio: si lo que quieres declarar es duración, relación de aspecto o resolución, **no es un
control** — va por `RouteConstraintsV1` / `OutputShapeV1`.

### 4. Secuencia de rollout de Globe

Verificada cuatro veces el 2026-08-02 y el 2026-08-03. Ejecútala completa; los pasos 5 y 6 son los
que distinguen "desplegué" de "está vivo".

**4.1 — Gates locales.** Desde `/Users/jreye/Documents/efeonce-globe`, ambos en exit 0:

```bash
pnpm check
pnpm build
```

**4.2 — Push y CI verde del SHA exacto.**

```bash
git push origin main
gh run watch <id> --exit-status
```

No sigas con CI en rojo ni con el CI de otro SHA. "El de antes estaba verde" no es evidencia de
éste.

**4.3 — Desplegar el API interno.** Con el SHA de **40 caracteres**:

```bash
gh workflow run deploy-internal.yml -f service=globe-api-internal -f target_sha=<SHA>
```

**4.4 — Desplegar el Producer worker.** Son **dos** invocaciones, en orden, esperando la primera:

```bash
gh workflow run deploy-producer-worker.yml -f target_sha=<SHA> -f mode=build
# esperar a que termine
gh workflow run deploy-producer-worker.yml -f target_sha=<SHA> -f mode=deploy
```

**4.5 — Verificar la revisión ACTIVA, no el workflow verde.** Un workflow en verde dice que el
pipeline corrió; no dice qué imagen está sirviendo tráfico.

```bash
gcloud run services describe globe-api-internal \
  --region southamerica-west1 --project efeonce-globe
```

Debe mostrar la imagen etiquetada con los **12 primeros caracteres** del SHA (por ejemplo, para
`91d1f71689c0…` la revisión activa fue `00197-f9z`). Y para el worker:

```bash
gcloud artifacts docker images list \
  southamerica-west1-docker.pkg.dev/efeonce-globe/globe-runtime/globe-producer-worker \
  --include-tags --project efeonce-globe
```

Debe mostrar el digest con ese tag.

**4.6 — Salud y blast radius.** Lo que mide si tu deploy mató alguna corrida:

```bash
gcloud logging read \
  'resource.labels.job_name="globe-producer-worker" AND jsonPayload.event="globe_worker_completed"' \
  --project efeonce-globe
```

Cada batch trae `outboxDeadLetter` y `outboxRetryStorm`.

⚠️ **Lo que prueba que un dead letter no es tuyo es la serie temporal, no el valor puntual.**
Mira **cuándo apareció**, no cuánto vale. En los rollouts de estos dos días el valor fue `1` en
todos: era un dead letter preexistente desde ~2,5 h **antes** del primer deploy, que además venía
bajando (5 → 3 → 1). Un `1` sin su historia no distingue "preexistente" de "lo acabo de causar".

## Qué significan los estados y señales

| Señal | Dónde se lee | Qué significa |
|---|---|---|
| `pnpm check` / `pnpm build` exit 0 | local, repo Globe | Los guards de catálogo, la alineación de vocabularios y la clasificación de fallos pasaron. Es un gate, no evidencia de runtime |
| CI verde del SHA | `gh run watch <id> --exit-status` | Ese commit exacto es desplegable. El de otro SHA no dice nada de éste |
| Imagen `…:<sha12>` en la revisión activa | `gcloud run services describe` | El código que pediste **está sirviendo tráfico**. Es la única prueba de deploy |
| API responde `403` | probe del API interno | **Vivo y protegido** — es lo esperado, no un error. Lo que preocupa es un `5xx` |
| `outboxDeadLetter` > 0 | payload del worker | Hay trabajo que agotó sus reintentos. Mira la serie: si el valor ya existía antes de tu deploy, no es tuyo |
| `outboxRetryStorm` > 0 | payload del worker | Reintentos disparados. En estos rollouts se mantuvo en 0 |
| `claimed=0` en el worker | payload del worker | Corre cada minuto sin trabajo represado. Sano |
| Clasificación `terminal` | `governed-run-failure-policy.ts` | Ese fallo no se reintenta: es determinista |
| Clasificación `unknown` | idem | Cae al tope de 3 reintentos. Sólo legítimo para los dos catch-all declarados |

## Qué NO hacer

- **NUNCA** despliegues sin CI verde **del SHA exacto**. El CI de un commit vecino no prueba el
  tuyo.
- **NUNCA** des por bueno un deploy porque el workflow esté verde. El workflow prueba que el
  pipeline corrió; la revisión activa prueba qué está sirviendo. Son cosas distintas y sólo la
  segunda le importa al usuario.
- **NUNCA** clasifiques como `terminal` algo que se recupera solo. Matas corridas sanas: un
  circuito abierto o una falla de persistencia se resuelven en el siguiente intento, y marcarlas
  terminales las condena sin motivo.
- **NUNCA** copies el vocabulario en un fixture nuevo en vez de derivarlo. Ver "Problemas
  comunes (b)".
- **NUNCA** declares un valor de control dentro de `creativeControls`. Es un descriptor de
  soporte; el valor va por `prompt XOR structuredBrief`. Un tercer canal hacia el prompt produce
  **precedencia silenciosa**: dos direcciones contradictorias compilan al mismo texto y una gana
  sin dejar rastro.
- **NUNCA** declares duración, ratio o resolución como control creativo.

## Problemas comunes

### (a) Tres carriles de credenciales distintos que se confunden

Son **tres** y fallan por separado. Confundirlos es la causa más común de "no puedo leer la base"
seguida de un diagnóstico equivocado:

1. **El `gcloud` CLI** — `gcloud auth login`. Es el que usan `gcloud run services describe`,
   `gcloud logging read`, `gcloud artifacts …`.
2. **El ADC** — `gcloud auth application-default login`. Es el que usan las librerías y scripts.
3. **El Cloud SQL Connector** — negocia el túnel contra la Cloud SQL Admin API.

**El CLI puede estar vivo mientras el Connector se cuelga contra la Admin API.** Que `gcloud`
responda no prueba que puedas leer Postgres. Y un `invalid_rapt` significa **reauth**: la sesión
pide reautenticación, no es un problema de permisos.

Ante ADC vencida, la evidencia de rollout **no se pierde**: el payload estructurado del worker ya
expone `outboxDeadLetter`/`outboxRetryStorm` por batch, y sirve mejor que la consulta directa
porque da la **serie temporal**. Fue exactamente así como se verificó el blast radius de los
rollouts del 2026-08-02 sin tocar la base.

### (b) Un fixture que copia el vocabulario hace fallar tests ajenos al cambio

El vocabulario llegó a estar copiado literal en **cuatro** lugares, y al cambiarlo cada copia
rompió por separado y **en una capa distinta**: guard del catálogo, error de tipo en el runner,
aserción en contracts, test de integración en studio-web. Ninguno era el sistema fallando: era el
mismo dato avisando cuatro veces.

El problema no es el ruido en sí, es que **ese ruido esconde una regresión real cuando aparezca**:
cuatro rojos esperados entrenan a ignorarlos. Deriva los fixtures del vocabulario. (Los fixtures
de **ingredientes** sí van literales a propósito: son casos de uso concretos, no la lista.)

### (c) Otros

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El catálogo no carga tras editar una ruta | Un control honrado sin `valueShape`, o un `unsupported` con ella, o un slot que no participa en ninguna combinación | Leer el error del guard: nombra la regla violada |
| El build rompe en `production-route-failure-classification.test.ts` | Agregaste un código de rechazo y no lo clasificaste | Clasificarlo en `governed-run-failure-policy.ts`, mismo commit |
| El build rompe en `structured-brief-vocabulary.test.ts` | Los dos vocabularios divergieron | Alinear 1:1, o declarar la excepción explícitamente si de verdad lo es |
| El API responde `403` tras el deploy | Comportamiento esperado: internal-only y protegido | Nada. Preocúpate si ves `5xx` |
| La revisión activa no trae tu `sha12` | El workflow corrió pero no promovió tráfico, o desplegaste otro SHA | Revisar el run y volver a disparar con el SHA correcto |
| Un ingrediente del brief se rechaza con el control nombrado | La ruta no honra ese control — es el diseño, no un bug | Elegir otra ruta o quitar esa dirección. **No** corrijas el JSON: no es un error de forma |

## Referencias técnicas

- Decisión: [`EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) (ADR-022 + Deltas (b) y (c))
- Task gobernante: [`TASK-1633`](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
- Catálogo y guard de carga: `efeonce-globe/packages/domain/src/producer-catalog.ts`
- Tipos públicos del contrato: `efeonce-globe/packages/contracts/src/producer-catalog.ts`
- Vocabulario del brief: `efeonce-globe/packages/contracts/src/structured-briefs.ts`
- Alineación 1:1: `efeonce-globe/packages/domain/src/structured-brief-vocabulary.test.ts`
- Códigos de rechazo: `efeonce-globe/apps/creative-runner/src/production-route-compiler.ts`
- Clasificación de fallos: `efeonce-globe/packages/domain/src/governed-run-failure-policy.ts`
- Gate de clasificación: `efeonce-globe/apps/creative-runner/src/production-route-failure-classification.test.ts`
- Manuales vecinos: [flota de modelos del Producer](operar-flota-modelos-producer-globe.md) · [catálogo de rutas](efeonce-globe-producer-catalog.md) · [persistencia durable](operar-persistencia-globe.md)
- Skill: `greenhouse-globe`
