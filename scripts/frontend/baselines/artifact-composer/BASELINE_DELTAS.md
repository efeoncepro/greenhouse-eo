# Artifact Composer — BASELINE_DELTAS (contrato de dos vías)

<!-- manifest-digest: afb1f2ba8c5bfab5da06d2a5f938e0f6205c5eecec519fb4d57b43b95d56fafb -->

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

## 2026-07-14 — Deck SKY: entra la lámina de la muestra (TASK-1410 · licitación Wherex)

**Qué cambió:** el deck SKY pasa de **15 a 16 láminas**. Se inserta `sky/12-muestra.png`
(`contentType: highlight` → `HighlightWave`, derivado por el selector — el plan **no** declara
`template`), justo después de `11-seo-aeo`: la 11 declara la capacidad AEO y la 12 la prueba,
enlazando la Radiografía publicada (`think.efeoncepro.com/muestras/sky-carretera-austral-…`).

**Por qué por ENLACE y no por captura:** el catálogo no tiene hoy ninguna plantilla capaz de mostrar
una captura de UI — el único slot de imagen (`leftVisual`, en `StatSplit`) está dimensionado para las
ilustraciones clay3d y reduciría la radiografía a una miniatura ilegible. Y de fondo: la pieza es
**interactiva** (su tesis es el acoplamiento al pasar el cursor), así que un PNG estático mata justo
lo que viene a demostrar. Aprobado por el operador, 2026-07-14.

**Frames afectados — CERO cambios de píxel:**

| Frame | Delta |
| --- | --- |
| `sky/12-muestra.png` | **nuevo** — la lámina de la muestra |
| `sky/13-equipo.png` | **solo renumeración** — era `sky/12-equipo.png` |
| `sky/14-cumplimiento.png` | **solo renumeración** — era `sky/13-cumplimiento.png` |
| `sky/15-economica.png` | **solo renumeración** — era `sky/14-economica.png` |
| `sky/16-contraportada.png` | **solo renumeración** — era `sky/15-contraportada.png` |

Frames retirados por el corrimiento (su contenido vive ahora en el número siguiente):
`sky/12-equipo.png`, `sky/13-cumplimiento.png`, `sky/14-economica.png`, `sky/15-contraportada.png`.

Los cuatro renumerados se verificaron **byte-idénticos** (`shasum -a 256`) contra su baseline previo
**antes** de promover: el renombre no esconde ninguna regresión. Ninguna plantilla cambió.

> 🔴 **Bug del propio `--freeze` (detectado acá, 2026-07-14):** la promoción **borra esta sección**.
> `visual-gate.ts:421` reescribe el ledger desde `INITIAL_DELTAS` cuando no puede releer el previo, y
> solo conserva el `manifest-digest` — es decir, **la promoción destruye la declaración que ella misma
> exigió**, que es exactamente el "rebaseline silencioso" que este archivo existe para impedir. Esta
> sección se restauró a mano después del `--freeze` (el digest sella el *manifest*, no la prosa, así
> que reponerla es seguro). **Hasta que se arregle: después de todo `--freeze`, verificá que tu
> declaración siga acá.**

**Follow-up abierto:** falta una plantilla de *artifact showcase* (captura a sangre + copy). La
Radiografía no va a ser el último artefacto que mostremos en un deck. No se construyó ahora por estar
a un día del cierre de la licitación.
