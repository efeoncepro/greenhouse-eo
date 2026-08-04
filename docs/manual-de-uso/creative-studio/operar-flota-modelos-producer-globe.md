# Operar la flota de modelos del Producer

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-07-25 por Claude (TASK-1554)
> **Ultima actualizacion:** 2026-08-04 por Claude (TASK-1641)
> **Documentacion funcional:** [Flota de modelos del Producer](../../documentation/creative-studio/efeonce-globe-producer-flota-modelos.md)

## Para qué sirve

Para responder, con evidencia y no de memoria, tres preguntas que aparecen seguido:

- ¿Por qué este modelo no aparece / aparece como "Próximamente"?
- ¿Cómo hago que un modelo nuevo llegue al Producer?
- ¿Por qué Nexa dice una cosa y la pantalla otra? *(spoiler: no puede pasar — si pasa, es un bug real)*

## Antes de empezar

- El reader es **read-only**. Nada de lo que hagas acá cambia disponibilidad: la disponibilidad la
  produce la **promoción** (ADR-009), que es otro proceso.
- Necesitas la capability `globe.producer.catalog.read`.
- El estado por modelo se lleva en
  [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md).
  **Léelo primero**: es la causa más común de concluir mal, porque un modelo puede estar integrado y
  verificado en el Model Lab y aun así no estar promovido a producción.

## Diagnóstico: "este modelo no aparece como disponible"

Recorre en este orden. Cada paso descarta una causa distinta, y saltearse el primero es de dónde
salen la mayoría de los diagnósticos equivocados.

**1. ¿Existe la ruta en el catálogo?**
Si el modelo no tiene ruta declarada, ningún consumer puede nombrarlo. Ya pasó: cinco capacidades
tenían modelos integrados y verificados desde julio **sin ninguna ruta**, así que eran invisibles en
todas las superficies. El problema estaba upstream de la interfaz.

**2. ¿Está promovido para *este* workspace?**
La disponibilidad es **por workspace**. Promovido en A no es promovido en B. Un modelo funcionando
perfecto en un espacio puede estar en "Próximamente" en otro, y eso es correcto.

**3. ¿Está el binding habilitado?**
Promovido pero no habilitado ⇒ no entra a la flota.

**4. ¿Aparece como "Bloqueado"?**
Entonces hay una dependencia externa y **la razón viene escrita en el propio dato**. Leela antes de
investigar: suele nombrar exactamente qué falta.

## Diagnóstico: "aparece pero no lo puedo ejecutar"

Distingue dos situaciones que se parecen y no son lo mismo:

- **"Necesita cuadros" / "Necesita una imagen para editar"** → el modelo **está disponible**; le falta
  un insumo. Elegirlo te lleva al modo donde se lo puedes dar.
- **"Próximamente" / "Bloqueado"** → no es ejecutable, y no hay nada que puedas hacer desde la
  pantalla.

La distinción no es cosmética: un modelo ofrecido como ejecutable donde no puede correr
**reservaría crédito y fallaría después**. Si ves eso, es un bug y hay que reportarlo.

## Agregar un modelo a la flota

1. Declarar la ruta en el catálogo del Producer (`PRODUCER_ROUTE_CATALOG`), **contra lo que el
   adapter realmente transporta**, no contra lo que uno supone que soporta.
2. Registrar una versión de rate vigente y el binding exacto de provider/modelo/endpoint.
3. Ejecutar la evaluación exacta y cerrar los criterios humanos; publicar la evidencia de derechos
   comerciales aplicable a la ruta.
4. Promover readiness y binding mediante las identidades separadas de ADR-009/010; cerrar el circuito
   sólo después de verificar el endpoint.
5. Verificar el reader `globe.producer.fleet.list`.
6. Ejecutar una generación real desde Producer y comprobar estado terminal, gasto, MIME, retención,
   vista previa y descarga.
7. Adjuntar el receipt transversal de TASK-1578, incluida la rate version vigente cuyo dueño es
   TASK-1468. Sin ese receipt, la ruta puede estar operativa, pero la task de onboarding no es cerrable.

No se edita ninguna pantalla. Si alguien pide "cablear el modelo en la UI", algo se desvió del
diseño. El procedimiento transversal completo y sus receipts pertenecen a `TASK-1578`; este manual
no crea un segundo ledger ni una segunda promoción.

> ⚠️ **El paso 6 no es una verificación opcional: es el sello de la promoción, y tiene ventana.** La
> generación real de la ruta exacta (*canary*) es lo que cierra la saga de ADR-009. Mientras no exista,
> la promoción está **activada pero no sellada** y **se revierte sola al vencer la ventana** — el modelo
> vuelve a "Próximamente" sin ningún error visible. Nadie puede declarar que el canary pasó: el servidor
> resuelve la evidencia (corrida, intento, output retenido y decisión de governance) por su cuenta.
> Medido el 2026-08-04: **10 de 12 promociones históricas terminaron revertidas**, varias segundos
> después de su vencimiento, porque el sello fallaba con un error genérico aun con la evidencia
> correcta. Ya está corregido (ver el Delta 2026-08-04 del
> [ADR-009](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md)),
> pero la regla operativa queda: **planifica el canary dentro de la ventana, no “para después”**. Si la
> ruta exige referencias de imagen, verifica **antes** que puedes aportarlas desde el Producer: hoy los
> dos caminos para aportarlas están rotos, así que el canary de `ref/video/frames-v1` (Veo 3.1) —sellado
> el 2026-08-04— tuvo que producirse por el **carril gobernado**, no desde el Producer. La promoción quedó
> sellada y la ruta habilitada, pero generar desde el Producer un modelo que exige referencias todavía no
> funciona.

### Canary Recraft v4.1 de referencia

- Ruta: `ref/still/vector-v1`.
- Resultado esperado: `image/svg+xml`, 4 créditos, `completed/retained`.
- Evidencia UI: modelo Recraft v4.1, capacidad `Imagen · vectorizar`, estado `Guardada`, vista previa
  SVG y descarga habilitada.
- Gotcha verificado: Fal declara el archivo como SVG, pero su CDN puede transportarlo como
  `application/octet-stream`. No relajes MIME globalmente; la ruta admite ese transporte sólo tras
  verificar que los bytes realmente forman un SVG.

### Canary Nano Banana 2 de referencia

- Ruta: `ref/still/nanobanana-2-v1`.
- Resultado esperado: `image/png`, 10 créditos, `completed/retained`.
- Evidencia UI: run `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`, modelo Nano Banana 2 y estado `Listo`.
- Gotcha verificado: el prefijo durable `vertex-output:` tiene 14 caracteres. Globe `1fb5728`
  deriva el corte desde la longitud del prefijo y recuperó el mismo run idempotentemente. No
  reejecutes un run pagado para corregir su finalización.

### Canaries OpenAI de referencia

- GPT Image 2: `ref/still/openai-v2`, run
  `a81c8049-7772-4933-82f2-1e2e59e5121c`, 14 créditos.
- GPT Image 1.5: `ref/still/openai-v1-5`, run
  `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a`, 10 créditos.
- Ambos usan el driver gobernado oficial de OpenAI Images. Verifica que el asset herede la versión
  efectiva de derechos fijada antes del gasto; no uses una policy expirada ni una lookup posterior
  no anclada al snapshot del run.

### Promoción Nano Banana Pro de referencia

- Ruta: `ref/still/nanobanana-pro-v1`; modelo `gemini-3-pro-image`; región `global`.
- Canary base: experimento `a258dda8-ea6e-4a34-94f0-4cd9ca301d17`, 10 créditos,
  `image/png`, SHA-256
  `9e9edaf59cb927610d043e3af3cac9b90c321ed48e55eb34ec0300c72dc429cf`.
- El 2026-07-30 la revisión humana, readiness y binding quedaron promovidos y el selector live pasó
  a `Disponible`. No vuelvas a seguir el baseline histórico que lo describe como
  `gated/not_promoted`.

## Verificar

```bash
# Contrato + proyección + tests (desde efeonce-globe)
pnpm check

# Los invariantes de la flota
node --experimental-strip-types --test packages/domain/src/producer-fleet.test.ts
```

Los tests cubren: derivación de disponibilidad (promovido→disponible, no promovido→excluido), alcance
por workspace, recomendado honesto, y que **el identificador del proveedor nunca sale en el payload**.

## Qué NO hacer

- **NUNCA** cablear una lista de modelos en una pantalla, ni en el Producer, ni en Nexa, ni en una
  integración. Ese es exactamente el trabajo que este contrato elimina, y reintroducirlo hace que
  agregar un modelo vuelva a costar una edición por superficie.
- **NUNCA** reconstruir la disponibilidad por tu cuenta desde readiness o binding. Hay **un** reader;
  un segundo cálculo diverge del primero y nadie se entera hasta que un usuario ve dos respuestas
  distintas.
- **NUNCA** exponer el identificador interno del proveedor, el costo ni el margen. El nombre público
  del modelo sí va.
- **NUNCA** preseleccionar un modelo recomendado que no esté disponible. Una recomendación que no se
  puede ejecutar es peor que ninguna.
- **NUNCA** ocultar un modelo no disponible. Muéstralo con su estado: invisible y bloqueado se sienten
  igual de mal, pero invisible además impide preguntar.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El modelo no aparece en ninguna modalidad | No tiene ruta en el catálogo | Declarar la ruta (paso 1 de "Agregar") |
| Aparece en un workspace y no en otro | Comportamiento correcto: promoción por workspace | Promover donde haga falta |
| Dice "Próximamente" y sabes que funciona | Verificado en el Model Lab, **no promovido** a producción | Revisar el ledger; promover si corresponde |
| **Estaba disponible y dejó de estarlo**, sin error ni cambio de modelo | La promoción venció **sin su canary** y se revirtió sola (binding deshabilitado, circuito abierto) | Volver a promover y **sellar el canary dentro de la ventana**; si el sello falla con un error genérico, es defecto de plataforma, no falta de evidencia |
| Nexa y la pantalla muestran distinto | **Un consumer se armó su propia lista** | Bug: buscar el cálculo paralelo y borrarlo |
| Falla después de reservar crédito | Se ofreció ejecutable donde no puede correr | Bug: reportar con la ruta y el modo |
| Un run pagado queda sin finalizar tras un fix | El proveedor terminó, pero falló la reconciliación local | Leer el run/attempt y recuperar idempotentemente; no generar otra vez |
| SVG llega como `application/octet-stream` | Transporte genérico del CDN de Fal | Aceptar sólo si la ruta espera SVG y los bytes verifican como SVG; nunca relajar MIME globalmente |

## Estado operativo de la flota de imagen

Al 2026-07-30 están disponibles y ejercitadas desde la UI las seis rutas de imagen: Seedream 5 Pro,
Nano Banana Pro, Nano Banana 2, GPT Image 2, GPT Image 1.5 y Recraft v4.1. El selector vigente es un
desplegable compacto; la antigua dirección de galería no se usa.

El único pendiente de TASK-1553 es documental/gobernante: receipts de rate-version TASK-1468 y
onboarding TASK-1578. No uses ese pendiente para diagnosticar estas rutas como no promovidas.

## Referencias técnicas

- Contrato: `efeonce-globe/packages/contracts/src/producer-fleet.ts`
- Proyección y tests: `packages/domain/src/producer-fleet.{ts,test.ts}`
- Ledger de estado: [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md)
- Consumer UI: `TASK-1555` (selector compacto del Producer)
