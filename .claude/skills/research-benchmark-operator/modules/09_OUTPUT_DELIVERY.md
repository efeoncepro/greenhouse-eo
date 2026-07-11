# 09 · Output & Delivery

El research más riguroso no vale nada si el entregable no se entiende o no se usa. Este módulo estructura la salida para que habilite la decisión. El **visual** lo produce `dataviz`; acá defines la estructura y la narrativa.

## Principio: empieza por la conclusión (BLUF)

**Bottom Line Up Front.** El decisor no lee 40 páginas para encontrar la respuesta. Estructura:

```
1. Exec summary (1 página / 3 bullets): la respuesta + confianza + la acción recomendada
2. Hallazgos clave (con evidencia, as-of, confidence)
3. Detalle / metodología (peer set, fuentes, límites) — para quien quiere profundizar
4. Apéndice (source log, datos crudos)
```

El 80% de la audiencia solo lee el exec summary — que sea autosuficiente.

## El exec summary (lo que más importa)

- **La respuesta a la pregunta**, no un resumen de lo que hiciste.
- **La acción recomendada** (implicación), no solo el hallazgo.
- **Confidence** explícito y **limitaciones** clave.
- 1 página o menos. Si no cabe, no lo entendiste lo suficiente.

## Cada hallazgo, auditables

Formato por hallazgo (de `05`): **afirmación → evidencia (fuente + as-of) → confidence → implicación**. Esto permite que cualquiera rastree de dónde salió cada cosa — lo que separa research de opinión.

## Transparencia de método (no negociable)

Incluye siempre: **peer set + por qué** (benchmark), **fuentes + as-of**, **normalización**, **limitaciones y confidence**. La transparencia del método ES la credibilidad — sobre todo para clientes (`11`), que pagan por confiar en el resultado.

## Visualización → dataviz

- Los scorecards, comparaciones, tendencias y gaps se **visualizan con `dataviz`** (elección de encoding, color colorblind-safe, ejes honestos, anotaciones).
- Regla honesta: **ejes que no engañan** (empezar en 0 cuando corresponde), sin distorsionar el gap para el efecto. Un benchmark con un gráfico tramposo pierde toda la credibilidad que ganó con el rigor.
- Para reportes de cliente con render (PDF/web), coordina con `content-marketing-studio`/public-site según el destino.

## Formato por audiencia

| Audiencia | Formato | Foco |
|---|---|---|
| Decisor interno Efeonce | memo 1 pág / deck corto | respuesta + acción |
| Equipo (que ejecuta) | doc con detalle + source log | el "cómo" y el "por qué" |
| **Cliente** (`11`) | deck/reporte pulido + exec summary | insight + recomendación + credibilidad de método |
| Público (data study) | pieza de contenido citable | el hallazgo original (→ `content-marketing-studio`) |

## Cierra el loop

- **Recomendación accionable** con owner y siguiente paso, no solo hallazgos.
- **Hand-off nombrado:** ¿quién toma la acción? (comercial → `commercial-expert`; contenido → `content-marketing-studio`; SEO/AEO → `seo-aeo`; ejecución técnica → arch/backend).
- Si el research se vuelve **data study** público, es munición de autoridad (→ `content-marketing-studio` `03`).

## Checklist de salida

- [ ] **Exec summary autosuficiente** (respuesta + acción + confidence), 1 página.
- [ ] BLUF: conclusión primero, detalle después.
- [ ] Cada hallazgo **auditable** (fuente + as-of + confidence + implicación).
- [ ] **Método transparente** (peer set, fuentes, normalización, límites).
- [ ] Visual honesto vía `dataviz` (ejes que no engañan).
- [ ] Recomendación con owner + hand-off nombrado.

## Cross-links

- Síntesis/confidence → `05`; scorecard/gap → `08`; para clientes → `11`.
- Visual → `dataviz`; data study público → `content-marketing-studio`; acción → skill dueña.
- Artefacto → `templates/exec-summary.md`.
