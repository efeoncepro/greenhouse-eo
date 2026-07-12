# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

<!-- manifest-digest: 1d66608aeb512ed2bdd1537ea129f641dc52cb4505eb0b5368a6e88828d8aed3 -->

Este ledger existe porque **un rebaseline silencioso es peor que no tener gate**: el gate se
"arregla" promoviendo el baseline y nadie se entera.

**El contrato:**

- Todo cambio de píxel INTENCIONAL se declara acá, **lámina por lámina** (qué frame, qué cambió,
  por qué, quién lo aprobó) **ANTES** de correr `pnpm composer:visual-gate --freeze`.
- `--freeze` se niega a promover un frame cambiado que no esté declarado en este archivo.
- El marcador `manifest-digest` lo sella la promoción; el gate lo verifica. Editar el manifest o
  los PNG a mano, sin pasar por la promoción declarada, **también falla el gate**.
- El baseline se re-promueve **en el mismo PR** que declara el delta.

## 2026-07-12 — Baseline inicial (TASK-1393 · Slice 0)

- Congelado sobre el commit pre-refactor: 25 plantillas del catálogo (payload sintético compartido
  con `template-composability.test.ts`) + 15 láminas reales del deck SKY
  (`docs/commercial/tenders/sky-blog-2026/deck-plan.json`).
- Sin deltas: es la fotografía de partida que todo el refactor debe conservar a CERO píxeles.
