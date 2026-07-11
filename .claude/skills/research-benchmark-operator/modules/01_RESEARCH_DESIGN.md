# 01 · Research Design

Antes de buscar nada, diseña. El error #1 del research es empezar a googlear sin una pregunta que habilite una decisión. Un research bien diseñado ahorra días y produce insight accionable; uno mal diseñado produce un PDF que nadie usa.

## El diseño en 5 decisiones

1. **¿Qué decisión habilita este research?** Si el hallazgo no cambia una decisión (entrar a un mercado, elegir un ángulo, priorizar un competidor, fijar un precio), no lo hagas. Empieza por la decisión, no por la curiosidad.
2. **Pregunta de research** — una pregunta central, específica y respondible. "¿Cómo está el mercado?" no sirve. "¿Qué tamaño y crecimiento tiene el mercado de servicios AEO en LATAM y quiénes son los 5 players relevantes?" sí.
3. **Método** — cuali vs cuanti, primario vs secundario (abajo).
4. **Alcance y profundidad** — ¿scan rápido (horas) o deep dive (días)? Define el "suficientemente bueno" para la decisión. No sobre-investigues una decisión reversible.
5. **Entregable + deadline** — ¿un memo de 1 página, un scorecard, un deck? El formato condiciona el método (`09`).

## Tipos de research (elige por la pregunta)

| Eje | Opción A | Opción B |
|---|---|---|
| **Naturaleza** | **Cualitativo** (por qué, cómo, motivaciones) | **Cuantitativo** (cuánto, cuántos, tendencia) |
| **Fuente** | **Primario** (tú lo generas: entrevistas, encuestas, tests) | **Secundario** (ya existe: reportes, web, datos públicos) |
| **Objetivo** | **Exploratorio** (abrir, descubrir, hipotetizar) | **Concluyente** (validar, medir, decidir) |

Regla práctica: casi todo research de agencia empieza **secundario + exploratorio** (barato, rápido) y solo escala a **primario** (entrevistas/encuestas) cuando la decisión lo amerita y el secundario no basta. En 2026, el research sintético (synthetic users, entrevistas AI-moderadas) abarata lo cualitativo a escala, pero **no reemplaza** la señal primaria real — trátalo como hipótesis a validar (`02`, regla #6 del router).

## De pregunta a plan de research

Descompón la pregunta central en **sub-preguntas** respondibles, y para cada una define fuente + método:

```
PREGUNTA: ¿Vale la pena que Efeonce lance un servicio de AEO en México?
├─ ¿Tamaño y crecimiento del mercado? ......... secundario/cuanti (03)
├─ ¿Quién ya lo ofrece y cómo se posiciona? ... secundario/competitivo (04)
├─ ¿Qué dolor real tiene el ICP mexicano? ..... primario/VoC o sintético (04)
├─ ¿Cómo nos compararíamos vs. ellos? ......... benchmark (06-08)
└─ ¿Qué señales de demanda hay? ............... secundario + first-party (02)
```

Cada sub-pregunta tiene un dueño de respuesta y una fuente. Al final, la síntesis (`05`) responde la central.

## Hipótesis (cuando aplica)

Para research concluyente, formula **hipótesis falsables** antes de buscar. Esto te protege del sesgo de confirmación (buscar solo lo que confirma lo que ya crees). Declara qué evidencia te haría **cambiar de opinión** — si nada te haría cambiar, no es research, es justificación.

## Alcance: no sobre-investigar

- **Decisión reversible + bajo riesgo** → scan rápido, confidence medio, avanza.
- **Decisión irreversible + alto riesgo** (entrar a un país, gran inversión) → deep dive, triangulación fuerte, primario si hace falta.
- El costo del research debe ser proporcional al costo de equivocarse. Un memo de 2 horas que evita un error de $50k es genial; un estudio de 3 semanas para una decisión de $2k es desperdicio.

## Output del módulo: el research brief

Cierra el diseño con un **research brief** (plantilla `templates/research-brief.md`):
- Decisión que habilita · pregunta central · sub-preguntas · método por sub-pregunta · fuentes candidatas · alcance/profundidad · entregable · deadline · hand-offs.

## Checklist de salida

- [ ] Hay una **decisión** concreta que el research habilita.
- [ ] Pregunta central **específica y respondible** + sub-preguntas.
- [ ] Método elegido por sub-pregunta (cuali/cuanti, primario/secundario).
- [ ] Alcance proporcional al costo de equivocarse.
- [ ] Entregable + deadline definidos.
- [ ] Si es concluyente: hipótesis falsables + qué te haría cambiar de opinión.

## Cross-links

- Fuentes y su credibilidad → `02`; ejecución → harness `deep-research`.
- Sizing/tendencias → `03`; competitivo/audiencia → `04`; síntesis → `05`.
- Si es una comparación → carril Benchmark (`06`).
- Entregable → `09` + `templates/research-brief.md`.
