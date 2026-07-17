# 11 · Escenas editoriales de producto

Usar este módulo cuando una portada, hero o ilustración editorial deba mostrar producto, analítica o una
decisión de negocio con la precisión de una interfaz, sin convertirse en una captura literal ni en un dashboard
genérico.

## 1. Principio: gramática agnóstica, skin contextual

La escena se diseña en dos capas que no deben confundirse:

1. **Gramática compositiva agnóstica:** jerarquía, superficies, relación entre gráficos, solapamiento, densidad,
   legibilidad, crop, responsive y motion. Esta capa es reusable en cualquier tema.
2. **Skin contextual:** paleta, tipografía, materiales, firma y acentos que corresponden a Efeonce, al cliente o
   a una plataforma tratada editorialmente. Esta capa se decide por pieza y no se hereda entre artículos.

Los colores vino, lavanda, coral y naranja de HubSpot son apropiados cuando el tema es realmente HubSpot y
ayudan al lector a reconocer el contexto. No son branding general de Efeonce ni defaults para RevOps, CRM,
dashboards o el blog. Fuera de ese contexto se vuelve a la marca y al brief aplicable.

## 2. Auditoría forense antes de diseñar

Cuando el operador entrega una página o captura como referencia, no se debe inferir el método desde su
apariencia. Inspeccionar primero la fuente original:

- identificar si el visual es SVG, PNG, canvas, CSS, video o Lottie;
- registrar dimensiones intrínsecas, `viewBox`, transparencia y relación de aspecto;
- medir grilla, superficies, radios, solapamiento, sombras y zonas vacías;
- extraer roles cromáticos, no sólo HEX aislados;
- distinguir fondo de página, fondo del asset y transparencias;
- revisar responsive, crop real y breakpoints;
- si hay motion, registrar orden, duración, easing, loop y reduced-motion;
- separar qué es estructura reusable y qué pertenece a la identidad de la fuente.

La captura prueba el resultado visible; el source revela cómo fue construido. Si el original es un SVG
determinístico, recrearlo mediante prompting suele introducir azar, microcopy falso y clichés innecesarios.

## 3. Patrón de escena de producto

Una composición robusta puede combinar dos superficies analíticas complementarias:

- **superficie posterior:** contexto, evolución, comparación o trayectoria;
- **superficie frontal:** síntesis, clasificación, score, composición o decisión;
- **solapamiento funcional:** añade profundidad pero preserva título, leyenda y la evidencia necesaria de la
  superficie posterior;
- **profundidad editorial:** proviene de posición, color y sombra moderada; no exige vidrio, perspectiva 3D,
  rack isométrico ni glow.

No es una plantilla de dos cards. La cantidad, tamaño y superposición cambian según la historia. La regla es
`contexto → interpretación`, no `dashboard → más dashboard`.

## 4. Elección de mano

- Texto, cifras, ejes, labels, logos o geometría exactos → SVG determinístico y el método de
  `../../content-marketing-studio/references/deterministic-editorial-infographics.md`.
- Escena conceptual, atmosférica, fotográfica o material sin semántica exacta → generación de imagen.
- Pieza híbrida → generación para la base conceptual; tipografía, datos y marca por composición determinística.

Una escena con gráficos editoriales puede parecer una imagen de marketing y seguir siendo un problema de
layout/vector. No usar IA sólo porque el destino sea una portada.

## 5. Referencias positivas y negativas

Cada referencia debe declarar un rol explícito:

- `positive-structure`: qué estructura o relación tomar;
- `positive-palette`: qué lógica cromática considerar;
- `positive-brand`: activo oficial que debe preservarse;
- `negative-cliche`: resultado que no debe aparecer;
- `negative-contamination`: rasgo específico que se debe excluir.

Las APIs de imagen normalmente no ofrecen un peso negativo nativo para una imagen. Una “referencia negativa”
es una instrucción semántica: adjuntar la imagen, nombrarla como anti-referencia y explicar qué no heredar. El
modelo aún puede copiar rasgos visuales de ella; por eso se inspecciona contaminación después de cada salida.
Si el anti-ejemplo domina el resultado o la composición debe ser exacta, se abandona el loop generativo y se
construye determinísticamente.

## 6. Crop, responsive y motion

- Medir el slot visible real. Un archivo `16:9` puede mostrarse como `1:1` en el listado del blog.
- Si el CMS recorta al centro, mantener la escena semántica completa dentro de una zona segura `1:1` central y
  validar el crop exportado, no sólo guías dibujadas.
- Preferir una composición escalable cuando conserva legibilidad. Crear variantes con art direction cuando el
  texto o la relación entre superficies deja de funcionar; no resolver todo con crop.
- El motion, si existe, debe reforzar jerarquía: superficies → series → decisión. Entrada breve, sin loop
  permanente, y alternativa reduced-motion.

## 7. QA

- ¿La idea se entiende en tres segundos?
- ¿Los gráficos cuentan una relación real y no son ornamento?
- ¿La gramática sobreviviría con otra paleta y otro tema?
- ¿El skin corresponde al tema actual sin apropiarse de la marca fuente?
- ¿La firma Efeonce usa un asset oficial y permanece separada de la evidencia?
- ¿El centro `1:1`, el `16:9` y el OG conservan la misma tesis?
- ¿Hay microcopy inventado, números dudosos, widgets de relleno o look “dashboard IA”?

## Precedente

La auditoría de los assets AEO de HubSpot y la portada `ANAM-V6` demostraron el método: se inspeccionaron SVG y
Lottie originales, se extrajo su gramática de producto y se reconstruyó la escena en SVG. La paleta HubSpot se
trató como skin contextual del artículo; la gramática de superficies analíticas quedó agnóstica.
