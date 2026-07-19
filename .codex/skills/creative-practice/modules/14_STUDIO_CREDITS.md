# 14 — Studio Credits: consumo generativo gobernado, no precio por pieza

> **Canon económico:**
> `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.
> **Estado:** `Approved for validation`; shadow ledger primero. Este módulo traduce el canon a discovery,
> propuesta, SOW y pricing. No habilita precio público, top-ups, checkout ni acceso externo.

## Mapa del módulo

1. decisión y naming;
2. cinco líneas y tres ejes;
3. charge/no-charge;
4. calibración y shadow ledger;
5. lifecycle/refunds;
6. ejemplos por pieza;
7. propuesta/SOW, commercial approval y reglas duras.

## 1. La decisión

Un **Studio Credit** representa una **operación generativa gobernada y auditable** ejecutada por Creative
Studio. No representa una pieza, hora, token, dólar, llamada a un provider, licencia, FTE ni promesa de
resultado creativo.

La pieza final es una forma útil de explicar un escenario, pero nunca la unidad tarifaria. Un carrusel de seis
láminas puede consumir cero créditos si reutiliza assets aprobados, o decenas si necesita escenas nuevas. La
unidad económica sigue siendo la operación generativa.

### Naming V1

- nombre conceptual y contractual provisional: **Studio Credits**;
- nombre técnico estable recomendado: `studio_credit`;
- **Globe Credits** no se usa en paralelo ni como moneda pública;
- sólo se evalúa una etiqueta visible `Globe Credits` si Efeonce Globe se aprueba como nombre público.

## 2. Dónde vive dentro del modelo de negocio

Creative Studio separa cinco líneas de ingreso:

| Línea | Qué remunera | Qué no debe esconder |
|---|---|---|
| **Gobierno/plataforma** | workspace, policy, ledger, memoria, seguridad, observabilidad y soporte base | capacidad creativa o consumo variable |
| **Capacidad humana** | dirección, producción, curation, QA, account y delivery management | provider spend y derechos |
| **Studio Credits** | inferencia/compute generativo variable gobernado | horas, piezas, finishing determinístico o licencias |
| **Implementación/IP** | onboarding, Brand Profile, templates, workflows, integraciones y training | consumo futuro o buyout implícito del método |
| **Derechos/licencias/pass-through** | stock, talento, voz/likeness, música, territorio, exclusividad y vendor fees | creación, gobierno o capacidad base |

> **Los credits financian inferencia generativa. El fee financia personas, gobierno y accountability.**

Está prohibida la doble imputación opaca: si un costo humano ya está en capacidad/gobierno, no se vuelve a
meter dentro de un crédito. Sólo soporte estrictamente incremental y atribuible al consumo puede entrar en el
costo variable que calibra una banda.

## 3. Relación con los tres ejes

Los credits no reemplazan la taxonomía comercial:

1. **modelo de delivery:** Managed Squad · Staff Augmentation · Studio Access · híbrido por lanes;
2. **forma de engagement:** On-Going · On-Demand · Sample Sprint;
3. **modo operativo por run/lane:** `efeonce-managed` · `co-operated` · `client-operated`.

La misma operación semántica consume los mismos créditos en cualquier modo. Lo que cambia entre modos es la
capacidad humana, el soporte, el control y la accountability, cobrados por otras líneas.

| Configuración | Cómo se presentan los credits |
|---|---|
| **Managed Squad** | envelope de producción detrás de la promesa; no fricción por click. Exceso: ampliar pool, cambiar ruta, reducir exploración o change order |
| **Co-operated / hybrid** | pool visible + lanes Efeonce separadas; cada tramo declara operator, approver, budget y failure owner |
| **Studio Access** | acceso/gobierno + pool visible + onboarding; soporte/dirección/QA managed son add-ons |
| **Staff Augmentation** | entitlement y credits separados del precio del perfil; no crean un SLA de outcome |

## 4. Qué devenga y qué no

### Devenga credits

- generación de candidatos de imagen;
- variación o transformación generativa de un anchor;
- generative fill/outpaint o upscale con inferencia;
- text/image-to-video y transformaciones generativas de video;
- voz, música, foley/SFX o audio generativo;
- lip-sync y specialist inference con contrato versionado.

### No devenga credits

- discovery, estrategia, ideación, briefing o workshop;
- moodboard, tratamiento, storyboard o animatic manual/determinístico;
- route proposal, estimate o preparación de inputs;
- dirección creativa, selección, curation, feedback o aprobación;
- QA técnico/humano y rights review;
- layout, composición, edición, conform, color, mix/master, compresión o export determinístico;
- reuse o descarga de un asset sin nueva inferencia;
- almacenamiento/soporte base cubierto por gobierno;
- errores Efeonce/provider/plataforma cubiertos por refund policy.

Que algo no consuma credits no significa que sea gratis: se financia mediante gobierno, capacidad,
implementación/IP o derechos.

## 5. Cómo se cuantifica

### 5.1 Costo variable esperado

```text
variable_cost_per_operation
  = provider_inference_cost
  + compute_and_queue_cost
  + variable_storage_egress
  + expected_retry_cost
  + strictly_incremental_support_cost
  + payment_and_fx_exposure_when_applicable
```

La dirección, curation y QA quedan fuera de esta fórmula. Para cada capability/template se observan costo y
outcome p50, p75 y p95. La banda debe proteger volatilidad sin trasladar al cliente cada cambio de provider.

### 5.2 Bandas simples, no falsa precisión

Las equivalencias internas se redondean a bandas enteras fáciles de explicar —por ejemplo
`1 · 2 · 4 · 6 · 8 · 12 · 20 · 30 · 50`—, pero ninguna banda es comercial hasta pasar validación y
aprobación. Nunca se publica `7,43 credits` ni una tabla provider→credit.

La banda es válida cuando:

- 80%+ de runs estables queda dentro de ±20% del estimate;
- menos de 10% requiere override manual;
- no incentiva fragmentar/agrupar artificialmente operaciones;
- resiste oscilaciones menores de vendor;
- se entiende sin conocer modelos o tokens;
- el package completo sostiene margen bruto ≥45%.

### 5.3 Shadow calibration

1. Definir 6–10 capability classes y máximo tres quality tiers.
2. Etiquetar 30–50 runs de imagen/video/audio con attempts, costo, tiempo humano, retry cause y outcome.
3. Calcular p50/p75/p95 por successful/approved outcome.
4. Simular estimate, reservation y settlement sin facturar.
5. Comparar estimate vs actual por template, modo y account.
6. Hacer readback con operadores y test de comprensión con clientes.
7. Versionar la rate; nunca reescribir settlements históricos.

## 6. Lifecycle económico

```text
allocation
  → estimate
  → reservation
  → spend approval
  → execution / attempts
  → candidate / review
  → settlement | release | refund_adjustment
```

| Evento | Efecto |
|---|---|
| `allocation` | derecho de uso; todavía no es consumo |
| `estimate` | rango/version/driver informativo; no mueve saldo |
| `reservation` | hold idempotente y acotado al run |
| `approval` | autoriza monto, route bounds y scope; no autoriza publicar |
| `execution` | registra attempts/costo/evidencia |
| `settlement` | convierte el hold elegible en consumo |
| `release` | devuelve reserva no usada |
| `refund_adjustment` | compensación append-only; nunca borra historia |

Ejemplo de ledger:

```text
saldo inicial     200
reserva            52
settlement         46
release             6
saldo final       154
```

## 7. Refund, retry y cambios

| Causa | ¿Consume? | Tratamiento |
|---|---:|---|
| timeout/rate limit/error provider sin output útil | No | retry, release o refund absorbido por Studio |
| defecto de adapter/template/plataforma Efeonce | No | corregir + ajuste auditable |
| output incumple spec objetiva por defecto técnico | No o parcial | según policy/evidencia y failure owner |
| candidato válido no elegido dentro de exploración aprobada | Sí | la operación aprobada ocurrió |
| cliente cambia brief/dirección tras aprobar | Sí + nuevo estimate | nuevo branch/run o change order |
| input/derechos incorrectos del cliente | hasta la pausa, según costo irreversible | revisión y reestimate |
| error Efeonce sobre brief aprobado | No para el cliente | Efeonce absorbe |

`Provider succeeded` no basta para cobrar si no existe evidencia ingerida o el output es técnicamente
inutilizable. Preferencia creativa no equivale a defecto técnico.

## 8. Ejemplos por pieza — sólo para explicar escenarios

> **Bandas ilustrativas de shadow pricing, no rate card aprobada.** No deben copiarse a una propuesta como
> compromiso ni utilizarse para derivar `precio por pieza`.

### Catálogo V0 ilustrativo

| Operación | Credits ilustrativos |
|---|---:|
| batch estándar de exploración de imagen | 2–4 |
| batch premium con referencias | 6–10 |
| anchor/hero image de alta fidelidad | 8–16 |
| variación controlada desde anchor | 2–4 |
| fill/outpaint significativo | 2–4 |
| upscale generativo premium | 1–3 |
| clip simple de video, 5 s | 8–12 |
| clip controlado de video, 5 s | 12–20 |
| personaje/set de alta fidelidad, 5 s | 18–30 |
| audio/foley para clip corto | 2–6 |
| voz generada, 30 s | 3–8 |
| música generativa, 30 s | 6–12 |
| lip-sync, 10 s | 4–8 |

### Escenarios explicativos

| Pieza observada | Operaciones generativas | Credits ilustrativos | Trabajo sin credits |
|---|---|---:|---|
| Post desde KV aprobado | ninguna | **0** | adaptación, copy, logo, export, QA |
| Post con imagen nueva | exploración 4 + variación 3 + upscale 2 | **9** | selección, layout, export |
| Carrusel 6 slides desde un anchor | anchor 10 + dos extensiones 6 | **16** | seis layouts y QA |
| Carrusel 6 escenas distintas | exploración 12 + escenas 24 + correcciones 8 | **44** | layout/export |
| Key Visual de campaña | territorios 12 + anchor 12 + extensiones 9 + finish generativo 3 | **36** | dirección, curation, composición |
| Reel 15 s desde imagen aprobada | tres clips 45 + audio 4 | **49** | edición/end card; retry técnico = 0 |
| Reel 15 s con voz/lip-sync | video 45 + voz 5 + lip-sync 7 + SFX 4 | **61** | edición/mastering; derechos aparte |
| Spot 30 s / seis tomas | frames 16 + clips 90 + continuidad 25 + voz 6 + audio 10 | **147** | edición/color/mastering |
| Tres cutdowns de master aprobado | ninguna | **0** | edición/reencuadre; generative reframe sería 4–8 |
| Locución 30 s / dos variantes | voz 6 | **6** | selección, limpieza, mix/master |

Dos piezas con el mismo formato pueden consumir cantidades muy distintas. Por eso las piezas sólo sirven para
explicar la composición, nunca para publicar una tarifa unitaria.

## 9. Lo que debe quedar en propuesta y SOW

- combinación explícita de los tres ejes y owner por lane/run;
- pool/envelope y capability scope, sin precio unitario por pieza;
- estimate/reservation/approval/settlement y budget approver;
- qué trabajo no consume credits y qué línea lo financia;
- retry/refund taxonomy y failure owner;
- cambio de dirección como nuevo estimate/change order;
- rights, stock, talento, voz, música, territorio y buyout por separado;
- rate version, período, restricciones y política de rollover/expiry sólo si están aprobados;
- soporte, SLA y escalamiento acordados;
- aclaración: credits no son dinero, gift card ni token transferible.

## 10. Commercial approval gate

Antes de publicar precio, packages, pools, overage/top-up, rollover/expiración o habilitar cliente externo,
debe existir sign-off documentado de:

- **Finance:** fully loaded cost, p50/p95, margen, FX, tax, revenue recognition, refund reserve;
- **Legal/IP/Privacy:** términos, derechos, consentimiento, DPA, expiración/refunds y restricciones;
- **Product/Architecture/Security:** ledger append-only, entitlements, tenant isolation, approvals y auditoría;
- **Operations/Creative Practice:** catálogo, templates, soporte, QA, escalation y ownership;
- **Leadership:** package, posicionamiento, stop-loss y lanzamiento.

Hasta entonces los credits son shadow ledger o allowance en un SOW piloto aprobado. No existe conversión
pública `1 credit = $X`, top-up self-serve ni promesa de “ilimitado”.

## 11. Reglas duras

1. Nunca vendas un credit como pieza, hora, token, moneda o costo de provider.
2. Nunca cobres inferencia determinística inexistente, reuse o export.
3. Nunca cobres dos veces un retry técnico o error Efeonce.
4. Nunca escondas trabajo humano ni derechos dentro del credit.
5. Nunca cambies equivalencias retroactivamente; pin de `credit_rate_version`.
6. Nunca permitas saldo cross-tenant, transferencia o aumento autónomo de budget.
7. Nunca derives precio público desde las bandas ilustrativas de este módulo.
8. Nunca uses `Studio Credits` y `Globe Credits` simultáneamente.
