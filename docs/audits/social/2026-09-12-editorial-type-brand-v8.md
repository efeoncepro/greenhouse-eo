# La silla que guarda un lugar — auditoría y corrección v8

Fecha: 2026-09-12. Estado: piezas locales corregidas, `proof-only`, revisión del operador pendiente.
Sustituye v7 como candidato de revisión; no invalida ni sobrescribe sus originales. No hay publicación.

## Argumento del concepto

«Hay ausencias que se sientan.» une sentir una ausencia con reservarle una silla. La silla vacía hace visible
el vínculo; el lugar preparado y la mano que lo cuida aportan acogida y continuidad. La ofrenda, cempasúchil y
velas anclan la ocasión sin repetir su nombre. Es seasonality: no hay evidencia de un acontecimiento viral que
la convierta en trendjacking. No se añade «Día de Muertos», fecha, CTA ni apoyo tipográfico innecesario.

La tensión no es muerte contra vida ni una amenaza de pérdida: es ausencia física y presencia afectiva. La
escena busca reconocimiento íntimo, no miedo. El giro verbal se entiende al relacionarlo con la silla; una
fotografía decorativa de flores perdería ese mecanismo. La mano es importante porque distingue preparar un
lugar de una mesa abandonada. Se conserva el encuadre y la escena de cada plate v7.

Efeonce firma una mirada y demuestra criterio creativo. La escena no prueba una conexión comercial exclusiva
con Efeonce: otra marca podría compartir ese territorio. Por eso no se afirma diferenciación propietaria,
recuerdo de marca, conversión ni respuesta neurológica. El logo permite atribución visible; su eficacia requiere
prueba con audiencia. Marcar la silla o elementos de la ofrenda desplazaría el sentido hacia posesión comercial.

## Diagnóstico y correcciones

- **Foco adicional:** v7 aislaba una firma blanca abajo a la izquierda. En verticales, el intervalo entre tinta
  del titular y firma era de 914/1087 px. V8 reúne ambos en una agrupación editorial superior, con la firma
  secundaria. Se libera la silla de esa competencia. Esto es juicio de composición, no eye tracking.
- **Escala:** Story pasa de 215/57 px (3.77×) a 175/62 px (2.82×). «Sientan.» conserva énfasis, con menor masa;
  peso dominante 760→690 y apertura 480→530. No se convierte esta relación en receta para otros titulares.
- **Unidad sintáctica:** YouTube pasa de tres líneas a «Hay ausencias» / «que se sientan.». Se elimina el escalón
  aislado «que se» y se conserva el gesto fotográfico como contraparte del titular.
- **Espaciado:** se mantienen shaping, avances y offsets fontkit. Tracking v7 uniforme −0.014 em cambia a
  −0.005 em en aperturas feed/YouTube, 0 en apertura Story y −0.008 em en énfasis. No se aplicaron retoques
  de pares sin evidencia. Se revisaron contraformas y espacios a 390 px en verticales y 640 px en horizontal.
- **Alineación:** se compensan sidebearings mediante cajas de tinta; v7 tenía diferencias de borde izquierdo
  de 5.83/7.48/8.77 px. V8 comparte borde de tinta por bloque. Esta compensación geométrica fue revisada
  visualmente; no sustituye ajustes ópticos cuando una forma los necesita.
- **Firma:** SVG oficial `public/branding/logo-negative.svg`, escalado uniforme. Anchos 180/190/230 px;
  altura raster 42/45/54 px (redondeo de píxel), sin estiramiento independiente ni recreación tipográfica.
  Su proximidad al titular no constituye un nuevo logotipo institucional.

| Formato | Aire entre tintas v7 → v8 | Aire titular–firma v8 | Contraste titular PNG / JPG | Contraste firma PNG / JPG |
|---|---:|---:|---:|---:|
| Instagram 1080×1350 | 19.75 → 11.12 px | 39.18 px | 9.22 / 8.68 | 4.81 / 4.93 |
| Historia 1080×1920 | 17.04 → 15.06 px | 44.65 px | 7.61 / 7.31 | 3.72 / 3.51 |
| YouTube 1920×1080 | 64.77 y 34.62 → 16.98 px | 48.18 px | 10.74 / 9.02 | 8.90 / 7.42 |

Contrastes: mínimos en núcleos de glifo/logo con alpha fuente >240, comparando el color final aplanado contra
el plate en ese mismo píxel; sRGB. No incluye cada borde antialias, no es certificación WCAG ni de plataforma.
Los logos tienen una excepción normativa que no elimina la revisión de reconocimiento. Los umbrales técnicos
no validan el argumento creativo. La revisión visual propia tampoco equivale a aprobación del operador.

## Fusión: prueba y decisión

Motor real Sharp, no Illustrator. Se compararon `over`, `soft-light`, `multiply` sobre la misma ubicación.
Multiply blanco conserva el fondo y desaparece la firma; Soft Light adquiere una apariencia marrón irregular
con poca lectura. Se conserva `over` con alpha 0.78 feed/YouTube. Story al 0.78 cayó a 2.88:1 en JPG bajo este
método; se corrigió a 0.96, con mínimo 3.51:1 y revisión visual. La subordinación depende principalmente de
escala y agrupación, no de sacrificar lectura mediante transparencia. No hay relieve ni product placement físico.
Referencia: [Adobe, transparencia y modos de fusión](https://helpx.adobe.com/illustrator/using/transparency-blending-modes-alt.html).

## Archivos, reproducción y límites

Directorio local ignorado por Git: `.captures/concepts/dia-de-muertos-trio-v8/`.
Cada formato incluye PNG, JPG, plate sin texto, SVG de titulares, preview y pruebas de modo de fusión.
`compose.mjs` contiene copy editable, fuente/ejes, posiciones y tratamiento de marca; `manifest.json` conserva
baselines y cajas; `verify.mjs`, `audit.mjs`, `qa.json`, `audit.json` y `hashes.json` conservan el método y resultados.
`source-provenance-v7.json` conserva la procedencia de los plates anteriores; no implica una nueva generación.

Reproducir desde este checkout: `node .captures/concepts/dia-de-muertos-trio-v8/compose.mjs`, después `verify.mjs`
y `audit.mjs` en la misma ruta. Dependencias Sharp/fontkit del checkout; la fuente/branding no se duplican.
El ZIP de entrega contiene PNG/JPG y README; las fuentes de trabajo permanecen en el directorio local.
Sin nueva generación, upscale ni aplicación de IA sobre letras/logos. No hay prueba en las interfaces reales
ni rendimiento de audiencia; YouTube 16:9 se trata como portada/miniatura de video, no como banner de canal.

## Documentación dueña

La regla transferible vive en [auditoría editorial](../../../.codex/skills/social-media-studio/references/editorial-typography-brand-audit.md),
espejada para Claude y enlazada desde social, design y tipografía. Se desarrolla el oficio dentro del
[protocolo social](../../operations/SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) y del
[ADR de contexto](../../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md); no cambia runtime,
contratos del compiler, fuentes de verdad ni permisos. No requiere un ADR nuevo.

## Verificación documental

`git diff --check` y comparación focal de espejos social/design pasan. `docs:closure-check` termina con éxito;
la heurística focal emite dos avisos de registro/contexto: `project_context.md` se revisó y conserva el router
vigente, no se crea una skill nueva. Handoff/changelog y las entradas de las skills sí se actualizaron.
El gate global de espejos reportó drift ajeno en `greenhouse-talent-people-operator`; no se corrigió ese dominio.
`docs:context-check:strict`: cero errores y advertencias. Otros agentes editan el mismo checkout; esta evidencia
corresponde a esta revisión, no asegura que el árbol global permanezca inmutable.

## Entrega a Marketing en OneDrive

Por solicitud del operador, se copiaron los tres PNG v8 originales a
`/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/Seasonalities/Día de Muertos/2026/Hay ausencias que se sientan/v08/`.
Nombres semánticos por canal/uso/ratio/resolución/versión; LEEME y hashes acompañan la entrega.
Copias idénticas al origen. Guardado local verificado; sincronización remota y permisos del equipo no verificados.
Convención canónica: [OneDrive delivery](../../../.codex/skills/social-media-studio/efeonce/ONEDRIVE_DELIVERY.md),
espejada para Claude. PNG como entrega de estáticos; no modifica permisos ni aprueba publicación.

## Aprendizaje posterior: Hay abrazos que encendemos

La nueva ruta usa una llama-abrazo sobre ofrenda. El operador valoró v02 4:5 con firma inferior centrada:
recorrido llama → veladora → pétalos → firma, en contraste con la firma lateral aislada del caso silla.
El criterio se incorpora al protocolo editorial espejo; no es una regla por ratio ni aprobación de publicación.
Fuentes locales: `.captures/concepts/dia-de-muertos-abrazos-v02/`; entrega en OneDrive dentro de
`Seasonalities/Día de Muertos/2026/Hay abrazos que encendemos/v02/`.
