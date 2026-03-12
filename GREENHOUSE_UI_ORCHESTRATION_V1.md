# Greenhouse UI Orchestration V1

## Objetivo
Definir un sistema deterministico para elegir, adaptar y promover patrones Vuexy/MUI dentro de Greenhouse.

Este documento existe para que la seleccion de UI no dependa de memoria individual ni de exploracion ad hoc de `full-version`.

## Tesis

Greenhouse no necesita un agente que "disene libremente".

Greenhouse necesita un orquestador que haga cuatro cosas bien:
- leer una solicitud de interfaz
- normalizarla a un brief operativo
- mapearla a una familia de patrones permitidos
- decir donde debe vivir la implementacion en el repo

## Alcance

Este sistema aplica cuando la solicitud venga de:
- una persona
- Claude
- Codex
- otro asistente o agente

Y cuando el trabajo involucre:
- crear una pantalla nueva
- adaptar una vista existente
- decidir entre patrones Vuexy/MUI
- portar una referencia de `full-version`
- extraer primitives reusables para Greenhouse

## No objetivos

Este sistema no decide:
- semantica de negocio
- KPIs nuevos
- fuentes de verdad inexistentes
- permisos de escritura o mutaciones admin
- pantallas definitivas para datos cuya capa semantica aun no esta cerrada

## Relacion con otros documentos

- `GREENHOUSE_ARCHITECTURE_V1.md`: define producto, limites y fases
- `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`: contrato visual de superficies ejecutivas
- `GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`: catalogo curado de patrones permitidos
- `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`: formato de normalizacion de solicitudes
- `project_context.md`: estado operativo del repo y librerias activas

## Problema que resuelve

`full-version` trae muchos componentes y paginas compuestas, pero Vuexy no trae una capa de orquestacion de producto.

Sin este sistema pasa lo siguiente:
- el agente explora demasiadas variantes
- la eleccion se vuelve estetica y no operacional
- se copian pantallas demo completas en vez de primitives
- se duplica JSX que deberia vivir en `src/components/greenhouse/*`
- la misma necesidad termina implementada con patrones distintos segun quien atienda el turno

## Principios

1. Elegir por senal, no por gusto
- la UI se selecciona por page intent, forma de dato, densidad y calidad de senal

2. Reusar antes de inventar
- si Vuexy o Greenhouse ya tienen un patron maduro, se adapta antes de crear otro

3. Orquestar antes de copiar
- primero se define familia visual y target local
- despues se inspecciona `full-version`

4. Promover cuando repite
- si un patron va a repetirse entre tenants, modulos o superficies, debe ir a `src/components/greenhouse/*`

5. Hacer visible la procedencia
- si una senal viene de `seeded`, `override`, `fallback` o fuente parcial, la UI debe poder expresarlo

6. Mantener Greenhouse como capa de lectura
- la seleccion de patrones no debe empujar el producto hacia un segundo Notion

## Entradas del orquestador

Toda solicitud debe normalizarse a este modelo, aunque el texto original venga redactado de forma libre.

### Fuente de solicitud
- `human`
- `claude`
- `codex`
- `other_agent`

### Surface type
- `dashboard`
- `admin_list`
- `admin_detail`
- `client_detail`
- `settings`
- `table_surface`
- `detail_shell`

### Page intent
- `executive_summary`
- `operational_drilldown`
- `governance`
- `identity_access`
- `comparison`
- `inventory`
- `roster`
- `timeline`

### Data shape
- `single_kpi`
- `kpi_strip`
- `short_trend`
- `health_score`
- `many_rows`
- `small_roster`
- `related_entities`
- `mixed_summary`
- `capability_inventory`

### Data quality
- `strong`
- `partial`
- `weak`
- `seeded`
- `override`

### Action density
- `read_only`
- `light_actions`
- `heavy_actions`

### Repeatability
- `shared_product_ui`
- `module_local`
- `route_local`

## Flujo de orquestacion

1. Confirmar fase, surface y actor
- revisar si la fase actual permite construir esa vista o si primero falta modelar datos

2. Normalizar la solicitud
- usar `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- el prompt original del agente upstream se trata como insumo, no como verdad cerrada

3. Inspeccionar la realidad local
- revisar componentes ya existentes en `src/components/greenhouse/*`
- revisar composicion actual de la ruta en `src/views/greenhouse/**`
- revisar tipos y contratos server-side relevantes

4. Elegir familia de patron
- primero seleccionar familia
- despues seleccionar instancia concreta del catalogo

5. Consultar `full-version` solo despues de elegir familia
- inspeccionar solo la referencia necesaria
- no abrir paginas demo completas si el patron ya quedo decidido

6. Decidir destino de implementacion
- `src/components/greenhouse/*` si la primitive repetira
- `src/views/greenhouse/<modulo>/*` si la composicion es modulo-especifica
- `src/views/greenhouse/admin/**` si es una superficie admin local todavia no reusable

7. Emitir recomendacion operativa
- patron principal
- alternativa aceptable si existe
- referencias `full-version`
- target local
- anti-patrones
- checklist de validacion

## Reglas de seleccion por tipo de senal

### Persona, owner, equipo pequeno
Usar:
- `Avatar`
- `AvatarGroup`
- badges de estado
- roster o list compacta

Evitar:
- tablas si solo hay 2 a 6 personas
- cards grandes por persona

### KPI compacto
Usar:
- mini-stat
- card-statistics horizontal

Evitar:
- charts grandes
- copy larga

### Tendencia corta
Usar:
- trend card con sparkline, line o area corta

Evitar:
- chart ancho si solo existe 1 punto
- mini dashboard dentro de una card

### Salud o completitud
Usar:
- radial o progress-led card
- short legend rows

Evitar:
- parrafos explicativos como senal principal

### Inventario o tooling
Usar:
- executive list card
- compact rows con logo, categoria y provenance

Evitar:
- tabla pesada
- cards visualmente identicas sin jerarquia

### Muchas filas con filtros o acciones
Usar:
- table card
- toolbar superior
- `OptionMenu` para acciones secundarias

Evitar:
- cards repetidas por fila
- esconder CTA primaria dentro de overflow

### Detail page de identidad, usuario o tenant
Usar:
- left overview card
- right sections o tabs segun complejidad
- timeline real cuando haya eventos validos

Evitar:
- copiar toda la demo de Vuexy sin reinterpretar semantica

## Reglas de promotion a shared

Promover a `src/components/greenhouse/*` cuando el patron:
- aparece o aparecera en mas de una ruta
- expresa un contrato visual de producto y no solo una necesidad local
- ayuda a estabilizar altura, spacing o jerarquia entre surfaces
- puede recibir datos normalizados sin acoplarse a una entidad puntual

Mantener local cuando:
- el patron depende de una sola surface admin
- mezcla layout con semantica de una pantalla puntual
- todavia no hay evidencia de reutilizacion

## Contrato de salida del orquestador

Toda recomendacion debe devolver, como minimo:

### 1. Request normalization
- source actor
- surface
- page intent
- data shape
- data quality
- action density
- repeatability

### 2. Recommended pattern
- familia
- componente o referencia principal
- por que encaja

### 3. Local target
- shared vs route-local
- paths sugeridos en `starter-kit`

### 4. `full-version` references
- rutas concretas a inspeccionar
- no mas de 1 a 3 referencias por solicitud

### 5. Guardrails
- provenance obligatoria
- limites por fuente de verdad
- anti-patrones

### 6. Validation
- `lint` o `build` si aplica
- visual QA autenticado si toca layout, fold o jerarquia

## Contrato multi-agente

Cuando la solicitud venga de Claude, Codex u otro agente:
- no asumir que el agente upstream ya eligio bien el patron
- extraer de su texto la necesidad real
- corregir implicitos que choquen con Greenhouse
- devolver una recomendacion apta para implementacion, no solo opinion

La entrada upstream puede incluir:
- una tarea textual
- un diff propuesto
- una idea de pantalla
- una referencia Vuexy
- una duda del tipo "que componente deberia usar"

En todos los casos, el orquestador debe producir el mismo tipo de salida estructurada.

## Anti-patrones

- copiar paginas completas de `full-version`
- elegir widgets por parecido visual y no por senal
- mezclar varios patrones pesados en la primera fila
- usar charts cuando una mini-stat o lista explica mejor
- volver autoritativa una senal `seeded` o `override`
- crear primitives nuevas si una de Greenhouse ya cubre el caso
- esconder decisiones de calidad de dato

## Checklist minimo antes de implementar

1. La solicitud ya fue normalizada
2. Existe una familia de patron dominante
3. Se revisaron las primitives locales antes de abrir `full-version`
4. El target shared vs local ya esta decidido
5. Si la data es parcial, la UI puede mostrar procedencia
6. La vista no empuja a Greenhouse a un workflow de edicion

## Primeras superficies objetivo

Este sistema debe aplicarse primero a:
- `/dashboard`
- `/admin/tenants/[id]`
- `/admin/users`
- `/admin/users/[id]`
- futuras superficies `/equipo` y `/campanas` solo cuando su capa semantica exista

## Resultado esperado

La combinacion correcta para Greenhouse es:
- catalogo curado
- reglas de orquestacion
- brief de entrada normalizado
- skill reusable por agentes

No una IA opinando libremente sobre MUI.
