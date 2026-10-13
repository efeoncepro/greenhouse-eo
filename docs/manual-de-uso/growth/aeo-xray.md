# AEO X-Ray — manual operativo

Actualizado: 30/09/2026. Runtime: `efeonce-think`, `think.efeoncepro.com`.

Este es el punto de entrada del manual en la taxonomía Greenhouse. El runbook completo,
versionado desde la herramienta original, se conserva como dueño canónico; no duplicar sus
comandos ni procedimientos de acceso en otro manual.

- [Manual completo](../../think/radiografia-aeo-manual.md): tres carriles de acceso, cuatro etapas,
  bienvenida y motion, landing/artículo, valor SEO/AEO, medios/video, QA, publicación Think,
  diagnóstico, retiro y contratos del carril Greenhouse pendiente.
- [Preparar otro cliente](../../think/aeo-xray-nuevo-cliente.md): kit, expediente privado, intent y
  assets, revisión de contenido/diseño, comandos y publicación autónoma autorizada.
- [Documentación funcional](../../documentation/comercial/radiografia-aeo-muestra-de-trabajo.md):
  propósito, roles, valor demostrado y límites comerciales.
- [Arquitectura](../../think/radiografia-aeo-architecture.md) y [ADR](../../architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md).
- [Handoff de publicación](../../think/aeo-xray-release-handoff.md): evidencia y pendientes de rollout.

## Elegir antes de actuar

1. Para preparar contenido: kit fuera de Git y `fixture-client` exclusivamente DEV.
2. Para enviar demo autorizada hoy: muestra `sample_*` pública no listada, deploy **Think solo**.
3. Para información privada o revocación/TTL: carril `xrg_*`; release y canary Greenhouse pendientes.

El enlace concreto se lee del expediente privado/registro runtime; no documentar la clave en Git.
Una visita al sample no acredita resultados SEO/AEO ni controles Greenhouse productivos. Envío
de email y escritura CRM requieren autorización propia. Assets, grants y datos de otro cliente
nunca son plantilla del siguiente; extender la experiencia existente, no construir otra UI paralela.

## Delta 2026-10-09 — bloques de experiencia temprana

El contrato 0.2.0 permite sumar a una muestra el panel AEO, «hoy vs. con la pieza», la revisión, la medición y el
siguiente paso. Para operarlos:

1. Declarar `version: "0.2.0"` en el intent y completar sólo los bloques que tengan datos reales y fechados.
2. Validar y construir con el kit (`client-kit.mjs validate|build`) y copiar el manifest al JSON publicado.
3. Correr los gates de Think sobre los artefactos de la muestra (`XRAY_VERIFY_ARTIFACTS`) y la regresión de las
   muestras ya publicadas.

Campos y reglas: [guía, §«Bloques de experiencia temprana»](../../think/aeo-xray-nuevo-cliente.md#bloques-de-experiencia-temprana-contrato-020-2026-10-09).
Gates y trampas: [manual, delta 2026-10-09](../../think/radiografia-aeo-manual.md#delta-2026-10-09--dos-muestras-publicadas-y-gates-por-artefacto).
Caso de referencia: muestra Pibank Perú.
