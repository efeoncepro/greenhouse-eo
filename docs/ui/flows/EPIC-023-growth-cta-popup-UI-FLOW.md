# Master UI Flow — EPIC-023 Growth CTA & Popup Engine

## Meta

- Program: `EPIC-023` (motor de CTAs/popups gobernado)
- Creado por: TASK-1340 (el flow doc de la task lo pedía si no existía)
- Surfaces del sistema (nodos, no pantallas aisladas): host WordPress público · Think (Astro) ·
  gobernanza `/growth/ctas` (menú Growth) · [futuro] admin cockpit de autoría/reportes.
- Contratos compartidos: `greenhouse-growth-cta-popup.v1` (render contract arbitrado) ·
  API pública render/events · API admin lifecycle/surfaces · familia browser `greenhouse_cta_*`.

## Mapa cross-surface

```
[Operador en /growth/ctas]                    [Visitante en WP/Think]
   │ author→review→publish (API admin,             │ carga página
   │ capability fina growth.cta.*)                 ▼
   ▼                                        [<greenhouse-cta>] ──GET /render──▶ [arbiter server]
[cta_version published inmutable] ─────────────────┘   (0–1 interruptivo + N no-interruptivos)
   │ pause/resume (freno §16.3)                    │ contrato browser-safe
   ▼                                               ▼
[deja de arbitrarse ≤ ~2 min]              [card variante rica] ──click──▶ [open_growth_form
                                                   │                        monta <greenhouse-form>]
                                                   │ dismiss                       │ submit
                                                   ▼                              ▼
                                            [ingest Tier A browser_reported] [ledger Growth Forms
                                             + dataLayer greenhouse_cta_*]    = autoridad conversión]
```

## Reglas de coherencia entre nodos

- Un solo modelo: la gobernanza y los hosts consumen el MISMO primitive `growth.cta`
  (Full API Parity); el preview de `/growth/ctas` monta el MISMO core del renderer con
  fixtures (paridad CSS por construcción: `:is(greenhouse-cta, .ghc-scope)`).
- La política (targeting/priority/suppression) JAMÁS cruza al browser: los hosts reciben
  el resultado arbitrado.
- El CTA nunca duplica el form: `open_growth_form` monta el `<greenhouse-form>` gobernado;
  la conversión-verdad es el ledger de forms (`generate_lead` sigue siendo el key event).
- Medición: `greenhouse_cta_*` (browser/GTM) ≠ `growth.cta.*` (interno) ≠ `gh_cta_clicked`
  (rail legacy ad-hoc WP) — deslinde en TRACKING-PLAN §CTAs.
- Nodos futuros (placement interruptivo, cockpit de autoría, más acciones) extienden ESTE
  flow; no crean rieles paralelos.

## Nodos por task

| Nodo | Task | Estado |
| --- | --- | --- |
| Foundation server (schema/arbiter/API/ledger) | TASK-1339 | complete (shadow, flag OFF) |
| Renderer portable + hosts + gobernanza Growth | TASK-1340 | esta task |
| Placement interruptivo (popup/slide-in) | task siguiente | to-do |
| Admin cockpit autoría/reportes | task futura | to-do |
