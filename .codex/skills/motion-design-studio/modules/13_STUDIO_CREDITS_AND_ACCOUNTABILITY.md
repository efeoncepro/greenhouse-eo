# 13 · Studio Credits y accountability audiovisual

> **Cárgalo cuando** haya que estimar, reservar, ejecutar, liquidar o explicar consumo de video/audio
> generativo dentro de Efeonce Creative Studio; cuando un cliente pregunte “cuántos créditos cuesta una
> pieza”; o cuando haya que clasificar un retry, un cambio creativo o un cutdown. Este módulo operacionaliza
> el canon; no fija precios ni bandas públicas.
>
> **Canon:** `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` +
> `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`. Si una cifra ilustrativa de este módulo difiere de una
> `credit_rate_version` aprobada por Finance/Product, prevalece esa versión. Estado V1: **shadow ledger**.

## 1. La unidad: operación generativa, no pieza ni hora

Un Studio Credit representa una **operación generativa gobernada y auditable**. Para audiovisual, el catálogo
estima por capability semántica, duración, quality/fidelity tier y attempts elegibles:

| Capability | Unidad semántica | Drivers de estimate/settlement |
|---|---|---|
| `video_generate` | clip/segmento aprobado | segundos, resolución, audio nativo, fidelity tier, controls y attempts incluidos |
| `video_transform` | clip × transformación aprobada | duración, resolución, reference/control y attempts |
| `audio_generate` | segmento/track | segundos, stems, voice/music/SFX tier y attempts |
| `voice_generate` | segmento de voz | segundos, idioma, voice class y consent gate |
| `specialist_inference` | operación versionada | lip-sync, generative reframe/upscale u otra capability explícita |

La misma operación consume la misma banda en `efeonce-managed`, `co-operated` y `client-operated`. Cambian la
capacidad humana, el soporte y el accountability — líneas comerciales separadas — no el peso del run.

**Nunca conviertas una tarifa vendor o `USD/segundo` directamente en créditos.** Esos costos alimentan la
calibración interna; el cliente compra una capability Efeonce provider-neutral. Tampoco anuncies “un reel
cuesta N” sin descomponer su plan de operaciones.

## 2. Qué consume y qué queda en cero créditos

**Consume Studio Credits:** generación text/image/reference-to-video; transformación generativa de clips;
reframe o upscale que vuelve a inferir contenido; VO/TTS, música, SFX o audio generativo; lip-sync; attempts
válidos incluidos en una exploración aprobada.

**Devenga 0 Studio Credits:** concepto, brief, tratamiento, storyboard, animatic, shot list, route proposal,
estimate, dirección, selección, curation, review, QA, rights review, edición, corte, retime, conform, captions,
composición/overlays, color grade determinístico, mezcla, mastering, codec/export y cutdowns desde masters ya
aprobados sin nueva inferencia.

`0 credits` no significa gratis. El trabajo determinístico y humano se financia por gobierno/plataforma,
capacidad del Managed Squad o proyecto, implementación/IP o derechos. HyperFrames, AE, Resolve y FFmpeg son
normalmente finish determinístico; sólo la capability generativa que invoquen por separado devenga créditos.

## 3. Lifecycle obligatorio

```text
allocation → estimate → reservation → spend approval → execution/attempts
  → candidate/review → settlement | release | refund adjustment
```

1. El shot plan identifica cada operación, duración, tier, controls, attempts incluidos y fallback.
2. El sistema emite un **rango** y fija `credit_rate_version`; estimate no mueve saldo.
3. La reservation crea un hold idempotente para el run; no es consumo.
4. Un budget approver humano autoriza monto, scope y route bounds.
5. Cada provider attempt queda ligado al run y al asset/evidencia.
6. `provider succeeded` produce sólo un candidato; review decide utilidad/aprobación.
7. Settlement convierte el hold elegible en consumo; release devuelve el remanente; refund es una entrada
   compensatoria append-only, nunca borrado de historia.

Un agente puede preparar y proponer. No puede ampliar presupuesto, aprobar su propio gasto/delivery ni crear
un branch adicional sin nueva autorización. Repetir el mismo command/idempotency key nunca duplica spend.

## 4. Retry técnico vs cambio creativo

| Causa | Créditos | Acción |
|---|---:|---|
| timeout/rate limit/error provider sin candidato útil | 0 | retry o release/refund absorbido por Studio |
| adapter/template/plataforma Efeonce defectuoso | 0 | corregir y registrar ajuste |
| output incumple una spec objetiva por defecto técnico | 0 o parcial | aplicar policy versionada y evidencia |
| output válido no elegido dentro de candidatos aprobados | sí | la exploración contratada ocurrió |
| cliente cambia brief/dirección tras aprobar | sí + nuevo estimate | nuevo branch/run/change order |
| input o derecho omitido por cliente | según attempt irreversible | pausar, revisar y reestimar |

Un “no me gusta” no es automáticamente técnico. Contrasta brief, animatic, fidelity contract y QA objetiva.
No uses retries gratuitos para esconder mala dirección upstream; tampoco cobres al cliente por una falla del
provider, del adapter o de Efeonce.

## 5. Ejemplos por pieza — ilustrativos, no tarifa

Los rangos siguientes sirven para explicar composición del consumo durante shadow ledger. **No son SKU,
cotización, equivalencia monetaria ni `credit_rate_version` aprobada.**

### Reel de 15 s desde dirección/anchor aprobado

```text
3 clips controlados de 5 s             ≈ 45 credits
1 retry técnico sin candidato útil      = 0
foley/SFX generativo corto              ≈ 4
edición + end card + grade + export      = 0
total ilustrativo                       ≈ 49 credits
```

Con VO generativa y lip-sync:

```text
video controlado 15 s                  ≈ 45
voz generativa                         ≈ 5
lip-sync                               ≈ 7
foley/SFX                              ≈ 4
edición/mix/master/export               = 0
total ilustrativo                       ≈ 61 credits
```

### Spot de 30 s, seis tomas

```text
story frames/exploración generativa    ≈ 16
6 clips de 5 s                         ≈ 90
continuidad/correcciones generativas   ≈ 25
VO generativa                          ≈ 6
música/SFX generativos                 ≈ 10
edición, color y mastering              = 0
total ilustrativo                     ≈ 147 credits
```

Como envelope de shadow pricing, una realización similar puede quedar aproximadamente en `120–220` según
fidelidad, consistencia, route y attempts aprobados. Nunca prometas ese rango sin estimate del shot plan.

### Tres cutdowns desde master aprobado

Un master de 30 s produce cortes de 15/10/6 s por edición/reencuadre determinístico: **0 credits**. Si un
formato obliga a reconstruir fuera de cuadro o usar generative reframe, registra sólo esas transformaciones
(`≈ 4–8` ilustrativos para dos operaciones), no tres “piezas” completas.

### Variantes que cambian el consumo

- reutilizar clip/anchor aprobado + nuevo copy/logo exacto en post: `0 credits`;
- cambiar timing, crop, safe zone o mezcla sobre el master: `0 credits`;
- pedir otra actuación/escena/continuidad generativa después de aprobar el branch anterior: nuevo estimate;
- VO humana, música licenciada o talento: no credits; capacidad/derechos/pass-through separados;
- VO/música/SFX generativos: credits por operación, pero licencia/consentimiento siguen separados.

## 6. Rights y accountability

Créditos nunca compran derechos. Stock, talento, voz/likeness, sync/master, territorio, plazo, exclusividad,
buyout, disclosure y licencia del modelo se documentan/cotizan aparte. Una operación de voz puede tener saldo
y aun así estar bloqueada por falta de consentimiento.

Antes de reservar, declara: operador de record, creative approver, budget approver, template authority,
rights authority y delivery owner. `efeonce-managed` puede comprometer delivery sólo sobre el scope que
Efeonce controla; `co-operated` exige un owner por etapa; `client-operated` compromete plataforma/policy/
soporte, no outcome creativo. Managed Squad es modelo comercial y no sinónimo del modo `efeonce-managed`.

## 7. Checklist operativo

- [ ] Shot plan descompuesto en operaciones, duración, tier, attempts y fallback; no precio por pieza.
- [ ] Trabajo determinístico/humano identificado como `0 credits` y financiado por la línea correcta.
- [ ] Estimate/rate version visibles; reservation y approval bounds definidos antes de ejecutar.
- [ ] Operador y aprobadores de creatividad, gasto, derechos y delivery explícitos.
- [ ] Cada attempt tiene causa, asset/evidencia y clasificación técnica/creativa.
- [ ] Settlement/release/refund es trazable y no altera historia.
- [ ] Licencias, voz, likeness, música, territorio y buyout separados de credits.
- [ ] Ejemplos se rotulan ilustrativos; no se publica precio, top-up ni conversión dinero/crédito.
