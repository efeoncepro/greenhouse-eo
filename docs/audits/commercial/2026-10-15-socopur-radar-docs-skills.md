# Socopur y radar — actualización documental y verificación — 15-10-2026

**Mandato:** actualizar sólo documentos/skills pertinentes del proyecto; conservar historia y WIP ajeno.
No código, infraestructura, permisos, CRM, frecuencia/suscripciones, contactos externos, ofertas, commit
ni push. Owner: Commercial / Julio. [ADR existente con delta](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## Resultado documental

[Socopur](../../commercial/tenders/socopur-agencia-marketing-digital-2027/README.md) cerrado para entrada
tardía por respuesta de Katherine del 15/10 16:54:36 UTC aportada por el operador, con enlace original
en el [informe de cierre](../../commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md).
Selección concluida y nuevas postulaciones/propuestas rechazadas para este período; credenciales guardadas
sin promesa de fecha/invitación. No inferir adjudicación. No se reabrió correo, LinkedIn o CRM.

La [guía del radar](../../commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md) incorpora primera entrada,
señal temprana con acción útil, descubrimiento/vigilancia, carriles públicos/privados independientes por
cuatro mercados y nonprofit aparte, LATAM primero/Palm Desert condicionado, solape72h ampliable,
prechequeo de bloqueos y marcadores, tiempos separados y detección tardía bajo cinco días hábiles.
Se enruta desde las skills espejo y documentos de operación. Es método documental; no prueba despliegue
ni exhaustividad. La skill personal `hubspot-saas-prospecting` y sus playbooks externos se leyeron primero.
El mandato inicial limitó cambios al proyecto; la ampliación posterior incluyó revisar y ajustar esa
instalación si lo permitía el sandbox. Resultado y bloqueo de escritura documentados abajo;
su frecuencia/configuración y propagación no se verificaron.

## Prueba documental: credenciales vencen antes del RFP completo

**Fixture hipotética, no oportunidad real, sin llamadas externas.** Entrada: aviso primario del convocante
observado en su portal, que solicita interés/credenciales hasta **21/10/2026 17:00 America/Lima**;
bases completas disponibles desde 26/10 y propuesta final 06/11. No incluye reglas de elegibilidad.
La fuente de este ejercicio es esta ficha simulada; no se atribuye el ejemplo a Socopur ni a un comprador real.

| Dato del fixture | Registro / decisión esperada al aplicar la guía |
| --- | --- |
| Publicación | El aviso declara 19/10/2026 07:00 Lima; conservar como dato declarado del fixture |
| Disponibilidad pública | Sólo acreditada en la lectura simulada de 19/10 07:35 Lima; comienzo anterior desconocido, no igualarlo a publicación |
| Primera detección | Corrida simulada 19/10 07:30 Lima; dato distinto de alta CRM |
| Validación | Lectura simulada del aviso primario 19/10 07:35 Lima; identidad/canal corroborados dentro del fixture |
| Primer aviso | Sin entrega real: **aviso temprano para el operador como salida requerida**, no registrar timestamp ficticio de entrega |
| Primera puerta | Interés/credenciales 21/10 17:00, anterior a bases 26/10; propuesta 06/11 no la sustituye |
| Margen útil | Detección→puerta: 2 días y 9h30m naturales; menos de cinco días hábiles incluso sin asumir feriados: **detección tardía**. Aviso→puerta no calculable, porque no hay entrega real |
| Acción útil | Avisar ya al operador: revisar canal y mínimos/credenciales para decidir si solicita acceso antes del 21/10. RFP y elegibilidad pendientes |
| Permisos | Sólo decisión/borrador documental; no enviar correo, completar formulario, registrar CRM o programar alerta/scheduler |

**Salida esperada y revisada:** «La primera puerta es interés/credenciales el 21/10 17:00 Lima; el RFP
llega después. Detección tardía. Fuente primaria del fixture leída; revisar mínimos y preparar credencial
para decisión del operador antes del hito. Elegibilidad y bases sin confirmar». Esperar hasta el 26/10
**falla** esta prueba. Declarar elegibilidad o envío automático también falla. El ejercicio acredita
coherencia de la guía, no una notificación emitida ni comportamiento runtime.

## Casos de consistencia adicionales — revisión documental

| Caso | Resultado revisado |
| --- | --- |
| Socopur tras respuesta de cierre | Cerrar entrada tardía, conservar historia; no adjudicación, invitación o fecha futura inferidas |
| Corte histórico anterior a 17:51 UTC: alta CRM10/10 13:06:28Z con detección no acreditada en ese alcance | La evaluación previa mantenía detección/latencia/primer aviso desconocidos; no sustituía por CRM ni por inicio del radar horario. La fecha de detección queda corregida a 06/10 por confirmación posterior de Julio |
| Corrección directa de Julio 15/10 17:51 UTC: detección 06/10/2026, cierre de interés 05/10 | Un día calendario después, no 24 horas exactas; hora/zona de detección sin acreditar. Radar y CRM del 10/10 posteriores, sin explicar la tardanza del día 6; conservar los cortes anteriores |
| LinkedIn Socopur429 y otra URL del mismo post | Prechequear identidad además de URL; detener sin abrir equivalente ni avanzar éxito/corte/IDs vistos |
| Cruce de lunes con puerta aún abierta | Mantener solape mínimo72h aunque incluya semana anterior; clasificar anterior abierta, no nueva publicación semanal |
| Fuente indexada tarde | Ampliar ventana documentando evidencia; no atribuir por ello la causa de Socopur |
| Lectura pública Chile y nonprofit Perú | No cubre privado Chile ni público/privado de Perú; celdas y nonprofit separados |
| Palm Desert | Condicionado al expediente financiero/seguros/elegibilidad; no desplaza prioridad LATAM |
| Conflicto sectorial Socopur | Mantener mínimo en lámina vs preferente en texto; elegibilidad sin resolver |

## Archivos exactos de este alcance

Modificados sobre el estado encontrado (no todo el diff previo del checkout):

1. `.codex/skills/efeonce-b2b-prospecting/SKILL.md`
2. `.claude/skills/efeonce-b2b-prospecting/SKILL.md`
3. `.codex/skills/greenhouse-public-private-tenders/SKILL.md`
4. `.claude/skills/greenhouse-public-private-tenders/SKILL.md`
5. `docs/commercial/tenders/socopur-agencia-marketing-digital-2027/README.md`
6. `docs/commercial/tenders/socopur-agencia-marketing-digital-2027/matriz-admisibilidad-INTERNO.md`
7. `docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/encaje-y-plan-de-accion-INTERNO.md`
8. `docs/commercial/tenders/LICITATION_CRM_REGISTER.md`
9. `docs/commercial/CRM_DEAL_REGISTER.md`
10. `docs/commercial/README.md`
11. `docs/commercial/prospecting-agent/README.md` (ya existía sin seguimiento Git)
12. `docs/manual-de-uso/comercial/operar-prospeccion-b2b.md`
13. `docs/documentation/comercial/prospeccion-b2b.md`
14. `docs/architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md`
15. `Handoff.md` (sólo continuidad de Socopur en sección existente)

Nuevos:

16. `docs/commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md`
17. `docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md`
18. `docs/audits/commercial/2026-10-15-socopur-radar-docs-skills.md` (este archivo)

## Verificación mecánica y límites

- `pnpm skills:mirrors`: PASS, incluidos ambos bundles afectados; sólo se sincronizaron los dos SKILL.md.
- Enlaces locales nuevos/cambiados: **39 comprobados, cero destinos ausentes** tras la revisión ampliada. Enlaces externos
  conservados como referencias; no se abrieron páginas bloqueadas ni se afirma revalidación externa.
- Diff propio comparado con una copia inicial del checkout (incluido WIP): **18 archivos**, sin
  diferencias fuera de ese conjunto entre los archivos preexistentes comprobados. Cambios en las cuatro
  skills sólo aditivos; no reemplazan instrucciones ajenas que ya estaban en el árbol.
- **36 evidencias/corridas preexistentes conservan SHA-256**: bases y research histórico de Socopur,
  corridas/consultas del radar y corridas de seguimiento. Plan y matriz conservan su contenido original
  completo tras el aviso añadido; registros CRM locales conservan sus cortes anteriores como históricos.
- `git diff --check` sobre rutas del alcance: PASS; diff respecto de baseline sin whitespace añadido.
- Prueba documental de credenciales antes del RFP y nueve casos de consistencia: resultados esperados
  revisados arriba. No se simula ejecución de un modelo, automatización o aviso entregado.
- `pnpm docs:closure-check -- <rutas>`: exit0; los subgates adicionales del script son globales y la
  cadena de package.json no acota su primer comando con esos argumentos. Se corrió además
  **`node scripts/check-documentation-closure.mjs -- <18 rutas>`** para el alcance correcto: exit0,
  **dos avisos heurísticos**, `missing_project_context_check` y `skill_registration_check`.
  `project_context.md` se leyó: ya enruta al manual/README comercial y no cambia runtime, ownership
  ni instalación. Se conservan éste y `changelog.md` por el mandato acotado a radar/Socopur y porque
  se amplía método existente, sin nueva skill/capacidad. El delta ADR, este informe y la continuidad
  focal de Handoff registran el cambio; no se presentan los avisos como cero advertencias.
- `pnpm docs:context-check:strict`: PASS, cero errores/advertencias, 20 sesiones de Handoff y
  60 entradas de changelog; sin rotación o edición de historia ajena.

No se requieren build/tests de aplicación para este alcance exclusivamente documental; no se ejecutaron
operaciones externas durante la prueba. Registro temporal de trabajo: baseline y diff propio en
`/tmp/socopur-docs-baseline.json` y `/tmp/socopur-docs-only.patch`; no forman parte del repo ni son
almacenamiento durable de evidencia. La lista anterior identifica el alcance frente al WIP previo.

Sin verificar: publicación, primera disponibilidad/indexación, hora/zona de detección del 06/10/2026,
validación y primer aviso exactos de Socopur, causa de tardanza, adjudicación, aclaración sectorial, futuras invitaciones y adopción/eficacia
real de las guías. Permisos y frecuencia intactos; el bloqueo inicial para actualizar los dos playbooks
personales se resolvió mediante aprobación puntual de escritura, como se registra al final.
No hubo commit ni push.

## Revisión ampliada de la skill personal — escritura bloqueada

**Corte histórico de la revisión inicial; bloqueo resuelto en la aplicación puntual documentada después.**

El operador amplió el alcance: inspeccionar `hubspot-saas-prospecting`, ajustar sólo lo pertinente si
ya era editable, y no ampliar permisos ni instalar copias. Se inspeccionaron SKILL.md y los tres
playbooks del bundle real en `/Users/jreye/.codex/skills/hubspot-saas-prospecting/`; es una ruta distinta
del checkout, no un symlink hacia él. Las raíces permitidas son el proyecto y directorios temporales;
la instalación personal está **fuera del permiso de escritura**. No se intentó escribir, escalar ni
instalar una copia alternativa. No hubo rechazo de auto-review: no se solicitó ampliación.

| Archivo real inspeccionado | Resultado y cambio mínimo pendiente |
| --- | --- |
| `/Users/jreye/.codex/skills/hubspot-saas-prospecting/SKILL.md` | Líneas18–25: carga el núcleo `efeonce-b2b-prospecting` actualizado y declara su precedencia ante discrepancias. La ruta resuelve; no necesita otra copia ni cambio imprescindible en la referencia principal. Sus ventanas se deben leer con la guía canónica actualizada. |
| `/Users/jreye/.codex/skills/hubspot-saas-prospecting/references/actionable-signal-playbook.md` | Requiere ajuste: paso2 aún prescribe solape48h y el párrafo Socopur declara primer hallazgo10/10/2026/recuperación. Cambiar sólo el solape a mínimo72h ampliable; conservar el párrafo como corte histórico y añadir cierre15/10 16:54:36UTC, sin nueva recuperación, adjudicación o invitación inferidas. Aclarar que10/10 no acredita primera detección exacta y enlazar el cierre canónico. Añadir referencia a la guía de primera puerta para señal temprana/tiempos separados, sin modificar horario o permisos. |
| `/Users/jreye/.codex/skills/hubspot-saas-prospecting/references/freshness-coverage-playbook.md` | Requiere complemento breve a la regla semanal/48h: referencia a la guía canónica con solape mínimo72h incluso al cruzar semana, primera puerta y aviso temprano, descubrimiento/vigilancia y carriles independientes, disponibilidad/detección/validación/aviso/margen separados, prechequeo de identidad/URL/bloqueos sin avance de marcadores fallidos. Mantener prioridad semanal, clasificación histórica, horario, ICP y permisos. |
| `/Users/jreye/.codex/skills/hubspot-saas-prospecting/references/service-opportunity-playbook.md` | Ya delega el método por cuenta al núcleo; conservar sus cinco líneas/ICP. No requiere modificación directa si los dos playbooks anteriores enrutan a la cobertura pública/privada/nonprofit de la guía, sin duplicar el contrato. |

Destinos canónicos existentes para esos ajustes mínimos: `/Users/jreye/Documents/greenhouse-eo/docs/commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md`
y `/Users/jreye/Documents/greenhouse-eo/docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/cierre-y-aprendizajes-2026-10-15-INTERNO.md`.
No se crearon pendientes en CRM ni automatizaciones para resolver este bloqueo. Eficacia y propagación
siguen sin comprobar; la precedencia correcta del núcleo no demostraba que ambos playbooks estuvieran corregidos.

## Aplicación puntual de las dos referencias personales

El operador indicó usar el mecanismo de aprobación puntual del entorno para estos dos archivos,
sin cambiar permisos persistentes ni ampliar directorios autorizados. Se preparó un diff concreto y
un aplicador limitado a esas dos rutas, con comprobación del SHA-256 anterior antes de escribir.
La ejecución `require_escalated` fue aprobada y devolvió exit0: **ambos cambios aplicados y releídos**.
No hubo denegación ni se usó otra ruta para eludir un bloqueo; no se instalaron copias nuevas.

Archivos añadidos al alcance anterior (total: **18 archivos del proyecto + 2 referencias personales**):

19. `/Users/jreye/.codex/skills/hubspot-saas-prospecting/references/actionable-signal-playbook.md`
20. `/Users/jreye/.codex/skills/hubspot-saas-prospecting/references/freshness-coverage-playbook.md`

Diff mínimo: paso de solape48h a mínimo72h; párrafo original Socopur conservado como corte histórico,
seguido del cierre confirmado y la incertidumbre de la primera detección; referencia a la guía de
primera entrada/aviso temprano. El playbook de frescura añade un complemento con cobertura, solape,
bloqueos y tiempos separados. Se conserva la pasada semanal/48h como prioridad de descubrimiento,
distinta del solape entre cortes. Horario09:00, frecuencia, suscripción, ICP y permisos intactos.

Parche exacto de la aplicación: `/tmp/socopur-personal-two-references.patch`; no es una instalación
alternativa. El SKILL.md, `references/service-opportunity-playbook.md` y `agents/openai.yaml` permanecen
idénticos por hash. Se verifican las dos salidas contra los hashes del parche aprobado y los enlaces
al canon del proyecto; la aplicación documental no prueba adopción del scheduler ni eficacia de alertas.

## Corrección cronológica confirmada por Julio — 15/10/2026 17:51 UTC

**Fuente directa del operador:** «Lo detectamos el 6 y había cerrado un día antes».
Detección **06/10/2026**, sin hora ni zona acreditadas; interés cerrado **05/10/2026**: **un día calendario
después**, no 24 horas exactas. Las 17:51 UTC corresponden a la confirmación del 15/10; no son hora de detección.
Radar horario y creación CRM del 10/10 son posteriores y **no explican la detección tardía del día 6**.
Publicación, primera disponibilidad/indexación, primer aviso exacto y causa siguen sin acreditarse.
La primera validación exacta y el margen temporal exacto tampoco se reconstruyen a partir de esos hitos.

La corrección se añade al informe de cierre y se refleja en README Socopur, guía/README del radar,
índices comerciales/CRM locales, dos SKILL.md Codex/Claude, ADR y Handoff. Los cortes anteriores y su
incertidumbre previa se conservan como historia; las corridas fechadas no se editan. En el caso de
consistencia anterior, la entrada histórica queda marcada y se añade el resultado con la fecha confirmada.

Las dos referencias personales se revisaron y corrigieron mediante otra aprobación puntual del entorno,
limitada a esos mismos archivos; exit0 y comprobación del hash de salida. Se conserva el párrafo histórico
del 10/10 y la lectura previa a 17:51; se añade la corrección con su procedencia y precisión por fecha.
El SKILL.md personal y los otros archivos del bundle permanecen intactos; sin permisos persistentes,
cambios de frecuencia/suscripción, CRM, código, commit o push. Parche de esta corrección personal:
`/tmp/socopur-personal-oct6-correction.patch`; baseline incremental:
`/tmp/socopur-oct6-correction-baseline.json`. La prueba documental de credenciales anteriores al RFP
sigue siendo un fixture hipotético; sus tiempos no se transfieren a Socopur.

Verificación incremental de esta corrección: **16 archivos modificados (14 del proyecto y las dos
referencias personales)**; sólo Markdown. **36 corridas/evidencias históricas intactas por SHA-256**;
dos salidas personales verificadas contra el parche aprobado y tres archivos restantes del bundle
intactos. Los cuatro destinos locales de las referencias personales resuelven. `pnpm skills:mirrors`
y `git diff --check` aprobados. Cierre documental acotado a las 14 rutas del repo: exit0 con los mismos
dos avisos heurísticos ya justificados; contexto estricto se ejecuta como último gate.
Diff incremental exacto: `/tmp/socopur-oct6-correction.patch`; conjunto de rutas:
`/tmp/socopur-oct6-correction-files.json`. No se atribuyen a este trabajo cambios ajenos del checkout.
