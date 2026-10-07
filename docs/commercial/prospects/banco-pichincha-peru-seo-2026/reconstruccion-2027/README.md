# Pibank 2027 · Reconstrucción de propuesta y decisión de inversión

**Versión de preparación v0.6 · 06-10-2026.** Propuesta técnica escrita para el banco, alcance anual enfocado y modelo de decisión. Preparación local; no acredita precio aprobado, rentabilidad, envío, adjudicación ni contrato.

## Qué cambió y por qué

Julio objetó que el plan estaba escrito para el operador y que 10/50/147 cuentas fondeadas no sustentaban la capacidad propuesta. El panel de cinco consultas era una muestra parcial, con tasas ilustrativas sin línea base. Retiramos esos escenarios y las capacidades de 2.896/2.044 horas como recomendación para cliente; los originales se conservan como historia, sin corregir sus cifras para hacer atractiva la inversión.

La nueva lectura MCP de la transcripción confirma que Jesús pidió aporte a **aperturas** y un ejercicio desde el lanzamiento. Fondeo y permanencia son resultados posteriores. El periodo y la definición de las 15.200 cuentas no quedaron fijados. El programa de doce meses en 2027 no convierte automáticamente esa meta en anual.

## Material vigente

- [Propuesta para Pibank](PROPUESTA-PARA-PIBANK-2027.md): oportunidad, respuesta al lanzamiento, alcance, secuencia, medición y colaboración.
- [PR y autoridad 2027](PLAN-PR-Y-AUTORIDAD-2027.md): cuatro campañas, doce ángulos, 48 propuestas y objetivos editoriales sujetos a baseline.
- [Calendario integrado](CALENDARIO-INTEGRADO-2027.md), [condiciones de ejecución](CONDICIONES-DE-EJECUCION-2027.md) y [evidencia competitiva completa dentro de filtros](../research/pibank-gap-closure-2026-10-06/README.md).
- [Resumen para gerencia](RESUMEN-PARA-GERENCIA.md).
- [Revisión de alcance interna](REVISION-DE-ALCANCE.md) y [capacidad por rol/mes](capacidad-programa-con-pr.csv): 1.066 horas base y 150 de reserva, incluyendo PR, hipótesis sin roster/costo/fee aprobados.
- [Oportunidad y cobertura](OPORTUNIDAD-Y-COBERTURA.md), [32 familias](oportunidades-curadas.csv) y [validación](validacion-demanda.json): corpus completo clasificado, sin sumar búsquedas como personas ni estimar resultados propios sin base.
- [Readback de reunión](meeting-readback.json): extracto sin enlaces privados; solicitud contrastada por MCP.

El Excel v0.6 integra 1.216 h de SEO/GEO+PR, costos por 13 funciones, 19 familias de demanda y calendario único. La v0.4 queda archivada. Costos reales y aprobación económica permanecen pendientes.

El [nuevo modelo de decisión](economia/Pibank-decision-inversion-2027.xlsx) vive en `economia/`; permite separar aperturas/fondeadas, requisitos de tráfico y valor bancario. Bandas porcentuales y conversiones de prueba no son objetivos acordados ni forecast. Marca, conversión, servicio, retención y AEO se evalúan por separado, sin sumar beneficios no medidos.

## Cierre comercial

La propuesta técnica puede evaluarse sin convertir escenarios ilustrativos en promesas. Para adjuntar una oferta económica vinculante, Efeonce debe completar costo por rol, herramientas, capacidad disponible, margen y condiciones; el banco define criterios de valoración y meta del canal. El horizonte anual permanece. No se reemplaza la falta de evidencia por una tarifa o retorno inventados.

Las versiones previas bajo `propuesta/`, `modelo/`, `propuesta-anual/` y `modelo-anual/` conservan evidencia de su preparación. Su QA técnica no certifica su suficiencia económica ni su aceptación comercial.

## Evidencia de cierre local

[QA vigente v0.6](../../../../audits/commercial/2026-10-06-pibank-brechas-cierre.md) y [registro de brechas](CIERRE-DE-BRECHAS-2027.md): calendario/modelo/cobertura integrados; condiciones externas identificadas.

[QA histórica de ampliación PR](../../../../audits/commercial/2026-10-06-pibank-pr-autoridad.md) · [QA histórica del modelo](../../../../audits/commercial/2026-10-06-pibank-reconstruccion-qa.md) · [manifest](delivery-manifest.json) · [29 pruebas del modelo](economia/validation.json). PDFs: técnica 11p, resumen 2p y presentación 14p; lectura visual completa. Fórmulas/cachés sin error. Precio, valoración y disponibilidad real permanecen pendientes.

Reproducción local: `node render-src/build-client-package.mjs` desde la raíz del repo para memo/resumen; para deck, generar `deck-plan.json` con `node render-src/build-client-deck.mjs`, componer con `pnpm deck:compose <plan> --out <directorio-interno>` y copiar únicamente el PDF revisado a la carpeta cliente. Se usa el catálogo canónico; ninguna modificación de runtime.

## Análisis solicitado: meta hacia atrás

[Análisis desde US$38m](meta-hacia-atras/ANALISIS.md) y [cálculo reproducible](meta-hacia-atras/resultados.json): 100% del objetivo monetario, apertura/fondeo, sensibilidad de conversión, stock al corte y contribución multicanal. Ventana de doce meses para planificación, no período bancario confirmado. No modifica PDFs/XLSX ni adopta un porcentaje como objetivo acordado.
