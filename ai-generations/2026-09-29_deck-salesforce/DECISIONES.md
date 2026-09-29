# Láminas Salesforce del deck «La órbita» — decisiones y pendientes (2026-09-29)

Script: `render-src/salesforce.mjs` (línea `revenue-salesforce`). Canvas de revisión:
https://claude.ai/artifact/Jp1zybpowqVVyvgnDu1NSw · en «La órbita», página Deck, fila y = 7900 (títulos «NUEVA · Salesforce · …»).

## Decisiones del operador

1. **Marca Salesforce (logo y Astro): el operador declara tener autorización de Salesforce** (2026-09-29, en la sesión
   «Nuevas láminas Salesforce deck»). Se registra porque la guía de partners que está en OneDrive
   (`Alineación/7. Branding & Diseño/04. Logos & Partnership/02. Salesforce/sfdc-comprehensive-partner-branding-16X9-2023.pdf`,
   §1.0 y §6.0–7.0) prohíbe a los partners usar el logo corporativo, los íconos de producto y los personajes («Astro and
   Friends … cannot be used by partners»). **Pendiente:** archivar la autorización escrita (PAM, AE o acuerdo) junto a esta
   nota. Sin ella, las láminas con logo o Astro no salen a clientes ni a pauta.
2. **Rostros:** la foto de la arquitecta genérica (`plates/SF1-una-operacion*.png`) quedó **rechazada** por rostro y piel
   deformados. Causas: la ficha iba sin identidad y la edición del color reencuadró la foto. Se reemplazó por **Nexa**
   (identidad A, anclas `_identidad-nexa/1-anclas/`, chaqueta softshell del kit): `NXSF1-nexa-conexion` (propuesta) y
   `NXSF2-nexa-portal` (portada). Revisadas al 100 % contra el ancla (delineado con rabillo, lunar y pecas) y emblema
   correcto (nave, órbita y tres ventanas).

## Activos

- **Logo de Salesforce:** `public/images/logos/partners/salesforce.com_logo.svg` (el mismo del registro de logos del repo).
  En la portada va como referencia de plataforma («Servicios sobre»), no como insignia de partner.
- **Agent Astro:** `astro/agent-astro-v1-alpha.png`. Es una **interpretación** hecha editando el arte oficial
  `ASTRO_NoOutfit_WalkRight_SFS20_sRGB.png` (rostro, pelo y pose intactos; traje de agente blanco y celeste). **No es el
  arte oficial de Agent Astro**: Salesforce no publica esa versión en su media collection. Si el operador consigue el oficial
  en Brand Central (brand.salesforce.com), se reemplaza. Va sólo en láminas gráficas (servicios y Dreamforce), nunca dentro
  de una foto.
- Lanzamientos de Dreamforce: ledger `.claude/skills/salesforce-crm-practice/references/dreamforce-2026.md` (corte
  2026-09-18). La lámina muestra el estado anunciado y aclara que se verifica en cada org.

## Pendientes

- Autorización escrita de Salesforce archivada (ver punto 1).
- Qué recetas nacen y cuáles son datos de recetas existentes (diagnóstico, propuesta cine y sobria ya tienen receta).
- `NXSF1` se reserva para la propuesta (sobria y cine son variantes; nunca van juntas); `NXSF2` para la portada.

## Íconos oficiales de producto (2026-09-29, tanda 3)

- Descargados con permiso del operador desde el CDN de salesforce.com (`wp.sfdcdigital.com`): Agentforce, Sales,
  Service, Marketing, Data Cloud (Data 360), Platform, Slack y Tableau. Origen de cada archivo en `logos/FUENTES.txt`.
  Mismo régimen que el logo y Astro: sujetos a la autorización escrita de Salesforce.
- Dónde van: nubes de SF1, fichas de agente de SF2 (Agentforce), Engagement/Next de SF3 (Marketing), tarjetas de SF8,
  chips de SF9 y las láminas nuevas SF10–SF13. Los íconos Trazo de la línea siguen para lo que no es producto (pasos).
- No se usan los badges Navigator de la carpeta de OneDrive: son insignias de especialización y exigen verificar la
  credencial antes de mostrarlas.
- Láminas nuevas: SF10 equipo híbrido por olas · SF11 operación gestionada · SF12 Data 360 y consentimiento ·
  SF13 migración con reconciliación (cifras de SF11 y SF13 marcadas como datos de muestra).
- **Carga de color de los íconos de producto:** traen sus propios colores (verde, rosado, naranjo, morado, azul) y las
  guías de Salesforce no permiten recolorearlos. Se usan sólo donde se nombra un producto, nunca como adorno ni en pasos;
  el costo de color en SF1 y SF8 queda como decisión a confirmar por el operador.
- **Recetas (revisión de la sesión del deck):** SF10 = datos de `method-staircase`; SF11 = variante de datos de
  `content-day-live-results`; SF5 = `decision-diagnosis-map`; SF6 = `proposal-cinematic` (service); SF7 =
  `proposal-service`. Candidatas a receta nueva: SF1, SF2, SF3, SF4, SF12 y SF13.

## Día a día y adopción (2026-09-29, tanda 4)

- SF14 «¿Cómo trabajamos contigo? Sin sorpresas.»: **candidata a receta nueva** («ciclo del release: sandbox → pruebas →
  tu aprobación → producción»), no datos de `content-day-tools`: reemplaza el panel de Greenhouse fijo de esa receta por
  la tarjeta del release (el panel ya aparece en SF11). Sale Frame.io; entran Teams, Notion, Loom y el sandbox de
  Salesforce. Mensaje: nada llega a producción sin aprobación. Decisión final del operador.
- SF15 «¿Cómo aprende tu equipo? A su ritmo.»: biblioteca de tutoriales en Loom por rol (datos de muestra). Candidata
  a receta nueva o variante de `content-day-live-results`.
- **Loom:** lo propuso el operador para el soporte asíncrono y pidió su logo; **confirmar que está en el stack real**
  (la receta evita herramientas que la cuenta no usa). Si no lo está, los tutoriales van sin marca de herramienta. Ícono oficial actual desde el sitio de Loom
  (`logos/loom-pinned-tab.svg`, fuente en `logos/FUENTES.txt`); el media kit oficial vive en carpetas de Google Drive
  enlazadas desde https://www.loom.com/media-kit. **Pendiente:** darlo de alta en el catálogo de herramientas del deck
  (`deck-axis/assets/tools/loom-isotype.svg`) cuando la receta pase al Composer.

## Tanda 5 (2026-09-29): CRM conversacional, qué medimos, supervisión en vivo y contraportada

- **Loom:** el operador confirmó que es parte del stack real de Efeonce (2026-09-29).
- **SF16 «¿Y si le preguntas a tu CRM? Te responde.»**: servicio de CRM conversacional con **Claudeforce** (Salesforce en
  Claude; anuncio Salesforce+Anthropic del 2026-08-26, piloto y beta abierta desde septiembre de 2026). No existe un logo
  aislado de Claudeforce publicado: se usa el recorte sin alterar de la tarjeta «Claudeforce» de la imagen oficial del
  comunicado (`logos/claudeforce-tile-oficial.png`) y el logotipo de Claude del registro del repo
  (`public/images/logos/partners/claude-logotype.svg`). Nombre del servicio sugerido: «CRM conversacional» (el operador
  propuso «Enablement conversacional»; queda a su decisión). La lámina marca beta y ejemplo ilustrativo.
- **SF17 «Lo medimos.»**: cinco métricas con fórmula y fuente, sin cifras de promesa (baseline en el diagnóstico).
- **SF18 «Donde trabajas.»**: vívelo de SF2; aprobación del agente en Slack (Slack es de Salesforce y se integra con
  Agentforce). Si el cliente trabaja en Teams, se cambia el canal.
- **SF19 contraportada** (`close-proposal-horizon`, línea revenue-salesforce): plate nuevo `NXSF3` (Nexa de espaldas,
  softshell con la estampa de espalda del kit, revisada al 100 %). **Eslogan en bloque bajo el logo al 64 % de su ancho**
  (regla del operador del 2026-09-29), con «Revenue» en el acento; la receta del 27/09 lo ponía suelto a 72 px: manda la
  regla más nueva. La chaqueta dice «Empower your Growth» porque es la estampa del uniforme.

## Badge de partner y ajustes de la tanda 5

- **Badge «Salesforce Partner»** (pedido del operador, 2026-09-29): archivo oficial del kit de partner en OneDrive
  (`.../02. Salesforce/Salesforce/Salesforce_Partner_Badge/Transparent_Background/Horizontal/`), copiado a
  `logos/salesforce-partner-badge-horizontal.png`. Va en la **portada** (reemplaza al logo corporativo: la guía de
  partners dice que el badge es el activo visual del partner) y en la **contraportada**, bajo el contacto. No se usa el
  badge de Cloud Reseller (Consulting Partner ≠ Reseller) ni los Navigator. El claim de partner sigue sujeto al readback
  del registro de partnerships (`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`).
- **SF19 espalda bordada:** la vista `puesta: espalda` del kit de la softshell sigue estampada (pendiente conocido del
  kit). Se corrigió la marca con el método de acabado (recorte → edición «satin-stitch» sin cambiar forma → mezcla sólo
  sobre la silueta; 0 píxeles cambiados fuera de la marca): `plates/NXSF3-nexa-contraportada-bordada.png`. A esa escala
  (~130 px) el bordado apenas se distingue. Pendiente del kit: rehacer las vistas puestas de espalda en bordado.
- **Receta `close-proposal-horizon`:** la ficha fija el eslogan a 72 px suelto (27/09); la regla del operador del 29/09
  lo pone en bloque bajo el logo al 64 %. Anotar en la receta antes de pasar al Composer.
- **SF16:** marcas de Claude y Claudeforce sujetas a autorización de **Salesforce y Anthropic** (la imagen del comunicado
  es de uso editorial). La ventana es genérica: logotipo de Claude, sin imitar la interfaz real.
- **SF17:** cada métrica ahora muestra su dueño. **SF18:** botones separados para que la selección no pise «Editar».

## Condición para enviar: readback del badge (2026-09-29, revisión de la sesión de la línea gráfica)

- **Bloqueante:** el badge «Salesforce Partner» es un claim. Según la oferta (`EFEONCE_SALESFORCE_SERVICE_OFFER_ARCHITECTURE_V1.md`,
  §Claims), no se publica sin readback primario vigente; el registro de partnerships deja el tier, el SPPA y la insignia
  **pendientes de readback** en Partner Community (owner: Julio + RevOps & CRM). La aceptación de 2025 como *Provisional*
  Consulting Partner no prueba el estado actual. **Ningún deck con SF0 o SF19 con badge sale a un cliente sin ese readback.**
- En los canvases, los títulos de SF0 y SF19 dicen «badge sujeto a readback de Partner Community (bloqueante para enviar)».
- **Respaldo listo:** `SIN_BADGE=1 ONLY=SF0-portada,SF19-contraportada node render-src/salesforce.mjs` genera
  `out/SF0-portada-sin-badge` («Operamos sobre» + logo de Salesforce, que no afirma nada) y `out/SF19-contraportada-sin-badge`.
  Están en el canvas de revisión como «RESPALDO».
- **Badge en vector:** el PNG se veía pixelado. Ahora se usa el `.ai` oficial del kit convertido a SVG sin redibujar
  (`logos/salesforce-partner-badge-horizontal.svg`; fuente en `logos/FUENTES.txt`). Fondo translúcido del original
  (versión «Transparent_Background»), que deja ver la foto.

## Wordmark Claudeforce (2026-09-29, comentario del operador en SF16)

- El operador mostró un cuadro del video de lanzamiento: el wordmark «Claudeforce» lleva «Claude» en blanco y «force» en
  celeste **con la f inclinada del logo de Salesforce**. La tarjeta del comunicado (que usaba SF16) es otra versión, en sans
  recta. Mi primera respuesta en el hilo afirmaba que la f no era la de Salesforce: estaba mal, me faltaba la versión de video.
- No hay vector publicado del wordmark. Se armó sin redibujar a mano (`logos/claudeforce-wordmark.svg`, detalle en
  `logos/FUENTES.txt`): «force», «a», «e» del vector oficial de Dreamforce; «d», «l», «u», «C» construidas con las medidas
  oficiales y verificadas contra el cuadro. Si Salesforce publica el vector, se reemplaza.
- SF16 ahora muestra el wordmark en una tarjeta navy (mismo lugar y tamaño que la tarjeta anterior). Sigue sujeta a
  autorización de Salesforce y Anthropic.

## Decisiones del operador al canonizar (2026-09-29)

- **Documento:** ambos cierres. Como brochure, el deck cierra con una contraportada de brochure («¿Conversamos? Cuando
  quieras.» + eslogan) en la línea revenue-salesforce; la SF19 aprobada es el cierre cuando el deck se usa como propuesta.
- **SF5, SF10, SF11 y SF18** no caben en las recetas existentes: se canonizan como **4 recetas nuevas**, tal como se
  aprobaron (las 78 existentes no se tocan).
- **Logo de la contraportada a 700 px sólo en Salesforce** (composición `sloganBlock` de close-proposal); las
  contraportadas del 27/09 siguen a 500 px.
- **Nombre del servicio de SF16: «Enablement conversacional»** (eyebrow «Claudeforce · Enablement conversacional").

## Peso de las negritas en SF16 y SF18 (2026-09-29, composer)

- El token declara Poppins 700. Las láminas aprobadas se ven en 800 porque el script de render no cargaba la cara
  Poppins 700 (sólo 300/400/500/600/800) y el navegador cayó al peso más cercano. Se compone en **700**, el peso
  declarado; la diferencia es mínima a tamaño real y no justifica otra release de AXIS. Lección: el script de render de
  láminas debe cargar todas las caras que usa (añadir Poppins-Bold) para que la lámina aprobada no dependa de un fallback.
