# CODEX TASK — Admin Team: CRUD de Equipo y Asignaciones a Cuentas (v2)

## Estado

Este brief **reemplaza** a `CODEX_TASK_Admin_Team_Module.md` (v1).

La v1 mezclaba infraestructura BigQuery, APIs, drawers Y vistas de lista/detalle. Con la llegada de `CODEX_TASK_People_Unified_View_v2.md`, la responsabilidad se separa:

- **People v2** → lectura: lista, ficha, tabs, sidebar ← ya definido
- **Este task** → escritura: crear personas, editar perfil, asignar a cuentas, desasignar

Este task implementa las **acciones de mutación** que People v2 dejó explícitamente como fase futura con el texto: "Las acciones de edición de assignments o perfil quedan fuera de alcance en esta fase, o explícitamente behind feature flag / empty CTA hasta que exista CRUD de team."

---

## Alineación explícita con Greenhouse 360 Object Model

Esta task debe mantenerse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:
- `greenhouse.team_members.member_id` sigue siendo el ancla canónica del objeto `Collaborator`
- este módulo administra ese objeto y su relación con cuentas, no crea una identidad alternativa
- `client_team_assignments` sigue siendo relación cliente ↔ colaborador sobre objetos canónicos existentes
- cualquier integración con Payroll, Finance o People debe enriquecer el mismo objeto `Collaborator`

No permitido:
- crear un nuevo “employee master” fuera de `team_members`
- usar `client_users` como reemplazo de la identidad laboral del colaborador

---

## Resumen

Implementar los **endpoints de escritura y drawers de acción** para gestionar el equipo Efeonce:

1. **CRUD de personas** — crear, editar perfil, desactivar
2. **CRUD de asignaciones** — asignar persona a cuenta, editar FTE, desasignar
3. **Drawers de UI** — consumidos por `/people` y `/people/[memberId]`

Una vez implementado, People v2 activa los CTAs que hoy están vacíos o behind feature flag.

---

## Realidad técnica del repo

### Ya existe

| Recurso | Ubicación |
|---------|-----------|
| `greenhouse.team_members` | BigQuery, schema completo con `location_country`, `identity_profile_id`, `email_aliases` |
| `greenhouse.client_team_assignments` | BigQuery |
| `greenhouse.identity_profile_source_links` | BigQuery |
| Seed data de 7 personas | Ya insertado |
| `src/types/team.ts` | Tipos de equipo |
| `src/lib/team-queries.ts` | Queries de lectura (45KB) |
| `TeamAvatar.tsx` | `src/components/greenhouse/` |
| `TeamIdentityBadgeGroup.tsx` | `src/components/greenhouse/` |
| `CompensationDrawer.tsx` | Ya implementado para payroll |
| Drawer pattern | Ya usado en admin |
| `GET /api/team/members` | Lectura de roster (client-facing) |
| `GET /api/team/capacity` | Lectura de capacidad |
| People v2 surfaces | `/people` y `/people/[memberId]` (read-only) |

### No existe (lo que este task crea)

| Gap | Impacto |
|-----|---------|
| `POST /api/admin/team/members` | No se pueden crear personas desde UI |
| `PATCH /api/admin/team/members/[memberId]` | No se puede editar perfil |
| `POST /api/admin/team/assignments` | No se pueden asignar personas a cuentas |
| `PATCH /api/admin/team/assignments/[assignmentId]` | No se puede editar FTE |
| `DELETE /api/admin/team/assignments/[assignmentId]` | No se puede desasignar |
| `CreateMemberDrawer.tsx` | No hay UI de creación |
| `EditProfileDrawer.tsx` | No hay UI de edición |
| `AssignmentDrawer.tsx` | No hay UI de asignación |

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/admin-team-crud`
- **Framework:** Next.js 16.1.1
- **UI Library:** MUI 7.x
- **TypeScript:** 5.9.3
- **Deploy:** Vercel
- **BigQuery dataset:** `greenhouse`

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (repo) | Reglas operativas |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (repo) | Roles, guards, `authorization.ts` |
| `project_context.md` (repo) | Schema real, identidad canónica |
| `team-queries.ts` (repo) | Queries existentes — reutilizar patrones |
| `src/types/team.ts` (repo) | Tipos existentes — extender, no duplicar |
| `CODEX_TASK_People_Unified_View_v2.md` | Vista que consume estos endpoints |

---

## Modelo de acceso

### Solo `efeonce_admin`

Todas las APIs de mutación requieren `efeonce_admin`. Ni `efeonce_operations` ni `hr_payroll` pueden crear o editar personas ni asignaciones.

### Patrón de auth

Verificar en `authorization.ts` cómo se valida `efeonce_admin` y reutilizar el mismo patrón. No inventar un guard nuevo.

---

## PARTE A: API Routes de personas

Todas bajo `/api/admin/team/members/`.

### A1. `POST /api/admin/team/members`

Crear una nueva persona en `greenhouse.team_members`.

**Request body:**

```typescript
// Extender o reusar tipos de src/types/team.ts
interface CreateMemberInput {
  displayName: string                    // Requerido
  email: string                          // Requerido, @efeoncepro.com
  emailAliases?: string[]                // Otros emails (ej: @efeonce.org)
  locationCountry?: string               // ISO alpha-2: 'CL', 'VE', 'CO'
  locationCity?: string
  roleTitle: string                      // Requerido
  roleCategory: string                   // Requerido, enum del repo
  avatarUrl?: string
  contactChannel?: string                // 'teams' | 'slack' | 'email'
  contactHandle?: string
  relevanceNote?: string
  // IDs externos (opcionales, se enlazan después)
  azureOid?: string
  notionUserId?: string
  hubspotOwnerId?: string
}
```

**Lógica:**
- Generar `member_id` como slug del `displayName` (kebab-case, sin acentos)
- Validar que `email` no exista ya en `team_members`
- Validar `roleCategory` contra los valores existentes en el repo (verificar en `team-queries.ts` o `types/team.ts`)
- No generar `identity_profile_id` — eso lo maneja el sistema de identidad del repo
- INSERT en BigQuery
- Retornar el member creado

### A2. `PATCH /api/admin/team/members/[memberId]`

Actualizar campos de una persona.

**Campos editables:** Todos los de `CreateMemberInput` + `active` (para desactivar).

**Lógica:**
- Verificar que el member existe
- Construir UPDATE dinámico con solo los campos que vienen en el body
- Setear `updated_at = CURRENT_TIMESTAMP()`
- Retornar el member actualizado

### A3. `POST /api/admin/team/members/[memberId]/deactivate`

Desactivar persona. Separado del PATCH para tener registro explícito.

**Lógica:**
- Setear `active = FALSE`
- Cerrar todos los `client_team_assignments` activos de esta persona (`active = FALSE`, `end_date = CURRENT_DATE()`)
- Registrar en `audit_events` si la tabla existe

---

## PARTE B: API Routes de asignaciones

Todas bajo `/api/admin/team/assignments/`.

### B1. `POST /api/admin/team/assignments`

Asignar persona a cuenta.

**Request body:**

```typescript
interface CreateAssignmentInput {
  clientId: string                       // ID del tenant/space
  memberId: string                       // ID del team member
  fteAllocation: number                  // 0.1 a 2.0
  hoursPerMonth?: number                 // Default: fteAllocation × 160
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: string
  contactHandleOverride?: string
  startDate?: string                     // ISO date, default hoy
}
```

**Validaciones:**
- `clientId` debe existir en tenants activos
- `memberId` debe existir y estar activo
- No debe existir assignment activo para la misma combinación `clientId + memberId`
- `fteAllocation` entre 0.1 y 2.0

**Lógica:**
- Generar `assignment_id` como `{clientId}_{memberId}`
- Si no viene `hoursPerMonth`, calcular como `CAST(fteAllocation * 160 AS INT64)`
- INSERT en BigQuery
- Retornar la asignación creada

### B2. `PATCH /api/admin/team/assignments/[assignmentId]`

Editar FTE, horas, overrides.

**Campos editables:** `fteAllocation`, `hoursPerMonth`, `roleTitleOverride`, `relevanceNoteOverride`, `contactChannelOverride`, `contactHandleOverride`.

**Lógica:**
- Verificar que el assignment existe y está activo
- UPDATE con campos enviados
- Recalcular `hoursPerMonth` si `fteAllocation` cambió y `hoursPerMonth` no fue enviado explícitamente
- Setear `updated_at = CURRENT_TIMESTAMP()`

### B3. `DELETE /api/admin/team/assignments/[assignmentId]`

Soft delete: desasignar persona de cuenta.

**Lógica:**
- Setear `active = FALSE`
- Setear `end_date = CURRENT_DATE()`
- Registrar en `audit_events` si existe

---

## PARTE C: Drawers de UI

Componentes reutilizables que `/people` importa. Viven en `src/views/greenhouse/people/drawers/` (junto con People v2, no en un módulo separado).

### C1. `CreateMemberDrawer.tsx`

**Patrón:** Drawer lateral 480px. Referencia: `CompensationDrawer.tsx` ya implementado.

**Campos:**
- Nombre completo (TextField, requerido)
- Email público (TextField, @efeoncepro.com, requerido)
- Emails adicionales (Chip input para aliases, incluir @efeonce.org)
- País (Select con opciones principales: CL, CO, VE, MX, PE, US + "Otro")
- Ciudad (TextField)
- Cargo (TextField, requerido)
- Categoría de rol (Select con valores del repo)
- Canal de contacto (Select: Teams, Slack, Email)
- Handle de contacto (TextField)
- Nota de relevancia (TextField multiline)
- **Sección colapsable "Integraciones":**
  - Azure OID (TextField)
  - Notion User ID (TextField)
  - HubSpot Owner ID (TextField)

**Footer:** Botón "Crear colaborador" → `POST /api/admin/team/members`

**Tras éxito:** Cerrar drawer, revalidar lista de `/people`, navegar a `/people/[newMemberId]`.

### C2. `EditProfileDrawer.tsx`

Mismos campos que `CreateMemberDrawer` pero pre-llenados. Email público no editable (es el identificador).

**Footer:** "Guardar cambios" → `PATCH /api/admin/team/members/[memberId]`

### C3. `AssignmentDrawer.tsx`

**Campos:**
- Cuenta (Autocomplete sobre tenants activos)
- FTE (Slider 0.1–2.0 con step 0.1 + TextField numérico sincronizado)
- Horas/mes (TextField numérico, auto-calculado como FTE × 160, editable)
- Override de cargo (TextField, placeholder: "Usa cargo por defecto")
- Override de relevancia (TextField multiline)
- Fecha de inicio (DatePicker, default hoy)

**Footer:** "Asignar a cuenta" → `POST /api/admin/team/assignments`

**Tras éxito:** Cerrar drawer, revalidar tab Asignaciones de la ficha.

### C4. `EditAssignmentDrawer.tsx`

Pre-llena con datos del assignment existente. Solo edita FTE, horas y overrides.

**Footer:** "Guardar cambios" → `PATCH /api/admin/team/assignments/[assignmentId]`

**Acción de desasignar:** Botón outline rojo al fondo del drawer: "Desasignar de esta cuenta" → confirmación → `DELETE /api/admin/team/assignments/[assignmentId]`

---

## PARTE D: Integración con People v2

Una vez este task esté implementado, People v2 activa los CTAs:

### En `/people` (lista)

- Botón "+" en header → abre `CreateMemberDrawer`
- Menú "···" por fila → "Editar perfil" abre `EditProfileDrawer`

### En `/people/[memberId]` (ficha)

- Botón "Editar perfil" en sidebar → abre `EditProfileDrawer`
- Botón "Desactivar" en sidebar → `POST /api/admin/team/members/[memberId]/deactivate` con confirmación
- En tab Asignaciones:
  - Botón "Asignar a nueva cuenta" → abre `AssignmentDrawer`
  - Click en fila de assignment → abre `EditAssignmentDrawer`
  - Ghost slot al final: "Asignar a nueva cuenta"

### Regla de activación

- Si las APIs de este task no existen aún, People v2 oculta los CTAs (no muestra botones rotos)
- Si las APIs existen pero el usuario no es `efeonce_admin`, los CTAs no aparecen
- La detección puede ser: intentar un health check a `/api/admin/team/members` — si retorna 404, ocultar; si retorna 403, ocultar; si retorna 200, mostrar

---

## PARTE E: Tipos TypeScript

No crear `src/types/team-admin.ts`. Extender `src/types/team.ts` existente:

```typescript
// Agregar a src/types/team.ts (o crear sección de mutation types)

export interface CreateMemberInput {
  displayName: string
  email: string
  emailAliases?: string[]
  locationCountry?: string
  locationCity?: string
  roleTitle: string
  roleCategory: string
  avatarUrl?: string
  contactChannel?: string
  contactHandle?: string
  relevanceNote?: string
  azureOid?: string
  notionUserId?: string
  hubspotOwnerId?: string
}

export interface CreateAssignmentInput {
  clientId: string
  memberId: string
  fteAllocation: number
  hoursPerMonth?: number
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: string
  contactHandleOverride?: string
  startDate?: string
}

export interface UpdateAssignmentInput {
  fteAllocation?: number
  hoursPerMonth?: number
  roleTitleOverride?: string
  relevanceNoteOverride?: string
  contactChannelOverride?: string
  contactHandleOverride?: string
}
```

---

## PARTE F: Estructura de archivos

```
src/
├── app/
│   └── api/
│       └── admin/
│           └── team/
│               ├── members/
│               │   ├── route.ts                          # POST (crear)
│               │   └── [memberId]/
│               │       ├── route.ts                      # PATCH (editar)
│               │       └── deactivate/
│               │           └── route.ts                  # POST (desactivar)
│               └── assignments/
│                   ├── route.ts                          # POST (crear)
│                   └── [assignmentId]/
│                       └── route.ts                      # PATCH (editar) + DELETE (soft)
├── lib/
│   └── team-admin/
│       └── mutate-team.ts                                # INSERT/UPDATE helpers para BigQuery
├── views/
│   └── greenhouse/
│       └── people/
│           └── drawers/
│               ├── CreateMemberDrawer.tsx
│               ├── EditProfileDrawer.tsx
│               ├── AssignmentDrawer.tsx
│               └── EditAssignmentDrawer.tsx
└── types/
    └── team.ts                                           # Extender con mutation types
```

**Nota:** Los drawers viven dentro de `views/greenhouse/people/drawers/` porque son consumidos por People. No crear un módulo `team-admin` separado.

---

## PARTE G: Orden de ejecución

### Fase 1: APIs de personas

1. Verificar patrón de auth en `authorization.ts` para `efeonce_admin`
2. Implementar `POST /api/admin/team/members` (A1)
3. Implementar `PATCH /api/admin/team/members/[memberId]` (A2)
4. Implementar `POST /api/admin/team/members/[memberId]/deactivate` (A3)
5. Agregar mutation types a `src/types/team.ts`

### Fase 2: APIs de asignaciones

6. Implementar `POST /api/admin/team/assignments` (B1)
7. Implementar `PATCH /api/admin/team/assignments/[assignmentId]` (B2)
8. Implementar `DELETE /api/admin/team/assignments/[assignmentId]` (B3)
9. Crear `src/lib/team-admin/mutate-team.ts` con helpers de INSERT/UPDATE

### Fase 3: Drawers

10. Crear `CreateMemberDrawer.tsx` (C1)
11. Crear `EditProfileDrawer.tsx` (C2)
12. Crear `AssignmentDrawer.tsx` (C3)
13. Crear `EditAssignmentDrawer.tsx` (C4)

### Fase 4: Integración con People

14. Activar CTA "+" en lista de People → `CreateMemberDrawer`
15. Activar CTAs en ficha de persona → drawers correspondientes
16. Activar acciones en tab Asignaciones → `AssignmentDrawer`, `EditAssignmentDrawer`
17. Verificar que CTAs solo aparecen para `efeonce_admin`

---

## Criterios de aceptación

### APIs

- [ ] `POST /members` crea persona, valida email único, genera `member_id` como slug
- [ ] `PATCH /members/[id]` actualiza solo campos enviados, setea `updated_at`
- [ ] `POST /members/[id]/deactivate` desactiva persona Y cierra todos sus assignments
- [ ] `POST /assignments` crea asignación, valida no-duplicado activo, calcula horas default
- [ ] `PATCH /assignments/[id]` actualiza FTE/overrides, recalcula horas si FTE cambió
- [ ] `DELETE /assignments/[id]` hace soft delete (active=false, end_date=hoy)
- [ ] Todas las routes validan `efeonce_admin`
- [ ] Las mutations son idempotentes donde sea posible (UPSERT patterns)

### Drawers

- [ ] CreateMemberDrawer crea persona y refresca lista de People
- [ ] EditProfileDrawer actualiza persona y refresca ficha
- [ ] AssignmentDrawer asigna a cuenta y refresca tab Asignaciones
- [ ] EditAssignmentDrawer edita FTE y permite desasignar
- [ ] País usa `location_country` del schema existente
- [ ] Emails usan `email` + `email_aliases` del schema existente
- [ ] Sección de integraciones es colapsable

### Integración con People

- [ ] CTAs solo visibles para `efeonce_admin`
- [ ] Si APIs no existen (ej: en otra branch), los CTAs se ocultan gracefully
- [ ] Tras cada mutación exitosa, la vista de People se revalida

### Seguridad

- [ ] Solo `efeonce_admin` accede a `/api/admin/team/*`
- [ ] Mutaciones registran en `audit_events` si la tabla existe

---

## Lo que NO incluye

- **Vista de lista y ficha** → ya implementado en People v2
- **Compensación y nómina** → HR Payroll Module
- **Tablas BigQuery** → ya existen, solo se escriben datos
- **Tipos base de team** → ya existen en `src/types/team.ts`, solo se extienden
- **Componentes de lectura** (TeamAvatar, badges, etc.) → ya existen
- Sync automático Azure AD / HubSpot
- Upload de foto de avatar

---

## Notas para el agente

- **Este task es solo escritura.** No crees páginas ni vistas de lista. People v2 ya existe.
- **Extiende `src/types/team.ts`**, no crees `team-admin.ts`.
- **Los drawers viven en `views/greenhouse/people/drawers/`**, junto con People, no en un módulo separado.
- **Reutiliza el patrón de `CompensationDrawer.tsx`** que ya existe en el repo como referencia de drawer.
- **BigQuery mutations no son atómicas.** El helper `mutate-team.ts` debe manejar errores y ser idempotente.
- **No generes `identity_profile_id`.** Ese campo lo maneja el sistema de identidad del repo. Solo escribe los campos explícitos del input.
- **Verifica los `roleCategory` válidos** en `src/types/team.ts` antes de hardcodear opciones en el drawer.
- **Branch naming:** `feature/admin-team-crud`.

---

## Datos del equipo actual (referencia)

```
Julio Reyes | jreyes@efeoncepro.com | julio.reyes@efeonce.org | CL
Valentina Hoyos | vhoyos@efeoncepro.com | valentina.hoyos@efeonce.org | CL
Daniela Ferreira | dferreira@efeoncepro.com | daniela.ferreira@efeonce.org | CL
Humberly Henriquez | hhumberly@efeoncepro.com | humberly.henriquez@efeonce.org | CL
Melkin Hernandez | mhernandez@efeoncepro.com | melkin.hernandez@efeonce.org | CL
Andrés Carlosama | acarlosama@efeoncepro.com | andres.carlosama@efeonce.org | CL
Luis Eduardo Reyes | lreyes@efeoncepro.com | luis.reyes@efeonce.org | VE
```

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo.*
