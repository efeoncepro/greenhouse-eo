# Deck SEO/AEO: decisiones del operador y pendientes (2026-09-29 → 2026-09-30)

Fuente: comentarios del operador en el canvas https://claude.ai/artifact/KDkuVM5nvX6uAyBeo3Td9n y mensajes de la sesión
«SEO deck para brochure y propuestas». Cierre: «Bien, […] todo esto está aprobado […] hay que canonizar […] hay que
enviar a axis packages y al lab, esto está aprobado todo» (2026-09-30).

## Decisiones (aprobadas)

1. **SEO al mismo nivel que AEO.** Search Visibility 360 (SV360) es la marca paraguas; sus piezas son AEO Assessment, AI
   Visibility Report y Efeonce Insights. Los logos de submarca van en las láminas que corresponden (inventario, brecha 1).
2. **AEO de cine sin eyebrow** («Visibilidad en IA» fuera) y el lockup Efeonce | AEO en su lugar.
3. **Estilo «vive»** para las láminas nativas (plataforma de luz, fichas de vidrio en perspectiva, una sola sombra
   profunda en la protagonista, haces de luz), consultado con la sesión «Línea gráfica evergreen Efeonce».
4. **Nada de capturas chicas de la web**: los servicios se muestran con maquetas nativas grandes y legibles.
5. **Insights**: la lámina de formatos cuenta el valor (sin armar el PPT, en vivo, con lectura escrita por la IA) y el
   informe vivo va en **interfaz blanca**, coherente con las demás UI del deck (Vívelo, Frame.io).
6. **Día a día («vívelo»)**: herramientas + Vívelo 1 (Notion + Frame.io con una landing en revisión) + Vívelo 2
   (resultados). Frame.io quedó como en la receta; confirmar que el equipo SEO aprueba ahí (pendiente menor).
7. **Secciones de cine**: «Quiénes somos», «Nuestro equipo» (con bajada de roles en personas: copywriters, especialistas
   en SEO técnico, relacionistas públicos, diseñadores y creativos) y la sección partida SV360 con la imagen épica de
   búsqueda + composer. **Rechazada** la sección del dolor («No a ti»): «ataca al cliente, rompe el esquema del deck».
8. **Una sola sección partida por deck** (el validador trata `section-split` y `-panel-end` como alternativas).
9. **Navegación por capítulos** (5): el problema · SV360 y SEO · AEO · cómo trabajamos · por qué nosotros.
10. **Lámina de desarrollo end to end** (React, Liquid, HTML, Drupal…) épica con una persona de Efeonce.
11. **Casos de éxito**: BICECORP (foto de la clienta en la terraza), Banco BICE (tarjeta con su logo + búsqueda +
    composer) y Berel (sesión de trabajo del squad). **Las cifras son de ejemplo** hasta que el operador pase las reales.
12. **Industrias** (Banca y finanzas, Seguros, Retail, Manufactura, Servicios profesionales, SaaS) con la pregunta que ese
    comprador le hace a la IA, y **mercados** (Chile, EE. UU., Colombia, México, Perú) de forma épica.
13. **Anotaciones fuera del deck**: «datos de ejemplo», «preguntas de ejemplo», «maquetas» van en notas del canvas, nunca
    dentro de la lámina. Excepción: las marcas que el contrato exige con datos ilustrativos (`mark` de
    `decision-ai-answer`, `sampleMark` de `decision-diagnosis-map`, `report.sample` de `content-day-live-results`) se
    quedan: el compositor rechaza la lámina sin ellas.
14. **Imágenes de ambiente para casos de cliente**: se aceptan imágenes generadas (registro `puesta-en-escena`) asociadas
    al cliente en lugar de una «foto real del caso»; un logo de cliente dentro de la imagen se **compone** desde el
    archivo oficial, nunca lo genera el modelo. La guarda «no anclar en el rubro de un cliente» del pipeline de foto de
    marca aplica a la fotografía propia de Efeonce; en un caso del cliente se generó con `pnpm ai:image` (caso Berel).

15. **Portada con el polo del kit bordado** (2026-09-30): «la portada está muy mal armado el logo y ahí ni siquiera tiene
    que estar pintado sino BORDADO en el pecho». El plate `WB1b` (isotipo plano compuesto al costado) se reemplaza por
    `WB1c` (`ai-generations/2026-09-26_deck-web/plates/`): el polo piqué del kit editado con su receta y el emblema
    bordado completo en el pecho izquierdo. Receta: `2026-09-26_deck-web/fichas/WB1c/LEEME.md`. Portadas del Completo y
    del Brochure recompuestas (texto idéntico), PDFs y canvas actualizados.

## Decisión del operador sobre los pendientes (2026-09-30)

> «Deja esos datos... No marques nada en el deck como provisional, asumo la responsabilidad.»

Las cifras de los casos, la fuente, los formatos de Insights, las industrias y la cifra de Bresler quedan **tal cual** en
el deck, sin marca de «provisional» ni «próximamente». El operador asume la responsabilidad. Lo que sigue queda como
registro de contexto, no como bloqueo.

## Contexto de los datos (registro; el operador decidió no marcarlos)

- **Cifras reales de los tres casos** (4 por caso, con fuente, período, servicio y permiso de uso). Hoy la fuente dice
  «Google Search Console, GA4 y Efeonce AEO Assessment, 12 meses» como provisoria: afirma algo que no es cierto hasta
  reemplazarla. Grupo Security se fusionó con BICECORP (sep-2025, marca BICE): si los casos vienen de esa época, el pie
  debe decirlo.
- **Formatos de Insights** (verificado por la sesión «Informe live Efeonce Insights» el 2026-09-30 contra el ledger de
  flags): web y celular **vivo** (producción sirve el modelo 1.0; el 1.1 sale con el próximo release) · PDF A4 **vivo** ·
  deck 16:9 **vivo** · modo presentación **desplegado** pero sin probar con una edición real sobre el modelo 1.0 ·
  **correo que llega solo NO vivo** (`INSIGHTS_DELIVERY_ENABLED`/`INSIGHTS_SCHEDULES_ENABLED` OFF; TASK-1944 bloqueada
  por TASK-1774). Ningún cliente real ha recibido una edición todavía (canaries sobre Greenhouse Demo). Recomendación de
  esa sesión: marcar «próximamente» el correo (y el modo presentación salvo verificación) y prometer «se habilita al
  abrir el servicio». **Decisión del operador pendiente**: las láminas aprobadas no lo marcan hoy.
- **Industrias sin prueba por industria** (no hay clientes de banca, seguros ni SaaS en la lámina de clientes).
- Cifra de Bresler (+180 % ventas digitales) no es de SEO; cambiar por una de SEO publicada si existe.
- Fechas de la agenda de próximos pasos (5–9 oct): moverlas al usar el deck.
- La URL `think.efeoncepro.com/brand-visibility` sigue llamándose «Brand Visibility Grader».
