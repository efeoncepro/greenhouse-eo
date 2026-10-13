# Pibank 2027 · Estrategia integrada de crecimiento

**v0.7 · 07-10-2026 · Uso interno para integrar propuesta y deck.** Dirección solicitada por Julio: doce meses; SEO/AEO, hub en WordPress, herramientas, comunidad obligatoria en la recomendación, PR y búsqueda pagada. **Instrucción de Julio durante integración: SEM es contexto de eficiencia; Efeonce no operará campañas. Esta nota es interna y no se traslada como exclusión al deck/propuesta cliente.** No es alcance aceptado por el banco, inversión autorizada ni forecast. El modelo económico v0.6 conserva su alcance y hashes; no costea esta ampliación.

## 1. Tesis y punto de partida

Construir un sistema que ayude a descubrir Cuenta Soles, comprenderla, compararla, abrirla y realizar el primer depósito. SEM aporta captación y aprendizaje desde el inicio autorizado; SEO/AEO y el hub desarrollan activos reutilizables; PR distribuye fuentes útiles; comunidad mantiene la relación; conversión y activación mejoran el aprovechamiento de esas llegadas.

El cálculo parte del 100% monetario provisional: **US$38m ÷ US$2.500 = 15.200 fondeadas → ~23.385 aperturas → ~1.169.231 visitas elegibles**, a tasas ilustrativas de 65% de fondeo y 2% de apertura. En doce meses de planificación serían ~97.436 visitas mensuales en promedio. El período bancario no está confirmado. Esta es una prueba de escala del embudo completo, no una exigencia de 1,17m de visitas adicionales SEO ni evidencia de que todos los canales puedan producirlas.

**760 es el escenario parcial de 5%, no una proyección final; 762 no es un resultado del cálculo.** El Excel v0.6 inicia en 1%/Aperturas (152), un ejemplo editable. Su selección inicial no gobierna la narrativa. Si 15.200 significa aperturas, a 65% produciría 9.880 fondeadas y US$24,7m de depósitos iniciales al ticket supuesto; conservar ambas metas separadas hasta definirlas con el banco. US$38m es interpretación de Julio, no moneda confirmada por Jesús ni promesa de saldo mantenido.

| Tasas de sensibilidad, sin mejora demostrada | Visitas para 15.200 fondeadas | Promedio mensual si se usan doce meses |
|---|---:|---:|
| Apertura 2%; fondeo 65% | 1.169.231 | 97.436 |
| Apertura 3%; fondeo 75% | 675.556 | 56.297 |
| Apertura 4%; fondeo 80% | 475.000 | 39.584 |

Los redondeos se aplican al final, de forma independiente. No seleccionar una tasa por conveniencia. Ticket, conversión, fondeo, madurez y saldo deben compartir población y ventana. Depósitos no son beneficio bancario.

## 2. Arquitectura: producto, hub, satélites y herramientas

La URL existente [Cuenta Soles](https://pibank.pe/cuenta-soles-pibank/) será la **página pilar comercial**. Mejorar claridad de uso, rendimiento/costos, liquidez, respaldo, fuentes y revisión, requisitos, continuidad hacia apertura y rutas hacia recursos. Mantener la intención comercial y las condiciones gobernadas por Producto/Cumplimiento.

Proponer un **hub de ahorro dentro de `pibank.pe`**, con rutas por decisiones, no sólo un feed cronológico. WordPress del sitio público fue [verificado el 07-10](../research/CMS-PIBANK-2026-10-07.md); entorno, tema, plantilla, permisos y operación se acuerdan con TI/proveedor. Las rutas nuevas son propuestas hasta implementación; no crear otro dominio por conveniencia del equipo.

| Territorio | Satélites y trabajo que resuelven | Herramienta / siguiente paso |
|---|---|---|
| Rendimiento y costos | TREA, ejemplos reproducibles, condiciones y comparación neta | Calculadora existente mejorada → condiciones/producto |
| Comparación y elección | Criterios de ahorro, liquidez y acceso; marcas sólo con aprobación específica | Comparador explicable → producto pertinente |
| Ahorro disponible | Separar ahorro/gasto, metas e imprevistos | Planificador → decisión de ahorro y producto |
| Confianza e identidad | Quién respalda el producto, fuentes vigentes y canales oficiales | Documentación → condiciones/apertura |
| Apertura | Requisitos y pasos, dudas antes del registro | Registro bancario autorizado |
| Primer fondeo | Transferencias, primer depósito y ayuda oficial | Instrucciones bancarias y soporte |

Cada satélite tiene intención principal, fuentes, owner, revisión, relaciones y siguiente paso. Enlaces producto↔satélite y entre recursos relacionados cuando ayuden a decidir; evitar URLs equivalentes que compitan por la misma intención. Artículos, FAQ, tools, newsletters y comunicaciones son unidades distintas; una reutilización no vuelve a contarse como artículo nuevo.

Las tools se diseñan como funcionalidades: fórmula/versiones, supuestos, salida explicable, accesibilidad, privacidad, eventos, QA y mantenimiento. Mejorar la calculadora y desarrollar dos herramientas nuevas no cabe automáticamente en los paquetes CMS de ocho horas del alcance anterior. El comparador puede usar criterios generales sin marcas; sus cifras deben permanecer sincronizadas con las fuentes aprobadas.

## 3. Cadencia candidata para dimensionar la ampliación

Estas cantidades son una propuesta de operación, no una predicción de cuentas ni un compromiso respaldado por roster/costos. Se revisan al dimensionar recursos y acuerdos; no aumentarlas mecánicamente para hacer cuadrar la meta.

| Frente | Envolvente propuesta v0.7 | Tratamiento frente a v0.6 |
|---|---|---|
| Hub y pilar | Un hub, mejora del pilar comercial y sistema de plantillas/relaciones | El hub es trabajo nuevo; el pilar reutiliza producto |
| Editorial | 24 artículos sustanciales candidatos, dos al mes, por intención distinta | Sustituye la envolvente anterior de 12 entregas/hasta seis URLs nuevas; no se suma sobre ella |
| FAQ | Mantener 24 mejoras prioritarias sobre el corpus existente | Dos al mes; no contarlas como artículos |
| Herramientas | Calculadora existente mejorada + dos tools nuevas: comparador y planificador | Desarrollo/QA/mantenimiento por dimensionar |
| Comunicaciones | 48 adaptaciones candidatas, cuatro al mes, para canales acordados | Derivados con utilidad/canal; no 48 artículos ni canales operados por inferencia |
| Comunidad | 12 newsletters y cuatro sesiones digitales con experto; operación de escucha/moderación acordada | Frente obligatorio de la recomendación; disponibilidad y responsabilidades por costear |
| Eficiencia SEO–SEM | Revisión de intención, destinos y señales orgánico/pagado; recomendaciones de mejora | Insumo de campañas disponibles; no es operación publicitaria Efeonce |
| PR | Mantener cuatro campañas M3/M5/M8/M11, 12 ángulos, 48 propuestas y cuatro preparaciones de vocería | Recursos del hub/tools reutilizados; preparación PR no incluye automáticamente producir webinars |
| Técnico/medición | Mantener mantenimiento y panel de 36 observaciones GEO/mes; agregar hub/tools, continuidad y medición SEM/comunidad | Los 12 paquetes anteriores son base; ampliación no costeada por el Excel v0.6 |
| Gestión | 12 informes conjuntos y revisiones M3/M6/M9/M12 | Un tablero; cada fuente conserva su unidad |

Los [24 briefs candidatos](PLAN-DE-CONTENIDOS-V0.7.csv) y el [calendario multicanal](CALENDARIO-CRECIMIENTO-V0.7.csv) permiten costear trabajos concretos. La estrategia decide secuencia; los plazos dependen de revisión, implementación y autorizaciones, sin garantizar lanzamiento por mes nominal.

## 4. SEM y SEO como sistema de eficiencia

Primero controlar medición y destino; luego ampliar inversión según resultados. Separar marca/no marca, intenciones compatibles con el producto y campañas de aprendizaje frente a captación. Búsqueda pagada de marca no se asume incremental. No usar la página de inicio como destino universal: producto para intención comercial, tool/guía cuando resuelva mejor la necesidad, con continuidad hacia apertura.

- **Destinos compartidos:** claridad, utilidad, velocidad, confianza y continuidad pueden mejorar conversión para tráfico orgánico y pagado. El efecto debe comprobarse.
- **Aprendizaje compartido:** términos de búsqueda, mensajes y resultados SEM orientan briefs; consultas y páginas orgánicas orientan oportunidades de campaña. Registrar la fecha y población de cada señal.
- **Asignación conjunta:** evaluar clics/aperturas/fondeo combinados al ajustar pauta; probar cambios comparables, especialmente en marca. Una bajada de gasto no acredita ahorro si reduce el resultado incremental.

Sensibilidad aislada: pasar de 2% a 3% de apertura con iguales clics y gasto da 50% más aperturas y reduce 33,3% el gasto de pauta por apertura. A fondeo constante, aplica también al gasto de pauta por fondeada. No es un resultado observado; el costo total de adquisición debe incluir honorarios, producción, tecnología y operación atribuibles, sin contar un costo compartido varias veces.

No prometer un CPC menor por rankear orgánicamente. El Quality Score de Google es diagnóstico, no KPI económico ni factor directo de subasta. Medir CPC, apertura/clic o sesión según diccionario, fondeo y costo por cuenta de cohortes maduras. Fuentes: [Quality Score](https://support.google.com/google-ads/answer/6167118?hl=es), [resultados orgánicos/pagados](https://support.google.com/google-ads/answer/3097241?hl=es), [página de destino](https://support.google.com/google-ads/answer/14086?hl=es).

## 5. Comunidad y PR: relación, utilidad y distribución

La comunidad se diseña alrededor de utilidad recurrente sobre ahorro: novedades explicadas, herramientas, preguntas y sesiones expertas. M1 define audiencia, propuesta, canales, consentimiento, banco responsable y capacidad de moderación; se recomienda comenzar con newsletter y encuentros digitales apoyados por canales existentes. No asumir que abrir un grupo o acumular seguidores crea comunidad o cuentas.

Recorrido propuesto: visita a recurso → suscripción voluntaria → uso/participación → regreso a recurso/producto → apertura → acompañamiento bancario de primer fondeo. El banco valida comunicaciones e instrucciones. Usuarios y clientes no se exponen en un grupo ni se usan datos bancarios individuales para atribución por inferencia. Referidos/incentivos sólo se dimensionan si Producto/Comunicaciones los aprueban; no pertenecen al alcance por defecto.

PR utiliza recursos públicos verificables y un motivo editorial por campaña. Mantener los medios y cadencia del [plan PR](PLAN-PR-Y-AUTORIDAD-2027.md). Las metas de 8–12 coberturas y 4–8 enlaces son objetivos editoriales sujetos a respuesta del medio, no garantías. Newsletter, webinar y campaña PR pueden compartir tema/fuentes; cada producción y operación conserva su carga real.

## 6. Efecto compuesto: qué se acumula y cómo demostrarlo

Los recursos pueden seguir siendo útiles y descubrirse después de su publicación; nuevos satélites amplían decisiones cubiertas; herramientas se reutilizan en pauta/PR/comunidad; preguntas y desempeño orientan mejoras. El mantenimiento conserva utilidad y exactitud. Es una hipótesis de acumulación de activos y aprendizaje; no asumir crecimiento exponencial, autoridad automática ni que cada pieza suma tráfico nuevo.

Medir por cohorte de publicación/actualización: recursos vivos, consultas cubiertas, visitas elegibles, uso de tools, progresión a producto, apertura/fondeo disponibles y costo de producción/mantenimiento. Distinguir nuevos activos, mejoras y sustitución/canibalización de otros recursos. En AEO observar cada motor/superficie con pregunta, fecha, exactitud y fuentes; citas e impresiones no se suman como visitas o cuentas.

Las páginas deben ser útiles, rastreables y enlazadas contextualmente. No hay un número ideal de enlaces ni un marcado especial que garantice cita en Google. [Enlaces internos](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) y [guía de búsqueda generativa](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## 7. Modelo multicanal y tareas para estimar contribución

[Matriz mensual de contribución](MATRIZ-CONTRIBUCION-MULTICANAL-V0.7.csv): 12 meses × ocho orígenes mutuamente excluyentes bajo reglas por acordar. Campos numéricos vacíos significan pendientes, no cero. Orígenes: orgánico genérico, orgánico marca, referencia IA identificada, referencia editorial, búsqueda pagada genérica, búsqueda pagada marca, comunidad y directo/otros. El total de cuentas se deduplica en el banco; los contactos asistidos SEO/AEO/PR/comunidad son dimensiones del recorrido, no cuentas adicionales.

Completar para cada mes/origen: baseline y visitas adicionales alcanzables; tasa de apertura y población; tasa/ventana de fondeo; cohortes maduras; gasto de pauta, operación/producción; fuente, cobertura, responsable y estado. Vincular cada supuesto de captación a demanda compatible, destino, publicación, competencia y trayectoria; no asignar porcentajes arbitrarios del millón de visitas a canales.

```text
aperturas_por_cohorte = visitas_elegibles × tasa_apertura_de_esa_población
fondeadas_por_cohorte_en_ventana = aperturas_validadas × tasa_fondeo_en_ventana
aporte_incremental = resultado_del_programa − referencia_comparable
brecha_hacia_meta = meta_del_outcome_definido − contribución_total_compatible
```

Tratar demoras con cohortes, no aplicar una tasa anual a diciembre como si tuviera doce meses de madurez. Cuentas abiertas antes del programa que se activan se registran en un conjunto disjunto; no ayudan a una meta de nuevas aperturas. La mejora de conversión sobre tráfico existente es diferencia frente a referencia, no un nuevo canal a sumar encima del resultado total. Conciliar aperturas/fondeo con totales bancarios cuando exista acceso autorizado.

Antes de cuantificar: ampliar universo de demanda y auditar cobertura; obtener agregados web/registro/campañas que el banco habilite; elaborar escenarios con tasas explícitas por canal y costos; revisar contra la meta completa; acordar alcance, inversión y valoración. Se puede preparar el alcance con fuentes públicas, pero no inventar datos del banco. Aún falta forecast defendible del programa integrado y contrafactual cuantificado desde lanzamiento.

## 8. Costeo, versiones y próximo paso

La [capacidad v0.6](capacidad-programa-con-pr.csv) de **1.216h y 13 funciones** corresponde al plan SEO/GEO+PR anterior. Es baseline de preparación, no capacidad/costo de v0.7. El Excel v0.6 permanece editable e íntegro para esa estructura; no usarlo para cotizar hub/tools/24 artículos/comunidad/análisis de eficiencia SEO–SEM. La ampliación requiere estimar desarrollo, edición/QA, adaptación, operación de comunidad, análisis de eficiencia orgánico/pagado, analítica y mantenimiento; horas/roster y honorarios quedan pendientes. Gasto SEM se incorpora como dato de evaluación del sistema, no como inversión contratada a Efeonce.

El [calendario v0.6](CALENDARIO-INTEGRADO-2027.csv) se conserva porque alimenta el workbook de esa versión. El vigente para el programa ampliado es `CALENDARIO-CRECIMIENTO-V0.7.csv`. Propuesta/resumen/brief v0.7 gobiernan la narrativa nueva. PDFs v0.6.1 y deck14 anterior quedan históricos; nuevo deck lo prepara Claude desde el brief vigente. Ningún cambio en este documento ejecuta WordPress, anuncios, comunidades, mensajes o publicación.

Paso operativo: revisar envolvente candidata, asignar dueño por carril, completar matriz mensual y costeo; producir el deck editable con lo definido y los pendientes explícitos. La contratación/inicio y los accesos se acuerdan con el banco.
