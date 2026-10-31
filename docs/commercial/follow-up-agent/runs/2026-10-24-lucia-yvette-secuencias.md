# Lucía y Yvette: dos secuencias programadas con excepción expresa al CCO

Corte: **24/10/2026**, America/Santiago. Owner: Julio / Commercial.
Mandato nuevo: crear seguimientos humanos y persuasivos para ambas, con firma gráfica y CCO HubSpot.
Julio resolvió después el bloqueo: **«Activar en HubSpot con registro nativo, autorizando la excepción
al CCO»**. Esta excepción sólo cubre estas dos secuencias; no modifica la política general de otros envíos.
Este corte sucede al [cierre documental previo](../../prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md);
no modifica retrospectivamente los envíos iniciales ni la atribución inferida del correo de Yvette.

## Status real

- [x] Historial inicial contrastado en Outlook, EMAIL CRM, campos de baja/rebote/respuesta e inscripción.
  Las búsquedas actuales por empresa y remitente no devolvieron respuestas; no se considera prueba absoluta
  de ausencia. La CLI no devolvió historial de inscripción y los Contacts no tenían inscripción activa visible.
- [x] Dos secuencias privadas de Julio creadas en portal **48713323**, con dos plantillas independientes por
  destinataria; se clonaron las plantillas, sin editar las de NIASA ni compartir contenido entre ambas.
- [x] Cuatro correos completos guardados; brochure original pertinente en cada paso, enlace nativo, descarga
  habilitada, sin exigir correo al visitante y sin miniatura. El segundo paso responde al primero de la secuencia.
- [x] Mailbox Outlook 365 de Julio activado; firma global Julio HTML oficial, versión clara con nueve imágenes,
  comprobada y renderizada en las dos vistas de inscripción. Una firma por correo, sin otra copia en plantillas.
- [x] Días laborables, ventana **10:00–10:05**, retraso de **5 días laborables** y dos reglas Contact verificadas:
  respuesta a cualquier correo y reunión desinscriben a esa persona. Bajas y rebotes conservan protección nativa.
- [x] **Excepción al CCO autorizada:** la UI revisada sólo expone Para y De; Julio autorizó expresamente
  activar ambas con registro nativo, sin afirmar CCO configurado ni ampliar esa excepción a otros envíos.
- [x] **Ambas inscripciones Programado**, una por persona, En curso 0 y Error 0. Se recuperó el resultado
  terminal después de «Procesando», sin pulsar Iniciar de nuevo. Se reabrió Editar para leer el calendario
  guardado de ambos pasos por persona y se salió con Cancelar, sin modificarlo.
- [x] Readback independiente de Contact: `hs_sequences_is_enrolled=true`, `hs_sequences_enrolled_count=1`
  y `hs_latest_sequence_enrolled` coincidente con su secuencia en ambas personas.
- [ ] Emails de seguimiento enviados, firma entregada, entrega o respuesta: aún no acreditados; fechas futuras.

## Secuencias y contenido guardado

| Destinataria | Secuencia | Plantillas independientes |
| --- | --- | --- |
| Lucía Basulto, Contact **257530483857** | [318443153 — Grupo Flesan Perú / Creatividad inmobiliaria](https://app.hubspot.com/sequences/48713323/sequence/318443153/edit) | **132481177 / 132481178** |
| Yvette Rios Ventosilla, Contact **257552264780** | [318421077 — Sigelec / Merchandising y web](https://app.hubspot.com/sequences/48713323/sequence/318421077/edit) | **132481181 / 132481182** |

**Lucía 1:** una historia cotidiana del proyecto como hipótesis creativa; decisiones de mensaje, producción y
siguiente paso. Explica coordinación creativa, producción local en Perú y capacidad compartida sin garantizar
ahorro o ventas. Brochure Agencia Creativa **357058081**.

**Lucía 2:** criterios para comparar guion, materiales, formatos, derechos y revisiones en un mismo alcance;
pregunta por evaluación vigente y permite cerrar el seguimiento sin presión. Brochure 360 completo **357361299**.

**Yvette 1:** guía para acotar públicos, cantidades, materiales, muestras y fechas de merchandising; objetivos,
contenido, mantenimiento e integraciones web. Pregunta cuál frente sigue abierto y pide corregir la vía si no es
el correo adecuado. Brochure Servicios Web **357053321**.

**Yvette 2:** ejemplo expresamente ilustrativo de pieza física vinculada a una página técnica y al equipo
comercial; ofrece abordar los frentes por separado y cierra sin presión si ya eligieron proveedor. Brochure
360 completo **357361299**. La secuencia no convierte la dirección inferida en directamente atribuida.

Los cuerpos reales, destinatarios y enlaces individuales permanecen en HubSpot y expediente privado, fuera
de Git. Los brochures se usaron íntegros sobre los originales existentes, sin recortes o nuevos uploads.

## Calendario guardado y verificado

| Persona | Primer correo | Segundo correo | Lectura nueva de inscripción |
| --- | --- | --- | --- |
| Lucía | **29/10/2026, 10:00 Perú** | **05/11/2026, 10:05 Perú** | Programado 1 / En curso 0 / Error 0 |
| Yvette | **29/10/2026, 10:00 Perú** | **05/11/2026, 10:05 Perú** | Programado 1 / En curso 0 / Error 0 |

Zona guardada: **UTC−05 fijo**, opción nativa «Jamaica, Panamá, Colombia», equivalente al horario de Perú.
La ventana de secuencia permanece 10:00–10:05, pero la inscripción persistida muestra 10:05 para el segundo
paso de cada persona. El primer correo es una cadena nueva; el segundo responde al primero de la secuencia.
El calendario oficial peruano no identifica feriado nacional en esos días; el 01/11 cae domingo.
[Fuente oficial](https://www.gob.pe/feriados). No se prometió fecha de entrega ni se envió de inmediato.

## Autorización, readback y continuidad

La [política de envío](../../../operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md) conserva firma gráfica y
CCO como regla general. La preparación anterior se mantuvo sin activar hasta recibir la elección expresa de
Julio para estas dos secuencias con registro nativo. No se cambió de plataforma, no se creó scheduler ni se
añadieron reglas globales del mailbox. La autorización no verifica la atribución inferida del correo de Yvette.

Antes de activar se refrescaron búsquedas por remitente y campos de Contact; no aparecieron respuestas,
inscripciones previas, bajas o dirección marcada inválida. Campos nulos o búsquedas vacías no prueban ausencia
absoluta. La UI confirmó selección y destinatario único; firma completa y brochures renderizados en cada paso.
Después de inscribir, se verificaron Programado y reglas activas de respuesta a cualquier correo / reunión,
siempre a nivel Contact. No se desactivaron protecciones por baja o rebote ni se inscribieron colegas.

La CLI `sequences enrollments` devolvió `RESPONSE_DECODE_FAILED` en la lectura posterior: no se usó como prueba
de fallo ni para repetir altas. La UI aportó estado/calendario; `objects get` confirmó por separado las tres
propiedades de inscripción de ambos Contacts. Las dos inscripciones iniciales tardaron en pasar de Procesando
a Programado. Cada Iniciar se ejecutó una vez y se esperó el resultado.

Próximo paso: dejar operar este carril nativo y conciliar cualquier respuesta, reunión, baja, rebote o error.
No duplicar desde Outlook ni desde el seguimiento recurrente. El despacho futuro y su actividad EMAIL deben
verificarse cuando ocurran; Programado no es `SENT`, entrega ni lectura humana. Sin créditos de enriquecimiento,
mensajes adicionales de LinkedIn o correo inmediato en esta activación.
