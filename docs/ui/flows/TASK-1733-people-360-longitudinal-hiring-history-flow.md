# TASK-1733 — Flow · historia Hiring longitudinal en People 360

## Main flow

```text
People 360 / HR
  → TASK-1732 reader identity-first
  → timeline paginada
      → seleccionar evento application
          → revalidar capability/resource
              ├─ allow: detail allowlisted + deep link exacto
              └─ deny/not-found: estado bounded sin oracle
      → seleccionar handoff/activation
          → detail factual + relación downstream
```

## State transitions

- Cambiar filtro vuelve al inicio del cursor y anuncia el resultado.
- Abrir/cerrar detail conserva selección y restaura foco.
- Load more agrega eventos sin perder posición.
- Reader partial muestra regiones disponibles y la falla concreta; no fusiona partial con empty.
- Un evento stale solicita readback; nunca presenta metadata cacheada como actual sin freshness.

## Responsive and accessibility

- Desktop: list-detail simultáneo sólo si el shell tiene ancho suficiente.
- Mobile: detail single-plane/Drawer canónico; back/Escape retorna al item.
- Reduced motion omite desplazamiento del sidecar pero conserva estado/foco.

## Evidence plan

- GVC selecciona dos aplicaciones de la misma persona y verifica IDs/rol/CV correctos.
- Negative capture de detail denegado y reader degraded.
- Keyboard/focus/reduced-motion y `scrollWidth === clientWidth` en ambos viewports.
