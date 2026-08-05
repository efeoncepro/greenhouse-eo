# Globe model fleet — evidencia 2026-07-30

Índice de evidencia visual y runtime para las promociones de imagen ejecutadas desde el Producer
autenticado y los operator lanes keyless. La autoridad operativa completa está en
[`../../GLOBE_RUNTIME_HANDOFF.md`](../../GLOBE_RUNTIME_HANDOFF.md); esta carpeta preserva las
capturas exactas del navegador.

## Generaciones y evaluaciones visibles

| Modelo / acto | Ruta | Run / experimento | Resultado | Captura |
| --- | --- | --- | --- | --- |
| GPT Image 2 — Producer | `ref/still/openai-v2` | `a81c8049-7772-4933-82f2-1e2e59e5121c` | `image/png` · 14 cr · completado | [`globe-gpt-image-2-real-generation.png`](globe-gpt-image-2-real-generation.png) |
| GPT Image 1.5 — rights/promoción | `ref/still/openai-v1-5` | promoción `promotion_6d1ff645-2e1a-42c1-85b5-02d2ba3f696b` | rights y ruta gobernada | [`globe-gpt-image-1-5-commercial-rights-real-generation.png`](globe-gpt-image-1-5-commercial-rights-real-generation.png) |
| GPT Image 1.5 — Producer | `ref/still/openai-v1-5` | `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a` | `image/png` · 10 cr · completado | [`globe-gpt-image-1-5-real-generation.png`](globe-gpt-image-1-5-real-generation.png) |
| Nano Banana 2 — evaluación | `ref/still/nanobanana-2-v1` | `82e3f630-63e8-4c59-a629-8ea670c79dd7` | `image/png` · 10 cr · 5/5 checks | [`globe-nano-banana-2-evaluation-candidate.png`](globe-nano-banana-2-evaluation-candidate.png) |
| Nano Banana 2 — Producer | `ref/still/nanobanana-2-v1` | `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a` | `completed/retained` · 10 cr | [`globe-nano-banana-2-real-generation.png`](globe-nano-banana-2-real-generation.png) |
| Recraft v4.1 Vector — Producer | `ref/still/vector-v1` | `b5631c86-707a-41d9-8ecc-ef61caa8200c` | SVG · `completed/retained` · 4 cr | [`globe-recraft-v4-1-real-generation.png`](globe-recraft-v4-1-real-generation.png) |

Todas las generaciones de la tabla se iniciaron en
`https://globe.efeoncepro.com/producer` con la sesión autenticada del operador. Las capturas prueban
la superficie visible; el estado terminal y la identidad exacta se reconciliaron por readers/operator
lanes.

## Outputs y finalización

### Nano Banana 2

- Evaluación: reporte `51818214-863d-4542-8e9b-eb50c1cb5be9`; output
  `sha256:aa3268e81afbd1ef3cd7794426500881abb6abd63b92569d0050107af5551b5e`.
- Producer: output
  `sha256:b8a0eb45289558a2cb99e9989fa401aa794035c709505b10c58fba34e0768c1e`.
- El run de Producer se conservó como una única ejecución idempotente. `1fb57285` corrigió el
  off-by-one de `vertex-output:` usando la longitud del prefijo; el outbox finalizó el mismo run sin
  una segunda generación ni un segundo cobro.

### Recraft v4.1 Vector

- Evaluación: reporte `19504a56-3e70-43f5-a86a-bbc425312cd0`; experimento
  `a11692b1-3241-434f-8949-8cb4fc1b63b6`.
- Run final: `b5631c86-707a-41d9-8ecc-ef61caa8200c`; attempt
  `eca867f2-a0cf-49d1-abfa-ebd06bc49c8a`.
- Fal declara `image/svg+xml`, pero el CDN entrega el stream como `application/octet-stream`.
  `84d6a8e` permite ese transporte sólo para el output SVG esperado, verifica los bytes SVG antes
  del ingest y añade CSP sandbox al serving. Otro contenido o medio sigue fallando cerrado.
- `7f4d5ea` preserva razones seguras de finalización y `23ee9b5` conserva fallos seguros del stream
  sin exponer mensajes, stack ni body upstream.
- Los intentos previos fallaron antes del gasto por circuito ausente. El diagnóstico no volvió a
  generar el asset final.

## Rights, revisión y operator lanes

| Modelo | Revisión / rights | Operación keyless verificada |
| --- | --- | --- |
| GPT Image 2 / 1.5 | evidencia comercial exacta por familia y política efectiva fijada antes del gasto | driver oficial, routing/promoción y checker; canary GPT Image 1.5 `30561393336` |
| Nano Banana 2 | `review_8ce9fa89-b566-4d51-b150-1d83fce0dec6` · `mcra_4a15625c-0186-4d01-bae1-472071c38e4d` | readiness/binding/circuito `30564131652`, `30564134009`, `30564136579`, `30564202157` |
| Recraft v4.1 | `review_f38176d1-22b0-4639-884b-a1d61c00f5f4` · `mcra_e7d74373-edbc-4de6-abd7-1c0888baa162` | routing/readiness/rights/circuito por `Globe Operator Lane (keyless)`; diagnóstico final `30574036402` |

Los operator lanes usan identidades separadas (`caller`, `tenancy-operator`, `auto-lane`,
`routing`, `promoter`, `checker`) y una matriz acción↔lane cerrada. La revisión humana y la prueba
visual no se sustituyen por el workflow: ocurren en el Producer autenticado.

## CI y deploy

### OpenAI

- [CI `30559712670`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30559712670) — `success`
- [API `30559850637`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30559850637) — `success`
- [Worker `30560124218`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30560124218) — `success`

### Nano Banana 2

- [CI finalización `30565123529`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30565123529) — `success`
- [Worker finalización `30565166238`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30565166238) — `success`
- Base gobernada: CI `30561907019`, migración `30562256644`, API `30562323309`, worker
  `30562758591` y Studio `30562845688`, todos `success`.

### Recraft v4.1

- [CI `30573503498`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30573503498) — `success`
- [Worker `30573508938`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30573508938) — `success`
- [API/Studio `30573523066`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30573523066) y
  [`30573523128`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30573523128) — `success`
- [Diagnóstico seguro final `30574036402`](https://github.com/efeoncepro/efeonce-globe/actions/runs/30574036402) —
  run y attempt `completed`

## Integridad de las capturas

| Archivo | Dimensiones | SHA-256 |
| --- | ---: | --- |
| `globe-gpt-image-1-5-commercial-rights-real-generation.png` | 1710×929 | `0d94a8fcd12c8819c4d1728258d4c1a699ab06cc6e7b62b03db6a0e9d0dc9d9c` |
| `globe-gpt-image-1-5-real-generation.png` | 1710×929 | `3f1e63f42b7d1d2718f74c4d570eb365652e2fb7adfd54132fa7571e7547d164` |
| `globe-gpt-image-2-real-generation.png` | 1710×929 | `15923f852efbd21cffe9c449ba9affdf35d0376b581797b0153762385bfb5c2c` |
| `globe-nano-banana-2-evaluation-candidate.png` | 1710×929 | `1fe9c4cbb6a67d584f21456783b3f8170074ab47f27689173d81a2e55234e8cb` |
| `globe-nano-banana-2-real-generation.png` | 3420×1858 | `7696ac0373fb3567d9705e75332330a0ca8fdea7d10324678a1c85754181c1db` |
| `globe-recraft-v4-1-real-generation.png` | 1695×976 | `05a1f34431787aeab3ede59025155edfc1835fadfda57f14978f230594d089d0` |

No incluyas tokens, cookies, grants, URLs firmadas, payloads de proveedor, artefactos diagnósticos
con datos internos ni credenciales en esta carpeta.

## Siguiente paso

Emite los onboarding receipts de `TASK-1578` para las seis rutas disponibles, cada uno enlazado a
su rate version vigente de `TASK-1468`, y reconcílialos contra `globe.producer.fleet.list`. Sólo
entonces actualiza el criterio 7 y cierra `TASK-1553`.
