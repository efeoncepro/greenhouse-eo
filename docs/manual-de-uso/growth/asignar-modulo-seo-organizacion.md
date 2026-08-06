# Manual — Asignar el modulo SEO a una organizacion

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-08-05 por Claude (TASK-1301)
> **Ultima actualizacion:** 2026-08-06 por Claude (delta: el modulo no requiere organization_type='client')
> **Modulo:** Growth / SEO (Search Visibility 360)
> **Ruta en portal:** sin UI todavia (paso manual SQL; UI llega con TASK-1306+)
> **Documentacion relacionada:** [doc funcional del modulo](../../documentation/growth/modulo-seo-search-visibility-360.md) · [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

## Para que sirve

Habilitar el módulo SEO (`seo_v1`) a una organización concreta, elegir su tier comercial (`contracted` / `trial` / `pilot`), verificar que el chokepoint de entitlement la reconoce, y revocar el acceso cuando corresponda. Sin este assignment, **ninguna** corrida SEO (captura de rankings, site audit, backlinks) puede ejecutarse para esa org: el chokepoint la bloquea con `no_entitlement`.

⚠️ **Hoy este es un paso manual por SQL.** El command gobernado detrás de `growth.seo.entitlement.manage` (con audit + outbox) es un follow-up declarado en TASK-1301. Mientras no exista, el alta/baja se hace con el SQL canónico de este manual — no inventes variantes.

## Antes de empezar

- Necesitas un rol con la capability `growth.seo.entitlement.manage`: **solo** `EFEONCE_ADMIN` o `EFEONCE_ACCOUNT` (admin o Account Manager). Nadie más asigna ni revoca este módulo.
- Necesitas acceso SQL a la instancia (`greenhouse-pg-dev` hoy): levanta el proxy con `pnpm pg:connect` y abre shell con `pnpm pg:connect:shell`, o deja el proxy corriendo en `127.0.0.1:15432` para el sanity script.
- Ten a mano el `organization_id` de la org (tabla `greenhouse_core.organizations`). Verifícalo antes de insertar:

  ```sql
  SELECT organization_id, display_name
  FROM greenhouse_core.organizations
  WHERE display_name ILIKE '%<nombre de la org>%';
  ```

- Decide el tier según el acuerdo comercial:

  | Tier | Cuándo | Site-audits/mes | Presupuesto USD/mes |
  |---|---|---|---|
  | `contracted` | Cliente con el módulo contratado | 8 | $50 |
  | `trial` | Prueba corta autolimitada | 1 | $2 |
  | `pilot` | Piloto acordado (cupo ajustable por org) | 2 (override posible) | $10 |

  Los defaults salen de env-knobs `GROWTH_SEO_*`; no los cambies por org — para un pilot con más cupo usa el override `metadata_json.seo_audit_runs_per_month`.

## Paso a paso

### 1. Crear el assignment

Ejecuta el INSERT canónico reemplazando los placeholders `<...>`:

```sql
INSERT INTO greenhouse_client_portal.module_assignments
  (assignment_id, organization_id, module_key, status, source, effective_from, metadata_json)
VALUES
  ('<assignment_id>',       -- id único legible, ej. 'cpma-seo-grupo-berel-2026-08'
   '<organization_id>',     -- el ID verificado en greenhouse_core.organizations
   'seo_v1',                -- literal: el module_key del catálogo (no inventar otro)
   'active',
   'operator_grant',        -- source: alta manual del operador
   CURRENT_DATE,
   '{"seo_tier": "<tier>"}'::jsonb  -- <tier> = contracted | trial | pilot
  );
```

Para un **pilot con cupo de audits distinto al default**:

```sql
-- metadata_json con override (solo aplica a tier pilot):
'{"seo_tier": "pilot", "seo_audit_runs_per_month": 4}'::jsonb
```

### 2. Verificar con el sanity script

Con el proxy corriendo en `127.0.0.1:15432`:

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-entitlement.ts
```

El script ejercita el chokepoint contra PG real (resuelve entitlement, valida cupos y presupuesto, prueba un costo que excede el budget) usando un assignment de prueba propio que borra al terminar. Debe cerrar con `✓ smoke E2E completo` y `filas seo_v1 residuales: 0` **antes** de tu alta — si corres el smoke después del alta, la última línea contará tu fila real (1), lo cual es esperado.

Para verificar **tu assignment concreto**, consulta directo:

```sql
SELECT assignment_id, organization_id, status, effective_from, effective_to, metadata_json
FROM greenhouse_client_portal.module_assignments
WHERE module_key = 'seo_v1' AND organization_id = '<organization_id>';
```

Debe existir exactamente una fila `active` con el tier esperado y `effective_to` nulo.

### 3. (Cuando exista runtime) confirmar que las corridas pasan

Hoy no hay crons ni readers (llegan en TASK-1302+), así que el alta no produce efectos visibles todavía. Cuando el runtime exista, la confirmación final será que una corrida de la org pasa el gate (`allowed = true`) en vez de bloquearse.

## Caso ejecutado: Efeonce own-brand (2026-08-05)

El primer alta real del módulo fue la propia agencia, como dogfooding: **Efeonce se trackea a sí misma con el mismo rigor que a un cliente** dentro del 360 (sin ser cliente — ver el delta 2026-08-06 más abajo). La decisión de modelado fue no inventar una org especial — se usó la org canónica ya existente `EO-ORG-0007` (Efeonce Group SpA, `is_operating_entity=true`) y sobre ella quedaron: el assignment `cpma-efeonce-seo-own-brand` (`seo_v1`, tier `contracted`, con nota `own_brand` en `metadata_json`), el target `seot-efeonce-own-brand` (`efeoncepro.com`, CL/es) y los 4 perfiles del grader ligados a la org.

Todo el alta se hizo con un **script idempotente committeado**: [`scripts/growth/provision-efeonce-own-brand-seo.ts`](../../../scripts/growth/provision-efeonce-own-brand-seo.ts). Ese script sirve de **plantilla reutilizable** para provisionar cualquier otra org: sigue el patrón commit + verificación con el chokepoint (`enforceSeoRunEntitlement`), y en esencia solo hay que cambiar el `organization_id` y el dominio del target (más el tier/tags que correspondan al acuerdo). Preferirlo por sobre SQL suelto: deja evidencia versionada y se puede re-correr sin duplicar filas.

⚠️ **El assignment solo abre la puerta del entitlement; no completa el 360.** Para que la org quede realmente operativa en Search Visibility 360 necesita además:

- su fila en `seo_target` (dominio + país/idioma) — sin target no hay qué medir;
- las **dos lentes** conectadas: el perfil del grader ligado a la org (lente AEO) **y** la propiedad de Google Search Console conectada (lente SEO). Con una sola lente, los readers de cruce (`readSeoAeoGap`) degradan honesto (`no_seo_data` / `no_aeo_data`) — eso es esperado, no un bug.

### Delta 2026-08-06 — el módulo NO requiere que la org sea "cliente"

Se corrigió un modelado: Efeonce (`EO-ORG-0007`) tenía `organization_type='client'` por herencia de un space de cliente de marzo 2026, y se bajó a `'other'`. **El dogfooding SEO no se vio afectado en nada** — el assignment, el target y los 4 perfiles del grader siguen intactos, verificado con el canary contra producción (`hasModule=true`, `tier=contracted`).

Por qué no se ve afectado: **el módulo se resuelve por `module_assignments`, no por el rol comercial de la org**. El chokepoint `enforceSeoRunEntitlement` consulta sólo `organization_id` + `module_key`; `organization_type` no entra en la decisión. Son ejes distintos:

| Eje | Pregunta | Dónde vive |
|---|---|---|
| Identidad legal | ¿quién soy? | `is_operating_entity` |
| Rol comercial | ¿qué soy frente al mercado? | `organization_type` |
| Capabilities | ¿qué hace la plataforma por mí? | `module_assignments` ← **acá vive el módulo SEO** |

Consecuencia práctica: **puedes asignar `seo_v1` a cualquier organización del backbone canónico** — cliente, prospecto, la propia operadora — sin tocar su `organization_type`. En particular, `'other'` significa *sin rol comercial*, no *sin clasificar*: la operadora lo lleva a propósito porque Efeonce no se vende a sí misma.

> Contrato: [`GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` §Organization Types](../../architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md) · invariantes para agentes: [`ORG_CLIENT_AGENT_INVARIANTS.md`](../../architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md).

## Como revocar

Cierra el assignment con fecha; **no borres la fila** si la org ya tiene snapshots en `greenhouse_growth.seo_*` — la historia de mediciones debe seguir siendo interpretable ("esta org tuvo SEO de tal fecha a tal fecha"):

```sql
UPDATE greenhouse_client_portal.module_assignments
SET status = 'inactive',
    effective_to = CURRENT_DATE
WHERE module_key = 'seo_v1'
  AND organization_id = '<organization_id>'
  AND status = 'active';
```

Desde ese momento el chokepoint responde `no_entitlement` y ninguna corrida nueva gasta presupuesto para esa org. Los snapshots existentes quedan intactos (son inmutables por trigger, además).

Un `DELETE` solo es aceptable para limpiar una fila de prueba/smoke que nunca tuvo mediciones asociadas.

## Que significan los estados (blockedReason)

Cuando el chokepoint `enforceSeoRunEntitlement` bloquea una corrida, devuelve una de estas razones:

| `blockedReason` | Qué significa | Qué hacer |
|---|---|---|
| `no_entitlement` | La org no tiene assignment `seo_v1` activo | Si corresponde comercialmente, crear el assignment (paso 1) |
| `expired` | Hay assignment pero su vigencia terminó (`effective_to` en el pasado) | Renovar: cerrar el vencido y crear uno nuevo con el tier vigente |
| `quota_exhausted` | Se agotó el cupo de site-audits del mes para su tier | Esperar al mes siguiente, o (pilot) subir el override `seo_audit_runs_per_month` si el acuerdo lo respalda |
| `budget_exhausted` | El gasto USD del mes (suma de `provider_cost` de los snapshots) más el costo estimado de la corrida excede el presupuesto del tier | Esperar al mes siguiente o escalar el tier; no "resetear" el gasto — es la serie real |

`allowed = true` con `blockedReason = null` significa que la corrida puede ejecutarse y gastar.

## Que no hacer

- **No borres historia.** Nunca `DELETE` de un assignment con snapshots asociados, y nunca `UPDATE`/`DELETE` sobre las tablas de mediciones `seo_rank_snapshots` / `seo_backlink_snapshots` / `seo_site_audit_*` (los triggers anti-mutation lo rechazan, y está bien que así sea).
- **No asignes SEO por rol ni por capability suelta.** El acceso es per-org vía `module_assignments`; darle a un rol interno un "acceso SEO" paralelo rompe el modelo (lección TASK-1248 del AEO).
- **No promuevas una org a `organization_type='client'` para "que le llegue el módulo".** No hace falta (el chokepoint no lee esa columna) y, si la org es la entidad legal operadora, la mete en los listados de clientes facturables — con riesgo de autofacturación. El alta del módulo es el `INSERT` en `module_assignments` y nada más.
- **No uses otro `module_key`.** Es `seo_v1` literal, seedeado en el catálogo `greenhouse_client_portal.modules`; un key inventado falla por FK.
- **No edites los env-knobs `GROWTH_SEO_*` para favorecer a una org.** Los knobs son globales por tier; el único ajuste por org es el override pilot en `metadata_json`.
- **No repliques la lógica del gate en otro lado.** Cualquier consumer nuevo (UI, Nexa, MCP, cron) pasa por `enforceSeoRunEntitlement` — es el chokepoint único por diseño.
- **No trates este manual como permanente.** Cuando llegue el command gobernado de `entitlement.manage`, el SQL manual queda obsoleto y este manual debe actualizarse.

## Problemas comunes

- **El INSERT falla por FK en `module_key`** → el módulo `seo_v1` no está seedeado en esa instancia; aplica las migraciones pendientes (`pnpm pg:connect:migrate`) antes de asignar. Ojo: `pnpm pg:connect:status` es dry-run, no aplica nada.
- **El sanity script no conecta** → el proxy no está corriendo en `127.0.0.1:15432`; levántalo con `pnpm pg:connect` y deja esa terminal abierta.
- **La org quedó con dos assignments activos** → cierra el duplicado con `status='inactive'` + `effective_to` conservando el más antiguo válido; no borres.
- **`quota_exhausted` en un pilot que debería tener más cupo** → falta el override `seo_audit_runs_per_month` en `metadata_json`; agrégalo con `UPDATE ... SET metadata_json = metadata_json || '{"seo_audit_runs_per_month": <n>}'::jsonb`.
- **`budget_exhausted` inesperado a comienzo de mes** → revisa `SUM(provider_cost)` del mes en `greenhouse_growth.seo_rank_snapshots` para la org; el gate suma el gasto real registrado, no un contador editable.

## Referencias tecnicas

- Chokepoint + tiers + knobs: [`src/lib/growth/seo/entitlement.ts`](../../../src/lib/growth/seo/entitlement.ts)
- Sanity live: [`scripts/growth/_sanity-seo-entitlement.ts`](../../../scripts/growth/_sanity-seo-entitlement.ts)
- Arquitectura (entitlements §9, datos §4, destino Wave §17): [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
- Doc funcional: [Modulo SEO — Search Visibility 360](../../documentation/growth/modulo-seo-search-visibility-360.md)
