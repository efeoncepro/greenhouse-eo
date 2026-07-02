# Experiment Brief

> Todo se declara ANTES de correr. Sin esto, no es un experimento. Ver `04`.

## Contexto / research
- **Observación (dato/heatmap/encuesta que motiva):** _______________________
- **Superficie / paso del funnel:** _______________________

## Hipótesis (causal)
> Porque **[evidencia]**, creemos que **[cambio]** hará que **[métrica primaria]**
> **[suba/baje]** para **[segmento]**. Lo confirmaremos si **[criterio]**.

## Métricas
- **Primaria (decide):** _______________________
- **Guardrails (NO deben degradarse):** churn / latencia / calidad de lead / revenue/sesión / ______
- **Secundarias (exploratorias, no confirmatorias):** ______

## Diseño estadístico
- **Baseline de la primaria:** ______
- **MDE (efecto mínimo relevante):** ______
- **α:** 0.05  **Power:** 0.80
- **Sample size por variante:** ______  (calculadora usada: ______)
- **Duración:** ______ (≥ 1–2 ciclos semanales completos)
- **Unidad de aleatorización:** usuario / sesión / cuenta
- **Método:** frecuentista / bayesiano / secuencial   **CUPED:** sí / no
- **Split:** 50/50 (verificar SRM al arrancar)

## Regla de decisión (antes de ver datos)
- **Ship si:** ______
- **No-ship si:** ______
- **Iterar si:** ______

## Resultado (post)
- Primaria: ______  ¿significativo?: ______  tamaño de efecto: ______
- Guardrails OK: sí / no → ______
- SRM OK: sí / no
- **Decisión:** ship / no-ship / iterar  · **Aprendizaje (incl. si perdió):** ______
