# TASK-1747 — Review visual: recuperación de acceso en Application 360

> **Tipo de documento:** Review visual (GVC)
> **Version:** 1.0
> **Creado:** 2026-08-20 por Claude
> **Ultima actualizacion:** 2026-08-20 por Claude
> **Documentacion tecnica:** `docs/tasks/in-progress/TASK-1747-application360-assessment-access-recovery-ui.md`

## Qué se revisó

El cluster de recuperación de acceso dentro de la tarjeta `Evaluación` de Application 360, y los dos
diálogos que lo acompañan (confirmación deliberada y revelación única).

- Escenario: `scripts/frontend/scenarios/task1747-assessment-access-recovery.scenario.ts`
- Captura: `.captures/2026-08-20T07-08-35_task1747-assessment-access-recovery/`
- Viewports: `desktop` 1440×900 y `mobile` iPhone 13 (390px)
- Entorno: `local` — los marcadores `data-capture` de este slice no estaban en el deploy de staging
  al momento de capturar.

## Lo que la captura demuestra

**La pantalla ya no muestra ninguna credencial.** La aserción `notVisible` sobre
`a[href*="/public/assessment/access"]` pasa en ambos viewports. Es la causa directa del incidente
del 2026-08-19: la vista mostraba un enlace que el correo al candidato invalidaba dos minutos y
medio después.

**Cada bloqueo dice su causa.** La candidatura capturada tiene su test en `scored`, y el cluster
renderiza *"El test ya se rindió, así que no hay acceso que recuperar"* — no el mensaje genérico que
antes recibían por igual las cinco causas distintas. Una segunda captura sobre
`happ-f43c78d9-f65a-4c54-a322-392c02e9d2c3` ejerce el mismo componente sobre otra causa.

**390px sin overflow.** El cluster conserva título y cuerpo completos, sin truncado ni scroll
horizontal. Los gates de accesibilidad, layout, teclado y `reduced-motion` del escenario pasan con
`failOnViolations: true`.

## Lo que la captura NO demuestra, dicho explícito

- **La rama con acción disponible.** Hoy no existe en la base ninguna candidatura con un test
  recuperable: las que tienen assessment elegible están todas en etapa cerrada. El CTA con su cuota
  no está capturado.
- **La revelación única del enlace.** Exigiría emitir una credencial real contra una candidata real,
  rotando su acceso y consumiendo su cuota de 24 horas.
- **El estado `provider_blocked`.** Exige una dirección con rebote registrado en el proveedor.

Las tres se verifican en la secuencia de staging del Rollout Plan. Declararlas acá es preferible a
un escenario que aparente cobertura que no tiene.

## Juicio

La superficie es deliberadamente sobria: un estado bloqueado dentro de una tarjeta existente informa,
no compite. El diferenciador de este slice no es decorativo sino semántico — antes cinco causas con
cinco remedios distintos terminaban en la misma frase, y una de ellas le decía "no tienes permiso" a
un operador que sí lo tenía. Agregarle peso visual a un bloqueo sería empeorarlo.
