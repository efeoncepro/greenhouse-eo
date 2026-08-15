# ISSUE-158 — Los adapters del grader consultan a los LLM sin ubicación geográfica, y el resultado se reporta como visibilidad de un mercado concreto

- **Ambiente:** producción
- **Detectado:** 2026-08-15, verificando un benchmark de suites AEO contra nuestro propio motor
- **Estado:** `open`
- **Relacionado:** `ISSUE-152` (misma familia: Berel medido en el mercado equivocado) · `TASK-1652`
  (el adapter de AI Mode manda el market crudo donde el proveedor espera otra cosa) ·
  `.claude/skills/seo-aeo-practice/references/BENCHMARK_SUITES_AEO_2026-08.md`

---

## Síntoma

Le decimos a un cliente mexicano cuál es su visibilidad **en México**, y la medición no lleva
ninguna señal de que la consulta sea mexicana.

## Evidencia

Ninguno de los cuatro adapters de `answer_engines` pasa parámetro de ubicación:

```
src/lib/growth/ai-visibility/providers/openai-adapter.ts       → sin user_location
src/lib/growth/ai-visibility/providers/anthropic-adapter.ts    → sin ubicación
src/lib/growth/ai-visibility/providers/gemini-adapter.ts       → sin ubicación
src/lib/growth/ai-visibility/providers/perplexity-adapter.ts   → sin user_location
```

El único que sí manda ubicación es `google-ai-overview-adapter.ts` (vía DataForSEO), y ahí el
parámetro va **mal formado** — es el defecto que `TASK-1652` documenta.

## Por qué importa, técnicamente

La distinción que decide el caso, y que casi nadie en el sector declara:

- **Modelo base sin búsqueda web: no tiene ninguna entrada de ubicación.** Correr la consulta desde
  una IP mexicana no cambia nada, porque el modelo nunca ve la IP.
- **Con búsqueda web, la ubicación es un parámetro explícito que hay que pasar.** OpenAI documenta
  `user_location` (`country` ISO-2, `city`, `region`, `timezone`); Perplexity expone `country`,
  `region`, `city` y coordenadas. **Ninguna de las dos documenta el comportamiento por defecto si no
  se especifica.**

**Consecuencia:** una herramienta que use la API y no pase la ubicación obtiene un resultado sin
geografía, corra desde donde corra. Nosotros estamos en ese caso.

## Por qué importa, comercialmente

1. **Es un KPI contratado.** El presupuesto adjudicado de Berel (Escenario Crecimiento) compromete
   monitoreo mensual de presencia en ChatGPT, Perplexity, Google AI Overviews y Gemini para una
   marca **mexicana**. Si la medición no es mexicana, el entregable no es el que se vendió.
2. **Es exactamente la recaída de `ISSUE-152`.** Aquel costó un año de serie porque el país era
   implícito en el rank tracking. Cerramos esa puerta en el eje SEO y **la dejamos abierta en el eje
   AEO**, una capa más arriba.
3. **La evidencia de que el mercado importa es fuerte y contraintuitiva:** `chatgpt.com` está mejor
   rankeado en Chile (#6), Colombia (#6) y México (#8) que en Estados Unidos (#10)
   (Similarweb, julio 2026). Y hay evidencia académica transferible —no sobre español, hay que
   decirlo— de que pasar de una consulta en inglés al idioma local **sube la cuota de recomendación
   0,80 para campeones locales contra 0,15 para multinacionales**: medir en el locale equivocado
   subestima sistemáticamente a la marca local (arXiv 2606.23165, 12 lenguas europeas).

## Lo que NO se puede concluir todavía

⚠️ **No está medido cuánto cambia la respuesta.** Nadie —ni nosotros ni ningún practicante
hispanohablante, según el relevamiento— ha publicado un test controlado que corra el mismo prompt
con y sin ubicación y publique el delta. **Es posible que para algunas categorías el delta sea
pequeño.** Afirmar "estamos midiendo mal" sin ese dato sería cometer el mismo error de afirmar sin
verificar que originó este issue.

## Trabajo propuesto

**Slice 1 — medir el delta antes de cambiar nada.** Correr un set acotado de prompts de Berel con y
sin `user_location: MX` en OpenAI y Perplexity, y comparar menciones, competidores citados y fuentes.
Es barato y decide el tamaño del problema. **Sin este dato, cualquier rediseño es especulativo.**

**Slice 2 — pasar la ubicación donde el proveedor la acepta**, derivada del mercado del perfil (que
ya existe: `provision-profile.ts` conoce `MX`/`CL`/`US`), y **persistir en la observación qué
ubicación se usó** — hoy no queda registro, así que ni siquiera se puede auditar hacia atrás.

**Slice 3 — declarar el límite en el producto.** Para los motores sin parámetro de ubicación (modelo
base sin búsqueda), la respuesta **no es geolocalizable** y el reporte debe decirlo, en vez de
presentarla como la respuesta de ese mercado. Es la misma disciplina de `◑`/`●`: nombrar lo que no
se midió en vez de rellenarlo.

## Nota de posición competitiva

De ~25 herramientas del mercado relevadas, **sólo 2 declaran desde dónde consultan** (Profound, con
proxies en 80+ países; Evertune, con servidores en el país seleccionado). Es el agujero sistémico del
sector, no una deficiencia nuestra en particular.

Hay una segunda brecha del mismo tipo, y es la más comparable con nosotros: **Evertune corre cada
prompt 100 veces** y publica un margen de error de ±1 punto; **nosotros corremos N=1**, cuando
nuestra propia calibración pidió N≥3. La medición independiente de por qué eso importa es dura:
**el 56,9% de los dominios dio un resultado distinto al re-medirse, con oscilación promedio de 30,8
puntos** (2.324 auditorías, may–jul 2026), y de 631.999 pares prompt-modelo **el 52% de las marcas en
primer lugar cambian en el mismo prompt**. Un score de una sola corrida y sin intervalo de confianza
es ruido con falsa precisión — y eso nos incluye mientras sigamos en N=1.

Eso significa dos cosas a la vez: **no estamos peor que el mercado**, y **hay una ventaja disponible
para quien lo resuelva y lo declare** — sobre todo porque nadie ha llevado esta discusión al terreno
del español, donde los modelos colapsan todos los mercados hispanohablantes en una respuesta
genérica.

## Cómo se descubrió

Investigando qué hacen las suites del mercado, apareció que sólo dos declaran el origen de la
consulta. La pregunta natural fue si nosotros lo hacíamos — y la respuesta fue que no. El benchmark
competitivo terminó auditando nuestro propio motor.
