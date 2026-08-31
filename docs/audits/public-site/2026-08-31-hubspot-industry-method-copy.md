# HubSpot: copy de industrias, primer paso y método

Pedido: mejorar completas las tres secciones señaladas en `/servicios-contratar-hubspot/`, página 244079,
con `copywriting`, preservando diseño e interacciones. Continuación de la [revisión editorial previa](2026-08-31-hubspot-editorial-copy.md).

## Decisiones de redacción

Voz institucional Efeonce, lector que evalúa implementar HubSpot. Se aplicaron `copywriting` y
`greenhouse-ux-content-accessibility`, reutilizando el overlay y el módulo de narrativa ya cargados.
El esquema problema/objetivo/punto de partida guía industrias; primer paso explica una decisión comercial;
el método concreta acción, resultado y validación. Sin nuevo wireframe ni cambio de estilos.

- Industrias: «HubSpot, adaptado a cómo trabaja tu industria.» Revisión de los cuatro paneles: general,
  servicios profesionales/B2B, SaaS/tecnología y manufactura/distribución. Se explican dificultades posibles,
  datos a conectar y punto de partida, sin afirmar experiencia sectorial no demostrada ni prometer que
  HubSpot sustituya un ERP. Se conservan nombres y destinos de familias de servicio para continuidad con el atlas.
- Primer paso: «Aclara qué necesitas antes de implementar.» Las tres tarjetas distinguen reunión gratuita,
  análisis técnico opcional de pago y ejecución por alcance. Blueprint se explica como plan de implementación,
  cotizado por separado y útil incluso con otro implementador. Fuente: `HUBSPOT_OFFER_ARCHITECTURE_V2.md`,
  modalidades de contratación; no se amplía la promesa de consultoría gratuita.
- Método: «Tu implementación de HubSpot, paso a paso.» Cinco etapas; primer botón «Revisar». Textos completos
  de cada panel: acción, entregable y aprobación. «Rollback», «cadencia» y «backlog» se sustituyen por
  explicaciones concretas. La operación continua se presenta condicionada a su contratación.

## Publicación acotada

Tres schemas (sectors, assessment, delivery), sin modificar templates, CSS, JS, fuentes, logos, formulario,
metadatos SEO ni shell Ohio. Overlay editorial acumulativo en `scripts/public-website/hubspot-editorial-copy.json`;
se aplica después del adapter de marcas. Guardado nativo Elementor; ocho widgets restantes protegidos.
No se modifican otras páginas, ni se hace commit/push o despliegue de Greenhouse.

- Snapshot `_gh_hubspot_copy_20260831_112547`.
- Backup `/tmp/eo-hubspot-before-20260831-112652.tar`.
- Hash anterior `be2dad7df7a986d037ce809c2150b05ffa33d92f4c3936f92c8b3ce5711bd1db`.
- Hash posterior `cc9710c8adca07e54058c31e7edcecb0a80d78d2c95abf3e8042f3bddd2afe72`.
- [Manifest](2026-08-31-hubspot-industry-method-copy-manifest.json).

Rollback: recuperar desde el snapshot solo los campos afectados mediante Document::save, conservar imagen
principal/settings, restaurar los tres schemas del backup y purgar caché. Primero comprobar que no haya
ediciones posteriores. Nunca escribir `_elementor_data` directamente.

## Verificación

PHP PASS: 190 campos editables/escaped, controles nativos y reordenamiento. Preview en shell público con
Playwright enfocado (DOM, navegación y paneles no representados en el escenario autenticado de Greenhouse):
60 estados, tres anchos 1414/878/390 y ambos modos de movimiento; nueve paneles y primer paso.
Capturas `.captures/hubspot-section-copy-20260831/`; overflow comprobado tras estabilizar las transiciones
existentes, sin modificar ni ocultar UI. No se crean leads ni se envía el formulario.

**Resultado público PASS**, 11:27:34 UTC: 60 estados, teclado, cero errores JS, todos los paneles disponibles
sin JavaScript. Los otros ocho módulos coinciden en HTML con la captura anterior. Title y description intactos.
Readback nativo exacto: 82 campos cambiaron (97 asignaciones, incluidas etiquetas conservadas), sin otro delta
en el árbol Elementor; hashes de los tres schemas verificados. Metadata protegida y hashes Home/Creative/AEO
sin cambios. [Evidencia](2026-08-31-hubspot-industry-method-copy-evidence.json).

`qa:gates --changed --agent codex` ejecutado; cierre documental conserva los dos avisos del WIP previo
(project context y registro de skills). No se agrega contrato global ni skill. Context strict sin errores/avisos.
