# Globe model fleet — evidencia 2026-07-30

Evidencia visual y referencias runtime de las promociones de imagen ejecutadas desde el Producer
autenticado.

| Modelo | Run / experimento | Costo | Evidencia |
| --- | --- | ---: | --- |
| GPT Image 2 | `a81c8049-7772-4933-82f2-1e2e59e5121c` | 14 cr | `globe-gpt-image-2-real-generation.png` |
| GPT Image 1.5 | `bf8cd62b-e2d7-4e83-981a-7631a14a5d3a` | 10 cr | `globe-gpt-image-1-5-commercial-rights-real-generation.png` |
| Nano Banana 2 — evaluación | `82e3f630-63e8-4c59-a629-8ea670c79dd7` | 10 cr | `globe-nano-banana-2-evaluation-candidate.png` |
| Nano Banana 2 — Producer | `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a` | 10 cr | `globe-nano-banana-2-real-generation.png` |

La evaluación de Nano Banana 2 produjo
`sha256:aa3268e81afbd1ef3cd7794426500881abb6abd63b92569d0050107af5551b5e`.
La generación de Producer conserva un único run idempotente y terminó `completed/retained` con
`sha256:b8a0eb45289558a2cb99e9989fa401aa794035c709505b10c58fba34e0768c1e`;
el smoke descubrió el bug de finalización corregido en Globe `1fb57285`.

No incluir tokens, cookies, URLs firmadas, payloads de proveedor ni credenciales en esta carpeta.
