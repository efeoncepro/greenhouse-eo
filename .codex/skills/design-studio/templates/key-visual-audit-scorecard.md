# Scorecard de auditoría de Key Visual

> **Cómo usar.** Puntúa cada dimensión 0–5 con una nota que justifique el número
> (no pongas 3 "porque sí"). Suma el total sobre 50, lee el semáforo y escribe
> findings accionables priorizados — nunca "no me gusta", siempre "cambia X porque Y".
> Entrecierra los ojos antes de puntuar jerarquía y composición: lo que sobrevive
> borroso es lo real. Se apoya en `modules/05_KEY_VISUAL_AUDIT.md`.

- **Visual auditado:** [nombre / archivo / link]
- **Contra qué brief:** [`key-visual-brief.md` de ___]
- **Fecha / auditor:** [YYYY-MM-DD · quién]

## 1. Rúbrica (0 = ausente · 3 = correcto · 5 = excelente)

| # | Dimensión | Qué evalúa | Puntaje | Nota (por qué ese número) |
|---|---|---|---|---|
| 1 | **Brand-fit** | ¿Es reconociblemente la marca sin el logo? ¿Respeta SSOT/AXIS? | [_/5] | [___] |
| 2 | **Claridad de concepto** | ¿La idea se entiende en 1–3s? ¿O es decoración sin mensaje? | [_/5] | [___] |
| 3 | **Jerarquía** | ¿Un solo nivel-1 claro? ¿El ojo sabe qué mirar primero? | [_/5] | [___] |
| 4 | **Color** | ¿Paleta intencional, con acento? ¿Armonía o ruido? | [_/5] | [___] |
| 5 | **Tipografía / legibilidad** | ¿Jerarquía tipográfica, medida, contraste texto/fondo? | [_/5] | [___] |
| 6 | **Composición** | ¿Balance, eje común, uso del espacio negativo, flujo de lectura? | [_/5] | [___] |
| 7 | **Reproducibilidad cross-format** | ¿Sobrevive de 9:16 a valla sin romperse? ¿Safe zones? | [_/5] | [___] |
| 8 | **Accesibilidad / contraste** | ¿Texto legible (WCAG AA)? ¿Funciona en B/N y baja visión? | [_/5] | [___] |
| 9 | **Originalidad** | ¿Evita el cliché de stock/IA? ¿Tiene un punto de vista? | [_/5] | [___] |
| 10 | **Craft** | ¿Terminación fina — recortes, bordes, grano, tipo, alineación? | [_/5] | [___] |

**TOTAL: [__] / 50**

## 2. Semáforo

- 🟢 **42–50 · Aprobar** — listo o con ajustes menores de craft.
- 🟡 **30–41 · Iterar** — concepto vive, ejecución no; una vuelta más dirigida.
- 🔴 **0–29 · Rehacer** — falla concepto o jerarquía; no se salva puliendo.

**Veredicto:** [🟢/🟡/🔴] — [una frase]

## 3. Señales de "look IA genérico" (marca las presentes)

- [ ] Iluminación cinematográfica sin motivo (todo bañado en dorado/teal).
- [ ] Simetría perfecta + bokeh + lens flare como muletilla.
- [ ] Composición centrada estática sin tensión ni foco.
- [ ] Texturas "plásticas/ceradas" uniformes, cero imperfección real.
- [ ] Tipografía renderizada por el modelo (letras deformes, kerning imposible).
- [ ] Manos/dedos/reflejos rotos, detalles que no resisten el zoom.
- [ ] Paleta "default del modelo", no la de la marca.
- [ ] Concepto decorativo sin idea — se ve caro, no dice nada.

> Si marcas ≥ 3, la dimensión **Originalidad** y **Craft** deben bajar y el visual
> necesita dirección más específica (paleta de marca, referencia, post-proceso, o handoff humano).

## 4. Findings accionables priorizados

| Prioridad | Dimensión | Problema concreto | Cambio propuesto |
|---|---|---|---|
| **P0** (bloqueante) | [___] | [qué falla] | [qué hacer] |
| **P1** (alto) | [___] | [___] | [___] |
| **P2** (pulido) | [___] | [___] | [___] |

## 5. Próximo paso

- **Decisión:** [aprobar / iterar / rehacer / handoff humano]
- **Quién ejecuta:** [`greenhouse-ai-image-generator` / diseñador / IA dirigida]
- **Qué se re-audita:** [dimensiones que deben subir en la próxima vuelta]
