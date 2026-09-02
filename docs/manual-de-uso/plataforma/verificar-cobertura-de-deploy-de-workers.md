> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-08-29 por Claude
> **Ultima actualizacion:** 2026-08-29 por Claude
> **Documentacion tecnica:** [GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md §Deploy-path coverage](../../architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md), [OPS_RELIABILITY_AGENT_INVARIANTS.md §Cobertura de rutas de deploy](../../architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)

# Cobertura de rutas de deploy de los workers

## Para que sirve

Cada worker Cloud Run se despliega desde su propio workflow, y ese workflow decide **dos veces** si hay que
desplegar. Las dos decisiones se toman contra una lista de rutas del repo:

1. `on.push.paths` — decide si el workflow siquiera corre.
2. `WORKER_RUNTIME_PATHS` — el drift-check. Si `git diff` no ve cambios en esas rutas, el step de deploy se
   **salta** y el job cierra `success`.

Si el worker empaqueta código de una ruta que la lista no menciona, el cambio entra a `main`, el release queda
verde y **el worker sigue sirviendo la imagen anterior**. Nadie ve un error: el síntoma aparece días después,
lejos, y parece un problema del dominio (un dato viejo, un consumer que no reacciona).

`pnpm worker:deploy-path-gate` evita eso. En vez de revisar la lista con los ojos, deriva la cobertura del
**árbol real del bundle** (el mismo `esbuild` que corre el Dockerfile), con los imports transitivos incluidos, y
falla si algún archivo del bundle no cae bajo ninguna ruta declarada.

Corre solo en CI (`ci.yml`, junto a `worker:runtime-deps-gate` y `worker:build-contract-gate`). Este manual es
para correrlo a mano y para leer su salida.

## Antes de empezar

- Estar en el checkout local, con dependencias instaladas (`pnpm install`).
- No necesitas credenciales: el gate no toca GCP, ni la base, ni la red. Solo lee el repo y corre esbuild.
- Toma unos segundos. Puedes correrlo en cualquier momento, no solo antes de un release.

## Paso a paso

### 1) Correr el gate

```bash
pnpm worker:deploy-path-gate
```

Salida cuando todo está cubierto:

```
✓ ops-worker: 1449 archivo(s) del bundle, todos cubiertos.
✓ commercial-cost-worker: 107 archivo(s) del bundle, todos cubiertos.
✓ ico-batch: 55 archivo(s) del bundle, todos cubiertos.
Cobertura de rutas de deploy OK para todos los workers analizados.
```

Esos son los números verificados el 2026-08-29. Si crecen, es normal: el bundle crece cuando el worker consume
más código.

### 2) Si falla, leer que tipo de hueco es

El gate reporta **dos** tipos de hueco, y la remediación es distinta:

| Mensaje | Que significa | Consecuencia real |
| --- | --- | --- |
| `N archivo(s) del bundle sin cobertura en <workflow>` | La ruta no está en **ninguna** de las dos listas | El workflow ni siquiera corre con ese cambio |
| `N archivo(s) en on.push.paths pero NO en WORKER_RUNTIME_PATHS` | Está en la primera lista, falta en la segunda | El workflow corre, el drift-check salta el deploy y el job cierra `success` |

Los huecos vienen agrupados por directorio de 3 niveles, con la cuenta de archivos de cada grupo, para que se
vea de dónde salen. Con la lista vieja, el `ops-worker` reportaba 696 archivos sin cobertura y entre esos grupos
aparecían `src/lib/postgres`, casi todo `src/lib/finance` y todo `src/lib/growth/seo`:

```
✗ ops-worker: 696 archivo(s) del bundle sin cobertura en .github/workflows/ops-worker-deploy.yml.
  Un cambio a estas rutas NO redespliega el worker y el release cierra verde:
    src/lib/finance  (N archivo(s))
    src/lib/growth/seo  (N archivo(s))
    src/lib/postgres  (N archivo(s))
```

### 3) Arreglar

Agrega el prefijo faltante a **las dos** listas del workflow (`on.push.paths` y `WORKER_RUNTIME_PATHS`) y
declara el **directorio**, nunca el archivo suelto. Vuelve a correr el gate hasta que quede en verde.

### 4) Distinguir un skip legítimo de uno falso

Este es el paso que más se equivoca. Cuando revisas un release y ves que el job de un worker duró ~45 segundos
con el step de deploy en `skipped`, **eso no prueba que no hubiera cambios**. Prueba que las rutas **declaradas**
no cambiaron.

Para saber cuál de los dos casos es, compara el **árbol completo**, sin `--`:

```bash
git diff --name-only <sha_que_sirve_cloud_run> <sha_target_del_release>
```

- **Vacío** ⇒ los dos árboles son idénticos ⇒ el skip fue correcto, no hay nada que hacer.
- **Con archivos** ⇒ el worker quedó atrás. Hay que redesplegarlo y revisar por qué la lista no lo detectó.

Para obtener el SHA que sirve Cloud Run:

```bash
gcloud run services describe ops-worker --region us-east4 --project efeonce-group --format=json \
  | grep -A1 '"GIT_SHA"'
```

El mismo SHA lo reporta el watchdog del release (`worker_revision_drift`) y el summary del propio workflow de
deploy; usa la fuente que tengas a mano, el criterio no cambia.

## Que significan los estados o senales

- **`✓` por worker** — todos los archivos que el worker empaqueta caen bajo alguna ruta declarada. Un cambio a
  cualquiera de ellos redesplegará el worker.
- **`✗ sin cobertura`** — hay código del worker que el workflow no está mirando. Es un stale silencioso esperando
  ocurrir.
- **`✗ en on.push.paths pero NO en WORKER_RUNTIME_PATHS`** — el peor de los dos para diagnosticar: el workflow
  corre y cierra verde, así que en el dashboard todo se ve bien.
- **Un job de worker de ~45 segundos** — es un skip. Puede ser legítimo o no; solo el diff de árbol completo lo
  dice.

## Que no hacer

- **No angostes la declaración de rutas.** Enumerar subdirectorios de `src/lib` se rompió cinco veces y cada
  arreglo agregó una ruta más sin cerrar la clase. Hoy la declaración es gruesa a propósito (`src/lib/**` y
  hermanos) y conserva lo que sí importa: `src/app/**`, `docs/**` y `tests/**` **no** redespliegan workers.
- **No agregues la ruta a una sola lista.** Un hueco en cualquiera de las dos deja el worker atrás.
- **No leas un skip como "no había cambios".** Es la lectura que dejó pasar el release `64bdd105c737`.
- **No des por cubierto al `artifact-worker`.** Corre desde el código fuente con `tsx`, no como bundle de
  esbuild, y **no** está registrado en este gate. Su lista de rutas sigue bajo revisión manual.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
| --- | --- | --- |
| `✗ <worker>: no se pudo analizar (...)` | El entrypoint del worker cambió de ruta, o hay un import que esbuild no resuelve | Revisar `WORKERS` en `scripts/ci/worker-deploy-path-coverage-gate.mjs` y que el import exista |
| El gate pasa pero el worker igual sirvió código viejo | El cambio pudo estar fuera del bundle (una migración, un secreto, una variable de entorno del `deploy.sh`) | Revisar el runtime del worker, no la lista de rutas |
| CI rojo en un test de contrato del workflow y verde en este gate | Hay una guarda textual sobre el YAML que quedó describiendo la forma vieja de la lista | Actualizar la guarda textual para que apunte a este gate; el verificador real es el gate |
| El gate se queja de un worker que ya no existe | Se retiró un worker sin sacarlo del registro | Sacar la entrada de `WORKERS` en el script |

## Referencias tecnicas

- Script: `scripts/ci/worker-deploy-path-coverage-gate.mjs` (su docstring explica el diseño completo)
- Wiring CI: `.github/workflows/ci.yml`, step `Worker deploy-path coverage gate`
- Workflows que gobierna: `ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `ico-batch-deploy.yml`
- Gates hermanos: `pnpm worker:runtime-deps-gate` (paquetes npm), `pnpm worker:build-contract-gate` (inputs de build)
- Contrato: [`GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` §Deploy-path coverage](../../architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md)
- Invariantes para agentes: [`OPS_RELIABILITY_AGENT_INVARIANTS.md`](../../architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md)
- Runbook de release: [`production-release.md` §4.1.1](../../operations/runbooks/production-release.md)
