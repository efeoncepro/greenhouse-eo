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
Si el provider devuelve a la vez `email_status=verified`, dominio `catch-all` y un veredicto `allow`,
conservar los tres datos y su fecha: el estado específico del correo no elimina la incertidumbre del dominio,
y `allow` no acredita una comprobación SMTP independiente ni resuelve por sí solo el gate. Si catch-all
sigue sin resolver, mantener el carril pendiente según [entregabilidad](deliverability-operations.md);
no rebautizar el resultado como validación de otro proveedor ni convertir una actuación histórica en
excepción general o permiso para nuevas altas/envíos.
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
La aprobación de un match estándar para una persona no autoriza waterfall, validación pagada adicional,
teléfono, datos personales ni otro candidato. Si el resultado basta, continuar con el alcance aprobado;
si hace falta una operación de mayor costo, declarar lo obtenido y resolver sólo ese permiso pendiente.

Para trabajo asíncrono, aceptación/request ID no es email obtenido: reconciliar finalización y resultado.
Guardar dirección exactamente retornada, fuente/estado/fecha/costo. Conservar todas las entradas en su
orden y prioridad, incluso si dos retornan la misma dirección: son evidencias del resultado, no dos personas
ni dos permisos de envío. Leer el estado normalizado específico (`email_status_cd` cuando exista) junto con
los veredictos crudos del verificador, sin sustituir uno por otro; conservar costo liquidado y request ID
en el dossier privado. Consultar el mismo job pendiente hasta su resultado terminal según el contrato del
provider, sin lanzar otro match para acelerar. Sin email devuelto, termina ese carril;
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
Registrar la excepción con fuente/fecha y dirección de atribución inferida; conservar la calidad técnica
real, favorable, pendiente o adversa, con su proveedor/estado exactos. Una excepción de atribución no
convierte una dirección técnicamente inválida en apta ni permite etiquetarla como correo atribuido
`verified`. Usar los campos vigentes del portal y una nota que distinga identidad profesional conocida de atribución de correo pendiente.
El permiso sólo de envío no se amplía a CRM o secuencia, y la excepción individual no cambia la admisión
normal de otros contactos. Ausencia de rebote o visualización del brochure tampoco verifica identidad.
[Aplicación izipay](../../../../docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).

[Aplicación Fundación Luz — 22/10/2026](../../../../docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md):
tres ejemplos públicos del patrón inicial + apellido sustentaron una candidata, sin verificar la casilla
ni su atribución a Mariana. Julio autorizó expresamente crear el Contact y enviar a esa dirección después
de conocer la incertidumbre; no autorizó una secuencia. La nota CRM conserva los ejemplos y la excepción;
la documentación versionada conserva el método y el enlace al caso, sin direcciones reales. La consulta
Apollo ofrecida quedó sin ejecutar: no atribuirle enriquecimiento ni consumo de créditos a la búsqueda pública.


## Inferir una candidata y verificar sólo esa casilla

Si el operador pide investigar un patrón, buscar ejemplos exactos en fuentes oficiales del mismo dominio,
con nombres y fecha que permitan explicar la relación entre inicial y **primer apellido**, apellido compuesto
u otra convención observada. No usar automáticamente el último apellido del nombre completo. Dos ejemplos
coherentes apoyan una hipótesis de formato; no prueban una regla universal ni la titularidad de la candidata.
Guardar fuentes y ejemplos reales en el dossier CRM privado; versionar sólo el método y ejemplos sintéticos.

Seleccionar una candidata pertinente antes de solicitar una comprobación pagada acotada. La validación de
Apollo no es un buscador ni un enumerador de casillas: no recorrer variantes, hacer fuerza bruta, repetir
chequeos equivalentes ni enviar un correo para probar existencia. La autorización del enriquecimiento anterior
no cubre ese gasto: reutilizar sólo el permiso explícito para esa dirección, proveedor/operación y tope.
Si es asíncrona, un request aceptado sigue pendiente hasta recuperar el resultado del mismo job.

Un verificador técnico puede devolver `validation_status=validated` y resolver favorablemente la calidad de
la candidata sin identificar a su titular. Conservar proveedor, estado exacto, fecha y costo, y explicar
**calidad validada; atribución inferida**. No pedir otra validación técnica para una brecha que sigue siendo
de atribución. El siguiente paso es atribuir el correo o, si el operador informado lo autoriza expresamente,
aplicar la excepción individual existente para las acciones nombradas. Esa aprobación no alcanza otras
personas, variantes, futuras secuencias ni nuevos créditos.

Aplicaciones del 24/10/2026:

- [Lucía / Flesan](../../../../docs/commercial/prospecting-agent/runs/2026-10-24-flesan-lucia.md):
  waterfall de dos créditos, dos entradas de la misma dirección preservadas por prioridad, `Verified`,
  ZeroBounce `valid` y dominio no catch-all; identidad y empleo contrastados por separado.
- [Yvette / Sigelec](../../../../docs/commercial/prospecting-agent/runs/2026-10-24-sigelec-yvette.md):
  primer resultado `Extrapolated` (0.7) + ZeroBounce `invalid`, consumió un crédito y se descartó.
  Dos correos oficiales de otras personas apoyaron inicial + primer apellido; una única candidata distinta
  recibió validación LeadMagic `validated` por un crédito adicional autorizado. La atribución siguió inferida;
  Julio aprobó expresamente Contact y envío a esa dirección tras conocerlo, sin autorizar secuencia.

## Correo personal publicado y dato adicional no solicitado

Una dirección personal publicada por la propia persona puede acreditar atribución; no la convierte en
correo corporativo ni certifica SMTP. Si el operador, informado, autoriza expresamente alta y envío a esa
dirección como excepción individual, reutilizar esa autorización sólo para esa persona y acciones.
Conservar fuente, naturaleza personal y calidad técnica real en la nota CRM. El permiso de gasto de un
waterfall no autoriza por sí solo CRM o envío, ni se amplía a datos personales secundarios retornados por
el proveedor: omitirlos si no son necesarios ni autorizados para el fin del pedido.

Una instrucción posterior de enviar también a una candidata inválida no cambia su veredicto. Registrar
el mandato puntual y el resultado real; un NDR de destinatario inexistente cierra ese canal sin reintento.
La existencia de un Contact automático por BCC no verifica la dirección ni autoriza fusionar/borrar
historia. Aceptación de conexión, email enviado y DM son estados separados; conciliar cada canal.

[Aplicación Mass Chile — 26/10/2026](../../../../docs/commercial/prospecting-agent/runs/2026-10-26-mass-chile.md):
excepción personal de Yuri, corporativo inferido rebotado y adyacentes con correo laboral verificado,
permisos posteriores de alta/envío, sin heredar intención ni ampliar el gasto.
