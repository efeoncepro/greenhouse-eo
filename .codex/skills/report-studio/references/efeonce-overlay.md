# Overlay institucional Efeonce

Aplica a todos los informes y documentos escritos emitidos por Efeonce, para clientes o para el equipo. Complementa el oficio general de Report Studio y prevalece sobre ejemplos genéricos de diseño.

## Fuentes canónicas

- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`: contrato de marca, pie y entrega.
- `docs/context/09_marca-agencia.md`: identidad y voz.
- `src/lib/artifact-composer/brand-packs/axis/`: tokens y fuentes de marca.
- `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`: URL bubble oficial.
- `src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json`: datos de contacto vigentes.
- `public/branding/`: logos institucionales oficiales (`logo-full.svg` positivo; `logo-negative.svg` para fondos oscuros).
- `src/assets/fonts/`: archivos Geist y Poppins para incrustar cuando el render no pasa por el brand pack.
- `src/config/efeonce-brand.ts`: eslogan y arquitectura de marca (contraportada).

Resuelve estos paths desde la raíz del repositorio, no desde esta carpeta. Si trabajas fuera del repo, solicita o localiza el paquete institucional autorizado; no inventes sustitutos.

## Contrato obligatorio

**Formato:** el pie completo aplica a informes escritos. En decks y presentaciones el pie lleva como máximo la URL bubble oficial, sin dirección, teléfonos, separador ni folio, incluso si el destino es PDF A4 horizontal. Usa Deck Studio para ese formato.

1. Cada página, incluida la portada, lleva URL bubble, dirección y teléfono institucionales. Usa los campos vigentes del catálogo, no datos recordados ni una dirección encontrada en un documento antiguo.
2. Incorpora el logo de Efeonce en la versión apropiada al fondo. Si el informe es para un cliente, incluye también su logo oficial. Respeta proporción, colores y área libre.
3. Usa los colores y tipografías reales de marca. No añadas verde, serif u otra familia por asociarlos a sostenibilidad, pintura o una supuesta apariencia premium.
4. El destino acordado gobierna: PDF A4 para los informes de este flujo salvo solicitud explícita distinta. HTML es un insumo, no reemplaza al archivo final.
5. Añade gráficos cuando permitan entender una comparación, composición, distribución o evolución. Cada gráfico conserva unidad, universo, período, fuente y limitaciones decisivas. Para una sola serie, usa un tono de marca (azul AXIS `#0375d9` pasó el validador de paleta de la skill dataviz); el gris de marca como serie de datos falla por croma y contraste. Pasa la paleta por el validador antes de exportar. Si el informe sigue la dirección premium de Insights (ver abajo), el color de datos va por rol: actual, anterior o referencia, oportunidad y ausencia.
6. Valida que el conversor haya respetado el asset. Si no interpreta el CSS de un SVG, usa una rasterización fiel con resolución suficiente al tamaño final, conserva la fuente SVG y documenta la decisión. No repintes un logo roto.
7. El contacto debe ser legible y los enlaces deben abrir destinos reales. Reserva la zona de pie antes de paginar.

## Referencia de informe premium (aprobada 2026-09-25)

El operador aprobó página por página el diseño de los informes de Efeonce Insights (A4 y deck) y lo cerró con «así quiero que se vea un informe». Úsalo como referencia antes de comparar direcciones nuevas:

- Dirección, tokens y anti-patrones: `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`; páginas de referencia a tamaño nativo en su carpeta `paginas/`.
- Reglas reutilizables (navy manda en papel, teal sólo sobre navy, roles de color de datos, oportunidad nunca sólo por el coral en papel, portadas, logo del cliente, contraportada y pie): estándar de informes, sección «Delta 2026-09-25».
- Es diseño aprobado, no plantilla construida: producción sirve los catálogos v1 de Insights y los catálogos premium están en implementación (TASK-1889). Fuera del Composer, reprodúcelo con los tokens y assets reales; no copies los datos de ejemplo de las páginas de referencia.

## Línea gráfica «La órbita» y la burbuja de URL (canónica desde 2026-09-25)

Los documentos emitidos con la marca Efeonce siguen la línea gráfica «La órbita»: manual
`docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` y referencia operativa
`.claude/skills/efeonce-brand-studio/references/graphic-line-orbit.md` (checklist de QA incluido). Nunca en una pieza
con la marca del cliente ni en Greenhouse. Valores desde los tokens `efeonceGraphicLine` de `@efeoncepro/axis-tokens`.

- **Burbuja de URL en el pie (§8.5):** `efeoncepro.com` va siempre en la burbuja oficial, nunca como texto. En HTML
  se aplica `url-lum.svg` en gris con `mix-blend-mode: luminosity`; no se recolorea ni se redibuja. En PDF, visores,
  correo o cualquier salida donde la fusión no esté garantizada, usa la variante horneada:
  `docs/operations/brand-graphic-line/deliverables/assets/url-lum-light.svg` sobre blanco o papel y
  `url-lum-dark.svg` sobre navy. Comprueba en el PDF final que el trazo no salió negro (punto 6 del contrato).
  Estas copias locales son el dibujo de `@efeoncepro/axis-brand-assets` (`url-bubble-source`,
  `url-bubble-baked-light`, `url-bubble-baked-dark`), vigiladas por `src/config/efeonce-brand-assets.test.ts`:
  nunca se editan a mano.
- **Pie ≠ firma de pieza gráfica:** la burbuja de pie de informes, papelería y membretes sigue como está. La regla
  del 2026-09-26 rige sólo la **firma** de piezas gráficas (post, anuncio, portada con foto): logo de Efeonce
  centrado y la burbuja sólo cuando el logo ya está en la imagen. No la trasladas a un pie ni la inviertes aquí.
- **Eslogan «Empower your …»:** sólo en la contraportada o el cierre, desde el archivo oficial; nunca en mayúsculas
  ni con esfera.
- **Portadas y contraportadas:** la órbita nace de las portadas de Insights (`report-cover.html`,
  `report-cover-light.html`, `report-back-cover.html` del catálogo `insights-report`). Ningún texto cruza la órbita;
  una por página; el arco de avance sólo mide un dato real del informe.
- **Hoja membretada A4 (§10.7):** logo arriba a la izquierda, la órbita recortada en la esquina superior derecha al
  18 % en navy, la línea del pie termina en la esfera; texto en Poppins 11 pt; nunca la órbita detrás del texto; la
  continuación no lleva órbita. El contenido del pie (URL, dirección, teléfono) sigue el contrato de arriba.

## Responsabilidad editorial

Efeonce es el emisor responsable de su servicio. «Publicamos», «corregiremos» o «proponemos» dependen del estado real: no conviertas una propuesta en promesa ni describas como ajeno un defecto de nuestro propio trabajo. Distingue ejecución de Efeonce, coordinación con cliente y terceros, y decisiones de alcance nuevo.

No incluyas notas al operador, problemas de herramientas, pasos internos ni rastros de agentes (códigos de trabajo, rutas, nombres de herramientas) en el cuerpo del documento, sea para el cliente o para el equipo. Compruébalo con el barrido de fugas de `quality-and-delivery.md`. Las limitaciones de medición que cambian la interpretación sí pertenecen al informe, explicadas en lenguaje claro.

## Documentos internos para el equipo

Un documento para el equipo (modelo de negocio, estrategia, plan) lleva el mismo membrete y el contrato de pie completo: la audiencia no cambia la identidad del emisor.

- Etiqueta «Confidencial · Uso interno» en portada y cabecera. El documento puede tratar proveedores, capital y competidores porque la audiencia es el equipo; por eso lleva la etiqueta.
- Abre con una nota «Sobre este documento» con estado y fecha; cierra con fuentes fechadas.
- Traduce los códigos internos a nombres claros (por ejemplo, el hito G1 pasa a «Demanda» y G4 a «Figura laboral»). Sin notas al operador ni pasos de herramientas.
- Marca en lenguaje claro las cifras no verificadas («tasas referenciales, se confirman con la institución»), nunca con marcadores de trabajo.
- El PDF es un derivado: la fuente de verdad sigue en los documentos canónicos del dominio. Regenera desde el script cuando cambien; no edites el PDF.
- Referencia viva: `docs/business-models/channel-commerce/deliverables/Efeonce-Channel-Commerce-Modelo-de-Negocio.pdf`, renderizado con `node scripts/documents/render-channel-commerce-business-model.mjs` desde la raíz del repo (hojas fijas con membrete en el DOM, ver `pdf-production.md` §4).

## Especialización por dominio

- SEO/AEO: carga `seo-aeo` y el operating model de informes SEO/AEO. Conserva trazabilidad de hallazgos, instrumentación y fórmulas del proveedor.
- Berel: carga `berel-content-production`, en especial el módulo de auditorías. Lee el Notion y los informes anteriores. Mantén español neutro con registro del cliente y no confíes en una copia histórica como estado vivo.
- Rendimiento del equipo: separa entregables acumulados, actividad del período y resultado del servicio. Define On-time y su cobertura; añade RpA sólo cuando haya definición, datos y autorización para ese proyecto.
- Finanzas, legal o investigación especializada: esta skill no reemplaza a la práctica dueña ni certifica la conclusión.

## Registro y mantenimiento

Mantén idénticos los archivos compartidos Claude/Codex, con `agents/openai.yaml` como metadata local de Codex. `pnpm skills:mirrors` verifica la paridad. Actualiza el dueño del contacto o marca si cambia, no copies sus valores en cada skill. La regla institucional de pie y co-branding permanece en el estándar citado.
