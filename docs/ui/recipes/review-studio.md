# Recipe: Review studio

## Intent

Revisar una pieza, evidencia o cambio comparando contexto y tomando una decisión trazable.

## Composition

- Shell: `split`.
- `primary`: `PreviewStage kind='evidence'`.
- `aside`: `DetailHero kind='evidence'`, checklist/observaciones y `ContextCommandBar kind='review'`.
- Primer fold: qué se revisa, versión, estado, evidencia principal y decisión disponible.
- Mobile: preview y revisión se alternan mediante el sidecar/drawer canónico; la decisión permanece reachable.

## States and motion

- Cambiar versión hace crossfade del artefacto y mantiene los controles estables.
- Aprobar/rechazar exige feedback de progreso y resultado; error conserva comentario.
- Diferencias importantes reciben anclaje visual, no solo color.

## Anti-patterns

- Modal full-screen construido a mano.
- Acciones destructivas junto a la primaria sin separación.
- Preview falso o placeholder en evidencia final.
