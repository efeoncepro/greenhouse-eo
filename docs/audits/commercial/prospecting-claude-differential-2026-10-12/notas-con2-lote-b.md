# Notas — con2, lote-b

Rutas relativas a `.claude/skills/efeonce-b2b-prospecting/` salvo que se indique otra raíz.
No abrí `evals/`, `.codex/`, `docs/audits/**` ni otros archivos de `prospecting-diff/` fuera de `casos/lote-b.md`
(sólo listé los nombres de `con2/` y `notas/` para confirmar que existían las carpetas de salida).

## 1. Archivos abiertos por caso

Comunes a los cinco: `SKILL.md` (completo) y `prospecting-diff/casos/lote-b.md`.

**P03**
- `references/motions-and-relationship.md`
- `references/contact-quality-and-enrichment.md`
- `references/buying-group-and-access.md`
- `references/signal-to-action.md`
- `references/crm-and-commercial-handoff.md`
- `references/message-and-contextual-proof.md`
- `templates/signal-action.md`

**P09**
- `references/account-research-and-signals.md`
- `references/signal-to-action.md`
- `references/situation-entry-playbooks.md`
- `references/buying-group-and-access.md`
- `templates/signal-action.md`
- `docs/context/13_icp-buyer-personas-jtbd.md` (grep de tamaño/piso + líneas 33–68)

**P18**
- `references/buying-group-and-access.md`
- `references/contact-quality-and-enrichment.md`
- `references/crm-and-commercial-handoff.md`

**P28**
- `references/capacity-and-economics.md`
- `templates/account-economics.md`

**P39**
- `references/deliverability-operations.md`
- `templates/delivery-readiness.md`
- `references/contact-quality-and-enrichment.md`
- `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`

No abrí: `abm-and-abs`, `account-cadence`, `response-handling`, `discovery-and-proof`, `experiments-and-learning`,
`sources`, `claude-session-tools`, ni las skills hermanas (HubSpot, Customer Model, Commercial, Copywriting).

## 2. Instrucciones ambiguas, contradictorias o difíciles de aplicar

1. **Dos mandatos sobre CRM que tiran en sentidos opuestos (P18, P03).**
   `SKILL.md`: «Si la entrega incluye CRM, convertir la investigación en un **plan de captura por objeto y fase**
   mediante el diccionario HubSpot. Completar los campos pertinentes conocidos con evidencia, no sólo el mínimo de alta».
   El mismo archivo, más arriba: «Abre un carril que el pedido no planteó (créditos, CRM, otra cuenta, protocolo de
   envío) sólo si bloquea el siguiente paso» y, en el ejemplo, «Sobran ahí […] un changeset de CRM».
   En P18 el pedido ES una escritura de CRM y hay cuatro personas elegibles con autorización: no queda claro si
   «la entrega incluye CRM» obliga a cargar el diccionario y entregar el plan campo por campo, o si basta decir qué
   se registra. Tomé lo segundo (además el caso no trae datos de las personas) y no abrí el diccionario HubSpot.
   `crm-and-commercial-handoff.md` paso 1 («Leer HubSpot, su segmentación y su diccionario/captura por objeto, y
   manual de carriles») tampoco dice si aplica al proponer un changeset offline o sólo al ejecutarlo.

2. **«Company que ya existe» sin saber si existe (P18).**
   `crm-and-commercial-handoff.md`: «Autorizar «registrar contactos» cubre crear el Contact y asociarlo a una Company
   que ya existe. Company nueva, nota de Company, Lead o Deal son escrituras aparte».
   Trabajando offline no se puede saber si la Company existe, así que la respuesta tuvo que bifurcarse. La regla no
   dice qué hacer cuando ese estado es desconocido.

3. **El piso de 2–3 adicionales ante un cambio de empleador (P03).**
   `SKILL.md`: «Investiga al objetivo y **busca 2–3 contactos adicionales relevantes** […] las personas que ya vienen
   en los hechos o el dossier cuentan». No dice sobre qué entidad se cuenta cuando el objetivo cambió de empresa
   (¿la nueva, la anterior, ambas?). Leí que cuenta la empresa actual y que los dos empleados de Banco Sur ya cubren
   la base, sin ampliar ni tocar Banco Norte.

4. **Mensaje manual «tras leer el contexto original» cuando no hay acceso a ese contexto (P03).**
   `buying-group-and-access.md` ruta 5: «prepara borrador y motivo tras leer la publicación o el contexto original».
   `motions-and-relationship.md`, reactivación: «Recuperar historia, cambios, responsable y razón nueva».
   El caso sólo dice «habló con la persona hace dos años»; no hay hilo que leer. No está claro si en ese caso se
   entrega borrador con huecos (lo que hice) o se retiene hasta tener la historia.

5. **Excepción de ICP «declarada» frente a un pedido que ya pide la oferta (P09).**
   `situation-entry-playbooks.md`: «redactar el acercamiento sólo si declara en la conversación una excepción para
   esa cuenta». El operador pide ofrecer directamente y afirma «tiene presupuesto». La frase no dice si un pedido
   explícito de ofertar a una cuenta bajo el piso cuenta como declaración implícita. Leí que no (los hechos dicen
   «No hay excepción de ICP») y no redacté.

6. **«Sin indicios de problema» cuando la reputación es desconocida (P39).**
   `deliverability-operations.md`: «Como una respuesta puntual autorizada, sin indicios de problema no exige
   dashboards de reputación ni baseline de rebote; declarar lo que no se observa».
   En el caso los avisos de reputación son «desconocidos». ¿«Desconocido» equivale a «sin indicios»? Lo traté como
   sí (no observado, no exigido para un mensaje único). La misma frase empieza con «Como una respuesta puntual
   autorizada», cuya gramática deja dudoso si la exención aplica también al primer mensaje individual o sólo a respuestas.

7. **La decisión de la ficha es de opción única, pero el caso cae en tres (P39).**
   `templates/delivery-readiness.md`: «Decisión: preparar / listo para acción ya autorizada / no listo: defecto
   conocido corregible (firma, CCO) / pendiente de chequeo (falta evidencia) / carril bloqueado».
   El caso tiene a la vez defecto corregible (firma, CCO), evidencia pendiente (supresión no consultada) y falta de
   autorización. No se indica cuál etiqueta prevalece; las reporté por dimensión y resumí como «no está lista».

8. **Cuándo dar el literal del CCO (P39).**
   `deliverability-operations.md`: «el CCO de registro que esa política define (el literal, sólo cuando el operador
   lo necesita para corregir o preparar ese envío)». El pedido es «solo diagnóstico, sin envío», pero el diagnóstico
   encuentra el CCO ausente. No es evidente si diagnosticar un defecto cuenta como «lo necesita para corregir».
   Lo incluí, junto con la firma en texto completa.

9. **Política de Outlook de Julio vs «sender corporativo» sin nombre (P39).**
   `deliverability-operations.md`: «La política no se extiende a otro remitente». El caso dice «sender corporativo
   conectado a Outlook» y «borrador de Julio» sin afirmar que la casilla sea la suya. Tuve que asumirlo y declararlo.

10. **«Alternativa menor» sin criterio para elegirla (P28).**
    `capacity-and-economics.md`: «el techo no se reduce por fórmula: entregarlo condicionado, nombrar la alternativa
    menor y dejar visibles el owner y el esfuerzo de seguimiento pendientes». No dice cómo se determina la
    alternativa menor (¿una menos?, ¿cero?). Elegí una cuenta con la segunda escalonada.

11. **Dónde va el seguimiento abierto al costear (P28).**
    El módulo dice cómo tratarlo en capacidad («Entradas nuevas caben cuando su esfuerzo más seguimiento abierto no
    supera ese neto») pero no si esas horas entran en el costo de la ventana cuando se pide «costo por cuenta
    trabajada y por resultado». Las mostré como partida separada y rotulé como supuesto que pertenecen al plan.

12. **«Comprometido / consumido» para una licencia ya contratada (P28).**
    `capacity-and-economics.md`: «Separar comprometido, consumido y pendiente» y «Una licencia ya contratada tiene
    costo asignable aunque no genere pago adicional». No aclara si la porción atribuida de una licencia vigente se
    reporta como comprometida o como consumida a la fecha de corte. La puse como comprometida.

13. **Enlace a material vedado.** `buying-group-and-access.md` cierra con «Sustento y límites: investigación de
    cobertura» apuntando a `docs/audits/commercial/…`. No lo abrí; no hizo falta para decidir.
