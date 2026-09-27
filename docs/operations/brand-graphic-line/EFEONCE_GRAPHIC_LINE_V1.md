# Línea gráfica Efeonce — La órbita · V1

> **Tipo de documento:** Manual de marca (contrato operativo de diseño)
> **Versión:** 1.9
> **Creado:** 2026-09-25 por Claude, con dirección de Julio Reyes (Managing & GTM Director)
> **Última actualización:** 2026-09-26 por Claude (iconografía canónica, Trazo y Plastilina, D16–D22: §14. Antes, el mismo día: decisiones del operador D1–D15 del 2026-09-26: contraste del acento y magenta de Revenue-HubSpot, §2; «Growth» en el acento en el cierre del deck, §5 y §10.1; logo dentro de la órbita sólo en cierres de marca, §8.2, §8.3, §10.1, §10.3 y §10.6; un solo anillo en el banner de LinkedIn y el fondo de Teams, §1.3; halo a la mitad sobre papel y anillo de la esfera sólo «en vivo», §1.3; umbral de la burbuja 4,5:1, §8.5; reglas P1–P12 y conflictos P-1..P-9 resueltos, §9 y §9.1; firma de equipo para `people@`, §10.2; impresión, prueba sin logo, banco de pares y revisión legal, §4, §1.4 y §12. Antes, el mismo día: §9.1 «La foto en la línea»: convergencia con el lenguaje fotográfico, que sigue vigente; antes, el mismo día: lenguaje de movimiento de la órbita como norma y sus valores en `efeonceGraphicLine.motion`, `axis-tokens` 0.3.3, §10.1 y §13; firma de correo v3.1 aprobada, con zona de partners y contrato `efeonce.email-signature`, §10.2; Efeonce firma todo y los productos son contexto, §7; firma de piezas con el logo centrado, la órbita no sustituye la composición fotográfica, 4.9 · Oficina en foto; AXIS 0.3.0 y `axis-graphic-line` 0.3.1, contrato 0.3.0 estable, animaciones del logo V1.1 y retrato de la firma de mail, §10.1, §10.2 y §13)
> **Estado:** **canónica desde el 2026-09-25** ([ADR](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)). Los valores viven en los tokens `efeonceGraphicLine` de AXIS y la referencia pública en `axis.efeonce.org/references/graphic-line`. Este documento no reemplaza `DESIGN.md` ni `src/config/efeonce-brand.ts`: los complementa. La atribución sin logo sigue sin medir.
> **Canvas de referencia:** [Línea gráfica Efeonce](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii) (40 láminas, siete capítulos)
> **Referencia viva (AXIS):** `efeoncepro/axis-design-system` → tokens `efeonceGraphicLine` en `@efeoncepro/axis-tokens` (contrastes vigilados por pruebas) y página del Lab `apps/lab/src/pages/references/graphic-line.astro` (publicada en axis.efeonce.org/references/graphic-line; el proyecto Vercel despliega con cada push a `main` desde el 2026-09-25). Desde AXIS 0.2.7 los archivos oficiales (logo e isotipo de las cuatro marcas y las tres burbujas URL) viven en el paquete `@efeoncepro/axis-brand-assets`; desde AXIS 0.3.0 el contrato de composición es `efeonce.graphic-line-orbit` 0.3.0 (`stable`) y el paquete `@efeoncepro/axis-graphic-line` 0.3.1 pinta la órbita, sus recetas y su movimiento (§13). Greenhouse sigue siendo el plano de control: este manual y su decisión viven aquí.
> **Manual en PDF:** [`deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](./deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf) (A4, 56 hojas, confidencial · uso interno). Se regenera con `node scripts/documents/render-efeonce-graphic-line.mjs`.
> **Fuentes del repo:** `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/` (generador del canvas, texturas, renders, firma de mail, merch generativo y prueba sin logo)
> **Relacionados:** [Lenguaje fotográfico](../brand-photography/README.md) · [Selección de referencias de marca](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · `docs/context/09_marca-agencia.md` · `src/config/efeonce-brand.ts`

---

## 0. En una frase

**Una esfera que recorre su órbita.** La esfera del isotipo (la nave con su anillo y su esfera) es el activo
distintivo de Efeonce. Recorre su órbita: el avance se ve, el oficio está a la vista y la conversación cierra con
una respuesta.

Tres ideas sostienen todo lo demás:

1. **La forma viene del isotipo.** La nave de Efeonce ya tiene un anillo y una esfera. La línea no inventa un
   símbolo nuevo: extiende el que existe. Por eso el isotipo nunca lleva otra órbita.
2. **Anillo = pregunta, esfera = respuesta.** El anillo es lo abierto, lo libre, lo que todavía se pregunta. La
   esfera es lo decidido, lo ocupado, lo que cierra. Esta gramática rige la voz, la oficina, las credenciales y
   los objetos.
3. **Línea fina y luz, nunca un disco plano.** La órbita es un trazo tenue con un arco y una esfera en la punta;
   el halo es luz. Nada de discos rellenos, brillos, reflejos ni esferas de vidrio.

---

## 1. La esfera

### 1.1 Tres estados

| Estado | Forma | Dónde se usa |
|---|---|---|
| **Punto final** | la esfera cierra la palabra respuesta | titulares, firma de mail, taza blanca, credenciales |
| **Órbita** | anillo tenue + arco + esfera en la punta + halo | portadas, cierres, carga, avance, objetos |
| **Foco** | la órbita leída como foco de escenario sobre una foto | fotografía, «Te hacemos visible» |

### 1.2 El punto final — construcción

- La esfera mide el **24 % del alto del isotipo**; se toma entera, sin la órbita.
- **Diámetro = 0,20 em** de la palabra dominante (el punto tipográfico de Bricolage mide 0,197 em).
- Apoyada en la **línea base**, sin superar la altura de x.
- **Mínimo:** 4 px en pantalla y 1,5 mm impresa. Bajo eso, se omite.
- **Tintas:** `#36C8BF` sobre oscuro (8,5:1 sobre `#001A33`) y `#0E8C82` sobre claro (3,9:1 sobre papel).
  El teal claro `#36C8BF` sobre blanco da **2,1:1**: no se usa en claro.
- **Espaciado óptico** después de la última letra:

| Letra final | Espacio |
|---|---|
| r | −0,02 em (el brazo deja aire) |
| a, s, í, z, i | 0,03 em |
| o, n, e, d | 0,035 em (curvas y astas) |
| x | 0,02 em |
| t | 0 |

- Sola (sin palabra): área de respeto de **2 diámetros**.
- **Es parte del texto, no un adorno al lado** (operador, 2026-09-26). Cierra la respuesta de la voz y el titular
  display de marca propia, y toda herramienta que mide ese texto lo mide **con** la esfera: la guía derecha, las
  marcas de corte, la selección colaborativa y sus cursores, y el aire hasta la órbita o la nota al margen. No la
  llevan la pregunta (anillo delante), el eyebrow, las etiquetas, el cuerpo de texto ni el eslogan (§5).
- **Nunca:** otro color que el acento de la marca · volumen, brillo o sombra · deformarla o agrandarla ·
  repetirla como patrón · reemplazar letras con ella · usar el teal en textos o fondos · ponerla en una
  pregunta · usarla como viñeta · más de una por pieza.

### 1.3 La órbita — anatomía y regla

Anatomía: **anillo** (el recorrido) · **arco** (lo avanzado) · **esfera** en la punta (dónde vamos) ·
**halo** (el foco) · **órbitas interiores** (máximo 2) · **satélites** (canales o productos) · **anillo de la esfera**
(`sphereRing`, sólo «en vivo»).

Todas las medidas se expresan **por cada 794 px de ancho** del lienzo (la base del informe A4 de Insights):

| Elemento | Regla |
|---|---|
| Anillo | 1 px por cada 794 px, opacidad 16–22 %. Máximo dos órbitas interiores: 72 % y 44 % del radio, opacidad 11 % y 6 % |
| Arco | 1,6–2 px por cada 794 px, punta redonda, sentido horario. Corto (40–60°) con esfera; largo (hasta 140°) en degradé cuando lleva satélites, y entonces sin esfera |
| Esfera | radio 3,5–4 px por cada 794 px; siempre en la punta del arco, nunca suelta |
| Radio de la órbita | 30 % del ancho en retrato; 40 % del alto en horizontal |
| Halo | radial: 13 % de opacidad en el centro, 3 % al 60 %, 0 al borde. **Sobre papel, a la mitad** (paradas × 0,5; token `efeonceGraphicLine.orbit.haloOnLightScale: 0.5`, decisión del operador 2026-09-26; el render de movimiento ya lo hacía) |
| Anillo de la esfera (`sphereRing`) | **sólo «en vivo»** (decisión del operador, 2026-09-26): el eco del pulso de impacto en movimiento y el estado activo o «en el aire» (por ejemplo, la cabina de llamadas). Nunca en piezas estáticas fuera de ese caso: el contrato rechaza `sphereRing` sin `live: true` (issue `sphere-ring-only-live`) |
| Arco de avance | **sólo con un dato real**; el arco mide el dato. Sin dato, no hay arco de avance |
| Satélites | discos de 30 px con el ícono del canal o producto, sobre la órbita exterior |
| Redes | en lienzos de hasta 1200 px de ancho, grosores ×1,75 (anillo 2,4 px y esfera r 8 px sobre 1080). Verificado a 390 px de ancho |

**Posición:** centro fuera del eje, hacia la derecha y arriba. El texto vive en el tercio inferior izquierdo y
**nunca cruza la órbita**. Una sola órbita por pieza.

**Medidas del canvas (2026-09-26):** la órbita base usa el mínimo de cada rango —arco 1,6 px, esfera 3,5 px, anillo al
16 %— y el 22 % sólo con órbitas interiores o satélites (3,81 / 8,33 / 2,38 px en 1080 social). El arco corto va
**centrado en su posición** con la esfera en la punta: arriba a la izquierda es de 200° a 250°. Las piezas de formato
fijo (lente, foco, deck, firma) se ajustaron a mano una por una y AXIS las guarda medidas en
`efeonceGraphicLine.pieces` y `portrait`: las recetas las reproducen, no las derivan.

**Un solo anillo alrededor del contenido** (operador, 2026-09-26). Cuando la órbita rodea algo —una palabra, el logo,
un objeto, una lente, un texto— queda el anillo que recorre, con su arco y su esfera, y el objeto adentro. Las órbitas
interiores no van por defecto: sólo en una órbita vacía que las necesita, como el diagrama de anatomía o el mapa de
portafolio. El cierre de marca, el deck y la lente llevan un solo anillo. El contrato de AXIS rechaza órbitas
interiores alrededor de un objetivo (`inner-orbits-never-around-content`). **El banner de LinkedIn (lámina 4.1) y el
fondo de Teams (lámina 4.3)**, que en el canvas llevaban órbitas interiores, se reproducen con **un solo anillo**:
gana la regla del anillo único (decisión del operador, 2026-09-26).

**La órbita no sustituye la composición** (regla del operador, 2026-09-26). No reemplaza la composición ni las
formas del [lenguaje fotográfico](../brand-photography/README.md): se usa en casos específicos (una lente, una medida,
un progreso, un foco), **se declara a propósito** y nunca va por defecto en una pieza. Cuando está, nunca cruza el
sujeto de la foto, las reservas de texto, el lecho ni la firma. Una pieza con foto conserva la composición que le da el
lenguaje fotográfico; la órbita se suma sólo si hace uno de sus tres trabajos.

**Origen verificado en producción:** `src/lib/artifact-composer/catalogs/insights-report/report-cover.html`,
`report-cover-light.html` y `report-back-cover.html`.

### 1.4 El foco — «Te hacemos visible»

La órbita leída como foco de escenario: la esfera en la punta del arco es la lámpara, el círculo es su luz y lo que
queda dentro es el cliente. Es la promesa del marketing dicha con la forma de la marca, y **siempre va con su
prueba**: «Te hacemos visible. Y lo medimos.»

- **Verbal:** idea de campaña bajo «Empower your Growth», con remate de prueba.
- **Visual:** penumbra navy y un solo foco; la esfera chica es la lámpara.
- **Espacio:** un foco real proyecta el círculo en recepción, stand o escenario.
- **Motion:** el foco barre la escena y se posa sobre el cliente.
- **Cuidar:** «visible» siempre con el mecanismo al lado (buscadores, respuestas de IA, alcance medido). Nunca
  nombres reales de competidores en el campo en penumbra. Una sola luz por pieza.
- **Revisión legal antes de cualquier pauta, sin excepción** (regla reafirmada por el operador el 2026-09-26): el claim
  «Te hacemos visible» no entra a medios pagados sin revisión legal.

### 1.5 La lente

La foto entera en navy apagado; dentro del círculo, a todo color y ampliada. La esfera muestra lo que importa:
dónde está la decisión. Funciona con cualquier foto del lenguaje fotográfico. **Riesgo:** exige una foto con un
punto de interés claro; con una foto débil se nota el truco.

La órbita de la lente es la misma de siempre, **nunca un disco suelto**: anillo con su aire (1,4 px al 28 %), un arco
corto de 50° y la esfera en su punta (radio 5,6 px), medidos por 794 px de ancho y escalados sólo por el ancho (en
1080 px: esfera 7,6 px; en 1920 px: 13,5 px). El arco va arriba a la izquierda, lejos de la cara (lámina 1.3; token
`efeonceGraphicLine.lens.anatomy`, corregido el 2026-09-26: antes dibujaba una esfera seis veces más grande y sin arco).

---

## 2. Color

| Contexto | Fondo | Texto | Acento (esfera, arco, anillo) | Halo |
|---|---|---|---|---|
| **Oscuro Efeonce** | `#001A33` (`--axis-deck-navy-920`) | blanco / `#F4F6F8` | `#36C8BF` (`--axis-deck-teal-500`) | `#72DED8` (`--axis-deck-recipe-cover-halo-teal`) |
| **Papel Efeonce** | papel `#F7F8F6` o blanco | navy `#023C70` | `#0E8C82` **sólo gráfico** (en texto chico no llega a 4,5:1) | navy al 6 % |
| **Productos, oscuro** | tinta `#091951` | blanco | Globe `#FF6500` · Wave `#0375DB` · Reach `#F83902` | el acento |
| **Productos, claro** | papel | tinta `#091951` | Globe `#BB1954` · Wave `#0375DB` · Reach `#F83902` | el acento |

Contrastes medidos de la esfera: Efeonce 8,5:1 (oscuro) y 3,9:1 (claro) · Globe 5,6:1 y 5,8:1 · Wave 3,6:1 y
4,3:1 · Reach 4,4:1 y 3,5:1. La esfera es gráfico, no texto; el texto cumple 4,5:1 siempre.

**Regla de contraste del acento** (decisión del operador, 2026-09-26). El acento de la línea debe llegar a **3:1 contra
su fondo** cuando es gráfico (arco, esfera, halo) o texto de **24 px o más**. **Nunca** se usa para texto de menos de
24 px: ahí va navy `#023C70` sobre claro y blanco sobre oscuro. Medido sobre los tokens publicados, los que quedan más
justos pasan 3:1 y no llegan a 4,5:1:

| Acento | Fondo | Contraste |
|---|---|---|
| Growth, teal `#0E8C82` | papel | 3,87:1 |
| Engine `#0375DB` | su oscuro `#091951` | 3,60:1 |
| Voice `#F83902` | papel | 3,53:1 |

Engine y Voice **conservan su color** (no cambian). Los valores viven en el token `efeonceGraphicLine.accentContrast`
(nuevo en `@efeoncepro/axis-tokens` 0.3.5).

**Magenta de Revenue-HubSpot, aprobado tal como está** (operador, 2026-09-26): `accentOnDark` `#E86BD0` (5,9:1 sobre
`#091951`) y `accentOnLight` `#8E1B82` (7,5:1 sobre papel). El naranjo de HubSpot no se usa: choca con Globe y Reach y
es el color del partner.

**Reglas:** una marca, un acento por pieza · el teal es sólo de Efeonce y nunca aparece en una pieza de producto ·
el halo toma el color del acento · nunca dos acentos en la misma órbita · los valores son sRGB: la conversión a
CMYK o Pantone se fija con prueba física del proveedor, nunca sin prueba.

---

## 3. Tipografía

- **Bricolage Grotesque, peso 760**, tracking −0,035 em: la palabra dominante (la respuesta).
- **Poppins:** la pregunta (Light 300), el texto (400–500) y los números (con cifras tabulares).
- El eslogan usa los pesos del SSOT de marca (`src/config/efeonce-brand.ts`).
- **Nunca:** Bricolage en párrafos · monoespaciada · falsas cursivas · `fontSize` inline en UI (usar variantes
  del sistema tipográfico, ver `typography-design`).

---

## 4. La voz: pregunta y respuesta

Siempre hay dos voces, y a veces una tercera:

| Voz | Tipo | Regla |
|---|---|---|
| **Pregunta** | Poppins Light con anillo teal | una pregunta real del cliente, no retórica; abre |
| **Respuesta** | Bricolage con su esfera | una a tres palabras; es el dominante y mide **al menos 3× la pregunta**; cierra |
| **Evidencia** | Poppins, una palabra en negrita | dato, fuente o mecanismo; puede faltar |

- **Abierta:** en cuadernos, pizarras y formularios la pregunta queda sola con su anillo: responde quien lo usa.
- **Cuidar:** tuteo neutro, sin voseo ni modismos · nunca dos preguntas ni dos respuestas seguidas · la respuesta
  no promete resultados que no se pueden probar · nada de chistes ni frases motivacionales.

**Banco de pares (candidatos, sin aprobar).** Criterio fijado por el operador el 2026-09-26: se aprueban **dos pares
por línea de servicio** y sólo con respuestas verificables; el operador revisa el banco (pendiente de su revisión).
Candidatos: ¿Lo medimos? Siempre. · ¿Quién decide? Tú, con evidencia. · ¿Y si
después lo hago yo? Esa es la idea. · ¿Y el reporte del viernes? Ya lo viste. · ¿Cuánto rindió? Te mostramos
todo. · ¿Cómo va? En vivo. · ¿Dónde quedó lo aprendido? En tu historial. · ¿Otra agencia más? No. Un sistema. ·
¿Y si lo probamos? Hoy.

**Verbos de la línea:** Hacer (Efeonce) · Medir · Crear (Globe) · Aparecer (Wave) · Llegar (Reach) · Siempre ·
Adelante · Gracias · Aquí.

---

## 5. El eslogan

«Empower your Growth» tiene dos formas oficiales: el **bloque con el logo** (centrado debajo) y el **eslogan
solo**, con la palabra final destacada. La palabra final rota por capability y toma el acento: **Growth**
(Efeonce), **Brand** (Globe), **Engine** (Wave), **Voice** (Reach).

- Se usa desde el archivo oficial; no se rearma.
- Va en cierres: final de video, última lámina, contratapa, firma de correo, recepción, merch.
- No va en cada post: ahí la respuesta con esfera ya cierra.
- **En el cierre del deck, la palabra final va en el acento de la línea, no en blanco** (operador, 2026-09-26):
  «Growth» en teal sobre `#001A33` da 8,5:1.
- **Nunca:** pegarle la esfera · traducirlo · cambiarle pesos o cursivas · escribirlo en mayúsculas.

---

## 6. Oficio a la vista

El trabajo se ve mientras ocurre. Cinco herramientas, **máximo dos por pieza** además de la esfera:

1. Guía de 1 px, del borde del texto al borde del soporte.
2. Marcas de corte, brazo del 3 % del lado corto.
3. Selección AXIS `eight-handles` (campaña) o `four-corners` (superficies tranquilas).
4. Nota al margen, una por pieza y firmada.
5. Cursores AXIS: local (screen-fixed), multiplayer acting y multiplayer moving.

Las guías y marcas van en azules; la selección y los cursores son los de AXIS tal como se resuelven en
producción (`@efeoncepro/axis-ui-contracts`), nunca coordenadas decorativas.

**El titular cierra con su esfera y las herramientas la incluyen** (operador, 2026-09-26): la selección, las marcas
de corte y los cursores miden la palabra con su esfera, porque la esfera es parte del texto (§1.2). Una selección que
termina en la última letra y deja la esfera afuera está mal. En AXIS es regla de contrato: el chequeo
`answer-period-part-of-text` de la línea gráfica y `target.bounds: 'rendered-group-including-terminal-sphere'` de
`efeonce.collaboration-selection` 0.3.0; en el paquete, `answerHtml` escribe la respuesta con su esfera y
`answerGroupBox` da la caja que miden las herramientas (lámina 2.3).

---

## 7. La familia

**Efeonce firma todo** (decisión del operador, 2026-09-26). Toda pieza sale con la firma de Efeonce, sea de servicios
creativos, web, RevOps, medios o cualquier otra línea: la marca que se posiciona es Efeonce. Globe, Wave y Reach
aparecen como **contexto**: son los productos con que se prestan esos servicios, subordinados a Efeonce. Nunca firman
una pieza ni reemplazan el logo de Efeonce.

**La palabra del eslogan es de la línea de servicio, no del producto** (operador, 2026-09-26). Cada macroservicio tiene
su eslogan y su producto:

| Línea de servicio | Eslogan | Producto (contexto) | Estado |
|---|---|---|---|
| **Servicios creativos** | Empower your **Brand** | **Globe**, la suite de estudio creativo | Globe en desarrollo |
| **Web, infraestructura, SEO y medición** (Digital Services & Engineering) | Empower your **Engine** | **Wave** | vigente |
| **Medios y distribución** | Empower your **Voice** | **Reach** | inferido de «y así sucesivamente»; confirmar |
| **Efeonce** (marca madre) · Growth Strategy & Measurement | Empower your **Growth** | **Greenhouse**, el producto de Efeonce que controla todo | Greenhouse vigente; la línea Growth Strategy, inferida (confirmar) |
| **RevOps y CRM** (sublínea de Efeonce) | **Revenue** («Empower your Revenue»; operador, 2026-09-26) | sin plataforma propia: se opera en **HubSpot** y **Salesforce** | color según la plataforma: HubSpot magenta berenjena, Salesforce cielo (tokens `lines`) |

**Greenhouse** es el producto de Efeonce y la plataforma que controla y orquesta todas las líneas (operador,
2026-09-26). Aparece como contexto igual que los demás productos —su nombre o su interfaz en un mockup—; su propia
interfaz sigue gobernada por `DESIGN.md` y AXIS de producto, nunca por esta línea gráfica.

Una pieza de servicios creativos firma con el logo de Efeonce y cierra con «Empower your Brand»; Globe aparece como el
producto con que se hace. Los pesos del eslogan no cambian (`src/config/efeonce-brand.ts`: *Empower* ExtraBold itálica,
*your* ExtraBold, palabra final Black itálica).

- **Igual en toda la familia:** la esfera y el anillo (forma, 0,20 em, comportamiento) · el oficio a la vista y
  los cursores AXIS · la voz · Bricolage + Poppins · el papel como fondo claro.
- **Cómo aparece un producto como contexto:** su nombre dentro de la pieza (antetítulo o etiqueta), su interfaz en un
  mockup o su isotipo pequeño dentro de su propia superficie. El lockup «Producto by efeonce» vive sólo en superficies
  del propio producto (aplicación, ingreso, página del producto), nunca como firma de una pieza.
- **Cada pieza toma el color de su línea** (operador, 2026-09-26): la esfera, el anillo y la palabra final del
  eslogan van en el acento de la línea; el logo que firma sigue siendo el de Efeonce. Los acentos viven en los tokens
  `family` de AXIS (hoy colgados del producto; deuda: pasarlos a la línea). RevOps y CRM toma el color de la plataforma
  en que se opera (HubSpot o Salesforce): los dos acentos viven en los tokens `lines` (`revenue-hubspot`,
  `revenue-salesforce`); el magenta de HubSpot quedó aprobado tal como está el 2026-09-26 (§2).
- **Mapa de portafolio:** el arco y el centro son de Efeonce; los productos van como satélites con su isotipo.
- **Hilo de familia (decidido):** la órbita misma, más la palabra final del eslogan. Descartado: el anillo teal
  en productos.

---

## 8. Logo e isotipo

### 8.1 Cuándo usar cada uno

- **Logo completo:** post, slide, portada, email, reverso de taza, muro, stand; siempre que quepa a 96 px o más.
- **Firma de una pieza gráfica** (post, anuncio, portada con foto): el logo de Efeonce **centrado abajo**; la burbuja
  URL sólo lo reemplaza cuando el logo ya está dentro de la imagen (§8.5).
- **Isotipo:** avatar, favicon, ícono de app, pin, sticker, credencial, lomo de cuaderno, marca de agua en video.
- **Nunca los dos en la misma vista.**
- Productos: **nunca firman una pieza**; la firma es siempre Efeonce (§7). Su isotipo o su lockup «by efeonce» sólo
  dentro de su propia superficie (aplicación, ingreso, página del producto).

### 8.2 Logo — uso correcto

| Regla | Detalle |
|---|---|
| A color sobre blanco o papel | el navy oficial, desde el archivo |
| Negativo sobre navy | siempre el archivo negativo, todo blanco |
| Sobre foto | sólo en una zona calma, con contraste ≥ 4,5:1 medido; nunca con velo encima |
| Área de resguardo | **X = alto de la nave**, en los cuatro lados. Nada entra en ese margen: ni texto, ni bordes, ni la órbita. En los cierres de marca donde el logo va dentro de la órbita (§8.3 n.º 8), el anillo queda **fuera** de ese margen |
| Tamaño mínimo | **96 px en pantalla · 25 mm impreso**; recomendado ≥ 160 px. Bajo el mínimo, el isotipo [propuesta, validar con prueba de impresión] |
| Familia | cada marca con su propio archivo, a color o en negativo (productos sobre `#091951`) |
| Logo con eslogan | sólo el bloque oficial, en cierres |
| En una frase de display | **sí, con reglas**: sólo en titulares grandes (el logo sobre 96 px); misma altura de x y misma línea base que el texto (la altura de x de «efeonce» es el 55 % del alto del archivo y su línea base cae al 80 %: con Bricolage 760, `height: 0.94em; vertical-align: -0.19em`); una vez por pieza y sin repetir el logo como firma en la misma vista; reemplaza sólo la palabra Efeonce; color oficial y el punto final al cierre de la frase, nunca pegado al logo |

**Cómo elegir:** ¿cabe a 96 px? Logo completo; si no, isotipo. ¿Fondo oscuro? Negativo. ¿Claro? A color. ¿Foto?
Zona calma o cambia la foto; no se oscurece encima. En objetos, el logo va en el dorso, solo.

### 8.3 Logo — usos incorrectos (los doce)

1. Estirar o comprimir.
2. Rotar o inclinar: el logo va siempre horizontal.
3. Recolorear: ni teal, ni el acento de otra marca.
4. Degradados o efectos: el logo es plano.
5. Sombras, brillos o contornos.
6. Sin contraste: navy sobre azul oscuro, o sobre textura.
7. Sobre una foto cargada: el logo compite con la escena.
8. Órbita alrededor del logo: la órbita rodea palabras, nunca el logo. **Única excepción, los cierres de marca**
   (decisión del operador, 2026-09-26): el cierre del deck, el cierre de video (las animaciones del logo aprobadas
   terminan así) y el muro de recepción, siempre con el anillo fuera del resguardo X. **Nunca** en el banner de
   LinkedIn (lámina 4.1) ni en el reverso de la tarjeta de presentación (lámina 4.6): en objetos el logo va solo en el
   dorso y la órbita no entra en su resguardo. Cualquier otro uso del logo sigue esta regla sin excepción.
9. Agregarle la esfera o un punto: la esfera es de la palabra, no del logo.
10. Escribirlo con una fuente: se usa el archivo, no se tipea.
11. Logo e isotipo juntos: uno u otro en cada vista.
12. En texto corrido (párrafos, interfaz, tamaño chico): el logo no reemplaza una palabra. En titulares de display sí, con las reglas de §8.2.

La causa es siempre la misma: tratar el logo como una imagen editable. **Si ninguna versión funciona, cambia el
fondo o la foto, no el logo.** Si falta una versión (por ejemplo, un negativo todo blanco de Wave), se pide a
diseño; no se arma en la pieza.

### 8.4 Isotipo — uso correcto, incorrecto y tamaño mínimo

El isotipo ya es una órbita: no se le agrega nada.

- **Correcto:** a color sobre blanco o papel · blanco sobre navy (archivo blanco oficial) · avatar: círculo navy
  con el isotipo al 60 % del ancho · ícono de app o favicon: cuadrado redondeado, mismo margen.
- **Área de resguardo:** **X = diámetro de la esfera del isotipo**, en los cuatro lados.
- **Tamaño mínimo:** **24 px en pantalla · 8 mm impreso**. A 16 px las tres ventanas de la nave se pierden: el
  favicon de 16 px se valida aparte [propuesta].
- **Incorrecto:** rotarlo o voltearlo (la nave sube hacia la derecha, siempre) · recolorearlo · estirarlo ·
  ponerle otra órbita · recortarlo en un círculo que lo corta (el círculo contiene; no corta) · armar un lockup
  propio (isotipo + palabra tipeada no es el logo) · sin contraste · mezclarlo con otro isotipo.

**Aviso conocido:** el isotipo de Wave en negativo (repo y OneDrive) conserva media figura en azul. Si existe una
versión toda blanca, se reemplaza.

### 8.5 La URL: siempre en su burbuja

> **Delta 2026-09-26 — firma de piezas gráficas (regla del operador).** En una pieza gráfica (post, anuncio, portada
> con foto) la firma es **el logo de Efeonce centrado**, abajo al centro. La burbuja URL (`efeoncepro.com`, asset
> `url-lum`) **no se agrega por defecto**: sólo **reemplaza** al logo cuando el logo de Efeonce ya aparece dentro de la
> imagen (mockup, objeto, merch o similar), y entonces va **centrada y con fusión de luminosidad**. Nunca a un costado
> ni junto al logo: repetiría la marca.
>
> **La realidad del contraste.** La fusión fija la luminosidad del gris `#848484`, así que la burbuja sólo llega a
> 4,5:1 sobre un lecho **muy oscuro**. Medido el 2026-09-26: a opacidad 0,72 no llega en ningún fondo (3,82:1 sobre
> `#001A33`, 4,00:1 sobre negro); a opacidad plena, 6,17:1 sobre `#001A33` y 6,78:1 sobre negro en el píxel máximo y del orden de 4,4–4,9:1 midiendo
> el 1 % peor de su tinta sólida sobre lechos casi negros; sobre fondos medios o claros, 1,6–3,1:1. Por eso, como firma,
> la burbuja se fusiona a **opacidad 1** y un gate mide ≥ 4,5:1 sobre los píxeles finales; si no llega, el chequeo
> falla y la pieza no pasa.
>
> **Umbral decidido: 4,5:1** (operador, 2026-09-26). La burbuja es texto chico que la gente tiene que leer, no un
> objeto gráfico: no baja a 3:1. Token `efeonceGraphicLine.urlBubble.minContrast: 4.5`.
>
> Los usos de la burbuja como **pie** (deck, informe, papelería, stand, firma de mail y pies de página) **no cambian**:
> siguen como se describe abajo, con las variantes horneadas donde no hay fusión. Contrato: elemento `signature` de
> `efeonce.graphic-line-orbit` (desde 0.2.0; hoy 0.3.0) y tokens `efeonceGraphicLine.signature` (§13).

Donde aparezca `efeoncepro.com` va la **burbuja oficial** (`url-lum.svg`, el mismo asset del pie de Insights y del
deck), nunca la URL como texto: stand, pendón, tarjeta, carnet, hoja membretada, firma de mail y pies de página.
El SVG se mantiene gris y se aplica con **`mix-blend-mode: luminosity`**, que lo adapta al fondo; no se recolorea
ni se redibuja. Donde la fusión no está garantizada (visores, correo, PDF, referencias para IA) se usa el resultado
**horneado** con la fórmula W3C: variante clara `#848484` sobre blanco o papel y variante sobre navy `#6F89A2` sobre
`#001A33`, ambas con el color como atributo del trazo (sin bloque de estilos: hay visores que lo descartan y el
trazo queda negro). Archivos: `docs/operations/brand-graphic-line/deliverables/assets/url-lum-{light,dark}.svg`.

### 8.6 Archivos

`public/branding/` y `public/branding/SVG/` en el repo; `OneDrive › Alineación › 5. Contenidos › 13- Branding ›
SVG`. Nunca se redibujan ni se exportan desde una captura.

Desde AXIS 0.2.7 la fuente oficial para código y agentes es el paquete **`@efeoncepro/axis-brand-assets`**: 19 SVG
(logo e isotipo en positivo y negativo de Efeonce, Globe, Wave y Reach; la burbuja `url-bubble-source` gris para
fusionar y las horneadas `url-bubble-baked-light` y `url-bubble-baked-dark`), cada uno sellado con su SHA-256 y la
proporción de su viewBox. No incluye fuentes ni fotos, y no es `efeonce.brand-logos` (la procedencia de logos de
terceros en interfaces). Las copias locales de Greenhouse se vigilan contra el paquete (§13). Desde 0.3.0 el paquete
suma además 48 órbitas estáticas (SVG + PNG), generadas desde `@efeoncepro/axis-graphic-line` (§13.1).

---

## 9. Fotografía

La foto va en la lente o en el foco, con su luz y **sin velo**. Personas reales del equipo o escenas del oficio;
nunca banco de imágenes. **La órbita no sustituye la composición fotográfica** (§1.3): la foto conserva su
composición y la órbita sólo se suma, declarada, cuando hace uno de sus tres trabajos. Se produce con el pipeline canónico del [lenguaje fotográfico](../brand-photography/README.md)
(`pnpm foto:prompt` para revisar el prompt, `pnpm foto:generar <ficha>` para producir el plate con las referencias que la ficha declara y `pnpm foto:validar` para medirlo), nunca armando prompts a mano.

**Reglas de la toma para la lente:** el sujeto cabe en un círculo del 55 % con 15 % de aire; ese 55 % es del **círculo
visible de la lente** en el formato de la pieza, no del lado corto del plate (en `post` la lente muestra ≈ 35 % del lado
corto), y si no cabe **se ajusta la toma, no la pieza** (operador, 2026-09-26; §9.1) · fuera
del círculo la foto tolera quedar en navy apagado · **sin emblema legible** (el logo lo pone la pieza, no la ropa) ·
el azul lo porta un objeto del oficio, nunca un muro de fondo · un acento cálido (naranja o lima) en una de cada dos
fotos, nacido de la acción · la obra en proceso · registro documental: nadie mira al lente.

**Banco propio (generado el 2026-09-25):** ocho tomas en el lenguaje fotográfico de Efeonce, una ficha por toma con
`pnpm foto:generar` (11 generaciones, del orden de USD 0,55). Fichas, plates y descartes en
`ai-generations/2026-09-25_banco-lente-orbita/`.

| # | Toma | Palanca | Acento |
|---|---|---|---|
| 1 | Manos ajustando una curva de color | manos | — |
| 2 | Elegir entre doce pruebas de una etiqueta | variantes | naranja |
| 3 | Estratega pone el imán sobre la órbita | sombra | lima |
| 4 | Camarógrafo revisa la toma en el monitor | quien-sostiene | — |
| 5 | Informe impreso, la línea que sube | cenital | lima |
| 6 | Llamada con cliente, sólo la escucha | escucha | — |
| 7 | La pieza aprobada, proyectada sobre ladrillo | proyeccion | naranja |
| 8 | Mesa al final del ciclo, con la pieza impresa | ausencia | — |

Tres se rehicieron por el lenguaje (la 5 salió como flatlay de stock, la 8 como oficina ordenada sin huella, la 6
con un muro navy de fondo). Las palancas de la 3 y la 4 cambiaron respecto del brief: `instrumento` exige mirar a
través de una herramienta. El banco reemplaza a las tres fotos repetidas en todas las piezas con lente, ventana y
foco, y en los estímulos de la prueba sin logo.

### 9.1 La foto en la línea

**El lenguaje fotográfico de Efeonce sigue vigente entero** (decisión del operador, 2026-09-26): la línea converge con
él y los dos se enriquecen. La foto muestra el oficio; la órbita señala lo que importa dentro de él. Los dos comparten la
idea al pie de la letra: el [lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) se llama
«El oficio a la vista» y el §6 de este manual también.

- **Quién manda:** en una pieza con foto sin dato ni foco, la foto, y no hay órbita. En la lente y el foco, la órbita
  manda el layout y la foto manda lo que hay dentro del círculo. La composición, las palancas, las reservas y el lecho
  siguen siendo del lenguaje fotográfico.
- **La foto se prepara para la órbita desde la toma**, con `pnpm foto:prompt`: un solo punto de interés en el centro de
  la lente del formato, formato nativo, registro documental, sin emblema legible, el azul en un objeto del oficio y la
  luz sobre el sujeto.
- **La órbita lee la foto sin romperla:** las zonas `protect` del adapter (sujeto, reservas y lecho), la firma a la
  altura medida del lecho (`signature.y`), nunca un halo ni un velo sobre la foto fuera del tratamiento propio de la
  lente y del foco.
- **Reglas de sinergia P1–P12 aprobadas** (operador, 2026-09-26): las doce de la referencia de convergencia (§6) dejan
  de ser propuesta. P5 (cerrar las brechas del chequeo de la órbita contra lecho y reservas, y medir el sujeto contra el
  círculo visible) y P9 (campo `reservas.lente` en `foto:prompt`) necesitan código y van a una task nueva, la «task de
  `foto:prompt` y chequeos de la lente»; hasta que se implemente, se aplican a mano en la revisión.

**Conflictos resueltos por el operador (2026-09-26).** Los nueve puntos donde las dos reglas parecían chocar quedan así:

| # | Resolución |
|---|---|
| **P-1** | El exterior apagado de la lente **cuenta como la reserva del texto**: es un tratamiento de la línea, no un velo. La regla «nunca un scrim» sigue para toda pieza sin lente |
| **P-2** | En piezas con lente **se pide el lecho igual** (regla P12) |
| **P-3** | El 55 % es del **círculo visible** de la lente; se ajusta la toma, no la pieza |
| **P-4** | Un anillo dibujado dentro de la escena **cuenta como órbita**: en una pieza con lente, se elige otro plate o se rehace la toma |
| **P-5** | La capa gráfica sobre la foto queda **aprobada sólo en los casos declarados de la línea**: la voz pregunta–respuesta, la lente y la medida con fuente. Para todo lo demás sigue cerrada |
| **P-6** | El formato nativo **1200 × 627** entra a `foto:prompt` (task); nunca se recorta desde 16:9 |
| **P-7** | El retrato de perfil (firma de correo, tarjetas de equipo) entra al lenguaje fotográfico como **categoría propia**, donde mirar a cámara está permitido (a diferencia del registro A). Su barra está por redactar en esa categoría |
| **P-8** | El límite «cabezas y manos bajo el 36 %» aplica **sólo cuando la toma tiene reserva de texto**; `foto:prompt` debe emitirlo sólo entonces (task) |
| **P-9** | En piezas con lente **manda la cláusula de encuadre**; las palancas que llenan el cuadro (`variantes`, `manos`) sólo para piezas de sólo foto |

Canon fotográfico: [índice](../brand-photography/README.md) y su
[§11 «La línea gráfica en la foto»](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#11-la-línea-gráfica-en-la-foto).
Contrato completo (vocabulario común, tabla de quién manda por pieza, brief campo por campo, lo que la lente muestra por
formato, reglas de sinergia vigentes y propuestas, QA conjunto, pendientes y un ejemplo de punta a punta):
[`photography-convergence.md`](../../../.claude/skills/efeonce-graphic-line/references/photography-convergence.md) de la
skill `efeonce-graphic-line`.

---

## 10. Aplicaciones

### 10.1 Pantalla y campaña

- **Deck:** la órbita es la navegación. La portada lleva un arco corto; cada sección suma su tramo; el cierre
  completa la órbita con la esfera arriba. En el contenido en papel, la órbita baja a 80 px en la esquina. **Cierre del
  deck** (operador, 2026-09-26): es uno de los tres cierres de marca donde el logo va dentro de la órbita, con el anillo
  fuera del resguardo X (§8.3 n.º 8), y la palabra final del eslogan va en el acento de la línea, no en blanco (§5).
- **Banner de LinkedIn (lámina 4.1) y fondo de Teams (lámina 4.3):** un solo anillo, sin órbitas interiores (§1.3). En
  el banner **nunca** va el logo dentro de la órbita (§8.3 n.º 8).
- **Campaña:** la órbita rodea la lente con aire; la esfera va arriba a la izquierda, lejos de la cara.
- **Movimiento (cierre de marca 4,5 s):** anillo 0–0,5 s · arco 0,4–1,4 s · la esfera asienta 1,4–1,7 s · halo
  1,2–2,0 s · logo 1,9–2,5 s · eslogan 2,5–3,0 s. Con movimiento reducido, cuadro final fijo. Desde AXIS 0.2.7 estos
  tiempos son el token `efeonceGraphicLine.brandClose` y el elemento `brand-close` del contrato (no va en impresos).
  Desde AXIS 0.3.0 esa misma animación de la órbita, **sin logo ni eslogan**, sale del paquete
  `@efeoncepro/axis-graphic-line` (`ORBIT_MOTION_CSS`, `ORBIT_MOTION_TIMELINE`, `orbitMotionFrameCss`, sobre los
  tiempos de `brandClose`) y se exporta a video con `pnpm orbit:video -- --format 16x9 --surface dark --out <dir>`
  en el repo de AXIS (formatos 16x9, 1x1, 4x5 y 9x16; fondos oscuro y claro).
- **Animaciones del logo (V1.1, aprobadas el 2026-09-26):** tres piezas que conviven con el cierre anterior y no lo
  reemplazan. **Reveal** (la línea se vuelve logo, 3,6 s): cierre de video, apertura de presentación o intro de
  evento. **Apertura** (el logo se abre en la línea, 2,4 s): paso del logo al lenguaje de la línea. **Sting** (el
  golpe corto, 1,6 s): cortinillas, redes y cierres breves. Son marca propia de Efeonce: nunca para clientes ni para
  la UI de Greenhouse, y nunca se generan con un modelo de video. El cierre de video es un cierre de marca: termina con
  el logo dentro de la órbita, respetando el resguardo X (§8.3 n.º 8). Dónde están:
  - MP4 con sonido (60 y 30 fps), GIF de vista previa y cuadro final (con fondo y transparente): OneDrive
    `Alineación › 5. Contenidos › 13- Branding › Motion Órbita Efeonce › v1.1` (con su `LEEME.txt`).
  - Masters pesados (ProRes 4444 con alfa para After Effects, Premiere, Final Cut o DaVinci; WebM con alfa para web;
    HEVC con alfa para Safari y Keynote): bucket público de AXIS `gs://efeonce-group-axis-public-media/motion/logo/v1.1/<animación>/<formato>/<fondo>/`
    (`https://storage.googleapis.com/efeonce-group-axis-public-media/motion/logo/v1.1/…`; creado el 2026-09-26 con
    autorización del operador). Nunca en git.
  - Fichas, versiones web livianas y cómo se recrea cada una: Lab de AXIS, sección **4.4.2 «Animaciones de marca»**
    ([axis.efeonce.org/references/graphic-line/#animaciones](https://axis.efeonce.org/references/graphic-line/#animaciones)).
  - Spec de producción, tiempos, oclusión y QA: [`EFEONCE_ORBIT_REVEAL_MOTION_V1.md`](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md)
    (se produce con `scripts/creative/brand-motion/`).
- **Identidad sonora (recomendada, 2026-09-26; no canon):** el logo sonoro «Tres puntos que se vuelven uno» traduce la
  gramática de la órbita a sonido (el anillo pregunta, tres notas en Mi piensan, la esfera responde en La con el único
  golpe), con dos registros (fondo y energía), el timbre de la esfera por línea de servicio y la etiqueta con voz. Re-sonoriza
  las tres animaciones sin tocar la imagen; los masters V1.1 conservan su sonido hasta canonizar. Guía y kit en
  [axis.efeonce.org/references/sonic-brand/](https://axis.efeonce.org/references/sonic-brand/); canon en
  [`EFEONCE_SONIC_IDENTITY_V1.md`](../brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md). Glitch (podcast) pendiente.
- **Lenguaje de movimiento de la órbita (norma, 2026-09-26):** [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)
  convierte las animaciones aprobadas en siete reglas para cualquier pieza nueva: ritmo lento–rápido–lento con
  anticipación y un protagonista a la vez; llegar con golpe (sobrepaso por papel, pulso con eco, onda de acento sólo en
  un encaje y resorte casi crítico); curvas por papel (llega `emphasized`, se transforma `standard`, se va
  `emphasizedAccelerate`); la velocidad no salta en los relevos y la cámara acerca en escala logarítmica; desenfoque
  real sólo en los tramos rápidos y color mezclado en OKLab; geometría oficial con oclusión coherente, la esfera como
  protagonista y la jerarquía del cuadro (logo final al 50 % del lado corto en 16:9, 56 % en cuadrado y 66 % en
  vertical; eslogan al 64 % del logo); y un golpe sonoro por impacto. **Los valores viven en el token
  `efeonceGraphicLine.motion`** (`@efeoncepro/axis-tokens` 0.3.3) y el render los lee de ahí; nunca se escriben en un
  script.
- **Grillas:** margen del 9 % del lado corto en redes (96 px sobre 1080) y 140 px en 16:9; en 9:16 se respeta la
  zona que tapa la interfaz de cada red.

### 10.2 Firma de mail

**Aprobada el 2026-09-26 (v3.1) en sus dos versiones:** **A · sobre papel** y **B · tarjeta navy**. HTML de correo
con tablas y estilos en línea, 460 px en escritorio y fluida en móvil. Contrato AXIS `efeonce.email-signature` 0.3.0
(`stable`), tokens `efeonceGraphicLine.emailSignature`, lámina 4.5 del Lab y guía
`docs/agent-composition/email-signature.md` en el repo de AXIS. Generador vigente:
`ai-generations/2026-09-26_firma-partners/build4.mjs` (salida en `out/v3.1/`).

**Zonas, en este orden** (las opcionales se omiten; el orden no cambia):

| Zona | Aire antes | Regla |
|---|---|---|
| Foto con órbita | — | `portraitOrbitSvg`, 96 px, PNG 2× (proporciones abajo) |
| Nombre y cargo | — | El nombre es la única voz de titular: Bricolage 800, 22 px, con el punto en el acento de la línea. El cargo, Poppins 400 |
| Teléfono y correo | — | Texto vivo en Poppins 13 con íconos Tabler outline (trazo 1,75) en el acento |
| Burbuja URL y LinkedIn | — | La URL siempre en su burbuja horneada; LinkedIn como ícono con enlace |
| **Línea que termina en la esfera** | 18 px | **Una sola vez**: separa a la persona de la marca |
| Cierre de marca | 14 px | Logo de Efeonce + «Empower your Growth» (palabra de la línea) |
| **Regla de sección** | 20 px | Línea fina **sin esfera**, en el color de borde de la superficie. Abre la zona de partners |
| Partner oficial de | 16 px | Etiqueta Poppins 500 11 px + la franja de logos |

**Las dos líneas son la regla.** La que termina en la esfera va una vez; la regla de la zona de partners nunca lleva
esfera: si la esfera se repite, deja de ser identidad. Con 16 px y sin regla, «Partner oficial de» se leía como bajada
del logo de Efeonce; el operador comparó espacio solo, línea fina y banda de pie, y eligió la línea fina.

**Franja de partners:** logos **oficiales** de cada programa en **un solo tono** por superficie (`#7c92aa` sobre
navy, `#8a95a2` sobre papel) y con **el mismo peso óptico** (misma área de tinta, 430 px² a 1×, en una caja de 80 × 24
px), en filas justificadas de hasta cinco (9 → 5 + 4). Va horneada como **una sola imagen** con un texto alternativo
que nombra a cada partner. Sólo entran relaciones que el [registro de partnerships](../EFEONCE_PARTNERSHIP_REGISTRY_V1.md)
permite declarar (activas, aceptadas o declaradas por el operador); el contrato rechaza las demás. Hoy: HubSpot,
Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus. **Truora es partner pero no va en la
firma** (decisión del operador, 2026-09-26). La insignia oficial de cada programa (tier, uso permitido) sigue
pendiente de readback en su portal; la firma usa los logotipos de marca, no insignias de nivel.

**Lo que no va en la firma:** «Quedo atento.», «Saludos» y cualquier cierre van en el cuerpo del correo. En Outlook,
la **firma de respuestas y reenvíos** es una línea de texto vivo (nombre, cargo, teléfono), sin imágenes.

**Correo real:** Outlook y Gmail no cargan fuentes web y muestran Arial (se revisa también así); no muestran SVG ni
fusiones, así que foto, íconos, logo, burbuja y franja van en PNG servidos desde una URL pública; la regla de sección
es el borde superior de una celda (Outlook ignora un bloque de 1 px). **Imágenes publicadas** en
`https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1/` (`shared/<dark|light>/` para íconos, logo, burbuja y franja; `people/<persona>-<dark|light>.png` para la foto).
El generador con `HOST_BASE=<esa URL>` escribe `out/v3.1/hosted/` (lo que se sube con `gcloud storage cp -r`) y los
HTML listos para pegar: `outlook-a.html`, `outlook-b.html` y `outlook-respuesta.html`. Paquetes AXIS con el contrato:
`@efeoncepro/axis-tokens` y `@efeoncepro/axis-ui-contracts` 0.3.2. **Pendiente:** instalar la firma en Outlook (cada
persona, en su cuenta): **cada persona la instala en Outlook desde el HTML generado** (decisión del operador,
2026-09-26).

**Firma de equipo** (aprobada el 2026-09-26, `variant: 'team'`): para el buzón de un área. **No lleva foto:** la misma
órbita del retrato rodea el **ícono del área** (Tabler outline) sobre un disco; el ícono va en el color del nombre y la
esfera en el acento. El nombre es el área con su punto y la bajada su descripción. Lleva **sólo el correo del área**:
sin teléfono ni LinkedIn personal. Todo lo demás es igual a la firma personal.

| Área | Bajada | Ícono | Buzón |
|---|---|---|---|
| Talent | Personas y talento · Efeonce | `users-group` | `talent@efeoncepro.com` |
| Finance | Finanzas y facturación · Efeonce | `coins` | `finance@efeoncepro.com` |
| Commercial | Comercial y alianzas · Efeonce | `briefcase` | `sales@efeoncepro.com` |

Generador: `AREA=<talent|finance|commercial> node build4.mjs` (con `HOST_BASE` escribe `out/equipo/<área>/hosted/` y
sus `outlook-*.html`); el ícono con órbita se publica en `areas/<área>-<dark|light>.png`. En AXIS: tokens
`efeonceGraphicLine.emailSignature.team` y contrato con la variante `team`, desde `axis-tokens` y `axis-ui-contracts`
0.3.4. Un área nueva se agrega primero en esos tokens. **`people@efeoncepro.com` usa la firma del área Talent**, no un
área nueva (operador, 2026-09-26). Pendiente del operador: la URL de LinkedIn de la empresa (hoy la firma de equipo no
lleva LinkedIn).

**Proporciones del retrato (lámina 4.5, medidas del original, caja de 208 px):** anillo de radio 96, foto recortada en
círculo de radio 78, arco de 200° a 250° con trazo 4 y la esfera de radio 7 en su punta; anillo de 2 px en navy al
22 % sobre claro y en halo al 40 % sobre oscuro. Son el token `efeonceGraphicLine.portrait` (fracciones del lado de la
caja, así escalan a cualquier tamaño) y las pinta `portraitOrbitSvg` de `@efeoncepro/axis-graphic-line` (también para
tarjetas de equipo y fotos de perfil); el divisor que termina en la esfera es `sphereDividerSvg`. Los clientes de
correo no muestran SVG: se rasteriza a 2× y se sirve el PNG. La órbita sale del paquete; no se redibuja.

### 10.3 Oficina

- **Llegar:** el logo completo va una sola vez, en el muro de recepción dentro de su órbita (uno de los tres cierres de
  marca, con el anillo fuera del resguardo X; §8.3 n.º 8). Salas con verbos
  (Hacer, Medir, Crear); en el directorio, cada área con la esfera en su acento; la señalética de servicio en
  Poppins, sin esfera ni órbita.
- **Trabajar:** **anillo = libre o abierto; esfera = ocupado o decidido**, nunca como semáforo de colores (token
  `efeonceGraphicLine.state` y elemento `state`, que siempre lleva su etiqueta). El arco
  del estado de sala mide tiempo real. Una lente o una órbita por muro o vidrio; nada de patrones. Muro de voz: una
  pregunta y su respuesta por espacio.
- **Convivir:** tazas, cuaderno, credencial, stickers, fondos de pantalla (la órbita a la derecha, la zona izquierda
  libre para la cámara) y tarjetas de mesa con la voz. Los datos reales los completa la oficina.
- **En foto:** las nueve aplicaciones fotografiadas en un espacio real están en §10.9.

### 10.4 Objetos — la regla

> **Frente: la palabra en Bricolage con su punto** (la órbita es opcional y siempre alrededor de la palabra, con el
> acento de cada marca). **Dorso: el logo solo**, chico y abajo, sin órbita ni texto. La órbita alrededor del logo
> quedó descartada.

- **Tazas:** la blanca con «Hacer.» es la favorita del operador; con la órbita en Bricolage también funciona. En
  cerámica no hay halo: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm, órbita Ø 74 mm. El interior toma el acento.
- **Vaso térmico y botella deportiva:** acero con pintura en polvo; diseño propio, nunca la forma ni la tapa de una
  marca existente.
- **Lapiceros:** el botón superior es la esfera, en el acento de cada marca.
- **Pulseras de silicona:** un verbo con su punto; las de color, texto y punto en blanco.
- **Alfombra de escritorio (90 × 40 cm):** la órbita a la derecha, bajo el mouse.
- **Llavero:** la argolla es el anillo y la cuenta teal es la esfera; la placa dice «Adelante.» y atrás, el logo.
- **Paraguas:** visto desde arriba es una órbita con «Siempre.»; de lado, el logo en un paño.

### 10.5 Vestir

El uniforme actual (polo, hoodie, gorra, chaqueta, lanyard) **sigue vigente**; lo nuevo son ediciones.

- **Polo navy:** «Hacer.» bordado chico en el pecho y el botón superior de la tapeta en teal. La softshell se
  queda como está.
- **Polera navy:** la órbita con «Hacer.» centrada en el pecho. En el hoodie no se usa: la capucha y el bolsillo la
  cortan.
- **Polera blanca:** una respuesta chica en el pecho y su pregunta en la nuca, por dentro.
- **Gorra:** «Hacer.» bordado adelante y el botón superior en teal.
- **Técnica según la tela:** bordado en piqué y softshell; estampado en algodón. Prueba física antes de producir.

### 10.6 Identificarse

- **Carnet:** la foto con su órbita, el nombre con su punto, el cargo y el logo abajo. Atrás: «¿Lo encontraste?
  Devuélvelo.»
- **Credencial de evento:** el rol por la forma — **anillo = asistente, órbita = speaker, esfera = staff** —, no por
  colores; el staff en navy.
- **Tarjeta de presentación:** adelante la persona; atrás **el logo solo**, y la órbita nunca entra en su resguardo
  (decisión del operador, 2026-09-26, que corrige la lámina 4.6: la órbita alrededor del logo es sólo de los cierres de
  marca, §8.3 n.º 8).
- **Pin esmaltado:** la órbita en plata y teal.

### 10.7 Bienvenida, papelería y eventos

- **Caja de bienvenida:** la tapa pregunta y responde («¿Primer día? Adelante.»); adentro, «Esto es tuyo. [Nombre].»
  y el kit (botella, carnet, llavero, polo, lapicero, tarjeta). El logo va en el canto.
- **Envío a clientes:** por fuera, sobrio (logo chico y un anillo): lo que viaja por correo no anuncia lo que lleva.
  Por dentro, «Gracias.» y el papel de seda cerrado con un sello teal: la esfera.
- **Hoja membretada A4:** logo arriba a la izquierda, la órbita recortada en la esquina superior derecha al 18 % en
  navy, pie con dirección, teléfono y web; la línea del pie termina en la esfera. Texto en Poppins 11 pt; nunca la
  órbita detrás del texto. La continuación no lleva órbita.
- **Sobre americano:** frente con logo y remitente; en el dorso, **el sello es la esfera: cerrado = respondido**.
- **Stand (3 × 2,4 m):** el telón pregunta y responde en la mitad de arriba, sobre la altura del mesón («¿Te
  encuentran cuando te buscan? Aquí.»); el pendón (85 × 200 cm) lleva la conversación al centro y 20 cm libres
  abajo; el mesón (100 × 90 cm) lleva el logo solo: es la firma del stand.

### 10.8 Merch en foto

La lámina 4.8 del canvas incluye 17 fotos de producto generadas con IA (GPT Image 2.5 Sunburst) a partir del **arte plano exacto**
de cada pieza como referencia, y de los kits reales de prenda (polo, gorra, lanyard) como referencia de forma y
tela. El modelo sólo pone material y luz. **Son maquetas de presentación**: la producción sale de los archivos
vectoriales y de una muestra física del proveedor. Prompts y runner: `exploracion-v5/merch-ia/`.

### 10.9 Oficina en foto

La lámina 4.9 muestra las nueve aplicaciones de oficina de 10.3 fotografiadas en un espacio real: mural de
recepción, vidrio de sala, muro del pasillo, pizarra de proyecto, pantalla de estado de sala, muro de voz, cocina,
puesto de bienvenida y cabinas. Mismo método que el merch: el arte plano de la lámina 4.3 es la referencia exacta y
GPT Image 2.5 Sunburst (`xhigh`) sólo pone el espacio, el material y la luz, en el registro documental del
lenguaje fotográfico (luz de día con una dirección, materiales reales, nadie mira al lente).

Lo que enseñó la corrida (9 generaciones y 4 ediciones):

- **El modelo imprime todo lo que ve en el arte, incluidas las notas de la lámina.** Dos fotos salieron con la
  anotación pintada en el muro («v07 · aprobada por dirección de arte», «Muro de voz: una pregunta…»). El arte que
  se pasa como referencia debe quedar **sin leyendas de lámina**; si ya salió, se corrige editando la foto.
- **El logo chico se reinventa.** En el carnet, el símbolo del logotipo salió como una mancha. Se corrigió editando
  la foto con el logo oficial (`public/branding/logo-full.svg`) como segunda referencia; revisarlo siempre al 100 %.
- **La puntuación se revisa letra por letra:** un espacio antes del punto final se corrigió editando la foto.
- Las correcciones se hacen **editando la foto generada** (editar conserva) y no regenerando la escena.

Son **maquetas de dirección**: la producción sale de los archivos vectoriales, con prueba de color sobre el
material real (vinilo, pintura, cerámica, impresión). Runner, ediciones y prompts:
`exploracion-v5/oficina-ia/` (`items.mjs`, `edits.mjs`, `LEEME.md`).

---

## 11. Do's & Don'ts — resumen

| Elemento | Sí | No |
|---|---|---|
| Esfera | al final de la respuesta, 0,2 em, en el acento; una por pieza | en preguntas, como viñeta, repetida, con volumen o brillo |
| Órbita | anillo fino al 16–22 %, arco y esfera, al costado del texto; declarada a propósito, en casos específicos | anillos gruesos o muchos, detrás del texto, alrededor del logo, por defecto en toda pieza, sobre el sujeto, las reservas, el lecho o la firma |
| Firma de pieza gráfica | el logo de Efeonce centrado abajo; la burbuja URL centrada y fusionada sólo si el logo ya está en la imagen | la burbuja por defecto, a un costado o junto al logo; firma y burbuja a la vez |
| Arco de avance | mide un dato real | decorativo o inventado |
| Voz | pregunta chica, respuesta grande de 1–3 palabras | pregunta grande, respuesta larga y chica |
| Color | navy profundo con teal; el acento a ≥ 3:1 en gráfico y en texto de 24 px o más | el acento en texto de menos de 24 px; teal claro como texto sobre blanco (2,1:1); dos acentos en una pieza |
| Tipografía | Bricolage para decir, Poppins para explicar | Bricolage en párrafos, monoespaciada |
| Eslogan | bloque oficial, en cierres | traducido, con esfera, en mayúsculas, con otros pesos |
| Objetos | frente: palabra; dorso: logo solo | logo y órbita juntos al frente |
| Foto | oficio real, luz con carácter, sin emblema legible | velo navy encima, foto de banco |
| Logo | archivo oficial, con resguardo X y contraste; en titulares puede ocupar el lugar de la palabra Efeonce; dentro de la órbita sólo en cierres de marca (deck, video, recepción) | los doce usos incorrectos de §8.3; la órbita alrededor del logo en el banner de LinkedIn o el reverso de la tarjeta |
| Isotipo | solo, en formatos chicos, ≥ 24 px | con otra órbita, recoloreado, rotado, combinado |
| Terceros | satélites de canal que muestran dónde medimos | logos de terceros como si fueran alianzas |

---

## 12. Decisiones y validación

**Decidido (2026-09-25, reversible):**

- La órbita es la forma canónica; el punto final se mantiene en titulares, firma de mail y taza blanca; el foco,
  en fotos.
- En oscuro manda la paleta de la órbita (tokens del deck AXIS); en papel, navy `#023C70` y teal `#0E8C82`.
- Hilo de familia: la órbita más la variante del eslogan. Descartado: anillo teal en productos.
- Redes: grosores ×1,75 en lienzos de hasta 1200 px.
- Objetos: palabra al frente, logo solo atrás. Descartada la órbita alrededor del logo.
- Retirados del canvas (quedan en el repo como historia): punto gigante, esfera tipográfica, objeto 3D, variantes
  contemporáneas y aplicaciones planas anteriores.

**Decidido por el operador (2026-09-26):**

| # | Decisión | Dónde |
|---|---|---|
| D1 | El acento llega a 3:1 contra su fondo en gráfico y texto de 24 px o más; nunca en texto menor (navy o blanco). Engine y Voice conservan su color. Token `efeonceGraphicLine.accentContrast` (`axis-tokens` 0.3.5) | §2 |
| D2 | Magenta de Revenue-HubSpot aprobado (`#E86BD0` en oscuro, `#8E1B82` en claro); sin naranjo HubSpot | §2, §7 |
| D3 | En el cierre del deck, «Growth» va en el acento, no en blanco (8,5:1) | §5, §10.1 |
| D4 | Umbral de la burbuja URL: 4,5:1 (`urlBubble.minContrast: 4.5`) | §8.5 |
| D5 | Logo dentro de la órbita sólo en cierres de marca (deck, video, recepción), con el anillo fuera del resguardo X; nunca en el banner de LinkedIn ni el reverso de la tarjeta | §8.2, §8.3, §10.1, §10.3, §10.6 |
| D6 | Banner de LinkedIn y fondo de Teams con un solo anillo | §1.3, §10.1 |
| D7 | Halo sobre papel a la mitad (`orbit.haloOnLightScale: 0.5`) | §1.3 |
| D8 | `sphereRing` sólo «en vivo» (issue `sphere-ring-only-live`) | §1.3 |
| D9 | Reglas de sinergia P1–P12 aprobadas; P5 y P9 van a la task de `foto:prompt` y chequeos de la lente | §9.1 |
| D10 | Conflictos P-1..P-9 resueltos | §9, §9.1 |
| D11 | Firma de correo: cada persona la instala en Outlook desde el HTML; `people@` usa la firma de Talent | §10.2 |
| D12 | Banco de pares: dos por línea de servicio, sólo con respuestas verificables | §4 |
| D13 | Archivos de impresión: primero la tarjeta y el muro de recepción, PDF vectorial desde las recetas | abajo |
| D14 | La prueba sin logo corre **antes** de que la órbita entre a medios pagados con presupuesto | abajo |
| D15 | «Te hacemos visible»: revisión legal antes de cualquier pauta, sin excepción | §1.4 |

**Prueba sin logo (kit listo para campo):** fase de aprendizaje con logo y atribución de piezas nuevas sin logo;
600 personas (300 por versión), decisores de marketing y comercial en Chile, empresas de 50+ personas. Métrica: %
que elige «Efeonce» entre Efeonce, 5 competidores y «No sé». Éxito: +10 puntos sobre el distractor con 95 % de
confianza. Kit: `exploracion-v5/prueba-sin-logo/` (protocolo, cuestionario, 24 estímulos, potencia y análisis).
**Debe correr antes de que la órbita entre a medios pagados con presupuesto** (operador, 2026-09-26).

**Pendiente (decisión del operador):**

1. Proveedor del panel de la prueba sin logo (Netquest, Cint o Toluna, a cotizar) y su presupuesto.
2. Revisar el banco de pares de copy y aprobar dos por línea de servicio (§4).
3. URL de LinkedIn de la empresa para la firma de correo (§10.2).
4. Barra del retrato de perfil como categoría propia del lenguaje fotográfico (P-7, §9.1): por redactar.

**Pendiente (producción):** instalar la firma de correo v3.1 en Outlook, persona por persona, desde el HTML generado
(§10.2) · archivos de impresión: se parte por la **tarjeta de presentación y el muro de recepción**, en PDF vectorial
desde las recetas, **bloqueado por la especificación técnica de la imprenta** (operador, 2026-09-26) · plantillas
editables · task de `foto:prompt` y chequeos de la lente (P5, P9, P-6 y P-8; §9.1) · las variantes que faltan de las animaciones
del logo V1.1 (OneDrive y bucket) y una demo viva en el Lab que lea `efeonceGraphicLine.motion` (§10.1) · la
frontera Greenhouse ↔ Efeonce (la línea es de Efeonce, no de Greenhouse) · que la línea no se filtre al trabajo de
clientes · copy en inglés · revisión legal de «Te hacemos visible» antes de cualquier pauta (§1.4) · accesibilidad medida en las piezas reales ·
tamaños mínimos del logo validados con prueba de impresión.

---

## 13. Contrato y herramientas (AXIS 0.3)

Nada de esta sección aprueba ni publica una pieza: componer, medir y certificar no reemplazan la autorización del
operador.

### 13.1 AXIS

- **Paquetes (versionado independiente):** publicados hoy `@efeoncepro/axis-tokens` **0.3.3** (suma
  `efeonceGraphicLine.motion`; la 0.3.2 sumó `emailSignature`), `axis-ui-contracts` **0.3.2** (suma el contrato
  `efeonce.email-signature`), `axis-ui-registry` y `axis-brand-assets` en **0.3.0**, y el paquete nuevo **`@efeoncepro/axis-graphic-line` 0.3.1** (la órbita como
  código: `orbitSvg`, recetas `lensRecipe`, `spotlightRecipe`, `deckSlideHtml`, `portraitOrbitSvg` y
  `sphereDividerSvg`, el movimiento `ORBIT_MOTION_*`, componente React y Web Component `<axis-orbit>`).
  `axis-brand-assets` 0.3.0 suma 48 órbitas estáticas (SVG + PNG por línea, fondo y canal) generadas desde
  `axis-graphic-line`. Greenhouse fija en `develop` `axis-tokens` **0.3.3** (commit `0fdd8f492`) y
  `axis-ui-contracts`, `axis-ui-registry` y `axis-brand-assets` en **0.3.0** (commit `a98751daa`); ninguno de los dos
  commits está todavía en `main` (llegan con el próximo release). Greenhouse aún no usa el contrato
  `efeonce.email-signature` de `axis-ui-contracts` 0.3.2 y **no depende de `axis-graphic-line`**: su adapter pinta con
  el contrato.
  `axis-graphic-line` tiene `Manage Actions access → Read` para los repos consumidores desde el 2026-09-26
  ([runbook de paquetes privados](../AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)).
- **Bucket público de AXIS** `gs://efeonce-group-axis-public-media` (creado el 2026-09-26 con autorización del
  operador; lectura pública, CORS para el Lab): masters pesados de motion en `motion/logo/v1.1/` (§10.1). Los
  archivos pesados viven ahí o en OneDrive, nunca en git.
- **Tokens `efeonceGraphicLine`** (canónicos): color, familia, esfera, órbita, lente, foco, burbuja URL (con su gris
  fuente), tipo, logo, isotipo y los nuevos `signature` (centrada, anclada abajo al centro, margen 0,09 del lado corto,
  logo por defecto, burbuja sólo con la marca en escena, ancho 0,2 del lado corto y 0,25 en 16:9, contraste mínimo
  4,5), `slogan` («Empower your», bloque o solo, sólo en cierres, sin mayúsculas ni esfera), `state` (anillo libre,
  esfera ocupado, sin semáforo) y `brandClose` (§10.1). Desde 0.3.0, además, `pieces` (las piezas de formato fijo
  de las láminas 1.3, 1.4 y 4.2 medidas una por una del canvas: la receta las reproduce, no las deriva; §1.3) y
  `portrait` (el retrato de la firma de mail; §10.2). Desde 0.3.3, `motion`: el lenguaje de movimiento de la órbita
  (principios, curvas por papel, `overshoot`, `pulse`, `impactScale`, `settle`, `wave`, `halo`, `letters`,
  `motionBlur`, `colorMix`, `cameraZoom`, `layout`, `sound` y los tramos de `pieces.reveal`, `pieces.open` y
  `pieces.sting`), con prueba en `tokens.test.ts` (§10.1 y la
  [norma](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)).
- **Contrato `efeonce.graphic-line-orbit` 0.3.0** (**`stable`** desde el 2026-09-26, con evidencia de paquete, pruebas
  de trayectoria, archivos sellados y e2e del Lab; en 0.2.0 era `candidate`; manifest
  `axis.graphic-line-orbit-composition.v1`). Elementos: `orbit`, `measure`, `progress`, `lens`, `spotlight`,
  `family-map`, `url-bubble`, `voice`, `logo-inline` y, desde 0.2.0, `signature`, `slogan`, `state` y `brand-close`. Reglas: un anillo por pieza; una medida exige fuente;
  la respuesta tiene hasta tres palabras; en canal social una burbuja suelta se rechaza (se firma con `signature`); una
  sola firma y nunca firma y burbuja a la vez; la burbuja-firma sólo para la marca Efeonce; el eslogan sólo cierra; el
  estado exige etiqueta; `brand-close` no va en impresos. Chequeos nuevos del adapter: `signature-centered`,
  `signature-min-contrast` y `orbit-never-over-subject-or-reserves`.
- **Lab** (axis.efeonce.org): la página `references/graphic-line` suma la sección **4.9 «Oficina en foto»** y la 5.7
  «Componer con agentes», donde el post de ejemplo ahora firma con el logo centrado. El banco de tipografía creativa
  (`references/creative-typography`) también firma con el logo centrado por defecto; la burbuja sólo con el logo en la
  imagen. El Lab toma los archivos del paquete de assets en cada build y ya no guarda copias propias.
  Desde el 2026-09-26 las piezas del Lab salen de `axis-graphic-line`: el deck (4.2), la lente (1.3), el foco (1.4) y
  la firma de mail (4.5) coinciden con el canvas; las piezas planas de 4.3, 4.6 y 4.7 muestran su foto IA al lado;
  4.4.1 arma con el paquete las secuencias de movimiento del canvas y 4.4.2 muestra la órbita sin logo y las tres
  animaciones del logo, cada una con su ficha y la descarga de sus masters desde el bucket.
- **Delta 2026-09-26 — AXIS 0.3.0 publicado (`axis-graphic-line` 0.3.1) y adoptado por Greenhouse en `develop`:**
  la lente resuelve anillo, arco y esfera desde `lens.anatomy` (§1.5; `accentSphereDiameterRatio` queda obsoleto); la
  esfera que cierra el texto es parte del texto (§1.2, §6) en la línea gráfica y en
  `efeonce.collaboration-selection` 0.3.0; las piezas de formato fijo están medidas en `pieces` (§1.3); el paquete
  nuevo `@efeoncepro/axis-graphic-line` pinta la órbita, sus recetas y su movimiento. Greenhouse fija los cuatro
  paquetes en 0.3.0: su adapter (`scripts/creative/layout-compiler/graphic-line.mjs`) acepta el contrato 0.3.0, pinta
  la lente con arco y esfera y el progreso con un solo anillo, y `axis-advertising.mjs` exige la selección 0.3.0.
  Llega a producción con el próximo release; no se promovió por separado.
- **Delta 2026-09-26 (tarde) — `axis-tokens` 0.3.3 con `efeonceGraphicLine.motion` y la norma del movimiento:** los
  tiempos, sobrepasos, pulso, resorte, onda, letras, jerarquía del cuadro, desenfoque y metas de sonido de las tres
  animaciones del logo V1.1 pasan del script al token. `scripts/creative/brand-motion/` (`orbit-scene.js`,
  `render-orbit-motion.mjs`, `orbit-sound.mjs`, `encode-orbit-motion.mjs`) los lee de ahí; se verificó que los 90
  cuadros clave y los tres sonidos salen idénticos byte a byte. Las reglas detrás de los números quedan en
  [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md). Greenhouse fija `axis-tokens` 0.3.3
  en `develop` (commit `0fdd8f492`, todavía no en `main`).
- **Delta 2026-09-26 (noche) — decisiones del operador en AXIS:** `accentContrast` (nuevo en `axis-tokens` 0.3.5; el
  acento a 3:1 en gráfico y texto ≥ 24 px, nunca en texto menor; §2), `orbit.haloOnLightScale: 0.5` (halo a la mitad
  sobre papel; §1.3) y `urlBubble.minContrast: 4.5` (§8.5); el contrato rechaza `sphereRing` sin `live: true` (issue
  `sphere-ring-only-live`; §1.3). Juego publicado con el tag `v0.3.5`: tokens y contracts 0.3.5, registry y brand-assets
  0.3.1, graphic-line 0.3.2. **Greenhouse lo adopta en `develop` el 2026-09-26** (tokens 0.3.5, contracts 0.3.5, registry
  y brand-assets 0.3.1; el adapter del compositor soporta el contrato de la órbita 0.3.1 y el render del motion lee
  `haloOnLightScale`). El Lab muestra las 30 variantes de las animaciones del logo (commit AXIS `d847b44`).

### 13.2 Greenhouse

| Herramienta | Qué hace con la línea |
|---|---|
| `pnpm creative:orbit:resolve` · `pnpm creative:orbit:render -- --intent --bindings --out-dir` | Adapter del contrato 0.3.0 (`scripts/creative/layout-compiler/graphic-line.mjs`). Pinta, rasteriza y firma (logo, o burbuja fusionada en luminosidad a opacidad 1) y mide el contraste de la firma sobre los píxeles finales. `bindings.protect` declara sujeto, reservas y lecho para el chequeo de la órbita. Sale con código 1 si falla un chequeo |
| `pnpm creative:layout` | Capa opcional por formato `graphic_line: { intent, protect }` (sólo elementos con anillo: orbit, measure, progress, lens, spotlight, family-map; el copy y la firma siguen del compilador); falla el QA si cruza el campo de copy o un sujeto. Firma opcional `brand.signature: { brand_in_scene }`: `false` = logo centrado sin URL; `true` = burbuja centrada sola, opacidad 1, falla bajo 4,5:1. Los contratos sin ese campo quedan exactamente como antes |
| `pnpm foto:componer:cta` + `pnpm foto:cta:gate` (tramo 17) | Campo de plan `marcaEnEscena`. En piezas **nuevas**, la burbuja (`url` + `marcaEnEscena: true`, sin `logo`) se fusiona a opacidad 1, se mide y la juzgan las reglas `firma-burbuja`, `firma-contraste` y `firma-sobre-sujeto`. Las piezas del canon anterior se dibujan igual y siguen «no certificables» con URL; no se recertificaron (el gate las mostrará en 3 hasta recomponerlas) y ningún workflow de CI corre este gate. Detalle: [contrato del compositor §19.6](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) |
| `scripts/creative/brand-motion/` (`render-orbit-motion.mjs`, `orbit-sound.mjs`, `encode-orbit-motion.mjs`) | Render, sonido y codificación de las animaciones del logo V1.1 (reveal, apertura y sting). Lee cada tiempo y proporción de `efeonceGraphicLine.motion`; spec en [`EFEONCE_ORBIT_REVEAL_MOTION_V1.md`](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md) y reglas en [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](./EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) |
| `src/config/efeonce-brand-assets.test.ts` | Guarda de deriva: las copias locales del logo y de la burbuja deben ser el mismo dibujo que el paquete de assets |

## 14. Iconografía: Trazo y Plastilina

La línea tiene su propia iconografía, canónica desde el 2026-09-26 (D16–D22), en **dos voces de una familia**:

| | Trazo | Plastilina |
| --- | --- | --- |
| Dice | lo que se mide | lo que se crea |
| Líneas | Growth, Engine, Revenue | Brand (Voice, por decidir) |
| Forma | trazo limpio 1,5 en grilla 24 | masa blanda con giro y calados en grilla 48 |
| Esfera | radio 1,75; reemplaza o completa el glifo | radio 3,4 con anillo calado, donde está la acción |
| Mínimo | responde desde 20 px | 32 px (más chico, Trazo) |

- **La esfera es un estado, no parte del dibujo:** en reposo no está; cuando el ícono responde, aparece en el acento de
  la línea de servicio **de la pieza**. Responde uno solo, el que importa, y sólo si la pieza no tiene otra esfera.
- **Fondo `#001a33` en todas las líneas**; tinta blanca sobre oscuro y navy sobre papel. Plano, sin volumen ni brillo.
- **Las voces no se mezclan** en un grupo; si conviven, Plastilina manda en grande y el Trazo apoya en chico.
- **Órbita sesgada:** la firma de Plastilina alrededor del objeto protagonista (elipse −16°, pasa por detrás y por
  delante); una por pieza, nunca cruza el texto y **nunca mide** (lo que mide sigue en la órbita circular, §1).
- **Un glifo nuevo no se dibuja dentro de una pieza:** entra al set con su verificación y la aprobación del operador.

**Dónde vive:** AXIS es la fuente de verdad — tokens `efeonceGraphicLine.icons`, el paquete
`@efeoncepro/axis-graphic-line/icons` (`resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`), los comandos
`pnpm icons:export|check|vectorize`, la página [axis.efeonce.org/references/iconography](https://axis.efeonce.org/references/iconography/)
y la guía `docs/agent-composition/iconography.md` del repositorio de AXIS. Estado: publicado el 2026-09-26 con el
tag `v0.3.6` (tokens 0.3.6, `axis-graphic-line` 0.4.0). La firma de correo y la de equipo siguen
con íconos Tabler hasta que el operador decida el reemplazo. Criterio e historia: skill `efeonce-graphic-line`,
`references/iconography.md`.

