# Propuesta gráfica creativa para un cliente — manual de uso

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-10-07 por Claude, a partir del caso Sika LIC-1164
> **Caso de referencia:** [Sika México LIC-1164 — Propuesta gráfica creativa «POSIBLE»](../../commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md)
> **Skills:** `efeonce-graphic-line` (firma Efeonce y portada) · `design-studio` / `greenhouse-ai-image-generator` (fotos) · `deck-studio` (portada y contraportada) · `greenhouse-public-private-tenders` (licitación)

## Para qué sirve

Para armar con un agente una **propuesta gráfica creativa para la marca de un cliente**: evolución de su campaña,
manual de identidad, piezas de muestra, portada y PDF, iterando con el operador en un lienzo compartido. No reemplaza
el documento de oferta (metodología, tiempos, económica).

## Antes de empezar

- Brief, bases y preguntas y respuestas del cliente leídos; qué entregables exige **literalmente** (formato, cantidad,
  si el video puede ser storyboard).
- Renders oficiales de producto y logos del cliente (OneDrive de la licitación). Nunca se generan.
- Autorización de gasto de IA del operador para el cliente.
- Confirmar si usar la gráfica del cliente en material de Efeonce está permitido (TASK-1937).

## Paso a paso

1. **Abrir el lienzo de diseño** (Artifact type «Design») con páginas: Portada · Evolución · Manual · Piezas. Cada
   tablero se genera con código (`gen*.py`) para que una regla corregida corrija todo.
2. **Sistema antes que piezas.** Manual de identidad de la campaña (firma, construcción, versiones, arquitectura con la
   marca madre, color y tipografía, movimiento, usos incorrectos, aplicaciones, audiencias, punto de venta, fórmula de
   titular) y una **pieza madre** (Master Graphic). Las piezas convergen a ella.
3. **Fotos de producto:** escena generada con el render oficial como referencia y a escala real escrita en el prompt;
   etiqueta revisada al 100 %. Si un elemento tapa al sujeto, dar aire con `pnpm foto:expandir`. Sombras calculadas
   desde la silueta si el modelo falla.
4. **Iterar por comentarios:** el operador comenta sobre la pieza; el agente corrige el generador, re-renderiza, **mira
   la captura**, publica, responde en el hilo y lo resuelve.
5. **Firma de Efeonce en cada hoja:** pie navy con el lockup de la práctica (p. ej. Efeonce | Creative Studio), el
   texto de la licitación y la burbuja `efeoncepro.com`. Va fuera del material del cliente. Portada y contraportada sin pie.
6. **Portada:** por norma, `cover-proposal` sin foto con el logo del cliente (`pnpm brand:compose`). Si el operador pide
   una portada cinematográfica con el arte del cliente, seguir el método de abajo.
7. **Contraportada** de la misma línea que la portada; si la portada lleva foto, el cierre va sin foto
   (`close-brochure-orbit`). Revisar que la foto de un cierre no sea de otra línea.
8. **PDF:** cada tablero como página a su tamaño, texto vectorial (script `pdf/build.cjs` del caso). Guardarlo en la
   carpeta de la licitación en OneDrive.

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

## Qué no hacer

- No pegar piezas del cliente como calcomanías sobre otra foto.
- No recortar y mover a una persona: se regenera la toma.
- No poner el logo de Efeonce dentro del material del cliente.
- No tapar el producto con sellos, firmas, velos o guías.
- No dibujar ni generar logos del cliente: siempre el archivo oficial.
- No producir de más sin releer qué piden las bases.

## Problemas comunes

- **`foto:generar` no acepta el arte del cliente:** usar su prompt (`--dry`) y llamar a `ai:image` con una imagen extra.
- **El modelo ubica el sujeto 10–30 puntos más al centro:** corregir con ampliación de lienzo o regenerar con geografía
  explícita («her near shoulder at about 80 % of the frame width»).
- **fal sin saldo o MCP de ElevenLabs sin clave `sk_`:** el animatic queda sin audio; el storyboard con locución escrita
  cumple el entregable.

## Referencias técnicas

- Caso completo y archivos: `docs/commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md`.
- Fuentes del caso: `ai-generations/2026-10-06_sika-propuesta-grafica/fuentes/` y `ai-generations/2026-10-06_sika-portada-cine/`.
- Norma de composición por superficie y recetas de deck: `docs/operations/brand-graphic-line/`.
- Registro cine y casebook: `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md`, `EFEONCE_PHOTO_CINE_CASEBOOK_V1.md`.
