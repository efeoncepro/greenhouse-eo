# CODEX TASK — AI Tooling & Credit System: Gestión de Herramientas, Licencias y Créditos de IA

> Brief histórico de descubrimiento. La task operativa vigente es `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md`.

## Resumen

Implementar el **sistema completo de gestión de herramientas tecnológicas, licencias de IA y créditos de producción** en el portal Greenhouse. Cubre tres necesidades:

1. **Catálogo y asignación de herramientas** — qué herramientas y modelos de IA tiene Efeonce, quién tiene licencia de cada una
2. **Wallets de créditos** — cuántos créditos de IA tiene cada cliente asignados para producir sus campañas y assets
3. **Tracking financiero** — cuánto cuesta cada consumo de créditos, cómo se conecta con el módulo financiero

**El problema hoy:** Las herramientas de IA (Kling, FLUX, Higgsfield, Firefly, Claude, ChatGPT, Freepik AI, etc.) se pagan como suscripciones o por uso, pero no hay registro de quién tiene qué licencia, cuántos créditos consume cada cliente, ni cómo se imputa el costo. El equipo usa herramientas ad hoc y los créditos se agotan sin visibilidad. El cliente no sabe cuánta capacidad de IA tiene disponible para sus campañas.

**La solución:** Un módulo transversal con 6 capas:

- **Registro de proveedores** (`providers`) — objeto canónico de vendor/plataforma reutilizable entre AI Tooling, Finance e Identity
- **Catálogo de herramientas** (`ai_tool_catalog`) — registro maestro de toda herramienta, modelo de IA y suite
- **Licencias por miembro** (`member_tool_licenses`) — quién tiene asignado qué, con qué estado
- **Wallets de créditos** (`ai_credit_wallets`) — bolsillos de créditos asignados por cliente o pool compartido
- **Ledger de créditos** (`ai_credit_ledger`) — log inmutable de cada consumo y recarga
- **Superficies** — tres vistas: cliente (Greenhouse dashboard), operador (`/people`), finanzas (`/finance`)

**Conexión con módulos existentes:**

| Módulo | Relación |
|--------|----------|
| People (`/people/[memberId]`) | Tab "Herramientas" con licencias asignadas a la persona |
| Financial (`/finance/expenses`) | Suscripciones como egresos tipo `supplier`; consumo de créditos como egreso tipo `ai_usage` |
| Team Identity (`team_members`) | FK directa — cada licencia y consumo se vincula a un `member_id` |
| Client Team Assignments | Los wallets por cliente usan `client_id` del mismo modelo |
| Greenhouse Dashboard (cliente) | Widget de créditos disponibles + historial de consumo |
| ICO / Notion ops | Cada consumo puede vincularse a una tarea o proyecto de Notion |

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/ai-tooling-credits`
- **Framework:** Next.js 16+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI 7.x
- **React:** 19.x
- **TypeScript:** 5.9+
- **Deploy:** Vercel
- **GCP Project:** `efeonce-group`
- **GCP Region:** `us-central1`
- **BigQuery dataset:** `greenhouse`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `AGENTS.md` (en el repo) | Reglas operativas del repo |
| `GREENHOUSE_IDENTITY_ACCESS_V1.md` (en el repo) | Modelo de roles, route groups, guards |
| `project_context.md` (en el repo) | Schema real de BigQuery, estrategia de identidad |
| `authorization.ts` (en el repo) | Sistema de autorización actual |
| `team-queries.ts` (en el repo) | Queries existentes de equipo — reutilizar patrones |
| `src/types/team.ts` (en el repo) | Tipos existentes — extender |
| `Greenhouse_Nomenclatura_Portal_v3.md` (proyecto Claude) | Design tokens, colores, tipografía |
| `CODEX_TASK_People_Unified_View.md` (proyecto Claude) | Vista que consume el tab de herramientas |
| `CODEX_TASK_Financial_Module.md` (proyecto Claude) | Módulo financiero — integración de costos |
| `CODEX_TASK_Admin_Team_Module_v2.md` (proyecto Claude) | CRUD de equipo — patrón de drawers |
| `Efeonce_Greenhouse_Bienvenida_Cliente.docx` (proyecto Claude) | Tabla de herramientas y capas de IA del cliente |
| `ICO_Intelligent_Creative_Operations_v1.docx` (proyecto Claude) | Pilares ICO, tools por pilar |

---

## Alineación obligatoria con Greenhouse 360 Object Model

Esta task debe ejecutarse alineada con:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

1. **No crear una identidad paralela de cliente**
   - los wallets y ledgers por cliente deben anclarse a `greenhouse.clients.client_id`
   - `client_id` debe ser el mismo tenant/space del runtime de auth
   - no se acepta una entidad nueva de cliente solo para créditos o tooling

2. **No crear una identidad paralela de colaborador**
   - las licencias por persona y consumos atribuibles a persona deben anclarse a `greenhouse.team_members.member_id`
   - `client_users.user_id` puede servir como actor o principal de acceso, pero no reemplaza al objeto `Collaborator`

3. **Distinguir entre Provider, catálogo de herramientas y objeto producto/capability**
   - `Provider` debe modelarse como objeto canónico reusable (`greenhouse.providers.provider_id`) cuando la relación vaya a ser compartida por AI Tooling, Finance, Identity o Admin
   - `ai_tool_catalog` debe guardar `provider_id`
   - `vendor` puede existir como snapshot o display label, pero no como relación primaria
   - `fin_suppliers` debe tratarse como extensión financiera del `Provider`, no como identidad global del vendor

4. **Distinguir entre catálogo de herramientas y objeto producto/capability**
   - `ai_tool_catalog` puede existir como catálogo propio del dominio AI Tooling
   - pero no debe reemplazar el catálogo canónico `Product/Capability` de Greenhouse
   - si una herramienta se relaciona con un producto/capability del cliente, esa relación debe modelarse explícitamente, no inferirse mediante una identidad paralela

5. **El ledger y los wallets son tablas de dominio, no maestros de negocio**
   - pueden registrar consumo, costo, recargas, reservas e idempotencia
   - no deben convertirse en la nueva fuente de verdad del cliente o del colaborador

6. **Las vistas cliente y People deben ser read models enriquecidos**
   - cliente: wallet + consumo + capability context sobre el objeto `Client`
   - people: licencias + actividad de uso sobre el objeto `Collaborator`
   - evitar surfaces aisladas que no puedan recomponerse con el resto de la plataforma

7. **Integración financiera**
   - cuando exista, debe tratar `ai_usage` o costos equivalentes como extensión financiera ligada a objetos canónicos, no como un sistema de costos desconectado

---

## Dependencias previas

### DEBE existir

- [ ] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [ ] Guard server-side para rutas protegidas
- [ ] Tabla `greenhouse.team_members` creada y con seed data
- [ ] Tabla `greenhouse.client_team_assignments` creada
- [ ] Pipeline `notion-bigquery` operativo con `notion_ops.tareas`
- [ ] Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con permisos BigQuery Data Editor + Job User

### Deseable pero no bloqueante

- [ ] People Unified View implementado (si no existe, el tab de herramientas se implementa standalone)
- [ ] Financial Module implementado (si no existe, los costos se calculan pero no se escriben en `fin_expenses`)
- [ ] Agency Operator Layer implementado (la sección de admin de herramientas se agrega como vista independiente)

---

## Ajustes de implementación al runtime actual del repo

Antes de implementar, alinear esta task con las reglas y contratos ya vigentes en Greenhouse:

1. **Infraestructura on-demand, no solo SQL manual**
   - Seguir el patrón de `src/lib/payroll/schema.ts` y `src/lib/finance/schema.ts`.
   - Crear `ensureAiToolingInfrastructure()` para provisionar tablas y seed data al primer request autorizado.
   - El script `scripts/setup-ai-tooling-tables.sql` sigue existiendo como referencia versionada, pero no debe ser la única vía de bootstrap.

2. **Monetarios con `NUMERIC`, no `FLOAT64`**
   - Todos los campos de costo y tipo de cambio deben usar `NUMERIC` para evitar errores de redondeo.
   - Esta regla aplica a catálogo, ledger y cualquier integración posterior con finanzas.

3. **Roles y guards usando helpers reales**
   - Cliente: `requireClientTenantContext()`
   - People / operadores: `requirePeopleTenantContext()`
   - Admin: `requireAdminTenantContext()`
   - No recalcular permisos desde el frontend si el backend ya entrega el contrato filtrado.

4. **`client_id` debe mapear al tenant real**
   - El `client_id` de wallets y ledger debe usar el mismo identificador de tenant/space ya visible en auth y dashboard.
   - No introducir una entidad paralela de clientes solo para este módulo.

5. **`monthly_consumed` es cache derivable**
   - El source of truth mensual es el ledger.
   - `monthly_consumed` en `ai_credit_wallets` se mantiene solo como cache/denormalización y debe poder recalcularse on-the-fly.

6. **El endpoint `consume` debe ser idempotente**
   - La API debe aceptar un `requestId` o clave equivalente para evitar doble débito por reintentos.
   - El ledger debe guardar esa referencia para trazabilidad operativa.

7. **Integración con People y Dashboard sin duplicar patrones**
   - En People, esto extiende el sistema actual de tabs (`/people/[memberId]`) y su contrato `access.visibleTabs`.
   - En dashboard cliente, el widget de créditos debe integrarse como bloque nuevo dentro del orquestador actual y no como surface aislada.

8. **Integración financiera como fase posterior**
   - Mientras `Financial Module` no soporte formalmente costos IA, la consolidación debe quedar desacoplada y opcional.
   - No bloquear el MVP del sistema de créditos por la capa financiera.

9. **Relación proveedor-herramienta explícita**
   - introducir `greenhouse.providers` como registro canónico reusable
   - `ai_tool_catalog` debe guardar `provider_id`
   - `vendor` queda permitido solo como snapshot/display para UI, export o resiliencia histórica
   - futuras integraciones con `identity_profile_source_links` o `fin_suppliers` deben mapearse a `provider_id`, no duplicar vendors libres

---

## Modelo de acceso

### Tres audiencias, tres niveles de visibilidad

| Audiencia | Ve | No ve |
|-----------|-----|--------|
| **Cliente** (`role: 'client'`) | Sus wallets, su balance de créditos, historial de consumo de su cuenta | Costos monetarios, wallets de otros clientes, pools internos, licencias del equipo |
| **Operador** (`roleCodes.includes('efeonce_operations')`) | Herramientas asignadas por persona, wallets de todos los clientes, consumo por proyecto | Costos monetarios de las herramientas |
| **Admin** (`efeonce_admin`) | Todo incluyendo costos, CRUD de catálogo, gestión de wallets, reportes financieros | — |

### Patrón de protección

Las APIs de lectura de créditos de cliente viven en el espacio de APIs existente del dashboard y se filtran con el tenant real de la sesión (`requireClientTenantContext()`). Las APIs de people/operación viven bajo `/api/ai-tools/*` y `/api/ai-credits/*` usando `requirePeopleTenantContext()`. Las APIs de admin viven bajo `/api/admin/ai-tools/*` con `requireAdminTenantContext()`.

---

## PARTE A: Infraestructura BigQuery

> **Decisión de precisión monetaria:** usar `NUMERIC` en todos los montos y tipos de cambio. Este módulo no debe introducir `FLOAT64` para costos si luego se va a reconciliar o consolidar contra finanzas.
>
> **Decisión de bootstrap:** además del SQL versionado, implementar un `ensureAiToolingInfrastructure()` que cree tablas y seed data mínimos al primer request autorizado, siguiendo el patrón ya usado por Payroll y Finance.

### A0. Tabla `greenhouse.providers`

Registro canónico de vendors/plataformas reutilizable entre AI Tooling, Finance, Identity y futuras integraciones.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.providers` (
  provider_id STRING NOT NULL,                     -- PK slug: 'anthropic', 'openai', 'adobe', 'freepik', 'hubspot'
  provider_name STRING NOT NULL,                   -- Nombre display
  provider_category STRING NOT NULL,               -- 'ai_vendor' | 'software_suite' | 'identity_provider' | 'delivery_platform' | 'financial_vendor'
  provider_kind STRING DEFAULT 'organization',     -- 'organization' | 'platform' | 'marketplace'
  website_url STRING,
  support_url STRING,
  icon_url STRING,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

Regla:
- `provider_id` es la relación reusable.
- Cualquier `vendor`, `provider_code` o account reference en otras tablas es secundario y no reemplaza este objeto.

### A1. Tabla `greenhouse.ai_tool_catalog`

Catálogo maestro de herramientas, modelos de IA y suites. Fuente de verdad de qué existe y cómo se cobra.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_tool_catalog` (
  -- Identificación
  tool_id STRING NOT NULL,                         -- PK slug: 'kling-v2', 'adobe-cc', 'claude-opus'
  tool_name STRING NOT NULL,                       -- Nombre display: 'Kling v2', 'Adobe Creative Cloud'
  provider_id STRING NOT NULL,                     -- FK lógica → greenhouse.providers.provider_id
  vendor STRING,                                   -- Snapshot/display label del provider para UI e históricos
  
  -- Categorización
  tool_category STRING NOT NULL,                   -- 'gen_visual' | 'gen_text' | 'gen_audio' | 'gen_video' |
                                                   -- 'ai_suite' | 'creative_production' | 'collaboration' |
                                                   -- 'analytics' | 'crm' | 'infrastructure'
  tool_subcategory STRING,                         -- Libre: 'image generation', 'video generation', 'LLM',
                                                   -- 'design suite', 'project management', etc.
  
  -- Modelo de costo
  cost_model STRING NOT NULL,                      -- 'subscription' | 'per_credit' | 'hybrid' | 'free_tier' | 'included'
                                                   -- subscription = fee mensual fijo (Adobe CC, Notion)
                                                   -- per_credit = pago por uso (Kling renders, Claude tokens)
                                                   -- hybrid = suscripción + créditos adicionales (Freepik AI)
                                                   -- free_tier = sin costo (herramientas open source)
                                                   -- included = incluido en otra suscripción (Firefly en Adobe CC)
  
  -- Pricing de suscripción (cuando cost_model = 'subscription' o 'hybrid')
  subscription_amount NUMERIC,                     -- Monto mensual de suscripción
  subscription_currency STRING DEFAULT 'USD',      -- 'USD' | 'CLP'
  subscription_billing_cycle STRING DEFAULT 'monthly', -- 'monthly' | 'annual'
  subscription_seats INT64,                        -- Número de licencias incluidas en la suscripción (null = unlimited)
  
  -- Pricing de créditos (cuando cost_model = 'per_credit' o 'hybrid')
  credit_unit_name STRING,                         -- Nombre de la unidad: 'render', 'generation', 'token_batch',
                                                   -- 'export', 'minute', 'image', 'request'
  credit_unit_cost NUMERIC,                        -- Costo por unidad de crédito en la moneda indicada
  credit_unit_currency STRING DEFAULT 'USD',       -- 'USD' | 'CLP'
  credits_included_monthly INT64,                  -- Créditos incluidos en la suscripción (para hybrid)
  
  -- Vinculación con módulo financiero
  fin_supplier_id STRING,                          -- FK → greenhouse.fin_suppliers como extensión financiera del provider (nullable hasta que exista)
  
  -- Metadata
  description STRING,                              -- Descripción breve de qué hace la herramienta
  website_url STRING,                              -- URL del proveedor
  icon_url STRING,                                 -- URL del ícono/logo para UI
  is_active BOOL DEFAULT TRUE,
  sort_order INT64 DEFAULT 0,                      -- Orden de visualización dentro de su categoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A2. Tabla `greenhouse.member_tool_licenses`

Asignación many-to-many de herramientas a miembros del equipo.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.member_tool_licenses` (
  -- Identificación
  license_id STRING NOT NULL,                      -- PK: '{member_id}_{tool_id}' ej: 'daniela-ferreira_adobe-cc'
  member_id STRING NOT NULL,                       -- FK → greenhouse.team_members
  tool_id STRING NOT NULL,                         -- FK → greenhouse.ai_tool_catalog
  
  -- Estado de la licencia
  license_status STRING NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'suspended' | 'expired' | 'revoked'
  activated_at DATE,                               -- Fecha de activación
  expires_at DATE,                                 -- Fecha de vencimiento (null = sin vencimiento)
  
  -- Detalles de acceso
  access_level STRING DEFAULT 'full',              -- 'full' | 'limited' | 'trial' | 'viewer'
  license_key STRING,                              -- Clave o referencia de licencia (no sensitive — es referencia interna)
  account_email STRING,                            -- Email de la cuenta (puede diferir del email corporativo)
  notes STRING,                                    -- Notas sobre condiciones especiales
  
  -- Metadata
  assigned_by STRING,                              -- member_id de quien asignó
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A3. Tabla `greenhouse.ai_credit_wallets`

Wallets de créditos. Cada wallet es un "bolsillo" con balance que se puede asignar a un cliente específico o como pool compartido.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_credit_wallets` (
  -- Identificación
  wallet_id STRING NOT NULL,                       -- PK: '{scope}_{owner_id}_{tool_id}' 
                                                   -- ej: 'client_sky-airline_kling-v2'
                                                   -- ej: 'pool_internal_claude-opus'
  wallet_name STRING NOT NULL,                     -- Nombre display: 'Sky Airline — Kling renders'
  
  -- Scope: a quién pertenece este wallet
  wallet_scope STRING NOT NULL,                    -- 'client' | 'pool'
                                                   -- client = asignado a un cliente específico
                                                   -- pool = compartido (interno Efeonce o cross-client)
  client_id STRING,                                -- FK → greenhouse.clients / tenants (solo si scope = 'client')
  client_name STRING,                              -- Snapshot del nombre del cliente
  
  -- Herramienta vinculada
  tool_id STRING NOT NULL,                         -- FK → greenhouse.ai_tool_catalog
  tool_name STRING NOT NULL,                       -- Snapshot: 'Kling v2'
  credit_unit_name STRING NOT NULL,                -- Snapshot: 'render' (copiado del catálogo al crear)
  
  -- Balance
  initial_balance INT64 NOT NULL DEFAULT 0,        -- Créditos cargados inicialmente
  current_balance INT64 NOT NULL DEFAULT 0,        -- Balance actual (decrementado por consumo, incrementado por recarga)
  reserved_balance INT64 NOT NULL DEFAULT 0,       -- Créditos reservados (en proceso, no disponibles pero no consumidos)
  
  -- Límites
  monthly_limit INT64,                             -- Límite mensual de consumo (null = sin límite, solo balance)
  monthly_consumed INT64 DEFAULT 0,                -- Cache del consumo del mes actual (recalculable desde ledger)
  monthly_reset_day INT64 DEFAULT 1,               -- Día del mes en que se resetea monthly_consumed (1-28)
  
  -- Alertas
  low_balance_threshold INT64,                     -- Umbral para alerta de balance bajo (null = sin alerta)
  alert_sent BOOL DEFAULT FALSE,                   -- Flag para evitar alertas duplicadas
  
  -- Vigencia
  valid_from DATE NOT NULL,                        -- Inicio de vigencia del wallet
  valid_until DATE,                                -- Fin de vigencia (null = sin vencimiento)
  
  -- Estado
  wallet_status STRING NOT NULL DEFAULT 'active',  -- 'active' | 'depleted' | 'expired' | 'suspended'
  
  -- Metadata
  created_by STRING,
  notes STRING,                                    -- Notas: "Incluido en contrato Q1 2026", etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### A4. Tabla `greenhouse.ai_credit_ledger`

Log inmutable (append-only) de cada movimiento de créditos. El balance del wallet siempre se puede recalcular desde este ledger.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.ai_credit_ledger` (
  -- Identificación
  ledger_id STRING NOT NULL,                       -- PK: UUID o '{wallet_id}_{seq}'
  wallet_id STRING NOT NULL,                       -- FK → greenhouse.ai_credit_wallets
  request_id STRING,                               -- Clave idempotente del request de consumo/recarga
  
  -- Tipo de movimiento
  entry_type STRING NOT NULL,                      -- 'debit' | 'credit' | 'reserve' | 'release' | 'adjustment'
                                                   -- debit = consumo real de créditos
                                                   -- credit = recarga, asignación inicial, o rollover
                                                   -- reserve = reservar créditos para un job en proceso
                                                   -- release = liberar reserva (job cancelado)
                                                   -- adjustment = corrección manual (admin)
  
  -- Cantidad
  credit_amount INT64 NOT NULL,                    -- Cantidad de créditos (positivo siempre, el tipo define dirección)
  balance_before INT64 NOT NULL,                   -- Balance del wallet ANTES de este movimiento
  balance_after INT64 NOT NULL,                    -- Balance del wallet DESPUÉS de este movimiento
  
  -- Contexto de consumo (para debits)
  consumed_by_member_id STRING,                    -- FK → team_members: quién consumió
  consumed_by_name STRING,                         -- Snapshot del nombre
  client_id STRING,                                -- Cliente para el que se consumió (puede diferir del wallet owner en pools)
  client_name STRING,                              -- Snapshot
  
  -- Vinculación operativa (para debits — conecta con Notion/ICO)
  notion_task_id STRING,                           -- ID de la tarea de Notion asociada (nullable)
  notion_project_id STRING,                        -- ID del proyecto de Notion asociado (nullable)
  project_name STRING,                             -- Snapshot del nombre del proyecto
  asset_description STRING,                        -- Descripción libre: "Video hero Sky campaña verano"
  
  -- Costo financiero (para debits — conecta con módulo financiero)
  unit_cost NUMERIC,                               -- Costo por unidad de crédito al momento del consumo
  cost_currency STRING DEFAULT 'USD',              -- Moneda del costo
  total_cost NUMERIC,                              -- credit_amount × unit_cost
  total_cost_clp NUMERIC,                          -- Convertido a CLP (moneda base de Efeonce)
  exchange_rate_to_clp NUMERIC DEFAULT 1.0,        -- Tipo de cambio usado
  
  -- Vinculación financiera
  fin_expense_id STRING,                           -- FK → fin_expenses (se genera al consolidar mensualmente)
  
  -- Contexto de recarga (para credits)
  reload_reason STRING,                            -- 'initial_allocation' | 'monthly_renewal' | 'purchase' | 
                                                   -- 'bonus' | 'rollover' | 'manual_adjustment'
  reload_reference STRING,                         -- Referencia: número de factura, ID de orden, etc.
  
  -- Metadata
  notes STRING,                                    -- Notas libres del operador
  created_by STRING,                               -- member_id de quien registró el movimiento
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
  -- NO hay updated_at: el ledger es inmutable. Correcciones se hacen con entry_type = 'adjustment'
);
```

### A5. Insertar datos iniciales del catálogo (seed data)

```sql
-- Seedear primero `greenhouse.providers` con los `provider_id` usados abajo.

-- === Generación visual ===
INSERT INTO `efeonce-group.greenhouse.ai_tool_catalog`
  (tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory, cost_model, 
   credit_unit_name, credit_unit_cost, credit_unit_currency, description, sort_order)
VALUES
  ('kling-v2', 'Kling v2', 'kuaishou', 'Kuaishou', 'gen_video', 'AI video generation', 'per_credit',
   'render', 0.35, 'USD', 'Generación de video cinematográfico con IA', 1),
  ('sora-2', 'Sora 2', 'openai', 'OpenAI', 'gen_video', 'AI video generation', 'hybrid',
   'generation', 0.50, 'USD', 'Generación de video fotorrealista', 2),
  ('veo-3', 'Veo 3.1', 'google-deepmind', 'Google DeepMind', 'gen_video', 'AI video generation', 'per_credit',
   'generation', 0.40, 'USD', 'Generación de video con control avanzado', 3),
  ('higgsfield', 'Higgsfield', 'higgsfield-ai', 'Higgsfield AI', 'gen_video', 'AI video generation', 'per_credit',
   'render', 0.30, 'USD', 'Video multi-modelo con control cinematográfico', 4),
  ('flux-pro', 'FLUX Pro', 'black-forest-labs', 'Black Forest Labs', 'gen_visual', 'AI image generation', 'per_credit',
   'generation', 0.04, 'USD', 'Generación de imágenes de alta calidad', 5),
  ('firefly', 'Adobe Firefly', 'adobe', 'Adobe', 'gen_visual', 'AI image generation', 'included',
   'generation', 0.00, 'USD', 'Generación de imágenes integrada en Adobe CC', 6);

-- === Generación texto/código ===
INSERT INTO `efeonce-group.greenhouse.ai_tool_catalog`
  (tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory, cost_model,
   credit_unit_name, credit_unit_cost, credit_unit_currency, description, sort_order)
VALUES
  ('claude-opus', 'Claude Opus 4.6', 'anthropic', 'Anthropic', 'gen_text', 'LLM', 'per_credit',
   'token_batch', 0.015, 'USD', 'Modelo más avanzado de Anthropic para análisis e inteligencia', 1),
  ('claude-sonnet', 'Claude Sonnet 4.6', 'anthropic', 'Anthropic', 'gen_text', 'LLM', 'per_credit',
   'token_batch', 0.003, 'USD', 'Modelo de Anthropic para tareas operativas y código', 2),
  ('chatgpt-4o', 'ChatGPT 4o', 'openai', 'OpenAI', 'gen_text', 'LLM', 'hybrid',
   'request', 0.005, 'USD', 'LLM multimodal de OpenAI', 3),
  ('gemini-pro', 'Gemini 2.5 Pro', 'google', 'Google', 'gen_text', 'LLM', 'per_credit',
   'request', 0.007, 'USD', 'LLM de Google para análisis y generación', 4);

-- === Suites y herramientas de producción ===
INSERT INTO `efeonce-group.greenhouse.ai_tool_catalog`
  (tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory, cost_model,
   subscription_amount, subscription_currency, subscription_billing_cycle, subscription_seats,
   credits_included_monthly, credit_unit_name, credit_unit_cost, credit_unit_currency, description, sort_order)
VALUES
  ('adobe-cc', 'Adobe Creative Cloud', 'adobe', 'Adobe', 'creative_production', 'Design suite', 'subscription',
   89.99, 'USD', 'monthly', 1, NULL, NULL, NULL, NULL, 'Suite completa: Photoshop, Premiere, After Effects, Illustrator, etc.', 1),
  ('adobe-express', 'Adobe Express', 'adobe', 'Adobe', 'creative_production', 'Design automation', 'subscription',
   12.99, 'USD', 'monthly', 1, NULL, NULL, NULL, NULL, 'Herramienta de diseño rápido con IA integrada', 2),
  ('freepik-ai', 'Freepik AI Suite', 'freepik', 'Freepik', 'ai_suite', 'Stock + AI generation', 'hybrid',
   14.99, 'USD', 'monthly', 1, 100, 'generation', NULL, NULL, 'Stock de imágenes + generación con IA', 3),
  ('envato-ai', 'Envato AI Suite', 'envato', 'Envato', 'ai_suite', 'Stock + AI generation', 'hybrid',
   16.50, 'USD', 'monthly', 1, 50, 'generation', NULL, NULL, 'Stock de assets + herramientas generativas', 4),
  ('shutterstock-ai', 'Shutterstock AI', 'shutterstock', 'Shutterstock', 'ai_suite', 'Stock + AI generation', 'hybrid',
   29.00, 'USD', 'monthly', 1, 25, 'generation', NULL, NULL, 'Stock de imágenes + generador IA', 5),
  ('nano-banana', 'Nano Banana', 'nano-banana', 'Nano Banana', 'gen_visual', 'AI image generation', 'per_credit',
   NULL, NULL, NULL, NULL, NULL, 'render', 0.08, 'USD', 'Generación especializada de imágenes con estilos artísticos', 6);

-- Nota: subscription_amount y credit_unit_cost son valores de referencia.
-- Actualizar con los costos reales al momento de implementar.

-- === Colaboración y operación ===
INSERT INTO `efeonce-group.greenhouse.ai_tool_catalog`
  (tool_id, tool_name, provider_id, vendor, tool_category, tool_subcategory, cost_model,
   subscription_amount, subscription_currency, subscription_billing_cycle, description, sort_order)
VALUES
  ('notion', 'Notion', 'notion-labs', 'Notion Labs', 'collaboration', 'Project management', 'subscription',
   10.00, 'USD', 'monthly', 'Hub central de operaciones: proyectos, tareas, sprints, wiki', 1),
  ('teams', 'Microsoft Teams', 'microsoft', 'Microsoft', 'collaboration', 'Communication', 'subscription',
   12.50, 'USD', 'monthly', 'Comunicación directa con clientes y equipo', 2),
  ('frameio', 'Frame.io V4', 'adobe', 'Adobe', 'collaboration', 'Visual review', 'subscription',
   15.00, 'USD', 'monthly', 'Motor de revisión visual con feedback por frame', 3),
  ('sharepoint', 'SharePoint', 'microsoft', 'Microsoft', 'collaboration', 'File storage', 'included',
   0.00, 'USD', 'monthly', 'Repositorio de assets (incluido en Microsoft 365)', 4),
  ('hubspot', 'HubSpot CRM', 'hubspot', 'HubSpot', 'crm', 'CRM platform', 'subscription',
   90.00, 'USD', 'monthly', 'CRM: Sales Hub Pro + Service Hub Pro', 5);
```

### A6. Script SQL de referencia

Guardar en `scripts/setup-ai-tooling-tables.sql` en el repo con todos los DDLs de A0-A4 y los INSERTs de A5.

---

## PARTE B: API Routes

### B1. `GET /api/ai-tools/catalog`

Lista de herramientas del catálogo. Pública para operadores y admin. Clientes no la ven directamente (la consumen vía el widget de créditos).

**Query params:**
- `category` — filtro por `tool_category`
- `costModel` — filtro por `cost_model`
- `active` — `true` | `false` (default: `true`)

**Response:** Array de herramientas ordenadas por `tool_category` → `sort_order`.

**Auth:** `efeonce_operations` o `efeonce_admin`.

### B2. `GET /api/ai-tools/licenses`

Licencias asignadas. Dos modos:

- Sin `memberId`: lista todas las licencias activas (operador/admin)
- Con `?memberId=daniela-ferreira`: licencias de una persona específica

**Response:** Array de licencias con JOIN a `ai_tool_catalog` para nombre, categoría e ícono.

**Auth:** `efeonce_operations` o `efeonce_admin`.

### B3. `GET /api/ai-credits/wallets`

Wallets de créditos. Filtrado automático según rol:

- **Cliente:** solo wallets donde `client_id` = su tenant. No ve `unit_cost`, `total_cost`, ni costos.
- **Operador:** todos los wallets con balances. No ve costos monetarios.
- **Admin:** todo incluyendo costos.

**Query params:**
- `clientId` — filtro por cliente (admin/operador)
- `toolId` — filtro por herramienta
- `status` — `active` | `depleted` | `expired`
- `scope` — `client` | `pool`

**Response:** Array de wallets con campos de balance, % de uso mensual, y semáforo.

**Semáforo de balance:**
- Verde: `current_balance > 50%` del `initial_balance`
- Amarillo: `current_balance` entre 20% y 50%
- Rojo: `current_balance < 20%` o `current_balance ≤ low_balance_threshold`
- Gris: wallet con `monthly_limit` sin balance fijo (consumo ilimitado con tope mensual)

### B4. `GET /api/ai-credits/ledger`

Historial de movimientos. Mismo filtrado por rol que wallets.

**Query params:**
- `walletId` — requerido
- `entryType` — `debit` | `credit` | `all` (default: `all`)
- `dateFrom`, `dateTo` — rango de fechas
- `memberId` — filtro por consumidor
- `limit`, `offset` — paginación (default: 50, max: 200)

**Response:** Array de entries ordenadas por `created_at DESC`, con totales agregados en el header.

**Auth:** 
- Cliente: solo entries de wallets de su tenant, sin campos de costo
- Operador: todas las entries sin campos de costo
- Admin: todo

### B5. `POST /api/ai-credits/consume`

Registrar consumo de créditos. Es la API que el equipo (o un futuro agente) invoca cuando se usa una herramienta de IA para producir un asset.

**Request body:**

```typescript
interface ConsumeCreditsInput {
  requestId: string                   // Requerido para idempotencia y retry-safe writes
  walletId: string                    // Wallet del que se debita
  creditAmount: number                // Cantidad de créditos a consumir (entero positivo)
  consumedByMemberId: string          // Quién consumió
  // Contexto operativo (al menos uno requerido)
  notionTaskId?: string               // Tarea de Notion vinculada
  notionProjectId?: string            // Proyecto de Notion vinculado
  projectName?: string                // Nombre del proyecto (snapshot o libre)
  assetDescription: string            // Descripción del asset: "Video hero Sky campaña verano"
  // Contexto de cliente (auto-inferido del wallet si es scope=client)
  clientId?: string                   // Override del client_id del wallet (para pools compartidos)
  notes?: string
}
```

**Lógica:**
1. Validar que el wallet existe, está activo, y no ha expirado
2. Validar que `current_balance - reserved_balance ≥ creditAmount`
3. Recalcular `monthly_consumed` efectivo desde ledger para el ciclo vigente y validar `monthly_consumed + creditAmount ≤ monthly_limit` si aplica
4. Calcular costo: `creditAmount × credit_unit_cost` del catálogo
5. Convertir a CLP usando tipo de cambio vigente (tabla `fin_exchange_rates` si existe, o rate hardcoded)
6. Verificar idempotencia por `requestId`; si ya existe una entry compatible, retornar la existente
7. INSERT en `ai_credit_ledger` con `entry_type = 'debit'`
8. UPDATE wallet: `current_balance -= creditAmount`, `monthly_consumed += creditAmount` (cache), con estado derivado
8. Si `current_balance ≤ low_balance_threshold` y `alert_sent = FALSE`, marcar `alert_sent = TRUE` (la notificación es tarea separada)
9. Si `current_balance = 0`, marcar wallet como `depleted`
10. Retornar el entry creado + balance actualizado

**Auth:** `efeonce_operations` o `efeonce_admin`.

### B6. `POST /api/ai-credits/reload`

Recargar créditos en un wallet. Solo admin.

**Request body:**

```typescript
interface ReloadCreditsInput {
  requestId?: string                  // Opcional pero recomendado para evitar doble recarga por reintento
  walletId: string
  creditAmount: number                // Créditos a agregar
  reloadReason: 'monthly_renewal' | 'purchase' | 'bonus' | 'rollover' | 'manual_adjustment'
  reloadReference?: string            // Número de factura, orden, etc.
  notes?: string
}
```

**Lógica:**
1. Validar wallet existe
2. INSERT en ledger con `entry_type = 'credit'`
3. UPDATE wallet: `current_balance += creditAmount`
4. Si wallet estaba `depleted`, cambiar a `active`
5. Resetear `alert_sent = FALSE`
6. Retornar entry + balance actualizado

**Auth:** `efeonce_admin`.

### B7. `GET /api/ai-credits/summary`

Resumen agregado para dashboards. Respuesta adaptada al rol.

**Query params:**
- `clientId` — para dashboard de cliente o filtro de admin
- `period` — `current_month` | `last_month` | `last_3_months` | `ytd` (default: `current_month`)

**Response para cliente:**

```typescript
interface ClientCreditSummary {
  wallets: Array<{
    walletId: string
    toolName: string
    creditUnitName: string
    currentBalance: number
    initialBalance: number
    usagePercent: number            // 0-100
    monthlyConsumed: number
    monthlyLimit: number | null
    status: 'healthy' | 'warning' | 'critical' | 'depleted'
  }>
  totalCreditsAvailable: number     // Suma de current_balance de todos los wallets
  totalCreditsConsumed: number      // Suma de debits en el período
  topConsumingProjects: Array<{     // Top 5 proyectos por consumo
    projectName: string
    creditsConsumed: number
  }>
}
```

**Response adicional para admin** (extiende la de cliente):

```typescript
interface AdminCreditSummary extends ClientCreditSummary {
  totalCostUsd: number              // Costo total en USD del período
  totalCostClp: number              // Costo total en CLP
  costByTool: Array<{               // Desglose de costo por herramienta
    toolName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
  costByClient: Array<{             // Desglose de costo por cliente
    clientName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
}
```

**Auth:** Todos los roles (response filtrada).

---

## PARTE C: APIs de Admin (CRUD)

Todas bajo `/api/admin/ai-tools/`. Solo `efeonce_admin`.

### C1. `POST /api/admin/ai-tools/catalog`

Crear herramienta en el catálogo. Body: todos los campos de `ai_tool_catalog` excepto `created_at`/`updated_at`.

### C2. `PATCH /api/admin/ai-tools/catalog/[toolId]`

Editar herramienta. Body: campos a actualizar. `tool_id` no es editable.

### C3. `POST /api/admin/ai-tools/licenses`

Asignar licencia a un miembro.

```typescript
interface CreateLicenseInput {
  memberId: string
  toolId: string
  accessLevel?: string              // default: 'full'
  accountEmail?: string
  notes?: string
}
```

Lógica: generar `license_id` como `{memberId}_{toolId}`, validar que no exista una licencia activa duplicada.

### C4. `PATCH /api/admin/ai-tools/licenses/[licenseId]`

Editar licencia (cambiar estado, access level, notas).

### C5. `POST /api/admin/ai-tools/wallets`

Crear wallet de créditos.

```typescript
interface CreateWalletInput {
  walletScope: 'client' | 'pool'
  clientId?: string                 // Requerido si scope = 'client'
  toolId: string
  initialBalance: number
  monthlyLimit?: number
  monthlyResetDay?: number          // default: 1
  lowBalanceThreshold?: number
  validFrom: string                 // ISO date
  validUntil?: string               // ISO date
  notes?: string
}
```

Lógica: generar `wallet_id`, copiar snapshots de `tool_name`, `credit_unit_name`, `client_name`. Setear `current_balance = initial_balance`. Crear entry en ledger con `entry_type = 'credit'` y `reload_reason = 'initial_allocation'`.

### C6. `PATCH /api/admin/ai-tools/wallets/[walletId]`

Editar wallet (límites, umbrales, estado, vigencia). No permite editar `current_balance` directamente — eso se hace vía reload/adjustment.

---

## PARTE D: Vistas de UI

### D1. Tab "Herramientas" en `/people/[memberId]`

**Se integra en People Unified View como tab adicional.** Patrón: mismo que los tabs existentes (Asignaciones, Actividad, Compensación, Nómina).

**Ajuste al runtime actual:** extender `PersonTab`, `TAB_CONFIG`, `access.visibleTabs` y el payload de `PersonDetail` para que el backend siga siendo la fuente de verdad de permisos y contenido del tab.

**Contenido del tab:**

**Sección 1: Licencias activas**

Grid de cards (2 columnas en desktop, 1 en mobile). Cada card muestra:
- Ícono de la herramienta (de `icon_url` o placeholder por categoría)
- Nombre de la herramienta + vendor
- Badge de categoría con color por `tool_category`
- Badge de estado (active = verde, pending = amarillo, suspended = gris)
- Access level como texto secundario
- Fecha de activación y vencimiento (si aplica)

**Colores de categoría (usar GH_COLORS):**
- `gen_visual` / `gen_video` → purple
- `gen_text` → teal
- `ai_suite` → amber
- `creative_production` → coral
- `collaboration` → blue
- `crm` / `analytics` / `infrastructure` → gray

**Sección 2: Consumo de créditos** (solo si la persona tiene debits en el ledger)

Strip de 2 KPIs:
- Créditos consumidos este mes (por esta persona, across all wallets)
- Proyectos activos con consumo

Tabla compacta: últimos 10 consumos con columnas: Fecha, Herramienta, Créditos, Proyecto, Asset.

**CTA (solo admin):** Botón "Asignar herramienta" → abre drawer.

**Empty state:** "Sin herramientas asignadas. Asigna herramientas desde el panel de administración."

### D2. Widget de créditos en Greenhouse Dashboard (cliente)

**Se integra en el dashboard principal del cliente como una card/sección nueva.**

**Ajuste al runtime actual:** el dashboard ya tiene una capa declarativa de `technologyTools` y `aiTools`. El widget de créditos debe complementar o reemplazar la lectura declarativa actual de AI tooling, no duplicarla.

**Contenido:**

**Header:** "Tus créditos de producción" (o como quede en nomenclatura GH)

**Cards de wallets:** Una card por wallet activo del cliente. Cada card:
- Nombre de la herramienta + ícono
- Balance: `{current_balance}` / `{initial_balance}` `{credit_unit_name}s`
- Progress bar circular o lineal con color de semáforo
- Si hay `monthly_limit`: "Usados este mes: {monthly_consumed} / {monthly_limit}"
- Badge de estado

**Sección "Últimos consumos":** Timeline vertical con los últimos 5 debits:
- Fecha + hora relativa ("Hace 2 horas")
- Asset description
- Créditos consumidos
- Nombre del proyecto

**No muestra:** Costos monetarios, wallets de otros clientes, pools internos, nombres de miembros del equipo.

**Empty state:** "Tus créditos de producción aparecerán aquí cuando se activen. Habla con tu equipo de cuenta para saber más."

### D3. Vista de administración de herramientas y créditos

**Ruta:** `/admin/ai-tools` (dentro del route group admin existente).

**Sub-navegación con 3 tabs:**

**Tab 1: Catálogo**
- Tabla con todas las herramientas del catálogo
- Columnas: Nombre, Vendor, Categoría, Modelo de costo, Costo (sub/crédito), Seats, Status
- Filtros: por categoría, por modelo de costo
- CTA: "Agregar herramienta" → drawer con todos los campos de `ai_tool_catalog`
- Row action: editar, desactivar

**Tab 2: Wallets**
- Tabla con todos los wallets activos
- Columnas: Nombre, Cliente/Pool, Herramienta, Balance (bar), Consumo mensual, Status
- Filtros: por scope, por cliente, por herramienta, por status
- CTA: "Crear wallet" → drawer
- Row action: editar, recargar (abre drawer de recarga), ver ledger

**Tab 3: Consumo**
- Dashboard con:
  - KPI cards: Total créditos consumidos (mes), Costo total USD (mes), Costo total CLP (mes), Wallets en estado crítico
  - Chart: Consumo diario del mes actual (line chart, by tool)
  - Chart: Distribución de costo por cliente (pie/donut)
  - Tabla: Últimos 20 movimientos del ledger (filtrable por wallet, tipo, miembro, fecha)

**Auth:** `efeonce_admin` solamente.

### D4. Integración con Financial Module

**Cuando el Financial Module existe:**

1. **Suscripciones:** Cada herramienta con `cost_model = 'subscription'` o `'hybrid'` genera un egreso mensual automático en `fin_expenses` con `expense_type = 'supplier'` y `supplier_id` del catálogo. Esto se puede hacer con un job mensual o manual.

2. **Consumo de créditos:** Un job mensual (o botón "Consolidar costos del mes" en admin) recorre el ledger, agrupa los debits del mes por herramienta, y genera un egreso en `fin_expenses` con:
   - inicialmente `expense_type = 'supplier'` con metadata/subtipo `ai_usage` o campo equivalente, hasta que el módulo financiero soporte formalmente ese subtipo sin romper sus enums actuales
   - `description`: "Consumo créditos {tool_name} — {mes}"
   - `total_amount`: suma de `total_cost` del ledger para esa herramienta en el mes
   - `currency`: USD
   - `total_amount_clp`: suma de `total_cost_clp`
   - Referencia cruzada: `ledger_ids` de los entries consolidados

3. **Dashboard financiero:** Agrega una sección o filtro "Costos IA" que muestra el desglose por herramienta y por cliente.

**Cuando el Financial Module NO existe:** Los costos se calculan y muestran en `/admin/ai-tools` tab Consumo, pero no se escriben en `fin_expenses`. La integración se activa cuando el módulo financiero esté implementado.

---

## PARTE E: Tipos TypeScript

Crear `src/types/ai-tools.ts`:

```typescript
// === Catálogo ===

export type ToolCategory = 
  | 'gen_visual' | 'gen_video' | 'gen_text' | 'gen_audio'
  | 'ai_suite' | 'creative_production' | 'collaboration'
  | 'analytics' | 'crm' | 'infrastructure'

export type CostModel = 'subscription' | 'per_credit' | 'hybrid' | 'free_tier' | 'included'

export interface AiTool {
  toolId: string
  toolName: string
  vendor: string
  toolCategory: ToolCategory
  toolSubcategory: string | null
  costModel: CostModel
  subscriptionAmount: number | null
  subscriptionCurrency: string
  subscriptionBillingCycle: string
  subscriptionSeats: number | null
  creditUnitName: string | null
  creditUnitCost: number | null
  creditUnitCurrency: string
  creditsIncludedMonthly: number | null
  finSupplierId: string | null
  description: string | null
  websiteUrl: string | null
  iconUrl: string | null
  isActive: boolean
  sortOrder: number
}

// === Licencias ===

export type LicenseStatus = 'active' | 'pending' | 'suspended' | 'expired' | 'revoked'
export type AccessLevel = 'full' | 'limited' | 'trial' | 'viewer'

export interface MemberToolLicense {
  licenseId: string
  memberId: string
  toolId: string
  licenseStatus: LicenseStatus
  activatedAt: string | null
  expiresAt: string | null
  accessLevel: AccessLevel
  accountEmail: string | null
  notes: string | null
  // Joined from catalog
  tool?: AiTool
}

// === Wallets ===

export type WalletScope = 'client' | 'pool'
export type WalletStatus = 'active' | 'depleted' | 'expired' | 'suspended'
export type BalanceHealth = 'healthy' | 'warning' | 'critical' | 'depleted'

export interface AiCreditWallet {
  walletId: string
  walletName: string
  walletScope: WalletScope
  clientId: string | null
  clientName: string | null
  toolId: string
  toolName: string
  creditUnitName: string
  initialBalance: number
  currentBalance: number
  reservedBalance: number
  monthlyLimit: number | null
  monthlyConsumed: number
  monthlyResetDay: number
  lowBalanceThreshold: number | null
  validFrom: string
  validUntil: string | null
  walletStatus: WalletStatus
  // Computed
  balanceHealth: BalanceHealth
  usagePercent: number
  availableBalance: number          // currentBalance - reservedBalance
}

// === Ledger ===

export type LedgerEntryType = 'debit' | 'credit' | 'reserve' | 'release' | 'adjustment'
export type ReloadReason = 'initial_allocation' | 'monthly_renewal' | 'purchase' | 'bonus' | 'rollover' | 'manual_adjustment'

export interface AiCreditLedgerEntry {
  ledgerId: string
  walletId: string
  requestId: string | null
  entryType: LedgerEntryType
  creditAmount: number
  balanceBefore: number
  balanceAfter: number
  consumedByMemberId: string | null
  consumedByName: string | null
  clientId: string | null
  clientName: string | null
  notionTaskId: string | null
  notionProjectId: string | null
  projectName: string | null
  assetDescription: string | null
  // Financials (null for non-admin)
  unitCost: number | null
  costCurrency: string | null
  totalCost: number | null
  totalCostClp: number | null
  reloadReason: ReloadReason | null
  reloadReference: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

// === Summaries ===

export interface ClientCreditSummary {
  wallets: Array<AiCreditWallet & { toolIconUrl: string | null }>
  totalCreditsAvailable: number
  totalCreditsConsumed: number
  topConsumingProjects: Array<{
    projectName: string
    creditsConsumed: number
  }>
}

export interface AdminCreditSummary extends ClientCreditSummary {
  totalCostUsd: number
  totalCostClp: number
  costByTool: Array<{
    toolName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
  costByClient: Array<{
    clientName: string
    creditsConsumed: number
    totalCostUsd: number
  }>
}
```

---

## PARTE F: Constantes de nomenclatura

Agregar a `src/config/greenhouse-nomenclature.ts`:

```typescript
export const GH_AI_TOOLS = {
  // Tab en People
  TAB_LABEL: 'Herramientas',
  TAB_SECTION_LICENSES: 'Licencias activas',
  TAB_SECTION_CONSUMPTION: 'Consumo de créditos',
  TAB_EMPTY: 'Sin herramientas asignadas. Asigna herramientas desde el panel de administración.',
  
  // Widget de cliente
  WIDGET_TITLE: 'Tus créditos de producción',
  WIDGET_BALANCE_LABEL: 'disponibles',
  WIDGET_MONTHLY_LABEL: 'Usados este mes',
  WIDGET_RECENT_TITLE: 'Últimos consumos',
  WIDGET_EMPTY: 'Tus créditos de producción aparecerán aquí cuando se activen. Habla con tu equipo de cuenta para saber más.',
  
  // Admin
  ADMIN_TITLE: 'Herramientas e IA',
  ADMIN_TAB_CATALOG: 'Catálogo',
  ADMIN_TAB_WALLETS: 'Wallets',
  ADMIN_TAB_CONSUMPTION: 'Consumo',
  ADMIN_CTA_ADD_TOOL: 'Agregar herramienta',
  ADMIN_CTA_CREATE_WALLET: 'Crear wallet',
  ADMIN_CTA_RELOAD: 'Recargar créditos',
  ADMIN_CTA_ASSIGN: 'Asignar herramienta',
  ADMIN_CTA_CONSOLIDATE: 'Consolidar costos del mes',
  
  // Semáforo
  STATUS_HEALTHY: 'Disponible',
  STATUS_WARNING: 'Balance bajo',
  STATUS_CRITICAL: 'Crítico',
  STATUS_DEPLETED: 'Agotado',
  
  // Categorías
  CATEGORY_LABELS: {
    gen_visual: 'Generación visual',
    gen_video: 'Generación de video',
    gen_text: 'Generación de texto',
    gen_audio: 'Generación de audio',
    ai_suite: 'Suite IA',
    creative_production: 'Producción creativa',
    collaboration: 'Colaboración',
    analytics: 'Analytics',
    crm: 'CRM',
    infrastructure: 'Infraestructura',
  },
  
  // Modelos de costo
  COST_MODEL_LABELS: {
    subscription: 'Suscripción',
    per_credit: 'Por crédito',
    hybrid: 'Híbrido',
    free_tier: 'Gratuito',
    included: 'Incluido',
  },
} as const
```

---

## PARTE G: Estructura de archivos

```
src/
├── app/(dashboard)/
│   ├── admin/
│   │   └── ai-tools/
│   │       └── page.tsx                          # Admin: catálogo + wallets + consumo
│   └── ... (dashboard del cliente ya existe)
├── api/
│   ├── ai-tools/
│   │   ├── catalog/
│   │   │   └── route.ts                          # GET /api/ai-tools/catalog
│   │   └── licenses/
│   │       └── route.ts                          # GET /api/ai-tools/licenses
│   ├── ai-credits/
│   │   ├── wallets/
│   │   │   └── route.ts                          # GET /api/ai-credits/wallets
│   │   ├── ledger/
│   │   │   └── route.ts                          # GET /api/ai-credits/ledger
│   │   ├── consume/
│   │   │   └── route.ts                          # POST /api/ai-credits/consume
│   │   ├── reload/
│   │   │   └── route.ts                          # POST /api/ai-credits/reload
│   │   └── summary/
│   │       └── route.ts                          # GET /api/ai-credits/summary
│   └── admin/
│       └── ai-tools/
│           ├── catalog/
│           │   ├── route.ts                      # POST (create)
│           │   └── [toolId]/
│           │       └── route.ts                  # PATCH (edit)
│           ├── licenses/
│           │   ├── route.ts                      # POST (assign)
│           │   └── [licenseId]/
│           │       └── route.ts                  # PATCH (edit)
│           └── wallets/
│               ├── route.ts                      # POST (create)
│               └── [walletId]/
│                   └── route.ts                  # PATCH (edit)
├── components/
│   └── greenhouse/
│       └── ai-tools/
│           ├── ToolLicenseCard.tsx                # Card de licencia (reutilizable)
│           ├── CreditWalletCard.tsx               # Card de wallet con progress bar
│           ├── CreditBalanceBadge.tsx             # Badge de semáforo
│           ├── ConsumptionTimeline.tsx            # Timeline de consumos recientes
│           ├── CreditSummaryStrip.tsx             # Strip de KPIs de créditos
│           └── ToolCategoryBadge.tsx              # Badge de categoría con color
├── views/
│   └── greenhouse/
│       ├── people/
│       │   └── tabs/
│       │       └── ToolsTab.tsx                  # Tab de herramientas en People
│       ├── dashboard/
│       │   └── widgets/
│       │       └── CreditWidget.tsx              # Widget de créditos en dashboard cliente
│       └── admin/
│           └── ai-tools/
│               ├── CatalogTab.tsx                # Tab catálogo en admin
│               ├── WalletsTab.tsx                # Tab wallets en admin
│               ├── ConsumptionTab.tsx            # Tab consumo en admin
│               └── drawers/
│                   ├── CreateToolDrawer.tsx       # Drawer crear herramienta
│                   ├── EditToolDrawer.tsx         # Drawer editar herramienta
│                   ├── CreateWalletDrawer.tsx     # Drawer crear wallet
│                   ├── ReloadWalletDrawer.tsx     # Drawer recargar wallet
│                   └── AssignLicenseDrawer.tsx    # Drawer asignar licencia
├── lib/
│   └── ai-tools-queries.ts                       # Query builders para BigQuery
├── types/
│   └── ai-tools.ts                               # Interfaces TypeScript (Parte E)
└── config/
    └── greenhouse-nomenclature.ts                # Agregar GH_AI_TOOLS

scripts/
└── setup-ai-tooling-tables.sql                   # DDL + seed data
```

---

## PARTE H: Orden de ejecución

### Fase 1: Infraestructura (P0, sin dependencia de UI)

1. Crear tablas en BigQuery (A1-A4)
2. Insertar seed data del catálogo (A5)
3. Guardar script SQL en repo (A6)
4. Crear tipos TypeScript (E)
5. Crear query builders `ai-tools-queries.ts`
6. Agregar constantes GH_AI_TOOLS a nomenclatura (F)
7. Implementar `ensureAiToolingInfrastructure()` y reusable guards/query helpers del módulo

### Fase 2: APIs de lectura (P0, requiere Fase 1 + Auth)

7. Implementar `GET /api/ai-tools/catalog` (B1)
8. Implementar `GET /api/ai-tools/licenses` (B2)
9. Implementar `GET /api/ai-credits/wallets` (B3)
10. Implementar `GET /api/ai-credits/ledger` (B4)
11. Implementar `GET /api/ai-credits/summary` (B7)

### Fase 3: APIs de escritura (P0, requiere Fase 2)

12. Implementar `POST /api/ai-credits/consume` (B5)
13. Implementar `POST /api/ai-credits/reload` (B6)
14. Implementar CRUD admin de catálogo (C1, C2)
15. Implementar CRUD admin de licencias (C3, C4)
16. Implementar CRUD admin de wallets (C5, C6)

### Fase 4: Componentes base (P0, requiere Fase 2)

17. Crear `ToolLicenseCard.tsx`
18. Crear `CreditWalletCard.tsx` + `CreditBalanceBadge.tsx`
19. Crear `ConsumptionTimeline.tsx`
20. Crear `CreditSummaryStrip.tsx`
21. Crear `ToolCategoryBadge.tsx`

### Fase 5: Vistas (P0, requiere Fases 3 y 4)

22. Implementar tab "Herramientas" en People (D1)
23. Implementar widget de créditos en dashboard cliente (D2)
24. Implementar admin `/admin/ai-tools` con 3 tabs (D3)
25. Implementar drawers de admin

### Fase 6: Integración financiera (P1, requiere Financial Module estabilizado)

26. Implementar consolidación mensual de costos desacoplada del MVP de créditos
27. Si Finance ya soporta extensión segura del modelo, agregar subtipo/categorización `ai_usage`
28. Agregar sección "Costos IA" al dashboard financiero

### Fase 7: Polish (P2)

29. Skeleton loaders en cada sección
30. Error boundaries independientes por componente
31. Responsive: 1440px, 1024px, 768px
32. Export CSV de ledger (admin)
33. Filtros persistentes (query params en URL)

---

## Criterios de aceptación

### Infraestructura

- [ ] 4 tablas creadas en `greenhouse` dataset con schemas exactos
- [ ] Seed data insertado con al menos 15 herramientas del catálogo
- [ ] Script SQL documentado en `scripts/setup-ai-tooling-tables.sql`
- [ ] Tipos TypeScript completos en `src/types/ai-tools.ts`

### APIs de lectura

- [ ] `GET /api/ai-tools/catalog` retorna herramientas filtrable por categoría y modelo de costo
- [ ] `GET /api/ai-tools/licenses` retorna licencias con JOIN al catálogo, filtrable por member
- [ ] `GET /api/ai-credits/wallets` filtra por rol: cliente ve solo sus wallets sin costos
- [ ] `GET /api/ai-credits/ledger` filtra por rol y pagina correctamente
- [ ] `GET /api/ai-credits/summary` retorna agregados adaptados al rol
- [ ] Todas las APIs validan autenticación

### APIs de escritura

- [ ] `POST /api/ai-credits/consume` valida balance, es idempotente, decrementa wallet, registra en ledger, calcula costo
- [ ] `POST /api/ai-credits/consume` rechaza si balance insuficiente o wallet expirado/depleted
- [ ] `POST /api/ai-credits/reload` incrementa balance, registra en ledger con razón y evita doble recarga por retry
- [ ] CRUD de catálogo funciona: crear, editar, desactivar herramientas
- [ ] CRUD de licencias funciona: asignar, editar estado, revocar
- [ ] CRUD de wallets funciona: crear con allocation inicial en ledger, editar límites
- [ ] Todas las APIs de escritura requieren `efeonce_admin`

### Vista — Tab Herramientas en People

- [ ] Tab visible en `/people/[memberId]` con licencias activas de la persona
- [ ] Cards con ícono, nombre, vendor, categoría (badge), estado (badge), access level
- [ ] Sección de consumo con KPIs y tabla de últimos 10 consumos
- [ ] CTA "Asignar herramienta" solo visible para admin
- [ ] Empty state cuando no hay licencias

### Vista — Widget de créditos (cliente)

- [ ] Visible en dashboard del cliente cuando tiene al menos 1 wallet activo
- [ ] Card por wallet con balance, progress bar con semáforo, consumo mensual
- [ ] Timeline de últimos 5 consumos con descripción del asset
- [ ] No muestra costos monetarios, pools internos ni nombres del equipo
- [ ] Empty state cuando no hay wallets activos

### Vista — Admin herramientas

- [ ] Ruta `/admin/ai-tools` protegida con `efeonce_admin`
- [ ] Tab Catálogo: tabla completa con filtros y CRUD via drawers
- [ ] Tab Wallets: tabla con balance visual, filtros, y acciones (recargar, ver ledger)
- [ ] Tab Consumo: KPI cards + charts + tabla de ledger filtrable
- [ ] Charts: consumo diario (line), distribución por cliente (donut)

### Semáforo de balance

- [ ] Verde si `current_balance > 50%` de `initial_balance`
- [ ] Amarillo si entre 20% y 50%
- [ ] Rojo si < 20% o `≤ low_balance_threshold`
- [ ] Estado `depleted` cuando balance llega a 0

### Integridad del ledger

- [ ] El ledger es append-only — no hay UPDATE ni DELETE en entries existentes
- [ ] Correcciones se hacen con `entry_type = 'adjustment'`
- [ ] `balance_before` y `balance_after` forman cadena verificable
- [ ] El balance del wallet es recalculable desde el ledger (sum de credits - sum de debits)
- [ ] Las operaciones de escritura usan `requestId` o clave equivalente para evitar doble registro

### UX Writing e idioma

- [ ] Todos los textos visibles salen de `GH_AI_TOOLS` en constantes de nomenclatura
- [ ] Tratamiento "tú" consistente
- [ ] Spanglish natural: wallet, credits, render, token, generation se dejan en inglés
- [ ] Empty states diseñados para cada vista

### Calidad técnica

- [ ] Skeleton loaders en cada sección al cargar
- [ ] Error boundary por componente — si una vista falla, las demás siguen
- [ ] Responsive funcional en desktop (1440px+), tablet (1024px) y mobile (768px)
- [ ] Tooltips en semáforos y métricas

---

## Lo que NO incluye esta tarea

- **Consumo automático vía API de proveedores:** La integración directa con las APIs de Kling, Anthropic, OpenAI, etc. para leer consumo real es tarea separada. Este módulo registra consumo manualmente o vía la API `consume`.
- **Notificaciones de balance bajo:** El flag `alert_sent` se setea, pero la notificación (email, Teams, push) es tarea separada.
- **Billing al cliente:** Este módulo trackea créditos operativos, no facturación. La facturación por uso de créditos se gestiona en el módulo financiero.
- **Marketplace de herramientas:** No hay self-service del cliente para comprar créditos adicionales. Las recargas las gestiona el admin.
- **Sync automático de licencias con proveedores:** No se consulta la API de Adobe Admin Console para verificar licencias. Es registro manual.
- **Time-based credit expiration:** Los créditos no vencen dentro de un wallet activo. Si el wallet vence, los créditos se pierden. No hay expiración granular por lote de créditos.
- **Job automático de reset mensual de `monthly_consumed`:** La lógica de reset se implementa en la API de lectura (calcula on-the-fly basándose en `monthly_reset_day`), no con un cron job separado. Si se prefiere un cron, es tarea separada.

---

## Lo que SÍ cambia en otros módulos

| Componente | Cambio | Impacto |
|---|---|---|
| `greenhouse` dataset | 4 tablas nuevas `ai_*` | Aditivo — no afecta tablas existentes |
| People Unified View | Tab adicional "Herramientas" | Extensión de tabs existentes |
| Dashboard cliente | Widget de créditos | Sección nueva en dashboard / reemplazo parcial de AI tooling declarativo actual |
| Sidebar admin | Nuevo item "Herramientas e IA" | Extensión del sidebar existente |
| `fin_expenses` (futuro) | Subtipo o categorización `ai_usage` | Extensión a definir según el contrato real de Finance |
| Nomenclatura | Nuevo bloque `GH_AI_TOOLS` | Aditivo |
| Types | Nuevo archivo `ai-tools.ts` | Aditivo |

---

## Notas para el agente

- **Lee los documentos normativos antes de escribir código.** Especialmente `GREENHOUSE_IDENTITY_ACCESS_V1.md`, `project_context.md`, y `Nomenclatura_Portal_v3.md`.
- **El ledger es sagrado.** Nunca UPDATE ni DELETE en `ai_credit_ledger`. Es la fuente de verdad auditoria. Las correcciones van como nuevas entries con `entry_type = 'adjustment'`.
- **El balance del wallet es derivado del ledger.** Aunque se mantiene como campo denormalizado para performance, debe ser recalculable desde el ledger en cualquier momento: `SUM(credits) - SUM(debits) = current_balance`.
- **No inventes componentes de UI.** Reutiliza stat cards, tablas con filtros, drawers, y empty states de otros módulos.
- **El widget del cliente no muestra costos.** Nunca. El cliente ve créditos, no dinero. La conversión créditos→costo es información interna de Efeonce.
- **Los precios en el seed data son de referencia.** Actualizar con costos reales antes de producción. Especialmente los modelos de IA generativa que cambian de precio frecuentemente.
- **`monthly_consumed` se calcula on-the-fly**, no con cron. Al hacer `GET wallets`, calcular como `SUM(debit amounts) FROM ledger WHERE wallet_id = X AND created_at >= start_of_current_month`. Esto evita inconsistencias si el cron falla. El campo `monthly_consumed` en la tabla es solo cache y nunca debe tratarse como source of truth.
- **El `credit_unit_cost` puede cambiar.** Por eso el ledger guarda un snapshot de `unit_cost` en cada entry. El costo en el catálogo es el "vigente", el del ledger es el "histórico al momento del consumo".
- **Branch naming:** `feature/ai-tooling-credits`
- **Cada push a `develop` genera preview en Vercel.** Usa ese preview para QA visual antes de merge a `main`.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
