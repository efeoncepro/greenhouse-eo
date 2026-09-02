# Ciclo de vida de una superficie viva

Esta es la parte que la literatura casi no cubre: qué pasa después de que la v1 embarca. Varias de
las respuestas de abajo son **"la industria no lo ha resuelto"**, y decirlo es más útil que
inventar una buena práctica para tapar el hueco.

## Versionar tools: no existe, y es una decisión

🔴 **No hay mecanismo de versionado de tools en el spec, y no es un olvido.** Se propusieron tres
SEPs y los tres quedaron cerrados sin avanzar, con el argumento de que el versionado pertenece al
nivel de servidor o endpoint, no de tool. En cinco servidores grandes no se encontró **ninguna**
tool `_v2`.

⚠️ **`_meta` no es un portador seguro** para colgar ahí tu propio versionado: hay conversores de
tools en librerías populares que leen exactamente tres campos y descartan el resto.

**Qué hacer entonces:** versiona en el **servidor o el endpoint** (rutas, toolsets, parámetro de
configuración), no en el nombre de la tool. Y asume que tu contrato de compatibilidad hacia el
agente es más débil que el de una API tipada, porque el consumidor **memoriza** la superficie.

## Qué es un cambio rompiente para un AGENTE

No es lo mismo que para un cliente tipado. Rompe:

- Renombrar o quitar una tool que un agente ya aprendió.
- Quitar un campo de la respuesta que el flujo documentado usaba como handle.
- **Cambiar la descripción** (ver `tool-surface-design.md`): mide 16,67% de regresión en un
  estudio con revisión, e invalida el cache de prompt completo.
- Cambiar el significado de un argumento sin cambiar su nombre.

No rompe: agregar una tool, agregar un campo opcional, agregar un valor a un enum **si el agente
no tiene que enumerarlos**.

## Deprecar: nadie promete fechas, y eso es el hallazgo

🔴 **No se encontró ni un solo sunset fechado de una tool individual en toda la industria.** Los
compromisos más fuertes publicados son *"por ahora"* y *"en un cambio posterior"*. Hay quien
publica una fecha dura de v1→v2 **sin mapa de tools**. Una ventana de retiro confirmada fue de
~2 meses, contra los 12 meses que MCP se aplica **a sí mismo**.

⚠️ **El alias de renombrado es una trampa conocida.** En al menos un servidor grande, los alias
resuelven durante la SELECCIÓN de inventario, y `tools/list` publica sólo el nombre canónico: eso
da compatibilidad de **despliegue**, no de **llamada**. Un agente que memorizó el nombre viejo
sigue roto. Verificado además que el aviso de deprecación prometido **nunca se invoca fuera de los
tests**, y que el ejemplo de la propia guía **no está en el mapa embarcado** — la red de seguridad
faltaba justo donde ocurrió el corte más grande.

**El único patrón encontrado que sirve a un agente con la superficie memorizada:** dos pasos —
sácala de `tools/list`, pero **déjala llamable** un tiempo, devolviendo una guía de migración.

**Regla mínima defendible, a falta de consenso:**

1. Anuncia en la descripción y en el manual, no sólo en el CHANGELOG.
2. Saca de `tools/list`, mantén llamable, responde con la ruta de migración.
3. Recién entonces retira. Y pon la fecha, aunque nadie más lo haga.

## Drift: aquí sí hay convergencia

**`generate && git diff --exit-code`.** Varios equipos llegaron a lo mismo por su cuenta: el
inventario se GENERA por introspección del servidor real y se commitea; CI regenera y falla si el
diff no está vacío.

🔴 **La regla transferible que casi todos aprenden tarde: CI debe FALLAR ante un snapshot
faltante, jamás crearlo.** Una línea base que se auto-repara pasa para siempre y no detecta nada.

Corolarios:

- Los `inputKeys` y las descripciones del artefacto salen de **introspección**, nunca de
  transcripción a mano. Un espejo escrito a mano diverge en silencio.
- Si la superficie es función de flags o configuraciones, hay que diferenciar **todas** las
  configuraciones, no una.
- ⚠️ **Nadie valida la superficie contra la API real del producto.** Toda la herramienta de
  paridad que existe es MCP-contra-MCP. Ese hueco es tuyo si lo quieres cerrar: la prueba más
  fuerte es ejercitar la lane real contra un deployment real y confirmar que devuelve **los mismos
  números** que la superficie humana.

## Gates baratos que sí se sostienen

Lo mejor que se encontró **no son scripts de CI a medida: son tests unitarios comunes**. Sin
modelo, sin red, deterministas, y por eso nadie los desactiva:

```
test("toda tool declara las 4 annotations")           // ausencia = hueco silencioso
test("ninguna descripción supera N caracteres")       // N=2048 en un caso real, por un cliente que corta en 1024
test("el conteo de tools visibles no supera el techo")
test("toda tool nueva tiene caso en el fixture del eval")
```

Sumado a eso, **presupuesto de tokens como gate**: dos equipos independientes lo miden en CI; uno
**falla el build ante un aumento del 5%**, el otro publica el delta por tool en el PR. Disparadores
de investigación de un caso real: total sube >10% sin tools nuevas; una sola tool pasa 1.000
tokens; una tool nueva agrega >500.

🔴 **NUNCA hagas gate de merge algo no determinista.** Un eval que llama a un modelo cuesta dinero
y varía solo; un gate así se pone rojo sin que nada haya cambiado, y la respuesta humana siempre
es reintentar hasta que pase. Así muere un gate. Separa: el eval produce el **número** que se
reporta; un test determinista garantiza que el número **sigue midiendo la superficie completa**.

## Observabilidad

- El `logging` del protocolo **está deprecado** (`2026-07-28`). El reemplazo es `stderr` +
  OpenTelemetry, con `traceparent` en `_meta`.
- Consenso real sobre redacción: **loguea el NOMBRE de la tool; trata los ARGUMENTOS como opt-in**
  — el spec, OTel y todos los defaults de vendor los dejan apagados.
- 🔴 **En stdio, nada que no sea un mensaje MCP puede llegar a stdout.** Un `print()` perdido
  corrompe el stream y se presenta como un bug del cliente.

## Distribución

El registro oficial es **sólo metadata**, está en **preview**, usa versiones inmutables más un
único campo `status` mutable, y **no soporta servidores privados**. Si tu servidor es interno, el
registro no es tu canal.
