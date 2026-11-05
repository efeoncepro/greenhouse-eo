# Aprendizajes y errores que no deben repetirse

Registro de causas verificadas durante el onboarding SKY, hasta 2026-09-30. Aplicar a la variante/
contrato que respalda cada caso, sin transformar un ejemplo en excepción general de marca.
Los casos de Claude Design y del kit BLACK (2026-11-04) están en su propia sección, más abajo.

| Síntoma o afirmación | Causa / evidencia útil | Acción correcta |
| --- | --- | --- |
| “Está en carpeta SKY, por tanto es SKY” | Folder no valida procedencia de dependencia | Resolver cliente, pack exacto y cada ID/SHA; rechazar cruces |
| Root instala AXIS aunque cliente es SKY | Herencia de identidad en dependencias raíz | Runtime neutral y biblioteca propia; no sync total antiguo |
| “El productor está en el JSON” | Campo local es atribución falsificable | Identidad GitHub viva y autoridad del ingreso |
| “Ya descargamos ZIP, tenemos todo Figma” | ZIP de exportaciones no conserva todas las escenas/campos | Inventario FIG nativo por nodo, 126 templates y coverage |
| CTA vacío en metadata pero visible en PNG | TEXT_DATA recuperable desde textDataValue; contornos históricos dibujan letras | Reader correcto, admisión revisada y copy completo declarado |
| Inter parece disponible y Metric falta | Estilos auxiliares experimentales y fuente local incompleta | Metric confirmada por operador; no fallback ni permiso desde manifest |
| “Ver rutas” descentrado pese a caja centrada | Baseline/ink de la fuente distinta | Centrar tinta visible horizontal y vertical, QA y PNG reales |
| SKY se ve “S > I Y” o Y recortada | Paths escalados, offsets/clip de master sin escalar | Pins nativos de escala en logo.mjs, paths oficiales intactos |
| Línea blanca en unión de flecha | Fills independientes con antialias | Un contorno exterior continuo, no ampliar/retocar PNG |
| Flecha blanca detectada como color incorrecto | Cuatro paints blancos legítimos de fuente | Conservar variante nativa; test sobre fondo contrastante |
| Fondo de sticker redondo deforme, borde circular correcto | FRAME plenamente redondeado aproximado con curvas Q en vez de su `fillGeometry` | Preservar trazado/winding/transformación; baseline 126 por fuente; referencias con `--native-previews`, corridas viejas se recomponen en run nuevo |
| Premio recortado / sticker rectangular | Precedencia de tamaño de instancia y OUTLINE mask | Contenedor/máscara source-specific, no modificar artwork |
| Legal pierde énfasis / cuotas uniformes | Mixed styles olvidados durante shapeado | Regular/Semibold y Black/Medium exactos, case nativo |
| Cielo correcto aislado pero texto ilegible | Reserva no proyectada al FILL/crop o nubes bajo texto blanco | Medir pieza final; foto/variante apropiada, sin scrim que esconda fallo |
| “Sí, la imagen sigue el criterio” | Confirmación humana de fotografía | No extenderla a KV, contraste, precio, derechos o publicación |
| 126 renders coinciden con source propio | Regresión interna, no referencia independiente | Mantener 5 controles Figma y 121 faltantes explícitos |
| 4,495581 se presenta como 4,5 aprobado | Redondeo oculta fallo del umbral | Registrar valor real y límite del método |
| “Vercel está bloqueado” | Sesión/scope equivocada no es build roto | Verificar identidad y project exactos, no mezclar cuentas |
| Vercel CI genérico verde | Otro proyecto/alias que visor SKY separado | Readback del deployment y superficie SKY concretos |
| Figma API 403 se atribuye a cuota | PAT Greenhouse expirado; /me 401 expired-token | Distinguir autenticación de límite de requests; no repetir indefinidamente |
| Usuario autoriza crear token, pero tool no puede completar | Frontera humana de la tool/formulario | Conservar preparación; explicar bloqueo, no bypass/clipboard indiscriminado |
| Respuesta IA perdida | Pago puede haber ocurrido antes de archivo/receipt | Mismo UUID, receipt/ledger; no nueva intención/retry |
| Instalar paquetes prueba acceso de todos | Se probó sesión propia del maintainer | Onboarding/readback de cada persona, Google y GitHub separados |
| Tarea corta, pero OpenAI rechaza prompt completo | Skill/recursos/identidad agregan longitud fuera del límite de la tarea | Único compileBrandImagePrompt, 32.000 unidades UTF-16 antes de presupuesto/UUID, adapter usa mismo cuerpo |
| Usage ausente se informa como cero | Metadata opcional o inconsistente no es consumo medido | Guardar null; cero sólo reportado y válido; separar usage posterior de quote previa |
| Binding cambia durante un await | Se retenía un objeto mutable del caller | Capturar ID/login antes de esperar y copiar token/scope/expiración antes de consultas; verificar identidad exacta |
| Regex rechaza credencial de instalación actual | Token opaco actual puede contener segmentos con puntos | Admitir formato acotado actual; minter establece tipo/scope, nunca confiar en decode JWT ni usar PAT fallback |
| Dos rutas llaman 2.1.0 a órdenes distintos | Importador insertaba travel en índice 7 y preparador al final; grupos podían invertir origin/travel | Contrato compartido 2.1.1/v2 conserva 19 definiciones y añade travel; rechazar solicitud v1 y no cambiar dibujo |
| Main falla una prueba de push permitida | Fixture usó checkout main; guard bloqueó correctamente | Git fixture aislado codex/safe; conservar guard y evidenciar fallo original y corrección |
| Lector App probado se presenta como identidad admitida | Minter/puente/wiring preparados no registran App ni admiten binding real | Policies draft fallan cerrado; demostrar ambas cuentas y endpoint antes del merge CLI |
| Snapshot de inputs autoriza pese a retirada canónica | Workspace conservaba policy/pack antiguos durante await | Verificar canon vivo y SHA inicial antes/después de proof workspace; reresolver recursos/version |
| Assert válido revive después de retroceso del reloj | Sólo comparar issuedAt no detecta retroceso entre observaciones válidas | startedAt/lastObservedAt privados, sin now externo; denegación elimina proof definitivamente |
| Resultado pagado desaparece al revocar durante complete | Delivery y persistencia se confundieron | Complete durable antes de reauth de entrega; negar lectura preserva receipt/ZIP/UUID |
| Ticket consumido antes del adapter y otra vez en OpenAI | Kernel y adapter llamaban el mismo guard de uso único | Sólo adapter real invoca una vez tras secreto/body; kernel rechaza guard ausente, denegado o repetido |
| Ticket vigente antes de auth, vencido al terminar await | Ledger durable se comprobaba antes de esperar identidad viva | assertAtProvider síncrono después de reauth: exacto WeakSet privado, uso único, dueño/hash/período/quote; sin nuevo pago |
| Revisión READY/tagged se informa como rollout completo | 00009-cep tiene 0% tráfico y producción sigue en 00008-tv6 al 100% | Verificar revisión/tráfico y endpoint; separar build, deploy candidato y promoción |
| Identity400 se atribuye a token App o vínculo Google | Filtro rechaza antes de ambos lectores | No afirmar primer token/scopes o binding positivo; corregir transporte y volver a medir |
| Cloud Run recibe token IAM pero aplicativo no obtiene JWT íntegro | Dos controles consumen el transporte firmado | Header aplicativo propio X-Workbench-Identity + X-Serverless-Authorization IAM, sin fallback Authorization; exigir readback tras corrección |
| Aprobación del operador se usa para aceptar audiencia compartida | Comentario PR7 identifica riesgo MEDIO sin aceptación específica | OIDC propio antes de habilitar otros tres integrantes; no inferir aceptación del riesgo |
| Miembros GitHub/correos se presentan como productores habilitados | API de equipo no certifica binding Google ni IAM | Evidencia por persona y cuenta; correos sólo referencia, no grant |
| Perfil legacy malformed se interpreta como firma eliminada | Rechazo Cloud Run400 no describe transformación exacta de bytes | Registrar conducta medida y header propio íntegro; no inferir mecanismo no observado |
| Primer token válido se extiende a todos los miembros | Canary9/9 probó sólo al operador, scope de un repo y revocación de cuatro tokens | Separar mint/token/identidad positiva del operador y admisión individual del resto |
| Canary sin pago se presenta como readiness para gastar | IA OFF y quotes0 no prueban quote/budget o ruta pagada | OAuth propio, presupuesto admitido y autorización del pago antes de cualquier canary de costo |
| Fusionar nueva CLI para probar endpoint aún ausente | Cliente requiere contrato que runtime no admite | PR draft, backend admitido/readback IA OFF antes de merge; sin broad-token fallback |

## Claude Design y kit «Despliegue Base» BLACK — 2026-11-04

Casos de la sesión SKY en el canvas de Claude Design ([sky-design-canvas.md](sky-design-canvas.md)).
Son bocetos de revisión, no corridas de Workbench; las correcciones se hicieron sobre el render,
nunca en el archivo del cliente.

| Síntoma o afirmación | Causa / evidencia útil | Acción correcta |
| --- | --- | --- |
| Línea fina en la flecha morada del KV renderizado | SVG de Illustrator con piezas adyacentes (cola, rectángulo 537,61–918,96, punta): el antialias deja una junta de 1 px | En el render, ensanchar 1 px por lado la pieza central; pedir a la fuente unir las 3 formas. Misma familia que «Línea blanca en unión de flecha» (arriba) |
| «Internacional» desaparece en popup/story de AR, UY, BR y US | El elemento es más ancho que la región en que se descompone el KV y queda fuera de su parte; la suma base + partes = KV no lo delata | Comparar la foto separada contra la foto fuente recolocada: lo que difiere es un elemento que quedó atrás. Se amplió la región de destino de x=420 a x=530 y se rehicieron los 24 estáticos y las 4 animaciones |
| La animación CSS no se mueve en el canvas | Claude Design muestra los artboards como «Static artboards» y congela CSS | Renderizar cuadro a cuadro a MP4 y publicar `<video>`; el MP4 va como asset (`/_blob/<id>`), no como archivo del proyecto |
| El GIF/MP4 arranca con cuadros que no corresponden a t=0 | La captura llega con 2 cuadros de retraso | Descartar los 2 primeros cuadros capturados antes de codificar |
| La bandera o el logo usado no es el del mercado | Archivos del kit mal nombrados: `BANDERA CL (CIRCULO)_1.svg` es Argentina, `SKY-13.svg` es Brasil, logo BR con nombre «Mesa de trabajo 1 copia 2» | Identificar cada asset por lo que muestra, no por su nombre; reportar el error a la fuente sin renombrar en OneDrive |
| HPH por mercado rechazado: «¿usaste la referencia?» | Se recompuso cada formato con las partes del KV en vez de adaptar el SVG de referencia que el cliente dejó | Si el kit trae una referencia del formato, adaptar **esa** pieza (ocultar, traducir, reemplazar) y no recomponer desde el KV |
| Franja clara arriba en el clúster internacional | El oscurecido izquierdo (Raster 4, opacidad .67, con máscara) empieza en y=6 | Estirarlo hasta el borde en el render; pedir a la fuente subir la capa a y=0. Revisar los bordes de toda capa de oscurecido |
| Un cambio del cliente afecta todas las piezas (fecha del logo BLACK) | Las piezas derivan de varias fuentes distintas: KV vectoriales y referencias raster por capas | Corregir una vez en una copia de las fuentes (`src2/`), apuntar todos los scripts ahí y rehacer en cascada; nunca retocar pieza por pieza |
| El logo de las referencias no se puede editar como texto | En los SVG exportados por capas el logo es un PNG del tamaño del lienzo | Detectar la capa del logo (la de más verde BLACK en el tercio superior), ocultarla y montar el logo vectorial corregido en su caja alfa |
| Idioma detectado mal (PT en un archivo en español) | Se buscó «VOE» en el SVG crudo y apareció dentro del base64 de una imagen | Detectar el idioma sólo por el texto de los `<tspan>` |
| MP4/GIF salen negros | Se renderizó desde el artboard del canvas, que ya es `<video>` con `/_blob/` (no carga fuera del canvas) | Renderizar desde la animación CSS local (`anim-css-<KV>.html`) |
| Un render en paralelo falla o mezcla cuadros | Los dos procesos escribían el mismo HTML temporal | Un temporal por archivo; ante la duda, rehacer todo en secuencia |
| Las imágenes del chat de Teams no se pueden leer | La API de Teams entrega el texto pero no las imágenes alojadas (403 también con token de az) | Abrir Teams web en el navegador integrado (sesión del operador) y leerlas en el visor |
| Falta la tapa de cierre vertical en español | El kit sólo trae la horizontal en ES (PT y EN sí traen vertical) | Recortar el centro de la horizontal sobre blanco y avisar para pedir la vertical a la fuente |
| «No modificar el kit en OneDrive» se lee como no escribir en OneDrive | La regla protege las carpetas del kit (`FORMATO GIF`, `KV X HM`, etc.), no prohíbe entregar ahí (caso 2026-11-05: 321 archivos) | Entregar en una carpeta nueva, fechada y con autoría dentro de `Despliegue Base`; verificar antes que no exista, copiar sin `--delete` y comparar byte a byte. Sin scripts de trabajo. La copia local no prueba que OneDrive ya subió |
| 6 PMAX de rutas Perú entregados con la fecha vieja del logo | Los PMAX 1080 son copias del popup, KV y story; tras el logofix se recopiaron todos menos DOM-RUTA/INTER-RUTA, y la entrega copió lo que había | Tras rehacer una fuente, recopiar sus derivados y antes de entregar buscar archivos más viejos que la corrección (`find ! -newermt`) y comparar cada derivado con su fuente (`cmp`). Corregido 2026-11-05 en local y OneDrive |
| Línea blanca de 1-4 px en el borde inferior de HPH 1200/300×600/300×250, TikTok, DAT y PMAX 1080×1080/1200×628 (comentarios 2026-11-05) | En los SVG del kit la máscara de la foto (`Raster 1`) no cubre el borde y deja ver el fondo claro (`Layer 0`); en el 300×600 además la foto sube 2 px | `kvhm-canvas/foto-base.cjs` agrega una copia sin máscara de la foto bajo todo el arte (usada por `hph/generic`, `hph/market` y `chile-refs`). Diff por SVG: sólo cambian filas del borde. Antes de entregar, escanear los 4 bordes de cada pieza (`edges.cjs`, sale vacío) |
| Tras cambiar la foto, el KV de AR y «Vuela por el Perú» salió en blanco (2026-11-05) | Las variantes repiten la foto del kit en varios `<use href="#image">` recortados; se reemplazó el primero, que tenía el recorte fuera del lienzo, y se ocultó el visible | Reemplazar la copia cuyo recorte cubre más lienzo y ocultar las demás que lo tocan (`destinos.cjs`); mirar el KV, no sólo el popup, que no usa la foto del SVG |
| En la story de las rutas el pin quedaba lejos de la ubicación | La ubicación larga empieza antes de x=740 y su pin cae dentro de la caja del logo: cada hoja se asigna a la primera región que la contiene | Agrupar PromPerú, pin y texto con `data-capa="alianza"`; `parts`/`layers` respetan la capa forzada |
| Con fotos de destino el logo se perdía (torres, estatuas, nubes y nieve detrás) | La foto de la mujer dejaba cielo limpio detrás del logo; las del banco no. Probados y rechazados: sombra radial, velo fuerte y halo («mancha negra») y cielo prolongado de la propia foto («se siente como mancha», cortaba la palmera de Piura) | Lo que pide Daniela: foto completa y un degradado superior suave del 20 % a 0 (#0b1a2e; en la cuarta ronda lo reemplazó el velo diagonal adaptativo, ver dos filas más abajo), más encuadre del atractivo (Cusco con la catedral bajo el logo). Si el monumento es más alto que el espacio libre de la story, queda detrás del logo; liberarlo exige relleno generativo (costo) |
| Crédito de foto duplicado en popup y story | El texto del KV en (40,34) cae dentro de la caja del logo y viajaba con esa capa, además del crédito que agrega `compose` | `data-capa="base"` en el crédito del KV; `parts`/`layers` aceptan `base` como capa forzada |
| El degradado 20 % → 0 «borra» elementos de la foto y no asegura el logo con cielo claro (Lima, Cajamarca) | Un velo plano a todo el ancho trata igual una foto oscura que un cielo blanco y apaga el lado derecho, donde está el atractivo | Velo diagonal desde la esquina del logo, con intensidad medida por foto (percentil 80 de luminancia en la caja del logo → a entre 0,16 y 0,50). **Reemplazado en la quinta ronda** por el fade de referencia de Daniela, acotado bajo el logo (ver fila del gradiente de referencia) |
| Con destinos cortos la flecha de precio queda lejos y el bloque se parte («es una regla») | El kit ancla la flecha a la derecha y el destino a la izquierda; en popup se escalan alrededor de anclas distintas y la brecha crece | `brecha.cjs` (SVG) y `compose.cjs` (popup/story) corren flecha y badge a la izquierda hasta 40 px tras el bloque de destino; nunca a la derecha. Las hojas movidas llevan `data-capa` o caen en la base |
| Foto de destino contra la temporada del mercado (Santiago con nieve para Argentina en noviembre) | Se eligió la foto por encuadre sin mirar la estación del mercado que la ve | Elegir fotos de la temporada del mercado destino de la pieza; en noviembre, verano en el Cono Sur |
| El aro de las banderas se ve grueso (~5 px contra ~2 px del kit) | Se apilaban tres blancos: disco de fondo, aro propio del SVG (trazo 14) y un aro extra | Quitar el aro del SVG, recortar la bandera a su círculo y dibujar un solo aro de 2 px; comparar contra la lista del kit a la misma escala |
| `organizar.cjs` o `rsync --checksum` se cuelgan copiando a OneDrive (proceso a 0 % de CPU, matado con 137) | Comparar el contenido lee el destino; si es un archivo sólo en la nube, OneDrive lo descarga entero antes de responder | Comparar por tamaño y fecha (`statSync`; `rsync -a` sin `--checksum`) y nunca leer el destino en carpetas de OneDrive |
| La flecha de precio tapa a la persona de la foto (Tacna story) | El encuadre por defecto sólo cuida el sujeto principal, no el cuerpo completo frente al bloque comercial | Revisar el cuerpo completo contra flecha y badge; usar `z` y `t` por formato |
| El gradiente de referencia, estirado a todo el alto, oscureció caras y monumentos (Julio, 2026-11-05) | Un fade lineal de 69 % a 0 a lo alto de la pieza sigue en 35 % a media altura, donde están las personas y el atractivo; la maqueta de Daniela era un paisaje sin caras | Usar la forma y el color de la referencia, pero terminar el fade poco después de lo que necesita contraste (el logo): KV 0,42 · popup 0,50 · story 0,46. Antes de entregar, comparar A/B en las piezas con personas |
| «Talara no tiene la foto actualizada» con la carpeta aprobada vacía | Las fotos aprobadas de las rutas son las mismas de `BANCO DE VIDEOS/02_PERU/PROMPERU/<CIUDAD> (REGIÓN).png` (comprobado por tamaño byte a byte); Talara y Chiclayo sólo estaban ahí | Antes de declarar «sin foto», buscar por nombre en todo el kit y comparar con las fotos ya aprobadas; elegir la que coincide con la ubicación del CSV y nunca la de `NO USAR/` |
| El atractivo de una foto horizontal queda bajo la franja de precio (choza de Iquitos) | `cubrir` no deja subir la foto más allá de su borde inferior, y el sujeto está al pie | `lift`: subir la foto y completar abajo con el reflejo de sus últimas filas, que cae bajo piso, precio y pie |
| Story en video con la mujer del kit en una pieza de destino | `story-video.cjs` armaba intro y brandlift siempre desde `foto-fuente.png` | Las piezas de `fotos-destino.json` usan `cubrir(…, 'story')` en intro y brandlift; revisar los 5 slides, no sólo el de precios |

## Propuestas rechazadas o retiradas

- Prompt canary genérico de SKY: sirvió para probar infraestructura, luego retirado al admitir la
  skill fotográfica. No seguir generando con ese recurso antiguo ni adoptar su quality low como
  ajuste del piloto fotográfico medium.
- Primera implementación de texto mixto: legal URL Regular y headings sin UPPER. Rechazada;
  nuevas corridas v2, no sobrescritura de v1 ni etiqueta de aprobación retroactiva.
- Parche de seam por expandir piezas separadas o retocar imagen final: resuelve una escala,
  no la topología compartida. Biblioteca continua verificable en las 74 variantes.
- Reconstruir logo con letras, redibujar icono o copiar uno distinto por adaptación: pierde fuente
  oficial y repite errores de escala. Reparar instancia admitida, no cambiar artwork.
- Prompt+ancla correctos como certificación visual: faltan inspección del PNG/encuadre y mediciones
  específicas. Hue/focal/porcentajes escritos no son magnitudes demostradas.

## Diagnóstico antes de otro intento

Identificar capa: **fuente** (datos/fonts/template), **admisión** (pack/receta), **autoridad**,
**transporte/runtime**, **render** o **contenido visual/comercial**. Un fallo de una capa no se
resuelve cambiando silenciosamente otra. Conservar error redactado, identidad del recurso/run y
evidencia suficiente sin secretos; corregir causa en dueño canónico y volver a verificar el paso
afectado. No repetir todos los tests ni llamadas pagadas si no aportan evidencia nueva.
