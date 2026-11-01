# Product Design — revisión de Rooms, 2026-10-25

## Alcance y objetivo

Por petición expresa de Julio, se aplica Product Design sobre el consumidor ya construido. Target existente: código Rooms, La órbita, logo oficial y primera propuesta sintética. Objetivo: explorar trabajo creativo completo, leer contenido SEO/AEO con contexto y separar vistas por autoridad. No se reinicia el stack ni se inventa una aprobación visual. Preflight del plugin: sin user-context guardado; se usa el contexto vigente de esta conversación.

Skills aplicadas: Product Design index, get-context, audit y critical-overrides; apoyo de QA visual Greenhouse. Captura de auditoría en navegador integrado (IAB), build local optimizado. No se infiere cumplimiento WCAG completo a partir de screenshots.

## Recorrido y hallazgos

1. **Entrada.** `01-entry-before.png` mostró arte SVG provisional y lockup Rooms con poco contraste sobre navy. Se sustituyen por tres piezas fotográficas sintéticas terminadas en formatos propios y lockup blanco oficial. `02-entry-after.png` conserva jerarquía editorial, Bricolage/Poppins, CTA único y arte íntegro. P2 corregido: calidad del material y legibilidad de la marca.
2. **Inspección de pieza.** `03-piece-detail.png` mostró un lienzo claro sobredimensionado; la pieza se veía menor que en la portada. P2: desaprovechaba el espacio de inspección. Corrección solicitada: galería oscura, menos chrome, imagen ampliada, acceso real al original y cierre superior. `09-piece-detail-after.png` verifica imagen mayor (~435×544 frente a343×429 en el visor previo a1280×720), galería oscura y cierre inmediato. El original está disponible por enlace real.
3. **Lectura editorial.** `04-editorial.png`: columna legible, metadatos secundarios y cuatro fragmentos con radiografía. No es un PDF rasterizado. Jerarquía coherente y siguiente acción clara.
4. **Radiografía.** `05-evidence.png`: hipótesis, ausencia de medición, fuente y método explícitos. P2: cierre al final de un contenido largo. Corrección: botón superior disponible al abrir; `11-mobile-evidence-after.png` verifica su posición y lectura a390×844. Escape y retorno al fragmento conservados; el contenido largo sigue desplazándose.
5. **Operador.** `06-operator.png`: salas y notas por ámbito, layout sobrio distinto de la sala cliente. P2 de copy: sentinel técnico visible en nota; sustituido por frase interna natural, manteniendo prueba de no filtración.
6. **Administrador.** `07-administrator.png`, `08-access.png`: consulta de accesos añadida sin simular invitaciones. Estados de permiso y disponibilidad separados. Muestra de una sola sala; no acredita gestión de usuarios real.

## Cinco superficies de calidad

- Tipografía: Bricolage en títulos, Poppins en función/lectura; fuentes locales efectivas comprobadas por tests. Desktop y móvil revisados; ampliación de texto200% incluida en QA.
- Espaciado/proporción: entrada con respiración editorial, arte dominante sin recorte; inspector se ajusta después del primer hallazgo. Evitar decorar con tarjetas repetidas.
- Color/tokens: valores de marca desde AXIS. Correcciones de contraste en copy y variante blanca del logo. El texto incrustado en arte fotográfico se revisa visualmente, no queda certificado por axe.
- Imagen: tres PNG propios generados con ImageGen para Nómada ficticia, copy español dirigido, hashes/procedencia en `public/demo/provenance.json`; no son imágenes de clientes ni Efeonce corporativa. Next Image muestra `contain` y ratios reales, sin dibujos de código sustitutos.
- Contenido: demostración, estados y límites explícitos; notas técnicas retiradas del producto; no hay éxito falso ni resultados comerciales inventados.

## Límites

La revisión propone calidad para la primera entrega; no constituye aceptación humana. No hay fuente visual aprobada para una comparación pixel-perfect: es una mejora del target de código existente, no un clon de Figma. Datos, personas y evidencias son sintéticos. Integración de identidad, persistencia, publicación y piloto real se certifican en etapas propias.

## Cierre de iteración

Los hallazgos P2 se corrigieron y se recapturaron en IAB; `10-mobile-entry.png` verifica la entrada móvil cargada. El primer recorrido encontró mejoras reales; las capturas anteriores se conservan como historial, no como resultado final. GVC y E2E finales se enlazan desde la auditoría técnica. No quedan hallazgos P0/P1/P2 abiertos para esta entrega local; aceptación visual del operador pendiente.


Verificación final:25 pruebas de navegador pasan (3 duplicados API omitidos); GVC premium4 variantes/68 frames sin hallazgos. `12-tablet-landscape-after.png` prueba el ajuste del ancho intrínseco del16:9 (right985 dentro del viewport1024), sin esconder overflow ni recortar. El run final es `.captures/2026-10-25T20-49-52_rooms-first-experience/`. Resultado de auditoría de mejora: passed para revisión local; no aceptación humana ni comparación pixel-perfect.

Pulido P3 conservado: compactar la introducción repetida de fragmento/títulos en radiografía móvil. Revisión independiente4.554/5, piso4.25 en densidad, en `independent-review.md`; calidad local aprobada por los revisores, aceptación humana pendiente.
