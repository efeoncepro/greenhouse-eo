# Efeonce Graphic Line «La órbita» — Decision V1

> **Tipo de documento:** ADR (decisión de marca y sistema de diseño)
> **Estado:** Accepted (2026-09-25) — canonizada en AXIS; atribución sin logo sin medir
> **Creado:** 2026-09-25 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-26 por Claude (regla de la firma, la órbita no sustituye la composición, AXIS 0.2.7)
> **Manual canónico:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> **Entregable:** [`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](../operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf)
> **Sistema de diseño:** AXIS, página `references/graphic-line` en `axis.efeonce.org` y tokens `efeonceGraphicLine`

## Contexto

Efeonce tenía logo, paleta, tipografía y un lenguaje fotográfico aprobado, pero ninguna forma propia que se
reconociera sin el logo. Cada pieza resolvía su gráfica por separado: puntos finales, esferas, velos navy y fotos
repetidas. La exploración se hizo en un canvas de trabajo (39 láminas, 7 capítulos; hoy 40, con la 4.9 «Oficina en foto») y probó la línea en papelería,
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
   - **Firma de piezas gráficas (2026-09-26, regla del operador):** un post, anuncio o portada con foto firma con el
     logo de Efeonce centrado abajo. La burbuja URL no se agrega por defecto: sólo reemplaza al logo cuando el logo ya
     aparece dentro de la imagen (mockup, objeto, merch), y va centrada, con fusión de luminosidad a opacidad plena y
     un gate que mide ≥ 4,5:1; nunca a un costado ni junto al logo. La fusión fija la luminosidad del gris, así que
     sólo pasa sobre lechos muy oscuros (manual §8.5). Los usos de la burbuja como pie no cambian.
   - **La órbita no sustituye la composición (2026-09-26, regla del operador):** ni la composición ni las formas del
     lenguaje fotográfico. Se usa en casos específicos, se declara a propósito, nunca por defecto, y nunca cruza el
     sujeto, las reservas de texto, el lecho ni la firma.
   - El logo puede vivir dentro de una frase de display sólo si está alineado a la línea base del texto.
   - La foto de la lente se produce con el lenguaje fotográfico de Efeonce (`pnpm foto:generar`), en registro
     documental y sin emblema legible. El banco propio de 8 tomas reemplazó a las tres fotos repetidas.
   - Una lente o una órbita por muro, por vidrio o por pieza; nunca como patrón.
6. **La línea es de Efeonce, no de Greenhouse.** Greenhouse es el plano de control que la documenta y la consume;
   no la adopta como su identidad de producto ni la aplica al trabajo de clientes.

### Delta 2026-09-26 — Efeonce firma todo; los productos son contexto

Decisión del operador: toda pieza sale con la firma de Efeonce, cualquiera sea la línea de servicio (creativa, web,
RevOps, medios). La marca que se posiciona es Efeonce. Globe (suite de estudio creativo, en desarrollo), Wave y Reach
aparecen como contexto: productos de esos servicios, subordinados a Efeonce, que nunca firman ni reemplazan su logo.
El lockup «Producto by efeonce» queda reservado a la superficie del propio producto. Kortex y Verk quedan fuera de la
línea gráfica por ahora. La palabra del eslogan pertenece a la **línea de servicio**: servicios creativos → «Empower your
Brand» (Globe); web, infraestructura, SEO y medición → «Empower your Engine» (Wave); medios y distribución → «Empower
your Voice» (Reach, por confirmar); Efeonce → «Growth», con **Greenhouse** como su producto, la plataforma que controla
todas las líneas (su interfaz sigue con `DESIGN.md`). Pendiente: palabra de RevOps y CRM y de Growth Strategy, y si los
acentos de producto se usan en piezas de Efeonce (recomendación: no). Manual §7 y §8.1.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Punto gigante o esfera tipográfica como forma principal | Se lee como puntuación, no como forma; no mide ni enfoca |
| Anillo teal como hilo de familia (opción B) | Duplicaba la órbita sin sumar significado |
| Velo navy sobre fotos de banco | Genérico, sin oficio; lo prohíbe el lenguaje fotográfico |
| Exportar las láminas como imágenes a AXIS | Un sistema de diseño no puede ser una galería de capturas: se perdían texto, vectores y tokens |

## Consecuencias

- Cuando una pieza nueva de Efeonce usa la órbita o la burbuja de URL, toma sus valores de los tokens de AXIS y sus
  archivos de `@efeoncepro/axis-brand-assets`. La órbita no va por defecto en toda pieza y la burbuja no es la firma
  por defecto (ver reglas duras).
- Cambiar un valor de la línea exige cambiar el token y su prueba, no el documento.
- La página de AXIS es pública; lo que allí aparece (piezas de muestra, carnet y firma) queda expuesto.

## Pendiente

- **Prueba de atribución sin logo:** 600 personas, panel a cotizar. Hasta medirla, la línea es un sistema
  consistente, no un activo distintivo demostrado.
- Elegir firma de mail A o B y aprobar el banco de pares de copy.
- Archivos de impresión y plantillas editables. Delta 2026-09-25: la órbita ya tiene contrato de composición por intención en AXIS 0.2.6 (`efeonce.graphic-line-orbit`, candidate; ADR `GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1` en AXIS) con adapters en el Lab y en Greenhouse (`pnpm creative:orbit:render`).
- Delta 2026-09-26: contrato `0.2.0` (paquetes AXIS `0.2.7`) con `signature` (logo centrado; burbuja URL centrada
  y con fusión sólo si el logo ya está en la imagen), `slogan`, `state` y `brand-close`; la órbita no sustituye la
  composición fotográfica (check `orbit-never-over-subject-or-reserves`); archivos oficiales en el paquete nuevo
  `@efeoncepro/axis-brand-assets`; la órbita entra como capa opcional en `pnpm creative:layout`. La regla de la firma
  se aplica también en los dos compositores de campaña, sólo en piezas nuevas: `foto:componer:cta` (tramo 17,
  `marcaEnEscena` + gate `firma-burbuja`) y `creative:layout` (`brand.signature`); las piezas y contratos anteriores
  se dibujan igual y no se recertifican. En el Lab de AXIS, la sección 5.7 «Componer con agentes» y el banco de
  tipografía creativa firman con el logo centrado, y la sección nueva 4.9 muestra la oficina fotografiada.
- Decisión del operador: si el umbral de la burbuja-firma sigue en 4,5:1 o baja a 3:1 (objeto gráfico).
- Copy en inglés, revisión legal de «Te hacemos visible» y tamaños mínimos validados con prueba de impresión.
