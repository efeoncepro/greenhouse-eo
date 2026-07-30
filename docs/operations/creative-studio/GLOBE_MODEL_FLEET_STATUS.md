# Globe Model Fleet — Status Ledger

> **SSOT humano de "qué modelos/proveedores están integrados en Globe, en qué carril, y validados
> cuándo".** Ledger vivo (como `FEATURE_FLAG_STATE_LEDGER.md`). **Léelo ANTES de asumir que un modelo
> o proveedor "no está" o "hay que integrarlo"** — evita re-descubrir por forense lo que ya está hecho.
> La verdad live de la promoción a producción es `globe.production-routing` + `globe.model-readiness.*`
> (runtime); este doc es el mapa legible que las reconcilia.
>
> **Creado:** 2026-07-24 (TASK-1553). **Última actualización:** 2026-07-24.
> **Contrato técnico:** `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`,
> `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`, `EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md` (ADR-013).

## Los DOS carriles (la distinción que evita toda la confusión)

Un modelo puede estar integrado en **un carril, el otro, o ambos**. No son lo mismo, y "probado en el Lab"
**no** implica "entregable a cliente en producción".

| Carril | Qué es | Dónde vive | Qué habilita |
|---|---|---|---|
| **Model Lab** (internal-eval) | Experimentación interna; adapters por proveedor detrás del `CompositeProviderAdapter` | `apps/creative-runner/src/*-adapter.ts` + `apps/studio-web/src/app.ts` (composite) | Generar/canariar cualquier proveedor conectado, internal-only |
| **Producción gobernada** | Path auditado que entrega a cliente: driver gobernado + endpoint allowlist + binding promovido + readiness `promoted` + atestación comercial | `apps/creative-runner/src/production-result-drivers.ts` + `governed-production-composition.ts` + saga ADR-009/010 | Que una ruta sea **elegible en el Producer y entregable a cliente** |

**Regla:** para que un modelo llegue al **Producer** (producto), necesita el carril gobernado completo, no
solo el Lab. La foundation de selección multi-modelo es ADR-013 (resolución por-ruta); la puerta de UI es
`TASK-1552`.

## Fleet — estado por ruta/modelo

Backbone = `PRODUCER_ROUTE_CATALOG` (`packages/domain/src/producer-catalog.ts`, `v1.3.0`). El nombre público
del modelo es señal de calidad (ADR-003); el slug de wire vive solo en el adapter/binding.

Leyenda estado: ✅ live-validado · 🟢 canary real verde · 🔒 gated (dependencia externa) · ⏳ pendiente.

| Ruta (routeId) | Modelo público | Proveedor (slug wire) | Capacidad | Lab | Prod. gobernada | Gate / nota |
|---|---|---|---|---|---|---|
| `ref/still/rrss-v1` | Seedream · 5 Pro | Fal (`bytedance/seedream/v5/pro/text-to-image`) | image-generate | ✅ 07-19 | ✅ driver Fal | default vivo de imagen |
| `ref/still/reference-v1` | Seedream · 5 Pro Edit | Fal (`…/v5/pro/edit`) | image-edit | ✅ 07-19 | ✅ driver Fal | — |
| `ref/still/nanobanana-pro-v1` | Nano Banana · Pro | Vertex (`gemini-3-pro-image`) | image-generate | ✅ 07-24 | ✅ readiness promovido + binding activo 07-30 | región `global`; driver gobernado `9b62b19`; revisión live `896a0620` |
| `ref/still/openai-v2` | GPT Image · 2 | OpenAI (`gpt-image-2`) | image-generate | ✅ 07-24 | 🔒 sin lane de producción | atestación comercial firmada 07-30; falta verifier OpenAI (`governed-production-composition.ts`) |
| `ref/still/openai-v1-5` | GPT Image · 1.5 | OpenAI (`gpt-image-1.5`) | image-generate | ✅ 07-24 | 🔒 sin lane de producción | atestación comercial firmada 07-30; falta lane gobernado y canary exacto |
| `ref/motion/loop-v1` | Seedance · 2.0 | Fal | video-generate | ✅ 07-19 | ✅ driver Fal | — |
| `ref/motion/reference-v1` | Gemini Omni Flash · Preview | Vertex (Omni, Interactions API) | video-generate | ✅ 07-20 (40cr) | ⏳ **solo Lab** — Omni NO está en el path gobernado | ver "Delta" abajo |
| `ref/video/frames-v1` | Veo · 2.0 | Vertex (`veo-…:predictLongRunning`) | video-frames | ✅ 07-20 (MP4 real, 32cr) | ✅ driver Veo gobernado (`vertex-video`, `us-central1`) desde 07-22 | — |
| `ref/video/motion-v1` | Seedance · 2.0 | Fal | video-motion-control | ✅ 07-19 | ✅ driver Fal | — |
| `ref/audio/foley-v1` | Seed Audio | Fal | audio-generate | ✅ 07-19 | ✅ driver Fal | atestación comercial firmada |
| `ref/voice/tts-v1` | ElevenLabs · Multilingual v2 | ElevenLabs | speech-synthesize | ✅ 07-19 | ✅ driver Fal | — |
| `ref/voice/change-v1` | ElevenLabs · Voice Changer | ElevenLabs | audio-change-voice | ✅ 07-20 | ✅ | — |
| `ref/voice/translate-v1` | ElevenLabs · Dubbing | ElevenLabs | audio-translate | ✅ 07-20 | ✅ | — |
| `ref/still/nanobanana-2-v1` | Nano Banana · 2 | Vertex (`gemini-3.1-flash-image`) | image-generate | 🔒 404 | 🔒 | **allowlist de Google pendiente**; ruta creada 07-25 (TASK-1555) para que la flota sea visible |
| `ref/still/vector-v1` | Recraft · v4.1 | Fal (`fal-ai/recraft/v4.1/text-to-vector`) | image-vectorize | ✅ 07-19 | ⏳ sin lane | ruta creada 07-25; vectoriza desde TEXTO (`requiresInput: false`) |
| `ref/still/upscale-v1` | Topaz · Upscale | Fal (`fal-ai/topaz/upscale/image`) | image-upscale | ✅ 07-19 | ⏳ sin lane | ruta creada 07-25; exige 1 imagen de origen |
| `ref/video/upscale-v1` | Topaz · Upscale | Fal (`fal-ai/topaz/upscale/video`) | video-upscale | ✅ 07-19 | ⏳ sin lane | ruta creada 07-25; exige 1 video de origen |

> **Delta 2026-07-25 (TASK-1555):** Recraft y Topaz **ya tienen ruta pública** (arriba) — antes estaban
> integrados y verificados en vivo pero eran **invisibles en el Producer**, porque sin ruta ninguna
> superficie puede nombrarlos. Queda **Hyper3D Rodin** (`model-3d-generate`) sin ruta: `ProducerRouteModality`
> es `image | video | audio`, así que **3D no existe como modalidad** — exponerlo pide cambio de contrato,
> una cuarta pestaña y visor GLB, y es task propia. `video-extend` también sigue sin ruta.
> Fuente: `docs/documentation/creative-studio/efeonce-globe-model-lab-providers.md`.

## Línea de tiempo de integración (para no re-descubrir)

| Fecha | Task | Qué se integró/validó para Globe |
|---|---|---|
| 2026-07-19 | TASK-1486 | **Primer adapter Vertex real** (keyless ADC/WIF, SA `aiplatform.user`); imagen validada en vivo (Nano Banana `gemini-2.5-flash-image`, sha real, 10cr) |
| 2026-07-19 | TASK-1487/1488 | Fal + Composite router; **10 capacidades verificadas en vivo** (Seedream 5, Recraft, Topaz, Seedance 2.0, ElevenLabs, Hyper3D…) |
| 2026-07-20 | TASK-1490 | **Vertex video en el Lab:** Veo (MP4 real, 32cr) + Gemini Omni Flash (40cr) |
| 2026-07-22 | (`284eba6`) | **Nace el path de producción gobernado** — driver Veo (`vertex-video`) + Fal; región `us-central1` |
| 2026-07-24 | TASK-1535 | Upgrade frontier: `gemini-2.5-flash-image` → **`gemini-3-pro-image`** (Nano Banana Pro); probe directo 200 / 1.23 MB @ `global`; adapter OpenAI GPT Image (Lab) |
| 2026-07-24 | TASK-1553 | **Catálogo multi-modelo `v1.3.0` + resolución por-ruta (ADR-013)**; **driver Vertex-imagen gobernado** (`9b62b19`) + endpoint `global`; **canary real verde** |

## Evidencia de canary — Nano Banana Pro (gobernado, TASK-1553, 2026-07-24)

- Modelo `gemini-3-pro-image`, ruta `ref/still/nanobanana-pro-v1`, región `global`.
- Experimento `a258dda8-ea6e-4a34-94f0-4cd9ca301d17`; gasto **10 créditos**.
- Output `image/png`, **1,111,472 bytes**, SHA-256 `9e9edaf59cb927610d043e3af3cac9b90c321ed48e55eb34ec0300c72dc429cf`.
- API + worker restaurados a `GLOBE_LAB_PROVIDER=composite`; break-glass IAM revocado (readback limpio).
- Driver gobernado desplegado en `9b62b19`. **Falta:** ADR-009 (promover binding/readiness + readback de identidad `binding.modelId == estimate.model == readiness.route.modelId`) para que sea entregable a cliente.

## El reader es el SoT *live* de disponibilidad (TASK-1554, cerrada 2026-07-25)

**Este documento es el SoT humano; `globe.producer.fleet.list` es el SoT *live*.** La distinción
importa cuando divergen: si el ledger dice una cosa y el reader otra, **manda el reader** — él deriva
de readiness × binding en el momento de preguntar, y este archivo describe el día en que se escribió.

El reader devuelve, por capacidad y **por workspace**: la ruta, el `model` público (nombre + versión),
su `availability` (`available` · `gated` · `blocked`), el `gateReason` cuando está bloqueada, y el
`recommendedDefault` — que se expone con su disponibilidad real en vez de preseleccionarse cuando no
se puede ejecutar.

Tres propiedades que sostienen todo lo demás, y cada una tiene test:

- **Nada hardcodeado.** `availability` se deriva de readiness `promoted` × binding `enabled`. Promover
  una ruta la vuelve elegible en todos los consumers **sin tocar código de consumo**.
- **Alcance por workspace.** Promovida en A no es `available` en B. El ceiling por `kind` se hereda de
  la promoción; el reader no lo re-deriva.
- **Sin fuga de slug.** La proyección extiende la view pública; el identificador de proveedor nunca
  entra al payload (ADR-003). El nombre público del modelo sí.

Contrato en `packages/contracts/src/producer-fleet.ts`; proyección y tests en
`packages/domain/src/producer-fleet.{ts,test.ts}`.
Funcional: [flota de modelos](../../documentation/creative-studio/efeonce-globe-producer-flota-modelos.md) ·
Manual: [operar la flota](../../manual-de-uso/creative-studio/operar-flota-modelos-producer-globe.md).

## Consumers vivos de la flota

- **Producer Model Selector (TASK-1555, `efeonce-globe` `0258534`)** — la región **"Modelo"** del
  composer renderiza un **desplegable con el isotipo real de cada modelo** desde
  `globe.producer.fleet.list`. Lista **toda la flota de la modalidad activa** con su `availability`
  real (`available` elegible · `gated` "Próximamente" · `blocked` con la razón del gate externo) y,
  para los modelos que necesitan otro modo del composer (Veo → cuadros, Gemini Omni → referencias),
  lo declara y **cambia el modo al elegirlos** en vez de esconderlos detrás de un chip.
  Con el catálogo en **v1.4.0** cubre **12 de 14 capacidades**; faltan `model-3d-generate` y
  `video-extend`, ambas sin ruta.
  **Promover una ruta la vuelve elegible en el Producer sin tocar la UI.** Consecuencia directa: como
  hoy ninguna ruta de imagen está promovida, el Producer **no ofrece modelo de imagen elegible** hasta
  que ADR-009 avance — el blocker dejó de ser invisible. `ref/audio/foley-v1` (promovida en el canary
  ADR-010) sí queda elegible. Cero slug/costo/margen en el DOM.

## Delta / pendientes conocidos

- **Gemini Omni en producción gobernada:** hoy Omni está **solo en el Lab**; el path gobernado tiene Fal + Veo + (ahora) Vertex-imagen, **no Omni**. Si `ref/motion/reference-v1` se quiere entregar a cliente, falta su driver gobernado (Interactions API) — análogo a lo que se hizo para Vertex-imagen.
- **OpenAI (GPT Image 2/1.5):** atestaciones comerciales firmadas en Producer el 07-30; canarean en el Lab, pero siguen **sin lane de producción** hasta implementar el verifier oficial y su callback firmado.
- **Nano Banana 2:** espera **allowlist de Google**.
- **Grant de créditos 409 → `ISSUE-124`:** el comando canónico de administración de créditos devuelve `409 conflict` en un grant adicional pese a pool activo + identidad válida + idempotencia nueva. No bloquea lo hecho (el canary corrió con el budget subido 100→110 + grant de 10). Documentado en `docs/issues/open/ISSUE-124-globe-credit-grant-canonical-409-root-cause-hidden.md` (Codex, 2026-07-24). No se hizo bypass ni mutación directa.
- **Promoción ADR-009:** Nano Banana Pro ya tiene revisión humana firmada en Producer, readiness `promoted` y binding de producción `enabled`, con readback live en la revisión `896a0620`. Las demás rutas siguen sujetas a sus gates propios; no se fuerza ninguna sin evaluación exacta, derechos y driver gobernado.

## Roadmap → "todos los modelos probados en el Producer"

Meta: que **cada modelo ya validado sea elegible y entregable desde el Producer**, no solo desde el Lab.
Para llevar una ruta del Lab al Producer hacen falta 4 cosas (las 2 primeras son las que faltan hoy):

1. **Driver gobernado + endpoint allowlist** para su proveedor/capacidad (código, `production-result-drivers.ts` +
   `governed-production-composition.ts`). Estado: Fal ✅, Veo ✅, Vertex-imagen ✅ (`9b62b19`), **Omni ❌**, **OpenAI ❌**.
2. **Promoción por ruta (ADR-009)** — binding `enabled` + readiness `promoted` + atestación (ADR-010) + readback de
   identidad. Estado: pendiente para casi todas; Nano Banana Pro con canary verde, promoción ⏳.
3. **Selector en la UI del Producer** — `TASK-1552` (consume el catálogo v1.3.0 vía ADR-013 como selector de modelo).
4. **Gates externos despejados** donde aplique (OpenAI verifier, allowlist Google NB2).

**Cola de trabajo concreta (por modelo):**

| Modelo | Qué falta para el Producer | Dueño del paso |
|---|---|---|
| Seedream / Seedance / ElevenLabs / Seed Audio (Fal) | solo **promoción ADR-009** por ruta (driver ✅) | Codex/operador (gobernado) |
| Veo (video) | solo **promoción ADR-009** (driver ✅) | Codex/operador |
| **Nano Banana Pro** | **completado 07-30** (canary ✅, driver ✅, atestación ✅, readiness ✅, binding ✅) | — |
| **Gemini Omni** | **construir driver gobernado** (Interactions API) → allowlist → promoción | código (Globe) + Codex |
| GPT Image 2/1.5 | **verifier de producción OpenAI** (código) → promoción | código (Globe) + Codex |
| Nano Banana 2 | **allowlist de Google** (externo) → luego ruta + driver + promoción | Google + luego equipo |
| **Exponer la flota data-driven** | **`TASK-1554` — DESPLEGADO + live-verificado** (`c3b6bf4`, Codex): reader `globe.producer.fleet.list` vivo (availability `available\|gated\|blocked` + `recommendedDefaults`). ✅ dependencia de datos lista | backend-data |
| **Selector visible (todos)** | **`TASK-1555` — in-progress:** dirección visual ELEGIDA ("Galería de láminas") + wireframe + motion robustos; **Slice 1a (data layer del client) done + typecheck verde** (local `d07a1cd`). Falta: render galería (HTML/CSS/controller) + GVC premium + scorecard 14 dims. `TASK-1552` = jerarquía del composer (distinto) | UI (ui-ux) |

**Secuencia recomendada:** (a) promover las rutas que ya tienen driver (Fal + Veo + Nano Banana Pro) — es el
camino más corto a "modelos reales elegibles"; (b) construir el driver gobernado de Omni; (c) `TASK-1552`
para que el selector los exponga; (d) OpenAI verifier + allowlist Google en paralelo. El **409 del grant de
créditos** (ver Delta) conviene resolverlo antes de la tanda de promociones/canarios para tener headroom de budget.

## Cómo mantener este ledger (obligatorio)

- **Al integrar un modelo/proveedor nuevo** (Lab o gobernado): agrega su fila acá en el mismo PR, con
  carril, fecha, evidencia y ruta. Un modelo integrado sin fila acá = deuda de conocimiento.
- **Al promover una ruta** (ADR-009): actualiza su celda "Prod. gobernada" a ✅ con la evidencia.
- **Al validar en vivo:** anota fecha + evidencia (sha/bytes/experiment id), no "probado" a secas.
- La verdad de promoción live sigue siendo `globe.production-routing`/`globe.model-readiness`; este doc es
  el mapa humano, se reconcilia contra runtime, no lo reemplaza.
