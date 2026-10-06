# Prospección: calificación de intención y abordaje

> **Tipo:** método operativo de investigación y preparación comercial. Uso interno.
> **Actualización:** 2026-10-06, America/Santiago.
> **Alcance:** distinguir fit, solicitud observada, vigencia, rol y contacto al preparar segmentos para
> personalización. Aclara el método existente; no crea schema, runtime, automatización, oferta ni canal de envío.

La selección por industria responde quién podría necesitar un servicio. La evidencia de una solicitud responde
qué pidió una cuenta y cuándo. La verificación actual responde si todavía podemos participar. Se conservan
las tres dimensiones sin sustituir una por otra.

## Fuentes y dueños

- Investigación de compra pública/privada y admisibilidad: skill
  [`greenhouse-public-private-tenders`](../../.codex/skills/greenhouse-public-private-tenders/SKILL.md) y
  [`prospect-intent-segmentation.md`](../../.codex/skills/greenhouse-public-private-tenders/prospect-intent-segmentation.md).
- Operación CRM, cohortes, propiedades y segmentos: skill
  [`hubspot-as-a-service`](../../.codex/skills/hubspot-as-a-service/SKILL.md) y
  [Agent CLI/MCP](HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md). El portal y permisos se verifican en cada carril.
- Persona/JTBD y oferta: [contexto ICP](../context/13_icp-buyer-personas-jtbd.md) y práctica dueña del servicio.
- Deal y cartera: [operating model de licitaciones](../../.codex/skills/greenhouse-public-private-tenders/crm-portfolio-operating-model.md).
- Estado del caso, cifras y links: [audit 2026-10-06](../audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md).
  Sus evidencias son fechadas; no prueban vigencia futura.

## Ficha mínima de evidencia

La ficha puede vivir en la investigación y nota CRM existentes; esta tabla no propone nuevas properties.

| Dimensión           | Registrar                                                                                                                | Evitar                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Identidad de cuenta | Entidad, dominio, operación local y HQ; fuente y ambigüedades                                                            | Contar marca, proyecto o sede como otra empresa sin identidad propia              |
| Fit                 | Servicio compatible y motivo observado; distinguir recomendación                                                         | Convertir crecimiento, vacante o stack en solicitud de agencia                    |
| Solicitud           | Texto/paráfrasis fiel, fuente primaria, mandante/autor confirmado o incierto                                             | Atribuir al empleador actual una publicación de otro momento                      |
| Cronología          | Publicación, verificación, evento y plazos de registro/presentación separados                                            | Convertir «hace un año» a fecha exacta o inventar deadline                        |
| Estado              | Abierta confirmada, continuidad desconocida, cerrada, adjudicada, desierta, revocada o plazo vencido/resultado pendiente | «Abierta» porque no vimos cierre; «adjudicada» por fecha prevista de adjudicación |
| Rol                 | Autor, compras, área funcional, contrato/pago o comprador confirmado                                                     | Llamar decisor a cualquiera con cargo pertinente o mail                           |
| Contactabilidad     | Fuente, fecha, estado de email, identidad y empresa; restricciones de contacto                                           | Inferir dirección, consentimientos o entregabilidad futura                        |
| Próximo paso        | Duda que resolver, canal/entrada recomendados y soporte necesario                                                        | Reunión, invitación, propuesta o aceptación que aún no ocurrió                    |

Conserva literalmente fechas contradictorias y anota la discrepancia. «Cierre ayer» debe referir a un plazo
identificado y a la fecha local de verificación; no equivale a que toda la contratación terminó ayer. Los estados
se refrescan en la fuente de compra antes de preparar una respuesta que dependa de su vigencia.

## Universo de segmentación

Cuando el operador pide la base nueva, fija primero el lote investigado. Registra empresas investigadas,
empresas creadas/reutilizadas y contactos creados/reutilizados por separado. Una cuenta vieja reutilizada
puede pertenecer a la investigación nueva; la fecha de creación de Company no identifica ese lote.

Los segmentos generales por propiedades sirven para ordenar toda la base. Los de prospección nueva requieren
pertenencia al lote y luego atributos de sector, tamaño, función o fit. Toda rama OR mantiene la restricción de
cohorte. La regla activa debe leerse de HubSpot y contrastarse contra miembros esperados; informar cuántos son
del lote y cuántos externos, sin asumir que un nombre de lista garantiza su alcance. Para un segmento limitado
al lote, cualquier miembro externo es una diferencia que debe resolverse antes de usarlo.

La cohorte puede ser un conjunto estático de origen verificable mientras sus segmentos derivados son activos.
Eso permite filtros reutilizables por propiedades sin introducir datos antiguos ni fingir actualización del
lote cerrado. Nuevas búsquedas se incorporan mediante un lote identificado y autorizado, conservando trazabilidad.

Completa propiedades existentes sólo con evidencia, respetando enum y significado. Banda publicada de empleados
no es número exacto; tamaño de Company no es residencia del contacto. Un interés observado de la organización
en una nota no significa interés personal ni servicio contratado. Si no existe una opción para SEO/AEO/GEO,
conserva el alcance en nota/evidencia y no fuerces una opción distinta para lograr un filtro.

## Cómo preparar el abordaje

| Grupo                                                   | Ángulo recomendado                                                                             | Primera validación                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Solicitud explícita con vigencia confirmada             | Relacionar el requisito pedido con experiencia/capacidad pertinente y proceso de participación | Admisibilidad, plazo real, canal y alcance                                          |
| Solicitud explícita histórica o continuidad desconocida | Mencionar la publicación con su fecha y consultar si persiste la necesidad                     | Continuidad, proveedor actual y siguiente ventana, sin presumirlos                  |
| Cerrada, adjudicada o plazo vencido                     | Explorar necesidad posterior o vía de registro, si el operador prioriza esa cuenta             | Posibilidad real de participar; no presentarse como invitado                        |
| Desierta o revocada                                     | Preguntar por reemisión o reformulación como hipótesis                                         | Nuevo llamado y requisitos, sin trasladar automáticamente las bases antiguas        |
| Fit CRM/HubSpot sin petición                            | Formular una hipótesis sobre proceso, integración o continuidad del journey                    | Stack y problema actuales; no decir que busca HubSpot                               |
| Fit creativo sin petición                               | Proponer un aporte concreto a producción, adaptación o consistencia de marca                   | Necesidad y capacidad interna; un estudio propio no elimina ni acredita fit externo |
| SEO explícito                                           | Usar el problema técnico/editorial/CRO expresamente documentado                                | Vigencia y alcance; IA mencionada no acredita AEO/GEO                               |
| AEO/GEO sin solicitud verificada                        | Presentarlo sólo como hipótesis de exploración, si se decide abordar                           | Problema de descubrimiento y necesidad; no inventar demanda observada               |
| Compras / responsable contractual                       | Entrada administrativa y vía de incorporación                                                  | Dueño técnico/comercial y facultad para orientar el proceso                         |
| Marketing/Growth/Comunicaciones                         | Relacionar propuesta con su función registrada y la señal de la cuenta                         | Responsabilidad actual; cargo no garantiza poder de compra                          |

La industria afina vocabulario y ejemplos; no sustituye la señal. Tecnología puede orientar un mensaje sobre
operación comercial; retail sobre adaptación y consistencia; educación sobre captación; gobierno sobre alcance
institucional y contratación. Son hipótesis que se ajustan al caso, no promesas de resultados ni paquetes nuevos.

Una persona puede estar en varios grupos. Selecciona un ángulo principal por necesidad y una primera entrada
por cuenta; conserva alternativas para seguimiento coordinado. No prepares varios mensajes simultáneos a la
misma persona por pertenecer a varios segmentos. Priorizar solicitud vigente, señal histórica o fit depende de
evidencia, accesibilidad, capacidad y decisión del operador; este método no impone una cadencia o SLA.

## Correo e identidad

- **Individual con correo:** candidato para preparar personalización, sujeto a restricciones registradas.
- **Verified de Apollo:** conservar fecha y validación reportadas; no prueba identidad personal, autoridad,
  consentimiento ni entrega futura por sí solo.
- **Extrapolated:** mantener etiqueta y fuente; no convertir a identidad personal confirmada.
- **Correo institucional publicado:** registrar exactamente fuente y destinatario; no atribuirle validación de Apollo.
- **Buzón compartido:** abordaje al área, sin falsa personalización a una persona.
- **Sin correo / `emails: []`:** pendiente; no construir patrones de email ni inventar direcciones.
- **Identidad o empleo pendiente:** resolver antes de atribuir a la persona la señal de compra.
- **`do_not_mail`, baja o bloqueo:** excluir del futuro envío y resolver por un canal permitido. Presencia en
  segmento de email no elimina esa restricción ni autoriza cambiarla.

Si Apollo dice Verified y un validador devuelve `unknown`, conserva la discrepancia y revalida; no informes
validación inequívoca. Si el resultado del validador es `do_not_mail`, conserva la restricción aunque otra entrada
del mismo email diga Verified. Deduplicar direcciones idénticas no permite descartar evidencia negativa.

Antes de una operación de envío autorizada, relee supresiones, identidad y condiciones del canal. El segmento
«individuales con email» es una selección para preparación, no una certificación de población enviable.

## Handoff de personalización

Entrega selección deduplicada por persona/cuenta, fuentes y fechas, función, señal o hipótesis claramente
etiquetada, duda pendiente, ángulo principal, entrada y alternativa. Redacta cada borrador con hechos que
puedan rastrearse a la nota/fuente. No afirmar presupuesto propio, uso de HubSpot, urgencia, convocatoria
abierta, invitación o comprador confirmado cuando sólo hay fit o rol público.

Investigar, enriquecer con Apollo, escribir CRM, crear segmentos o preparar un borrador no autorizan por sí
solos mails, mensajes, formularios, llamadas, secuencias, workflows ni postulación. La ejecución requiere la
instrucción del operador correspondiente; su resultado se verifica y registra aparte. En el caso documentado
del 2026-10-06 no se realizaron envíos.
