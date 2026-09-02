# Fuentes y grado de evidencia

Recopilado 2026-09-02 por una investigación de cinco frentes (~250 fuentes con URL y fecha).
Verificado directamente contra la fuente donde dice ✅.

## Cómo leer los grados

| Grado | Significa |
|---|---|
| **A** | Metodología declarada: n, modelos, criterio de éxito, y preferiblemente varias corridas |
| **B** | Número real de un equipo real, metodología parcial |
| **C** | Caso ilustrativo autodeclarado, sin comparación |
| **D** | Afirmación consecuente cuyo setup de evaluación **nunca se describe** — no usar |

## Spec (todo ✅ verificado directamente, 2026-09-02)

- Revisión vigente `2026-07-28`, negociación y `server/discover` — `modelcontextprotocol.io/specification/versioning`
- `LATEST_PROTOCOL_VERSION`, ausencia de `initialize`, `resultType`, `InputRequiredResult`,
  `subscriptions/listen` — `schema/draft/schema.ts` del repo
- Defaults de `annotations` (`readOnlyHint: false`, `destructiveHint: **true**`,
  `idempotentHint: false`, `openWorldHint: **true**`) — `ToolAnnotations` en el mismo schema
- Registro de deprecados con fechas de retiro — `/specification/2026-07-28/deprecated`
- Autorización: RFC 9728 MUST, RFC 8707 MUST, CIMD SHOULD, DCR MAY+deprecado, `scopes_supported`
  mínimo, step-up — `/specification/2026-07-28/basic/authorization`
- Unicidad de nombres por servidor, desambiguación en proxies, `tools/list` estable por conexión
  pero variable por autorización, orden determinístico, `isError` vs error de protocolo,
  `x-mcp-header`, Stateful Tools — `/specification/2026-07-28/server/tools`
- SEP-2640 (Skills) **abierto, no mergeado**, creado 2026-04-23, movido 2026-08-29 — API de GitHub

## Números medidos, por grado

**A —**
- Consolidación de tools de un asistente de código: ~40 → 13, **+2 a 5 puntos porcentuales** en dos
  benchmarks, con A/B online. Documenta además un fracaso: el agrupamiento por LLM fue descartado.
- Búsqueda de tools: precisión 49% → 74% y 79,5% → 88,1% según modelo; ~77K → ~8,7K tokens.
- Auditoría de validez de harnesses: **18,5%** de desacuerdo evaluador-humano; **23 corridas del
  mismo setup entre 57,9% y 76,8%** (18,9 pp).
- Degradación por acople indiscriminado: **−9,5%** promedio; ~20.000 llamadas, 6 modelos, 30 suites.
- Eval de vendor con control negativo, 10 corridas por celda, penalización por error de tool: el
  servidor curado ganó las 5 escenas al envoltorio delgado (+7 a +20 pp).
- Techo de tools y largo de descripción de un servidor grande (`PUBLIC_TOOL_HARD_LIMIT = 25`,
  `DESCRIPTION_MAX_LENGTH = 2048`) ✅ **verificado en el código fuente**, con la razón en el
  comentario: un cliente conocido corta en 1024.
- Costo de contexto medido con tiktoken en CI: 14.068 tokens / 24 tools / 586 promedio ✅

**B —**
- Censo del ecosistema: respuestas mediana 98 / media 4.431 / **máx 557.766** tokens (2.443
  llamadas, 1.312 tools) ✅ verificado. Y ~59% de resultados sin bandera de error que **sí**
  contenían errores — ⚠️ **juzgado por un LLM**, no auditado a mano.
- A/B controlado de dos servidores equivalentes, 40 prompts: **misma tasa de aprobación (90%)**,
  4,98× de diferencia en tokens de entrada. La causa fue la forma de la respuesta, no el largo de
  la descripción. ⚠️ Los números viven sólo en el post; el repo del harness no tiene resultados.
- Test controlado de ejecución de código: menos turnos y tokens, **misma** precisión en tareas
  simples, **peor** en tareas de tres servidores.
- Selección adaptativa: **7 tools igualaron a 50** en cobertura sobre un registro de 370.
- UUID → identificadores con significado: ~9× menos errores.
- Definiciones de tool de dos servidores grandes: ~10.000 y ~17.600 tokens.

**C —** ejemplos autodeclarados de reducción de tokens por ejecución de código (98,7%, 99,9%);
arquitecturas "N endpoints → M tools" sin medición de resultado.

**D — NO USAR.** La afirmación de que comprimir tools tuvo *"casi ningún impacto en la calidad
end-to-end"* es la más citada del tema y **nunca describe el setup de evaluación**.

## Cosas que la investigación NO pudo establecer

Declaradas aquí a propósito: son huecos, no omisiones.

- **Qué cliente soporta qué.** La matriz oficial fue archivada y delistada. Se comprobó ✅ que la
  página de MCP de VS Code no declara versión de protocolo. La afirmación *"ningún cliente
  implementa `2026-07-28`"* es de AUSENCIA sobre todo el mercado y **no está verificada**.
- **Ningún sunset fechado de una tool individual** en toda la industria.
- **Nadie valida su superficie contra la API real del producto**: toda la paridad es MCP-a-MCP.
- **Inyección de fallas** no existe como práctica; los tests negativos de auth están totalmente
  especificados y prácticamente no se practican.
- **Agrupamiento de primitivas**: la propia organización declara en su carta que *no* buscará
  consenso temprano.

## Un sesgo de descubrimiento que hay que tener presente

Parte de la investigación se hizo con el presupuesto de búsqueda agotado, apoyándose en APIs de
arXiv, Hacker News y GitHub. Los blogs de ingeniería que nunca llegaron a HN están
**sistemáticamente sub-representados**. Léase "no localizado", nunca "no existe".

## Lo que no encontramos publicado en ningún lado

**Nadie modela el GASTO como eje de clasificación.** Las ~250 fuentes paran en read/write. El
`writes` ⊥ `spendsProviderBudget` y el **compromiso de gasto diferido** son aporte propio, no
préstamo.
