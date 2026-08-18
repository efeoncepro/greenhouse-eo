# TASK-1741 — Continuidad detalle público → postulación

## Alcance

TASK-1741 no crea un flujo nuevo. Este contrato registra la única transición entre superficies que debe
permanecer intacta mientras cambia el layout de la hoja de vacante.

```text
/public/careers/[publicId]
  ├─ CTA del hero ───────────────┐
  └─ CTA del resumen lateral ────┴─> /public/careers/[publicId]/apply
```

## Invariantes

- Existen exactamente dos enlaces de aplicación en el detalle: hero y resumen.
- Ambos resuelven el mismo `opening.applyHref`; no hay CTA final, modal, drawer ni formulario embebido.
- La transición es navegación normal de Next `Link`, sin command, escritura, query sensible ni estado
  client-side intermedio.
- El orden de foco sigue el DOM: navegación pública → CTA hero → contenido → CTA del resumen.
- En desktop el resumen es sticky; en 390 px se ubica al final del contenido. El CTA hero mantiene acceso
  temprano y el resumen no introduce una tercera acción.
- Opening inexistente/no publicado conserva el `notFound` público. La ruta apply mantiene sus propios gates.
- Rollback del renderer no cambia URL, href, historial, formulario, consentimiento ni submit.

## Evidencia

- Test de componente: exactamente dos `a[href=opening.applyHref]` y dos nombres accesibles de postulación.
- GVC TASK-1741: hero y resumen visibles, foco con teclado y cero redirección a login/error boundary.
- El formulario queda fuera del diff funcional; sólo se revisa como guard de CSS compartido.

## GVC Scenario Plan

- Scenario: `task1741-careers-editorial-detail`.
- Viewports: 1440×1200 y 390×844 con profile `premium`.
- Capturar hero, hoja completa, modelo remoto/resumen y foco de teclado.
- Afirmar en test de componente exactamente dos enlaces al `applyHref`; GVC confirma que hero y resumen
  existen y que la ruta pública no deriva a login ni error boundary.
- No navegar ni escribir en el formulario durante la captura: su contrato es ajeno a esta task.

## Design Decision Log

- Decisión: documentar y preservar la transición existente, no diseñar una nueva.
- Alternativa rechazada: CTA final o formulario embebido; duplicaría la acción y ampliaría el alcance.
- Alternativa rechazada: un único enlace físico en desktop/móvil; degradaría el acceso temprano móvil o el
  refuerzo contextual del rail. Ambos enlaces representan una sola acción conceptual y comparten destino.
- Primitive: reusar Next `Link` y estilos de botón existentes; no crear navigation primitive.
