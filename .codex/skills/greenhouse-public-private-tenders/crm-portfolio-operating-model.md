# CRM y priorización de cartera de licitaciones

Para nombres de Deal/Lead, aplicar la [convención canónica](../../../docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md).
El Deal de licitación usa `Marca o cuenta | País | Iniciativa | ID oficial`; marca demandante y
Company legal se resuelven por separado. El ID oficial y la llave de idempotencia siguen siendo campos
propios. No renombrar otros procesos del grupo ni crear un Lead sin su gate por aplicar el formato.

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
4. La investigación/alta de prospectos permanece en etapa lead hasta calificación efectiva; una señal, fit o
   autorización de crear contactos no bastan para crear Deal. Sólo promover cuando la calificación y el alta
   de Deal estén cubiertas por la instrucción. Leer pipeline/etapa live y elegirlos por evidencia, nunca aplicar
   `qualifiedtobuy` por defecto a todo hallazgo. Si el operador instruye conservar Deals existentes, no
   retrocorregirlos ni borrarlos por este criterio; registrar la excepción y la calificación pendiente.
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

## Nuevo proceso de una cuenta ya registrada

1. Una misma Company puede participar en varios RFP: deduplica por ID de proceso y llave de idempotencia,
   no sólo por empresa. Un ID distinto requiere su propio Deal cuando el alta está autorizada. No sobrescribas
   el alcance, precio, propuesta o estado del proceso anterior.
2. Lee el brief completo y registra archivo, ruta, fecha, integridad y qué procede de captura frente a lectura
   viva del portal. No conviertas un estado capturado en vigencia comprobada ni deduzcas zona horaria del país.
   Sin zona verificada, conserva el plazo textual y deja pendiente el datetime; no lo copies a `closedate`.
3. Reutiliza Company legal y contactos reales asociados. Si el brief no designa responsable, un contacto de
   relación puede asociarse dentro del alcance autorizado, dejando responsabilidad, cargo y autoridad pendientes
   en la nota. Asociación con la empresa no acredita ser comprador de este RFP. No inventes email ni cargo.
4. La nota debe asociarse al Deal y a Company/Contact pertinentes, con intención exacta, requisitos de archivos,
   calendario, alcance, supuestos y pendientes. Presupuesto ausente queda ausente; moneda default del portal
   no es moneda de oferta. Un objetivo del comprador no es un compromiso de resultado aceptado por Efeonce.
5. Relee también `pipeline_bucket`, `dealtype` y Primary después de automatizaciones. Guarda propuesto y
   observado por separado; no atribuyas la deriva a un workflow concreto sin identificarlo, ni la corrijas a
   ciegas. Un bucket Core derivado no prueba cliente existente. Para los segmentos de registros reutilizados,
   aplica `hubspot-as-a-service/references/prospecting-segmentation.md`: preservar valores y comprobar miembros.
6. Si el operador pide un nuevo chat, registra su ID/enlace en el workspace y en el registro de licitaciones.
   El handoff incluye rutas reales, IDs CRM, incertidumbres, qué leer, qué está pendiente y autorizaciones.
   Creación del chat no demuestra propuesta terminada ni autoriza enviar/postular. No crear otro por inferencia.

Caso y evidencia fechada: [Sika LIC-1169](../../../docs/commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md).

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
