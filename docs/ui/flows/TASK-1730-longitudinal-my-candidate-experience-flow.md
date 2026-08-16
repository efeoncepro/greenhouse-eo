# TASK-1730 — Flow · `/my` longitudinal candidato

## Entry and lifecycle

```text
Apply público aceptado
  → email “Accede a tu espacio”
  → claim verificado TASK-1727
  → /my
      ├─ sin acción: journey + perfil
      ├─ action required: CTA al recurso exacto
      ├─ decisión comunicada: outcome publicado + próximos pasos
      └─ selected/preboarding: nuevas acciones gobernadas

TASK-1731 activa member
  → sesión/capabilities refresh
  → mismo /my suma secciones workforce
```

## Application detail

```text
/my/applications
  → seleccionar aplicación
  → resumen candidate-facing
      ├─ estado y última comunicación
      ├─ acciones/deadlines
      ├─ CV snapshot/versiones permitidas
      ├─ respuestas del rol editables según policy
      └─ expectativa económica de esa aplicación
```

## Recovery and destructive actions

- Error de reader conserva chrome y ofrece Reintentar; nunca se convierte en empty.
- Reemplazo de CV muestra receipt/version y readback autoritativo.
- Retiro abre confirmación, explica alcance sólo de esa application y restaura foco al cancelar.
- Expired/stale action lleva a readback, no a retry ciego.
- Foreign/not-found usa la misma salida sin oracle.

## Responsive transformation

- Desktop conserva journey y contexto simultáneos.
- Mobile navega a detail full-width o primitive adaptativa; Escape/back vuelve a la app seleccionada.
- Tabs siempre mantienen activo visible y URL compartible sin IDs sensibles secuenciales.

## Evidence plan

- GVC desktop/mobile para claim→overview, action→receipt, withdraw cancel/confirm y capability expansion fixture.
- Keyboard: tab order, dialog focus trap/restore y route return.
- Reduced motion: misma selección/detail/receipt sin animación espacial.
