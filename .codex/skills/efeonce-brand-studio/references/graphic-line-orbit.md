# Línea gráfica Efeonce «La órbita» — referencia operativa para agentes

> Canónica desde el 2026-09-25 ([ADR](../../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md), Accepted).
> Contenido completo en el [manual V1](../../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> (12 secciones). Esta hoja resume para operar; si difiere del manual o de los tokens, mandan ellos.

## Qué es

Una esfera que recorre su órbita. La forma nace del isotipo (la nave ya tiene anillo y esfera): la línea no inventa
un símbolo, extiende el que existe. Anatomía: **anillo** fino (el recorrido) + **arco** (lo avanzado) + **esfera** en
la punta (dónde vamos) + **halo** (luz, nunca disco relleno). Gramática: **anillo = pregunta · esfera = respuesta**
(manual §0, §1.3).

Tres usos, un sistema:

| Uso | Qué hace | Regla clave |
|---|---|---|
| **Rodea** | envuelve una palabra, la lente o un objeto | nunca rodea el logo; el isotipo no lleva otra órbita (§8.3, §8.4) |
| **Mide** | el arco es avance real | **sin dato real no hay arco de avance** (§1.3) |
| **Enfoca** | la lente: foto en navy apagado, a color y ampliada dentro del círculo; el foco «Te hacemos visible» | una sola luz por pieza; «visible» siempre con su prueba (§1.4, §1.5) |

Tres estados de la esfera: punto final (cierra la palabra respuesta), órbita y foco (§1.1).

## Cuándo aplica y cuándo no

- **Aplica:** marca propia Efeonce y su familia (Efeonce, Globe, Wave, Reach comparten la órbita y cambian el acento;
  Greenhouse aparece sólo en el mapa de portafolio). Piezas, decks, redes, correo, papelería, oficina, merch, eventos.
- **No aplica:** identidad de producto de Greenhouse (el portal sigue con `DESIGN.md`/AXIS de producto) ni trabajo
  de clientes. Que la línea no se filtre a entregables de cliente es regla, no preferencia (ADR §6).
- No reemplaza `DESIGN.md` ni `src/config/efeonce-brand.ts`: los complementa (eslogan y pesos siguen en el SSOT).

## Reglas duras (las más caras de romper)

1. **Ningún texto cruza la órbita.** Texto en el tercio inferior izquierdo; órbita fuera de eje, arriba a la derecha.
2. **Una lente u órbita por pieza, muro o vidrio.** Nunca patrón, nunca repetida.
3. **El arco mide un dato real** o no existe. Nada decorativo ni inventado.
4. **URL `efeoncepro.com` siempre en la burbuja oficial `url-lum`**, nunca como texto. Donde la fusión
   `luminosity` no está garantizada (visores, PDF, referencias para IA) usar la variante horneada:
   clara `#848484` sobre blanco/papel, `#6F89A2` sobre navy. Assets:
   `docs/operations/brand-graphic-line/deliverables/assets/url-lum-{light,dark}.svg`. En correo va sin fusión y
   enlazada. No se recolorea ni se redibuja (§8.5).
5. **Logo dentro de una frase de display** sólo en titulares grandes, alineado a línea base y altura de x, una vez
   por pieza, sin repetirlo como firma en la misma vista; en texto corrido nunca (§8.2, §8.3 #12).
6. **Logo:** ni órbita alrededor, ni esfera pegada, ni recolor, ni efectos; logo e isotipo nunca juntos; mínimo
   96 px pantalla / 25 mm impreso. Isotipo mínimo 24 px / 8 mm (§8). Si nada funciona, cambia el fondo o la foto.
7. **En redes** (lienzos de hasta 1200 px de ancho) los grosores van ×1,75 (§1.3).
8. **Sin velo navy sobre fotos de banco.** La foto de la lente sale del
   [lenguaje fotográfico](../../../../docs/operations/brand-photography/README.md): registro documental, nadie mira
   al lente, sin emblema legible, sujeto dentro de un círculo del 55 % del lado corto. Se produce con el pipeline
   `pnpm foto:*`, nunca con prompts a mano (§9).
9. **Un acento por pieza.** El teal es sólo de Efeonce, nunca en una pieza de producto; el teal claro no va como texto
   sobre blanco (2,1:1). La esfera es gráfico; el texto cumple 4,5:1 siempre (§2).
10. **Voz pregunta-respuesta:** pregunta real en Poppins Light, respuesta de 1–3 palabras en Bricolage 760 y ≥ 3× la
    pregunta; la esfera nunca va en una pregunta (§3, §4). El eslogan se usa desde el archivo oficial, en cierres (§5).

## De dónde salen los valores

Grosor, arco, esfera, halo, radios, paleta por marca, tipografía y reglas de logo/isotipo viven en los tokens
**`efeonceGraphicLine`** (`status: 'canonical'`) del paquete `@efeoncepro/axis-tokens`
(`packages/tokens/src/tokens.ts` en el repo hermano `axis-design-system`), con pruebas de contraste. Medidas de
órbita expresadas por cada `orbit.baseWidthPx` (794 px) de ancho de lienzo.

**NUNCA transcribir HEX ni px a mano** desde el manual, el PDF o una captura: importar el token. Cambiar un valor
exige cambiar el token y su prueba, no el documento. Antes de fijar una versión en un consumer, verificar en qué
versión publicada del paquete está el export (no asumirlo). Los HEX de la burbuja URL viven en sus SVG, no en tokens.

## Dónde está cada cosa

| Artefacto | Ruta | Rol |
|---|---|---|
| Manual (SSOT de contenido) | `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` | contrato operativo |
| ADR | `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` | decisión y alternativas descartadas |
| PDF (A4, 54 hojas, confidencial) | `docs/operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf` | entregable para personas; regenerar con `node scripts/documents/render-efeonce-graphic-line.mjs` desde `deliverables/linea-grafica-efeonce.src.html` |
| AXIS (pública, canónica) | https://axis.efeonce.org/references/graphic-line | láminas en HTML nativo |
| Tokens | `efeonceGraphicLine` en `@efeoncepro/axis-tokens` | valores |
| Canvas (taller, privado) | https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii | 39 láminas, 7 capítulos; exploración, no fuente |
| Banco de fotos de lente | `ai-generations/2026-09-25_banco-lente-orbita/` | 8 tomas propias (`pnpm foto:generar`), fichas y plates |
| Burbuja URL horneada | `docs/operations/brand-graphic-line/deliverables/assets/url-lum-{light,dark}.svg` | firma de dirección web |

La página de AXIS es pública: lo que allí aparece queda expuesto.

## Checklist de QA de una pieza con la órbita

- [ ] La pieza es de Efeonce o su familia; no es producto Greenhouse ni cliente.
- [ ] Valores tomados de `efeonceGraphicLine`; ningún HEX/px transcrito; en redes ≤ 1200 px, ×1,75 aplicado.
- [ ] Una sola órbita o lente; ningún texto la cruza; órbita fuera de eje con aire.
- [ ] Si hay arco de avance, existe el dato real que mide y se puede citar.
- [ ] Un acento; teal sólo en Efeonce; texto ≥ 4,5:1 medido en los píxeles finales.
- [ ] Voz: una pregunta real y una respuesta de 1–3 palabras; esfera sólo en la respuesta; una esfera por pieza.
- [ ] Logo desde archivo oficial, con resguardo X, sin órbita ni esfera; nunca junto al isotipo.
- [ ] URL en burbuja `url-lum` (fusión o variante horneada correcta); en correo, enlazada.
- [ ] Foto del banco o del pipeline `foto:*`; sin velo, sin emblema legible, nadie mira al lente.
- [ ] «Te hacemos visible» sólo con su prueba y sin pauta mientras falte la revisión legal.

## Pendientes (no presentarlos como resueltos)

- **Prueba de atribución sin logo** (600 personas, panel a cotizar) sin medir: hoy la línea es **sistema consistente,
  no activo distintivo demostrado**. No reportarla como brand equity.
- Elegir firma de mail A o B; aprobar el banco de pares de copy (hoy candidatos).
- Archivos de impresión y plantillas editables; **componente de órbita en AXIS** (hoy sólo tokens + página, sin
  contrato semántico de composición).
- Copy en inglés; revisión legal de «Te hacemos visible»; tamaños mínimos del logo con prueba de impresión.
