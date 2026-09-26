# Efeonce Graphic Line «La órbita» — Decision V1

> **Tipo de documento:** ADR (decisión de marca y sistema de diseño)
> **Estado:** Accepted (2026-09-25) — canonizada en AXIS; atribución sin logo sin medir
> **Creado:** 2026-09-25 por Claude, a pedido del operador (Julio Reyes)
> **Manual canónico:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> **Entregable:** [`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](../operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf)
> **Sistema de diseño:** AXIS, página `references/graphic-line` en `axis.efeonce.org` y tokens `efeonceGraphicLine`

## Contexto

Efeonce tenía logo, paleta, tipografía y un lenguaje fotográfico aprobado, pero ninguna forma propia que se
reconociera sin el logo. Cada pieza resolvía su gráfica por separado: puntos finales, esferas, velos navy y fotos
repetidas. La exploración se hizo en un canvas de trabajo (39 láminas, 7 capítulos) y probó la línea en papelería,
merch, oficina, eventos, redes, decks, correo y producto (Efeonce Insights).

## Decisión

1. **La órbita es la forma canónica de Efeonce.** Anillo fino, arco con esfera y halo; la misma forma en las cuatro
   marcas de la familia (Efeonce, Globe, Wave, Reach), cambiando sólo el acento.
2. **Tres usos, un sistema.** La órbita rodea (logo, lente, objeto), mide (el arco es avance real: sin dato no hay
   arco) y enfoca (la lente: foto en navy apagado, a color dentro del círculo).
3. **Los valores son tokens, no copias.** Grosor, proporción del arco, radio de la esfera, halo, paleta de la órbita
   y reglas de logo e isotipo viven en `efeonceGraphicLine` del paquete de tokens de AXIS, con pruebas de contraste.
   Greenhouse y los demás consumidores los importan; nunca transcriben HEX o px.
4. **AXIS es el lugar canónico.** La página `references/graphic-line` reconstruye en HTML nativo todos los elementos
   del canvas. El canvas queda como taller; el MD y el PDF, como manual y entregable para personas.
5. **Reglas duras de la línea:**
   - Ningún texto cruza la órbita.
   - Donde aparezca `efeoncepro.com` va la burbuja oficial (`url-lum`), nunca la URL como texto. La fusión de
     luminosidad va horneada en dos variantes: clara `#848484` y sobre navy `#6F89A2`.
   - El logo puede vivir dentro de una frase de display sólo si está alineado a la línea base del texto.
   - La foto de la lente se produce con el lenguaje fotográfico de Efeonce (`pnpm foto:generar`), en registro
     documental y sin emblema legible. El banco propio de 8 tomas reemplazó a las tres fotos repetidas.
   - Una lente o una órbita por muro, por vidrio o por pieza; nunca como patrón.
6. **La línea es de Efeonce, no de Greenhouse.** Greenhouse es el plano de control que la documenta y la consume;
   no la adopta como su identidad de producto ni la aplica al trabajo de clientes.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Punto gigante o esfera tipográfica como forma principal | Se lee como puntuación, no como forma; no mide ni enfoca |
| Anillo teal como hilo de familia (opción B) | Duplicaba la órbita sin sumar significado |
| Velo navy sobre fotos de banco | Genérico, sin oficio; lo prohíbe el lenguaje fotográfico |
| Exportar las láminas como imágenes a AXIS | Un sistema de diseño no puede ser una galería de capturas: se perdían texto, vectores y tokens |

## Consecuencias

- Toda pieza nueva de Efeonce usa la órbita y la burbuja de URL desde los tokens de AXIS.
- Cambiar un valor de la línea exige cambiar el token y su prueba, no el documento.
- La página de AXIS es pública; lo que allí aparece (piezas de muestra, carnet y firma) queda expuesto.

## Pendiente

- **Prueba de atribución sin logo:** 600 personas, panel a cotizar. Hasta medirla, la línea es un sistema
  consistente, no un activo distintivo demostrado.
- Elegir firma de mail A o B y aprobar el banco de pares de copy.
- Archivos de impresión, plantillas editables y un componente de órbita en AXIS (hoy son tokens y una página).
- Copy en inglés, revisión legal de «Te hacemos visible» y tamaños mínimos validados con prueba de impresión.
