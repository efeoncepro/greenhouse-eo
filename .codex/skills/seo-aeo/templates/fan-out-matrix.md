# Plantilla — Matriz de Query Fan-Out

> Herramienta para mapear el espacio de sub-queries que un motor IA (Google AI
> Mode) generaría a partir de un tema/query principal, y auditar si tu contenido
> lo cubre. Base teórica: `modules/04_AEO_GEO.md`. Un buen cluster de contenido
> = cobertura del fan-out = recuperabilidad en AEO.

## Cómo se usa
1. Define la **query/tema principal**.
2. Genera 8–15 sub-queries de los 4 tipos (usa PAA, autocompletar, Semrush, y
   pregúntale a un LLM "¿qué sub-preguntas implica esta consulta?").
3. Para cada una, marca si **ya la cubres** (URL + answer capsule) y la acción.
4. Las filas sin cobertura = backlog de contenido priorizable por RICE.

## Tema principal
`EJEMPLO: "software de facturación electrónica en Chile"`

## Matriz

| # | Tipo | Sub-query | ¿Cubierta? (URL) | Tiene answer capsule | Acción (RICE) |
|---|------|-----------|------------------|----------------------|---------------|
| 1 | Relacionada | ¿Qué es la facturación electrónica? | /guia/... | ✅/❌ | — / crear / mejorar |
| 2 | Relacionada | ¿Cómo emitir una factura electrónica? | | | |
| 3 | Comparativa | Mejores software de facturación en Chile | | | |
| 4 | Comparativa | {Marca} vs {Competidor} | | | |
| 5 | Comparativa | Alternativas a {Competidor} | | | |
| 6 | Implícita | ¿Cuánto cuesta? (pricing) | | | |
| 7 | Implícita | ¿Es obligatorio ante el SII? | | | |
| 8 | Implícita | ¿Cómo empezar / requisitos? | | | |
| 9 | Implícita | Pros y contras | | | |
| 10 | Reciente/temporal | Cambios SII 2026 | | | |
| 11 | Reciente/temporal | Última versión / novedades | | | |

## Lectura del resultado
- **% de cobertura del fan-out** = filas cubiertas / total.
- Las sub-queries **implícitas y comparativas** sin cubrir suelen ser las de
  mayor valor (intención cercana a la decisión).
- Prioriza por RICE (SKILL.md §4): reach (volumen/frecuencia del prompt) ×
  impact × confidence / effort.
