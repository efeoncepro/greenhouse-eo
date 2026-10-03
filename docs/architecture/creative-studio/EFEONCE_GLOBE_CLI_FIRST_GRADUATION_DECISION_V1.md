# ADR-024 — CLI primero, graduación a Globe con núcleo compartido

> **Tipo:** decisión de arquitectura (ADR) · Globe / Creative Studio + carril CLI de Greenhouse
> **Status:** **Accepted** (2026-10-03) — decisión del operador (Julio Reyes)
> **Date:** 2026-10-03
> **Owner:** Creative Studio (Globe) para el destino; AI Tooling de Greenhouse para el carril CLI
> **Scope:** `scripts/ai/**` y `scripts/foto/**` (carril CLI out-of-band), el Creative Workbench que los consume, y
> toda capacidad creativa que se lleve a Globe (`CapabilityRegistry`, adapters de proveedor, Model Lab, Evaluation
> Harness, promoción de rutas)
> **Reversibility:** `two-way` para el proceso (es una regla de cómo se construye); `two-way-but-slow` para el paquete
> compartido una vez publicado y consumido por dos repos
> **Confidence:** `high` en la regla de secuencia y en la frontera; `medium` en el hogar y el mecanismo del paquete
> (pregunta abierta §9)
> **Validated as of:** 2026-10-03 — carril CLI medido en TASK-1965 y TASK-1973 (canarios reales); arquitectura de
> Globe contrastada con el overlay `arch-architect/globe-overlay.md` (G1–G13) y este índice
> **Relacionados:** [ADR-010 promoción comercial](EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md) ·
> [ADR-013 rutas](EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md) ·
> [ADR-022 contrato creativo por ruta](EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) ·
> [Creative Workbench](../EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md) ·
> [Media Foundry (superseded)](../GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_DECISION_V1.md) ·
> [Pipeline de inpainting](../GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) ·
> [Selección de modelos](../GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) ·
> [Modelo operativo de trabajo nuevo modular](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md)

## Decisión, en una frase

**Una capacidad creativa nueva se prueba primero en el carril CLI —donde equivocarse cuesta centavos— y se lleva a
Globe sólo cuando cumple el criterio de graduación; al graduarse, su núcleo determinístico pasa a un paquete
compartido que el CLI y Globe consumen por igual, y los adaptadores de proveedor NO se copian: Globe los acuña bajo su
propio contrato.**

## 1. Contexto

- **Globe consumía costo antes de mostrar valor.** El operador empezó por Globe (Creative Studio, producto comercial,
  ADR-010) y la infraestructura —Cloud Run activo, base, workers, releases— se gastaba antes de que hubiera piezas.
  Necesitaba producir ya.
- **El carril CLI sí produjo, y aprendió barato.** `pnpm foto:*`, `pnpm ai:image|fal|omni`, `pnpm ai:mask`,
  `pnpm ai:layers` y `pnpm ai:inpaint` sacaron piezas reales. Sólo en TASK-1973 los canarios destaparon y corrigieron,
  con ≈ USD 0,98 en total: que la base de Layerize saca también la mesa y se cobra; que Flare reencuadra al expandir y
  Sunburst copia el relleno en espejo (default de `expand` = Flux Fill); que un modelo que llena máscaras dibuja otro
  objeto al borrar (default de borrado = clean plate o Sunburst por instrucción); y una regresión propia de pertenencia
  de sombras. Cada uno se habría pagado en Globe con despliegues e infraestructura activa.
- **Ya existe el síntoma de dos implementaciones.** `pnpm foto:expandir` (Sunburst, redibuja, piezas aprobadas de
  CMP-004) y `pnpm ai:inpaint expand` (Flux Fill, escena en delta 0) resuelven lo mismo con contratos distintos; unirlos
  quedó como decisión pendiente en TASK-1925. Es lo que pasa a escala si Globe reimplementa lo que el CLI probó.
- **Globe tiene su propia forma y su frontera es dura** (overlay G1–G13): plataforma par, sin base, sesión, bucket,
  secreto ni rol compartido con Greenhouse; toda capacidad nace con Full API Parity sobre el `CapabilityRegistry`
  (SPEC-001); un adapter por proveedor con su propio secreto (G8); rutas por modelo (ADR-013); tope de gasto con
  reserva antes de gastar (G9); Evaluation Harness que no elige ganador creativo (SPEC-003); promoción separada de la
  ejecución y con atestación de derechos (ADR-010).
- **Mientras dure EPIC-026/027**, una feature aislada no crea `packages/*`, servicios ni repos por anticipado: el
  hogar candidato es metadata hasta que una task aprobada lo materialice.

## 2. Decisión

### D1. Secuencia: CLI primero

Toda capacidad creativa nueva (generar, editar, componer, medir) se construye primero en el carril CLI out-of-band
(`scripts/ai/**`, `scripts/foto/**`), nunca importado por `src/app/**` ni por el runtime de `src/lib/**`. Se
construye **con forma de producto** desde el día uno (§D3), para que graduarla sea mover, no reescribir.

**Excepción:** lo que sólo tiene sentido dentro de Globe —tenencia por workspace, entrega a un cliente, aprobación
humana del cliente, promoción comercial— nace en Globe.

### D2. Qué se gradúa y qué no

| Pieza | ¿Se gradúa? | Cómo |
|---|---|---|
| **Núcleo determinístico**: máscaras, recomposición, verificación delta 0, recorte, alineación, geometría de capas, planificación de expansión, mediciones (residuo, sombra, reencuadre) | **Sí** | Paquete compartido versionado (§D5) que el CLI y Globe importan. Sin proveedor, sin secreto, sin I/O a servicios de Greenhouse |
| **Adaptadores de proveedor** (OpenAI, fal, Higgsfield…) | **No** | Globe acuña el suyo por proveedor bajo ADR-013/G8, con su propio secreto. El adaptador del CLI es **evidencia del contrato del proveedor** (campos, convención de máscara, rarezas, precios medidos), no código a copiar |
| **Orquestación del CLI** (flags, archivos en `ai-generations/`, caché local, `manifest.json`) | **No como código** | Su contrato se traduce al de Globe (§D4); el CLI conserva su orquestación |
| **Evidencia** (canarios, defaults medidos, modos de falla) | **Sí, como dato** | Alimenta golden briefs y rúbricas del Evaluation Harness y la ficha de ruta (ADR-023); **no reemplaza** la evaluación ni la atestación de Globe |

### D3. Criterio de graduación (los cinco requisitos)

Una capacidad pasa a Globe sólo cuando su carril CLI tiene:

1. **Canario real documentado** — corridas con proveedor real, resultados y costos en un `README` de canario.
2. **Contrato estable** — flags y artefactos JSON (manifiesto) con forma fija; un cambio incompatible sube versión.
3. **Defaults elegidos por medición** — cada default declara la evidencia que lo eligió (y qué alternativa perdió).
4. **Modos de falla con detector** — cada falla conocida tiene un detector y un código de salida (p. ej. `0` PASS ·
   `2` FAIL · `3` REVISAR); lo que el detector no ve está escrito como revisión humana obligatoria.
5. **Modelo de costo** — estimación antes de gastar, tope y costo real registrado por llamada.

Al llegar a Globe se suman sus condiciones propias, que este ADR no sustituye: ruta por modelo (ADR-013), contrato
creativo por ruta (ADR-022), atestación de derechos por modelo y promoción separada (ADR-010), Full API Parity al
nacer (SPEC-001).

### D4. Traducción CLI → Globe

| En el CLI | En Globe |
|---|---|
| Códigos de salida 0/2/3/1 | `outcome` del run + vocabulario cerrado `GlobeApiErrorCode` (con `retryable`) |
| `--dry-run` y estimación | Reader de estimación previewable (SPEC-006) |
| Tope `--max-usd` / `AI_COST_CONFIRM_USD` / `--yes` | Spend fence: `hardCapCredits` por run + `dailyCapCredits` por workspace, reserva antes de gastar (G9) |
| `manifest.json` (entradas, hashes, candidatos, veredicto) | Manifiesto/evidencia del run, durable y por workspace |
| `adapter.revision` en el hash de caché | Revisión de ruta; actualizar = subir versión dentro de una ruta (ADR-013) |
| Verificación delta 0 y detectores | `objectiveChecks` deterministas del Evaluation Harness; los `humanCriteria` siguen siendo humanos |
| Guarda de marca (logos nunca con IA) | Política de la capability (`policy_blocked` honesto) |
| README de canario | Golden brief + reporte de evaluación por contrato de fidelidad |
| Revisión al 100 % | Paso de aprobación humana (candidate → aprobación); **promoción ≠ entrega** |

### D5. Núcleo compartido: un paquete, nunca dos implementaciones

Al graduar, el núcleo se extrae a un paquete versionado y publicado bajo el scope `@efeoncepro` en GitHub Packages,
el mismo mecanismo de `@efeoncepro/axis-*`. **Nombre candidato:** `@efeoncepro/creative-core`. Requisitos:

- Domain-free y sin proveedor: no importa `@/lib/**`, no lee secretos, no hace red.
- Versionado semántico; el CLI y Globe **fijan** versión. Un cambio de comportamiento sube versión y se re-mide.
- Sus pruebas viajan con él. Los gates del consumidor **derivan** sus expectativas del estado que leen, no de
  literales del primer cliente (ejercicio del segundo consumidor).
- Tras la extracción, el CLI pasa a ser **un cliente más** del paquete, como el MCP y la UI de Globe. Retirarlo es una
  decisión explícita, no un abandono.

La extracción **requiere una task aprobada** (regla EPIC-026/027): este ADR fija el destino y el criterio, no crea el
paquete.

### D6. Postura de runtime en Globe

Estas operaciones son asíncronas y duran segundos o minutos. En Globe se ejecutan **por trabajo, con escala a cero**
y ciclo durable (receipt + outbox/worker, como ADR-019), **no** como servicio siempre activo. Es una guía de diseño:
el costo de base actual de Globe **no está medido** en este ADR (pregunta abierta §9).

### D7. Primer candidato: el pipeline de inpainting

TASK-1965 + TASK-1973 cumplen los cinco requisitos (canarios en `ai-generations/2026-10-02_task-1965-canary/` y
`ai-generations/2026-10-03_task-1973-canary/`; contrato y artefactos en la spec §Pipeline de inpainting).

| Graduable al paquete | Se queda en el CLI / se re-acuña en Globe |
|---|---|
| `raw.ts`, `mask.ts`, `recompose.ts`, `crop.ts`, `alignment.ts`, geometría de `sketch.ts`, geometría y selección de `layers.ts` (`selectLayers`, `maskFromLayer`, `plateWithoutLayers`, `otherObjectsMask`), mediciones de `techniques.ts` (`detectCastShadow`, `measureErasure`), `expand.ts` (`planExpansion`, `expansionMask`) | `adapters/**` (importan `@/lib/ai/*`, secretos de Greenhouse), `layerize-fal.ts`, los `cli.ts`, la caché y el layout en `ai-generations/` |

**Bloqueador de extracción conocido:** los adaptadores dependen de `@/lib/ai/*`, y `pipeline-image.ts` mezcla
orquestación con llamadas al adapter; hay que separar la orquestación pura del I/O antes de publicar el núcleo.

## 3. Alternativas consideradas

- **Construir directo en Globe.** Es lo que se intentó: el costo de infraestructura llegaba antes que el valor y
  cada aprendizaje costaba un despliegue. Rechazada.
- **Quedarse en CLI para siempre.** Sin superficie humana, sin entrega a clientes, sin aprobación; contradice que Globe
  es el producto comercial. Rechazada: el CLI es el taller, no el producto.
- **Que Globe llame al CLI de Greenhouse como servicio.** Viola la frontera G1 (secretos y runtime compartidos) y deja
  a Globe dependiendo de un carril out-of-band. Rechazada.
- **Copiar el código del CLI a Globe.** Dos implementaciones que divergen: es exactamente el caso `foto:expandir` /
  `ai:inpaint expand`. Rechazada.
- **No decidir.** Cada capacidad se llevaría a Globe a su manera; reaparecen las dos implementaciones y se repiten
  en Globe los errores ya pagados. Rechazada.

## 4. Consecuencias

### Positivas
- Los errores se pagan en centavos y se corrigen en el acto; Globe recibe decisiones medidas, no hipótesis.
- Producción real mientras se construye el producto.
- Un solo núcleo verificado sirve al CLI, al MCP y a la UI (Full API Parity a nivel de capability).

### Negativas
- Un paso de extracción por capacidad (y la disciplina de mantener el núcleo sin I/O desde el CLI).
- Coordinar versiones de un paquete entre dos repos.
- La evidencia del CLI no exime de la evaluación ni de la atestación de Globe: hay trabajo de Globe igual.

### Estructurales
- El carril CLI se diseña como antesala de Globe: manifiestos, códigos de salida y costo son parte del contrato.
- `foto:expandir` / `ai:inpaint expand` es el caso piloto de convergencia (TASK-1978).

## 5. Cuatro pilares

| Pilar | Cómo lo cubre |
|---|---|
| **Seguridad** | Frontera G1 intacta: el paquete no lleva secretos ni proveedores; Globe acuña sus adapters con secretos propios. La guarda de marca se traduce a política de la capability. El tope de gasto pasa a spend fence con reserva previa |
| **Robustez** | Los modos de falla llegan con detector y código (requisito 4); el núcleo viaja con sus pruebas; versión fijada en ambos consumidores |
| **Resiliencia** | Si Globe no está, el CLI sigue produciendo con el mismo núcleo; trabajos asíncronos con receipt/outbox en Globe; rollback = fijar la versión anterior del paquete |
| **Escalabilidad** | Trabajo por demanda con escala a cero en vez de servicio activo; un núcleo para N superficies; la evidencia del CLI escala como golden briefs |

## 6. Runtime contract (fuente de verdad)

- Regla de secuencia y criterio: **este documento**.
- Carril CLI: `scripts/ai/**`, `scripts/foto/**`; contrato del inpainting en
  [`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`](../GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
- Evidencia: los README de canario en `ai-generations/<fecha>_task-<id>-canary/`.
- Destino en Globe: `CapabilityRegistry` (SPEC-001), adapters (ADR-013/G8), Model Lab/Evaluation Harness
  (SPEC-002/003), promoción (ADR-009/010).
- Paquete compartido: **aún no existe**; nace con su task de extracción.

## 7. Reglas duras

- **NUNCA** construir directo en Globe una capacidad que puede probarse en el carril CLI, salvo lo que sólo existe en
  Globe (tenencia, entrega a cliente, aprobación, promoción).
- **NUNCA** copiar código del CLI a Globe ni reimplementar en Globe lo que el CLI probó: se gradúa el núcleo como
  paquete compartido.
- **NUNCA** graduar un adaptador de proveedor ni compartir un secreto: Globe acuña los suyos (G8).
- **NUNCA** que el núcleo compartido importe `@/lib/**`, lea secretos o haga red.
- **NUNCA** dar por evaluada en Globe una capacidad porque pasó sus canarios en el CLI: la evidencia alimenta el
  Evaluation Harness y la promoción, no los reemplaza.
- **SIEMPRE** construir el CLI con forma de producto: contrato estable, manifiesto JSON, códigos de salida, costo antes
  de gastar y canario documentado.
- **SIEMPRE** declarar en el README del canario qué default eligió cada medición y qué no ve el detector.
- **SIEMPRE** que una capacidad se gradúe, el CLI pase a consumir el mismo paquete, o se retire por decisión explícita.

## 8. Roadmap

1. **Ahora:** las capacidades nuevas siguen D1–D3. Sin cambios de runtime.
2. **Task de extracción del inpainting** (por crear, bajo EPIC-026/027): separar la orquestación pura del I/O en
   `pipeline-image.ts`, extraer el núcleo de §D7 a `@efeoncepro/creative-core`, que el CLI lo consuma y quede todo en
   verde.
3. **Task de Globe:** capability semántica de edición (p. ej. editar zona, borrar, expandir) sobre el paquete, con su
   adapter por proveedor, spend fence, golden briefs desde los canarios y su ruta.
4. **Convergencia de `foto:expandir`** en TASK-1978 (un solo motor de expansión con lo mejor de los dos), como primer caso de dos implementaciones resueltas.

## 9. Preguntas abiertas (deliberadamente no decididas)

- **Hogar del paquete:** qué repo lo publica (Globe, Greenhouse o uno propio, como AXIS) y quién es su dueño.
- **Costo base de Globe:** no se midió aquí. Antes de la task de Globe, medir la factura actual para dimensionar D6.
- **Creative Workbench:** si consume el paquete directamente o sigue recibiendo copias selladas por `creative:sync`.
- **Retiro del CLI:** si un CLI graduado se mantiene a largo plazo como herramienta interna o se retira.

## 10. Revisit when

- Globe tenga trabajo por demanda con costo base medido bajo, y probar directo allí cueste lo mismo que en CLI.
- Aparezca una capacidad que sólo puede probarse con tenencia o entrega a cliente.
- El paquete compartido genere más fricción de versiones que la que ahorra (dos o más incidentes de desfase).
