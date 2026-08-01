# TASK-1483 — revisión first fold de Globe Credits Operations Workbench

## Veredicto

`ACCEPT FIRST FOLD` después de una iteración correctiva. Este veredicto acepta composición, jerarquía,
densidad, lenguaje visual y transformación responsive; no equivale a `UI ready`, launch readiness ni cierre de
TASK-1483. El checkpoint posterior conectó el CTA a una ejecución one-shot con identidad, límites exactos y
readback/recovery; todavía no equivale a rollout ni a verificación staging/live.

## Evidencia

- Scenario contractual: `scripts/frontend/scenarios/globe-credits-operations-workbench.scenario.ts`.
- Captura local autenticada: `.captures/2026-08-01_globe-credits-operations-workbench-chrome/manifest.json`.
- Desktop: `frames/09-desktop-final.png`, viewport solicitado 1440×1000; `clientWidth=1425`,
  `scrollWidth=1425`.
- Mobile: `frames/07-mobile-revised-top.png`, viewport solicitado 390×844; `clientWidth=375`,
  `scrollWidth=375`.
- Detalle mobile: `frames/04-mobile-operation-detail.png`; la selección `op-jul-readback-002` dejó
  `aria-pressed=true` y proyectó grant `0` + receipt `no_effect` sin recalcular datos en browser.
- Actor/browser: sesión Chrome anclada por el operador a `jreyes@efeonce.cl`. No se exportaron cookies,
  storage state ni secretos.
- Checkpoint funcional posterior en la misma sesión autenticada, viewport solicitado 390×844:
  `clientWidth=scrollWidth=390`; diálogo con tres campos accesibles, confirmación válida y bloqueo explícito al
  probar `target=1500` sobre `maxCap=1200`; cero errores de consola.
- Recovery mobile: `op-jul-recovery-001` quedó `aria-pressed=true`; el drawer `Detalle de operación` expuso
  `Verificar y reconciliar` visible y habilitado. No se activó el botón ni se ejecutó fondeo real.

## Iteración

La primera captura mobile se rechazó porque el drawer de navegación persistido quedó abierto y comprimió el
contenido. Al cerrar el menú canónico, el viewport quedó sin overflow y `CompositionShell masterDetail` convirtió
el detail canvas en drawer temporal. El scenario ahora normaliza ese estado con `Escape` antes de capturar.

También se corrigieron:

- contraste del workspace dentro del header inmersivo;
- traducción de estados técnicos de operación y recibo;
- traducción de blockers canónicos sin alterar sus códigos de dominio.

## Lectura visual

- La jerarquía es inequívoca: estado y acción → señales → runway → operación/evidencia.
- El runway usa una única superficie inmersiva y evita metáforas de wallet, token o dinero.
- Desktop mantiene navigator angosto + detail canvas; mobile conserva inventario y mueve el detalle al drawer.
- El inventario corto deja aire operativo sin convertirse en una cuadrícula de cards homogéneas.
- La acción primaria sólo se habilita con proyección confiable y ambos entitlements. `completed|no_effect` son los
  únicos éxitos; un resultado incierto conserva la operation key y ofrece reconcile, sin success optimista.

## Pendiente antes del gate premium final

- GVC canónico staging con la sesión humana indicada, una vez desplegada la surface.
- Axe/keyboard/reduced-motion automatizados, dossier y scorecard final con `pnpm ui:quality --task TASK-1483`.
- Revisión `greenhouse-ui-review` y `greenhouse-ui-enterprise-review` sin `BLOCK`.
