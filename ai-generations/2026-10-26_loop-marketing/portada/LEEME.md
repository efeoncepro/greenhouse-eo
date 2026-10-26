# Portada del pilar «Qué es Loop Marketing» (2026-10-26)

**Estado:** aprobada por el operador el 2026-10-26 («El loop quedó muy achatado, pero bueno vamos»). No está subida. Va con la publicación del pilar (post
`248398`, fusión con `248483`). Reemplaza las dos portadas anteriores (`248432` y `248501`), que el operador pidió
rehacer.

## Idea

- **Fórmula nueva** (operador, 2026-10-25): sin persona al frente y sin vidrio, como la de SEO y AEO (`MCB-AEO1-169`).
- **El símbolo del infinito es lo icónico del Loop** (operador, 2026-10-26). Aquí no es el diagrama de HubSpot ni un
  neón: es una larga exposición real, la estela de un péndulo con LED sobre una mesa negra.
- **Las pasadas tenues** alrededor de la figura nítida dicen que cada vuelta sale más precisa.
- **Texto:** «○ No es un embudo. / **Es un loop**●», en la línea `revenue-hubspot` (el Loop es el framework de
  HubSpot, igual que inbound). La foto completa la frase.

## Cómo se hizo

1. **Ficha:** `fichas/MCB-LOOP1-169.json`, en registro cine y `alcance: manzanitas`, sin persona y con la excepción
   declarada en la `nota`.
2. **`cine-reviewer` antes de generar: CORREGIR.** Encontró cuatro problemas: la cámara a ras de mesa aplastaba el
   infinito, la figura salía del recorte cuadrado, «three or four passes» invitaba a una espiral y el acento quedaba
   suelto. Las correcciones se aplicaron, y el acento magenta quedó sólo en la esfera del texto: la estela es entera
   azure-white.
3. **Dos generaciones** con `gpt-image-2.5-sunburst` high a 2560 × 1440 (≈ USD 0,11 en total):
   - **v1** (`plates/MCB-LOOP1-169-v1.png`): la figura en x 60–84 % e y 43–52 %, grande y baja. Se cortaba en el
     cuadrado y caía bajo el degradado de la tarjeta.
   - **v2** (`plates/MCB-LOOP1-169.png`, la vigente): la ficha pide la figura «un veinteavo del ancho» y el borde
     lejano de la mesa «a un cuarto desde arriba». Sale en x ≈ 58–73 % e y ≈ 28–35 %. El modelo dio la figura unas
     2,5 veces más grande de lo pedido, la misma deriva medida en AEO.
4. **Validación v2:** `foto:validar:cine` sin fallas (sombra 93 %) y `foto:validar --zona-texto` 5/5 reservas.
4b. **`cine-reviewer` sobre el plate: APROBABLE.** Corrigió un punto doble en la composición: la esfera ya es el punto final, así que «Es un loop» va sin punto blanco. Desvíos de la ficha que se aceptan: salieron 5–7 pasadas tenues en vez de 2, y se leen como el decaimiento real del péndulo; el hilo llega al borde superior. Los recortes ampliados quedaron en el scratchpad de la sesión.
5. **Texto descartado:**
   - «El embudo termina. El loop / aprende.»: «El loop» chocaba con el lazo izquierdo.
   - «El embudo termina. / El loop aprende.»: el destacado se desborda 152 px.

## Archivos (`final/`)

| Imagen del inventario | Archivo | Medidas | Peso | sha256 |
|---|---|---|---|---|
| 2 · Portada (destacada, OG, X, «Te puede interesar») | `que-es-loop-marketing-2026.jpg` (JPEG q88 4:4:4) | 2400 × 1260 | 167 KB | `ba17ed31…` |
| 3 · Slider (`hero`) | `que-es-loop-marketing-2026-hero.webp`: recorte del plate x 0–2080 · y 150–1190, figura a la derecha del título | 2400 × 1200 | 43 KB | `ab9bba61…` |
| 1 · Tarjeta del rail | `que-es-loop-marketing-2026-card.webp`: el plate sin los 200 px de arriba, `--focus "71% 50%"` | 2560 × 1240 | 57 KB | `b6caa875…` |

- **Hoja de revisión:** `final/revision-superficies.jpg`, con la portada, el cuadrado central, la tarjeta en
  440 × 600 y 304 × 540 y el slider en 1440 y 390. Las cajas del título y de «Siguiente» están dibujadas a mano según
  el inventario; son aproximadas, no capturas en vivo.
- **Alt de la portada:** «Portada de Marketing con Manzanitas: el símbolo del infinito dibujado con luz azul sobre una
  mesa oscura, junto al texto «No es un embudo. Es un loop.»».
- **Alt del `hero` y de la tarjeta:** «El símbolo del infinito dibujado con luz azul por un péndulo sobre una mesa
  oscura.»

## Pendiente

- **Lección para la próxima (operador):** el infinito quedó achatado. La cámara en picado a unos 30° y la figura chica lo aplastan. Si se rehace, hay que pedir la cámara más alta o la figura en un plano vertical frente al lente, y medir la relación alto/ancho de cada lazo en el plate.
- Subirla con la publicación del pilar. Antes hay que avisar a las sesiones del blog y a la sesión de Analytics, que
  mantiene `blog-post-cover-apply.php`.
- Casebook cine: agregar la fila del péndulo y la estela de un objeto sin persona.
