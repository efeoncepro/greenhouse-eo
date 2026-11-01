# Radar comercial Efeonce

### Gate de adjudicación antes de invertir en una compra — corrección18/10/2026

Mandato expreso de Julio del18/10: la compra debe superar esta verificación **antes de recomendarla, recomendar postulación, solicitar/consumir créditos, proponer/crear un Deal o convertirlo en negocio compartido**. Una aprobación previa de ejecución no acredita que la señal esté bien calificada. Revalidar inmediatamente antes de cada gasto o alta/conversión autorizada, también en procesos conocidos.

1. **Fuente y adjudicación:** leer la fuente primaria del comprador, proveedor seleccionado/adjudicado, acto/resolución de adjudicación y orden de compra/servicio cuando existan. Una búsqueda sin resultados, campo vacío o agregado «No adjudicado» no prueba ausencia de adjudicación.
2. **Contrato y fechas:** comprobar existencia/estado, firma o formalización, inicio y fin/plazo de ejecución. Leer el documento contractual disponible, no sólo el nombre del archivo. Separar publicación de firma, adjudicación y ejecución; conservar hora/zona y precisión reales. Una publicación de esta semana posterior a la firma no abre una oportunidad. El fin de ejecución no es plazo de propuestas.
3. **Participación vigente:** comprobar etapa, vía de participación y calendario del comprador: inscripción/interés/invitación, solicitudes de bases y entrega de ofertas, según apliquen. Para recomendar postulación, acreditar recepción/admisión vigente y plazo; no basta que el portal diga «Publicado» o «Abierto».
4. **Decisión obligatoria:** proveedor adjudicado/seleccionado explícito, contrato firmado o ejecución iniciada → **ADJUDICADA / DESCARTADA para esa compra**. Fuente/documento decisivo bloqueado, calendario sin acreditar o contradicción sin resolver → **INVESTIGACIÓN INCOMPLETA / HOLD**. En ambos casos: no recomendar como compra disponible, no gastar créditos ni crear/compartir Deal por esa compra. Resolver con investigación gratuita y reportar el bloqueo; no trasladar al operador una aprobación basada en una oportunidad no verificada. Los hechos contractuales específicos del comprador prevalecen sobre feeds, buscadores y agregadores.
5. **Evidencia por candidata:** reporte y JSON guardan resultado (`abierta_verificada`, `adjudicada_descartada` o `hold`), fuente primaria, fecha/hora de lectura, adjudicatario, estado/fechas contractuales y de recepción, documento leído o bloqueo y fundamento. Distinguir no aplica, no encontrado y no verificado. La evidencia vive en el expediente; no crear propiedades CRM nuevas por esta regla. Una reevaluación factual no amplía permisos de CRM, pagos o envíos.

La prospección proactiva sin convocatoria conserva su carril de hipótesis y no exige documentos que no aplican; tampoco se presenta como compra abierta. Otra iniciativa futura de una cuenta adjudicada exige una señal independiente y nuevas verificaciones, sin reutilizar esta compra como oportunidad.

**Exclusión concreta:** Esenttia HSP-0034,5600218590/CO1.REQ.11210476, adjudicadaDACARTEC; firma10/10/2026 e inicio15/10/2026. Deal66218288550 cerrado por Julio. No reabrir, perseguir admisión, volver a enriquecer, postular ni compartir por esa compra. Una nueva publicación del mismo contrato no revoca este STOP.

Brochures: [aprobados para uso comercial íntegro, sin revalidar ni recortar](../../operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md), ratificado por Julio el 17-10-2026. Usar el documento existente de HubSpot; la copia Aloja de 38 láminas no está aprobada.

Nombres de Deal/Lead: [convención vigente Efeonce](../../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

Owner: Commercial / Julio Reyes. Contrato aprobado el 13-10-2026.
[Registro de corridas](REGISTRO.md) · [Decisión de método](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

Aplicación focalizada: [Lucía/Flesan y Yvette/Sigelec, 24/10](runs/2026-10-24-lucia-yvette-prospeccion.md).
Contrasta enriquecimiento verificado con inferencia por patrón, validación técnica y autorización individual
cuando la atribución sigue inferida; conserva resultados independientes de CRM, Outlook y LinkedIn.

## Operación vigente

La automatización `prospecci-n-hubspot-reporte-diario` se convirtió de heartbeat a cron en el mismo ID,
verificado en la configuración local el 13-10-2026. Cada ejecución abre una tarea nueva en el proyecto
`greenhouse-eo` y entrega su reporte, incluso con cero hallazgos. Diario a las **09:00 America/Santiago**.
La próxima ejecución efectiva todavía no se ha observado; la configuración sí está guardada y activa.
No crear una tarea adicional dentro de la corrida ni duplicar el scheduler.

Cobertura: Chile, Perú, Colombia y México × SEO/AEO, web, creatividad/contenidos, CRM/HubSpot y medios
(planning/buying, paid digital, programmatic y DOOH). Veinte combinaciones; consultas y bloqueos explícitos.
ICP: empresas de 50+ personas verificadas, prioridad 201+, o filial con grupo mediano/grande y pertenencia
acreditados; separar escala local y global. Excepciones previas de una cuenta no cambian el ICP.

**Nuevas convocatorias para postular: publicadas dentro de la misma semana calendario de Santiago,
desde el lunes 00:00 hasta la corrida, y abiertas con evidencia.** Primera pasada: últimas 48 horas dentro
de esa semana; al menos 70% del esfuerzo de descubrimiento en la semana. Una fecha de rastreo o un filtro
no verifica publicación. Fecha relativa imprecisa queda sin confirmar. No rellenar resultados con históricos.
Procesos anteriores conocidos y todavía abiertos mantienen seguimiento separado. Señales de dos meses
sirven para credenciales y consideración futura, no para recomendar postulación. Recuperación de procesos
vencidos requiere instrucción concreta vigente; no inferir selección o adjudicación.

### Primera entrada y alertas tempranas — ajuste documental 15/10

Aplicar la [guía compartida](../tenders/RADAR_EARLY_ENTRY_GUIDE.md) en próximas investigaciones: separar
descubrimiento amplio y vigilancia de conocidos; público/privado independientes en Chile, Colombia,
México y Perú, nonprofit aparte, cinco líneas conservadas. LATAM primero y Palm Desert condicionado.
Avisar al operador señales tempranas documentadas con acción útil sin esperar el RFP completo ni
certificar elegibilidad. Priorizar interés, credenciales, inscripción y visita además del cierre final.

La pasada de 48 horas/semana se complementa con **solape mínimo de 72 horas desde el último corte
exitoso**, incluso al cruzar lunes; ampliar ante indexación tardía acreditada o interrupción y declarar
ventana real. No reclasificar publicaciones anteriores como nuevas de la semana. Prechequear identidad
canónica y URL contra bloqueos; ante falla, conservar marcadores de éxito/cobertura/IDs vistos y registrar
el intento fallido, sin rutas equivalentes. Cobertura bloqueada no equivale a cero demanda.

Por señal: publicación, disponibilidad pública, primera detección, validación, primer aviso y margen
útil a la primera puerta, con fuente/precisión/zona y desconocidos. Alta CRM no sustituye detección.
Menos de cinco días hábiles muestra **detección tardía**; no inventar calendario ni causa del retraso.
[Socopur](../tenders/socopur-agencia-marketing-digital-2027/README.md) quedó cerrado para ingreso tardío
por respuesta de Katherine del 15/10 16:54:36 UTC; su histórico no es una recuperación todavía pendiente.

Este ajuste no revalida ni cambia las automatizaciones citadas arriba, su frecuencia/suscripción o permisos.
La cronología provisional del radar horario desde el 10/10 pertenece al análisis de Socopur, no acredita
la ejecución de este cron diario. **Corrección directa de Julio, 15/10/2026 17:51 UTC:** Socopur se detectó
el 06/10/2026, sin hora/zona acreditadas, un día calendario después del cierre de interés del 05/10;
no son 24 horas exactas. El radar horario y el alta CRM del 10/10 son posteriores y no explican la detección
tardía del día 6. Publicación, disponibilidad/indexación inicial, primer aviso exacto y causa sin acreditar.
La skill personal `hubspot-saas-prospecting` y sus playbooks viven fuera
de este proyecto. La revisión ampliada confirmó que el SKILL.md ya carga el núcleo actualizado con
precedencia y quedó intacto. Los dos playbooks de acción/frescura se actualizaron mediante aprobación
puntual de escritura para esos archivos; sin cambiar permisos persistentes ni instalar copias.
[Rutas, diff y verificación de la aplicación](../../audits/commercial/2026-10-15-socopur-radar-docs-skills.md#aplicación-puntual-de-las-dos-referencias-personales).
Ante divergencia de su guía de frescura, este ajuste explicita el solape/primera puerta para el trabajo en
este repo; no afirmar que se propagó al scheduler o a otro host. Eficacia y adopción requieren evidencia
de futuras corridas; la guía no garantiza exhaustividad ni avisos en tiempo real.

## Presentación clara de acciones — corrección del 17/10/2026

El resumen que recibe Julio debe poder entenderse sin abrir el expediente ni conocer los códigos internos.
Por cada prioridad, explicar en frases completas: qué pide la empresa, qué decisión concreta falta,
por qué importa la fecha y qué información o material permite resolverla. Identificar quién puede hacer
el siguiente paso; no pasar al operador una instrucción genérica como «revisar paquete» o «validar capacidad».

Separar **decisiones y preparación próximas**, **autorizaciones puntuales pendientes**, **investigación que
le corresponde al agente** y **acciones ya programadas o cuentas en espera**. Una programación existente
no es una tarea nueva para Julio. Mostrar las 3–5 prioridades reales primero, conservar los demás pendientes
en el reporte detallado y explicar cualquier dependencia de acceso o del comprador. Fechas con día, hora
y zona cuando estén acreditadas; no inventar urgencia para hoy sábado. Explicar siglas imprescindibles;
IDs, tablas de cobertura, consultas y evidencia técnica quedan como referencia después de la acción.
Esta corrección editorial no modifica permisos, aprobaciones, ICP, ventanas ni obligaciones de investigación.

## Registro por corrida

1. Leer este registro, skills y el historial privado antes de buscar; los chats nuevos no tienen toda la conversación.
2. Crear `runs/YYYY-MM-DD-HHMM.md` y `queries/YYYY-MM-DD-HHMM.json`, hora Santiago, con sufijo si existe.
3. Guardar las consultas reales, país/línea, filtros/ventana, fuente y fecha de lectura, resultados/descartes,
   bloqueos, acciones, IDs estables y cambios/aprobaciones/CRM. Si falta el dato no reconstruirlo como observado.
4. Actualizar REGISTRO.md con enlaces, totales únicos y resultado. Nunca sobrescribir una corrida previa.
5. No guardar PII, correos individuales, teléfonos, credenciales, URLs firmadas o raw de Apollo en el repo.
   Redactar PII de consultas con marca explícita. Evidencia completa y cambios CRM quedan privados.
6. No hacer commit/push por el mandato diario. Preservar trabajo ajeno. El repo conserva trazabilidad saneada,
   no una segunda base de contactos ni una copia completa del historial privado.

Datos e IDs: `/Users/jreye/.codex/agent-data/hubspot-saas-prospecting/opportunities.json`.
Skill personal: `/Users/jreye/.codex/skills/hubspot-saas-prospecting/SKILL.md` y sus tres playbooks de
servicios, acción y frescura. Método reusable: `.codex/skills/efeonce-b2b-prospecting/`.
Si falta acceso a esos archivos, registrar el bloqueo; no recrear registros ni presumir aprobaciones.

## Autoridad y verificación

Investigación no autoriza CRM, créditos, Deals, notas ni envíos. Reutilizar aprobaciones válidas por lote y
alcance; registrar decisión en privado para continuidad. Contactos nuevos requieren correo laboral individual
verificado; comprobar Primary Company y altas automáticas después de crear. No marcar interés HubSpot por
necesidades de otras líneas. Las etiquetas locales no son enums CRM. Cada corrida muestra acciones,
evidencia, huecos, cobertura y changeset para aprobación si procede; cero resultados también se reporta.
No scraping LinkedIn, contacto automatizado, formularios, secuencias ni consumo recurrente de créditos.
