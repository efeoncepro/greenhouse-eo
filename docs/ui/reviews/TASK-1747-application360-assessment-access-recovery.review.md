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
- Captura: `.captures/2026-08-20T07-35-25_task1747-assessment-access-recovery/`
- Viewports: `desktop` 1440×900 y `mobile` iPhone 13 (390px)
- Entorno: `local` — los marcadores `data-capture` de este slice no estaban en el deploy de staging
  al momento de capturar.

## Lo que la captura demuestra

**La pantalla ya no muestra ninguna credencial.** Esto lo sostiene un gate de FUENTE
(`assessment-credential-source-gate.test.ts`), no la captura — y la distinción importa: una aserción
sobre el DOM sólo prueba la rama que se renderizó, y la rama que mostraría el enlace exige emitir
una credencial real. La primera versión de este dossier citaba una aserción `notVisible` sobre
`a[href*="/public/assessment/access"]` como prueba de la garantía; era vacía por partida doble: la
credencial nunca se renderiza como ancla, y el enlace del incidente vivía en OTRO path
(`/assessment/<token>`), así que ese selector no habría atrapado el bug que esta task cierra.

**Cada bloqueo dice su causa.** La candidatura capturada tiene su test en `scored`, y el cluster
renderiza *"El test ya se rindió, así que no hay acceso que recuperar"* — no el mensaje genérico que
antes recibían por igual las cinco causas distintas. Una segunda captura sobre
`happ-f43c78d9-f65a-4c54-a322-392c02e9d2c3` ejerce el mismo componente sobre otra causa.

**390px sin overflow.** El cluster conserva título y cuerpo completos, sin truncado ni scroll
horizontal de página. Los gates de accesibilidad, layout y teclado pasan con `failOnViolations`, y
el check de `reduced-motion` **ahora sí se ejecuta**: la sonda no declaraba `expectedVisibleSelector`
y el gate lo saltaba en silencio mientras el dossier lo citaba como cobertura.

## Lo que la captura NO demuestra, dicho explícito

- **La rama con acción disponible.** Hoy no existe en la base ninguna candidatura con un test
  recuperable: las que tienen assessment elegible están todas en etapa cerrada. El CTA con su cuota
  no está capturado.
- **La revelación única del enlace.** Exigiría emitir una credencial real contra una candidata real,
  rotando su acceso y consumiendo su cuota de 24 horas.
- **El estado `provider_blocked`.** Exige una dirección con rebote registrado en el proveedor.

- **Los dos diálogos.** Ninguno se abre en el escenario, así que su apilado a 390px con la primaria
  a ancho completo y la restauración de foco están sostenidos por lectura de código, no por frame.
  Los gates de accesibilidad y layout están scopeados a la tarjeta, que no contiene ningún diálogo.

Las cuatro se verifican en la secuencia de staging del Rollout Plan. Declararlas acá es preferible a
un escenario que aparente cobertura que no tiene — que es exactamente el error que cometió la
primera versión de este slice.

## Defectos que la auditoría adversarial encontró en este mismo slice

Se registran porque el patrón importa más que los arreglos: **los cuatro gates estaban verdes
midiendo, con rigor real, un alert estático — y nada más.**

- La acción primaria del diálogo NO quedaba a ancho completo en móvil: el reemplazo falló en
  silencio porque la línea objetivo había cambiado en el slice anterior, y el mensaje del commit
  afirmó "verificado en captura real" sobre un diálogo que ninguna captura abrió.
- El `aria-live` agregado era inerte: envolvía Alerts que YA eran regiones vivas, y en regiones
  anidadas gana la más cercana al cambio. Peor, el rol interno era `alert` (assertive), justo lo
  contrario de lo que el commit decía haber elegido.
- El foco no volvía al disparador tras cerrar la revelación única: la llamada era síncrona dentro
  del handler, con la trampa del diálogo todavía activa.
- El botón de reintentar no daba ninguna señal: si la lectura volvía a fallar, el DOM quedaba
  idéntico y era indistinguible de un botón muerto.
- La mascota flotante de Nexa se superpone al borde derecho del cluster a 390px, y el gate de layout
  **no detecta oclusión** — su verde no era evidencia sobre eso.

## Juicio

La superficie es deliberadamente sobria: un estado bloqueado dentro de una tarjeta existente informa,
no compite. El diferenciador de este slice no es decorativo sino semántico — antes cinco causas con
cinco remedios distintos terminaban en la misma frase, y una de ellas le decía "no tienes permiso" a
un operador que sí lo tenía. Agregarle peso visual a un bloqueo sería empeorarlo.
