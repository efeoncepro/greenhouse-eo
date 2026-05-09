# Greenhouse EO — Commercial vs Finance Domain Boundary V1

> **Version:** 1.0
> **Created:** 2026-04-21
> **Audience:** Product owners, frontend engineers, identity/access owners, agents implementing navigation and authorization changes

---

## 1. Summary

Greenhouse ya modela buena parte del ciclo pre-venta y quote-to-cash sobre el dominio tecnico `commercial`, pero la navegacion y parte del access model siguen proyectando esos objetos dentro de `Finance`.

La decision canonica de este documento es:

- `Comercial` y `Finanzas` deben tratarse como **dominios hermanos** del portal.
- La primera separacion debe ocurrir en **navegacion, surfaces y autorizacion**.
- La primera separacion **no requiere** migrar URLs legacy `/finance/...`.
- Este cambio **no cabe sanamente en una sola task**; debe ejecutarse como programa multi-task.

---

## 2. Why This Exists

Hoy hay una contradiccion estructural:

- El modelo de datos y eventos de quotes, contracts, MSA, party lifecycle y product catalog vive en `greenhouse_commercial` y publica `commercial.*`.
- La UI principal y los access checks siguen tratando quotes como surface financiera:
  - sidebar `Finanzas > Documentos > Cotizaciones`
  - view code `finanzas.cotizaciones`
  - fallback por `routeGroup: finance`

Esa mezcla funciona para una etapa temprana del portal, pero deja varios costos:

1. `Finance` se vuelve un cajon transversal de pre-sales, contratos, pricing y accounting.
2. El modelo mental de producto choca con el runtime real (`commercial.*` vs `finanzas.*`).
3. Escalar nuevos roles (`sales`, `sales_lead`, `commercial_admin`) queda artificialmente amarrado a `finance`.
4. Cambios futuros en pipeline, party lifecycle, quote builder y product catalog quedan bloqueados por una taxonomia de menu incorrecta.

---

## 3. Canonical Decision

### 3.1 Top-level portal domains

Greenhouse debe operar con estos dos dominios distintos:

- **Comercial**
  - vende
  - negocia
  - define alcance
  - formaliza acuerdos comerciales
- **Finanzas**
  - registra hechos financieros
  - factura
  - cobra / paga
  - concilia
  - controla caja y resultado

### 3.2 Object ownership

| Objeto / surface | Dominio owner | Finance como consumer |
| --- | --- | --- |
| Pipeline | `Comercial` | lectura ejecutiva / revenue planning |
| Deals | `Comercial` | lectura para forecast |
| Cotizaciones | `Comercial` | approval / margin / FX / quote-to-cash |
| Contratos comerciales | `Comercial` | lectura para profitability y document chain |
| SOW | `Comercial` | lectura downstream cuando afecte cobro/ejecucion |
| Acuerdos marco (MSA) | `Comercial` | lectura legal/finance downstream |
| Productos catalogados para venta | `Comercial` | lectura de pricing / governance |
| Ingresos | `Finanzas` | source financiero primario |
| Egresos | `Finanzas` | source financiero primario |
| Cobros / Pagos / Banco / Caja / Conciliacion | `Finanzas` | source financiero primario |
| Asignaciones / Economia | `Finanzas` | source financiero primario |

### 3.3 SOW rule

Las `SOW` pertenecen a `Comercial`, no a `Finanzas`.

Motivo:

- representan alcance vendido y formalizacion comercial
- conviven naturalmente con `quote`, `contract` y `master_agreement`
- `Finanzas` las consume despues, pero no es su owner primario

---

## 4. Access Model Resolution

Este cambio toca explicitamente los dos planos canonicos del portal:

### 4.1 Views / surfaces / navigation plane

Debe existir una surface visible `Comercial` con su propia composicion de sidebar, breadcrumbs, shortcuts y entrypoints.

Objetivo:

- `Comercial` aparece como top-level section del sidebar
- los objetos comerciales salen de la seccion `Finanzas`
- `Finanzas` conserva sus labels actuales

### 4.2 Entitlements / capability plane

El dominio `commercial` ya existe en el runtime de entitlements, pero hoy no tiene una proyeccion completa en `routeGroups` ni en `view_code`.

Objetivo:

- formalizar `routeGroup: commercial`
- formalizar namespace de surfaces `comercial.*`
- mantener compat temporal con `finanzas.*` donde todavia existan readers y guards legacy

### 4.3 Startup policy plane

Este programa **no** debe cambiar `portalHomePath` ni el startup contract del portal en la primera etapa.

Regla:

- no crear un nuevo startup policy por el solo hecho de crear `Comercial`
- `startup policy` se evalua solo despues de que el dominio exista y tenga usuarios/roles propios

---

## 5. Navigation Contract

### 5.1 Target navigation

#### Comercial

- `Pipeline`
- `Cotizaciones`
- `Contratos`
- `SOW`
- `Acuerdos marco`
- `Productos`

#### Finanzas

Sin renombrar labels actuales:

- `Resumen`
- `Ingresos`
- `Egresos`
- `Cobros`
- `Pagos`
- `Banco`
- `Posición de caja`
- `Conciliación`
- `Clientes`
- `Proveedores`
- `Asignaciones`
- `Economía`

### 5.2 Document grouping rule

No todos los "documentos" viven en el mismo dominio.

- `Cotizaciones`, `Contratos`, `SOW` y `Acuerdos marco` son **documentos comerciales**
- `OC`, `HES`, conciliacion bancaria y documentos cash/accounting son **documentos financieros/operativos**

Por eso la seccion actual `Finanzas > Documentos` no debe seguir siendo el contenedor canonico de quotes/MSA/contracts en el target state.

---

## 6. URL Strategy

### 6.1 First rollout

La primera separacion **mantiene** paths legacy:

- `/finance/quotes`
- `/finance/contracts`
- `/finance/master-agreements`
- `/finance/products`
- `/finance/intelligence` para el carril de pipeline mientras siga coexistiendo

### 6.2 Rule

Navegacion, ownership y autorizacion pueden separarse **antes** de mover URLs.

Motivo:

- reduce blast radius
- evita romper deep links
- permite migrar guards y view codes sin rehacer rutas y APIs al mismo tiempo

### 6.3 Future optional step

Solo despues de estabilizar surfaces y access model se puede evaluar si conviene migrar a:

- `/commercial/quotes`
- `/commercial/contracts`
- `/commercial/master-agreements`
- `/commercial/products`
- `/commercial/pipeline`

Esa migracion **no forma parte** del primer corte canonico.

---

## 7. View Codes and Compatibility

### 7.1 Target namespace

El namespace objetivo para surfaces comerciales es:

- `comercial.pipeline`
- `comercial.cotizaciones`
- `comercial.contratos`
- `comercial.sow`
- `comercial.acuerdos_marco`
- `comercial.productos`

Estado TASK-555:

- El namespace anterior ya existe en `greenhouse_core.view_registry` y en el catálogo runtime `VIEW_REGISTRY`.
- Todas esas vistas usan `route_group = commercial`.
- Las rutas siguen siendo legacy `/finance/...` para evitar romper deep links: `pipeline` usa `/finance/intelligence`, `cotizaciones` usa `/finance/quotes`, `contratos` y `sow` usan `/finance/contracts`, `acuerdos_marco` usa `/finance/master-agreements` y `productos` usa `/finance/products`.

### 7.2 Transition rule

Durante la migracion:

- los guards nuevos deben aceptar `comercial.*`
- los checks legacy pueden seguir tolerando `finanzas.*` cuando la surface aun use rutas `/finance/...`
- la compatibilidad debe ser temporal y explicitamente documentada

### 7.3 Hard rule

No hacer un cambio solo visual de sidebar dejando el resto del runtime atado a `finanzas.*` como unica fuente de verdad. Eso solo moveria confusion de lugar.

---

## 8. Route Groups and Roles

### 8.1 Current reality

Hoy existen:

- `routeGroup: finance`
- `finance_analyst`
- `finance_admin`
- override `efeonce_admin`

Y el runtime de entitlements ya conoce el modulo `commercial`, pero no existe aun una familia formal de roles:

- `sales`
- `sales_lead`
- `commercial_admin`

### 8.2 Canonical direction

Debe nacer `routeGroup: commercial`.

Primera etapa de acceso:

- `efeonce_admin` conserva acceso total
- `finance_admin` mantiene acceso transicional a surfaces comerciales
- `efeonce_account` debe poder operar el dominio comercial
- `finance_analyst` puede mantener lectura selectiva donde Finance consume artefactos comerciales

Estado TASK-555:

- `role-route-mapping.ts` y `greenhouse_core.roles.route_group_scope` agregan `commercial` para `efeonce_admin`, `efeonce_account`, `finance_admin` y `finance_analyst`.
- La migración también intenta `finance_manager` de forma condicional para alinear DB histórica donde ese rol exista aunque no esté en `ROLE_CODES`.
- No se crean roles `sales`, `sales_lead` ni `commercial_admin`.
- No se crea startup policy comercial.

### 8.3 Future role family

La familia `sales` / `sales_lead` / `commercial_admin` es deseable, pero **no debe bloquear** la separacion de dominio.

Regla:

- primero separar dominio y surface
- despues introducir roles comerciales propios

---

## 9. Why This Is Multi-task, Not Single-task

Este programa no cabe bien en una sola task porque mezcla al menos cuatro cortes independientes:

1. **Navegacion y nomenclatura**
   - sidebar
   - breadcrumbs
   - shortcuts
   - agrupacion de menus

2. **Access model**
   - `routeGroups`
   - `authorizedViews`
   - `view_code`
   - overlays de entitlements

3. **Surface adoption**
   - quotes
   - contracts
   - SOW
   - master agreements
   - products
   - guards y entrypoints de esas vistas

4. **Pipeline lane extraction**
   - hoy vive dentro de `Finance > Intelligence`
   - su identidad funcional es comercial

Mezclar todo en una sola task elevaria innecesariamente el blast radius sobre:

- navegacion global
- autorizacion
- vistas existentes
- smoke tests y deep links

Conclusion canonica:

- esto debe ejecutarse como **epic multi-task**
- cada child task debe tener scope acotado y verificable

---

## 10. Recommended Program Decomposition

### EPIC recomendado

- `EPIC-002 — Commercial Domain Separation from Finance`

### Child tasks recomendadas

1. **Navigation separation**
   - crear seccion `Comercial`
   - mover surfaces comerciales del sidebar
   - no tocar paths legacy

2. **Access model foundation**
   - `routeGroup: commercial`
   - namespace `comercial.*`
   - compat temporal con `finanzas.*`

3. **Surface adoption**
   - quotes / contracts / SOW / MSA / products
   - guards, breadcrumbs, shortcuts, CTAs cruzadas

4. **Pipeline extraction**
   - sacar `Pipeline comercial` del encuadre financiero
   - darle lane comercial propia

### Optional future task

5. **URL normalization**
   - solo si despues de estabilizar todo sigue teniendo valor migrar a `/commercial/...`

---

## 11. Non-goals

Este documento no autoriza por si solo:

- mover rutas a `/commercial/...`
- renombrar labels existentes de `Finanzas`
- crear de inmediato nuevos roles `sales*`
- fusionar `Comercial` con `Agency`
- tocar startup policy o home default

---

## 12. References

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/finance/quotation-access.ts`
