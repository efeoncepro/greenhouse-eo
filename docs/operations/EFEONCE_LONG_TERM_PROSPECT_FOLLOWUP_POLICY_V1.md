# Política de seguimiento de prospectos a largo plazo — V1

- Estado: Accepted, aprobada por Julio Reyes el 13/10/2026 en esta conversación.
- Owner: Commercial / Julio Reyes; **HubSpot es autoridad de las tareas comerciales**, además de CRM/canales.
- Destino corregido por Julio el 13/10/2026: revisiones de cuenta, follow-ups, llamadas y próximos pasos
  comerciales se crean en HubSpot; Notion conserva trabajo operativo y entregables, sin duplicar esas tareas.
- Alcance: cuentas con encaje que hoy tienen proveedor o carecen de una necesidad activa; continuidad
  después de detener una cadencia. No modifica ICP, schema, etapas ni autoridad de envío.
- Decisiones dueñas: [método de prospección](../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md)
  y [seguimiento comercial](../architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md).

## Decisión

Conservar la cuenta y su historia, registrar el motivo del comprador y detener el acercamiento actual.
Cuando existe encaje y el comprador no prohibió el contacto, pasar a seguimiento de largo plazo con
responsable y revisión interna. La cadencia terminada no convierte a la cuenta en oportunidad perdida,
ni una respuesta en interés comercial. «Proveedor contratado, sin necesidad actual» es una descripción
del dossier, no un nuevo enum CRM ni evidencia de la duración/cobertura de su contrato.

## Próxima revisión

1. Si el comprador dio un hito o fecha, conservar ese dato y su alcance; tiene prioridad sobre el default.
2. Si acaba de contratar agencia/proveedor, no dio hito y la cuenta mantiene encaje, fijar **una revisión
   interna a seis meses calendario de la respuesta**. Conservar el día; si no existe en el mes destino,
   usar su último día. No registrar esa fecha como vencimiento contractual ni compromiso comprador.
3. Para otras causas de falta de prioridad, Commercial justifica el plazo por contexto. Si pidió esperar
   su confirmación, ésta sigue siendo la condición: el transcurso del tiempo no la sustituye.
4. Crear/reutilizar una sola **TASK en HubSpot**, con owner, fecha, fuentes, restricción y resultado
   esperado. Usar tipo `TODO` para revisión interna; validar enums/owner y asociar Contact/Company y
   Deal sólo cuando ya corresponda. Verificar contenido, estado, fecha y asociaciones; guardar el ID
   nativo en el ledger existente. No duplicar la tarea comercial en Notion.
   Clave estable: `followup:<contact-id o cuenta>:long-term-account-review`; la fecha no crea otra clave.
5. El seguimiento existente conserva la tarea aunque cambie el mes o termine el proyecto de origen.
   Debe recuperar esas tareas por ID/clave además de la ventana de leads/correos recientes. Antes de
   siete días de su revisión, sólo conservarla como espera futura, salvo señal pertinente observada;
   no repetir alertas diarias ni crear borradores comerciales.
6. Al llegar la revisión, releer hilo/CRM/restricciones y verificar empleo, encaje y necesidad actuales.
   Registrar una decisión: mantener seguimiento con razón/fecha nueva, preparar una propuesta de
   recontacto para aprobación, o archivar por falta de encaje. No repetir revisiones indefinidamente
   por inercia. Fecha cumplida no autoriza envío, reinscripción ni baja de una restricción.

## Nutrición y presencia

- Mantener presencia mediante contenido público pertinente: casos con prueba, aprendizajes del sector,
  herramientas y contenidos útiles. Esta política no autoriza publicar piezas, mandar DMs, cargar
  audiencias publicitarias ni dirigir otra campaña para rodear el cierre.
- La nutrición por email exige **permiso verificable de la persona**, aplicable a marca/canal/contenido,
  y autorización del operador para ejecutar esa comunicación. Guardar fuente, fecha y alcance del
  permiso y comprobar bajas/supresión antes de usarlo. Email obtenido con Apollo, apertura o respuesta
  comercial no acredita suscripción a newsletter.
- Sin ese permiso, conservar pendiente la nutrición por email; no suscribir ni mandar un correo para
  pedir permiso como efecto automático del triage. El mandato de detener comunicaciones prevalece
  sobre una suscripción previa: resolver su alcance antes de enviar.

## Reactivación y restricciones

| Evidencia | Continuidad permitida |
| --- | --- |
| Proveedor actual, sin necesidad activa y sin prohibición | Revisión interna y presencia pública; posible recontacto con razón nueva, restricciones revisadas y autorización de Julio |
| Apertura explícita a una necesidad complementaria | Resolver sólo esa apertura dentro de su alcance autorizado; no presumir reemplazo de proveedor |
| Fecha/hito acordado | Revisar en el hito y respetar lo solicitado; no ampliar frecuencia, personas ni canal |
| Esperar confirmación / HOLD | Conservar la condición; ningún plazo interno ni señal la levanta |
| Rechazo del acercamiento | Detener el alcance rechazado; Commercial decide si corresponde conservar revisión interna, sin recontacto por defecto |
| Baja / «no me contacten» / restricción empresarial | Aplicar y verificar supresión en su alcance; sin calendario de reactivación que eluda la decisión |

Una consulta nueva de la persona, una convocatoria abierta o una necesidad concreta pueden justificar
revisar el dossier. No prueban insatisfacción, presupuesto ni permiso de envío. No contactar colegas,
cambiar dominio/plataforma o disfrazar una insistencia como nutrición para eludir el cierre. La
reactivación de un contacto detenido por Julio requiere nueva autorización explícita y contexto permitido.

## Registro y verificación

- HubSpot: conservar Contact/Company, notas y **TASK comercial canónica** con fecha del equipo, owner,
  resultado esperado y criterios de revisión. Una tarea creada no certifica revisión ejecutada. La
  autoridad recurrente cubre crear/actualizar TASK comerciales y asociarlas a registros existentes
  verificados; no crea Contact/Company/Deal, cambia etapas/suscripciones ni inventa propiedades.
- Notion: trabajo operativo/entregables; una tarea comercial duplicada se cancela después de verificar
  su reemplazo en HubSpot, conservando link/historia. No marcarla Listo como si la revisión se hubiera
  realizado. Históricos restantes no se migran en lote como efecto de esta corrección.
- Repo: expediente, registro y `state.json` coherentes; distinguir `next_internal_review_on` de
  `next_contact_at` y permiso de nutrición de autorización del operador. Sin datos sensibles innecesarios.
- Scheduler: reutilizar el seguimiento existente; verificar configuración separadamente de una futura
  corrida. Esta política no inicia nuevos schedulers ni habilita contacto autónomo.

## Caso inicial y fuentes

[Fabrimetal / María Ignacia Rivas](../commercial/follow-up-agent/runs/2026-10-13-fabrimetal-respuesta-parada.md):
respuesta del 13/10/2026, comunicaciones finalizadas, revisión interna del **13/04/2027**, nutrición por
email pendiente de permiso y sin envío automático. El caso prueba registro/continuidad, no eficacia comercial.

Método: [tratamiento de respuestas](../../.codex/skills/efeonce-b2b-prospecting/references/response-handling.md)
y [cadencia de cuenta](../../.codex/skills/efeonce-b2b-prospecting/references/account-cadence.md).
El intervalo de seis meses es una decisión Efeonce aprobada, no un benchmark de conversión.
[HubSpot: permiso de marketing email](https://knowledge.hubspot.com/marketing-email/understand-opt-in-consent-for-email),
consultado el 13/10/2026, distingue permiso verificable de un contacto obtenido mediante enriquecimiento.
