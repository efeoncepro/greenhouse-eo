---
name: mcp-craft
description: >-
  Skill del OFICIO de construir y mantener superficies MCP —domain-free, agnóstica de nuestro
  gateway—: diseño de tools para agentes (granularidad, presupuesto de contexto, naming,
  descripciones, forma de respuesta, errores), ciclo de vida de una superficie viva (versionado,
  deprecación, drift, gates baratos), primitivas del protocolo más allá de tools, seguridad y
  autorización, evaluación de la superficie, y un RADAR fechado del spec y del ecosistema. Úsala
  al diseñar una tool nueva, al discutir cuántas tools exponer, al escribir o revisar una
  descripción, al retirar o renombrar una capacidad publicada, al elegir entre tool/resource/
  prompt/elicitation, al montar un eval de superficie, o antes de afirmar qué dice el spec.
  Triggers - MCP, Model Context Protocol, tool surface, tools/list, inputSchema, outputSchema,
  structuredContent, annotations, readOnlyHint, elicitation, resource_link, server/discover,
  MRTR, tool budget, tool search, code mode, presupuesto de contexto, deprecar una tool.
  Para NUESTRO gateway (mcp.efeonce.org, federación, scopes Entra, Cloud Run) la dueña es
  `efeonce-mcp-platform`: esta skill es su base de oficio, no su reemplazo.
---

# MCP Craft — el oficio de una superficie agéntica mantenible

Esta skill es **domain-free**. Trata de qué hace mantenible a CUALQUIER servidor MCP. Nuestro
gateway, sus scopes, su federación y su runtime viven en `efeonce-mcp-platform`, que es
**consumer** de esta: cuando trabajes en `mcp.efeonce.org` carga las dos.

> **Fechado a 2026-09-02.** El protocolo se mueve rápido: entre mayo y julio de 2026 hubo una
> revisión que eliminó el handshake. Nada de lo que digas sobre el spec vale por memoria. Lee
> `protocol-radar.md` y, si la decisión es cara, **verifica contra la fuente antes de afirmar**.

---

## Antes que nada: la calidad de la evidencia

La literatura de MCP tiene un sesgo sistemático que cambia cómo se lee TODO lo demás:

🔴 **Las afirmaciones de TOKENS están medidas. Las de PRECISIÓN, casi nunca.**

Los ahorros de contexto son consistentes, grandes y reproducibles (3,25×–236,5× de inflación por
adjuntar MCP indiscriminadamente; 15–30 KB de esquema por sesión antes del primer mensaje). Pero
las dos pruebas controladas más limpias de si **reestructurar** la superficie mejora el ÉXITO de
la tarea encontraron: una, **ninguna ganancia** (90% vs 90% de aprobación, con 5× menos tokens);
la otra, **pérdida de precisión** en tareas de tres servidores por decisiones de orquestación
global durante la síntesis de código.

Y al revés: contra envoltorios 1:1 crudos, la evidencia sí es favorable y medida por terceros.

**Consecuencia práctica — la posición honesta, que no es la de ninguno de los dos bandos:**

- Curar una superficie cruda **sí** mejora la precisión. Medido.
- Reestructurar una superficie **ya curada** compra tokens y turnos, **no** precisión. Medido.
- Por lo tanto: **justifica un rediseño por presupuesto de contexto, jamás prometiendo precisión**
  que nadie ha demostrado. Prometer precisión es la afirmación que la literatura no sostiene.

**NUNCA** cites una cifra de esta skill sin su grado. `SOURCES.md` trae fuente, fecha y grado de
metodología de cada número, incluidas las que están mal medidas y por qué.

---

## Las reglas duras del oficio

### 1. La superficie es un CONTRATO, no una descripción

Una tool no es un endpoint documentado: es una pieza que un agente **compone** con otras. Eso
cambia dónde pueden vivir las reglas.

🔴 **NUNCA confíes en la prosa de una descripción para defender un invariante que se rompe ENTRE
dos llamadas.** Una descripción sólo gobierna lo que pasa dentro de su propia llamada. Si el
defecto aparece al componer dos tools, ninguna redacción lo ve. Esa regla necesita viajar como
**dato en el payload**, o como una lectura que haga lo correcto más barato que lo incorrecto.

**SIEMPRE** que identifiques una regla del tipo *"nunca mezcles A con B"*, pregunta: **¿dónde
ocurre la mezcla?** Si la respuesta es "entre dos llamadas", necesitas mecanismo, no redacción.

### 2. Toda cifra viaja con su naturaleza y su as-of

🔴 **NUNCA** emitas una magnitud por el contrato agéntico sin que el payload declare de qué
naturaleza es y cuándo se capturó. Un número sin as-of se lee como vigente para siempre.

🔴 **NUNCA** rotules un RESULTADO con una sola procedencia cuando su DTO mezcla fuentes. Un DTO
mixto con una lente única es mentira estructural aunque cada campo sea correcto. La procedencia se
declara **por sección o por campo**, en lista.

### 3. Una guarda es una afirmación hasta que un mecanismo la sostiene

Escribir la regla no la aplica. Y el mecanismo tiene que mirar **donde el defecto ocurre**, no
donde es cómodo mirarlo: una guarda que valida el lado federado no ve el registro interno, y las
dos superficies se contradicen bajo un verde.

Los mecanismos más baratos que existen son **tests unitarios comunes** — deterministas, sin
modelo, sin red. Ver `lifecycle-and-drift.md`.

### 4. Las `annotations` no son metadata: **restringen la granularidad**

Los defaults del spec son **pesimistas**: `readOnlyHint: false`, `destructiveHint: **true**`,
`idempotentHint: false`, `openWorldHint: **true**`. Omitirlas no es neutro — declara lo peor.

🔴 **SIEMPRE** declara las cuatro explícitamente (`true`/`false`, jamás ausentes), y hazlo
verificar por un test. Una hint ausente es un hueco silencioso.

🔴 **NUNCA** mezcles read y write en una misma tool. No es preferencia estética: si la combinas,
`readOnlyHint` debe ser `false`, y entonces el usuario queda entre auto-aprobar escrituras o
confirmar cada lectura a mano. **Es el modelo de seguridad del protocolo el que limita cuánto
puedes consolidar**, y choca de frente con el consejo genérico de "consolida tools".

⚠️ Declararlas no basta: hay que **emitirlas al cliente**. Un servidor público las definió durante
meses sin que llegaran en la respuesta (`registerTool` las recibía y no las propagaba).

### 5. Clasifica por EFECTO AGUAS ABAJO, no por lo que la tool hace en su propia llamada

Aquí es donde el oficio publicado se queda corto, y es nuestro aporte. Todo el mercado modela
**read vs write**. Falta un tercer eje: **el gasto**.

🔴 `writes` y `spendsProviderBudget` son **ortogonales**. Fusionarlas en un solo `readOnly` es un
error: una tool puede **comprar datos a un proveedor sin mutar nada tuyo**, y el cliente necesita
saberlo igual.

🔴 **El compromiso de gasto DIFERIDO cuenta como gasto.** Si la acción agranda la carga de un
trabajo recurrente —seguir una keyword hace que cada ciclo de captura la facture, hasta que
alguien la deje de seguir—, es `spend`, aunque la llamada no cobre un peso.

Una capacidad de esa clase se publica con: **techo gobernado**, **outcome tipado por ítem** (jamás
un booleano pelado ni silencio ante el rechazo), entitlement por tenant, idempotencia, y **su
reverso en el mismo PR**. Sin el reverso, el compromiso es permanente.

### 6. Publicar es un acto explícito, y el default es cerrado

Toda capacidad nace deshabilitada, de sólo lectura y fail-closed. Una ausencia declarada con razón
es información; una ausencia silenciosa es un bug esperando. **NUNCA** dejes una exclusión
implícita: si algo no se expone, se declara **dónde** y **por qué**.

---

## Rutas

| Trabajo | Lee |
|---|---|
| Cuántas tools, cómo partirlas, naming, descripciones, forma de respuesta, errores | [`tool-surface-design.md`](tool-surface-design.md) |
| Versionar, deprecar, renombrar, detectar drift, gates y tests baratos | [`lifecycle-and-drift.md`](lifecycle-and-drift.md) |
| Qué dice el spec HOY, qué se deprecó, qué soportan los clientes de verdad | [`protocol-radar.md`](protocol-radar.md) |
| OAuth, scopes, clases de ataque, consentimiento, multi-tenencia | [`security-and-auth.md`](security-and-auth.md) |
| Cómo se mide si un AGENTE logra la tarea con tu superficie | [`evaluation.md`](evaluation.md) |
| De dónde sale cada cifra y cuánto vale | [`SOURCES.md`](SOURCES.md) |

---

## El bucle de trabajo

1. **Clasifica.** Dueño del dato, clase de la acción (`read` / `write` / `spend` / `approval` /
   `rights-sensitive` / `admin`), y efecto aguas abajo. La clase gobierna todo lo demás.
2. **Contrata.** Nombre estable, `inputSchema`, `outputSchema`, las cuatro `annotations`,
   comportamiento de error, redacción, timeout y reverso. Si la clase es `spend` o superior, el
   reverso va en el mismo PR.
3. **Presupuesta.** Mide el costo de contexto ANTES de mergear (`lifecycle-and-drift.md`).
4. **Mecaniza.** Toda regla que hayas escrito, ¿qué la sostiene? Si la respuesta es "la revisión
   humana", no está sostenida.
5. **Ejercita.** Una tool registrada no es una tool que funciona: los tests prueban el cableado.
   Llama la lane real contra un deployment real y confirma que devuelve **los mismos números** que
   la superficie humana. Esa igualdad ES la prueba de paridad.
6. **Cierra.** Di `complete`, `code complete, rollout pendiente` u `operativamente bloqueado` sin
   eufemismos.

---

## Anti-patrones que ya costaron caro

| Anti-patrón | Qué pasó |
|---|---|
| Dos listas de qué tools existen, ninguna declarada dueña | El espejo a mano derivó dos veces en dos semanas; el servidor se anunciaba `read-only` registrando siete tools que escribían |
| Cartel escrito a mano | El nombre y las `instructions` deben **derivarse** del inventario, o vuelven a mentir |
| Guarda que mira el lado cómodo | Ocho tools quedaron sin federar bajo un guard verde, porque el guard sólo miraba una dirección |
| `readOnly` como un solo booleano | Esconde el gasto: una tool que compra datos sin mutar nada se lee como lectura |
| Booleano pelado en una escritura por lotes | El agente reporta éxito con ítems rechazados en silencio |
| Eval que se salta sin credenciales | Un `skipped` se lee como verde y **afirma haber medido** |
| Gate no determinista de merge | Se pone rojo sin que nada cambie; la respuesta humana siempre es reintentar, y así muere un gate |
