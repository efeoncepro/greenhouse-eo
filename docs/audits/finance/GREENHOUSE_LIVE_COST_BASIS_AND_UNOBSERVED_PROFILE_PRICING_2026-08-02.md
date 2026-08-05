# Base de costos viva y cotización de perfiles no observados

**Fecha de corte:** 2026-08-02
**Alcance:** costos de personas, catálogo de roles, cotizaciones y perfiles sin contratación previa
**Caso ilustrativo:** `Influencer Specialist`; el mecanismo aplica a cualquier rol o perfil no observado
**Estado:** recomendación para ADR y extensión del modelo; no cambia código, schema ni datos live

## 1. Decisión

La base de costos de Greenhouse debe ser viva, pero no debe ser una cifra mutable sin historia.

Debe funcionar con cuatro estados simultáneos:

```text
cost basis vigente       → lo que usarán nuevas cotizaciones
quote snapshot           → lo que sustentó una cotización emitida
actual period cost       → lo que realmente costó el periodo
variance / reforecast    → qué cambió y qué decisión produce
```

La misma regla aplica cuando el perfil solicitado no existe todavía en la nómina, en los hechos de costo o en el catálogo exacto de roles.

`Influencer Specialist` es únicamente el ejemplo utilizado para hacer visible el problema. La capacidad que se necesita debe funcionar igual para un abogado, investigador, estratega, especialista técnico, perfil de datos, operador de una nueva capability o cualquier otra combinación de skills que Efeonce nunca haya contratado.

> **Un perfil nuevo se puede cotizar sin haberlo contratado, pero nunca debe presentarse como costo real. Debe entrar como `role_modeled`, con fuente, fecha, supuestos, rango, confianza y aprobación.**

## 2. Evidencia actual de Greenhouse

La base existente ya tiene piezas útiles:

| Objeto | Estado live | Lectura |
|---|---:|---|
| `sellable_roles` | 38 roles, 32 activos | catálogo comercial de roles |
| `sellable_role_cost_components` | 31 filas para 31 roles | costos modelados por tipo de contratación |
| `source_kind = catalog_seed` | 28 filas | base cargada inicialmente; confianza 0,60 |
| `source_kind = admin_manual` | 3 filas | overrides manuales; confianza 0,75 |
| `role_blended_cost_basis_snapshots` | 12 filas | evidencia factual agregada para algunos roles/periodos |
| `role_modeled_cost_basis_snapshots` | 0 filas | lane estructural, todavía no materializada live |

El modelo de roles ya contempla costo base, bonos, cargas/provisiones, fee de Deel/EOR, horas mensuales y costo horario. También tiene `effective_from`, `source_kind`, `source_ref` y `confidence_score`.

Esto confirma que la carga inicial que hizo el operador no fue inútil: es una primera **hipótesis de costo**. El problema es que todavía no está operando como un lane gobernado y materializado de `role_modeled`.

## 3. Qué significa que la base sea viva

### 3.1 Cambios de fuentes

Cada fuente debe tener vigencia efectiva:

```text
fuente de costo
  ├─ effective_from
  ├─ effective_to, si aplica
  ├─ source_kind
  ├─ source_ref
  ├─ confidence
  └─ snapshot utilizado por la cotización
```

Un aumento de sueldo, una nueva tarifa de Deel, un cambio de licencia o una modificación de FX debe cambiar el costo vigente para nuevas decisiones y periodos futuros.

### 3.2 Qué no debe cambiar automáticamente

- Una cotización emitida no debe reescribirse.
- Una cotización aprobada no debe cambiar de precio en silencio.
- Un contrato vigente no debe cambiar porque cambió el catálogo.
- Un periodo cerrado no debe recalcularse destruyendo su snapshot.

El cambio debe producir una alerta de reforecast, una nueva versión, un change order o un ajuste/reapertura gobernada, según el estado del objeto.

### 3.3 Matriz de comportamiento

| Estado | Usa la base nueva | Reescribe el pasado | Acción |
|---|---:|---:|---|
| Cotización en borrador | Sí | No aplica | recalcular y registrar nueva simulación |
| Cotización interna no emitida | Sí, con alerta | No | confirmar repricing antes de emitir |
| Cotización enviada | No silenciosamente | No | nueva versión y aprobación |
| Cotización aprobada/aceptada | No | No | change order o renegociación si el contrato lo permite |
| Ejecución abierta | Para forecast | No | mostrar impacto esperado y variance futura |
| Periodo cerrado | No para el snapshot cerrado | No | ajuste, reapertura o restatement gobernado |

## 4. Perfiles que nunca se han contratado

El sistema no debe tener solo dos opciones:

```text
role existe y tiene actual
role no existe y no se puede cotizar
```

Debe tener cuatro lanes:

1. `member_actual`: existe una persona y hay costo real.
2. `role_blended`: existe evidencia real de varias personas del mismo rol.
3. `role_modeled`: no hay evidencia suficiente, pero existe un modelo explicable.
4. `role_proxy`: se usa un rol vecino como referencia temporal, declarado como proxy.

Un quinto estado, `manual_pending`, debe cubrir casos donde la incertidumbre es material y exige confirmación de Finance/Commercial antes de emitir.

### 4.1 No crear una falsa exactitud

Para un perfil nuevo no debe hacerse esto:

```text
perfil solicitado = rol más parecido = USD X
```

Debe hacerse esto:

```text
perfil solicitado
  ├─ proxy: rol vecino, si existe
  ├─ diferencias de alcance y seniority
  ├─ hipótesis de contratación y geografía
  ├─ rango de costo
  ├─ direct costs adicionales
  ├─ evidencia externa o cotizaciones de candidatos
  ├─ confidence
  └─ aprobación requerida
```

El proxy ayuda a empezar; no convierte el perfil nuevo en el perfil existente. Si no existe ningún proxy razonable, el flujo debe continuar con evidencia de contratación, proveedores o benchmarks fechados, y puede terminar en `manual_pending`.

### 4.2 Perfil solicitado no es automáticamente un `sellable_role`

El flujo debe distinguir cuatro objetos que hoy se pueden confundir:

```text
requested_profile   → lo que el cliente pidió
profile_archetype   → normalización de skills, seniority y alcance
sellable_role       → SKU comercial reusable y aprobado
cost_basis          → costo actual, blended, modelado o proxy
```

Un pedido nuevo puede cotizarse usando un `profile_archetype` provisional sin crear inmediatamente un SKU permanente en `sellable_roles`. El SKU se crea cuando el perfil demuestra recurrencia, ownership, packaging y una economía suficientemente estable. Así se evita llenar el catálogo con cientos de roles únicos o usar un SKU definitivo para una necesidad puntual.

## 5. Cómo calcular un perfil no observado

### 5.1 Primero definir el perfil económico

Antes de buscar una cifra, se debe fijar:

- alcance y responsabilidades;
- seniority real;
- país o mercado de contratación;
- empleo directo, contractor, Deel o EOR;
- dedicación esperada;
- disponibilidad y plazo de incorporación;
- herramientas requeridas;
- viajes, producción, derechos o proveedores externos;
- si el perfil es delivery directo, coordinación o capacidad compartida;
- si el trabajo es proyecto, retainer, staff augmentation o managed service.

El nombre del perfil no es una unidad económica suficiente hasta saber qué hará, en qué contexto y con qué nivel de responsabilidad. La misma regla aplica a cualquier rol nuevo: el título es una etiqueta de búsqueda, no una base de costo.

### 5.2 Jerarquía de evidencia

La base debe priorizar fuentes en este orden:

| Nivel | Evidencia | Uso |
|---|---|---|
| 1 | Costo real de una persona con el mismo rol, país y modalidad | `member_actual` o `role_blended` |
| 2 | Personas internas con competencias y seniority comparables | proxy ajustado |
| 3 | Oferta o cotización concreta de candidato/proveedor | costo probable de contratación |
| 4 | Bandas de compensación o benchmarks externos fechados | hipótesis de mercado |
| 5 | Estimación interna del operador | fallback explícito, nunca costo real |

Una única cifra externa no debe transformarse en verdad. Debe registrar proveedor, fecha, geografía, seniority, modalidad, moneda y si representa sueldo bruto, costo del empleador o tarifa de proveedor.

### 5.3 Composición del costo

El costo mensual modelado de una persona o rol debe separar:

```text
compensación base
+ bonos o variable esperada
+ cargas/provisiones/beneficios del empleador
+ fee de Deel/EOR/proveedor
+ herramientas obligatorias atribuibles
+ direct costs de delivery
+ overhead directo o compartido según la vista
= fully_loaded modeled cost
```

Para contribution costing se deben excluir los costos no incrementales según la política aprobada. Para fully loaded se incorporan los pools de capacidad y overhead que correspondan. No se debe mezclar la reserva de incertidumbre dentro del salario o del costo base.

### 5.4 Rango y escenarios

Si existe una distribución suficiente, el modelo puede guardar `p50`, `p75` y `p90`. Si no existe muestra suficiente, no debe fingir percentiles: debe guardar escenarios explícitos.

```text
low      → contratación favorable / alcance acotado
base     → hipótesis más defendible
high     → contratación difícil / seniority o riesgo superior
```

Política recomendada:

- cotización exploratoria interna: usar escenario `base` y mostrar sensibilidad;
- cotización externa con precio firme: usar evidencia concreta de proveedor/candidato o escenario conservador aprobado;
- cotización con baja confianza: permitir draft, pero bloquear emisión automática o exigir aprobación Finance/Commercial;
- servicio donde el perfil es crítico: agregar una reserva de staffing separada, no esconderla en el margen.

La elección de `base`, `p75` o `p90` no debe ser global por costumbre. Debe depender de si existe muestra, materialidad del riesgo, posibilidad de sustitución y compromiso contractual.

## 6. Caso ilustrativo: Influencer Specialist

### Estado actual verificado

El catálogo tiene `ECG-023 Influencer Manager`, activo. No tiene un rol exacto denominado `Influencer Specialist`.

No es seguro cotizar el nuevo perfil copiando automáticamente el costo de `ECG-023`. Primero debe compararse el alcance.

Este caso no requiere una lógica especial para influencers. El mismo flujo se ejecuta para cualquier perfil no observado; lo único que cambia son las competencias, los costos directos, la modalidad de contratación y las fuentes de evidencia.

### Caso A — el servicio necesita un especialista interno

La cotización debe crear una línea modelada:

```text
role_modeled: Influencer Specialist
proxy: ECG-023 Influencer Manager
seniority: definido por intake
employment_type: definido por estrategia de contratación
hours: calculadas desde la receta del servicio
tools: separadas
confidence: según evidencia
approval: requerida si la confianza es baja
```

El proxy se ajusta si el especialista tiene menor seniority, menor responsabilidad comercial o menor carga de coordinación. Si requiere negociación, relación con clientes o ownership estratégico, puede necesitar un nivel superior al proxy.

### Caso B — el servicio incluye influencers o creadores externos

La compensación del `Influencer Specialist` y el pago a influencers son cosas distintas:

```text
Influencer Specialist        → labor de delivery
fee de creadores/influencers → direct cost / rights / pass-through
media spend                  → línea separada
tools de campaign management → tool cost
```

Nunca se debe esconder el fee del influencer dentro del costo del especialista ni aplicar el mismo margen a ambas líneas sin una política explícita.

### Caso C — no existe ninguna referencia útil

Se debe abrir una mini fase de sourcing/procurement:

1. definir brief y seniority;
2. pedir referencias a candidatos o proveedores;
3. obtener un rango de contratación real;
4. comparar modalidad y geografía;
5. actualizar el `role_modeled` con la evidencia;
6. cotizar usando el rango y una reserva visible;
7. reemplazar el modelo por `member_actual` cuando exista contratación.

No hay que contratar primero para poder cotizar, pero sí hay que distinguir la cotización provisional de una promesa de contratación cerrada.

## 7. Cómo evoluciona el modelo después de contratar

El modelo debe aprender sin destruir su historia:

```text
role_modeled
  → contratación / proveedor real
  → member_actual
  → role_blended cuando exista evidencia reusable
  → actualización de futuras cotizaciones
```

La cotización original conserva:

- el costo modelado utilizado;
- la fuente y fecha;
- el proxy;
- el rango y supuestos;
- la confianza;
- el margen calculado.

Después se compara contra el costo real. La diferencia se convierte en variance y sirve para corregir futuras recetas o modelos, pero no para reescribir la historia.

## 8. Reglas de cotización para perfiles nuevos

El cotizador debe responder con una cost card que incluya:

- `cost_basis_kind`: `member_actual`, `role_blended`, `role_modeled`, `role_proxy` o `manual_pending`;
- rol solicitado y rol proxy, si existe;
- geografía y modalidad de contratación;
- costo contribution y fully loaded;
- escenario utilizado;
- rango bajo/base/alto o percentiles sustentados;
- herramientas y direct costs separados;
- margen floor y target;
- fuente, fecha y vigencia;
- confidence label;
- supuestos y exclusiones;
- aprobación requerida;
- aviso de que la contratación real puede cambiar el costo.

La salida no debe ser solamente:

```text
Influencer Specialist: USD 2.000
```

Debe ser:

```text
Influencer Specialist
  costo modelado base: USD X
  rango: USD A–B
  fuente: proxy + benchmark/cotización fechada
  confianza: media
  costo fully loaded: USD Y
  precio target: USD Z
  condición: sujeto a confirmación de staffing
```

## 9. Qué falta implementar

### Ya existe parcialmente

- catálogo `sellable_roles`;
- componentes de costo por rol y modalidad;
- vigencia `effective_from`;
- `source_kind`, `source_ref` y `confidence_score`;
- lanes `member_actual`, `role_blended` y `role_modeled` en arquitectura;
- pricing por rol con provenance en el contrato V2.

### Falta para que funcione de verdad

- materializar `role_modeled_cost_basis_snapshots` live;
- hacer que el reader distinga modelo, proxy y actual;
- guardar rango/escenario y supuestos, no solo una cifra;
- crear mapeo de roles vecinos por capacidades, seniority y alcance;
- gobernar perfiles nuevos sin inventar SKUs definitivos automáticamente;
- conectar la cotización con la evidencia de contratación posterior;
- corregir la persistencia de provenance de líneas históricas;
- definir aprobación para emitir cotizaciones de baja confianza;
- actualizar el modelo con variance real sin alterar snapshots previos.

## 10. Recomendación de inicio

No hay que comenzar creando cientos de roles nuevos.

El primer slice debe ser un **Unobserved Profile Costing Flow** dentro del cotizador existente:

1. seleccionar o escribir el perfil solicitado;
2. encontrar roles vecinos;
3. comparar alcance, seniority, geografía y modalidad;
4. producir modelo y rango;
5. separar labor, tools, rights, media y pass-through;
6. calcular contribution y fully loaded;
7. aplicar margen y aprobación;
8. congelar baseline al emitir;
9. capturar costo real cuando el perfil se contrate;
10. alimentar variance y futuras bases de roles.

Esto resuelve un `Influencer Specialist` y cualquier futuro perfil nuevo sin crear un cotizador paralelo ni depender de intuición silenciosa. El rol es un dato de entrada; el mecanismo de costeo es transversal.

## 11. Conclusión

La estimación inicial que cargó el operador debe conservarse como seed histórico, pero debe perder su ambigüedad:

```text
no es costo real
no es precio de mercado definitivo
no es garantía de contratación
sí es una hipótesis versionada de costo
```

La capacidad que necesitamos no es saber el costo exacto de todo perfil antes de contratarlo —eso no existe—, sino producir una estimación defendible, acotada y actualizable para cualquier perfil, y luego aprender de la contratación y ejecución reales.

**Boundary:** este documento no crea roles, no modifica costos, no consulta benchmarks externos para fijar precios, no activa `role_modeled`, no cambia el engine y no constituye una aprobación comercial o laboral.

## 12. Fuentes

- [Revisión profunda de métodos de costeo](./GREENHOUSE_COSTING_METHODS_DEEP_REVIEW_2026-08-02.md)
- [Auditoría financiera y de cotización](./GREENHOUSE_FINANCE_COST_QUOTING_AUDIT_2026-08-02.md)
- [Member Loaded Cost Model V1](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
- [Finance Architecture V1](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- [Management Accounting Architecture V1](../../architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md)
- [Cotizador funcional](../../documentation/finance/cotizador.md)
- [Greenhouse Talent & People Operator](../../../.codex/skills/greenhouse-talent-people-operator/SKILL.md)
- [Efeonce Pricing Operator](../../../.codex/skills/efeonce-pricing-operator/SKILL.md)

**Evidencia live consultada:** `sellable_roles` (38 filas, 32 activas), `sellable_role_cost_components` (31 filas, 28 `catalog_seed`, 3 `admin_manual`), `role_modeled_cost_basis_snapshots` (0 filas), y búsqueda de roles `Influencer` (solo `ECG-023 Influencer Manager`).
