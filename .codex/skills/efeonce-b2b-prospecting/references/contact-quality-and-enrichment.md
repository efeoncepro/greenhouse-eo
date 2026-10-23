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

## Match de identidad y utilidad del enriquecimiento

En Apollo, confianza alta del match no equivale a email verificado. Leer el estado específico del correo:
`extrapolated` sigue siendo inferido, aunque el proveedor haya consumido créditos; `unavailable` no es una
dirección. Registrar costo real y cobertura útil por separado. Conservar el rol como puente hipotético,
sin crear un Contact vacío, completar por patrón o interpretar colegas como introducciones confirmadas.
Caso: [dos puentes de Indecaucho](../../../../docs/commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md).

## Patrón solicitado y excepción individual explícita

Si el operador pide seguir el patrón, separar candidato de evidencia: devolver al proveedor una dirección
que nosotros construimos no la verifica cuando sólo la repite con `match_confidence=none`, sin estado de
email ni atributos independientes. No gastar en variantes equivalentes ni usar el envío como verificador.

Si el operador, informado de esa incertidumbre, autoriza expresamente alguna de las acciones (alta, envío
o secuencia) para esa persona/dirección, ejecutar sólo las autorizadas sin pedir el mismo permiso otra vez.
Registrar la excepción con fuente/fecha, dirección inferida y calidad pendiente; no etiquetarla `verified`. Usar los campos vigentes
del portal y una nota que distinga identidad profesional conocida de atribución de correo pendiente.
El permiso sólo de envío no se amplía a CRM o secuencia, y la excepción individual no cambia la admisión
normal de otros contactos. Ausencia de rebote o visualización del brochure tampoco verifica identidad.
[Aplicación izipay](../../../../docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).

[Aplicación Fundación Luz — 22/10/2026](../../../../docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md):
tres ejemplos públicos del patrón inicial + apellido sustentaron una candidata, sin verificar la casilla
ni su atribución a Mariana. Julio autorizó expresamente crear el Contact y enviar a esa dirección después
de conocer la incertidumbre; no autorizó una secuencia. La nota CRM conserva los ejemplos y la excepción;
la documentación versionada conserva el método y el enlace al caso, sin direcciones reales. La consulta
Apollo ofrecida quedó sin ejecutar: no atribuirle enriquecimiento ni consumo de créditos a la búsqueda pública.
