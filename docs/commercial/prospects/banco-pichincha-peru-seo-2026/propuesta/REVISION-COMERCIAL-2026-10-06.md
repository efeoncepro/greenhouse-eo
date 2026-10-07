# Revisión comercial independiente · Pibank · 06-10-2026

**Uso interno.** Revisión cruzada del contenido del [deck-plan](deck-plan.json), [memo fuente](RESUMEN-EJECUTIVO-PIBANK-2027.md), [research](../research/PIBANK-DEMAND-2026-10-06.md), [dataset](../research/pibank-demand-2026-10-06/demand-inputs.json), [resultados del modelo](../modelo/results.json), [guía](../modelo/README.md) y [capacidad candidata](ALCANCE-Y-COSTEO-INTERNO.md). Esta revisión no editó renders. Cierre confirmado por integración: memo 2 páginas, deck 12 láminas y anexo 7 páginas, revisados visualmente, con fuentes/imágenes inicializadas y sin overflow observado. [QA del paquete](../../../../audits/commercial/2026-10-06-pibank-proposal-package-qa.md) y [manifiesto](delivery-manifest.json) conservan la evidencia.

## Dictamen

El argumento comercial separa de forma consistente demanda histórica, escenarios ilustrativos y resultado bancario. La escala documentada no sostiene una promesa del 1% de las cuentas. Puede revisarse como preparación de un M1 con entrega y decisión verificables; no acredita un semestre contratado ni su retorno.

Las recomendaciones P1 sobre acuerdo inexistente y P2 sobre CAC/ROI y primera decisión M1 se aplicaron en fuente y render, confirmadas por integración. No hay inconsistencia aritmética material en los valores mostrados. La lectura no reemplaza revisión editorial de Julio, aceptación bancaria ni Finance/Operations.

## Evidencia contrastada

| Elemento | Resultado de revisión | Límite de interpretación |
|---|---|---|
| Demanda activa 3.900/mes | Coincide con seis grupos del dataset; MAX dentro de grupo, sin sumar variantes equivalentes | Agregación editorial selectiva, no mercado total ni personas; solapamiento entre grupos pendiente |
| Universo 127 / 113 / 14 | Coincide con keywords normalizadas / volumen disponible / resultado ausente | Un nulo no es cero; no son 127 intenciones independientes |
| Alto rendimiento 1.600 | Excluido del activo por mezcla geográfica en SERP; pool bruto 5.500 conservado | No deducir elegibilidad peruana solo del volumen localizado; no negar que exista demanda real |
| Periodo/procedencia | PE/es; actualización septiembre y serie mensual hasta agosto 2026, anterior al lanzamiento | No baseline Pibank postlanzamiento ni forecast 2027 |
| 3/3 genéricas sin Pibank | Coincide con panel completo a profundidad solicitada 20 | No «cero visibilidad»: las filas orgánicas reales no son exactamente veinte en todas las respuestas, y el panel es pequeño |
| 2,12 / 13,88 / 40,15 fondeadas | Coincide con outputs semestrales ilustrativos | Fracciones matemáticas; no cuentas observadas ni previsión aprobada |
| 0,014% / 0,091% / 0,264% | Coincide con dividir outputs por 15.200 y expresar porcentaje | Referencia de escala: definición y periodo de la meta no están confirmados; no comparar como periodos equivalentes acordados |
| 152 cuentas = 1% | Aritmética correcta | Banda de escala; no target acordado ni resultado sustentado por esta muestra |
| US$38m | 15.200 × US$2.500 consistente | Inferencia provisional de Julio, no confirmación de Jesús; no producto USD ni FX acreditado |
| Saldo / dinero externo / valor | Deck y memo declaran que fondeo no es ingreso | Valor bancario necesita método, horizonte, costos y Finance; no sumar saldo de cierre como flujo ni beneficios superpuestos |
| 995,9 h | 866 base + 129,9 reserva candidata consistente | Capacidad interna de planificación, no fee, costo monetario, disponibilidad ni carga ya aprobada |

## Recomendaciones concretas antes de entregar

| Prioridad | Ubicación | Cambio recomendado | Motivo / aceptación |
|---|---|---|---|
| P1 | Deck `condiciones.summary.label` | Sustituir «Hito de viabilidad acordado» por «Hito de viabilidad por acordar» | El banco aún no aceptó M1 ni sus criterios; no declarar acuerdo por documentación candidata |
| P2 | Memo «Economía y condiciones» y deck escenarios | Separar «CAC pendiente de inversión completa y denominador válido» de «ROI/payback pendientes además de valoración Finance» | CAC es costo por cuenta incremental, no depende de valorar saldo como ingreso. Los tres siguen N/D actualmente |
| P2 | Deck siguiente y cierre del memo | Hacer explícito que la primera decisión es alcance/criterios/costo de M1; semestre sujeto al gate | «Validar el primer mes y el semestre» puede leerse como compra simultánea; no elevar capacidad candidata a paquete firme |
| P2 | Deck demanda / nota oral | Aclarar que «profundidad 20» es solicitada, no veinte resultados orgánicos independientes ni censo de visibilidad | Mantener la lectura selectiva y evitar «ausente en Google» |
| P2 | Revisión de pricing | Mantener 995,9 h fuera del relato público y no convertirlas en precio sin costos/roster aprobados | Importancia de cuenta no autoriza un scope grande ni retainer sin viabilidad |

No se requiere sumar más keywords indiscriminadamente para resolver estos puntos. Revisar términos más amplios compatibles —cuenta digital, ahorro con interés y usos de ahorro— con filtro de producto, competencia transaccional y geografía antes de agregarlos. La marca y búsquedas de soporte no se incorporan como adquisición incremental genérica.

## Decisión interna de preparación

**No vender seis meses ni 995,9 horas mediante una promesa de aportar el 1%.** Las bandas 1/5/10% son referencias y la muestra activa no sostiene la primera en el ejercicio actual. La decisión operativa de esta revisión es preparar M1 como trabajo acotado con criterios verificables y un gate de continuidad. No es autorización de fee, reserva de equipo ni contrato.

Antes de emitir fee del semestre: ampliar/validar demanda relevante, contrastar embudo y economía con el banco y completar costo/disponibilidad con Finance/Operations. Se puede preparar el costeo y alcance de M1 sin inventar ROI; la decisión de contratar y cualquier importe requieren revisión comercial.

### Criterios candidatos para acordar M1

1. **Fuente y definición:** banco confirma moneda, periodo, cuenta abierta/fondeada, ticket y saldo; faltantes quedan escritos con owner y fecha de decisión, sin números sustituidos por cero.
2. **Demanda elegible:** entregar cobertura de clusters y exclusiones con geografía, idioma, periodo y regla de deduplicación; ampliar solo términos compatibles; distinguir marca/soporte/adquisición y recalibrar modelo.
3. **Accesos y viabilidad:** responsables reales, estado GSC/analítica/CMS/staging y quién implementa; primer cambio seguro aceptado o impedimento demostrado y decisión de alcance alternativa.
4. **Embudo y datos:** definiciones por etapa, handoff a registro/app y fuente agregada de apertura/fondeo/saldo; prueba de conciliación viable o brecha documentada con owner, sin contar clic como cuenta.
5. **Backlog y entrega:** hallazgos con URL/fecha/fuente, esfuerzo y aceptación; aprovechar producto/calculadora/FAQ existentes; aprobación bancaria de condiciones y contenido candidato.
6. **Economía:** modelo recalibrado con supuestos trazables; inversión/costos completos y método de valor validados cuando existan. ROI N/D si faltan; evaluación de escala/costo que permita continuar, reducir alcance o detener expansión.

Estos criterios son de control y evidencia, no garantías de rankings, citas o cuentas en treinta días. Los umbrales comerciales mínimos se acuerdan tras costo y valoración; no se inventan en esta revisión. Si a M1 sigue sin existir fuente de fondeo o implementación viable, decidir expresamente un scope menor, recalibración o pausa, en vez de tratar resultados ilustrativos como éxito.

## Estado de entrega y siguiente paso

Materiales para 09-10; revisión prevista semana del 12-10 y gerencia semana del 19-10. Son el calendario expresado, sin comunicación nueva ni comité confirmado por esta preparación. Fuente corregida y render/QA local completados; revisar con Julio antes del envío. Demo DEV y assets candidatos no constituyen publicación o aprobación de marca Pibank.

### Verificación posterior de recomendaciones · 06-10-2026

- P1 aplicado: `condiciones.summary.label` declara «Hito de viabilidad por acordar».
- P2 CAC/ROI aplicado: memo separa inversión/cuentas válidas de la valoración adicional para ROI/recuperación; deck distingue ambos requisitos. N/D se mantiene.
- P2 M1 aplicado: memo y lámina «siguiente» piden cerrar alcance, criterios y costo de M1; semestre candidato condicionado a viabilidad.
- Cambios incluidos en fuente y render final, según confirmación del responsable de integración. La revisión de strings fuente se contrastó directamente; la evidencia visual está en QA del paquete.

No cambia el dictamen de escala: 3.900/mes selectivo y resultados ilustrativos no sostienen promesa del 1%. La revisión comercial de Julio, valoración bancaria, costos reales, pricing y aceptación del cliente siguen pendientes.
