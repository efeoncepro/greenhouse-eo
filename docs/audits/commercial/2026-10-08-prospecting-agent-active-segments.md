# Segmentos activos y revisión del agente — 2026-10-08

Portal verificado: **48713323**, operador Julio Reyes. Agent CLI 0.15.1, OAuth de usuario; lectura de membresía independiente mediante MCP.

## Alcance y corrección del operador

El operador pidió investigar la inscripción en Prospecting Agent y crear segmentos activos conservando los existentes. Después precisó: **si ya existen segmentos activos, no crear más; completar únicamente propiedades respaldadas para incorporación automática**. Ocho segmentos se habían creado antes de recibir esa precisión. No se crearon más, ni se borraron o modificaron los anteriores. Usar los segmentos existentes en próximas altas.

**Lead → calificación → oportunidad.** Una señal o fit no acredita oportunidad calificada. El operador pidió dejar intactos los negocios ya creados: no se modificaron negocios ni lifecycle. La inscripción o el envío por el agente no se ejecutaron.

## Estado verificado de segmentos

Antes: 86 segmentos. Después: 94. Inventario completo, sin siguiente página, con cero IDs antiguos ausentes y cero cambios en nombre/tipo/objeto de los 86 anteriores. Los estáticos de investigación 118–143 permanecen; ya existían activos globales 144–158, por cohorte 159–177 y del 08/10 178–179.

Los ocho nuevos usan el prefijo `Efeonce | Prospección continua |` y la base `efeonce_prospecting_cohorts IS NOT NULL`. Por tanto reúnen las cohortes investigadas etiquetadas, sin incorporar por antigüedad ni etiquetar todo el CRM. Las siguientes rondas requieren su opción propia y datos respaldados; no reutilizar la cohorte del 06/10.

| ID | Sufijo | Objeto | Condición adicional | Miembros verificados |
| --- | --- | --- | --- | ---: |
| 180 | Contactos investigados | Contact | Ninguna | 83 |
| 181 | Personas con email | Contact | kind individual_email y email conocido | 65 |
| 182 | Personas con email · Fit servicios creativos | Contact | Igual a 181 y fit creative | 53 |
| 183 | Personas con email · Fit HubSpot y CRM | Contact | Igual a 181 y fit hubspot_crm | 26 |
| 184 | Personas sin email | Contact | kind individual_no_email | 9 |
| 185 | Correos de área compartidos | Contact | kind shared_inbox | 7 |
| 186 | Identidad por confirmar | Contact | kind identity_pending | 2 |
| 187 | Empresas investigadas | Company | Ninguna | 83 |

Se leyeron las ocho expresiones completas y todos sus miembros. Comparación exacta con las propiedades del universo investigado: cero faltantes, cero extras, todas las páginas completas. Los segmentos de fit se solapan y no deben sumarse. No son listas de destinatarios aprobados ni criterios de calificación comercial.

Readback posterior a la precisión del operador: Diego y Emily tienen cohorte `research_2026_10_08`, tipo `individual_email` y fit `creative`; ambos pertenecen a 178 y 182. Sus empresas tienen la misma cohorte y pertenecen a 179 y 187. No faltaba una propiedad necesaria para esas incorporaciones. No se inventó el cargo actual de Emily, no se asignó interés CRM a ninguno y no se forzó una industria de contacto incompatible con su catálogo.

## Prospecting Agent: inspección sin activar nada

Starter Play **101042425**, activada. La guía usa comunicación adaptativa, hasta 5 correos en 30 días, espera mínima de 2 días, español de Chile, días laborables 09:00–17:00 UTC−04:00 y revisión humana antes del envío. Existe una alternativa para configurar pasos de secuencia. Remitente: propietario del contacto; alternativa Julio. La guía ya monitorea varios segmentos activos de empresas.

Ruta manual observada: **Inscribir → Inscribir contactos de forma manual → filtrar por pertenencia al segmento → seleccionar hasta 25 → Siguiente → confirmar guía/directrices → iniciar inscripción**. No se seleccionó ni inscribió ningún contacto. La pantalla mostraba a Diego y Emily y deshabilitaba todas las selecciones con el aviso «El acceso gratuito terminó». Esto describe el formulario; no acredita por sí solo que el agente esté detenido.

Ruta automática observada: **Gestionar → Automatizaciones → Cuando se agregue un contacto a cualquier lista**. Estaba desactivada y su interruptor deshabilitado. La automatización por formulario sí figuraba activada. No se modificó ninguna de ellas.

Los criterios de elegibilidad mostrados por la UI manual son: no estar ya inscrito en agente/secuencia, no haberse dado de baja y no pertenecer a exclusiones. Una versión anterior de la documentación excluía además negocios abiertos/ganados de la inscripción automática; la documentación vigente consultada y el panel manual no permiten atribuir a ese criterio el bloqueo de estos dos contactos. No modificar negocios para sortearlo.

La guía figuraba **Activado**, con **15/15 sugerencias diarias** y actividad acumulada; por eso no debe confundirse el aviso del formulario con ausencia de actividad. El operador indicó que el agente trabajaba correctamente el día anterior, lo que es compatible con esta evidencia.

### Diagnóstico confirmado en Cuenta y facturación

Lectura del [panel de créditos](https://app.hubspot.com/account-and-billing/48713323/usage/hubspot-credits): **3.000/3.000 créditos mensuales usados**, cero disponibles, período 29/09–28/10/2026, reposición **29/10/2026**. Desglose: **Prospecting Agent 2.800**, **agente de datos 200**. Ambas características muestran **Consumo en pausa**. Es el bloqueo de créditos confirmado para nuevas acciones que los consumen; no prueba que se hayan detenido todos los envíos de inscripciones anteriores.

El panel también muestra un aviso independiente «Tu cuenta está vencida». No se inspeccionaron transacciones ni se atribuyó a ese aviso la causa del bloqueo. No se compraron créditos, se cambió un plan, habilitó sobreconsumo ni realizó un pago. Para nuevas inscripciones, resolver disponibilidad de créditos en la cuenta y revalidar elegibilidad; no cambiar Deals, segmentos ni propiedades para eludir el bloqueo.

## Fuentes y evidencia

- [HubSpot: crear segmentos](https://knowledge.hubspot.com/segments/create-active-or-static-lists).
- [HubSpot: cambiar tipo de segmento](https://knowledge.hubspot.com/segments/change-list-type).
- [HubSpot: configurar y usar Prospecting Agent](https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent), versión visible actualizada 16/09/2026. La generación de comunicación personalizada consume créditos; pertenencia a un segmento no equivale a inscripción ni envío.
- Evidencia restringida fuera de Git: `.auth/creative-prospect-intake-20261008/active-segments/`, con payloads, inventario antes/después, readback y comparación completa. No copiar miembros ni emails individuales a esta auditoría.
