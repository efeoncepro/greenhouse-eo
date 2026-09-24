# SKY × Efeonce — revisión v5

## Autoridad y estado

Dirección reconstruida del chat Claude «Correo de Nashira - Sky» (transcripción 584a9cce-366c-4cee-bc0e-ea86eef34420), prompt H3 v3 y correcciones actuales del operador. La versión Seedance anterior de 19 s queda rechazada por cámara, realismo, pasos omitidos, lectura y cierre. Este documento describe la intención; no certifica el render.

Tres cámaras en todo el spot: A dron/amplio; B macro/seguimiento; C contrapicado/arco. Un único pedido completo a Seedance, con cortes internos dirigidos. No se empalman generaciones distintas del avión. Audio: música original instrumental y SFX, sin voz.

## Secuencia y cobertura

| Tiempo | Cámara | Acción y condición de salida |
|---|---|---|
| 0–1,8 | A · 28–35 mm | Caja vacía en cielo; cursor y escritura; aproximación entre bruma |
| 1,8–2,7 | B · 70–85 mm | Deslizamiento macro; termina la misma pregunta; conserva Poppins |
| 2,7–4,5 | C · 28 mm | Enter y tres resultados SKY; arco bajo contenido, caras legibles |
| 4,5–5,6 | A | Caja se transforma en turno del usuario; pregunta sola antes de respuesta |
| 5,6–8,4 | A | Respuesta del LLM debajo; mismos destinos; termina en citación morada SKY |
| 8,4–10 | B | Acercamiento al chip; morado/lima + destello IA; luz del chip conecta con sol |
| 10–12,4 | A · 85 mm | Avión llega desde la luz hacia cámara, ya en vuelo; crece por aproximación, cámara no retrocede siguiéndolo |
| 12,4–13,3 | C · 24 mm | Corte en acción: panza/motores cruzan justo sobre lente; máximo impacto |
| 13,3–16 | B · 50 mm | Seguimiento lateral, izquierda→derecha; nubes rápidas sostienen velocidad; avión sale antes de textos |
| 16–18 | A | Un año creando con SKY. — 2 s |
| 18–20,5 | A | +2.000 piezas. — 2,5 s; permanece entrada arriba |
| 20,5–23 | C | Y ahora nos eligió como su agencia SEO/AEO. — 2,5 s |
| 23–25 | A | ¡Gracias, SKY! — 2 s; ascenso hacia azul |
| 25–27 | fija | Azul Efeonce; Efeonce | SKY y URL bubble completos |
| 27–28,2 | fija | Solo cambia fondo azul→morado SKY |
| 28,2–30 | fija | Morado SKY con identidad y URL inmóviles |

## Referencias

`references.json` fija orden, ruta y SHA-256 de las 27 imágenes. Estados de búsqueda, resultados, turno de usuario, respuesta y chip separados. Tres nuevas referencias fotográficas basadas en vistas oficiales A320neo. V02/V10/VR/V16 siguen como autoridad de forma y pintura; no son autoridad de material plástico ni de iluminación de estudio. El cierre azul se compone desde logos y URL originales, con fusión de luminosidad canónica, y se acompaña del cierre morado existente. Textos y logos aislados también adjuntos.

Nuevas referencias de avión: imagegen nativo, fuentes oficiales V02/V10/VR + cielo C1-b. Mantener originales y derivados. Son referencias candidatas, no fotografías documentales ni aprobación del operador.

## Verificación del resultado

- [ ] Caja → resultados → turno de usuario solo → respuesta separada → citación morada.
- [ ] Chip causa visualmente la aparición del avión.
- [ ] Se distinguen A frontal, C panza y B lateral; momentum continuo, sin salto hacia atrás ni congelación.
- [ ] Mismo A320neo, proporciones, dos CFM, tren retraído y livery; sin humo ni estelas.
- [ ] Metal pintado, reflejos, oclusión y escala convincente; no juguete.
- [ ] Tipografía/copy exactos y permanencia efectiva suficiente.
- [ ] Gracias antes de firma; firma y URL aparecen primero en azul.
- [ ] Azul cambia a morado con logos/URL fijos.
- [ ] Música + SFX, sin voz; audio presente y sin clipping.

Costo estimado y request se registran después del resultado del CLI. No publicado ni aprobado.

## Corrida

- Proveedor: fal, `bytedance/seedance-2.5/reference-to-video`.
- Request: `01a0d0fd-b1f6-73b3-b78b-37b5e2adbc30`.
- 30 s, 9:16, 720p, bitrate high, audio habilitado.
- 27 referencias; estimación previa USD 13,87; saldo anterior cuenta B USD 41,15.
- Prompt exacto: `sky-30s-three-cameras.prompt.txt`; comando reproducible: `run.py`; envío: `submission.log`.
- Estado al registrar: encolado. El resultado requiere revisión.
