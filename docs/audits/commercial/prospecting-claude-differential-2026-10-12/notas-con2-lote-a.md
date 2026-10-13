# Notas — con2 — lote-a

Rutas relativas a `.claude/skills/`. Los módulos se abrieron en un solo barrido antes de redactar; abajo se atribuyen al caso donde se usaron. `efeonce-b2b-prospecting/SKILL.md` se leyó completo y aplica a los cinco.

## 1. Archivos abiertos por caso

### P01
- efeonce-b2b-prospecting/SKILL.md
- efeonce-b2b-prospecting/references/buying-group-and-access.md
- efeonce-b2b-prospecting/references/contact-quality-and-enrichment.md
- efeonce-b2b-prospecting/references/crm-and-commercial-handoff.md
- efeonce-b2b-prospecting/references/account-research-and-signals.md
- efeonce-b2b-prospecting/references/signal-to-action.md
- efeonce-b2b-prospecting/references/situation-entry-playbooks.md (sólo líneas 40–69: «Proyecto puntual» y «Transformación CRM/RevOps»)
- efeonce-b2b-prospecting/references/motions-and-relationship.md
- efeonce-b2b-prospecting/templates/account-brief.md
- efeonce-b2b-prospecting/templates/action-pack.md
- hubspot-as-a-service/references/property-inventory.md
- hubspot-as-a-service/references/prospecting-segmentation.md (sólo líneas 24–59 y 120–169, más un grep de nombres de propiedad)

### P07
- efeonce-b2b-prospecting/SKILL.md
- efeonce-b2b-prospecting/references/account-cadence.md
- efeonce-b2b-prospecting/references/response-handling.md
- efeonce-b2b-prospecting/references/buying-group-and-access.md
- efeonce-b2b-prospecting/references/motions-and-relationship.md

### P13
- efeonce-b2b-prospecting/SKILL.md
- efeonce-b2b-prospecting/references/buying-group-and-access.md
- efeonce-b2b-prospecting/references/discovery-and-proof.md
- efeonce-b2b-prospecting/references/situation-entry-playbooks.md (líneas 57–69, «Transformación CRM/RevOps»)
- efeonce-b2b-prospecting/references/motions-and-relationship.md

### P20
- efeonce-b2b-prospecting/SKILL.md
- efeonce-b2b-prospecting/references/buying-group-and-access.md
- efeonce-b2b-prospecting/references/message-and-contextual-proof.md
- efeonce-b2b-prospecting/references/motions-and-relationship.md
- efeonce-b2b-prospecting/references/account-cadence.md (fila «Primera aproximación fría»)
- efeonce-b2b-prospecting/references/discovery-and-proof.md (párrafo «En frío basta…»)

### P34
- efeonce-b2b-prospecting/SKILL.md
- efeonce-b2b-prospecting/references/response-handling.md
- efeonce-b2b-prospecting/references/deliverability-operations.md
- efeonce-b2b-prospecting/references/account-cadence.md
- efeonce-b2b-prospecting/references/motions-and-relationship.md
- efeonce-b2b-prospecting/templates/response-triage.md

### No abiertos
- Nada bajo `evals/`, `docs/audits/` ni `.codex/`. De `prospecting-diff/` sólo `casos/lote-a.md`; un `ls` del directorio raíz y otro de `con2/` mostraron nombres de carpetas y de archivos ajenos, sin abrirlos.
- No se abrieron: `abm-and-abs.md`, `capacity-and-economics.md`, `experiments-and-learning.md`, `sources.md`, `claude-session-tools.md`, las demás plantillas, ni las skills hermanas (Customer Model, Commercial, Copywriting, Business Model). Tampoco los docs de arquitectura enlazados como canon de admisión; sólo se midió su tamaño con `wc -l`.
- Único comando que no fue lectura ni escritura de entrega: `wc -l` y `grep -n` sobre archivos de las skills.

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

1. **El plan de captura CRM depende de un documento que aquí estaba vedado.** `hubspot-as-a-service/references/property-inventory.md`: «cargar el manual por objeto y fase y sólo las filas necesarias del inventario fechado (`docs/audits/commercial/hubspot-properties-2026-10-11/README.md`)». `crm-and-commercial-handoff.md` paso 1 obliga a leer ese diccionario antes de preparar el changeset. Con `docs/audits/` prohibido, el changeset de P01 salió de la tabla resumen «Familias de captura» y de la tabla «Verified portal dictionary» de `prospecting-segmentation.md`, sin poder contrastar opciones ni tipos. `buying-group-and-access.md` también cierra con un enlace a `docs/audits/commercial/2026-10-11-buying-group-coverage-research.md`.

2. **«Registrar contactos» depende de un hecho que el caso no trae.** `crm-and-commercial-handoff.md`: «Autorizar «registrar contactos» cubre crear el Contact y asociarlo a una Company que ya existe. Company nueva, nota de Company, Lead o Deal son escrituras aparte». En P01 no se sabe si la Company existe y offline no se puede consultar, así que la respuesta tuvo que abrir las dos ramas. Eso roza con `SKILL.md` §«Responde lo pedido, en su tamaño» («Cada hecho aparece una vez», evitar carriles que el pedido no planteó). No hay regla sobre qué hacer cuando la existencia de la Company es desconocida.

3. **Respuesta manual a una publicación sin haber leído la publicación.** `buying-group-and-access.md`, ruta 5: «prepara borrador y motivo tras leer la publicación o el contexto original»; `signal-to-action.md` repite «leída la publicación original». En P01 sólo hay un resumen de la publicación. No queda claro si corresponde entregar un borrador condicionado o no entregar ninguno. No lo entregué, y pesó también que la capacidad en Colombia no está acreditada.

4. **Plan de captura completo frente a respuesta proporcional.** `SKILL.md` §«Entrega con CRM y dossier completo»: «Completar los campos pertinentes conocidos con evidencia, no sólo el mínimo de alta; distinguir completar, conservar, pendiente y sistema», y más abajo una lista larga de lo que cubre un dossier («entidad/fit, hechos vs hipótesis, relación/demanda/proceso…»). Frente a §«Responde lo pedido»: «Las plantillas dan forma al documento que recibe el siguiente owner; no son la estructura del mensaje». Un pedido como «prepara su registro» cae entre los dos y la skill no dice si eso ya es «entrega con CRM». Resolví con un changeset reducido y sin el `action-pack` completo.

5. **`efeonce_prospecting_service_fit` sin opción aplicable.** `property-inventory.md`: «No dejar vacío un dato pertinente ya confirmado por limitarse al mínimo técnico de alta». `prospecting-segmentation.md` lista sólo `creative` y `hubspot_crm` y pide no forzar un valor para que calce. Para trade/promociones (P01) las dos reglas chocan en apariencia; se resuelve dejando el campo vacío y anotándolo, pero hay que juntar dos archivos para llegar ahí.

6. **Lectura por defecto de «aprobación» cuando el contexto apunta a la otra.** `SKILL.md`: ««Aprobación» sin objeto se lee como el visto bueno interno del operador para el siguiente paso». `buying-group-and-access.md`, fila «Propuesta / aprobación»: «declara en una línea la lectura que tomas […] y responde esa, sin desarrollar las dos ramas». En P13 el contexto (discovery activo, presupuesto que depende de Finanzas) hace verosímil la aprobación del comprador, y la suficiencia exigida cambia mucho según la lectura: con la interna la respuesta es «sí, para seguir en discovery»; con la del comprador es «no». «Sin desarrollar las dos ramas» fue difícil de cumplir del todo: tomé la interna y añadí una condición para pasar a propuesta, que en la práctica es media rama de la otra.

7. **Investigación bajo HOLD: dónde termina «seguir» y dónde empieza «sumar gente».** `account-cadence.md`, fila «Hito comprador o HOLD vigente»: «La investigación offline ya autorizada puede seguir sólo para tener la cobertura lista al levantarse el HOLD». `SKILL.md`: el piso de 2–3 «no es motivo para sumar gente bajo HOLD o negativa». En P07 el motivo declarado («acelerar») lo decide. Si el operador hubiera pedido lo mismo como «completa la cobertura», los dos textos no dicen si su pedido cuenta como «investigación ya autorizada» ni si identificar personas nuevas, sin créditos ni escrituras, está permitido.

8. **Alcance de la parada ante un rebote.** `motions-and-relationship.md`: «Rebote: bloquear ese canal y revisar evidencia». `deliverability-operations.md`, tabla de rebotes: «Pausar tramo afectado —al menos los envíos a esa dirección por ese canal—». «Bloquear ese canal» se puede leer como todo el canal de correo para la cuenta; la segunda es más acotada. En P34 (Sur) apliqué la segunda.

9. **Fecha de revisión tras OOO.** `response-handling.md`, fila OOO: «Revisión interna desde el primer día hábil posterior al retorno declarado». «OOO hasta el 19/10» no dice si el 19 es el último día fuera o el día de regreso, y la regla no cubre ese caso. Tomé el 20/10 (martes), que sirve en las dos lecturas, sin considerar feriados del país del destinatario, que el caso no da.

10. **Pausar a quien ya figura fuera de la secuencia.** `response-handling.md`, fila OOO: «La decisión es pausar a esa persona: revisar automatización real y proponer la parada de sus pasos» y, en la misma fila, «Si el sistema muestra «unenrolled», averiguar la causa antes de reinscribir». Con «unenrolled» ya observado, «proponer la parada» sólo aplica a otros canales; la fila no lo separa y §«Comportamiento de HubSpot que debe verificarse» lo trata aparte.

11. **Bloque de identidad de marca dentro del módulo de mensaje.** `message-and-contextual-proof.md` §«Identidad de la oferta» habla de logos en recibos, finiquitos y superficies de la app. Para una apertura fría (P20) sólo sirve la frase «Presentar Efeonce como relación comercial…»; el resto no ayuda a redactar.

12. **Apertura fría sin el contenido de la señal.** `message-and-contextual-proof.md`: «Una observación verificable → por qué podría importarle → capacidad/prueba pertinente → pregunta proporcional». En P20 los hechos dicen que la señal existe pero no cuál es ni a qué servicio apunta. La skill no indica si en ese caso se entrega un borrador con huecos o se pide el dato antes; entregué el borrador con huecos marcados.
