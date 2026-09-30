# Operar el Creative Workbench

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-09-29 por Claude
> **Ultima actualizacion:** 2026-09-30 por Claude
> **Documentacion tecnica:** [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)

## Para qué sirve

Controlar desde `greenhouse-eo` el repo del equipo creativo, `efeoncepro/creative-workbench`: qué skills, CLIs
y reglas recibe, quién entra, a qué clientes y con qué acceso a IA y buckets.

## Antes de empezar

- Sesión de `gh` con permisos de admin en la org (`gh auth status`).
- `gcloud` autenticado con una cuenta que pueda crear proyectos en la organización y asignar IAM.
- Checkout del workbench como hermano: `gh repo clone efeoncepro/creative-workbench ../creative-workbench`.
- Los cambios que quieres enviar al equipo, **commiteados**: el sync exporta un ref, no tu disco.

## Comandos

| Comando | Qué hace | Toca algo |
|---|---|---|
| `pnpm creative:status` | (Sólo lectura, drift medido en un clon temporal) Sello publicado y si está íntegro, sync pendiente (incluye rutas que pasan a nativas), drift, dependencias que faltan en el `package.json` nativo, PRs que tocan lo gestionado, último CI, equipo y skills con docs que no viajan. Sólo usa la API REST de GitHub | No |
| `pnpm creative:sync` | Vista previa: calcula el plan de `HEAD` sobre un **clon temporal** de `main` del workbench y muestra el diff | Nada (el clon se borra) |
| `pnpm creative:sync --pr` | Lo mismo, con rama, commit, push y PR desde el clon temporal | GitHub (tu checkout local no se toca) |
| `pnpm creative:sync --in-place` | Escribe en tu checkout local, sólo si está limpio, en `main` y al día con origin; si no, se niega | Tu checkout |
| `pnpm creative:sync --ref origin/develop --pr` | Exporta otro ref | GitHub |
| `pnpm creative:access plan` / `apply` | Reconcilia GitHub y GCP con `control.json` | `apply` sí |
| `pnpm creative:provision plan` / `apply` | Crea proyecto, APIs, buckets y secretos vacíos | `apply` sí (cobro) |
| `pnpm creative:assets:publish plan` / `apply` | Sube al bucket canon las referencias de `scripts/foto/assets.lock.json` | `apply` sí |

## Paso a paso

### Puesta en marcha (una vez)

1. `pnpm creative:provision plan` y revisa lo que va a crear.
2. `pnpm creative:provision apply`.
3. Crea en cada proveedor (OpenAI, fal.ai, Higgsfield) una **llave dedicada al workbench** con tope de gasto
   mensual, y cárgala **sin comillas ni salto de línea**:

   ```bash
   printf %s "$LLAVE" | gcloud secrets versions add workbench-openai-api-key --data-file=- --project=efeonce-creative-workbench
   ```

4. `pnpm creative:assets:publish apply` para subir las 156 referencias aprobadas.

### Dar acceso a una persona

1. Agrega un miembro en `scripts/creative-workbench/control.json`:

   ```json
   { "github": "usuario-github", "gcp": "nombre@efeonce.org", "ia": true }
   ```

   Sin `clientes`, la persona recibe todos (`clientesPorDefecto: "todos"`, decisión del 2026-09-30). Para
   restringirla, agrega `"clientes": ["berel", "sky"]`.

2. `pnpm creative:access plan`: debe listar el alta en el equipo y los bindings de canon, clientes y, si
   `ia: true`, las llaves y Vertex.
3. `pnpm creative:access apply`.
4. Commitea `control.json`: el estado deseado queda versionado.

### Quitar acceso

Pon `"activo": false` (o borra la entrada), corre `plan` y luego `apply`. Se retira del equipo y de todos sus
bindings `workbench-*`. Si la persona tenía `ia: true`, **rota las llaves**: pudo haberlas leído.

### Enviar un cambio al equipo (skill, regla, CLI, brand pack)

1. Edita la fuente en `greenhouse-eo`: la skill, `scripts/foto`, `scripts/creative-workbench/template/**` o el
   manifest.
2. Commitea.
3. `pnpm creative:status` muestra el sync pendiente.
4. `pnpm creative:sync --pr`, revisa el PR y mergéalo cuando el CI `gates` esté verde.

### Entregar una ruta al workbench (hacerla nativa)

Cuando el workbench necesita poseer un archivo que hoy recibe sellado (por ejemplo, su `package.json`):

1. Agrega la ruta a `native.paths` en `scripts/creative-workbench/export-manifest.json`. Sólo rutas exactas
   o carpetas `dir/**`. No se aceptan `gates/**`, el workflow `gates`, `CODEOWNERS` ni `.workbench/**`.
2. **No la quites** de la plantilla ni del manifest para "soltarla": el sync la borraría del workbench.
3. Commitea, corre `pnpm creative:status` (debe listarla con `→ … (pasa a nativo)`) y `creative:sync --pr`.
   El PR la saca del sello sin tocar el archivo.

Para devolverla a greenhouse-eo, quítala de `native.paths`. Si el archivo del workbench difiere de la
plantilla, el sync aborta con una colisión: decide qué versión queda antes de reintentar.

### Cambiar la nota «En el Workbench» de las skills

Las skills que mencionan `pnpm foto:*`, `ai:*` o `assets:pull` llegan al workbench con una nota al inicio que
traduce esos comandos al harness (`marca:*`). Para cambiarla, edita `scripts/creative-workbench/skill-overlay.md`
(`{{comandos}}` se reemplaza por los comandos de cada skill), commitea y corre `creative:sync --pr`. Qué skills la
reciben lo lista `.workbench/export-report.json → skillOverlays`.

### Agregar un cliente

1. Agrégalo a `clientes` en `control.json`.
2. Crea su brand pack en `scripts/creative-workbench/template/clients/<cliente>/README.md`: qué está
   codificado y qué no.
3. Commitea y corre `creative:sync --pr`, luego asigna el cliente a las personas y `creative:access apply`.

## Qué significan las señales

| Señal | Significado | Acción |
|---|---|---|
| `Sync pendiente: N a escribir` | La fuente cambió desde el último sello publicado | `creative:sync --pr` |
| `Drift en archivos gestionados: N` | Alguien editó en `main` del workbench algo que es gestionado | Revisa qué quería, porta el cambio si corresponde y re-sincroniza |
| `managed-drift` rojo en un PR del equipo | El PR toca archivos gestionados | Pide que lo propongan por issue |
| `⚠ N rutas exportables tienen cambios sin commitear` | Tu disco tiene cambios que **no** viajan | Normal en checkout compartido; commitea lo tuyo si debía viajar |
| Skills que citan docs que no viajan | Rutas internas referidas por skills | Decide caso a caso: allowlist o nada |
| `Sello íntegro: ✗ N anomalías` | El sello publicado no es el que greenhouse-eo habría escrito para su commit (una exención o una huella editada a mano) | Revisa el historial de `.workbench/sync.lock.json` y re-sincroniza |
| `PR #N … ⚠ toca N gestionados` | Un PR edita archivos sellados sin re-sellar, o re-sella con un sello que no es el de greenhouse-eo (`sync íntegro` = PR de sync auténtico) |
| `managed-drift`: «este PR cambia el sello y no es un sync» | Un PR que no viene de `creative:sync` modificó `.workbench/sync.lock.json` | Revertir ese cambio; lo nativo se pide por issue | Si el cambio es legítimo, pórtalo aquí o declara la ruta nativa; si no, pide revertirlo |
| `Dependencias … faltan N` | El `package.json` nativo no declara lo que necesitan los engines que se siguen entregando | Puede ser a propósito (engine desactivado); si no, pide agregarlas |
| `native-policy` rojo en el workbench | El harness nativo dejó de cumplir una regla sellada: el guard ya no bloquea algo, `settings.json` perdió una denegación o apagó los hooks, o hay código fuera del broker que llama a un proveedor, importa un SDK de IA o importa el adaptador del broker | Corregirlo en el workbench; si la regla debe cambiar, se cambia en `template/gates/native-policy.json` aquí |
| `✗ N rutas del plan ya existen en el workbench y no las gestiona el sello` (sync) | La plantilla trae un archivo que el workbench ya tiene como propio | Decláralo nativo o quítalo de la plantilla; el sync no lo pisa |

## Qué no hacer

- No edites archivos del workbench directamente, ni siquiera tú: el siguiente sync los pisa.
- No uses `--in-place` mientras tú o un agente trabajan en tu checkout del workbench: el sync por defecto (clon
  temporal) no lo necesita.
- No aceptes en el workbench una declaración de propiedad propia (como `.workbench/native-ownership.json`):
  lo nativo sólo se decide en el manifest de aquí.
- No des IAM a mano en `efeonce-creative-workbench` ni en `efeonce-group` para el equipo.
- No uses las llaves de Greenhouse en los secretos del workbench.
- No agregues a la allowlist de docs nada de finanzas, contratación, modelo de negocio o tasks.
- No corras `creative:sync` desde un ref que no revisaste.

## Problemas comunes

| Síntoma | Causa | Arreglo |
|---|---|---|
| `El ref X no trae scripts/creative-workbench/template` | El plano de control no está commiteado en ese ref | Commitea y reintenta |
| `El cierre de código alcanza src/lib/...` | Un CLI exportado empezó a importar un dominio prohibido | Corta el import en la fuente; no amplíes la lista |
| `pnpm install` falla por `@efeoncepro/*` | Credencial de GitHub sin `read:packages` | `gh auth refresh -s read:packages` |
| CI del workbench: `Unable to locate executable file: pnpm` | `setup-node@v5` buscó pnpm por `packageManager` | La plantilla ya lleva `package-manager-cache: false`; no lo quites |
| Una persona ve «sin acceso» en `pnpm doctor` para IA | No tiene `ia: true` o falta la versión del secreto | Revisa `control.json` y `creative:provision plan` |
| `creative:status` dice «Equipo … no disponible desde este entorno» | El entorno sólo permite endpoints `repos/...` (p. ej. sesión remota de agente) | Córrelo en tu equipo para ver el equipo de GitHub; el resto del tablero es válido |

### Proteger `main` cuando la org tenga GitHub Team

Con el plan Free, GitHub rechaza rulesets en repos privados (403). Con Team:

```bash
gh api -X POST repos/efeoncepro/creative-workbench/rulesets --input - <<'EOF'
{"name":"main-gobernado","target":"branch","enforcement":"active",
 "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
 "bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}],
 "rules":[{"type":"deletion"},{"type":"non_fast_forward"},
  {"type":"pull_request","parameters":{"required_approving_review_count":1,"require_code_owner_review":true,"dismiss_stale_reviews_on_push":true,"require_last_push_approval":false,"required_review_thread_resolution":false}},
  {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,"required_status_checks":[{"context":"gates"}]}}]}
EOF
```

## Referencias técnicas

- ADR: [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)
- Plano de control: `scripts/creative-workbench/` (`lib.mjs`, `sync.mjs`, `status.mjs`, `access.mjs`, `provision.mjs`, `assets-publish.mjs`)
- Plantilla del workbench: `scripts/creative-workbench/template/`
- Pruebas: `scripts/creative-workbench/control-plane.test.ts`
