# Opción 2 · Design QA

final result: passed

**Alcance:** aceptación técnica/visual de la preview local para revisión del operador, no aprobación de publicación, editor Elementor real, HubSpot ni GA4. Fecha:20/10/2026.

## Fuente y capturas

- Verdad visual: `/Users/jreye/.codex/generated_images/01a15b2b-221e-7f50-a679-4450a2e794f0/exec-ae3ee733-3c2b-4a38-98a6-206e708d2def.png`, opción2 elegida y re-adjuntada por el operador.1122×1402px; estudio desktop, no diseño móvil.
- Implementación: `http://127.0.0.1:8842/blog/`, PHP/CSS del widget sobre shell Ohio obtenido por GET, fixture editorial/Forms y aislamiento de red de escritura.
- Capturas: `.captures/2026-10-20-blog-option2/blog-full-1440.jpg` (1440×4172), `blog-first-fold-1440.jpg` (1440×1000), `blog-full-390.jpg`, `blog-first-fold-390.jpg` (390×844); controles adicionales320×844 y1024×900. Capturas1:1 respecto aCSS, sin duplicación de densidad.
- Comparación enfocada conjunta: `qa-hero-comparison.png` — referencia izquierda1122×532; implementación derecha reducida de1440 a1122 y recortada a546px de alto, manteniendo proporciones. No se han estirado ni recreado los screenshots.
- Comparación completa: referencia y captura1440 abiertas; recorridos desktop/móvil completos inspeccionados. Estado final: lectura inicial, temas cerrados, formulario vacío y consentimiento desmarcado. Fotos/partners cargados antes de captura.

## Hallazgos y correcciones

1. [P2 resuelto] Primera implementación: texto14px y navegación12px en desktop se veían más pequeños que la referencia. Corrección: cuerpo16px desde AXIS bodyLg y navegación16px; compactación del espacio del hero. Evidencia anterior `desktop-first-v1.jpg`, posterior `desktop-first-v2.jpg` y captura final.
2. [P1 resuelto] A1024px la fotografía invadía el párrafo blanco. Corrección: encuadre responsive independiente al fondo inferior derecho, copy con reserva48%, imagen78% en su ratio nativo. Primera corrección con recorte vertical se descartó por perder la mano humana. Evidencia anterior `blog-first-fold-1024.jpg`, final `blog-first-fold-1024-final.jpg` inspeccionada; conserva ambas manos y separación legible.
3. [P2 resuelto] A320px “Todos los temas” obligaba una fila adicional. Se muestra “Temas” en móvil con el mismo disclosure nativo; navegación en una sola fila. Captura final `blog-first-fold-320.jpg`.
4. [P2 resuelto] Herencia de `.eo-blog img` anulaba el tamaño máximo del logoGlitch móvil. Se corrigió especificidad del max-width; el archivo sigue siendo SVG oficial.
5. Estado de ensayo eliminado: la primera captura móvil restauraba el email sintético de validación. La preview limpia sólo la clave de borrador de este formulario en su origen localhost; la captura final muestra estado inicial vacío. No cambia persistencia del renderer productivo.

## Superficies de fidelidad

- **Tipografía:** Bricolage Grotesque oficial, hero760/line-height1/tracking-.035em; Poppins funcional, cuerpo16px. La tipografía generada es aproximada: se conserva la familia real de la marca, no se rasteriza el titular. Tres líneas dominantes de escritorio como el concepto; reflow sin truncamiento en móvil.
- **Espaciado y ritmo:** bloque navy principal≈700px a1440, frente a≈683px equivalentes de la referencia. Dos lecturas principales sobre papel, tres secundarias, Glitch destacado/archivo, objetivos, recursos y suscripción. Columnas móviles resueltas sin overflow a320/390/1024/1440.
- **Color:** rolespaper/navy/dark de AXIS. MCM negativo original; Glitch conserva su sublínea. Formulario teal aprobado sin cambios. Sin scrim ni gradienteCSS detrás del texto: el lecho proviene del arte dedicado.
- **Imagen:** arte generado desde la opción elegida, WebP1774×887,69298bytes; sujeto/foco/luz comparados con referencia. Sólo se asocia al artículo249387. Otras lecturas mantienen sus imágenes reales; títulos/fechas no se regeneran. Logos originalesSVG de AXIS; flecha/plusSVG de Tabler MIT, no dibujos manuales.
- **Copy:** titular breve de lectura destacada adoptado del concepto; título original en aria-label/destino. Se conserva el copy real de artículos y formulario. El enlace inventado del mock “Ver todos los artículos” se sustituye por un objetivo real, sin crear un archivo ficticio.

## Diferencias deliberadas respecto al recorte conceptual

- Header-6/sidebar/pie heredados de Ohio conservan sus geometrías y tonos actuales. No se reemplaza el shell global por una aproximación del mock; la barra queda clara. Es el límite canónico del alcance de esta página (TASK-1802/PDR-027), no un defecto nuevo del widget.
- La captura conceptual no incluía objetivos/recursos, tres lecturas adicionales ni todo el footer. Se conservan en la implementación completa requerida, por eso es más larga.
- El footer mantiene su newsletter histórico, de otro dueño; no se ejerce ni sustituye en esta preparación.

## Interacción, accesibilidad y límites

-12 temas reales; disclosure nativo abierto/cerrado por Enter, foco visible. Sin enlacesplaceholder ni anchors internos sin destino.
-9 artículos únicos, unH1, unGrowthForm del blog, sin imágenes rotas. Enlaces editoriales mantienen markers de medición.
-Formulario vacío genera errores; Gmail es válido como email y el consentimiento ausente impide continuar. Checkbox inicialmente desmarcado. No se hace envío positivo ni se crean contactos/conversiones.
-Consoleerrors consultado:[] en la sesión de revisión. Preview elimina trackers y bloqueaPOST/PUT/DELETE; CSPconnect-src self/form-action none/frame-src none. No sustituye el posterior QA de integración publicada.
-Reduced-motion conserva regla de no-escalado. Contrastepapel/navy y blanco/navy heredado de tokens; esta revisión no acreditaWCAG completa ni lector de pantalla completo.

## Checklist

- [x] Fuente exacta resuelta y comparación conjunta enfocada.
- [x] Diseño implementado en runtime existente y develop.
- [x] Capturas completas desktop/móvil inspeccionadas;320/1024 adicionales.
- [x] P0/P1/P2 de esta preview corregidos.
- [x]21 pruebasPHP selección/render +6 widget; ESLint del paquete.
- [ ] Aceptación final del operador sobre este render.
- [ ] Integración/edición en Elementor no productivo.
- [ ] Publicación y pruebas reales HubSpot/GA4 con autorización separada.

**PolishP3:** el crop del hero generado no es idéntico píxel a píxel al estudio; conserva dirección, protagonistas y reserva. No se requiere otra generación para esta revisión.

## Iteración por anotaciones · 20/10/2026

**Resultado: passed para revisión local; aceptación visual del operador pendiente.**

Referencia: seis anotaciones del operador sobre la versión anterior, más `blog-option2/blog-full-1440.jpg`. Comparación conjunta: `blog-annotations/qa-resources-subscription-before-after.png` (anterior izquierda, nueva derecha; misma escala de escritorio, altura de las secciones deliberadamente distinta). Se revisaron también página completa y cabecera en móvil390, formulario320 y cabecera1024.

Hallazgos resueltos:

1. Eyebrow redundante de cabecera retirado.
2. Temas: 48px de alto, flex centrado, padding simétrico16px. Label24px e icon16px comparten centro vertical. Disclosure conserva Enter y12 enlaces.
3. Menú interno: destinos a las secciones existentes. «Lecturas por tema» explicita su propósito.
4. Objetivos parecía oferta de servicios: títulos por disciplinas y copy editorial, con los mismos archivos de categorías reales.
5. Recursos sin jerarquía visual: título56px máximo, portada real de guía, marca AEO oficial, superficies navy y enlaces legibles. En móvil se apilan y el título de la guía se acortó para evitar el corte aislado «web».
6. Suscripción débil: marca Glitch protagonista, headline mayor y panel claro de conversión. Se reforzó la especificidad del headline para que la regla móvil genérica no redujera su jerarquía. Sin huecos de altura fija en el formulario.

Verificación:21 checksPHP de selección/render +6 del widget, PHP lint y ESLint build. Sin overflow a320/390/1024/1440; imágenes del blog cargadas, anchors válidos, un Growth Form, email vacío y checkbox desmarcado; consola sin errores. No se ejercitó envío positivo. Tag Growth Form idéntico alcommit anterior; los campos/consentimiento/medición no cambian. El footer global sigue siendo el real, fuera de este alcance.

No hay diferencias P0/P1/P2 pendientes en el alcance de estas anotaciones. No se acredita integración Elementor publicada, aceptación HubSpot ni GA4 DebugView; permanecen en PUBLICATION-CHECKLIST.md.

## Segunda iteración por anotaciones · 20/10/2026

**Resultado: passed para revisión local; aceptación del operador pendiente.**

Referencia: tres nuevas anotaciones sobre atribución, impacto de temas e integración de suscripción. Antes: `.captures/2026-10-20-blog-annotations/blog-full-1440.jpg`; después: `blog-annotations-v2/blog-full-1440.jpg`. Comparaciones conjuntas inspeccionadas: `qa-topics-before-after.png` y `qa-subscription-before-after.png`, misma escala1440, anterior izquierda/nuevo derecha. Temas aumenta deliberadamente su altura para mostrar cuatro artes editoriales; no es un objetivo de paridad con el índice anterior.

- «Por Efeonce» retirado del renderer y CSS, en escritorio/móvil.
- Categorías: cuatro imágenes conceptuales propias, tipos grandes y destinos editoriales conservados; no son fichas de servicios ni cifras inventadas. El título de sección se balanceó en dos líneas después de revisar la primera captura. Sin iconografía oficial reinterpretada ni logos generados.
- Glitch: eliminados panel claro y eyebrow redundante. Formulario sobre el mismo navy, con roles explícitos para campo, texto, borde y errores. No cambia el tag Growth Form ni el contrato de integración.
- Checks:21PHP selección/render +6widget; PHP lint/ESLint;0overflow a320/390/1024/1440; imágenes cargadas, anchors válidos, un formulario vacío con consentimiento inicialmente desmarcado; consola sin errores. Validación negativa por correo/consentimiento visibles, sin envío positivo.
- Contrastes calculados desde colores observados/tokens: texto del campo15.07:1, placeholder8.72:1, borde contra sección7.88:1, texto de error contra su fondo7.36:1. Esto no acredita auditoríaWCAG completa.
- Capturas completas y detalles finales guardados en `blog-annotations-v2/`; versión móvil inspeccionada. No pendientes P0/P1/P2 observados en el alcance de estas tres anotaciones. Publicación/Elementor/HubSpot/GA4 real siguen pendientes de autorización y checklist.
