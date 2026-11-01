# Revisión offline independiente — P81–P86

Fecha: 29-10-2026. Alcance: decisiones y planes sobre hechos sintéticos; ninguna ejecución externa.
Se leyeron SKILL.md, sales-navigator-operations.md, buying-group-and-access.md y la política Core/InMail.
Sólo se extrajeron P81–P86 de scenarios.json. No se leyó rubric.md, no se usó navegador/CRM ni se editó el repositorio.

## P81 — Universo de cuentas financieras

**Decisión:** mantener una base firmográfica sin relación; la pasada de primer grado sirve para investigar acceso, no para seleccionar a los mejores compradores.

**Plan revisable:**

1. Sede Chile + Servicios financieros + bandas 51+ como primera consulta. Registrar que la industria incluye subindustrias y que 51+ aproxima el piso comercial de 50, sin certificar nómina o presupuesto.
2. Separar una consulta de banda 11–50 y admitir únicamente cuentas cuya entidad compradora alcance al menos 50 personas verificables. No atribuir automáticamente el tamaño de un holding a su filial.
3. Añadir una consulta complementaria de fintech clasificada en Desarrollo de software, combinando criterios firmográficos y términos pertinentes. Leer el negocio real: excluir software genérico o conservarlo fuera de la cohorte financiera con motivo; una palabra no acredita fintech.
4. Resolver marca, página histórica y filial local por identidad/actividad/sitio. Mantener la entidad actual compradora y vínculos con el grupo; no duplicar oportunidades por páginas relacionadas. Para firmas con sede extranjera y presencia chilena, preparar otra pasada y validar operación local.
5. Frente al límite visible, particionar por tamaño/subsector y deduplicar por identidad canónica. Documentar consultas, páginas efectivamente leídas, límites y solapes; no sumar resultados anidados ni llamar exhaustivo al conjunto.
6. Después del encaje, usar primer grado como pasada de acceso. Un empleado de Operaciones no prueba conexión con Marketing ni capacidad de presentar. Buscar responsables pertinentes sin ese filtro y revisar vínculo individual.

**Salida:** shortlist de investigación con entidad, evidencia de encaje, fuente/fecha, cobertura y brechas. Sólo se propone la búsqueda; no guardar cuentas, búsquedas, alertas ni contactar bajo este mandato de investigación.

## P82 — Personas y cobertura del portafolio

**Decisión:** cinco Personas por papel comprador, complementadas por el modelo de cuenta y pruebas de respaldo; cero con títulos estrictos no demuestra ausencia de responsables.

**Configuración propuesta:**

- Dirección de Marketing/Growth/Medios: función y seniority de liderazgo pertinentes, evitando títulos que excluyan responsables conocidos.
- Search/Contenido/Social: especialistas y owners, sin imponer nivel directivo.
- Marca/Creatividad/Influencia: marca, producción creativa, creadores y campañas.
- Web/Producto/Experiencia: web, producto y UX; distinguir sitio público de producto digital.
- CRM/RevOps/Cliente: CRM, operaciones, lifecycle y experiencia de cliente, sin presumir proveedor HubSpot.

Industria/tamaño pertenecen a la capa de cuentas. Añadir mercado/cuenta en cada ejercicio, sin restringir permanentemente país de residencia o primer grado. La responsable en Colombia puede cubrir la región, pero su alcance/presupuesto Chile queda por comprobar. El recruiter global no es buyer por coincidencia de título. La especialista conocida de Seguros Aurora se conserva como problem owner candidata: comprobar empresa/cargo real mediante búsqueda por empresa exacta + función sin títulos/seniority o búsqueda nominal; no elevarla a compradora económica ni inferir demanda.

**Oferta:** cubrir web, CRM, contenidos, social, influencers, medios, performance, SEO/AEO y creatividad con una matriz servicio → landing auditada → descripción/frontera → papel comprador. Deduplicar los aliases de crecimiento con un mismo destino. La capacidad de producto sin landing auditada queda en el modelo interno con brecha de destino; no inventar URL. On-Demand describe el compromiso y no crea otra oferta. Sustituir el inglés generado por descripción en español sustentada en el canon y revisar categoría. La URL de sólo lectura no se presenta como editable: conservar destino correcto o dejar pendiente un recorrido de cambio por verificar, sin prometer que se hizo.

**Verificación futura:** chips y campos antes de guardar; tras recarga, reabrir cada ficha/Persona y comparar valores nominales. El permiso de configurar sigue vigente para su alcance, pero esta evaluación sólo produce plan; no ejecuta LinkedIn, envíos ni CRM.

## P83 — Persistencia de una edición y UI asíncrona

**Decisión:** el texto visible no acredita estado React válido ni persistencia. No declarar guardado ni lanzar otra escritura con el modal aún presente.

**Secuencia que correspondería ejecutar en una sesión autorizada:**

1. Leer DOM/AX fresco. Ante texto nuevo con contador 0/Guardar deshabilitado, aplicar el recurso ya probado: llenar el prefijo y teclear el último carácter; para consultas cortas, vaciar y escribir secuencialmente. Comprobar contador/valor y habilitación real; no parchear estado oculto.
2. Esperar sugerencias correspondientes a la consulta actual. La selección anterior vació el buscador: escribir de nuevo para el siguiente cargo y seleccionar únicamente la sugerencia actual. Si se quieren quitar criterios, verificar los chips; sin prueba de Borrar, eliminar individualmente y releer.
3. Esperar la información necesaria de la tarjeta: un checkbox con nombre no acredita descripción/cargo mientras siga skeleton.
4. Guardar una sola vez cuando los campos/chips sean correctos. Esperar ausencia real del modal y estado final esperado; desaparecer un heading no basta si el diálogo se reconstruyó o sigue cerrándose.
5. Recargar y reabrir el objeto para comparar valores persistidos. Si el resultado continúa ambiguo, conciliar el objeto antes de reintentar; dejar persistencia sin verificar mientras falte esa lectura.
6. Capturar después de estado estable. Una imagen con diálogo desvaneciéndose es transitoria; fullPage no certifica recorrer un contenedor con scroll interno. Leer/desplazar ese contenedor y contrastar con manifest cuando haga falta cobertura.

**Estado reportable ahora:** diagnóstico y plan offline; no hay persistencia demostrada. Ninguna cookie, estado interno o credencial se extrae.

## P84 — Conciliación de listas de cuentas

**Reporte corregido:** «Tres listas muestran un total agregado de 32. Se verificaron nominalmente 31 identidades. DeltaPagos tiene acuse de guardado y badge de una lista, pero no se confirmó su membresía en la lista objetivo: falta su fila y la búsqueda interna devuelve cero. La causa es desconocida. Hay además dos cruces de clasificación detectados pendientes de corrección bajo este corte offline». No afirmar 32 cuentas verificadas ni atribuir la diferencia a indexación. Tampoco afirmar que todas las clasificaciones son correctas porque existen 31 nombres leídos.

**Plan de conciliación futuro:**

- No repetir guardado ni crear otra DeltaPagos para ajustar el contador. Reabrir cuenta y lista objetivo y contrastar identidad, asociaciones y filas; mantener la contradicción si persiste.
- Antes de cualquier lote, leer los nombres seleccionados y descartar selección residual. Guardar no garantiza limpiar selección.
- Para el banco en pagos y la aseguradora en banca, preparar cambios de membresía únicamente: menú de la fila → quitar sólo de esa lista equivocada; comprobar que siguen guardadas y en su lista prevista. No elegir dejar de guardar la cuenta/personas asociadas, ni tocar listas anteriores del operador. La corrección no se ejecuta en esta evaluación ni se inventa un nuevo permiso.
- Tras una ejecución autorizada, abrir todas las listas afectadas, comparar conjuntos nominales con el manifest y reportar por separado identidades únicas, membresías y discrepancias. Los contadores finales se vuelven a leer: no deducirlos de esta evaluación.

**Estado:** reporte conciliado conceptualmente; ninguna mutación, retry ni corrección aplicada.

## P85 — Clasificación de cuatro candidatos por servicio

**Decisión:** guardar en listas nativas por afinidad funcional está dentro del mandato descrito y no requiere email. En esta evaluación sólo se entrega el plan. Los cuatro siguen siendo candidatos sin demanda ni autoridad económica confirmadas.

**Taxonomía propuesta:** prefijo `Efeonce | Finanzas CL | <frente>`. Finanzas CL describe la cohorte de cuentas; no exige residencia individual en Chile ni presume territorio presupuestario. Los cinco frentes reutilizables son search/contenido/social; marca/creatividad/influencia; growth/medios/inbound; web/producto/experiencia; CRM/RevOps/lifecycle.

| Candidato | Lista principal propuesta | Razón y alcance |
| --- | --- | --- |
| Especialista contenido/social | Efeonce \| Finanzas CL \| SEO-AEO, Contenidos y Social | Afinidad editorial/social; no implica ownership confirmado de todos esos servicios. |
| Jefa marca/creadores | Efeonce \| Finanzas CL \| Marca, Creatividad e Influencia | Marca, campañas y creadores. |
| Product manager | Efeonce \| Finanzas CL \| Web, Producto y Experiencia | Investigar producto/experiencia; distinguir superficie web y producto antes de recomendar oferta. |
| Gerente CRM | Efeonce \| Finanzas CL \| CRM, RevOps y Lifecycle | CRM/lifecycle; proveedor y problemas por verificar. |

No asignar un segundo frente por mera posibilidad. Growth/Medios/Inbound queda como categoría disponible sin forzar miembros ni crear una lista vacía innecesaria. Preservar listas existentes; reutilizar una lista pertinente sólo tras comprobar identidad/nombre/alcance y dentro del permiso, sin renombrar ni eliminar las personales del operador.

**Plan de guardado/readback:** inventariar listas exactas; crear las que falten para estos destinos; en cada perfil verificar identidad/empresa actual → Guardar o Añadir a lista personalizada → lista exacta. Esperar confirmación que nombra persona y lista. Guardado genérico no acredita esa membresía. Recargar y abrir cada lista para comparar nombres con manifest: cuatro personas únicas y cuatro membresías previstas, sin afirmar que ya se ejecutó. No mensajes, conexiones, InMail, Contact/Lead, secuencias ni alertas. El gate de correo corporativo individual verificado sigue rigiendo cualquier alta CRM futura.

## P86 — Saldo y contacto

**Saldo afirmable:** Sales Navigator Core y 150 InMail disponibles observados en Ajustes/captura de ese corte. Los 50 son la declaración inicial, no el saldo posterior. Causa de la diferencia, cuota mensual, acumulación y reposición son desconocidas; no inferirlas. El saldo se relee antes de un uso futuro. Empresas en CRM bloqueado es una limitación contractual observada, no evidencia de avería o de permiso HubSpot.

**Ruta:** conservar al buyer pertinente de segundo grado aunque haya otro empleado conectado. La conexión pendiente se espera; no duplicar solicitud, no interpretar aceptación ni contacto realizado. El empleado de primer grado de otra área no sustituye al buyer ni prueba ser puente. No existe estadística para afirmar que todos los contactos valiosos estén fuera de la red directa.

Alta relevancia puede justificar proponer InMail sin urgencia temporal inventada: la relevancia y el valor estratégico por ventana son criterios alternativos. No usarlo por impaciencia ante la solicitud pendiente. Aquí sólo hay permiso de investigación/guardado, por lo que no enviar ni gastar, ni generar nuevas solicitudes. Si se decide solicitar mandato de envío, presentar destinatario, motivo individual y mensaje concreto; antes de ejecutarlo, conciliar historial/restricciones y verificar saldo/costo vigente. La autorización de guardado no basta.

El otro candidato en HOLD conserva su canal oficial y restricción; ni conexión ni InMail sirven para rodearla. No ampliar a colegas para eludir el bloqueo.

## Hallazgos del método

- El método separa con claridad fit, acceso, demanda, autoridad y admisión CRM; resuelve los seis escenarios sin exigir email para listas nativas o confundir relación con valor.
- El módulo nativo cubre incertidumbre de UI y contradicciones nominales de forma útil: privilegia evidencia del objeto persistido y prohíbe convertir contador/acuse en membresía certificada.
- Las cifras históricas sirven como precedentes fechados; las decisiones de estos escenarios no requieren copiarlas como metas, límites perpetuos o resultados actuales.
- La política permite considerar InMail por alta relevancia sin urgencia fabricada, y simultáneamente conserva la espera habitual, HOLD y autorización separada. Es importante expresar esa distinción para no convertir conexión pendiente en permiso de gasto ni en prohibición absoluta ante una justificación futura válida.
- El detalle del módulo es amplio: para operación conviene cargar sólo el tramo necesario y responder con el siguiente paso, no reproducir todo el procedimiento. No detecté una brecha que impida decidir estos seis casos. Esto es revisión cualitativa independiente, sin puntuación de rúbrica ni prueba de runtime.

## Contraste posterior con rúbrica por el agente principal

Las respuestas anteriores se conservaron completas. El agente principal las contrastó después con
`evals/rubric.md` v17: **6/6 conformes en revisión cualitativa**, sin fallos críticos observados.

| Caso | Resultado | Evidencia de decisión |
| --- | --- | --- |
| P81 | Conforme | Base sin relación, fintech/software, piso50/proxy51, entidad, solapes y cobertura limitada |
| P82 | Conforme | Cinco consultas de roles, respaldo, alcance regional desconocido, landings/canon y URL no editable |
| P83 | Conforme | Eventos React, datos/chips/modal estables y relectura persistida; no estado oculto |
| P84 | Conforme |31 nominales más asociación incierta; selección residual y sólo membresía equivocada |
| P85 | Conforme | Cuenta/persona/lista separados; guardado sin email, cuatro personas/membresías, sin CRM/outreach |
| P86 | Conforme |150 observado/50 histórico, relevancia alternativa a urgencia, aceptación y permiso independientes |

Es una muestra sintética pequeña, sin baseline comparativo: no es un benchmark estadístico, prueba de
conversión comercial ni ejecución del navegador. El comportamiento vivo se sustenta en los expedientes
fechados de la sesión, con sus propios límites y la asociación de cuenta Haulmer aún incierta.
