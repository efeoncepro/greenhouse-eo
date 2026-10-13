# Efeonce Rooms — experiencia completa V1

Fecha: 2026-10-07. **Proposed para revisión del operador; ninguna pantalla implementada o aceptada visualmente.** [ADR](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) · [Dirección visual](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).

## Design system decidido

La órbita, gobernada por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md), rige toda la experiencia Rooms: entrada, autoría, exploración, consola y audiencia. Bricolage lleva títulos/voz editorial; Poppins lectura, notas, navegación y controles. Papel/navy, acentos, iconografía, estados y motion siguen sus contratos distribuidos en AXIS. Las piezas del cliente mantienen su marca. No se convierte el relato en preguntas/respuestas obligatorias. Ver [roles visuales](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).

## 1. Promesa y modelo de interacción

Una sala permite entender una propuesta creativa, SEO/AEO o combinada, experimentar el trabajo y defenderlo en una decisión de compra. La inmersión nace del protagonismo del trabajo, la continuidad entre vistas y la capacidad de inspeccionarlo. No depende de recorrer un escenario 3D ni de animaciones permanentes.

Tres experiencias sobre una edición coherente: **crear**, **explorar**, **presentar**. Evaluar y conversar acompañan la exploración; no son un cuarto sitio separado. El PDF técnico y el anexo gráfico conservan su autonomía y se enlazan a la sala cuando corresponda.

## 2. Llegada y primer contacto

Tras el acceso autorizado, aparece el cliente, la propuesta y una pieza o demostración dominante real según el perfil. Una frase sitúa el reto y la promesa; acción principal «Explorar propuesta», acceso secundario al PDF y mapa. El champion dispone de «Preparar presentación» según permiso. No autoplay audible ni introducción obligatoria.

El primer viewport contiene trabajo creativo o un hallazgo/demostración SEO/AEO con su ámbito visible; no una portada vacía. La marca Efeonce enmarca discretamente la experiencia; la identidad del cliente gobierna sus piezas. El regreso ofrece continuar en la última posición autorizada o empezar de nuevo, indicando la edición si cambió. Nada sustituye silenciosamente una versión presentada anteriormente.

## 3. Narrativa y disponibilidad del material

Recorrido creativo recomendado: reto → idea → método → sistema creativo → aplicaciones → ejecución/técnica → próximos pasos. Para SEO/AEO: oportunidad → muestra → radiografía → distribución → plan/medición → decisión. Los [perfiles](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) definen la interacción especializada; una sala puede combinarlos. Es una plantilla editable, no una secuencia obligatoria para toda propuesta. El equipo puede empezar por una demostración y explicar el método después.

Cada capítulo tiene una idea dominante, evidencia vinculada y piezas pertinentes. El mapa permite saltar y volver. La biblioteca conserva **todo el inventario autorizado**, con búsqueda/filtros por concepto, formato, tipo y perfil; incluye bloques editoriales, diagnósticos, planes y evidencia además de medios; el recorrido breve no elimina el resto. El editor muestra cobertura y exclusiones antes de publicar.

## 4. El escenario de piezas

Una pieza ocupa el escenario con controles contextuales discretos. Abrir una miniatura mantiene continuidad visual hacia su lugar ampliado. La pieza nunca se deforma durante la transición. «Ver pieza», «Ver en contexto» y «Fundamento» son capas explícitas, con retorno estable.

| Material | Experiencia y comportamiento |
|---|---|
| Imagen estática | Ajustar a pantalla, inspeccionar detalle, zoom y pan con límites; reset visible y teclado equivalente |
| Adaptaciones | Selector 9:16, 4:5, 1,91:1, 16:9 u otro ratio real; muestra solo variantes existentes, con nombre y propósito |
| Mockup contextual | Encendido explícito, marco adecuado y contenido real; vista limpia recuperable en un gesto |
| Comparación | Dos piezas identificadas en marcos propios; no estirar ratios diferentes. Slider solo si son capas registradas del mismo canvas |
| Pieza larga | Lectura vertical a escala útil, localización y regreso; evitar miniatura ilegible o doble scroll atrapado |
| Carrusel/PDF | Secuencia completa y paginación; saltar a una página y recuperar la posición. PDF no sustituye los medios originales |
| Video | Ratio nativo, poster, controles, captions disponibles, scrub y anclas temporales; estado real de buffer/reproducción |
| Audio | Waveform de peaks reales, play/pause, scrub, duración y transcripción si existe; silencio visual al pausar |

El gesto táctil tiene equivalente accesible. No bloquear pinch zoom del navegador en toda la app. Zoom interactivo solo dentro de un visor activado y con salida clara. Pan sincronizado únicamente entre imágenes de coordenadas compatibles. No comparar videos con sincronía prometida sin contrato específico posterior.

Una sola fuente audible a la vez. Al reproducir en audiencia, la consola mantiene su preview silenciada. Si falta una transcripción o adaptación se declara ausente; la UI no la inventa. Los mockups son contexto explicativo, nunca evidencia de una publicación real.

## 5. Método y evaluación

«Por qué funciona» abre un panel editorial con decisión creativa, fundamento y vínculo al criterio de la licitación cuando existe. «Cómo se ejecuta» muestra técnica, entregables y evidencia proporcionada. En desktop acompaña; en móvil ocupa una vista legible con retorno al mismo punto.

Una matriz opcional vincula criterios → argumento → piezas → evidencia. Indica cobertura pendiente; no asigna puntuaciones de adjudicación automáticas. El evaluador puede formular una pregunta desde pieza/página/timecode sin describir dónde estaba. Visibilidad y destinatarios se muestran antes de enviarla.

## 6. El champion antes de la reunión

El champion dispone de un recorrido recomendado, resumen de argumentos y respuestas preparadas por el equipo. Puede elegir un recorrido y guardar notas propias sin modificar la edición oficial. Notas de agencia, privadas del champion y contenido del comité nunca se mezclan.

El ensayo permite navegar, ver duración transcurrida y probar los medios. Preflight muestra permisos, edición, recursos listos, popup/pantalla de audiencia y prueba de sonido real. «Listo» significa readiness observada, no solo que se envió un comando. El material faltante impide declarar preparado el tramo afectado y ofrece reintento o salto explícito.

## 7. Durante la presentación

Consola: escena actual, siguiente, mapa, notas autorizadas, tiempo y estado de audiencia. Pantalla de audiencia: pieza y relato, sin herramientas de autor ni notas. Dos ventanas del mismo navegador permiten compartir solo la limpia. También existe modo de una ventana sin notas privadas visibles.

El operador avanza por el tour, abre una adaptación o evidencia ante una pregunta y vuelve exactamente a la escena y posición anteriores. El recorrido conserva un stack de retorno; explorar no destruye la secuencia. Puntero de presentación opcional, temporal y activado por el operador; sin cursor decorativo permanente.

La edición queda fijada durante la sesión. Cambios nuevos no aparecen de golpe. Al perder conexión con consola, la audiencia conserva la escena actual y muestra recuperación discreta; jamás avanza sola. El navegador puede requerir gesto para sonido/fullscreen. El producto comunica el bloqueo y ofrece reproducción manual.

V1 no incluye control remoto desde otro dispositivo, videollamada ni grabación de la reunión. La consola puede convivir con la herramienta de reunión habitual. La audiencia debe activar sonido cuando el navegador lo exija; [restricción de autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

## 8. Después de la presentación

La sala queda disponible para quienes deciden sin haber asistido. El champion comparte una escena o pieza según la política de acceso; el enlace no amplía permisos. Preguntas, respuestas y próximos pasos simples mantienen su ancla a la edición. Un cambio relevante permite revisar la edición nueva sin borrar lo evaluado anteriormente.

El responsable comercial observa actividad verificable y asuntos abiertos. «Vio el video» exige eventos reales de reproducción y cobertura definida; no significa que esté convencido. HubSpot conserva la oportunidad y su resultado comercial.

## 9. Autoría y operación multicanal

Inicio desde plantilla creativa, SEO/AEO o combinada, o manifest: contexto → inventario → agrupación de piezas/variantes → relato y método → tours → revisión de cobertura → preview por rol → publicación. Importar PDF completo conserva todas las páginas, aunque algunas no formen parte del tour principal.

Editor desktop en tres zonas: inventario/estructura, escenario real y propiedades del elemento seleccionado. El centro usa el mismo renderer del comprador. Se puede plegar la edición y explorar en contexto, con una indicación inequívoca de preview. El estado de procesado y los errores viven junto al archivo, con reintento individual.

CLI y MCP pueden ejecutar todo el ciclo durable sobre el mismo contrato: subir, ordenar, vincular, versionar, publicar y administrar acceso. La UI no concentra privilegios especiales. Publicación y concesión de acceso son decisiones distintas y auditadas.

## 10. Móvil, accesibilidad y fallos

Móvil tiene navegación propia de pantalla pequeña: pieza primero, controles al alcance, mapa bajo demanda y paneles a ancho completo. No es la consola desktop encogida. La exploración y evaluación funcionan; se recomienda desktop para operar consola y segunda pantalla.

Teclado, foco visible, lectores de pantalla, texto ampliable, contraste medido y captions según material. Reduced motion elimina desplazamiento espacial y conserva estado/foco. Gestos y hover nunca son la única vía.

Carga lenta conserva poster y geometría, con progreso real cuando se conoce. Error permite reintento y retorno; caducidad de acceso tiene mensaje específico. Sin conexión no se promete disponibilidad offline: mostrar lo ya disponible y marcar recursos pendientes. Nunca reemplazar una pieza fallida por otra edición sin informar.

## 11. Verificación pendiente

Probar con dos propuestas de marcas diferentes, una creativa y una SEO/AEO, con el inventario completo de cada una; añadir un tour combinado autorizado de una misma marca. Incluir lectura editorial, acoplamiento de radiografía, linaje, fuentes y plan/medición. Un champion que no creó la sala debe poder preparar, presentar, responder abriendo una pieza y retornar sin asistencia. Validar desktop/móvil, todos los tipos de medios, pérdida de red, audio bloqueado y notas privadas ausentes del payload de audiencia. La aceptación visual requiere render real y revisión del operador.

## 12. Inmersión SEO/AEO

El comprador lee una landing/artículo completo y luego activa «Ver radiografía». Seleccionar un fragmento revela la decisión editorial/técnica y la evidencia que la sostiene. Puede recorrer un derivado y volver al origen, inspeccionar el diagnóstico y entender qué se propone hacer y medir. La consola conserva capítulo, bloque, selección y scroll al volver al tour. El [contrato de perfiles](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) es dueño del detalle, los estados y la continuidad con AEO X-ray.

Los datos se exploran como evidencia, con fuente/fecha/ámbito presentes. Un escenario permite revisar supuestos cuando existe un modelo autorizado; una cifra ilustrativa nunca se convierte en resultado medido. Esta experiencia comparte acceso, edición, presentación y evaluación con la creativa, sin obligar a pasar por una galería multimedia ni reconstruir el X-ray como PDF.
