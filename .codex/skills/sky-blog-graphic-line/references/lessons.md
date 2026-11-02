# Lecciones (casebook, lo más reciente primero)

Formato: qué pasó → regla → dónde quedó codificada → estado (Codificada + prueba / Codificada / Documental).

## 2026-11-02 · HERO SPACE sin margen superior corta la cabeza en escritorio

**Qué pasó.** Primera portada generada con el sistema (Cusco, San Blas, registro E, `gpt-image-2.5-sunburst` max
3840×2160, USD 0,40 por intento). V1: el sujeto quedó arriba y el H1 se leía (6 % / 5 % bajo 3:1), pero el gate dio
84 %: el recorte de escritorio quita el 12 % superior y le cortaba la cabeza. Con un maestro 16:9 casi no hay margen
vertical para arreglarlo con el foco.

**Regla.** HERO SPACE pide la mitad superior **sin tocar el borde**: margen de cielo o fondo sobre cabezas, manos alzadas
y remates del monumento. V2 pasó (86 %, 13 % / 7 %), aún justa arriba: declarar la caja del sujeto con honestidad y
mirar la vista de escritorio.

**Dónde.** `contracts/sky-blog-photography.json → heroSpace.prompt`. Corridas en
`greenhouse-eo/ai-generations/2026-11-02_sky-blog-linea/` y `projects/sky/blog-linea-grafica/salidas/cusco/`.
**Codificada** (la verificación es el gate).

## 2026-11-02 · El modelo puede invertir la posición del fotógrafo

**Qué pasó.** La V2 de Cusco pidió «quien fotografía sube tres escalones detrás de ella»; el modelo puso la cámara
delante, mirando calle abajo, con la compañera subiendo hacia el lente. La foto funciona y pasa el gate, pero no es la
microescena declarada.

**Regla.** El QA del registro E compara la posición declarada de quien fotografía con la que se ve. Si la ficha la exige
(por ejemplo, para la continuidad con IMG 2), es motivo de regenerar; si no, se registra la desviación en la ficha.

**Dónde.** [qa-review.md](qa-review.md) §1 (fila Miradas/microescena). **Documental.**

## 2026-11-02 · La energía de bordes no encuentra al sujeto

**Qué pasó.** El primer gate de portada medía dónde cae el «detalle» (Laplaciano sobre el percentil 94) respecto de la
ventana del sujeto. Con las 11 portadas de octubre, Mascotas (el perro queda bajo el H1) sacaba el mejor puntaje y
Paraty (buena portada) fallaba porque el adoquín de abajo tiene mucha textura. Bordes ≠ sujeto.

**Regla.** El sujeto de la portada se **declara** (`--sujeto u0,v0,u1,v1` en fracciones del maestro, mirando la foto) y se
verifica por geometría contra la ventana. La legibilidad del H1 sí se mide en píxeles (degradado del tema + contraste
3:1): coincidió con lo que se ve (Cancún playa 63 % y Valdivia 44 % bajo 3:1 son ilegibles; Lima 22 % se lee).

**Dónde.** `compose/hero.mjs → PORTADA_GATE, judgePortada` (sujeto obligatorio), `scripts/medir-portada.mjs`;
`test/hero.test.mjs`. El detalle queda como dato informativo. **Codificada + prueba.**

## 2026-11-02 · El hero del tema tapa la mitad inferior de la portada

**Qué pasó.** La Spec fijaba 1408×768 sin zona segura. Medido en vivo: el tema recorta a 2,42:1 en escritorio y 1,34:1 en
móvil y escribe categoría, H1 y fecha sobre la mitad inferior. En el post de Ayacucho el recorte cortaba la cara a la
altura de la nariz. De las 11 portadas de octubre pasan 3 (Lima, Paraty, Copacabana).

**Regla.** Ventana del sujeto: tercio central × mitad superior del 1408×768; mitad inferior tranquila y no demasiado
clara; primer plano de la portada por abajo. HERO SPACE en el prompt.

**Dónde.** `contracts/sky-blog-recipes.json → hero` (medición fechada), `contracts/sky-blog-photography.json →
heroSpace, foreground.heroEdges`, `scripts/prompt-plate.mjs --portada`. **Codificada + prueba.**

## 2026-11-02 · Primer plano: de obligatorio a decisión declarada

**Qué pasó.** Notion lo pedía «siempre», pero la misma Spec admitía escalar si no era plausible y el registro E del 08/10
no siempre lo llevaba. Una regla absoluta empuja a inventar objetos.

**Regla.** Por defecto cuando es plausible; el builder exige `--primer-plano` o `--sin-primer-plano "<razón>"` y lo
registra. Recomendación aceptada por el operador el 2026-11-02 («Sí, construye» sobre la propuesta).

**Dónde.** `contracts/sky-blog-photography.json → foreground`, `scripts/prompt-plate.mjs`; `test/prompt-plate.test.mjs`.
**Codificada + prueba.**

## 2026-11-02 · El banner de ruta no admite copy comercial ni rutas sin verificar

**Qué pasó.** El kickoff fijó «nunca precios, Oferta, Imperdible, Está bueno SKY ni comparaciones» y «sólo rutas activas
verificadas el día que se publica», pero nada lo hacía cumplir.

**Regla.** El compositor escribe CTA y etiqueta desde el contrato, rechaza el copy prohibido y exige `verificadaEl` +
`fuente`; el titular no se achica para caber.

**Dónde.** `contracts/sky-blog-recipes.json → ruta.copy`, `compose/route-banner.mjs → validateRouteJob`;
`test/route-banner.test.mjs`. **Codificada + prueba.**

## 2026-11-02 · Notion tenía contenido de Berel en la wiki de SKY

**Qué pasó.** «Banners» y «Flujo de Producción Diseño» de la wiki SEO de SKY son copias de Berel.

**Regla.** Ninguna regla de esas páginas aplica al Blog SKY; esta skill no las cita como fuente.

**Dónde.** [sources.md](sources.md) §3. **Documental** (mover las páginas es decisión del operador).
