# Greenhouse Person ↔ Legal Entity Relationships V1

**Version 1.0 — April 2026**

## Purpose

Definir el contrato arquitectónico para relaciones explícitas entre una persona canónica de Greenhouse y una entidad legal canónica del grupo, especialmente cuando esa persona puede coexistir como:

- usuario del portal
- colaborador operativo
- ejecutivo remunerado
- accionista
- acreedor/deudor de la empresa

Este documento fija la semántica para evitar que `user`, `member`, `space` u `organization_type` ambiguo terminen actuando como sustitutos de una relación legal, societaria o financiera.

Usar junto con:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Status

Contrato vigente desde 2026-04-11.

Delta 2026-04-18:

- existe runtime base en `greenhouse_core.person_legal_entity_relationships`
- el ancla `legal_entity` v1 reutiliza `greenhouse_core.organizations.organization_id` mediante la columna explícita `legal_entity_organization_id`
- `person_memberships` sigue representando contexto organizacional; no reemplaza la relación legal
- el backfill inicial materializa solo relaciones con fuente verificable en runtime actual:
  - `employee` para personas activas del operating entity
  - `shareholder_current_account_holder` para perfiles con `shareholder_accounts`

## Core Thesis

Greenhouse no debe modelar a una persona “especial” mediante campos extra en `user`, `member` o `shareholder_account`.

La base correcta es:

- una **persona canónica**
- una **entidad legal canónica**
- una o más **relaciones explícitas persona ↔ entidad legal**

Los módulos (`Finance`, `Payroll`, `Costs`, `People 360`) leen o extienden esas relaciones, pero no deben inventar raíces paralelas.

## Canonical Anchors

### Person

La raíz humana canónica sigue siendo:

- `greenhouse_core.identity_profiles.profile_id`

Regla:

- toda relación societaria, legal o económica con una persona debe poder resolverse a `identity_profile`
- `member_id` y `user_id` son facetas derivadas o complementarias, no la raíz humana

### Legal Entity

La contraparte jurídica/económica canónica es una **entidad legal**.

Para el caso actual:

- `Efeonce Group SpA`

Regla semántica:

- aunque hoy el runtime ya institucionaliza a `Efeonce Group SpA` como `operating entity` dentro de `greenhouse_core.organizations`, la semántica que debe leer el sistema es **entidad legal**
- `organization`, `space`, `tenant` y `operating organization` no son sinónimos automáticos de `legal entity`
- mientras no exista una tabla separada `legal_entities`, el runtime v1 usa `legal_entity_organization_id` como ancla explícita para evitar esa ambigüedad

### Operational Actor

Cuando la persona participa como colaborador interno, la faceta operativa sigue siendo:

- `greenhouse_core.members.member_id`

Regla:

- si el carril calcula o materializa por colaborador (`Payroll`, `Capacity`, `ICO`, `Costs`), debe preservarse `member_id`
- eso no reemplaza la relación persona ↔ entidad legal subyacente

### Access Principal

El acceso al portal sigue anclado en:

- `greenhouse_core.client_users.user_id`

Regla:

- `user` jamás debe actuar como owner primario de relaciones societarias, contractuales o financieras

## Distinciones no negociables

### 1. `user` no es la contraparte legal

Un `user` puede autenticar, autorizar y auditar acciones, pero no debe ser la raíz de:

- participación societaria
- cuenta corriente accionista
- préstamos empresa ↔ persona
- compensación ejecutiva

### 2. `member` no es la contraparte legal

`member` sirve para payroll, capacidad, costo, HR y operaciones por colaborador.

No debe usarse como reemplazo de:

- persona natural
- accionista
- fundador
- representante legal

Puede participar como faceta complementaria cuando la misma persona también es colaborador.

### 3. `space` no es la contraparte económica primaria

`space_id` puede seguir existiendo como scope operativo, tenant boundary o bridge legacy.

Pero no debe reemplazar la contraparte económica primaria cuando el vínculo real es:

- persona ↔ entidad legal

### 4. `organization_type` no agota la semántica legal

`organization_type = 'client' | 'supplier' | 'both' | 'other'` sirve para runtime organizacional actual.

No basta por sí solo para expresar:

- empleador legal
- entidad emisora/pagadora
- vehículo societario
- holding o sociedad relacionada

## Relationship Model

Greenhouse debe modelar relaciones explícitas entre `Person` y `LegalEntity`.

### Catálogo mínimo inicial

- `shareholder`
- `founder`
- `legal_representative`
- `board_member`
- `executive`
- `employee`
- `contractor`
- `shareholder_current_account_holder`
- `lender_to_entity`
- `borrower_from_entity`

### Campos semánticos mínimos

Cada relación debería poder expresar al menos:

- `relationship_type`
- `person_profile_id`
- `legal_entity_id`
- `effective_from`
- `effective_to`
- `status`
- `source_of_truth`
- `notes`
- `created_by`
- `created_at`

### Runtime V1 materializado

Tabla:

- `greenhouse_core.person_legal_entity_relationships`

Campos canónicos v1:

- `relationship_id`
- `public_id`
- `profile_id`
- `legal_entity_organization_id`
- `space_id`
- `relationship_type`
- `status`
- `source_of_truth`
- `source_record_type`
- `source_record_id`
- `role_label`
- `effective_from`
- `effective_to`
- `metadata_json`
- `created_by_user_id`
- `created_at`
- `updated_at`

Reglas v1:

- `profile_id` sigue siendo la raíz humana canónica
- `legal_entity_organization_id` explicita el ancla jurídica/económica sin inventar todavía un catálogo separado de entidades legales
- `space_id` existe como boundary de tenancy y lectura portal, no como reemplazo del vínculo persona ↔ entidad legal
- cada relación activa se deduplica por `profile_id + legal_entity_organization_id + relationship_type`

### Cardinalidad

- una persona puede tener múltiples relaciones activas con la misma entidad legal
- una persona puede tener relaciones con múltiples entidades legales del grupo
- una relación no implica automáticamente otra

Ejemplo:

- `shareholder` no implica `executive`
- `executive` no implica `employee`
- `shareholder_current_account_holder` no implica `shareholder` en todos los casos futuros, aunque hoy normalmente convivan

## Compensation Model

### Compensation Arrangement

La compensación de una persona frente a una entidad legal debe partir como un objeto conceptual propio:

- `CompensationArrangement`

Semántica:

- acuerdo de compensación vigente entre una persona y una entidad legal
- define monto, moneda, periodicidad, modalidad y vigencia
- no obliga a que toda compensación entre inmediatamente a nómina formal

### Payroll

`Payroll` sigue siendo owner de:

- `compensation_versions`
- `payroll_periods`
- `payroll_entries`

Regla:

- cuando un `CompensationArrangement` corresponde a remuneración formal de nómina, `Payroll` lo materializa sobre `member_id`
- `Payroll` no debe convertirse en la única raíz conceptual de toda compensación ejecutiva

### Costs

`Costs` y `Finance analytics` pueden consumir esa compensación para:

- costo empresa
- imputación por unidad/cliente/overhead
- rentabilidad

pero no deben redefinir ni la identidad de la persona ni la relación legal.

## Shareholder Current Account Model

La `Cuenta corriente accionista` debe entenderse como un instrumento financiero derivado de la relación:

- `person` ↔ `legal entity`

No como:

- extensión del `user`
- extensión del `member`
- sustituto de la relación societaria

Delta runtime 2026-04-18:

- cuando existe `greenhouse_finance.shareholder_accounts.profile_id`, el sistema puede materializar la relación `shareholder_current_account_holder`
- ese runtime no prueba por sí solo `shareholder`; solo prueba la existencia del instrumento financiero derivado

### Regla de ownership

`Finance` sigue siendo owner de:

- instrumento financiero
- ledger append-only
- pagos, settlement y balances
- conciliación y trazabilidad documental

Pero la semántica del vínculo subyacente es:

- persona ↔ entidad legal

### Tipos de movimiento que no deben mezclarse

Como mínimo, Greenhouse debe distinguir entre:

- `shareholder_loan_to_entity`
- `entity_loan_to_shareholder`
- `capital_contribution`
- `dividend_distribution`
- `executive_compensation_accrual`
- `executive_compensation_payment`
- `expense_reimbursement`
- `manual_adjustment`

Regla:

- sueldo, préstamo, dividendo, aporte y reembolso no deben convivir como un mismo significado financiero implícito

## Compensation vs Shareholder Account

Greenhouse no debe compensar automáticamente `executive compensation` con `shareholder current account`.

Regla canónica:

- cualquier cruce entre ambos carriles debe ser explícito, auditable y derivado de una instrucción/movimiento real
- no debe existir compensación implícita solo porque la misma persona sea ejecutivo y accionista

## 360 Read Models

### Person 360

`Person Complete 360` puede exponer estas relaciones como facetas o read models futuros, pero no debe redistribuir ownership.

Regla:

- `Person 360` es una lectura enriquecida
- no es owner ni de payroll ni de finance ni del contrato societario

### Account / Organization 360

El resolver de cuenta/organización puede mostrar contexto legal y ejecutivo cuando corresponda, pero debe distinguir:

- entidad legal
- organización operativa
- space/tenant

No deben colapsarse esas capas en un solo label genérico de `organization`.

## Present Case: Julio ↔ Efeonce Group SpA

Para el caso actual, Greenhouse debe poder representar simultáneamente que la misma persona mantiene con `Efeonce Group SpA` relaciones como:

- `shareholder`
- `founder`
- `executive`
- `shareholder_current_account_holder`

Y, si aplica operativamente además:

- `employee` o `member` como faceta de colaboración interna

## Non-Negotiable Rules

1. La raíz humana canónica es `identity_profile`.
2. La contraparte jurídica/económica primaria es la entidad legal.
3. `user` no puede ser el owner primario de relaciones societarias o financieras.
4. `member_id` se preserva para cálculos operativos, pero no reemplaza persona ni entidad legal.
5. `Payroll`, `Finance` y `Costs` pueden extender o proyectar la misma relación base, pero no duplicar su identidad.
6. La cuenta corriente accionista y la compensación ejecutiva son carriles distintos.
7. Cualquier compensación entre esos carriles debe ser explícita y auditable.

## Implementation Guidance

Antes de implementar cambios runtime derivados de este contrato:

1. revisar si la capa actual de `organizations` puede alojar semánticamente `legal entity` sin romper consumers existentes
2. decidir si la relación persona ↔ entidad legal vive como tabla dedicada o como especialización de memberships/relationships existentes
3. diseñar el puente explícito entre `CompensationArrangement` y `Payroll`
4. revisar qué consumers de `Finance > Cuenta accionista` hoy dependen indebidamente de `space_id`, `member_id` o `user`

## Related Future Work

- formalizar `LegalEntity` como object canónico explícito dentro del modelo 360
- diseñar el runtime de `person_entity_relationships`
- diseñar el runtime de `compensation_arrangements`
- agregar una surface de lectura ejecutiva/privada para personas que concentran múltiples relaciones con la misma entidad
