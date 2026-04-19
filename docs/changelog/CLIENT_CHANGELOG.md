# CLIENT_CHANGELOG.md

Changelog client-facing de Greenhouse.

Este documento resume cambios visibles para usuarios, stakeholders internos y clientes.
No reemplaza `changelog.md` del repo, que sigue siendo el registro interno técnico-operativo.

## Cómo leer este changelog

- `Canal` indica la madurez de la capacidad (`alpha`, `beta`, `stable`)
- `Disponible para` indica el alcance real (`internal`, `pilot`, `selected_tenants`, `general`)
- el foco está en módulos y capacidades visibles, no en refactors internos
- las versiones de este changelog siguen `CalVer + canal`; `SemVer` queda reservado para APIs o contratos técnicos versionados
- cuando exista Git tag asociado, usar la misma versión base en el namespace correspondiente (`platform/`, `<module>/`, `api/<slug>/`)

## Plantilla recomendada

```md
## 2026.03-beta.1

**Canal:** Beta
**Fecha:** 2026-03-29
**Disponible para:** internal
**Módulos:** Home / Nexa, Admin Center

### Novedades

- ...

### Mejoras

- ...

### Correcciones

- ...

### Notas

- ...
```

---

## 2026.04-beta.21

**Canal:** Beta
**Fecha:** 2026-04-19
**Disponible para:** internal
**Módulos:** Finanzas / Contratos / Acuerdos marco

### Novedades

- Finanzas ahora tiene una lane nueva de **Acuerdos marco** para registrar el marco legal reusable de clientes enterprise y ver qué contratos operan bajo ese acuerdo.

### Mejoras

- La ficha de contrato ahora puede mostrar el MSA asociado y enlazarlo directamente, en vez de dejar esa relación fuera del portal.
- El acuerdo marco conserva sus cláusulas legales versionadas y el documento firmado dentro del vault privado de Greenhouse.

### Correcciones

- Los contratos post-venta ya no quedan amarrados solo a un `space` legacy cuando el anchor comercial vigente es la organización del cliente.

### Notas

- La base de firma electrónica queda integrada con ZapSign para ambientes que publiquen sus credenciales; el rollout visible depende de la configuración de secretos en cada entorno.

## 2026.04-beta.20

**Canal:** Beta
**Fecha:** 2026-04-17
**Disponible para:** internal
**Módulos:** Nexa / Pulse / Space 360 / People

### Novedades

- Sin surfaces nuevas en esta entrega; la mejora entra sobre las vistas actuales de `Nexa Insights`.

### Mejoras

- Las referencias a proyectos dentro de `Nexa Insights` ahora priorizan el nombre visible del proyecto cuando Greenhouse puede resolverlo desde el contexto real del Space.

### Correcciones

- `Pulse`, `Space 360` y `Person 360` ya no deberían mostrar UUIDs o IDs técnicos de proyecto dentro de narrativas y menciones de Nexa.
- Cuando Greenhouse todavía no puede resolver el nombre del proyecto, Nexa degrada la referencia a una frase humana (`este proyecto`) en vez de exponer un identificador opaco.

### Notas

- Esta corrección reutiliza la infraestructura actual de `Nexa Insights`; no agrega rutas ni navegación nueva.

## 2026.04-beta.19

**Canal:** Beta
**Fecha:** 2026-04-17
**Disponible para:** internal
**Módulos:** Admin Center / Identity / Home

### Novedades

- `Admin Center` ahora permite gobernar permisos granulares desde una sola surface: catálogo de capabilities, defaults por rol, excepciones por usuario y política de inicio.

### Mejoras

- `Admin Center > Usuarios > Acceso` ahora explica qué permisos tiene una persona y de dónde vienen, en vez de obligar a inferirlo desde roles, vistas y excepciones dispersas.
- La política de `Home` y startup path ahora se puede ajustar desde Admin Center para casos puntuales sin tocar código.

### Correcciones

- La gobernanza de acceso ya no depende solo de cambios hardcodeados o ajustes manuales sobre la base de datos cuando hay que dar o retirar una capability puntual.

### Notas

- Esta entrega convive con el modelo actual de `roles`, `route groups` y `authorizedViews`; no lo reemplaza de una sola vez.

## 2026.04-beta.18

**Canal:** Beta
**Fecha:** 2026-04-16
**Disponible para:** internal
**Módulos:** Nexa / Email Delivery / Leadership

### Novedades

- Liderazgo interno ahora recibe un resumen semanal de `Nexa Insights` cada lunes a las 7:00 AM con los hallazgos operativos más relevantes de la última semana.

### Mejoras

- El digest ordena los insights por impacto antes de priorizar calidad y frescura, para dejar primero lo verdaderamente urgente.
- Las menciones a `Spaces` y `People` en la narrativa llegan con enlaces directos al portal para abrir contexto sin buscarlo a mano.

### Correcciones

- El resumen semanal ya no depende de abrir `Pulse` o `Agency > ICO Engine` para enterarse de los desvíos más importantes del período.

### Notas

- Esta entrega es interna y advisory-only.
- El corte actual es `ICO-first`: resume insights ya materializados y no agrega cálculos nuevos por email.

## 2026.04-beta.17

**Canal:** Beta
**Fecha:** 2026-04-16
**Disponible para:** internal
**Módulos:** Pulse / Nexa

### Novedades

- `Pulse` ahora destaca las 3 señales más críticas de `Nexa Insights` directamente en la landing de `/home`.

### Mejoras

- La home interna ya no obliga a entrar a `Agency > ICO Engine` para ver las alertas advisory más urgentes del período.
- Las narrativas visibles en `Pulse` reutilizan la misma capa de contexto de `Nexa Insights`, incluyendo menciones navegables a `Space 360` y `People`.

### Correcciones

- Las señales destacadas de Home ahora respetan un orden operacional explícito: `critical`, luego `warning`, luego `info`, antes de priorizar calidad y frescura.

### Notas

- Este bloque sigue siendo advisory-only: no ejecuta acciones automáticas ni reemplaza la lectura detallada de `Agency > ICO Engine`.

## 2026.04-beta.16

**Canal:** Beta
**Fecha:** 2026-04-16
**Disponible para:** internal
**Módulos:** HR / Permisos

### Novedades

- `Permisos` ahora permite a HR registrar vacaciones o ausencias ya tomadas cuando el periodo real no fue cargado antes en Greenhouse.
- `Permisos` ahora incorpora ajustes manuales auditables de saldo para corregir arrastres o regularizaciones históricas.

### Mejoras

- `HR > Permisos` ahora hace más visible el saldo del equipo y el contexto de política con que se interpreta cada balance.
- Las correcciones administrativas distinguen mejor entre un periodo real ya tomado y un ajuste contable de saldo.
- En vacaciones Chile, el detalle de saldo ahora separa mejor acumulado del año, arrastre y saldo actual para evitar lecturas ambiguas durante el primer ciclo laboral.

### Correcciones

- `HR > Permisos` ya no expone decimales infinitos en saldos administrativos de vacaciones; los montos visibles quedan redondeados y explicados con mejor contexto.
- `HR > Permisos` ahora muestra el avatar del colaborador en la vista de saldos del equipo cuando la identidad ya está resuelta en el portal.
- El detalle administrativo del colaborador ya no confunde períodos retroactivos cargados por HR con ajustes manuales de saldo, y deja una lectura más clara de ambas cosas.
- `HR > Permisos` ahora separa `Mis saldos` de `Saldos del equipo`, con búsqueda por colaborador, alertas operativas y detalle administrativo en vez de un listado plano difícil de operar.

### Correcciones

- Los cambios administrativos de vacaciones ya no quedan resumidos solo como un número agregado sin trazabilidad.
- Los saldos de vacaciones para Chile interno dejan de sembrarse como `15` días completos cuando la persona todavía está en su primer ciclo laboral; el saldo visible ahora respeta mejor la fecha de ingreso.

### Notas

- Esta entrega está pensada para operación interna de HR/admin.
- Cuando existen fechas reales, Greenhouse prioriza registrar el periodo tomado antes que inventar un ajuste manual.

## 2026.04-beta.15

**Canal:** Beta
**Fecha:** 2026-04-15
**Disponible para:** internal
**Módulos:** Agency / Servicios, Space 360, Admin Center

### Novedades

- `Servicios` ahora permite definir por servicio qué SLI se mide, cuál es su SLO y cuál es el SLA contractual asociado.
- `Admin Center` suma una vista `SLA de servicios` para revisar qué contratos ya están definidos y qué servicios quedaron en riesgo o breach.

### Mejoras

- `Space 360 > Servicios` ahora muestra el estado SLA de cada servicio sin obligar a abrir cada ficha por separado.
- La ficha del servicio distingue mejor entre cumplimiento real, datos parciales y ausencia de una fuente defendible.

### Correcciones

- Las definiciones sin source canónica ya no se presentan como si tuvieran una métrica válida; quedan visibles como `Datos parciales` o `Sin fuente`.

### Notas

- En esta primera entrega los indicadores soportados son `OTD`, `RpA`, `FTR`, `rondas de revisión` y `time to market`.
- `response_hours` y `first_delivery_days` siguen diferidos hasta contar con una fuente materializada por servicio.

## 2026.04-beta.14

**Canal:** Beta
**Fecha:** 2026-04-11
**Disponible para:** internal
**Módulos:** HR / Nómina

### Novedades

- Los contratos `Contractor (Deel)` y `EOR (Deel)` ahora pueden registrar `Bono conectividad` directamente dentro de la compensación vigente.

### Mejoras

- La conectividad Deel deja de depender de usar `Bono fijo` como campo genérico.
- El monto de conectividad ahora también entra al bruto/neto referencial que Greenhouse muestra para registros Deel.

### Correcciones

- `Nómina > Compensaciones` ya no pierde la conectividad al guardar o recalcular una compensación Deel.
- `Nómina proyectada` ahora muestra `Retención SII` de forma explícita para contratos `Honorarios` en CLP, evitando que el total de descuentos parezca inconsistente.

### Notas

- Deel sigue siendo el owner del pago final y compliance internacional; Greenhouse mantiene el registro operativo y los bonos KPI.

## 2026.04-beta.13

**Canal:** Beta
**Fecha:** 2026-04-11
**Disponible para:** internal
**Módulos:** HR / Organigrama / Mi equipo

### Novedades

- `Organigrama` ahora ofrece una lectura alternativa `Líderes y equipos` para seguir responsables visibles y las áreas que coordinan.

### Mejoras

- `Mi equipo` y `Aprobaciones` quedan visibles en el menú para perfiles internos que lideran personas aunque también tengan acceso amplio de HR/admin.

### Correcciones

- La navegación ya no obliga a un líder broad a conocer manualmente la route de `Mi equipo`.

### Notas

- La vista `Líderes y equipos` complementa al mapa estructural; no reemplaza la jerarquía formal de departamentos.

## 2026.04-beta.12

**Canal:** Beta
**Fecha:** 2026-04-10
**Disponible para:** internal
**Módulos:** HR / Organigrama

### Novedades

- `Organigrama` ahora mantiene el contexto visual del área incluso cuando una persona todavía no tiene adscripción estructural directa.

### Mejoras

- La búsqueda y el panel lateral conservan el contexto del área visible aunque la adscripción formal siga pendiente.
- Los responsables de área se presentan dentro de su departamento sin duplicarse como una persona hija de la misma área.

### Correcciones

- El organigrama deja de mostrar como raíces planas a personas que sí tienen contexto estructural visible.

### Notas

- La vista sigue priorizando estructura por áreas; la supervisoría formal se mantiene como dato contextual y ya no redefine las aristas visuales del organigrama.

## 2026.04-beta.11

**Canal:** Beta
**Fecha:** 2026-04-10
**Disponible para:** internal
**Módulos:** HR / Jerarquía / Organigrama / Departamentos

### Novedades

- `Organigrama` ahora representa la estructura real de áreas y equipos, no solo la cadena de supervisión entre personas.

### Mejoras

- Cuando asignas un responsable de área en `Departamentos`, su adscripción queda alineada con la estructura visible en `Jerarquía` y `Organigrama`.
- Las personas con acceso supervisor-limited ya pueden descubrir `Organigrama` directamente desde el menú lateral cuando su scope lo permite.

### Correcciones

- `Cambiar supervisor` y `Reasignar reportes` ya muestran por qué no dejan guardar cuando falta la razón obligatoria.
- El historial auditado vuelve a mostrar correctamente el cierre temporal de líneas anteriores.
- La ficha HR deja de quedar atrasada después de un cambio de supervisor.

### Notas

- `Jerarquía` sigue siendo la surface administrativa; `Organigrama` queda como explorador visual de lectura sobre la misma fuente canónica.

## 2026.04-beta.10

**Canal:** Beta
**Fecha:** 2026-04-10
**Disponible para:** internal
**Módulos:** Finance / Cuenta accionista

### Novedades

- `Cuenta accionista` ahora puede enlazar movimientos contra egresos, ingresos y pagos reales sin pedir IDs escritos a mano.

### Mejoras

- El detalle de la cuenta ya muestra el origen con contexto útil y acceso directo al documento o pago real.
- Desde `Egresos` e `Ingresos` ya puedes abrir la creación del movimiento CCA con el contexto correcto cargado.

### Correcciones

- El portal deja de guardar vínculos ambiguos de CCA cuando el origen real no fue validado contra Finance.

### Notas

- `Liquidación` sigue siendo una capa derivada del origen real; no aparece como búsqueda principal en el drawer de creación.

## 2026.04-beta.9

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Agency / People / Capabilities / Creative Hub / ICO

### Novedades

- `Agency` y `People` ahora hacen más visible la confianza real detrás de varios KPIs `ICO`.

### Mejoras

- `People > Inteligencia` ahora muestra cuándo un KPI delivery está confiable, degradado o sin base suficiente.
- `Agency > ICO Engine` ahora resume la confianza del `Performance Report` mensual sin obligar a inferirla desde el texto ejecutivo.
- `Creative Hub` conserva mejor los límites de confianza de `throughput` al componer `Revenue Enabled`.

### Correcciones

- El portal deja de colapsar ciertas señales `ICO` a números “planos” cuando el engine ya traía metadata de confianza útil para evitar sobreinterpretación.

### Notas

- Esta entrega no crea entitlement nuevo ni schema nuevo; reusa los contratos trust-aware ya existentes del `ICO Engine`.

## 2026.04-beta.8

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Capabilities / Creative Hub / ICO

### Novedades

- `Creative Hub` ahora muestra una lectura inicial de `Design System` y `Brand Voice para AI` dentro del mismo bloque `CVR`.

### Mejoras

- La vista conecta esos aceleradores metodológicos con outcomes canónicos del engine en vez de abrir una narrativa paralela enterprise.
- `Brand Consistency` visible ahora prioriza el score auditado de `ico_engine.ai_metric_scores` cuando existe evidencia real.

### Correcciones

- El portal deja de reconstruir `Brand Consistency` con una heurística local cuando todavía no hay score auditado suficiente.

### Notas

- `Design System` sigue comunicado como acelerador `proxy`.
- `Brand Voice para AI` solo sube a señal `observed` cuando el carril auditado ya trae `brand_consistency_score`.

## 2026.04-beta.7

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Capabilities / Creative Hub / ICO

### Novedades

- `Creative Hub` ahora expone el primer bloque visible de `Creative Velocity Review (CVR)` dentro del portal.

### Mejoras

- La vista separa mejor drivers operativos, métricas puente y `Revenue Enabled`.
- La surface ya incluye una matriz visible de `Basic / Pro / Enterprise` y guardrails de narrativa para explicar qué puede comunicarse sin vender humo.
- `Revenue Enabled` ahora se alimenta desde un contrato `CVR` único, en vez de repartir semántica entre cards sueltas.

### Correcciones

- `Creative Hub` deja de tratar `CVR` como copy aspiracional sin wiring real.
- `Early Launch` ya no se sugiere como señal fuerte cuando la scope actual no trae evidencia suficiente de `TTM`.

### Notas

- La matriz por tier sigue siendo editorial: todavía no existe hard-gating comercial persistido para `Basic`, `Pro` o `Enterprise` dentro del runtime del portal.

## 2026.04-beta.6

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Capabilities / Creative Hub / ICO

### Novedades

- `Creative Hub` ahora muestra `Revenue Enabled` como un modelo de medición con policy de atribución visible, no como una cifra inferida desde heurísticas locales.

### Mejoras

- El bloque distingue mejor qué palancas tienen evidencia utilizable y cuáles siguen en `Estimado` o `No disponible`.
- `Revenue Enabled` deja explícito que `Iteration` y `Throughput` no equivalen automáticamente a revenue observado solo por tener buena señal operativa.

### Correcciones

- `Creative Hub` deja de presentar `OTD`, `RpA` y benchmarks de industria como si fueran evidencia suficiente de revenue incremental.
- La vista ya no sugiere `Early Launch` cuando la scope todavía no trae `TTM` canónico.

### Notas

- Esta es una policy inicial de medición: `Revenue Enabled` todavía no publica un total universal por tenant y solo podrá graduar a `Observed` cuando exista linkage defendible entre palanca y outcome económico.

## 2026.04-beta.5

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Campañas / Projects / ICO

### Novedades

- `ICO` ya expone `Brief Clarity Score` como contrato inicial a nivel proyecto.

### Mejoras

- `Time-to-Market` ahora puede reconocer un `brief efectivo` observado cuando existe una evaluación auditada válida del brief, en vez de depender siempre de proxies operativos.
- El reader de proyecto `ICO` ahora deja disponible `briefClarityScore` para consumers posteriores.

### Correcciones

- El sistema deja de tratar todo inicio de `TTM` como si tuviera la misma calidad de evidencia.
- Cuando no existe un score auditado de brief, la señal se mantiene degradada o no disponible en vez de simular evidencia observada.

### Notas

- Esta es una source policy inicial: todavía puede haber proyectos sin `BCS` auditado, y en esos casos la evidencia de `brief efectivo` seguirá cayendo a proxy operativo.

## 2026.04-beta.4

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Capabilities / Creative Hub / Projects / ICO

### Novedades

- `Creative Hub` ahora muestra `Iteration Velocity` desde un contrato canónico de `ICO`, no desde una heurística derivada de `RpA`.

### Mejoras

- La métrica ahora comunica una cadencia operativa real de iteraciones útiles cerradas en los últimos `30d`.
- El reader de proyecto `ICO` también expone `iterationVelocity`, dejando disponible el mismo contrato para consumers posteriores.

### Correcciones

- `Iteration Velocity` deja de reutilizar un proxy de `RpA` que podía confundir rework con capacidad real de iteración.
- El sistema ahora explicita cuando la señal sigue siendo `Proxy operativo` por falta de evidencia observada de mercado.

### Notas

- Mientras esta lane no tenga evidencia ads-platform o de mercado observada, la lectura debe entenderse como capacidad proxy habilitada por delivery y no como uplift confirmado de performance.

## 2026.04-beta.3

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Campañas / ICO

### Novedades

- `Campaign Detail` ahora muestra `Time-to-Market (TTM)` con su evidencia operativa de inicio y activación.

### Mejoras

- La vista ya no presenta `TTM` como un número aislado: acompaña el valor con el estado real del dato (`Canónico`, `Proxy operativo` o `Sin evidencia`) y una señal de confianza.

### Correcciones

- `TTM` deja de depender de narrativa implícita y pasa a explicitar qué fecha se usó para iniciar el conteo y qué evidencia se usó para marcar activación.

### Notas

- Mientras el contrato de `brief efectivo` siga en evolución, algunos `TTM` pueden aparecer como `Proxy operativo`; eso refleja la madurez real del dato y no un error visual del módulo.

## 2026.04-beta.2

**Canal:** Beta
**Fecha:** 2026-04-04
**Disponible para:** internal
**Módulos:** Agencia / Delivery / Pulse

### Novedades

- No aplica como capacidad nueva.

### Mejoras

- `Agency > Delivery`, `Agency > Pulse` y el scorecard `Agency > ICO Engine` ahora muestran el estado de confianza de los KPIs junto al valor, en vez de dejar que el usuario asuma que todo número visible es igual de confiable.

### Correcciones

- `OTD`, `RpA` y `FTR` ya distinguen explícitamente entre `Dato confiable`, `Dato degradado` y `Sin dato confiable`.
- Los KPIs de `Agency` dejan de apoyarse en semáforos locales que podían simplificar demasiado la señal cuando la muestra era parcial o insuficiente.
- Se corrigió además la forma de agregar algunos KPIs Agency-level para evitar lecturas engañosas al promediar porcentajes o `RpA` sin el peso operativo correcto.

### Notas

- Si un KPI aparece como degradado o sin dato confiable, eso ahora refleja la calidad real del insumo del `ICO Engine` y no un fallback visual silencioso del módulo `Agency`.

## 2026.04-beta.1

**Canal:** Beta
**Fecha:** 2026-04-03
**Disponible para:** internal
**Módulos:** Agencia / Delivery

### Novedades

- No aplica como capacidad nueva.

### Mejoras

- `Agency > Delivery` vuelve a mostrar `OTD` y `RpA` del mes en curso con cálculo live real del `ICO Engine`, en vez de depender de snapshots mensuales parciales o de cerrar la vista al último mes disponible.

### Correcciones

- Se corrigió un desvío visible donde algunos Spaces podían aparecer con `OTD` irrealmente bajo al leer un snapshot abierto del mes actual.
- La vista mantiene la semántica operativa de `mes en curso`, pero ahora con métricas reales recalculadas desde la base enriquecida de Delivery.
- Los KPIs de Delivery dejan además de tratar tareas en estados no terminales como si ya estuvieran completadas cuando venían con timestamps inconsistentes.

### Notas

- Si un `RpA` del mes actual sigue sin mostrarse para un Space específico, eso ya responde al dato real disponible en el período en curso y no a una lectura incorrecta del snapshot mensual.

## 2026.03-beta.3

**Canal:** Beta
**Fecha:** 2026-03-31
**Disponible para:** internal
**Módulos:** HRIS / Finanzas / Nómina / Plataforma

### Novedades

- Greenhouse ya tiene una foundation compartida de adjuntos privados para el portal, pensada para reutilizarse entre permisos, órdenes de compra, recibos de nómina y futuros módulos documentales.

### Mejoras

- `Permisos` y `Purchase Orders` ya quedaron preparados para usar un uploader unificado en vez de depender de URLs manuales.
- Los recibos y exportaciones de nómina convergen hacia el mismo contrato privado de archivos.
- `HR > Permisos` ahora deja abrir el respaldo adjunto directamente desde `Revisar solicitud`, sin depender de rutas ocultas o lectura técnica del registro.

### Correcciones

- Se deja explícito que los archivos sensibles no deben circular como links permanentes del bucket, sino bajo acceso autenticado del portal.
- `Permisos` ya no falla al adjuntar respaldos para usuarios internos cuyo contexto tenant llega sin `clientId`/`spaceId` materializados; el ownership del archivo se normaliza correctamente antes de enlazarlo a la solicitud.

### Notas

- La foundation shared ya corre sobre infraestructura dedicada en `staging` y `production`; la adopción visible seguirá avanzando por módulo a medida que cada consumer migre su flujo completo de adjuntos.

## 2026.03-beta.2

**Canal:** Beta
**Fecha:** 2026-03-31
**Disponible para:** internal
**Módulos:** Agencia / Staff Augmentation

### Novedades

- No aplica como capacidad nueva.

### Mejoras

- `Crear placement` en `Agency > Staff Augmentation` vuelve a abrirse como drawer sobre el listado, manteniendo soporte de deep-link para abrir el flujo con `assignmentId`.

### Correcciones

- Se mantiene el carril seguro de apertura después del repair de Postgres y se evita depender de una página-card separada para iniciar el alta.

### Notas

- El flujo conserva búsqueda incremental, lectura contextual del assignment y creación del placement sobre el modelo canónico vigente.
- La experiencia vuelve a ser lateral y contextual dentro de `Agency > Staff Augmentation`.

## 2026.03-beta.1

**Canal:** Beta
**Fecha:** 2026-03-29
**Disponible para:** internal
**Módulos:** Plataforma Greenhouse, Payroll, Home / Nexa, Admin Center, HRIS

### Novedades

- Greenhouse formalizó un esquema de releases por módulo con canales `alpha`, `beta` y `stable`.

### Mejoras

- Se definió un changelog client-facing separado del changelog técnico interno.
- Se fijó una convención de tags para plataforma, módulos y APIs.

### Correcciones

- No aplica como release funcional de producto; esta entrada actúa como baseline operativa inicial del esquema de versionado.

### Notas

- Estado inicial sugerido por módulo:
  - `Payroll official` = `2026.03` (`stable`)
  - `Projected Payroll` = `2026.03-beta.1`
  - `Home / Nexa` = `2026.03-beta.1`
  - `Admin Center` = `2026.03-beta.1`
  - `HRIS` = `2026.03-alpha.1`
- Los tags reales deben salir desde un commit limpio; esta entrada no implica que todos los tags ya hayan sido creados en Git.

## Bootstrap

Esta primera entrada funciona como baseline inicial del sistema de releases.

Cuando un módulo o feature visible cambie de canal o tenga un lote de cambios que merezca comunicación externa, agregar una nueva entrada arriba siguiendo la plantilla.
