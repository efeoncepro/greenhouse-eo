# Prospecting Agent: voz personal, CTA y verificación

- Status: Accepted — alcance de copy aprobado por el operador en la sesión del 2026-10-07.
- Date / última validación: 2026-10-07.
- Owner: Julio Reyes / Commercial.
- Scope: portal 48713323, Starter Play 101042425; método reusable para Codex y Claude.
- Reversibilidad: restaurar el texto previo mediante revisión, aprobación y readback.
- Confianza: alta en persistencia de configuración; calidad final y resultados aún por validar.

## Contexto

El operador pidió calibrar el Prospecting Agent de HubSpot con su voz a partir de correos reales y autorizó
sucesivas incorporaciones. Los borradores tendían a un pitch extenso, dudas acumuladas y repetición de cargo
y contexto empresarial. Tras el primer ajuste reportó que faltaba su enlace de reunión, aunque la directriz
del enlace seguía configurada. El trabajo corresponde al agente nativo de prospección, no al Customer Agent
ni a la CLI para operar HubSpot.

## Decisión

La voz personal se calibra con una muestra autorizada, separada de la voz institucional. En prospección,
contexto concreto, una capacidad pertinente y una invitación deben sostener un tono cálido y seguro.
La investigación establece pertinencia, sin recitar el perfil ni convertir señales públicas en diagnósticos.

El CTA se declara explícitamente: incluir el enlace real del remitente configurado y permitir respuesta por
correo como alternativa de la misma invitación. La empatía no elimina el enlace. Respetar negativas y
reuniones ya agendadas. Las capacidades comerciales deben tener sustento.
Delta aprobado el mismo día: la primera mención de Efeonce del primer correo enlaza a https://efeoncepro.com/
como respaldo contextual, complementario a la agenda y sin otra llamada a la acción. Snapshot vigente:
7.969 caracteres; persistencia comprobada, generación con ambos enlaces pendiente.

HubSpot es dueño de la configuración efectiva del play. El repo conserva un snapshot fechado, el método
operativo y evidencia acotada. Guardar en el panel y aprobar el cambio de la guía son pasos distintos;
la persistencia exige una nueva lectura tras recargar. La calidad exige generar y revisar un borrador nuevo.

No se amplían permisos de envío, enrollment, audiencia ni autonomía. La revisión humana se conserva.
La aprobación de estas instrucciones no autoriza reutilizar la identidad de Julio para otro remitente.

## Alternativas descartadas y consecuencias

- Solo pedir «profesional y amistoso» no especifica el comportamiento que necesita corregirse.
- Acumular condiciones de prudencia debilita el mensaje y puede volver ambiguo el CTA.
- Añadir parches repetidos sin consolidar aumenta contradicciones; editar el bloque dueño de la regla.
- Aplicar esta voz a todos los clientes confunde identidad personal con tono humano genérico.

El snapshot permite comparación exacta y recuperación; no garantiza que todos los borradores cumplan ni
que mejore la conversión. El corpus privado y datos de destinatarios no se incorporan al repositorio.
No hay cambios de API, schema, runtime Greenhouse ni infraestructura.

## Validación y revisión

[Manual y límites](../manual-de-uso/hubspot/ajustar-voz-prospecting-agent.md) y
[auditoría](../audits/commercial/2026-10-07-hubspot-prospecting-agent-voz.md).
Revisar esta decisión si cambian remitente, portal, oferta, autonomía o comportamiento de la UI.
La generación final, seguimiento y destino/duración del CTA siguen pendientes; no se declara eficacia comercial.
