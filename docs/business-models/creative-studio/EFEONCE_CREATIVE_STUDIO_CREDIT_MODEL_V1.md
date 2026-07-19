# Efeonce Creative Studio — Studio Credit Model V1

> **Status:** Approved for validation — shadow ledger primero
> **Owner:** Finance + Efeonce Globe Product + Creative Operations
> **Version:** 1.0
> **Date:** 2026-07-19
> **Validated as of:** 2026-07-19
> **Parent model:** [Creative Studio Business Model V1](EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
> **Technical contract:** [Agentic Platform Architecture §7](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md#7-credits-and-commercial-boundary)

## 1. Decisión

Un **Studio Credit** es una unidad interna/comercial de operaciones generativas gobernadas ejecutadas por
Creative Studio. No es dinero, token, hora, asset final, licencia, FTE ni costo de proveedor.

Los créditos sirven para:

- estimar y limitar consumo variable antes de ejecutar;
- comparar capacidades semánticas aunque cambie provider/modelo;
- reservar presupuesto sin exponer secretos o tarifas de terceros;
- financiar retries/refunds de forma consistente;
- dar forecast a cliente y operación;
- medir margen por capability, template y cuenta.

No sirven para valorar dirección creativa, estrategia, curation, QA humano, derechos ni capacidad reservada.
Esas dimensiones usan líneas económicas separadas.

## 2. Principios no negociables

1. **Provider-neutral, no provider-opaque:** la unidad representa capacidad Efeonce, no una llamada a un
   vendor; el usuario puede ver qué provider/modelo/version fue propuesto y cuál se ejecutó realmente.
2. **Semantic-first:** se cobra la operación aprobada que el usuario entiende, no parámetros internos.
3. **Mode-neutral:** la misma operación consume los mismos créditos en managed, co-operated o client-operated.
4. **Estimate before spend:** ningún run reserva sin estimate visible y ninguna ejecución excede approval bounds.
5. **Append-only:** balance es proyección de ledger; ajustes nunca borran historia.
6. **No double charge:** un retry técnico no crea un segundo cargo silencioso.
7. **No hidden rights:** licencias y derechos se cotizan aparte.
8. **No false precision:** bandas antes que decimales arbitrarios; recalibración con datos observados.
9. **Human authority:** aprobación de gasto y delivery permanece humana según policy.
10. **Margin floor:** equivalencias se diseñan para sostener ≥45% de margen bruto total, no para copiar costos.

## 3. Qué devenga créditos y qué no

### Devenga

Una operación generativa devenga créditos cuando:

- usa una capability/modelo/compute de costo variable;
- tiene inputs, límites y estimate aprobados;
- produce un attempt auditable y asset/evidencia asociado;
- termina en settlement según outcome y refund policy.

Ejemplos: generar candidatos de imagen, variación generativa de un anchor, image-to-video, generación de voz,
audio/music/SFX generativo, lip-sync o upscale generativo cuando usa inferencia variable.

### No devenga Studio Credits

- discovery, ideación, briefing y workshop;
- moodboard, tratamiento, storyboard o animatic manual/determinístico;
- preparación del route proposal y estimate;
- dirección creativa, selección, curation y feedback;
- aprobaciones, QA técnico/humano y rights review;
- composición determinística, layout, edición, conform, mix/master y exports;
- almacenamiento base y soporte incluidos en governance fee;
- reuse/descarga de un asset ya generado sin nueva inferencia;
- errores de Efeonce, provider o plataforma tratados por refund policy.

Estos trabajos tienen costo real. Se financian mediante gobierno, capacidad, implementación/IP o derechos, no
forzándolos dentro de un crédito opaco.

## 4. Unidad semántica y catálogo

El catálogo no fija equivalencias públicas en V1. Cada `credit_rate_version` define una banda entera de créditos
por `capability_class` y `quality_tier`.

| Capability class | Unidad de estimación | Drivers internos permitidos | Resultado de settlement |
| --- | --- | --- | --- |
| `image_generate` | lote de candidatos con specs comunes | tier, resolución, cantidad, referencias | attempts elegibles del lote |
| `image_transform` | asset × transformación aprobada | resolución, referencia/control, strength | transformación realizada |
| `video_generate` | clip/segmento aprobado | segundos, resolución, audio, fidelity tier | segundos/attempt según policy |
| `video_transform` | clip × transformación | duración, resolución, control | attempt procesado |
| `audio_generate` | segmento/track | segundos, stem/voice/music tier | attempt auditable |
| `voice_generate` | segmento de voz | segundos, idioma, voice class | attempt auditable con consent gate |
| `specialist_inference` | operación definida por adapter | capability-specific | según contrato versionado |

No se crea una equivalencia distinta por provider salvo que cambie materialmente la capacidad prometida. El
router puede elegir rutas más baratas o caras dentro de la misma banda; ese spread es riesgo/margen Efeonce.
Esta estabilidad económica no autoriza opacidad: el estimate identifica la ruta propuesta con provider,
modelo, versión/readiness, limitaciones materiales y fallback; el run identifica la ruta efectivamente usada
por cada attempt. Si un fallback cambia el modelo, el historial conserva y muestra ambos.

## 5. Método para calibrar equivalencias

### 5.1 Costo servido por operación

```text
variable_cost_per_operation
  = provider_inference_cost
  + compute_and_queue_cost
  + variable_storage_egress
  + expected_retry_cost
  + variable_support_cost
  + payment/FX exposure when applicable
```

Dirección, curation y QA no se ocultan aquí: se modelan en capacity/governance. Sólo soporte estrictamente
incremental atribuible al consumo puede entrar en costo variable.

### 5.2 Bandas

Para cada capability/template:

1. observar al menos 30 runs o justificar muestra menor por costo/riesgo;
2. calcular costo p50, p75 y p95 por successful/approved outcome;
3. identificar retries atribuibles a provider, template, operador y cambio cliente;
4. elegir banda que mantenga forecast simple y proteja p95 sin sobrecargar la ruta eficiente;
5. verificar margen total del package, no sólo markup del crédito;
6. ejecutar shadow settlement y comparar comprensión del usuario;
7. versionar la equivalencia; nunca reescribir transacciones históricas.

### 5.3 Criterios de calidad de una banda

- 80%+ de runs estables queda dentro de ±20% del estimate;
- menos de 10% requiere override manual por clasificación;
- no incentiva fragmentar o agrupar artificiosamente una operación;
- no cambia por oscilaciones menores de vendor;
- sigue siendo comprensible sin convertir modelos o tokens en una tarifa, aunque la ruta real sea visible;
- mantiene margen total ≥45% bajo mix esperado y p95 acordado.

## 6. Lifecycle económico

```text
allocation
  → estimate
  → reservation
  → spend approval
  → execution/attempts
  → candidate/review
  → settlement | release | refund adjustment
```

| Estado/evento | Efecto económico |
| --- | --- |
| `allocation` | crea derecho de uso dentro de cuenta/período; no es consumo |
| `estimate` | informativo/versionado; no mueve balance |
| `reservation` | hold idempotente, scoped a run y con expiración |
| `approval` | autoriza sólo monto, route bounds y scope firmados |
| `execution` | registra attempts y costo real; aún no decide cargo final |
| `settlement` | convierte hold en consumo según policy |
| `release` | libera hold no utilizado |
| `refund_adjustment` | entrada compensatoria; nunca borra settlement |

Un command repetido con la misma idempotency key devuelve el mismo resultado. Un branch intencional usa una
nueva identidad y estimate.

## 7. Refund, retry y cambio de dirección

| Causa | Consume créditos | Tratamiento |
| --- | --- | --- |
| timeout, rate limit o error provider sin candidato útil | No | retry/release/refund absorbido por Studio |
| error de plataforma/adapter/template Efeonce | No | Efeonce corrige; ajuste auditable |
| output incumple spec objetiva pactada por defecto técnico | No o parcial según evidencia | retry/refund policy versionada |
| output válido pero no elegido entre candidatos incluidos | Sí | la exploración aprobada fue ejecutada |
| cliente cambia brief/dirección después de aprobar | Sí + nuevo estimate | nuevo run/branch/change order |
| input inválido o derechos no declarados por cliente | hasta pausa, según attempt irreversible | revisión humana y reestimate |
| moderación bloquea input que debía detectarse en preflight | No | defecto de preflight |
| moderación bloquea caso no detectable y provider cobró | política por template | reserva explícita; no improvisar |

Un `provider succeeded` no basta para settlement completo si el adapter no ingirió evidencia o el output es
técnicamente inutilizable. Tampoco se promete refund por mera preferencia cuando la operación cumplió brief y
spec; eso es un cambio creativo.

## 8. Pools, grants y ownership

Cada asignación declara:

- `workspace_id` y, cuando aplique, project/cost center;
- source: internal, engagement, promotional, corrective o purchased futuro;
- período, vigencia y política de rollover/expiración;
- scope de capabilities/templates;
- actor/budget approver;
- rate version y moneda contractual externa cuando exista;
- restrictions de transferencia.

### Reglas V1

- pool compartido por workspace, con sub-budgets opcionales por proyecto;
- grants promocionales separados para no contaminar revenue/margin;
- créditos correctivos nunca se presentan como consumo pagado;
- no transferencia entre tenants;
- no saldo negativo salvo política aprobada y límite explícito;
- rollover/expiración y top-ups quedan `TBD Finance/Legal`;
- créditos internos pueden asignarse manualmente para shadow ledger.

## 9. Experiencia y transparencia

La proyección gobernada compartida por UI, API, SDK y MCP autorizado muestra al usuario:

- saldo disponible, reservado y consumido;
- estimate como rango y drivers semánticos;
- provider, nombre comercial del modelo y versión/readiness de la ruta propuesta antes de aprobar gasto;
- provider/modelo/version realmente usados por attempt y cualquier fallback, visibles en el historial del run;
- limitaciones materiales de una ruta `preview`, `canary` o equivalente antes de que el usuario la apruebe;
- qué operación se cobrará y cuándo;
- historial de settlement/refund legible;
- alertas de budget y próximo reset/expiry sólo si están aprobados;
- responsable/aprobador y link al run.

No muestra por defecto:

- provider keys, raw prompts internos, endpoints privilegiados o secretos;
- costo contractual confidencial del vendor;
- margen Efeonce;
- logs privados o datos de otros workspaces;
- falsa conversión dólar/crédito no aprobada.

Managed Squad puede presentar los créditos como envelope operativo y no como fricción por click. Client-operated
necesita mayor visibilidad y budget controls porque el cliente controla el ritmo de ejecución.

## 10. Reconocimiento, facturación e impuestos

Pendiente de decisión Finance/Legal antes de venta externa:

- si la asignación es allowance incluido, prepago, derecho de acceso o unidad de consumo;
- momento de reconocimiento del ingreso;
- tratamiento de saldos no usados, expiración y refunds;
- IVA/impuestos por país y moneda;
- factura de top-up y crédito correctivo;
- liability/deferred revenue si corresponde;
- términos de cancelación y offboarding.

Hasta resolverlo, credits son ledger operativo/shadow o allowance incorporado en un SOW aprobado; no son un
instrumento monetario ni gift card.

## 11. Controles y observabilidad

### Controles preventivos

- budget cap por workspace/project/run;
- estimate + approval token acotado;
- route/template allowlist y quality tier;
- rate/version pinning por reservation;
- idempotency y concurrency guard;
- rights/moderation preflight;
- daily/global kill switch.

### Métricas

- estimated vs settled credits;
- credits y costo real por successful/approved run;
- hold expiry/release rate;
- refund/retry rate por causa/provider/template;
- gross margin y contribution por capability;
- support minutes por 100 credits y por successful run;
- concentración de provider y route fallback rate;
- anomaly: consumo 2× baseline o saldo agotado inesperadamente.

Alertas no sólo por saldo: también por desviación estimate/actual, retry storm, settlement duplicado, route
degradada y margen bajo piso.

## 12. Versionado y change control

`credit_rate_version` es inmutable para reservations y settlements existentes. Una nueva versión declara:

- effective date;
- capabilities/bandas afectadas;
- evidencia p50/p95 y muestra;
- impacto esperado por segmento;
- compatibilidad con contratos vigentes;
- aprobaciones Finance/Product/Operations;
- rollback/revisit condition.

Cambios menores de provider quedan absorbidos mientras no rompan margen/forecast. Se reabre la banda si:

- costo efectivo varía >25% dos ventanas consecutivas;
- estimate accuracy cae bajo 80%;
- refund/retry supera 15% sin explicación temporal;
- margen total cae bajo 45%;
- soporte variable supera la contribución prevista;
- la unidad induce comportamiento artificial o confusión repetida.

## 13. Plan de validación V1

1. Implementar shadow ledger en el runtime de Globe, no en Greenhouse.
2. Definir 6–10 capability classes iniciales y 3 quality tiers como máximo.
3. Etiquetar 30–50 runs con costo, attempts, causa de retry, tiempo humano y outcome.
4. Simular bandas y revisar forecast/margen por template y modo.
5. Hacer readback con operadores: ¿pueden explicar por qué se cobró?
6. Hacer test con clientes: ¿pueden estimar uso aunque cambie el provider y entienden qué modelo fue propuesto,
   cuál se ejecutó y por qué cambió si hubo fallback?
7. Aprobar refund taxonomy con Finance/Legal/Operations.
8. Ejecutar Sample Sprints con pool visible pero sin top-up self-serve.
9. Sólo después proponer packages/precio y commercial approval.

## 14. Lo que V1 prohíbe

- publicar precio por crédito o tabla proveedor→crédito;
- revender un token vendor como Studio Credit;
- ocultar al usuario el provider/modelo/version realmente usado o un fallback ejecutado;
- cobrar por assets finales sin mapear operaciones;
- cobrar retries técnicos o errores Efeonce;
- esconder derechos, talento, stock o música dentro de credits;
- permitir saldo cross-tenant o transferible;
- permitir al agente ampliar presupuesto, aprobar delivery o publicar;
- usar breakage como supuesto principal de rentabilidad;
- recalcular retroactivamente settlements al cambiar rate/version;
- declarar “ilimitado” sin capacity/fair-use y stop-loss aprobados.
