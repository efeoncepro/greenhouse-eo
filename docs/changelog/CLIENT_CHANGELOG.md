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
