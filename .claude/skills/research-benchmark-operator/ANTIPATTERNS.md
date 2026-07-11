# Antipatrones — research-benchmark-operator

Lo que NO se hace. En research, un antipatrón produce una decisión equivocada con apariencia de rigor — el peor resultado.

## Rigor y evidencia

- **Citar de memoria.** Datos, cifras, herramientas y "lo último" salen de WebSearch con `as-of`, no de conocimiento entrenado (Regla #0). El paso 2026 es obligatorio.
- **Citar lo que no abriste.** La IA alucina 17–33% de las citas. Nunca cites una URL/dato/paper que no verificaste en la fuente primaria.
- **Fuente única = hecho.** Un claim load-bearing con una sola fuente es hipótesis, no dato. Triangula (≥2 independientes).
- **Eco IA como triangulación.** Tres artículos citando el mismo dato sin fuente primaria son una fuente repetida, no tres.
- **Confidence oculto.** Presentar una hipótesis (confidence bajo) como hecho. Marca siempre el nivel.
- **Hallazgo disfrazado de insight.** "El 60% usa X" es un hallazgo; sin el "y por lo tanto" no es insight ni sirve para decidir.
- **Sesgo de confirmación.** Buscar solo lo que confirma tu tesis. Declara qué te haría cambiar de opinión.

## Diseño

- **Research sin decisión.** Si el hallazgo no cambia una decisión, no lo hagas.
- **Sobre-investigar lo reversible.** Un estudio de 3 semanas para una decisión de $2k. El costo del research debe ser proporcional al de equivocarse.
- **Synthetic = real.** Tratar synthetic users / entrevistas AI-moderadas como señal real. Escalan el qual, pero se validan contra señal real.
- **Pregunta vaga.** "¿Cómo está el mercado?" no es respondible. Específica y ligada a una decisión.

## Benchmark

- **Peer set injusto o no declarado.** Comparar con rivales aspiracionales/irrelevantes, o no decir contra quién comparas. El peer set es lo primero que revisa un escéptico.
- **Sin normalizar.** Comparar absolutos entre entidades de distinto tamaño/moneda/estacionalidad. Usa ratios y unidades comparables.
- **Solo el promedio.** El promedio lo distorsiona un outlier. Ubica vs **mediana y top quartile**.
- **Cherry-picking.** Elegir las métricas donde ganas para el pitch. El scorecard honesto muestra dónde estás abajo — eso lo hace creíble.
- **Score sin rúbrica.** Un score agregado sin ponderaciones declaradas es opinión disfrazada de dato.
- **Gap sin driver.** Reportar el gap (síntoma) sin descomponerlo en la causa accionable.
- **Target = 100%.** El objetivo realista suele ser el top quartile, no el máximo teórico.
- **Métrica de competidor inventada.** No puedes ver su CRM; usa lo observable externamente y marca lo estimado.
- **AI SoV promediado entre motores.** Los motores difieren enormemente (mismo brand 22% vs 6% la misma semana). Benchmarkea por motor.

## Competitive Intelligence

- **CI ilícita.** Pretexting, acceso no autorizado, secretos comerciales. Solo fuentes lícitas y públicas.
- **CI sin KITs.** Recolectar ruido sin decisiones que informar.
- **Actuar sobre una señal no verificada** (o una alucinación de agente). Verifica antes de decidir.
- **Battlecard con data vieja.** La inteligencia decae rápido; una battlecard desactualizada es peligrosa.
- **Difamar.** El análisis competitivo es objetivo y sustanciado, no denigración.

## Entrega y servicio a clientes

- **Enterrar la respuesta.** No usar BLUF; el decisor no debería cazar la conclusión en la página 30.
- **Data dump.** Entregar datos sin insight ni recomendación accionable.
- **Gráfico tramposo.** Ejes que exageran el gap. Un visual deshonesto quema todo el rigor (→ `dataviz`).
- **Research complaciente (cliente).** Decir lo que el cliente quiere oír. Un hallazgo incómodo se dice con tacto, pero se dice.
- **Mezclar clientes.** Reusar CI de un cliente para otro; conflicto de interés entre competidores.
- **Reimplementar el harness.** La ejecución es de `deep-research`; no la reconstruyas.
- **Duplicar el dominio.** Hacer SEO research en paralelo a `seo-aeo`, o competitivo comercial en paralelo a `commercial-expert`. Aporta rigor, delega el dominio.
