# Eval de selección de tools MCP — baseline, método y gate

> **Tipo de documento:** Spec de evaluación (contrato del eval + medición registrada)
> **Versión:** 1.0
> **Creado:** 2026-09-02 por `TASK-1784`
> **Superficie:** `src/mcp/greenhouse/**` · `scripts/mcp/tool-selection-*`
> **Invariantes:** `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §7

---

## 1. Qué mide este eval, y por qué existe

El módulo SEO expone **28 tools MCP** sobre **43 registradas**, y siete contestan alguna versión de
la misma pregunta —*"¿cómo va este cliente?"*—: `get_seo_visibility_360`, `get_seo_overview_kpis`,
`get_seo_domain_overview`, `get_seo_performance`, `get_seo_rank_evolution`, `get_seo_url_visibility`
y `get_seo_dual_lens_visibility`. Cada descripción explicaba **qué devuelve**; ninguna decía
**cuándo preferirla sobre la vecina**. Un modelo elige por semejanza semántica, y esas siete se
parecen.

Sin medición previa, *"mejoramos las descripciones"* es infalsificable: nadie puede decir si la
selección mejoró, empeoró o quedó igual. Este eval convierte esa afirmación en un número.

### Tres dimensiones, jamás promediadas

| Dimensión | Qué mide | Por qué va aparte |
|---|---|---|
| `toolAccuracy` | eligió la tool esperada | el error es **visible**: responde con la lente equivocada |
| `marketAccuracy` | eligió el mercado esperado | el error es **invisible**: respuesta perfectamente formada sobre otro país |
| `spendDiscipline` | no llamó a una tool que gasta cuando no correspondía | un ruteo puede mejorar la selección y pagarse en factura |

🔴 **Colapsarlas en un promedio esconde la mitad cara.** La precisión de tool puede ser 100%
mientras la de mercado es 60%, y el promedio diría 80% sin que nada delate cuál falló.

### El veredicto `silent_choice`

Cuando la organización tiene varios targets activos y la pregunta no declara el mercado, la
respuesta correcta **no es un mercado: es no elegir**. `resolveSeoTargetForMarket`
(`src/lib/growth/seo/resolve-target.ts`) ya se niega a elegir callado del lado del runtime —devuelve
`multiple_markets` con la lista—, así que el hueco que queda es del lado del **agente**: si inventa
`market: 'CL'`, el runtime lo resuelve obedientemente y sirve Chile sin una sola señal de que nadie
lo pidió.

Eso es `ISSUE-152` textual: el target de **Berel —marca mexicana— midiendo Chile**, con 238
snapshots acumulados a lo largo de un año contra el SERP equivocado. Por eso una elección
silenciosa cuenta como **fallo aunque acierte el país**: acertar por casualidad y decidir bien no
son lo mismo, y sólo uno de los dos escala.

---

## 2. El fixture

`scripts/mcp/tool-selection-fixture.ts` — **55 preguntas** de operador con su tool esperada, su
mercado esperado y una justificación de una línea que hace auditable la expectativa.

- Cubre los **cinco mercados productivos** (`CL` · `MX` · `CO` · `PE` · `US`) en sus variantes
  `es-CL`, `es-MX`, `es-CO`, `es-PE` y `en-US`. Un fixture monolingüe mide la selección de un solo
  mercado y la declara general; el registro cambia el vocabulario con el que se pide lo mismo.
- Los mercados salen del mapa cerrado `PROSPECT_MARKETS` (`TASK-1652`), nunca de una lista propia.
- Incluye casos cuya respuesta correcta es **no llamar a la tool que gasta** (`mustNotSpend`).
- Incluye el caso de nombre de marca que sugiere un país distinto al del operador — la forma exacta
  de `ISSUE-152`.

🔴 **El fixture se escribió ANTES de tocar una sola descripción.** Si primero se mejora el texto y
después se mide, no hay baseline: cualquier número sale incomparable y el sesgo del autor —que
acaba de decidir cuál es la tool "correcta"— se cuela en la expectativa.

---

## 3. El runner, y por qué NO es el gate de CI

`pnpm mcp:selection-eval` presenta el catálogo **real** —introspectado del servidor MCP vivo
(`server._registeredTools`), jamás una copia— y una pregunta, y pide elegir una tool y el argumento
`market`. El system prompt del eval es deliberadamente **neutro**: no enseña a elegir. Si dijera
*"prefiere la lente medida cuando pidan números reales"*, mediría el prompt del eval y no las
descripciones, y el baseline saldría alto por una razón que no se despliega a producción.

**Este runner no puede ser un gate de merge.** Llama a un modelo: cuesta dinero y no es
estrictamente determinista. Un gate que a veces se pone rojo sin que nada haya cambiado se muere
solo, porque la respuesta humana siempre es reintentar hasta que pase.

El gate determinista vive aparte, en `src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts`, y
cierra el modo de falla que **sí** es determinista: una tool SEO nueva sin caso en el fixture rompe
el build. El runner produce el **número**; el gate produce la garantía de que ese número sigue
midiendo la superficie completa.

Sin credenciales de Vertex el runner **falla con exit 1**. No se salta: un eval que se salta en
silencio es peor que no tenerlo, porque afirma haber medido.

---

## 4. Baseline medido — 2026-09-02, antes del ruteo

Modelo `gemini-2.5-flash-lite`, `temperature: 0`, 55 casos, 43 tools en catálogo.

| Dimensión | Baseline |
|---|---|
| Precisión de **tool** | **94.5%** (52/55) |
| Precisión de **mercado** | **98.2%** (54/55) |
| Disciplina de **gasto** | **100%** (41/41 casos `mustNotSpend`) |

Desglose de mercado: `correctos=54` · `elección_silenciosa=1` · `mercado_errado=0` · `preguntó_de_más=0`.

Por variante — tool: `es-CL` 17/19 · `es-MX` 12/13 · `es-CO` 9/9 · `es-PE` 7/7 · `en-US` 7/7.

### Piso de ruido: cero

Dos corridas completas del baseline devolvieron **exactamente los mismos cuatro fallos**. A
`temperature: 0` sobre un catálogo idéntico, la selección es reproducible, así que **cualquier delta
posterior es señal, no variación del modelo**. Sin esta medición, un delta de ±2 casos sobre n=55
sería indistinguible del ruido y no se podría afirmar nada.

### Los cuatro fallos del baseline

| Caso | Qué pasó | Lectura |
|---|---|---|
| `measured-set-performance-cl` | pidió comparar 5 keywords → eligió `get_seo_dual_lens_visibility` en vez de `get_seo_performance` | la descripción de la lente dual dice *"úsala en vez de …"* sin acotar a **cuándo**; se lleva casos que no le tocan |
| `market-ambiguous-rank` | *"¿subimos o bajamos de posición?"* → `get_seo_overview_kpis` en vez de `get_seo_rank_evolution` | `overview_kpis` devuelve *average position*: la semejanza léxica gana sobre la diferencia de lente |
| `spend-avoid-tracked-lookup` | *"¿cuáles seguimos y cómo vienen?"* → `get_seo_performance_catalog` en vez de `get_seo_performance` | el catálogo se lleva la mitad de la pregunta y deja sin contestar la otra |
| `market-ambiguous-brand-name-mismatch` | marca mexicana + operador chileno, dos targets → eligió `CL` **en silencio** | 🔴 `ISSUE-152` reproducido en vivo: el modo de falla existe y el eval lo captura |

### Lectura honesta del baseline

**El baseline es alto.** La task contemplaba explícitamente cerrarse acá si lo fuera, y ese
resultado habría sido legítimo. No se cierra por dos razones medidas, no por preferencia:

1. Los **tres** fallos de tool caen **todos dentro del racimo que compite** o en su borde inmediato
   — que es exactamente la población que el ruteo apunta. No son fallos dispersos sobre la
   superficie: son la hipótesis de la task, confirmada.
2. El único fallo de mercado es **el caro**: la elección silenciosa de `ISSUE-152`. Una precisión de
   98.2% que falla justo en el caso que costó un año de snapshots equivocados no es un problema
   resuelto.

⚠️ **Con n=55 el techo está cerca.** Pasar de 94.5% a 100% son tres casos. Un delta de esta talla
es real (el piso de ruido es cero) pero **estrecho**, y esta spec lo dice antes de medirlo para que
el resultado no se lea como más de lo que es.

---

## 5. Delta post-ruteo

> ⏳ **Pendiente de medición.** Esta sección se llena corriendo el eval DESPUÉS de aplicar el
> bloque de ruteo, con el mismo modelo, el mismo fixture y las mismas condiciones. Se deja
> explícitamente vacía —y no con una expectativa— porque escribir el número esperado antes de
> medirlo es la forma más barata de convertir un eval en una confirmación del autor.

## 6. El gate de regresión

`src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts` corre en `pnpm test` y es
**determinista**. Verifica:

1. **Cobertura**: toda tool SEO del manifiesto tiene ≥1 caso en el fixture, o una exención
   declarada con razón. Agregar una tool SEO sin actualizar el fixture **rompe el build**.
2. **Integridad**: toda `expectedTool` existe en el manifiesto; todo mercado pertenece al mapa
   cerrado; los `id` son únicos; toda justificación es sustantiva.
3. **Formato del ruteo**: las siete tools que compiten declaran su bloque `Use when: … · Prefer
   <tool> if: … · Do NOT use for: …`, y toda tool nombrada en un `Prefer` existe.
4. **`targetMarket` coherente**: todo caso `single_target` con una tool que acepta `market` lo
   declara — sin él, el scorer aceptaría cualquier ISO-2 y la dimensión cara se volvería laxa.
5. **Poder de detección ejercitado**: el scorer se prueba con estados sintéticos, incluido el
   `silent_choice`. Un guard cuyo poder de detección nunca se ejercita tampoco prueba nada.

🔴 **La regla NO es "el eval debe dar 100%".** Un gate así se arregla editando expectativas hasta
poner el build en verde, que es la forma en que un eval deja de medir. La regla es que **la
superficie completa siga cubierta**: si un cambio legítimo obliga a editar una expectativa para
pasar, está mal el gate, no el cambio.

---

## 7. Paridad de descripciones con el gateway

Si el ruteo vive en la `description`, una descripción vieja en el gateway sirve un **mapa
desactualizado** — y eso era invisible: el guard de paridad de `TASK-1658` comparaba `inputSchema`
y `annotations`, nunca el texto.

`TASK-1784` cierra ese punto ciego: el artefacto generado
(`src/mcp/greenhouse/tool-manifest.generated.json`) ahora lleva `descriptionHash` por tool
—introspectado del servidor real— y el guard del gateway compara ese hash contra la descripción que
él registra. Un drift de texto pasa a ser un **finding**, no una diferencia silenciosa.

Se transporta el **hash** y no el texto completo a propósito: el artefacto cruza a otro repo y
duplicar ahí ~40 KB de prosa lo volvería ilegible en cada diff, sin agregar poder de detección — un
hash detecta exactamente la misma divergencia.

---

## Documentación relacionada

- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` — §7 (ruteo) y §0 (manifiesto)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §5 contrato de honestidad `●`/`◑`
- `docs/tasks/complete/TASK-1658-mcp-seo-federation-drift-parity-guard-blind-spot.md` — el guard extendido
- `src/lib/growth/seo/resolve-target.ts` — la negativa a elegir mercado callado, del lado del runtime
