> **Revisión posterior:** Enlace se retira como recomendación de línea por fundamento estratégico insuficiente. Antecedente conservado. La exploración vigente está en `../exploracion-v4/`, pendiente de aprobación.

# Efeonce · Enlace / propuesta 03

**Estado:** exploración visual para aprobación. No es un activo distintivo validado ni una promesa de brand lift.

## Entrega

- `index.html`: galería.
- `revision-efeonce-v3.pdf`: revisión visual de nueve páginas.
- `referencias-efeonce-v3.zip`: 28 vistas aisladas sobre blanco, artes SVG, estímulos y notas.
- `00-tazas-familia.png`: comparación de frente y reverso en blanco, azul, magenta y naranja.
- `01-recurso.png`: módulo y repetición.

## Feedback incorporado

- Las tazas magenta y naranja incorporan el logo oficial Efeonce en pequeño, en la zona baja de una cara.
- La cara opuesta explora una trama tonal. La misma forma aparece en agenda, vinilo, acrílico y mural.
- Se conserva la firma pequeña y baja del reverso de la agenda, con su escala y posición de v2.
- Los objetos de apoyo sin logo de v2 siguen disponibles. Esta revisión se concentra en los soportes modificados.
- Efeonce permanece como marca principal. Usar un color de Globe no convierte una taza en una submarca independiente.

## El recurso propuesto

**Enlace** es un nombre interno de trabajo. El módulo está dibujado como dos codos opuestos, con radios y espesores fijos, y terminales diagonales. Se repite con desplazamiento de media celda en filas alternadas.

La curva, el pliegue y el cambio de dirección permiten explorar principios del universo mencionado por el usuario. No se cortaron fragmentos de los isotipos para pegarlos sobre los objetos. El patrón no modifica ninguno de los logos.

### Fijo

- Celda maestra: 470 × 470 unidades.
- Codo: radio exterior 160, radio interior 80; terminal de 80 unidades a 45°.
- Dos codos opuestos en cada celda; proporción, orientación y separación constantes.
- Filas alternadas desplazadas media celda.
- Coexistencia con la firma Efeonce, conservada intacta.

### Variable

- Escala uniforme y recorte al borde de la superficie.
- Tinta y contraste: tono sobre tono en objetos; contraste más alto en piezas de comunicación.
- Cantidad de superficie ocupada; no todas las piezas necesitan patrón.

## Criterio de uso

1. **Identificación:** el logo oficial conserva la lectura directa. El ship sigue siendo el símbolo principal.
2. **Asociación a desarrollar:** presentar la trama junto a Efeonce en piezas de comunicación; mantener la forma durante la prueba.
3. **Distribución:** combinar objetos expresivos con superficies de descanso, para que el set no se sature.
4. **Validación:** comprobar atribución correcta y confusión. Una geometría repetida muestra continuidad, pero no prueba memoria de marca.

## Vistas

Mugs blanco, azul, magenta y naranja: cuatro vistas por color (16). Agenda, Mac y pizarra: cuatro vistas por objeto (12). Total: **28 vistas actualizadas**. Todos los recortes de objetos tienen fondo blanco. El estudio es una aplicación de ambiente adicional.

Son referencias visuales generadas, no planos acotados. La ubicación sobre la superficie se compuso con perspectiva o transferencia cilíndrica. La consistencia geométrica y la continuidad alrededor de la taza deberán resolverse sobre la geometría final al producir.

## Rutas descartadas en esta ronda

Se ensayó una abreviatura `f11`. La primera unión de letras se leyó con ambigüedad y se separó para comprobarla. La búsqueda posterior encontró usos de F11 en agencias y estudios de diseño, por lo que se descartó como eje de la propuesta. Los archivos de `../codigo-f11-v3/` son antecedentes descartados; no están incluidos en la entrega vigente.

Referencia de uso encontrada: [F11 Agency](https://www.f11agency.com/pl/uslugi/). Este hallazgo es un criterio creativo de descarte, no un dictamen de propiedad intelectual.

## Procedencia

- Bases de mugs, Mac y pizarra: `../apertura-v1/renders/`.
- Agenda azul y estudio: `../ideas-con-direccion-v2/bases/`.
- Se reutilizaron las bases generadas; no se regeneraron formas ni se inventaron logotipos.
- Firma: SVG oficiales `public/branding/logo-full.svg`, `logo-negative.svg`; ship oficial `public/branding/SVG/isotipo-full-efeonce.svg`.
- Gráfica nueva: SVG determinístico en `arte.mjs`. Fuentes Bricolage Grotesque y Poppins reales.
- Composición: `componer.mjs`, transferencia cilíndrica con supersampling para evitar bordes dentados, y perspectiva del compositor v2.
- Preflight y fotografía de la base: documentación y prompts conservados en v1/v2.

## Comprobaciones

Se inspeccionaron recurso, cuatro colores de mugs, agenda, Mac, pizarra, mural y recortes. Se corrigieron la lectura del candidato descartado, aliasing de la firma pequeña, la invasión del patrón sobre texto del mural y la apariencia de fragmentos sueltos en el sticker del Mac.

No se midió recordación, atribución con público ni brand lift. El siguiente paso de investigación está en `VALIDACION.md`.

## Reproducir

Desde el repo, ejecutar `node ai-generations/2026-09-25_efeonce-studio-props/enlace-v3/componer.mjs`, después `entrega.mjs` y `pruebas.mjs` en esa carpeta. `documento.py` usa reportlab del runtime de Codex para el PDF y el ZIP.
