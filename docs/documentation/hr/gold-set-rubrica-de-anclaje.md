> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-16 por Claude (TASK-1734 Slice 3)
> **Ultima actualizacion:** 2026-08-16 por Claude
> **Documentacion tecnica:** [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) · [TASK-1734](../../tasks/complete/TASK-1734-assessment-ai-scale-operator-exception-review.md)
> **Protocolo de uso:** [calificar-gold-set-de-referencia.md](../../manual-de-uso/hr/calificar-gold-set-de-referencia.md)

# Rubrica de Anclaje Conductual (BARS) — Gold Set de Referencia

Esta es la regla con la que se califica el **gold set de referencia** del template **Account Manager
L2**. No es una rubrica nueva: son las rubricas REALES del banco de preguntas
(`hiring_question.rubric_json`) traducidas a **anclas conductuales observables** por nivel de
puntaje, para que dos personas distintas lean la misma respuesta y lleguen a un numero parecido.

## Que es una BARS y por que existe

**BARS** = *Behaviorally Anchored Rating Scale*, escala anclada en conductas. En vez de pedirte
"pon una nota del 0 al 100 segun tu criterio", te dice **que tendrias que ver en la respuesta**
para cada tramo de nota. Es la diferencia entre "esta respuesta me parecio buena" y "esta respuesta
cumple 3 de los 4 criterios con evidencia concreta y el cuarto lo menciona sin desarrollarlo".

Sin anclas, dos evaluadores competentes pueden diferir 25 puntos en la misma respuesta y ninguno
esta equivocado: estan usando reglas distintas. Con anclas, esa diferencia baja y —lo mas
importante— **queda explicable**: se puede decir en que criterio difirieron.

## La escala, y de donde sale

Las **23 preguntas activas** del template Account Manager L2 comparten exactamente la misma
estructura de rubrica:

```
"scale": "0-100 (25 puntos por criterio; parcial permitido)",
"criteria": [ 4 criterios observables ]
```

Es decir: **cada criterio vale hasta 25 puntos, y se permite credito parcial**. Los cuatro niveles
de esta BARS son la lectura conductual de esa aritmetica — no una invencion paralela:

| Nivel | Puntaje | Regla mecanica | Lectura conductual |
|---|---|---|---|
| **Insuficiente** | 0–40 | 0 a 1 criterio, o varios apenas insinuados | La respuesta no aborda la situacion planteada, o la aborda de forma tan generica que serviria para cualquier pregunta |
| **Parcial** | 41–59 | ~2 criterios con evidencia | Hay oficio, pero faltan piezas sustantivas del criterio. Se entiende que haria, no como ni con que |
| **Solido** | 60–79 | ~3 criterios con evidencia, o los 4 presentes con uno flojo | Respuesta profesional y completa en lo esencial; le falta especificidad o un criterio queda declarado sin desarrollar |
| **Sobresaliente** | 80–100 | Los 4 criterios con evidencia concreta | Ademas de cubrir los 4, aporta especificidad verificable (plazos, cifras, mecanismos, texto real) |

**Credito parcial**: si un criterio esta a medias, vale entre 1 y 24 puntos. No es todo o nada.
Ejemplo: "propone un mecanismo para que no se repita" mencionado como *"vamos a revisar mejor"*
vale poco; *"agregamos doble revision de porcentajes antes de publicar, la hace quien no redacto"*
vale el criterio completo.

## Reglas transversales (aplican a las 9 competencias)

Estas cinco reglas cortan parejo y resuelven la mayoria de los desacuerdos entre raters:

1. **Especificidad sobre intencion.** "Le aviso al cliente" es intencion. "Le escribo el mismo dia,
   con la fecha nueva y que hicimos para protegerla" es conducta. La BARS premia lo segundo.
2. **Accion propia sobre accion del equipo.** En preguntas de experiencia, "nosotros hicimos" sin
   "yo hice" no acredita el criterio de accion propia.
3. **Extension no es calidad.** Una respuesta larga que rodea sin comprometerse vale menos que una
   corta y precisa. **Si te sorprende una respuesta breve que cumple los 4 criterios, cumple los 4.**
4. **Forma sobre contenido, no.** Faltas de ortografia o desorden no bajan la nota por si solos,
   salvo cuando el criterio evalua justamente la comunicacion escrita (ver
   `client_relationship_comm` y `copywriting`, donde la forma **es** el contenido).
5. **Lo no dicho no se acredita ni se castiga inventando.** Se califica lo que esta escrito. No se
   asume que "seguro tambien haria X".

## Anclas por competencia

Las nueve competencias del template, ordenadas por su peso real en `hiring_assessment_template_module`.
Los criterios citados son los del banco de preguntas, verbatim.

---

### 1. Relacion con el cliente y comunicacion (`client_relationship_comm`) — peso 20

**Que mide:** si la persona puede sostener una conversacion dificil con un cliente sin romper la
relacion ni regalar el alcance. Cubre update con atraso, disculpa por error propio y pedido fuera
de alcance en reunion.

**Criterios reales:** liderar con el estado real sin enterrarlo · el atraso viene con plan, no solo
con mala noticia · el riesgo aparece con mitigacion · estructura escaneable · reconocer el error sin
culpar a terceros · correccion concreta con plazo · mecanismo para que no se repita · tono que
preserva la relacion (ni defensivo ni servil) · no comprometer lo que no puede dimensionar · validar
la necesidad de negocio antes de hablar de esfuerzo · volver por escrito con opciones · proteger la
relacion Y el alcance.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Entierra la mala noticia al final o no la dice. Culpa al proveedor, al equipo o al cliente. Dice que si a todo, o dice que no en seco. | *"Seguimos avanzando muy bien"* con el atraso mencionado en la ultima linea; o *"eso no se puede"* sin alternativa |
| **41–59** | Dice el hecho pero sin plan, o da un plan sin fecha. Tono correcto pero generico. Reconoce el error y se queda en la disculpa. | *"Hubo un atraso, estamos trabajando para resolverlo"* — hecho presente, plan ausente |
| **60–79** | Abre con el hecho, da fecha nueva y contiene el riesgo. Reconoce el error con la correccion concreta. Le falta el mecanismo preventivo o la estructura es densa. | *"La ficha se mueve del 14 al 17 porque el proveedor entrego incompleto; el equipo ya avanzo maquetacion"* |
| **80–100** | Los 4 criterios con especificidad: hecho + magnitud arriba, plan con fecha, riesgo con mitigacion, y se lee en 30 segundos. En la disculpa, agrega el mecanismo que evita la repeticion. | *"Publicamos la version correcta, respondimos los 12 comentarios, y desde ahora el porcentaje lo valida quien no redacto la pieza"* |

---

### 2. Acumen comercial / crecimiento de cuenta (`commercial_acumen`) — peso 15

**Que mide:** si detecta una oportunidad de crecimiento en la conversacion del cliente y la trabaja
sin volverse vendedor de features.

**Criterios reales:** reconocer la senal como oportunidad legitima (dolor + timing) · indagar antes
de proponer · involucrar a quien corresponde internamente sin apropiarse · proponer en terminos del
problema del cliente con siguiente paso · partir de objetivos del cliente y no de "que mas venderle"
· senales verificables y no intuicion · secuencia realista de 90 dias con hitos · valor conectado a
resultado de negocio, no a features.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | No ve la oportunidad, o salta directo a cotizar. Propone servicios sin conectar con ningun problema del cliente. | *"Le mando la propuesta de nuestro paquete de lanzamiento"* |
| **41–59** | Ve la senal pero la trabaja de intuicion. Propone sin indagar, o indaga sin siguiente paso concreto. | *"Le pregunto mas del lanzamiento y despues vemos"* |
| **60–79** | Indaga primero, involucra a comercial/estrategia y propone en terminos del problema. Le falta la secuencia con hitos o las senales verificables. | *"Le pregunto que implica el lanzamiento para su equipo y que no alcanzan a cubrir; anoto textual"* |
| **80–100** | Los 4: senal leida como dolor + timing, indagacion antes de proponer, la persona correcta adentro, y una secuencia descubrir → validar → proponer con hitos y datos verificables. | *"Dentro de 48 horas le mando el resumen de lo que entendi con una hipotesis; reviso primero los datos de uso de los ultimos 3 meses"* |

---

### 3. Copywriting (`copywriting`) — peso 12

**Que mide:** si escribe para el problema del lector en vez de para la descripcion de la empresa, y
si sabe diagnosticar por que un texto no funciona. Aca **la forma es el contenido**: se califica el
texto producido, no la explicacion de como lo produciria.

**Criterios reales:** idea concreta para el problema de la audiencia en vez de repetir a la empresa ·
titulo y apertura claros con una sola promesa · CTA accionable con valor del siguiente paso y sin
promesa no demostrada · CTA conectado a la intencion y no decorativo · detectar falta de valor,
especificidad, contexto o siguiente paso · alternativas diferenciadas por intencion y no variaciones
de palabras · CTA honestos sobre lo que ocurrira despues · nombrar el mecanismo (especificidad,
curiosidad, urgencia legitima) · identificar lo generico ("mas informacion", "servicios integrales")
· registro/voz de marca · variantes que lideran con el beneficio del lector · sin clickbait.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Repite la descripcion de la empresa. CTA generico. Las variantes son la misma idea con sinonimos. Diagnostica "no me gusta" sin nombrar el problema. | Titular tipo *"Soluciones integrales para tu negocio"*; CTA *"Mas informacion"* |
| **41–59** | Hay una idea propia pero difusa, o el CTA es accionable pero desconectado de la etapa del lector. Detecta que algo falla sin nombrar cual de las cuatro fallas es. | *"Le cambiaria el titulo por uno mas atractivo"* sin producir el titulo |
| **60–79** | Titulo especifico con una promesa, CTA accionable y honesto, variantes con angulos distintos. Falta nombrar el mecanismo o la voz de marca se pierde. | Tres titulares con angulos reales distintos, sin justificar por que cada uno funciona |
| **80–100** | Los 4: idea sobre el problema de la audiencia, promesa unica y clara, CTA conectado a la intencion, y justificaciones que **nombran el mecanismo**. Respeta limites de extension y no promete lo que el contenido no cumple. | *"Este lidera con curiosidad legitima porque nombra el costo oculto; el segundo con especificidad numerica para quien ya compara"* |

---

### 4. Compostura bajo presion (`composure_pressure`) — peso 10

**Que mide:** si sostiene el juicio cuando la situacion se pone tensa, en vez de reaccionar o
desaparecer. Cubre relato de experiencia real, cliente que descalifica en sala y dos urgencias
simultaneas.

**Criterios reales:** situacion con presion real y detallada (STAR) · acciones PROPIAS especificas ·
regulacion: priorizo y comunico en vez de reaccionar o desaparecer · resultado honesto + aprendizaje
que cambio como trabaja · no responder defensivamente ni dejar escalar la tension · separar lo valido
de lo injusto sin litigarlo en caliente · proteger al equipo en la sala · convertir el momento en
siguiente paso concreto · priorizar por impacto real · comunicar a AMBAS partes de inmediato · no
prometer lo que no puede cumplir para bajar la presion · cerrar el ciclo con registro.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Relato vago sin actores ni fechas. Responde defensivo, o promete lo que no puede cumplir para calmar el momento. Deja a una de las dos partes en silencio. | *"Siempre trato de mantener la calma y comunicarme bien"* |
| **41–59** | Situacion concreta pero las acciones son del equipo, no propias. Prioriza pero no comunica, o comunica sin priorizar. | *"Nos organizamos y lo sacamos adelante"* |
| **60–79** | Contexto especifico, accion propia clara y regulacion visible. Falta el cierre del ciclo o el aprendizaje es generico. | *"Prioricé el error publico sobre el cambio de pieza y avise a los dos por separado en la misma hora"* |
| **80–100** | Los 4: contexto con fechas/actores/magnitudes, accion propia, regulacion demostrada, y **resultado honesto con el cambio de habito que persiste**. En sala: protege al equipo y convierte la tension en revision con plazo. | *"Comprometi una fecha antes de que desarrollo confirmara pagos; nos atrasamos 3 semanas. Desde entonces no comprometo fecha sin confirmacion escrita del equipo tecnico"* |

---

### 5. Liderazgo (`leadership`) — peso 10

**Que mide:** si diagnostica antes de reorganizar, y si da feedback sobre conducta observable en vez
de sobre la persona.

**Criterios reales:** observar/escuchar antes de reorganizar · instalar UN canal de priorizacion (el
caos es estructural, no de esfuerzo) · acordar punto de entrada unico con el cliente sin cortar al
equipo · secuencia realista (estabilizar primero) · diagnosticar antes de actuar · reencuadrar con el
brief en vez de criticar entregas · decidir con criterio de plazo sin hacerlo el/ella mismo/a · cuidar
a la persona (feedback sobre el trabajo, no sobre su valia) · directo y temprano, sin sandwich
artificial · hechos observables y no etiquetas de personalidad · separar valor de la persona del
comportamiento · abrir trabajo conjunto en vez de solo sentenciar.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Reorganiza en la semana 1 sin diagnosticar. Da feedback con etiquetas de personalidad. Toma el trabajo del otro y lo hace el/ella. | *"Es que el es muy desordenado"*; *"lo hago yo y listo"* |
| **41–59** | Diagnostica pero la accion no se sigue del diagnostico. Feedback directo pero sin plan conjunto. | *"Le digo que tiene que mejorar la comunicacion"* |
| **60–79** | Observa antes de actuar, reencuadra con el brief y decide con criterio de plazo. Falta el mecanismo permanente o el cuidado explicito de la persona. | *"Le pregunto que entendio del pedido y contrastamos linea por linea con lo que pidio el cliente"* |
| **80–100** | Los 4: diagnostico primero, **un** canal de priorizacion instalado, secuencia estabilizar → optimizar, y feedback con hechos observables que separa la valia de la conducta y abre plan conjunto. | *"'Interrumpiste tres veces en la reunion del martes' en vez de 'eres intenso', y armamos juntos como recuperas el espacio"* |

---

### 6. Ownership y accountability (`ownership`) — peso 10

**Que mide:** si el resultado ante el cliente es suyo aunque la falla no lo sea, y si convierte el
error en memoria del sistema.

**Criterios reales:** reconocer responsabilidad propia especifica (no "fallamos como equipo") · sin
reescritura defensiva · reparacion concreta en el momento · cambio de sistema/habito demostrado ·
no refugiarse en "mi parte esta lista" · verificar con datos en vez de aceptar o desconfiar por
default · escalar con evidencia y propuesta, no con queja · preparar comunicacion honesta al cliente
· actuar sin esperar al dueno formal · contener antes de buscar responsables · dejar aprendizaje para
el sistema · no esconder el problema detras de metricas vanidosas.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | "Mi parte esta lista". Busca responsables antes de contener. Reescribe la historia para salir bien parado. | *"Yo entregue a tiempo, el atraso fue de medios"* |
| **41–59** | Asume responsabilidad difusa ("fallamos como equipo"). Escala como queja. Se queda en "aprendi mucho". | *"Fue un error de todos y aprendimos harto"* |
| **60–79** | Responsabilidad propia especifica, contencion primero, escalamiento con evidencia. Falta el cambio de sistema o la comunicacion preparada al cliente. | *"Comprometi la fecha sin confirmar con desarrollo. Detuve el envio y avise el mismo dia"* |
| **80–100** | Los 4: parte propia sustantiva (no cosmetica), reparacion concreta en el momento, **cambio de sistema/habito demostrado desde entonces**, y comunicacion honesta preparada. Deja regla o recurso reutilizable. | *"Desde ese proyecto ninguna fecha sale sin confirmacion escrita del equipo tecnico; quedo como paso del checklist de kickoff"* |

---

### 7. SEO (`seo`) — peso 8 · nivel objetivo: nociones

**Que mide:** si escribe para la intencion de busqueda y para que un motor de respuesta pueda citar
el contenido. Nivel objetivo **nociones**, no experto: se espera criterio, no dominio tecnico.

**Criterios reales:** responder la intencion de forma directa y util antes de extender el contexto ·
estructura escaneable y autocontenida, adecuada para recuperacion y citabilidad · distinguir
afirmaciones que requieren evidencia de recomendaciones editoriales · conectar CTA y medicion con la
intencion, no solo con posiciones o keywords.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | SEO como repeticion de keywords, densidad, enlaces internos y FAQs por ritual. Mide posiciones y nada mas. | *"Repetir la keyword en H1, H2 y primer parrafo"* |
| **41–59** | Responde la intencion pero entierra la respuesta bajo contexto. Estructura correcta sin criterio de citabilidad. | Introduccion de tres parrafos antes de responder la pregunta |
| **60–79** | Responde directo y estructura escaneable. Falta distinguir afirmacion-con-evidencia de recomendacion editorial, o la medicion sigue siendo posiciones. | Respuesta en las primeras lineas + subtitulos autocontenidos |
| **80–100** | Los 4: respuesta directa primero, bloques autocontenidos y citables, separacion explicita entre lo que exige evidencia y lo que es criterio editorial, y medicion conectada a la intencion. | *"Este dato necesita fuente; esta recomendacion es criterio nuestro y va marcada como tal"* |

---

### 8. Vendor Management (`vendor_management`) — peso 8 · nivel objetivo: nociones

**Que mide:** si maneja a un proveedor que falla con hechos y consecuencias, en vez de con paciencia
infinita o reemplazo impulsivo.

**Criterios reales:** documentar el patron con hechos (fechas, retrabajos, costo del retrabajo
interno) · conversar con expectativas explicitas y consecuencias claras ANTES de reemplazar · evaluar
el costo TOTAL, no solo la tarifa · preparar alternativa en paralelo en vez de esperar la tercera
falla.

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Lo reemplaza de inmediato, o lo aguanta sin decir nada. Compara solo tarifas. | *"Buscamos otro proveedor mas barato"* |
| **41–59** | Conversa con el proveedor pero sin hechos ni consecuencias. Reconoce el problema sin cuantificarlo. | *"Le digo que necesitamos que mejore los plazos"* |
| **60–79** | Documenta el patron y conversa con expectativas explicitas. Falta el costo total o el plan B en paralelo. | *"Llevo el registro de las dos entregas tarde con fechas y le pongo consecuencia clara"* |
| **80–100** | Los 4: patron con fechas y **costo del retrabajo interno**, conversacion con consecuencias antes de reemplazar, costo total (retrabajo + riesgo con cliente) y alternativa lista en paralelo. | *"Dos atrasos = 14 horas de retrabajo interno; la tarifa mas baja nos sale mas cara. Activo busqueda de plan B mientras converso"* |

---

### 9. Coordinacion de entrega (`delivery_coordination`) — peso 7

**Que mide:** si protege el ciclo del equipo del alcance que se cuela, y si comunica un atraso sin
enterrarlo.

**Criterios reales:** re-priorizar el ciclo CON el cliente (que entra, que sale) en vez de exprimir
al equipo · nombrar la causa raiz: absorcion silenciosa de alcance, no lentitud del disenador ·
instalar mecanismo (todo pedido nuevo pasa por priorizacion visible) · comunicar el ajuste con
opciones, no con excusas · abrir con el hecho y la magnitud en las primeras lineas · causa honesta
sin culpar al proveedor como escudo · fecha nueva realista + que se hace para protegerla · ofrecer
mitigacion del impacto (entrega parcial, plan alternativo).

| Nivel | Que se ve en la respuesta | Evidencia que lo cumple |
|---|---|---|
| **0–40** | Le pide al equipo que apure. Atribuye el atraso a lentitud del disenador. Entierra el hecho en preambulos. | *"Le pido al equipo que haga un esfuerzo extra"* |
| **41–59** | Nombra el atraso pero no la causa raiz. Da fecha nueva sin decir como la protege. | *"Se atrasa 4 dias, la nueva fecha es el 16"* |
| **60–79** | Abre con hecho y magnitud, causa honesta, fecha realista. Falta la mitigacion para el cliente o el mecanismo permanente. | *"Se mueve del 12 al 16 por el proveedor de fotografia; ya escalamos por escrito"* |
| **80–100** | Los 4: hecho y magnitud arriba, causa raiz nombrada (absorcion silenciosa de alcance), re-priorizacion **con** el cliente, mitigacion concreta y mecanismo para que todo pedido nuevo pase por priorizacion visible. | *"Adelantamos la maquetacion para que al llegar el material solo se monte; y desde este ciclo todo pedido nuevo entra por el tablero de priorizacion"* |

---

## Que NO hacer al calificar

- **NO** calificar la persona: se califica la respuesta. No hay "candidato prometedor" en esta tarea.
- **NO** premiar la extension. Ver regla transversal 3.
- **NO** castigar un enfoque distinto al tuyo si cumple el criterio. La rubrica pide conductas, no
  una solucion unica.
- **NO** usar informacion de fuera de la respuesta (quien es, de donde viene, como le fue). El
  instrumento esta anonimizado justamente para que eso no sea posible.
- **NO** ajustar la nota "para que calce" con lo que crees que dirian los demas. El desacuerdo entre
  raters es el dato que estamos midiendo; suavizarlo destruye el instrumento.

## Referencias

- Protocolo de calificacion paso a paso: [`docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md`](../../manual-de-uso/hr/calificar-gold-set-de-referencia.md)
- Formato del dataset: `src/lib/hiring/assessment/ai/eval/__fixtures__/promotion-dataset.schema.md`
- Rubricas fuente: `greenhouse_hiring.hiring_question.rubric_json` (template `atpl-account-manager-l2`)
- Ciencia de seleccion (estructura > carisma; Sackett et al. 2022): skill `greenhouse-talent-people-operator`, `references/assessment-interviewing.md`
