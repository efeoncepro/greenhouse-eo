# Creative Workbench — aislamiento multimarcas y multipersona

Estado: Accepted para arquitectura, 2026-09-29, decisión de Julio Reyes en esta conversación.
Implementación activa: producción modular SKY y Lab premium integral en Workbench. Versiones integradas, snapshot publicado y readbacks en [continuidad vigente](../operations/creative-production/WORKBENCH_CURRENT_STATE.md); TASK-1945 conserva onboarding/segunda marca, TASK-1946 distribución y TASK-1947 IA.

Greenhouse mantiene gobernanza/skills; ownership nativo y rutas gestionadas se distinguen por el sello vigente. No restaurar mirrors del template ni sync total. La revisión técnica de 126 referencias no concede aprobación comercial ni acredita acceso de todo el equipo.

Las reglas de composición SKY se versionan y verifican en Workbench, sin ampliar este ADR
ni el pack por inferencia. El [cierre local de alineación](../audits/creative-workbench/2026-10-01-sky-layout-feedback-closure.md)
documenta contenido `1.5.0` / destino `1.2.0`; no representa despliegue ni aprobación comercial.

## Contexto

El equipo Efeonce produce para varias marcas; SKY es el primer onboarding del nuevo contrato.
El workbench existente exporta herramientas y overlays de Efeonce. La separación por carpeta no
valida la identidad visual de sus dependencias. Una persona puede trabajar para varias marcas.

## Decisión

Mantener el taller compartido y sus controles canónicos. Compartir únicamente mecanismos técnicos
neutrales; valores, recursos, recetas y skills de marca se resuelven desde packs independientes.
Toda ejecución declara cliente/pieza, una marca, una versión exacta, operación y recursos por ID.
El catálogo gestionado vincula cliente con marca y pack sellado. Las referencias no se resuelven
mediante paths libres ni defaults. Un pack incompleto no puede pasar a producción por inferencia.
Cada corrida tiene carpeta exclusiva y lock con hashes de dependencias; dos personas no comparten
temporales ni salidas mutables. La persona declarada atribuye trabajo, no concede autoridad.

## Garantía y límites

El preflight local prueba contexto y procedencia de dependencias gestionadas y detiene errores antes
de producción. No prueba identidad humana, fidelidad del píxel, ni evita el bypass de alguien con
credenciales directas del proveedor. La garantía operacional exige wrappers integrados, permisos
efectivos y canaries de rechazo. La revisión visual sigue obligatoria: un modelo puede desviarse aun
con entradas correctas. No prometer imposibilidad absoluta de contaminación visual de una salida IA.
Los recursos aportados por proyecto requieren admisión y procedencia antes de volverse ID permitido.
Co-branding usa permisos explícitos, nunca una excepción general al aislamiento.

## Alternativas

Rechazadas: confiar en instrucciones de prompt; usar Efeonce como default; clonar el motor por marca;
autenticar personas mediante campos locales; habilitar todo pack al aparecer en el catálogo.

## Rollout

Foundation opt-in → wrappers y autoridad efectiva → packs SKY candidatos → validación visual →
release privado → referencia por marca → sync desde ref → readback del equipo. Ningún paso despierta
Globe. Una nueva marca se incorpora por datos/versiones, no cambiando lógica del motor.
Rollback: retirar consumer nuevo o volver a versión exacta anterior; nunca fallback a otra marca.

## Evidencia

Plan: `docs/operations/creative-production/CREATIVE_WORKBENCH_MULTIBRAND_PLAN.md`.
Figma SKY: `docs/operations/creative-production/sky-airline/figma-observed-variables.json`.
Pruebas de aislamiento y concurrencia en TASK-1945; estado vivo en su Status real.
