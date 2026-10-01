# Operar el Creative Workbench

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-29 por Claude
> **Ultima actualizacion:** 2026-10-01 — continuidad vigente y bootstrap preservado
> **Documentacion tecnica:** [EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)

## Operación vigente — 2026-10-01

Fuente activa: `efeoncepro/creative-workbench`; Greenhouse conserva gobernanza y skills, sin alterar
sus engines. Consultar [continuidad actual](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md)
y [skill Codex/Claude](../../../.codex/skills/efeonce-creative-workbench/SKILL.md) antes de operar.

Para producir una campaña SKY, ejecutar desde Workbench el flujo documentado en
`docs/manual/native-design.md` y `docs/manual/design-batches.md` y `docs/manual/autonomous-components.md`: recetas/adaptaciones/zonas,
copy y fotografía admitidos, validación, ejecución exclusiva y QA. Los nombres/argumentos actuales
salen de `package.json` y del manual de ese repo. Para Git usar `git:identidad`/`git:hooks` por persona,
sin copiar la configuración del operador. Para el Lab consultar
[usar Creative Workbench Lab](../creative/usar-creative-workbench-lab.md) y su manual nativo
`docs/manual/workbench-lab.md`; revisar variante/receta y sus zonas. PR17/main `7e4c617` y el
[alias Vercel protegido](https://creative-workbench-sky.vercel.app/) tienen evidencia propia de
publicación del snapshot SKY; un servidor local o status CI Vercel genérico no la sustituye.

Sólo los archivos gestionados van por su mecanismo de distribución sellada. Cambios en motor,
componentes, Lab y broker nativos se hacen por PR en Workbench. No restaurar mirrors de template
ni ejecutar un sync total heredado. La prohibición genérica de edición del bootstrap histórico
sólo corresponde hoy a rutas gestionadas según su sello; no impide cambios nativos revisados por PR.
En mantenimiento del control plane, inspeccionar el plan y
ownership actuales antes de cualquier acción; este manual no autoriza cambios IAM/cloud/secrets.

No entregar llaves de proveedor al equipo ni reactivar `ai:*`/`foto:*` legacy para saltarse el broker.
La producción local cero IA está probada; flujo pagado y onboarding requieren su cierre separado.
Auth definitivo usa Efeonce ID (TASK-1952 diferida), no Google OAuth paralelo ni binding por email.
Los topes50/500 admiten aumentos por decisión del operador; nadie los eleva automáticamente.

## Bootstrap histórico — 2026-09-29

El bloque siguiente preserva el procedimiento original. Sus instrucciones de sync total, templates,
CLIs crudos y secreto por ADC personal quedaron superadas en el carril nativo. **No ejecutarlo como
procedimiento de producción vigente**. Source de verdad actual y pendientes están enlazados arriba.

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
| `pnpm creative:status` | Sello publicado, sync pendiente, drift, PRs, último CI, equipo y skills con docs que no viajan | No |
| `pnpm creative:sync` | Escribe el plan de `HEAD` en el checkout local, sin commit | Sólo el disco local |
| `pnpm creative:sync --pr` | Lo mismo, con rama, commit, push y PR en el workbench | GitHub |
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
   { "github": "usuario-github", "gcp": "nombre@efeonce.org", "clientes": ["berel", "sky"], "ia": true }
   ```

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

## Qué no hacer

- No edites archivos del workbench directamente, ni siquiera tú: el siguiente sync los pisa.
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
