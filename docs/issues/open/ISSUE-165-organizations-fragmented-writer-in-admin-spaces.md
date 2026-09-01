# ISSUE-165 — `/api/admin/spaces` crea organizaciones fuera del SSOT canónico

## Ambiente

production + staging (mismo código; el defecto no depende del ambiente)

## Detectado

2026-09-01, durante el barrido de 27 tasks `in-progress` con cero checkboxes tildados. No lo reportó
un usuario ni un test: emergió al verificar contra el runtime si `TASK-991` estaba terminada. La
propia task existe para matar esta clase de puerta, y la puerta sigue abierta dentro de su alcance.

## Síntoma

Una organización creada al dar de alta un Space nace **sin `organization_type`, sin `origin` y sin
`lifecycle_stage`**. No falla nada: el `INSERT` pasa, el Space queda creado y la organización existe
a medias, invisible para cualquier consumer que ramifique por esos campos.

## Causa raíz

`src/app/api/admin/spaces/route.ts:122` escribe la tabla canónica con SQL crudo:

```sql
INSERT INTO greenhouse_core.organizations (
  organization_id, organization_name,
  hubspot_company_id, status, active
) VALUES ($1, $2, $3, 'active', TRUE)
```

Eso viola literalmente la regla dura de `CLAUDE.md` § *Client lifecycle / onboarding*:

> **NUNCA** escribir `greenhouse_core.organizations` (account-360 doors) fuera de
> `upsertCanonicalOrganization` ni hand-setear `organization_type` inconsistente con el lifecycle
> (usar `deriveOrganizationType`).

Las otras dos puertas del árbol (`src/lib/account-360/organization-identity.ts:331` y
`src/lib/commercial/party/commands/create-party-from-hubspot-company.ts`) **sí** son puertas
declaradas del SSOT. Ésta no: es un writer directo en un route handler.

🔴 **Y el guard que debía atraparlo no existe.** `TASK-991` declara el CHECK
`organizations_type_lifecycle_consistent` como entregado, y **no está en la base**: `pg_constraint`
sobre `greenhouse_core.organizations` devuelve `type_check`, `lifecycle_stage_valid`,
`lifecycle_stage_source_valid`, `origin_valid`, `default_locale_check` y las claves — ninguna de
consistencia tipo↔lifecycle. Tampoco existe su migración, ni en `migrations/` ni en
`docs/tasks/pending-migrations/`. Dos comentarios del código (`src/lib/account-360/organization-type.ts:13`
y `:104`) afirman que el CHECK está activo. Es una guarda que sólo existe como prosa.

## Impacto

**Latente, no activo.** Medido el 2026-09-01: **0 organizaciones con `organization_type` NULL** en la
base. La puerta está abierta pero nadie pasó por ella últimamente — probablemente porque el alta de
Spaces con organización nueva es poco frecuente y `TASK-991` remedió las existentes.

Lo que se rompe cuando alguien pase: la organización no aparece con el tipo correcto en Account 360,
`deriveOrganizationType` nunca corre sobre ella, y el lifecycle queda sin declarar — que es
exactamente el estado "half-baked" que `TASK-991` inventarió y remedió una vez.

## Solución propuesta

1. Reemplazar el `INSERT` crudo de `spaces/route.ts` por `upsertCanonicalOrganization`, que ya resuelve
   `organization_type` con `deriveOrganizationType` y puebla `origin` + `lifecycle_stage`.
2. Crear la migración del CHECK `organizations_type_lifecycle_consistent`. **La aplicación está
   despejada**: violadores sobre todas las filas = 0, así que puede nacer `VALID` sin `NOT VALID`.
3. Corregir los dos comentarios que afirman que el CHECK ya existe.

Los pasos 2 y 3 son alcance de `TASK-991`, que sigue `in-progress` y tiene esos criterios sin cumplir.
El paso 1 puede resolverse acá.

## Verificación

```sql
-- debe seguir dando 0 después del fix
SELECT count(*) FROM greenhouse_core.organizations WHERE organization_type IS NULL;

-- debe existir y estar validated
SELECT conname, convalidated FROM pg_constraint
 WHERE conrelid = 'greenhouse_core.organizations'::regclass
   AND conname = 'organizations_type_lifecycle_consistent';
```

```bash
# no debe quedar ningún writer directo fuera de las puertas declaradas
grep -rn "INTO greenhouse_core.organizations" src/ | grep -v account-360 | grep -v commercial/party
```

## Relacionados

- `TASK-991` — Canonical Organization Write SSOT + Birth Completeness (`in-progress`; dueña del CHECK)
- `CLAUDE.md` § Client lifecycle / onboarding — la regla dura violada
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`
