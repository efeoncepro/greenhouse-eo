# TASK-1577 — Globe Producer Audio Edit Studio motion

## Motion contract

- Primitive: tokens Globe/Greenhouse existentes.
- Enter: rail aparece localizado; stage, waveform y playhead conservan posición.
- Selection: handles y transcript highlight responden con feedback discreto.
- Run: estado/progreso real; no waveform ni progreso sintético.
- Result: compare alterna original/resultado sin perder rango ni focus.
- Reduced motion: cambios instantáneos, mismos announcements y controles.

## Guardrails

- No autoplay al entrar en edición.
- No animar todo el Producer para una modificación local.
- No mover focus durante estimate, seek o reconciliación async.
