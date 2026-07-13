# TASK-1373 — Careers Native Growth Form Motion Contract (preservación)

## Meta

- Task: `TASK-1373`
- Superficie: apply de Careers migrado a `<greenhouse-form>` nativo. Wireframe: `docs/ui/wireframes/TASK-1373-careers-native-growth-form.md` · Flow: `docs/ui/flows/TASK-1373-careers-native-growth-form-flow.md`
- Rigor de motion: **preservación**, no autoría. 1373 es un host: NO agrega motion nuevo. El motion vive en el **renderer + el `styleVariant` premium** (owned por TASK-1372). Este contrato existe para **blindar** que la migración no degrade el motion actual del apply.
- Estado: `verified-local` (UI ready: yes; staging post-deploy pendiente)

## Motion Brief

La directiva del operador es que migrar a Growth Form **no puede perder la riqueza estética**, y el motion es parte de esa riqueza. El apply de Careers hoy tiene microinteracciones (foco de campos, estado del CTA, feedback de validación). Al migrar, ese motion debe quedar **igual o mejor**, provisto por el `styleVariant` premium del renderer — nunca degradado a un submit plano. 1373 no inventa motion; **verifica que se preserve**.

## Motion Inventory (todo provisto por el renderer/styleVariant — 1373 lo preserva, no lo autora)

| # | Elemento | Comportamiento | Owner |
|---|---|---|---|
| M1 | CTA submit | Motion del botón (hover/press/pending "Enviando…") del `styleVariant` premium | renderer/1372 |
| M2 | Foco de campo | Focus ring tokenizado + transición de foco | renderer/1372 |
| M3 | Select premium (combobox) | Apertura/cierre del listbox custom (no popup nativo del SO), overlay stacking | renderer/1372 (TASK-1343 pattern) |
| M4 | Validación inline | Aparición del error (`role=alert`) sin salto de layout | renderer |
| M5 | Skeleton de carga | Mientras el render contract carga | renderer |
| M6 | Éxito / envío | Estado de confirmación genérico | renderer |

## Reglas duras (preservación, NO interpretable)

- **NUNCA** aceptar un CTA plano ni un submit sin feedback: el motion del CTA (M1) del `styleVariant` premium es parte de la paridad; si el renderer no lo trae, se extiende el renderer (TASK-1372), no se degrada.
- **NUNCA** reemplazar el combobox premium (M3) por un `<select>` nativo con popup del SO: es una regresión visual/motion.
- **SIEMPRE** el host NO agrega motion propio (no compite con el renderer); solo lo hostea. Cero motion decorativo nuevo.
- **SIEMPRE** honrar `.ghf-scope`/`hosted` (TASK-1298) para que el motion tokenizado del renderer no quede sombreado por CSS del host.

## Reduced Motion Contract

`@media (prefers-reduced-motion: reduce)`: el renderer degrada su propio motion (M1–M6) a estático/corte directo, **conservando el feedback esencial** (pending del CTA, error `role=alert`, éxito) por texto/estado. 1373 no altera este contrato — lo hereda del renderer. Verificar que reduced-motion se respete post-migración (parte del GVC).

## Accessibility & Feedback

- El feedback (foco, error, pending, éxito) sobrevive por texto/aria por construcción del renderer; el motion es aditivo, nunca el único canal.
- El foco visible y el orden de tabulación (heading → campos → país → CV → consent → submit) se preservan; el motion no interfiere.

## GVC / Micro Evidence

- Baseline custom local: `.captures/2026-07-13T20-42-47_task354-careers-runtime-audit`, desktop 1440 + mobile 390, sin overflow ni runtime findings.
- Post-cutover native local: `.captures/2026-07-13T21-01-34_task354-careers-runtime-audit`, desktop 1440 + mobile 390, native host visible, CV uploader marker visible, sin overflow ni runtime/layout findings.
- El host no agregó motion propio; preserva feedback esencial del renderer (`pending`, focus, errors, success). La validación de success real se cubrió por smoke sintético Growth Forms → ATS.
- Staging GVC queda como post-deploy gate porque el ambiente protegido no tenía `VERCEL_AUTOMATION_BYPASS_SECRET` disponible durante el preflight.

## Design Decision Log

- **Preservación, no autoría:** 1373 hostea; el motion es del renderer/`styleVariant` (1372).
- **CTA + combobox premium = paridad obligatoria**, no opcional.
- **Reduced-motion heredado del renderer**, verificado en GVC.
- **Host no agrega motion**; `.ghf-scope`/`hosted` honrado para no sombrear el motion tokenizado.

## Acceptance Checklist

- [ ] GVC before/after confirma que M1 (CTA), M3 (combobox premium) y M4 (validación) se preservan igual o mejor (desktop+mobile).
- [ ] Ningún `<select>` nativo con popup del SO reemplazó el combobox premium.
- [ ] El host no introdujo motion decorativo nuevo; `.ghf-scope`/`hosted` honrado.
- [ ] Reduced-motion respetado post-migración (feedback esencial conservado).
