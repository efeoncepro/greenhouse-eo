# Propuesta de performance que presenta una champion del cliente a su gerencia

> **Estado:** referencia de oficio escrita el 2026-10-28 desde un solo caso: la propuesta de piloto de performance de
> 90 días para ARMOR EPPS (Indecaucho, Ecuador), línea Voice, deck 16:9 de 41 láminas en el canvas + ruta corta de 19.
> Se terminó y se envió el 28/10/2026; **el resultado se desconoce.** No la cites como propuesta ganada.
>
> Fuentes del caso: `docs/commercial/accounts/indecaucho-armor/` (caso de negocio, pricing, cotización) y
> `ai-generations/2026-10-28_propuesta-armor/` (portada, contraportada, plates e intents; `LEEME.md`).

## Cuándo aplica

- Quien recibe el deck **no decide**: es una champion que lo lleva a su gerencia y lo presenta sin nosotros.
- Compite con otra agencia y la gerencia lee precio, plazo y riesgo antes que método.
- Hay inversión en tres partes (fee, medios, fase inicial) y un resultado que todavía no se puede prometer.

## 1. Titular con esfera en el acento de la línea

- Todo titular display de un deck de marca Efeonce **termina en la esfera en el acento de la línea de servicio**
  (Voice `#f83902`), no en un punto tipeado. El operador: «el punto al final siempre tiene el color de la línea de
  negocio».
- Valores AXIS de la esfera: diámetro 0,2 em; separación óptica según la última letra (r −0,02 · a/s/i/z 0,03 ·
  o/n/e/d 0,035 · x 0,02 · t 0 · resto 0,03); pegada a la última palabra con `nowrap`.
- Se aplica a **todo el deck en el paso de renumeración**, después de que corren todos los generadores, para que
  ninguna lámina regenerada la pierda. No se arregla lámina por lámina.
- **Excluidos:** portada y contraportada (tienen su propia composición) y titulares de anuncios del cliente citados
  entre «», que son la voz del cliente, no la de Efeonce. La entrada liviana (≈330) conserva su punto tipeado.

## 2. Revisión «¿Se explica sola?»

Antes de enviar, recorre el deck como lo leería la gerencia sin la champion al lado. Huecos del caso, por importancia:

1. **La Fase 0 no tenía precio.**
2. **No había una inversión total en una cifra.**
3. **No había lámina de recuperación de la inversión** (requiere el ticket promedio del cliente).
4. **No había condiciones comerciales:** pago, vigencia, plazo, moneda e impuestos.
5. **No había un caso real.** Compitiendo con otra agencia, las cifras propias y los partners no son prueba.
6. **El calendario ignoraba diciembre–enero** (feriados y vacaciones colectivas) y la lectura del día 90 llegaba
   después del cierre del presupuesto anual del cliente. Corrección: Fase 0 en noviembre, preparación en diciembre,
   anuncios de mediados de enero a mediados de abril de 2027, y «plan de inversión para el resto de 2027».
7. **Contradicciones internas:** una lámina decía que diseñaba Efeonce y otra que ARMOR; la lámina de equipo
   mostraba 5 personas y el fee cubría 2 roles.
8. **Jerga.**
9. **Largo:** 38+ láminas es demasiado para una gerencia → ruta corta (§3).
10. **Rangos amplios asustan.** «25 a 380» se convirtió en tres escenarios —si rinde poco 25 / lo esperado 100 / si
    rinde bien 380 calificados— junto a la línea base orgánica de hoy (12–15 leads en el mismo periodo), para que
    hasta el caso pesimista supere lo actual.

## 3. Ruta corta para la gerencia

- Es **su propia página en el canvas**, «Ruta corta · gerencia», con copias RC-* **generadas desde el deck completo
  en el paso de renumeración** y numeradas «NN / total corto». Se regenera en cada corrida: las dos versiones nunca
  divergen. Nunca se mantiene a mano.
- Ruta de ARMOR (19): portada, resumen, objetivo, punto de partida, diagnóstico, Fase 0, propuesta, demanda, campaña,
  90 días, medios, fee, total y condiciones, «Un piloto con techo» (garantías), Por qué Efeonce, caso Sky, caso Berel,
  decisión, contraportada.

## 4. Lámina «Inversión total y condiciones»

- Total grande: «hasta US$27.260 en 90 días».
- Barra dividida en fee, medios y un segmento punteado de Fase 0 con el valor tachado + «Bonificada». El operador
  pidió la Fase 0 «valorizada pero a la vez bonificada».
- Seis condiciones: Fase 0 bonificada · fee mensual anticipado por bloque de 30 días · medios pagados directo por el
  cliente en cuentas a su nombre, como techo que se libera gradualmente · plazo sin renovación automática · moneda e
  impuestos por confirmar · vigencia 30 días.

## 5. Láminas de entrega (línea Voice, oscuras)

- El operador pidió varias veces «muchísimo más impacto visual»: escalas tipográficas grandes (cifras de 100–300 px),
  escenas, profundidad y luz. Una lámina de lista plana no pasa.
- **«Vívelo»:** escenario 3D inclinado (CSS `perspective`, `rotateY` ≈ −17°) con ventanas ilustrativas de Notion,
  Teams y Frame.io y cursores multiplayer del cliente y de Efeonce. Las ventanas no cruzan la órbita de navegación ni
  el pie.
- **«Una semana del piloto»:** línea de lunes a viernes; por día, hora grande, herramienta y una mini escena levemente
  inclinada.
- **«Nuestro stack»:** verbos grandes con logos en negativo (blanco) hechos desde los archivos oficiales, conservando
  el blanco interno como calado.
- **«Partners»:** sólo lo que respalda el registro de partnerships.
  - HubSpot **Gold Solutions Partner**: confirmado por el operador el 2026-10-28 («lo somos»). No volver a marcarlo
    como pendiente.
  - Google como **partner de Google Cloud**, no de Google Ads.
  - Salesforce como **Partner**, con el badge autorizado.
  - Microsoft como **AI Cloud Partner Program**.
  - Redes de Claude y OpenAI **sólo en texto**, sin logo ni lockup.
  - El SVG del badge de HubSpot usa clases CSS internas y se renderiza negro en el canvas: usar el PNG.

## 6. Casos

- Se usan **tal cual** las láminas de caso del brochure oficial 360°: Sky (p. 34, «¿Lo han hecho a escala? Sí, con
  Sky.») y Berel (p. 20, «¿Qué cambió con Berel? Lo eligen.»), exportadas del PDF aprobado por la sesión del brochure
  en `ai-generations/2026-10-12_brochure-efeonce-360/entrega-casos/`.
- No se usa la canónica liviana de caso de decisión ni el caso Travel Sale del brochure de Media.

## 7. Lámina de equipo

- «Expertos multidisciplinarios», variante de `content-team`, con «+89 expertos más en Latam». El operador fijó
  **+89 profesionales** como cifra del equipo. La cifra de clientes (+120 vs +90) sigue sin decidir: no la publiques
  sin preguntar.
- Los roles se cambiaron a CRM y afines a pedido del operador; **no son los cargos reales de esas personas**. Es un
  riesgo que se señala antes de enviar.
- En el centro de la órbita va el **logo del cliente**, no su nombre.

## 8. Correo a la champion y cómo se presenta el precio

- El operador: «En la inversión si le dices el monto total la asustas y si no desglosas la inversión también». En el
  correo, la inversión va **desglosada por partes, sin total**: Fase 0 valorizada y bonificada · fee mes a mes · techo
  mensual de medios por país. El total vive en el deck, junto a sus condiciones.
- No pedir RUC ni razón social en el correo («mejor no poner eso»). La cotización también oculta el RUC: el bloque del
  cliente muestra el país.

## 9. Paquete de entrega

- Nombres que dicen qué es cada archivo en las primeras palabras (el operador no distinguía archivos de nombre
  parecido):
  - «1. Propuesta completa - ARMOR - Efeonce.pdf»
  - «2. Propuesta para la gerencia - ARMOR - Efeonce.pdf»
  - «3. Cotización - ARMOR - Efeonce.pdf»
- Los PDF pesados se enviaron como enlaces de seguimiento de HubSpot (hubs.ly), no como adjuntos.
- El PDF del deck se renderiza desde los boards del canvas como páginas JPEG q84 a 1920×1080: 41 páginas, 6,5 MB.

## 10. Contraportada Voice de propuesta

- Es `close-proposal` en línea Voice sobre el plate **VOX3**, **generado** desde la ficha NXSF3 (contraportada
  Salesforce) con el anillo entero en naranja Voice (`#F83902`) y una esfera blanca encendida arriba.
- **Nunca se recolorea:** el operador rechazó un recoloreo como «forzaste esto». Tampoco se edita el anillo con
  inpaint (dejó un rectángulo alrededor del logo protegido).
- El isotipo inventado por el modelo en la espalda de la chaqueta se borró y se compuso el logotipo oficial con
  `pnpm foto:isotipo --marca logotipo --sin-limpiar --acabado`.
- Archivos: `ai-generations/2026-10-28_propuesta-armor/` (`fichas/VOX3-contraportada.json`, `plates/`,
  `out/33-contraportada-v4/`).

## Lista de control antes de enviar

- [ ] Esfera en el acento de la línea en todos los titulares display, aplicada en la renumeración; exclusiones respetadas.
- [ ] Revisión «¿Se explica sola?» hecha; cada fase con precio; total en una cifra; recuperación; condiciones; caso real.
- [ ] Calendario contra feriados, vacaciones colectivas y el cierre presupuestario del cliente.
- [ ] Sin contradicciones (quién diseña, equipo vs roles del fee); sin jerga.
- [ ] Resultados como escenarios junto a la línea base actual, no como rango.
- [ ] Ruta corta regenerada en la misma corrida que el deck completo.
- [ ] Partners sólo según el registro; badge HubSpot en PNG.
- [ ] Roles del equipo y cifra de clientes señalados al operador.
- [ ] Correo con inversión desglosada sin total y sin pedir RUC; archivos nombrados por lo que son.
