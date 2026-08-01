# Globe Model Fleet — Status Ledger

> **SSOT humano de "qué modelos/proveedores están integrados en Globe, en qué carril, y validados
> cuándo".** Ledger vivo (como `FEATURE_FLAG_STATE_LEDGER.md`). **Léelo ANTES de asumir que un modelo
> o proveedor "no está" o "hay que integrarlo"** — evita re-descubrir por forense lo que ya está hecho.
> La verdad live de disponibilidad para consumidores es `globe.producer.fleet.list`; la promoción se
> sustenta en `globe.production-routing` + `globe.model-readiness.*`. Este documento es el mapa
> legible que reconcilia ambas autoridades.
>
> **Creado:** 2026-07-24 (TASK-1553). **Última actualización:** 2026-08-01.
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
| `ref/still/nanobanana-pro-v1` | Nano Banana · Pro | Vertex (`gemini-3-pro-image`) | image-generate | ✅ 07-24 | ✅ driver + promoción gobernada 07-30 | región `global`; selector live `Disponible`; revisión `896a0620` |
| `ref/still/nanobanana-2-v1` | Nano Banana · 2 | Vertex (`gemini-3.1-flash-image`) | image-generate | ✅ 07-30 | ✅ driver + promoción + generación UI real 07-30 | run UI `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`; 10 créditos |
| `ref/still/openai-v2` | GPT Image · 2 | OpenAI (`gpt-image-2`) | image-generate | ✅ 07-24 | ✅ driver + promoción + canary real 07-30 | run UI `a81c8049-7772-4933-82f2-1e2e59e5121c`; 14 créditos |
| `ref/still/openai-v1-5` | GPT Image · 1.5 | OpenAI (`gpt-image-1.5`) | image-generate | ✅ 07-24 | ✅ driver + promoción + canary real gobernado 07-30 | run UI `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a`; 10 créditos |
| `ref/motion/loop-v1` | Seedance · 2.0 | Fal | video-generate | ✅ 07-19 | ✅ driver Fal | — |
| `ref/motion/reference-v1` | Gemini Omni Flash · Preview | Vertex (Omni, Interactions API) | video-generate | ✅ 07-20 (40cr) | ⏳ **solo Lab** — Omni NO está en el path gobernado | ver "Delta" abajo |
| `ref/video/frames-v1` | Veo · 2.0 | Vertex (`veo-…:predictLongRunning`) | video-frames | ✅ 07-20 (MP4 real, 32cr) | ✅ driver Veo gobernado (`vertex-video`, `us-central1`) desde 07-22 | — |
| `ref/video/motion-v1` | Seedance · 2.0 | Fal | video-motion-control | ✅ provider completion preservada 08-01 | ⏳ driver integrado; promoción cerrada | TASK-1614: fix de authority ordering mergeado; Asset Governance rollout/IAM pendiente |
| `ref/audio/foley-v1` | Seed Audio | Fal | audio-generate | ✅ 07-19 | ✅ driver Fal | atestación comercial firmada |
| `ref/voice/tts-v1` | ElevenLabs · Multilingual v2 | ElevenLabs | speech-synthesize | ✅ 07-19 | ✅ driver Fal | — |
| `ref/voice/change-v1` | ElevenLabs · Voice Changer | ElevenLabs | audio-change-voice | ✅ 07-20 | ✅ | — |
| `ref/voice/translate-v1` | ElevenLabs · Dubbing | ElevenLabs | audio-translate | ✅ 07-20 | ✅ | — |
| `ref/still/vector-v1` | Recraft · v4.1 | Fal (`fal-ai/recraft/v4.1/text-to-vector`) | image-vectorize | ✅ 07-19 | ✅ driver + promoción + generación UI real 07-30 | run UI `b5631c86-707a-41d9-8ecc-ef61caa8200c`; SVG retenido; 4 créditos |
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
| 2026-07-30 | TASK-1553 | **Nano Banana Pro promovido** con revisión humana, readiness y binding gobernados; selector live `Disponible` |
| 2026-07-30 | TASK-1553 | **GPT Image 2 + 1.5 promovidos** mediante el driver oficial OpenAI Images; generaciones reales desde Producer |
| 2026-07-30 | TASK-1553 | **Nano Banana 2 promovido** tras despejar el allowlist; generación UI real y recuperación idempotente del mismo run después del fix `1fb5728` |
| 2026-07-30 | TASK-1553 | **Recraft v4.1 promovido**; contrato SVG, evaluación/revisión/derechos, binding/readiness/circuito y generación real desde Producer; fix fail-closed `84d6a8e` |
| 2026-08-01 | TASK-1614 | Seedance R2V: policy `purpose=evaluation`, fuente private-ingested/gobernada y provider completion reales; PR `#74` corrige la carrera de proyección de rights con migración `0041`; promoción sigue cerrada hasta desplegar/reconciliar Asset Governance |

## Evidencia Seedance R2V — evaluación durable, promoción aún cerrada (2026-08-01)

- Identidad exacta: `ref/video/motion-v1 / fal / seedance-2.0-r2v / 2.0`. Policy
  `seedance-r2v-evaluation` v2, `purpose=evaluation`, `appliesTo=derived`.
- Fuente canónica private-ingested: `asset_6e9c95d3-7b94-473d-b91a-00f8b35d9eec`, `video/mp4`, 773.219 bytes,
  SHA-256 `69cbc966999963ed2959c9adedf409560097dce06700d4fe5c9719292a392509`, retención `working-30d` hasta
  `2026-08-30T23:27:57.776Z`. `30682664152` observó `clean / verified / active / eligibleForGeneration=true` antes
  de la escritura stale; el readback live posterior `30684654795` muestra
  `rights=rejected / lifecycle=rejected / eligibleForGeneration=false` hasta desplegar y reconciliar PR `#74`.
- Evaluación `eval_16272c31b11f75be3e0369870f89746b`, attempt
  `9361550f-6ce3-456d-b710-d5cd3ded6217`: Fal completó y la completion permanece preservada. No repetir provider
  spend; el bloqueo posterior pertenece al finalizer/governance.
- La causa raíz fue una carrera entre una proyección terminal stale y una revisión de rights más nueva. PR `#74`
  (`1a810df`) introdujo `rights_revision`, evidencia append-only y merge por dimensión; `pnpm check`, `pnpm build` y
  CI pasaron. Migración `0041` aplicada (`30684420198`); API y producer worker desplegados
  (`30684456492`/`30684472892`).
- El Job de Asset Governance aún no contiene ese fix. PR `#75` agregó lifecycle de deploy
  `managed_reconcile`; su primer uso falló con `cloudscheduler.jobs.pause` ausente. PR `#76` agregó en HCL el rol
  custom mínimo `pause` + `enable`, con CI y Terraform Check verdes, pero todavía no se provisiona. PR `#77`
  agregó preflight durable previo a mutación, fence posterior al build y recovery independiente con convergencia;
  `pnpm check`, CI `30685780585` y Terraform Check `30685780571` pasaron. No existe todavía report objetivo,
  atestación, readiness, binding/promoción, disponibilidad en el reader ni canary UI de Seedance R2V.

## Evidencia de Nano Banana Pro — canary y promoción gobernada

- Modelo `gemini-3-pro-image`, ruta `ref/still/nanobanana-pro-v1`, región `global`.
- Experimento `a258dda8-ea6e-4a34-94f0-4cd9ca301d17`; gasto **10 créditos**.
- Output `image/png`, **1,111,472 bytes**, SHA-256 `9e9edaf59cb927610d043e3af3cac9b90c321ed48e55eb34ec0300c72dc429cf`.
- API + worker restaurados a `GLOBE_LAB_PROVIDER=composite`; break-glass IAM revocado (readback limpio).
- Driver gobernado desplegado en `9b62b19`.
- El 2026-07-30 se firmó la revisión humana desde el Producer autenticado; readiness quedó
  `promoted`, el binding de producción `enabled` y el selector live pasó a `Disponible`.
- El baseline del 2026-07-24, cuando el reader aún devolvía `gated/not_promoted`, queda supersedido
  por este readback. No existe un pendiente de promoción de Nano Banana Pro dentro de TASK-1553.

## Evidencia de promoción OpenAI — GPT Image 2 y 1.5 (2026-07-30)

- Globe `main` quedó en `2b75272c49e05810bb37b1172f16daabedfd18ae`. CI
  `30559712670`, API `30559850637` y worker `30560124218` terminaron `success`; API y worker
  verificaron el SHA/digest desplegado.
- El driver gobernado usa la API oficial de OpenAI Images. El compiler resuelve antes del gasto la
  política comercial vigente por la identidad completa de la ruta y la fija en el snapshot; el asset
  hereda esa versión inmutable. Esto corrige el rechazo
  `generated_rights_policy_missing_or_expired` sin relajar la gobernanza.
- GPT Image 2 generó desde el Producer autenticado el run
  `a81c8049-7772-4933-82f2-1e2e59e5121c`, `image/png`, 14 créditos, y quedó `Listo`.
- GPT Image 1.5 se promovió mediante la operación
  `promotion_6d1ff645-2e1a-42c1-85b5-02d2ba3f696b`. La generación nueva desde el Producer
  autenticado fue `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a`, `image/png`, 10 créditos. El asset pasó
  inspección, malware, provenance/C2PA y derechos; la UI habilitó `Ver candidato` y `Descargar`. El
  checker confirmó el canary en el run `30561393336`.
- El reader live de `greenhouse-org:efeonce` devuelve simultáneamente `available` para Seedream 5 Pro,
  Nano Banana Pro, Nano Banana 2, GPT Image 2 y GPT Image 1.5.
- Capturas: [`evidence/2026-07-30/README.md`](evidence/2026-07-30/README.md).

## Evidencia de promoción Vertex — Nano Banana 2 (2026-07-30)

- Un probe autenticado al endpoint oficial
  `global/publishers/google/models/gemini-3.1-flash-image:generateContent` devolvió HTTP 200; el 404
  histórico de allowlist dejó de representar el runtime.
- Globe añadió el driver/ruta gobernada y rates estándar/HD en `f143936`; la migración `0034` quedó
  aplicada. CI `30561907019`, migración `30562256644`, API `30562323309`, worker
  `30562758591` y Studio `30562845688` terminaron `success`.
- Evaluación exacta: reporte `51818214-863d-4542-8e9b-eb50c1cb5be9`, experimento
  `82e3f630-63e8-4c59-a629-8ea670c79dd7`, 5/5 checks objetivos, `image/png`,
  SHA-256 `aa3268e81afbd1ef3cd7794426500881abb6abd63b92569d0050107af5551b5e` y 10 créditos.
- La revisión humana quedó firmada como
  `review_8ce9fa89-b566-4d51-b150-1d83fce0dec6`; la atestación comercial es
  `mcra_4a15625c-0186-4d01-bae1-472071c38e4d`. Readiness, binding y circuito se promovieron por
  el operador canónico (`30564131652`, `30564134009`, `30564136579`, `30564202157`).
- La prueba final se inició desde el Producer autenticado como Julio Reyes: run
  `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`, ruta exacta `ref/still/nanobanana-2-v1`, 10 créditos.
  El smoke expuso un off-by-one en la reconstrucción del hash durable de Vertex; `1fb57285` lo
  corrigió con regresión focal y el worker deploy `30565166238` recuperó el mismo run
  idempotentemente, sin una segunda generación ni un segundo cobro. La UI mostró `Listo`; output
  `image/png`, SHA-256 `b8a0eb45289558a2cb99e9989fa401aa794035c709505b10c58fba34e0768c1e`.

## Evidencia de promoción Fal — Recraft v4.1 Vector (2026-07-30)

- Ruta `ref/still/vector-v1`, endpoint `fal.recraft.text-to-vector`, modelo
  `recraft-v4.1-vector`, versión `v4.1`, región `us-central1`.
- Evaluación exacta: reporte `19504a56-3e70-43f5-a86a-bbc425312cd0`, experimento
  `a11692b1-3241-434f-8949-8cb4fc1b63b6`, 4 créditos, `image/svg+xml` y output retenido.
- Revisión humana `review_f38176d1-22b0-4639-884b-a1d61c00f5f4`; atestación comercial
  `mcra_e7d74373-edbc-4de6-abd7-1c0888baa162`.
- Generación real desde el Producer autenticado:
  `b5631c86-707a-41d9-8ecc-ef61caa8200c`, 4 créditos, `completed/retained`. La UI muestra
  `Listo`, vista previa SVG, estado `Guardada` y descarga habilitada.
- El smoke reveló un mismatch de transporte documentado por Fal: el payload declara SVG y el CDN
  responde `application/octet-stream`. Globe `84d6a8e` conserva fail-closed: sólo admite ese MIME
  genérico para la salida Recraft esperada, verifica bytes SVG antes del ingest y añade CSP sandbox
  al servirlos. Worker `30573508938` y ambos servicios internos `30573523066`/`30573523128`
  terminaron `success`.
- Captura autenticada: [`evidence/2026-07-30/globe-recraft-v4-1-real-generation.png`](evidence/2026-07-30/globe-recraft-v4-1-real-generation.png).

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
  **Promover una ruta la vuelve elegible en el Producer sin tocar la UI.** Hoy seis rutas de imagen
  están disponibles, incluida Recraft v4.1 para vectorización. Cero slug/costo/margen en el DOM.

## Estado vigente y límites fuera de TASK-1553

- **Gemini Omni en producción gobernada:** hoy Omni está **solo en el Lab**; el path gobernado tiene Fal + Veo + (ahora) Vertex-imagen, **no Omni**. Si `ref/motion/reference-v1` se quiere entregar a cliente, falta su driver gobernado (Interactions API) — análogo a lo que se hizo para Vertex-imagen.
- **OpenAI (GPT Image 2/1.5):** lane gobernado, promociones y canaries reales completados el 07-30.
- **Nano Banana 2:** promovido y ejercitado desde el Producer el 07-30; el bloqueo de allowlist quedó retirado.
- **Recraft v4.1:** promovido y ejercitado desde el Producer el 07-30; SVG retenido y descarga habilitada.
- **Selector:** el consumer vigente es un desplegable compacto con isotipo real y disponibilidad del
  reader. La dirección de galería fue rechazada y no forma parte del estado ni del roadmap.
- **Topaz, Omni, 3D y otras expansiones:** conservan sus propios drivers, contratos de modalidad,
  promociones y canaries. No son trabajo residual de las seis rutas de imagen entregadas por TASK-1553.
- **Único pendiente de TASK-1553:** receipts transversales que demuestren, por cada ruta promovible,
  una rate version vigente de TASK-1468 y el onboarding receipt de TASK-1578. Este pendiente no
  cambia la disponibilidad live de las seis rutas ejercitadas.

## Receta vigente para sumar otra ruta

Una identidad nueva repite el mismo control, sin editar el consumer:

1. ruta pública + identidad ejecutable por `routeId`;
2. rate version vigente y binding exacto;
3. driver y endpoint allowlisted;
4. evaluación exacta, revisión y atestación comercial;
5. readiness, binding y circuito promovidos;
6. readback en `globe.producer.fleet.list`;
7. canary real desde la UI con estado terminal, gasto, MIME/hash, retención, vista previa y descarga.

El receipt transversal de los pasos anteriores pertenece a TASK-1578; este ledger conserva el estado
humano y la evidencia, no crea un segundo workflow de onboarding.

## Cómo mantener este ledger (obligatorio)

- **Al integrar un modelo/proveedor nuevo** (Lab o gobernado): agrega su fila acá en el mismo PR, con
  carril, fecha, evidencia y ruta. Un modelo integrado sin fila acá = deuda de conocimiento.
- **Al promover una ruta** (ADR-009): actualiza su celda "Prod. gobernada" a ✅ con la evidencia.
- **Al validar en vivo:** anota fecha + evidencia (sha/bytes/experiment id), no "probado" a secas.
- La verdad de promoción live sigue siendo `globe.production-routing`/`globe.model-readiness`; este doc es
  el mapa humano, se reconcilia contra runtime, no lo reemplaza.
