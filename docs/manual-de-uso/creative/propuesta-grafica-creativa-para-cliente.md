# Propuesta gráfica creativa para un cliente — manual de uso

> **Tipo de documento:** Manual de uso
> **Versión:** 1.1
> **Creado:** 2026-10-07 por Claude, a partir del caso Sika LIC-1164
> **Última actualización:** 2026-10-12 por Claude (1.1: el anexo gráfico como una de las cinco piezas del paquete; qué le piden el deck técnico, el reel, la página del reel y la oferta económica; señales y problemas del 12/10)
> **Caso de referencia:** [Sika México LIC-1164 — Propuesta gráfica creativa «POSIBLE»](../../commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md)
> **Paquete completo:** [Propuesta de campaña creativa — playbook de punta a punta](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md)
> **Skills:** `efeonce-graphic-line` (firma Efeonce y portada) · `design-studio` / `greenhouse-ai-image-generator` (fotos) · `deck-studio` (portada y contraportada) · `motion-design-studio` y `audio-studio` (reel) · `greenhouse-public-private-tenders` (licitación)

## Para qué sirve

Para armar con un agente una **propuesta gráfica creativa para la marca de un cliente**: evolución de su campaña,
manual de identidad, piezas de muestra, portada y PDF, iterando con el operador en un lienzo compartido. No reemplaza
el documento de oferta (metodología, tiempos, económica).

Esta propuesta gráfica es el **anexo gráfico** de un paquete de cinco piezas. Las otras cuatro dependen de él:

| Pieza del paquete | Qué toma del anexo | Qué le devuelve |
|---|---|---|
| Propuesta técnica (deck 16:9, **documento aparte**) | Recortes de sus páginas: pieza madre, sistema, audiencias y muestras | Las correcciones de voz del deck se barren también en el anexo |
| Reel de muestra (video) | Sello, firma, tipografía y reglas del manual, **desde su generador**; usa el mismo render oficial del producto | Sus cuadros reemplazan el storyboard |
| Página para ver el reel | La firma de la campaña, renderizada desde el generador | El QR y el enlace, que van en el storyboard |
| Oferta económica | Cobra la evolución gráfica y la conceptualización como componentes propios, antes de los entregables | — |

La secuencia completa, las reglas del operador para cada pieza, las trampas medidas y la lista de control de cierre
están en el [playbook](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md). Este manual cubre la
parte gráfica y lo que ella necesita saber del resto.

## Antes de empezar

- Brief, bases y preguntas y respuestas del cliente leídos; qué entregables exige **literalmente** (formato, cantidad,
  si el video puede ser storyboard).
- El Centro de mensajes del portal leído **completo**, con las preguntas de los otros proveedores y sus respuestas: ahí
  se define alcance que nadie le respondió a Efeonce. Se relee antes de congelar el anexo.
- Decidido con el operador si el video de muestra se entrega como storyboard o como video real. Regla del operador: si
  la ficha pide un video, se entrega un video, aunque el comprador admita storyboard.
- Renders oficiales de producto y logos del cliente (OneDrive de la licitación). Nunca se generan.
- Autorización de gasto de IA del operador para el cliente.
- Confirmar si usar la gráfica del cliente en material de Efeonce está permitido (TASK-1937).

## Paso a paso

1. **Abrir el lienzo de diseño** (Artifact type «Design») con páginas: Portada · Evolución · Manual · Piezas. Cada
   tablero se genera con código (`gen*.py`) para que una regla corregida corrija todo.
2. **Sistema antes que piezas.** Manual de identidad de la campaña (firma, construcción, versiones, arquitectura con la
   marca madre, color y tipografía, movimiento, usos incorrectos, aplicaciones, audiencias, punto de venta, fórmula de
   titular) y una **pieza madre** (Master Graphic). Las piezas convergen a ella. El sello y la firma quedan como
   funciones del generador: el reel, la página y el deck los toman de ahí, sin redibujarlos.
3. **Fotos de producto:** escena generada con el render oficial como referencia y a escala real escrita en el prompt;
   etiqueta revisada al 100 %. Si un elemento tapa al sujeto, dar aire con `pnpm foto:expandir`. Sombras calculadas
   desde la silueta si el modelo falla.
4. **Iterar por comentarios:** el operador comenta sobre la pieza; el agente corrige el generador, re-renderiza, **mira
   la captura**, publica, responde en el hilo y lo resuelve. Si la corrección es de tono (el texto narra al cliente en
   tercera persona, una frase suena defensiva), se barre todo el anexo, no sólo el tablero comentado.
5. **Storyboard y reel.** El storyboard muestra el video cuadro por cuadro, con locución y sonido. Si el reel se
   produce como video (tubería y reglas en el [playbook, §4.4](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md#44-reel-de-muestra)),
   el storyboard se rehace con los cuadros del reel aprobado y suma el QR y el enlace a su página (en el caso,
   `reel/v2/tableros-reel.py` del taller).
6. **Firma de Efeonce en cada hoja:** pie navy con el lockup de la práctica (p. ej. Efeonce | Creative Studio), el
   texto de la licitación y la burbuja `efeoncepro.com`. Va fuera del material del cliente. Portada y contraportada sin pie.
7. **Portada:** por norma, `cover-proposal` sin foto con el logo del cliente (`pnpm brand:compose`). Si el operador pide
   una portada cinematográfica con el arte del cliente, seguir el método de abajo.
8. **Contraportada** de la misma línea que la portada; si la portada lleva foto, el cierre va sin foto
   (`close-brochure-orbit`). Revisar que la foto de un cierre no sea de otra línea.
9. **PDF:** se exporta cuando el operador da el aviso, no antes. Cada tablero como página a su tamaño, texto vectorial
   (script `pdf/build.cjs` del caso). Guardarlo en la carpeta de la licitación en OneDrive. Para corregir un anexo ya
   exportado, ver «Problemas comunes».
10. **Seguir con el resto del paquete** (deck técnico, página del reel, oferta económica) según el
    [playbook](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md#3-secuencia-de-trabajo). Cargar o
    enviar algo en el portal exige la confirmación expresa del operador en ese momento.

### Método: arte exacto del cliente dentro de una foto de cine

1. Ficha cine (`foto:cine:nueva`, campos `llave`, `fenomeno`, `alcance`) revisada por el agente `cine-reviewer` antes
   de gastar.
2. `pnpm foto:generar <ficha> --dry` para obtener prompt y referencias; generar con `pnpm ai:image` sumando el arte del
   cliente como imagen extra, para que la escena nazca con su luz.
3. Componer el arte exacto con homografía sobre la superficie generada; máscara de la persona sólo donde está la
   persona (`rmbg` sobre recorte local para manos).
4. Acabado con `pnpm ai:inpaint image --model gpt-image-2.5-sunburst` sólo sobre el arte.
5. Devolver letras y color: híbrido de frecuencias (detalle del exacto + luz del acabado) y ganancia de color sólo en
   los píxeles del color de marca.
6. Si falta aire para el texto, `pnpm foto:expandir --reponer no` y reponer el arte exacto encima.
7. Componer la portada con `pnpm brand:compose` (`cover-brochure`, layout `line`).

## Qué significan las señales

| Señal | Qué indica |
|---|---|
| El operador dice «se ve pegado», «se nota determinístico» | El arte se compuso sobre una foto terminada: volver a generar con el arte como referencia |
| `ai:inpaint` PASS pero letras cambiadas | El acabado reinventa texto chico: aplicar el híbrido de frecuencias |
| El amarillo de marca sale limón | Corrección de ganancia sólo sobre los píxeles del color de marca |
| Costura vertical en una ampliación | Usar `--reponer no` y reponer sólo el arte exacto |
| El operador dice del video «no se ve cinemático y profesional» | Un animatic no alcanza el nivel de la pauta del cliente: producir el reel real (playbook, §4.4) |
| El operador pregunta si el video «sigue la línea gráfica que se armó» | La capa de motion no usa el manual: rehacerla con sus etiquetas, campos de color, sello y titulares |
| El texto dice que el cliente «pidió», «indicó» o «confirmó» | El documento le habla a un tercero: pasarlo a segunda persona formal en todo el documento |

## Qué no hacer

- No pegar piezas del cliente como calcomanías sobre otra foto.
- No recortar y mover a una persona: se regenera la toma.
- No poner el logo de Efeonce dentro del material del cliente.
- No tapar el producto con sellos, firmas, velos o guías.
- No dibujar ni generar logos del cliente: siempre el archivo oficial.
- No producir de más sin releer qué piden las bases.
- No redibujar ni inventar variantes del sello o de la firma aprobados: se toman del generador del manual.
- No fundir el anexo con la propuesta técnica: son documentos separados.
- No exportar el PDF antes del aviso del operador.
- No cargar archivos ni enviar mensajes en el portal sin la confirmación expresa del operador en ese momento.

## Problemas comunes

- **`foto:generar` no acepta el arte del cliente:** usar su prompt (`--dry`) y llamar a `ai:image` con una imagen extra.
- **El modelo ubica el sujeto 10–30 puntos más al centro:** corregir con ampliación de lienzo o regenerar con geografía
  explícita («her near shoulder at about 80 % of the frame width»).
- **Audio del video:** los dos servidores MCP locales de ElevenLabs fallan con `invalid_api_key` (tienen el id de la
  clave, no la `sk_`); la locución y la música se generan por el conector de claude.ai de ElevenLabs. Si no hay forma de
  producir audio (por ejemplo, fal sin saldo), el animatic queda sin audio y el storyboard con locución escrita cumple
  el entregable cuando las bases lo admiten.
- **Corregir una página de un anexo ya exportado:** no se rehace el PDF. Se parte del PDF aprobado, se reemplaza la
  página que cambió y se pega sólo la franja de texto modificada sobre las otras (`anexo-pdf.cjs` del taller). La
  versión anterior se conserva.
- **Un video no sube al lienzo:** la carga por lote de activos rechaza archivos de más de 20 MB. Preparar una copia web
  más liviana.
- **Un tablero no se actualiza y no hay error:** en el caso, el generador del deck en modo lienzo fallaba en silencio
  cuando una imagen nueva no tenía su blob en `blobs.json`. Subir el activo y registrar el blob antes de generar.

## Referencias técnicas

- Paquete completo (deck técnico, reel, página, económica, lista de cierre): [playbook](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md).
- Caso completo y archivos: `docs/commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md`.
- Fuentes del caso: `ai-generations/2026-10-06_sika-propuesta-grafica/fuentes/` y `ai-generations/2026-10-06_sika-portada-cine/`.
- Taller del deck técnico y del reel: [`ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md`](../../../ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md).
- Oferta económica: [plantilla A4](../../commercial/templates/cotizacion-a4/README.md).
- Norma de composición por superficie y recetas de deck: `docs/operations/brand-graphic-line/`.
- Registro cine y casebook: `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md`, `EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`.
