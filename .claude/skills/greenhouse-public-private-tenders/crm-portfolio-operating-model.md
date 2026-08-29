# CRM y priorización de cartera de licitaciones

Usa este companion para promover oportunidades públicas o privadas a HubSpot y para ordenar una cartera completa.
No reemplaza las bases, el portal de compras, HubSpot ni la decisión humana bid/no-bid.

## Promoción CRM común

El flujo es `search → propose → confirm → write → readback → automation readback`.

1. Normaliza el ID y busca por `id_de_licitacion` y `gh_idempotency_key`. Si ambas búsquedas resuelven Deals
   distintos o más de uno, detente para reconciliar.
2. Reutiliza la Company canónica. Resuelve identidad por identificador fiscal o dominio institucional específico;
   un dominio compartido o un nombre parecido no bastan. No fabriques Contacts.
3. Conserva por separado:
   - `fecha_de_cierre_de_licitacion`: plazo oficial para presentar;
   - `closedate`: fecha comercial estimada de resolución, sólo cuando exista evidencia;
   - `ficha_de_licitacion`: retorno directo a la ficha vigente;
   - `id_de_licitacion`: identidad visible del proceso;
   - `gh_idempotency_key`: pública `hubspot-public-tender:<país>:<ID>` o privada
     `hubspot-private-tender:<plataforma>:<ID>`.
4. Para un proceso nuevo aprobado, usa `pipeline=default` y `dealstage=qualifiedtobuy`, salvo que el proceso real
   ya esté en una etapa posterior verificada.
5. La relación comercial manda sobre el mecanismo de compra:
   - cliente existente, renovación o expansión → `Core Pipeline` + `existingbusiness`;
   - cuenta nueva seleccionada como apuesta → `Strategic Bets` + `newbusiness`;
   - sin evidencia suficiente → `policy_required`; no inventes una relación previa.
6. Relee propiedades y asociaciones inmediatamente después del write. Repite el readback después de que hayan
   podido correr workflows nativos de HubSpot. Si el bucket, tipo o asociación deriva, refleja el valor live en los
   registros, identifica la automatización responsable y pide aprobación antes de corregir. Un write verde no
   demuestra estado estable.
7. Tras cada mutación verificada, actualiza `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` y, si existe Deal,
   `docs/commercial/CRM_DEAL_REGISTER.md` con el mismo `deal_id`.

## Estados de decisión

- `GO / Preparación`: las puertas de admisibilidad, capacidad y economía tienen evidencia suficiente para invertir.
- `HOLD`: bloqueo temporal y reversible. Registra evidencia faltante, owner, próximo gate y deadline. Un adjunto
  load-bearing en `manual-save-required` deja la oportunidad en HOLD o `sin evidencia suficiente`.
- `NO-BID`: decisión terminal para el proceso vigente, con motivo y aprobador. Sólo se reabre por nueva evidencia o
  instrucción explícita.
- `Expirada`: el plazo pasó sin comprobante de postulación. Si el portal no se releyó, usa
  `HOLD vencido / estado portal no verificado`, no afirmes una extensión.

## Priorización de cartera

No ordenes por fecha ni por monto de manera aislada. Para cada oportunidad conserva señales fechadas:

1. tiempo real restante y esfuerzo de preparación;
2. admisibilidad y dependencias bloqueantes;
3. fit de servicio y evidencia en bases/adjuntos;
4. valor económico y estratégico;
5. probabilidad defendible de ganar;
6. capacidad disponible y costo de oportunidad;
7. margen proyectado sobre loaded cost.

La salida operativa separa tres colas:

- **Top bids:** pocas propuestas completas, ordenadas por deadline interno y valor esperado.
- **RFI livianos:** respuestas de posicionamiento/discovery; no consumen pricing fino ni producción completa salvo
  que el comprador lo exija. Registra el siguiente evento esperado.
- **Gate/HOLD/NO-BID:** oportunidades que primero necesitan una decisión binaria. No las cuentes como propuestas en
  producción.

Los conteos y prioridades son snapshots mutables: relee HubSpot y los portales antes de reportarlos. Nunca
hardcodees en la skill el número de oportunidades del día.
