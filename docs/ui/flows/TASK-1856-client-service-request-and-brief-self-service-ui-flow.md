# TASK-1856 — flujo cliente

Diseño inicial, sin runtime. Backend en sus tasks dueñas; UI no decide permisos.

## Surface Inventory

Servicio → nueva solicitud → validación/envío → acuse → detalle/respuesta → completar información → resolución.

## State and Transition Contract

1. Resolver organización y servicio desde sesión/contexto permitido.
2. Mostrar reader y acción elegible; mantener inputs/contexto si hay error.
3. Validar y enviar al command idempotente; acuse sólo tras aceptación durable, sin fingir aceptación operativa.
4. Detalle revalida objeto y permite retorno; sesión ausente pasa por login y recupera destino interno permitido.
5. Cuenta incorrecta/revocación/retirada → estado seguro; no fallback silencioso a otro objeto o cuenta.
6. Aviso leído no resuelve el objeto; GET/scanner no muta. Preferencias permanecen en TASK-693.

## Focus and Recovery

Error summary enfoca el primer error y conserva valores. Escape sólo cierra acciones reversibles; cambios
sin guardar requieren decisión. Retorno al invocador o encabezado; no doble submit por retry.

## GVC Scenario Plan

1440/390px, premium, flujo normal/error/partial/denied, teclado, reduced motion, entrada por aviso con/sin
sesión, contexto ajeno y revocado. Capturar y revisar; no usar cliente como fixture técnico.

## Design Decision Log

Un recurso/detalle y un historial por objeto, sin rutas duplicadas. TASK-1834 posee login/selección de
contexto; consumers conservan deep links. UI ready no hasta validar mapping y first fold.
