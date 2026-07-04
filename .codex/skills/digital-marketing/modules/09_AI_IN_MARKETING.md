# 09 · IA en Marketing ⭐

> En 2026 la IA pasó de *generar* a *ejecutar*. McKinsey estima que ~2/3 de las actividades de
> marketing son potencialmente agénticas. Pero el gap de gobernanza es brutal: brand safety y
> data governance son **infraestructura load-bearing**, no adorno.

## 1. Tres capas de IA en marketing (distínguelas)

| Capa | Qué hace | Ejemplos |
|---|---|---|
| **Generativa** | crea contenido/creativo/copy | borradores, variantes, imágenes, video UGC |
| **Predictiva/analítica** | modela y prioriza | scoring, propensión, send-time, synthetic audiences |
| **Agéntica** | *ejecuta* flujos con supervisión | planificar+crear+entregar campañas; agentes conectados a ads/CRM vía MCP |

El salto de 2026 es la **agéntica**: de "adoptar generación (2024) → agentes no-code (2025) →
ejecución agéntica supervisada (2026)".

## 2. Dónde la IA da valor real (con humano en el loop)

- **Producción a escala:** variantes de creativo/copy, repurposing, subject lines (+26% open),
  resizing/tagging de assets. Libera capacidad para estrategia.
- **Personalización:** hiperpersonalización de campañas → +10–30% revenue growth (reverificar).
- **Media buying:** las plataformas ya son IA (PMax/Advantage+); llega el **media buying
  agéntico** (agentes que optimizan cross-plataforma). Aliméntalos con señal/first-party (`03`).
- **Testing:** synthetic audiences para pre-testear mensajes antes de gastar (valida con
  audiencia real; no reemplaza la señal de mercado).
- **Análisis:** síntesis de performance, insights, generación de hipótesis (que luego growth
  experimenta, `growth-marketing-cro` 04).

## 3. GEO / AI-search como canal (la IA como superficie)

- El descubrimiento migra a motores IA (AI Overviews, ChatGPT, Perplexity, Copilot). Como
  **canal de marketing**, esto es distribución de contenido y presencia de marca (→ `02`).
- La **táctica técnica** (schema, chunking, llms.txt, citabilidad por-motor, entidad) es de
  **`seo-aeo`**. Aquí decides *estar presente* en ese canal y *qué contenido* alimentarlo.
- En Efeonce el AEO/AI Visibility Grader **mide** esta presencia — es producto, no táctica de
  esta skill (ver `growth-marketing-cro/efeonce/AEO_GRADER_AS_LEAD_MAGNET.md` para el loop).
- El reporte público final del grader vive en `think.efeoncepro.com/brand-visibility/r/<token>`
  y debe consumir facts de Greenhouse (`model.viewFacts`), no recalcular semántica en marketing.

## 4. Gobernanza y brand safety (el gap crítico de 2026)

**Dato-ancla:** las organizaciones sobre-invierten en generación (22% del budget, 81% adopción)
y sub-invierten en governance (3% del budget, 31% adopción) → contenido IA inunda canales sin
oversight para atrapar sesgo, asegurar compliance o auditar claims.

Gobernanza mínima obligatoria:
- **Human-in-the-loop** para todo lo que publica/gasta/decide. Agentes autónomos sin supervisión
  amplifican errores a escala.
- **Data governance:** consentimiento, calidad de datos, control de acceso. Los agentes que
  deciden sobre datos malos magnifican el daño.
- **Brand safety:** control de marca/tono/claims sobre output IA; revisión antes de publicar.
- **Compliance:** las políticas frontier (NIST AI RMF, ISO/IEC 42001, EU AI Act) aún no cubren
  bien "agentic"; no delegues juicio legal/ético a un modelo. En Chile, PII bajo **Ley 21.719**.
- **Auditoría de claims:** no publiques afirmaciones generadas sin verificar (riesgo legal/marca).

## 5. Cómo adoptar IA en marketing (secuencia sana)

1. **Empieza por el análisis y la producción** (bajo riesgo, alto apalancamiento): variantes,
   research, síntesis.
2. **Sube a personalización/predicción** con datos limpios y consentidos.
3. **Agéntico con guardrails:** define qué puede ejecutar el agente, con qué límites, y el punto
   de aprobación humana. Invierte en governance **antes** de escalar generación.
4. **Mide el impacto real** (no output volume): ¿mejoró performance/eficiencia sin costo de marca?

## 6. Regla de oro

**Genera con IA, decide con humanos.** La IA multiplica ejecución; la estrategia, el juicio de
marca y la responsabilidad legal siguen siendo humanos. Sobre-invertir en generación sin
gobernanza es el antipatrón más caro de 2026 (`ANTIPATTERNS`).

## Checklist de salida

- [ ] Capa de IA correcta para la tarea (generativa/predictiva/agéntica).
- [ ] Human-in-the-loop en todo lo que publica/gasta/decide.
- [ ] Data governance + brand safety + auditoría de claims antes de escalar generación.
- [ ] Presencia en GEO/AI-search como canal (táctica técnica cedida a seo-aeo).
- [ ] Impacto medido por performance/eficiencia real, no por volumen de output.

## Cross-links

- Contenido para GEO → `02`; creativo IA → `05`; media buying IA → `03`; martech/datos → `08`
- Táctica técnica AEO/GEO/schema → `seo-aeo`; experimentación de hipótesis IA → `growth-marketing-cro` (04)
- El grader como producto de medición de IA-visibility → overlay de `growth-marketing-cro`
- Errores (generar sin governance, agentes sin humano) → `ANTIPATTERNS.md`
