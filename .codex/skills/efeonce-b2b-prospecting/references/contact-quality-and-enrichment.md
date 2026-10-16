# Contactos accionables y enriquecimiento

**Admisión de un nuevo Contact/Lead:** correo corporativo individual atribuible a la persona, identidad y empleo
vigentes y evidencia de verificación. Este contrato no borra registros históricos ni migra enums `no_email`.
Un Contact existente que cambió de empleador y no tiene correo nuevo se conserva donde está, con el cambio
anotado como pendiente (fuente y fecha): su correo anterior no se usa para contactar y la empresa nueva exige
este mismo gate. Reasociarlo sigue el [handoff CRM](crm-and-commercial-handoff.md).
Procedimiento CRM dueño: [prospección HubSpot](../../hubspot-as-a-service/references/prospecting-segmentation.md).

## Evaluar el correo sin confundir dimensiones

| Dimensión | Evidencia |
| --- | --- |
| Atribución | Dirección exacta con fuente que la vincula a esa persona; nunca dirección deducida por patrón |
| Empleo/entidad | Fuente y fecha del cargo/empresa vigentes; dominio histórico o grupo explicado |
| Calidad técnica | Estado del provider/verificador, fecha, origen y contradicciones; directo del comprador es procedencia, no SMTP |
| Uso/autoridad | Finalidad autorizada, canal apropiado, preferencias/bajas y lote permitido |

Un `valid` técnico no confirma identidad ni empleo. Un dominio corporativo distinto del sitio puede ser
legítimo (grupo/rename), pero exige vínculo verificable. `catch-all` no es casilla compartida ni verificación
individual concluyente: conserva incertidumbre y verifica antes de admitir el contacto. Buzón general, email
personal o resultado sin dirección no cumple el gate individual. No presentar un correo aportado por el
comprador como certificado SMTP ni exigir una única marca de verificación.
Si la atribución o calidad quedan contradictorias, mantén el carril pendiente y propone el menor chequeo útil.
No crear el contacto para “completar después”. Puede avanzarse con otros elegibles y explicar la cobertura.
Una dirección publicada exacta puede respaldar atribución sin acreditar calidad técnica; conservar ambas
etiquetas. Si el operador autoriza un envío puntual con esa incertidumbre, registrar el alcance sin
convertirlo en excepción general de admisión. Un Contact generado por BCC_TO_CRM o un lifecycle automático
se concilia después, sin duplicarlo: su existencia no verifica la casilla ni prueba calificación comercial.

## Descubrir antes de enriquecer

Comprueba tool/endpoint, plan, campos devueltos, costo y consentimiento aplicables. No asumir costo cero por
ser una lectura ni gastar bajo una aprobación de CRM. Revelación de datos personales/contacto y consumo
pagado necesitan aprobación explícita con finalidad y alcance; reutiliza la ya dada para ese mismo alcance.

En Apollo, People API Search no entrega correo/teléfono; un resultado de persona no es contacto accionable.
Endpoints de organización/export/lookup/waterfall pueden cobrar según plan y resultado. Verifica contrato
vigente en [fuentes](sources.md) y las instrucciones del provider antes de llamar, no hardcodear créditos.
Aplica shortlist: consulta identidad/roles, elige candidatos útiles y enriquece sólo dentro del presupuesto.

Para trabajo asíncrono, aceptación/request ID no es email obtenido: reconciliar finalización y resultado.
Guardar dirección exactamente retornada, fuente/estado/fecha/costo. Sin email devuelto, termina ese carril;
no inventarlo ni repetir lookups equivalentes vacíos. Continuar por adyacentes o canal oficial válido.

## Detener gasto y conservar valor

Presupuesto agotado, fuente inaccesible, resultado vacío repetido o identidad ambigua: reporta lo obtenido,
cuáles adicionales siguen pendientes, alternativa investigable y costo para el siguiente paso. No convertir
esa limitación en cero demanda. No elevar permisos o cambiar suscripción como recuperación automática.
Datos de contactos viven en CRM/dossier privado autorizado; fixtures del repo usan placeholders y anonimización.
