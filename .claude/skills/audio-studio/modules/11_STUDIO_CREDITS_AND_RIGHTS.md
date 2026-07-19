# 11 · Studio Credits, derechos y accountability de audio

> **Cárgalo cuando** haya que estimar o explicar consumo generativo de VO, dubbing, música, SFX, foley,
> lip-sync o audio unificado dentro de Efeonce Creative Studio. No fija precios públicos; aplica el shadow
> ledger y la política canónica de credits.
>
> **Canon:** `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` y
> `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`. Una `credit_rate_version` aprobada prevalece sobre todo
> rango ilustrativo de este módulo.

## 1. Qué se mide

Studio Credits miden **operaciones generativas gobernadas**, no la pieza terminada, la hora, caracteres/tokens,
minutos facturados por un vendor ni derechos de uso.

| Capability | Unidad de estimate | Drivers |
|---|---|---|
| `voice_generate` | segmento de voz | segundos, idioma, voice class, variantes/attempts y consent gate |
| `audio_generate` | segmento/track | segundos, tipo voice/music/SFX, stems, tier y attempts |
| `specialist_inference` | operación versionada | dubbing, voice change/cloning, lip-sync, enhance generativo |

La misma operación consume la misma banda en `efeonce-managed`, `co-operated` y `client-operated`. Dirección,
edición, mix/master, soporte y accountability se financian por capacidad/gobierno, no cambiando credits.

## 2. Qué consume y qué queda en cero

**Consume:** TTS/VO generativa, dubbing, voice design/change/cloning autorizado, música o SFX generativos,
audio unificado, lip-sync y enhance que use inferencia variable; candidates válidos dentro de un batch aprobado.

**0 Studio Credits:** brief, guion, casting/dirección, grabación humana, selección, curation, review, rights
review, edición, cleanup determinístico, cortes, conform, mezcla, ducking, mastering, normalización de loudness,
stems/export/transcode y reutilización de un master sin inferencia nueva.

`0 credits` no equivale a trabajo gratuito. El DAW, ingeniería de mezcla, talento, dirección y soporte se
cobran en capacidad/proyecto; licencias y derechos van aparte.

## 3. Lifecycle

```text
allocation → estimate → reservation → spend approval → execution/attempts
  → candidate/review → settlement | release | refund adjustment
```

- Estimate declara duración, idiomas, voice/music/SFX tier, variantes/attempts, outputs y rate version.
- Reservation es un hold idempotente; sólo un humano autorizado aprueba scope y límite.
- Cada attempt registra provider/model, input autorizado, duración y evidencia, sin exponer secretos.
- Un `succeeded` técnico no aprueba performance, pronunciación, licencia ni delivery.
- Settlement cobra lo elegible; release libera remanente; refund es ajuste append-only.
- Nuevo idioma, texto, interpretación o dirección tras aprobación crea branch/estimate nuevo.

## 4. Fallas, variantes y cambios

| Situación | Créditos | Tratamiento |
|---|---:|---|
| error/rate limit sin output útil | 0 | retry/release/refund Studio |
| pronunciación objetivamente fuera de spec o archivo corrupto | 0 o parcial | policy + evidencia |
| variante válida no elegida dentro del casting aprobado | sí | exploración ejecutada |
| cliente cambia guion, idioma, voz, tempo o mood aprobado | sí + nuevo estimate | branch/change order |
| falta de consentimiento/licencia detectable en preflight | 0 | bloquear antes de ejecutar |
| material del cliente con derecho omitido y costo irreversible | según policy | pausar y revisión humana |

No prometas iteración ilimitada. Define candidatos/attempts incluidos y un rubric de performance antes de
generar. “Prefiero otra voz” después de candidatos conformes no es una falla técnica.

## 5. Ejemplos ilustrativos por pieza

Estos números explican la mecánica de sesión; **no son tarifa, SKU ni precio aprobado**.

### VO de 30 s

```text
2 variantes generativas de voz       ≈ 6 credits
selección + dirección                 = 0 credits
edición, limpieza, mix y master       = 0 credits
total ilustrativo                    ≈ 6 credits
```

Una corrección por archivo corrupto no vuelve a cobrar. Un guion o tono nuevo después de aprobar la dirección
sí requiere otro estimate. Voz custom/clonada exige consentimiento y contrato aunque haya credits disponibles.

### Música generativa de 30 s

```text
batch/track generativo aprobado      ≈ 6–12 credits
edición a 30/15/6 s                   = 0 credits
stems, mezcla y mastering             = 0 credits
licencia/sync/master/buyout            fuera de credits
```

### Reel de 15 s con voz y lip-sync

```text
VO generativa                        ≈ 5 credits
lip-sync                             ≈ 7 credits
foley/SFX generativos                ≈ 4 credits
edición/mix/master/export             = 0 credits
subtotal de audio ilustrativo        ≈ 16 credits
```

El video generativo se estima aparte en `motion-design-studio/modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md`.

### Spot de 30 s y cutdowns

```text
VO generativa                        ≈ 6 credits
música/SFX generativos               ≈ 10 credits
mix/master del spot                   = 0 credits
cutdowns 15/10/6 desde stems/master   = 0 credits
subtotal de audio ilustrativo        ≈ 16 credits
```

Un dubbing a otro idioma es una nueva operación generativa por segmento/idioma; adaptar loudness o exportar
otro formato desde audio aprobado es determinístico y no consume credits.

## 6. Rights nunca se pagan con credits

Separar y documentar:

- consentimiento de la persona cuya voz se graba, clona, transforma o preserva en dubbing;
- licencia del modelo y uso comercial permitido;
- derechos de composición y master, sincronización, territorio, plazo, medios y exclusividad;
- talento, session musicians, stock/library, sociedades de gestión y buyout;
- disclosure de voz/audio sintético cuando aplique.

El saldo no autoriza el uso. Sin rights authority o evidencia válida, el run se bloquea antes de reservation/
execution. Nunca presentes “música incluida en credits” si el contrato de derechos es otra línea económica.

## 7. Modo operativo y accountability

- `efeonce-managed`: Efeonce puede responder por delivery de audio sólo donde controla brief, producción y QA.
- `co-operated`: un owner por etapa (guion, voz, música, mezcla, derechos, delivery), nunca “ambos”.
- `client-operated`: Efeonce responde por acceso/policy/soporte pactado, no por el outcome creativo del cliente.

Managed Squad, Staff Augmentation y Studio Access son modelos comerciales; no se infieren del modo del run.
Staff Augmentation sigue client-directed y no hereda SLA de Managed Squad.

## 8. Checklist

- [ ] Segmentos, segundos, idiomas, tier, variantes y attempts definidos antes del estimate.
- [ ] Mix/master/export/cutdowns determinísticos marcados `0 credits` y financiados por capacidad.
- [ ] Reservation/approval/rate version presentes; agente no autoaprueba ni amplía presupuesto.
- [ ] Retry técnico y cambio creativo clasificados con evidencia.
- [ ] Consentimiento, licencia, sync/master, territorio, plazo y buyout separados.
- [ ] Cada candidate escuchado; `provider succeeded` no equivale a approved/delivered.
- [ ] Rangos rotulados ilustrativos; sin equivalencia dinero/crédito, top-up o pricing público.
