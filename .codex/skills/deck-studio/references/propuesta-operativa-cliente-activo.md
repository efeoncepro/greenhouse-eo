# Propuesta operativa para un cliente activo (modelo de cuenta, CreativeOps)

> **Estado:** referencia de oficio escrita el 2026-10-29 desde un solo caso: «Sky × Efeonce — Cómo trabajamos», 18
> láminas 16:9 en el canvas Design, línea Growth, para proponer a SKY Airline un nuevo modelo operativo del servicio
> Performance. Se iteró con el operador y con Daniela (Creative Operations Lead) el mismo día; **todavía no se presenta
> a Sky.** No la cites como propuesta aceptada.
>
> Contenido del modelo: `docs/services/creative-services/SKY_PERFORMANCE_CREATIVE_OPERATING_MODEL_V1.md`.

## Cuándo aplica

- El cliente **ya trabaja con nosotros** (en el caso, año y medio) y lo que se propone es cambiar cómo se opera:
  roles, flujo, herramientas, entregas. No hay que vender a Efeonce ni presentar al equipo.
- El cliente lee el deck, pero lo prepararon y corrigieron personas de los dos lados: lo que dice de cada rol tiene que
  ser exacto, porque esas personas lo van a leer.

## Arco que funcionó (5 capítulos + agenda)

1. **Diagnóstico.** «Punto de partida» y «Lo que encontramos» con **tres miradas que llegan al mismo lugar**: la
   reunión con el cliente, el día a día y un análisis con datos (en el caso, 11 de 16 temas del chat estaban en el
   traspaso). Una sola fuente no basta: el operador pidió sumar lo que se dijo en la reunión y lo que él vive.
2. **La propuesta.** Cuatro acuerdos + diagrama del sistema por carriles (cliente / dirección conjunta / equipo) con
   logos en cada carril y una banda transversal de la herramienta (Notion + IA).
3. **El equipo.** «Quién hace qué» (no «Quiénes somos»: ya se conocen), mercados con banderas, una lámina comparativa
   **hoy → propuesta** por rol (HML) y otra para la dirección conjunta (las dos personas que dirigen, con su logo).
4. **Cómo funciona.** Flujo en pasos con dueño, estados, la herramienta en una maqueta propia, un caso real con datos
   del cliente y **casos especiales** (alianzas, campañas chicas, ausencias, marcha blanca).
5. **Cómo empezamos.** Ritmo y medición; piloto en una campaña real con fechas.

## Correcciones del operador (todas medidas en el caso)

- **Exactitud de cada rol, palabra por palabra.** «Diseña y corrige una parte grande» → «diseña una parte»; «hace el
  KV» → «adapta el KV» (y se buscó en **todo** el deck: aparecía en cinco láminas); «define qué se comunica junto a
  Daniela» se leía como si ella también decidiera → la decisión de qué se comunica es solo del cliente. Ante cada
  corrección de rol, `grep` del concepto en todas las láminas antes de publicar.
- **Herramienta real del proceso.** La revisión es en Frame.io y la entrega final en SharePoint; una colaboradora
  propuso Adobe Express y el operador lo revirtió. No adoptes un cambio de proceso que viene de una persona del equipo
  sin que el operador lo confirme; si llega por Teams, preséntalo y aplica, pero di de dónde salió.
- **Lenguaje para el cliente.** Lo interno se dice suave («los pedidos llegan por muchos canales», «la coordinación de
  Sky reorganizándose»); nunca culpa a una persona del cliente. Lo que no le corresponde saber a la agencia (precios,
  descuentos, legales) se dice como reparto de roles, no como reproche.
- **Nombres de rol en el idioma del cliente.** Sky usa nombres en inglés: «Home Market Lead», abreviable a HML.
- **Banderas en círculo** en vez de códigos de país, tanto en las fichas (40 px, con el código al lado) como en la
  lámina de mercados (148 px con el nombre debajo). SVG cuadrados de `flag-icons` 7.2.3 (`flags/1x1/`), subidos como
  assets del artifact.
- **La rotación y la marcha blanca se dicen.** Si una regla todavía se va a probar, la lámina lo declara.

## Mecánica que sirvió

- **Comentarios del canvas y de Teams.** Los comentarios del operador llegan anclados a una lámina; los de una
  colaboradora llegan por el chat 1:1 de Teams (léelos completos con `read_resource`: las capturas pegadas no se ven,
  así que el orden de los comentarios es la pista de a qué lámina se refieren; dilo cuando lo infieras).
- **Antes de publicar, relee lo publicado** (`action: read` con `paths`) y compáralo con la copia local: aparecen
  versiones nuevas que no siempre traen cambios de contenido.
- **Exportar el canvas a PDF:** extraer el cuerpo de cada `*.dc.html` en el orden de `canvas.json`, reemplazar
  `/_blob/<id>` por los archivos bajados con `action: read` + `path: <id>` (uno por llamada; `paths` no acepta ids de
  asset), envolver cada lámina en una sección de 1920 × 1080 con salto de página y renderizar con Playwright
  (`page.pdf`, `printBackground`, tamaño 1920 × 1080 px). Verificar que carguen Bricolage, Poppins e Inter y que no haya
  imágenes rotas; revisar una hoja de contactos de todas las páginas y `pdftotext` para lo que se cambió.
- **Cada cambio de texto se mira renderizado:** un bullet más largo en las fichas de equipo empujó el pie de la lámina
  fuera del cuadro; se acortó.
