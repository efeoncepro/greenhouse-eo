> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-06-16 por Claude (TASK-1152)
> **Ultima actualizacion:** 2026-07-15 por Codex (runtime deshabilitado)
> **Documentacion tecnica:** `docs/tasks/complete/TASK-1152-roadmap-task-index-reader-markdown-ssot.md`, `docs/tasks/complete/TASK-1153-roadmap-cockpit-ui-main-menu.md`, `src/lib/roadmap/work-item-index/*`, `src/lib/roadmap/cockpit/*`, `src/views/greenhouse/roadmap/*`

# Roadmap — Indice de Work Items (lectura del backlog Markdown)

> **Estado 2026-07-15:** la superficie runtime `/roadmap` y los endpoints
> `GET /api/roadmap/work-items*` estan deshabilitados. El reader filesystem de
> TASK-1152/1153 hacia que Turbopack trazara un patron dinamico amplio sobre
> decenas de miles de archivos y obligaba a bundlear `docs/**` via
> `outputFileTracingIncludes`. El codigo queda como referencia historica, pero
> fuera del runtime del portal hasta mover el indice a una proyeccion externa,
> materializada o local-first.

## Que es

El **Roadmap work item index** es una vista de solo lectura del backlog operativo de Greenhouse. El backlog vive como archivos Markdown en el repo (`docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**`, `docs/issues/**`) y esos archivos **siguen siendo la fuente de verdad** para los agentes. Este indice convierte todos esos artefactos en una lista tipada y navegable para humanos, sin mover la verdad a una base de datos ni permitir editar Markdown desde la pantalla.

El trabajo real no vive solo en `TASK-*`:

- **Epics** (`EPIC-*`) agrupan programas grandes.
- **Tasks** (`TASK-*`) son trabajo planificado (features, hardening, refactors).
- **Mini-tasks** (`MINI-*`) son follow-ups acotados.
- **Issues** (`ISSUE-*`) son incidentes reactivos detectados en runtime.

El indice expone los cuatro tipos juntos como un solo backlog navegable.

## Que NO hace (V1)

- No edita, mueve ni reescribe ningun archivo Markdown.
- No cambia el lifecycle (no mueve archivos entre `to-do/`, `in-progress/`, `complete/`, `open/`, `resolved/`).
- No guarda prioridades ni ranking en base de datos.
- No es la pantalla visual del Roadmap (eso es `TASK-1153`). V1 es solo el contrato de datos que la pantalla va a consumir.

## Como se accede

Estado actual: no hay acceso operativo desde el portal.

El endpoint interno historico era `GET /api/roadmap/work-items`; ahora conserva
la autenticacion/capability defensiva y responde `410 roadmap_disabled`.

Quien puede leerlo:

- Solo usuarios **internos** de Efeonce (route group `internal`) que tengan la capability `roadmap.work_items.read`.
- Los usuarios de **cliente** (`client_*`) no lo ven: el backlog es operacion interna del repo.

Si no estas autenticado -> 401. Si no eres interno o no tienes la capability -> 403.
Si tienes acceso, el endpoint responde 410 porque el modulo esta apagado. Ningun
error expone rutas locales ni detalles tecnicos.

## Que devuelve

Una respuesta con version de contrato `roadmap-work-item-index.v1`:

```jsonc
{
  "contractVersion": "roadmap-work-item-index.v1",
  "items": [ /* lista de work items (paginada) */ ],
  "total": 1240,          // cuantos matchean los filtros (antes de paginar)
  "page": 1,
  "pageSize": 50,
  "facets": {             // conteos del universo completo (sin filtros)
    "byKind":      { "epic": 19, "task": 1223, "mini_task": 4, "issue": 97 },
    "byLifecycle": { "to-do": 410, "in-progress": 12, "complete": 820, "open": 14, "resolved": 83, "unknown": 4 },
    "byHealth":    { "ok": 980, "needs_grooming": 250, "legacy": 113 }
  },
  "degradedItemCount": 0, // archivos que el reader no pudo leer del todo
  "generatedAt": "2026-06-16T13:30:00.000Z"
}
```

Cada **work item** trae:

```jsonc
{
  "id": "TASK-1152",
  "kind": "task",                       // epic | task | mini_task | issue
  "title": "TASK-1152 — Roadmap work item index reader (Markdown SSOT)",
  "path": "docs/tasks/in-progress/TASK-1152-...md",  // SIEMPRE relativo, nunca absoluto
  "lifecycle": "in-progress",           // viene del folder donde vive el archivo
  "declaredLifecycle": "in-progress",   // lo que dice el Markdown (puede diferir → finding)

  "priority": "P1", "impact": "Alto", "effort": "Medio",
  "type": "implementation", "rank": "TBD",

  "executionProfile": "backend-data", "uiImpact": "none", "backendImpact": "reader",
  "domain": "roadmap|platform|ops|data",

  "blockedBy": [], "branch": "task/TASK-1152-...",
  "filesOwned": ["src/lib/roadmap/work-item-index/types.ts", "..."],
  "dependsOn": [], "blocks": ["TASK-1153"],
  "relatedIds": ["TASK-1153", "EPIC-..."],
  "parentEpic": null,

  // solo en issues (null en el resto):
  "environment": null, "detectedAt": null, "resolvedAt": null, "severity": null,

  "health": {
    "templateStatus": "template",       // template | canonical | legacy | unknown
    "lintErrors": 0, "lintWarnings": 0,
    "needsGrooming": false,
    "level": "ok",                      // ok | needs_grooming | legacy
    "readiness": "in_progress",         // ready_to_execute | in_progress | blocked | needs_triage | complete | resolved
    "findings": []                      // mensajes legibles de las reglas que disparo
  },
  "parseWarnings": [],

  "summary": "Crear la foundation backend/read-only...",
  "why": "El backlog ya es demasiado grande...",
  "goalPreview": "Mantener docs/... como SSOT..."
}
```

### Salud (`health`)

El reader **espeja** (no duplica el binario) la semantica de los linters canonicos `pnpm task:lint`, `pnpm epic:lint` y `pnpm mini:lint`:

- `templateStatus`: si el item cumple la forma canonica de su tipo (`template` para tasks; `canonical` para epics/mini-tasks; `unknown` para issues, que no tienen linter).
- `lintErrors` / `lintWarnings`: faltantes de secciones/campos requeridos + desalineacion lifecycle↔folder.
- `level`: `legacy` (no cumple la forma), `needs_grooming` (tiene findings abiertos), `ok` (limpio).
- `readiness`: estado operativo derivado para decidir "que puedo tomar ahora".

Un item legacy o incompleto **nunca rompe la respuesta**: degrada a `legacy` / `needs_grooming` con sus `findings`.

## Filtros (query params)

Todos opcionales, se combinan con AND:

| Param | Ejemplo | Que filtra |
|---|---|---|
| `kind` | `kind=issue` | epic / task / mini_task / issue |
| `lifecycle` | `lifecycle=in-progress` | to-do / in-progress / complete / open / resolved / unknown |
| `domain` | `domain=finance` | el campo Domain |
| `executionProfile` | `executionProfile=ui-ux` | standard / ui-ux / backend-data |
| `uiImpact` | `uiImpact=none` | none / copy / layout / ... |
| `backendImpact` | `backendImpact=reader` | none / api / db / reader / ... |
| `blocked` | `blocked=true` | items con / sin bloqueo declarado |
| `health` | `health=needs_grooming` | ok / needs_grooming / legacy |
| `readiness` | `readiness=ready_to_execute` | estado operativo derivado |
| `parentEpic` | `parentEpic=EPIC-012` | hijos de un epic |
| `search` | `search=nubox` | texto libre sobre id / title / summary |
| `page`, `pageSize` | `page=2&pageSize=50` | paginacion (pageSize max 500) |

## Ejemplos historicos para `TASK-1153`

Estos ejemplos ya no son operativos mientras el modulo esta deshabilitado.

- **Listar todo lo "tomable" ahora**: `GET /api/roadmap/work-items?readiness=ready_to_execute`
- **Cola de grooming**: `GET /api/roadmap/work-items?health=needs_grooming`
- **Issues abiertos**: `GET /api/roadmap/work-items?kind=issue&lifecycle=open`
- **Hijos de un epic**: `GET /api/roadmap/work-items?parentEpic=EPIC-012`
- **Conteos para los chips del cockpit**: leer `facets` (siempre del universo completo, sin filtros).

> Detalle tecnico: el reader vive en `src/lib/roadmap/work-item-index/reader.ts` (walk + cache por fingerprint mtime/size). El parseo (`parser.ts`) y la clasificacion de salud (`health.ts`) son puros y testeados. El contrato `roadmap-work-item-index.v1` esta en `types.ts`. La capability `roadmap.work_items.read` se sembro en `greenhouse_core.capabilities_registry` (migracion `20260616133046114`).

## Notas de runtime

- El runtime vigente ya no incluye `docs/**` en el bundle de la funcion. Esa inclusion fue retirada para eliminar el hotspot de build.
- El indice historico se cacheaba por proceso usando un fingerprint barato (cantidad de archivos + suma de mtime/size). Ese comportamiento queda solo como referencia si se disena una proyeccion futura.
