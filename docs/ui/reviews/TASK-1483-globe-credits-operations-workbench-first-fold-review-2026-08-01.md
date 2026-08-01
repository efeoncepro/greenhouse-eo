# TASK-1483 — revisión first fold de Globe Credits Operations Workbench

## Veredicto

`ACCEPT FIRST FOLD` después de una iteración correctiva. Este veredicto acepta composición, jerarquía,
densidad, lenguaje visual y transformación responsive; no equivale a `UI ready`, launch readiness ni cierre de
TASK-1483. El checkpoint posterior conectó el CTA a una ejecución one-shot con identidad, límites exactos y
readback/recovery. El rollout staging y la verificación live quedaron completados en el cierre de esta revisión.

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

## Gate premium final

- GVC desktop/mobile, teclado, reduced motion, accesibilidad, overflow y runtime: `PASS`.
- Revisión `greenhouse-ui-review` y `greenhouse-ui-enterprise-review`: `PASS`, sin `BLOCK`.

## Gate premium final — PASS local

- GVC: `.captures/2026-08-01T21-52-08_globe-credits-operations-workbench`.
- Drawer mobile: `.captures/2026-08-01T21-52-50_globe-credits-operations-workbench-mobile`.
- Pasaron keyboard, reduced motion, accesibilidad, overflow y runtime. La inspección visual confirmó jerarquía,
  contraste, densidad y detalle legible a 390 px.
- UI review: `PASS`; primitives canónicas, copy centralizada y cero lógica económica en browser.
- Enterprise review: promedio `4.7/5`, floor `4.5/5`; hierarchy 4.8, surface economy 4.7, visual impact 4.6,
  fidelity 4.8 y template resistance 4.5.
- Estado honesto: `UI ready: yes`; rollout staging y smoke autenticado completos.

## Evidencia live

- Vercel staging `dpl_F153TxebTXfkLVjg12SiJtqSBXsH`, corte Greenhouse
  `f899d951b84aebd23bf8702042b4fffb1252bc1f`, alias `https://dev-greenhouse.efeoncepro.com`.
- Chrome autenticado verificó la surface completa, operación `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a`, readback
  800/800/1500/0/0 y cero errores de consola. No hubo mutación adicional ni release completo.
