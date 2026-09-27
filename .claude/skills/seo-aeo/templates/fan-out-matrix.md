# Plantilla — Matriz de Query Fan-Out

> Herramienta para investigar preguntas relacionadas con un tema y contrastarlas
> con el contenido existente. No predice el fan-out de una plataforma ni
> garantiza cobertura o recuperación. Base: `modules/04_AEO_GEO.md`.

## Cómo se usa
1. Define la **query/tema principal**.
2. Reúne preguntas de clientes, SERP, soporte y otras fuentes apropiadas. Añade
   sugerencias de herramientas/LLM como hipótesis, no como consultas confirmadas
   de un motor.
3. Para cada necesidad, anota si el sitio ya ofrece una respuesta útil, la URL,
   la evidencia y la brecha editorial.
4. Prioriza brechas por valor para la audiencia y objetivos del sitio; no crees
   una página por pregunta si el contenido existente responde bien.

## Tema principal
`EJEMPLO: "software de facturación electrónica en Chile"`

## Matriz

| # | Necesidad / pregunta | Fuente de la necesidad | ¿Hay respuesta útil? | URL / evidencia | Brecha / próxima acción |
|---|----------------------|------------------------|---------------------|-----------------|-------------------------|
| 1 | ¿Qué es la facturación electrónica? | Cliente / SERP / hipótesis | Sí / parcial / no | /guia/... | Mantener / mejorar / investigar |
| 2 | ¿Cómo emitir una factura electrónica? | | | | |
| 3 | Mejores software de facturación en Chile | | | | |
| 4 | {Marca} vs {Competidor} | | | | |
| 5 | ¿Cuánto cuesta? | | | | |

## Lectura del resultado
- No conviertas el conteo de filas en una métrica de recuperación o citación.
  Registra cobertura editorial y brechas con sus fuentes y supuestos.
- Las sub-queries **implícitas y comparativas** sin cubrir suelen ser las de
  mayor valor (intención cercana a la decisión).
- Prioriza por RICE (SKILL.md §4): reach (volumen/frecuencia del prompt) ×
  impact × confidence / effort.
