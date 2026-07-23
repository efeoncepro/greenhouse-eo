# TASK-1534 — Voice-to-Creative-Prompt Flow

## Flow

`mic click → permission → recording → stop → processing → transcript ready|partial|error`.

- `Insertar transcripción` actualiza source, invalida estimate y restaura foco.
- `Convertir en propuesta creativa` envía transcript revisado a TASK-1530 y abre el review de TASK-1531.
- Cualquier lectura sugerida queda separada del transcript; sólo la persona decide si la incorpora antes del handoff.
- `Volver a grabar` descarta draft/audio anterior antes de una nueva captura.
- `Descartar` elimina draft y confirma deletion/reconciliation sin tocar source.
- Permission denied mantiene typing disponible y explica recuperación del navegador.

## State Ownership

- Browser: MediaRecorder, timer, local preview/focus.
- TASK-1533: upload, transcript, evidence, deletion.
- TASK-1530/1531: creative proposal/review.
- TASK-1532: estimate sólo después de literal insert o accepted proposal.

## GVC Scenario Plan

- Desktop/mobile: permission granted/denied, recording, stop, processing, ready, partial, error, retry/discard.
- Assert no auto-insert, no estimate while recording/processing/preview and deterministic focus.

## Design Decision Log

- Finite batch flow selected; streaming/chat rejected for V1.
- Inline capsule preserves relationship with source and works at 390 px.
