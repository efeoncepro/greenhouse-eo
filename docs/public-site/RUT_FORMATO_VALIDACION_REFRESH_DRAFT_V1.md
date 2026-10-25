# Refresh — «Cómo validar el RUT en formularios de HubSpot» (borrador V4)

> **Estado:** borrador para revisión del autor. No publicado.
> **URL (se conserva):** https://efeoncepro.com/hubspot/como-crear-formularios-con-validacion-de-rut/ (post `246024`)
> **Autor / voz:** Julio Reyes · voz Julio, doctrina como «En Efeonce…».
> **Creado:** 2026-10-24 · **Última versión:** 2026-10-25 (V4) · **Fuente editable:**
> [`RUT_FORMATO_VALIDACION_REFRESH_GUTENBERG_SPEC_V1.json`](RUT_FORMATO_VALIDACION_REFRESH_GUTENBERG_SPEC_V1.json)
> (validación `pass`; sólo el aviso informativo de sumar una imagen; 60 bloques).
> **Propuesta:** [`BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md`](BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md) §1, con la decisión del 2026-10-25.

## 1. Decisión de enfoque (Julio, 2026-10-25)

El artículo **se queda en validar el RUT en formularios de HubSpot**. La V1/V2 lo había abierto al formato del RUT
en Excel porque Search Console muestra que la página aparece por «formato rut chile / en excel». Julio lo descartó:
esa audiencia no es la del artículo, que existe para mostrar experiencia en HubSpot y conectar con el servicio.
Se retiraron la sección y las fórmulas de Excel; el formato del RUT y el módulo 11 quedan sólo como lo que un
formulario tiene que revisar. **Ajuste (V4, también de Julio):** vuelven dos fórmulas de Excel, sólo como preparación
de una base antes de importarla a HubSpot (normalizar a `12345678-5` y marcar dígitos equivocados), dentro de la
sección de duplicados. Todo el texto habla del CRM; no hay sección de formato en Excel ni fórmula para mostrar puntos.

**Consecuencia esperada:** es probable que bajen las impresiones por «formato rut». Es una pérdida aceptada; la
medición pasa a las consultas de HubSpot (validar rut hubspot, formulario rut hubspot y variantes), que tienen poco
volumen, y a los clics hacia la página de HubSpot de Efeonce.

## 2. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Rendimiento | 1.200 impresiones en 90 días (−30 %), posición 6,5 estable, 6 clics | Search Console, 2026-07-26 → 10-23 vs. ventana previa |
| Error | «RUT válido: 12345678K» y «12.345.678-K» son inválidos: el dígito de 12.345.678 es 5 | Cálculo módulo 11, verificado |
| Sin sustento | «Cumple normativas» (3 veces), sin norma citada | Versión publicada |
| Vencido | La técnica exige formulario legacy en HTML sin procesar con plan Professional/Enterprise y no lo dice; no sirve para el editor nuevo; sin evento, HubSpot no registra el valor; rechaza RUT bajo el millón; botón bloqueado ante autocompletado | Documentación de HubSpot + pruebas |

## 3. Metadata propuesta

| Campo | Actual | Propuesto |
|---|---|---|
| Title (SEO) | Cómo crear formularios con validación de RUT chileno en minutos - Efeonce | Cómo validar el RUT en formularios de HubSpot \| Efeonce |
| Meta description | Aprende a integrar validación de RUT en formularios de HubSpot. Cumple normativas… | Cómo validar el RUT chileno en formularios de HubSpot: reglas de propiedad en el editor nuevo, código para formularios legacy y RUT sin duplicados en el CRM. |
| H1 | Cómo crear formularios con validación de RUT chileno en minutos | Cómo validar el RUT en formularios de HubSpot: editor nuevo, legacy y un CRM sin duplicados |
| Slug | `/hubspot/como-crear-formularios-con-validacion-de-rut/` | Sin cambio |
| Categoría y etiquetas | HubSpot (19) · comohacer, how-to, hubspot, tutoriales | Sin cambio |

## 4. Qué se probó

- **JavaScript** (`esRutValido`, `formatearRut`, `normalizarRut`): 19 casos borde y 200.000 RUT al azar contra una
  segunda implementación, sin diferencias. El código del post es idéntico byte a byte al probado.
- **Integración HubSpot legacy:** probada en un formulario simulado (jsdom), con y sin jQuery: bloquea el envío con el
  RUT mal escrito, deja enviar con el campo vacío, guarda `12345678-5` y dispara el evento `input`.
  **No probada en un portal HubSpot real.**
- **Expresión regular para la propiedad:** probada con 9 casos; no usa grupos de captura.
- **Fórmulas de importación (Excel):** ejecutadas en Microsoft Excel de este equipo con 9 casos (con y sin puntos,
  espacios, k minúscula, ceros a la izquierda, bajo el millón); el texto del post es el `formula local` que devolvió Excel.
- **Enlaces:** los 9 del artículo responden 200 (2026-10-25). Índice con 10 anclas, ninguna rota.
- **Fuentes:** HubSpot KB (reglas de propiedades, valores únicos, regex), HubSpot Developers (legacy forms), BCN
  (Ley 21.719) y alerta legal de Carey de septiembre de 2026.

## 5. Pendientes antes de publicar

- Probar la integración legacy en un portal real, si hay uno con Professional/Enterprise y formulario en HTML sin procesar.
- Portada e imagen social nuevas (la actual, `246029`, es de 2024, en WebP y sin `alt`).
- Confirmar la frase de experiencia de la intro: «Es lo que revisamos cuando implementamos HubSpot para empresas chilenas».

## 6. Copia privada para revisión

- **Post privado `252086`**, autor Julio Reyes, slug `formato-rut-chileno-revision-2026-10`; canonical y Yoast apuntan a
  la URL real; anónimo `404`. Ver con sesión: https://efeoncepro.com/wp-admin/post.php?post=252086&action=edit
- **El post publicado `246024` no se tocó.**
- **Versiones** (todas con guardas: privado, `_greenhouse_owned`, hash previo; lectura de vuelta = generado):
  - V1 (2026-10-25 02:0x UTC): formato + Excel + HubSpot.
  - V2 (02:13 UTC): fórmulas de Excel en bloques de código. Respaldo de la V1: `_gh_rut_review_252086_v1_20261025_021316`.
  - V3 (10:04 UTC): enfoque HubSpot, sin Excel; título, extracto y Yoast nuevos. Respaldos de la V2:
    `_gh_rut_review_252086_v2_20261025_100449` (contenido) y `_gh_rut_review_252086_meta_v2_20261025_100451` (metadatos).
    Hash del contenido: `e7ae0945…`.
  - V4 (10:15 UTC): subsección «Antes de importar a HubSpot» con las dos fórmulas. Respaldo de la V3:
    `_gh_rut_review_252086_v3_20261025_101515`. Hash: `260ce398…`.
- **QA del render** (V2, mismos tipos de bloque que la V3; 1440 y 390 px): sin desborde de página; tablas y código caben.
- **Para publicar** (con visto bueno de Julio): escribir título, extracto, contenido y Yoast en `246024` con guardas y
  respaldo, como en inbound; después pasar `252086` a la papelera.

## 7. Borrador del artículo

### Cómo validar el RUT en formularios de HubSpot: editor nuevo, legacy y un CRM sin duplicados

*Actualizado el [fecha de publicación] · Julio Reyes*

HubSpot no trae un campo de RUT. Trae campos de texto, y en un campo de texto cabe cualquier cosa: 12.345.678-5, 123456785, un RUT con el dígito equivocado o uno con una k minúscula.

Para una empresa que vende en Chile, eso no es un detalle. **El RUT es la llave que une el CRM con facturación, y si entra mal escrito o dos veces, el CRM deja de servir para cruzar datos.**

Esta guía explica cómo validarlo en los dos tipos de formulario que tiene hoy HubSpot y cómo dejar la propiedad configurada para que el mismo RUT no entre dos veces. Es lo que revisamos cuando implementamos HubSpot para empresas chilenas.

#### ¿Qué tiene que revisar un formulario con RUT?

**Un RUT válido tiene un cuerpo de hasta ocho dígitos, un guion y un dígito verificador, que va del 0 al 9 o es la letra K. Por ejemplo: 12.345.678-5.** Validarlo significa revisar dos cosas: que tenga esa forma y que el dígito verificador calce con el cuerpo.

El dígito verificador se calcula con un algoritmo llamado módulo 11:

1. Recorre el cuerpo de derecha a izquierda y multiplica cada dígito por 2, 3, 4, 5, 6 y 7, volviendo a empezar en 2 si quedan dígitos.
2. Suma los resultados, divide por 11 y réstale el resto a 11.
3. Si te da 11, el dígito es 0; si te da 10, es K; si no, es el número que obtuviste. Para 12.345.678 la suma es 138, el resto es 6 y el dígito es 5.

> **Un dígito verificador correcto dice que el RUT está bien escrito. No dice que exista.**

Por eso la validación de un formulario atrapa errores de tipeo, no identidades falsas. Si necesitas saber si un RUT está registrado y su situación tributaria, eso se consulta en el SII.

#### ¿Cómo se valida el RUT en HubSpot?

Depende del editor con que creaste el formulario. HubSpot tiene hoy dos, y cada uno se valida distinto:

| Formulario | Cómo se valida el RUT | Qué plan necesitas |
|---|---|---|
| Editor nuevo | Con reglas en la propiedad: formato, caracteres permitidos y expresión regular. No calcula el dígito verificador. | Las reglas básicas, cualquier plan. La expresión regular, Professional o Enterprise. |
| Editor legacy, en HTML sin procesar | Con código de personalización en la inserción del formulario. Sí puede calcular el dígito verificador. | Marketing Hub o Content Hub Professional o Enterprise. |
| Editor legacy, sin HTML sin procesar | No admite código de personalización. | — |

Un detalle que confunde: [según HubSpot](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties), las reglas de la propiedad se aplican en los formularios del editor nuevo, al editar registros y al importar, pero no en los formularios del editor legacy. Y al revés, el código de personalización sólo funciona en formularios legacy en HTML sin procesar.

##### Formularios del editor nuevo: reglas en la propiedad

1. Crea una propiedad de texto de una línea llamada RUT, en la empresa o en el contacto (más abajo te explico cuál).
2. Si quieres evitar duplicados, marca que exija valores únicos al crearla: después ya no se puede activar.
3. En la pestaña de reglas, bloquea los espacios.
4. Si tienes Professional o Enterprise, agrega una [regla con expresión regular](https://knowledge.hubspot.com/properties/regex-validation-rules) que exija el formato sin puntos y con guion.
5. Escribe un mensaje de error que diga cómo corregir, por ejemplo: «Escribe el RUT sin puntos y con guion, como 12345678-5».

```
^[1-9][0-9]{0,7}-[0-9kK]$
```

Esta expresión acepta 12345678-5, 999999-K y 1-9, y rechaza el RUT con puntos o sin guion. No usa grupos de captura, que el motor de HubSpot no admite. Su límite es que revisa la forma y no el dígito: 12345678-6 pasa. Si necesitas el dígito verificador en estos formularios, revísalo después en el CRM, por ejemplo con una lista de registros con RUT inválido que alguien de tu equipo corrige.

##### Formularios legacy en HTML sin procesar: código de personalización

En un formulario legacy sí puedes revisar el dígito verificador antes de que se envíe. Primero, estas funciones, en JavaScript y sin librerías. Aceptan el RUT con o sin puntos, con k minúscula y bajo el millón:

```
// Deja solo dígitos y K (en mayúscula): "12.345.678-k" → "12345678K"
function limpiarRut(valor) {
  return String(valor).toUpperCase().replace(/[^0-9K]/g, '');
}

// Dígito verificador por módulo 11: pesos 2 a 7, de derecha a izquierda
function calcularDv(cuerpo) {
  let suma = 0;
  let peso = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * peso;
    peso = peso === 7 ? 2 : peso + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

// true si el RUT tiene forma válida y su dígito verificador calza
function esRutValido(valor) {
  const rut = limpiarRut(valor);
  if (!/^[0-9]{1,8}[0-9K]$/.test(rut)) return false;
  const cuerpo = rut.slice(0, -1).replace(/^0+/, '');
  if (cuerpo === '') return false;
  return calcularDv(cuerpo) === rut.slice(-1);
}

// "123456785" → "12.345.678-5"
function formatearRut(valor) {
  const rut = limpiarRut(valor);
  if (rut.length < 2) return rut;
  const cuerpo = rut.slice(0, -1).replace(/^0+/, '');
  const dv = rut.slice(-1);
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

// "12.345.678-5" → "12345678-5": el formato que conviene guardar en el CRM
function normalizarRut(valor) {
  const rut = limpiarRut(valor);
  return rut.slice(0, -1).replace(/^0+/, '') + '-' + rut.slice(-1);
}
```

Después, el formulario. Este código reemplaza el código de inserción del formulario: no va debajo, va en su lugar. Cambia el portal, el formulario y el nombre interno de tu propiedad:

```
// Pega antes, en el mismo <script>, las funciones de la sección anterior.
// Solo para formularios del editor legacy en HTML sin procesar (raw HTML),
// con Marketing Hub o Content Hub Professional o Enterprise.
hbspt.forms.create({
  region: 'na1',
  portalId: 'TU_PORTAL_ID',
  formId: 'TU_FORM_ID',
  onFormReady: function ($form) {
    var form = $form && $form.jquery ? $form[0] : $form;
    var campo = form.querySelector('input[name="rut"]'); // usa el nombre interno de tu propiedad
    if (!campo) return;
    var contenedor = campo.closest('.hs-form-field') || campo.parentNode;

    function limpiarError() {
      campo.removeAttribute('aria-invalid');
      var previo = contenedor.querySelector('.rut-error');
      if (previo) previo.remove();
    }

    function mostrarError(mensaje) {
      limpiarError();
      campo.setAttribute('aria-invalid', 'true');
      var error = document.createElement('p');
      error.className = 'rut-error hs-error-msg';
      error.setAttribute('role', 'alert');
      error.textContent = mensaje;
      contenedor.appendChild(error);
    }

    function revisar() {
      var valor = campo.value.trim();
      if (valor === '') { limpiarError(); return true; } // si el RUT es obligatorio, HubSpot avisa por su cuenta
      if (!esRutValido(valor)) {
        mostrarError('Revisa el RUT: el dígito verificador no calza.');
        return false;
      }
      campo.value = normalizarRut(valor);
      // Sin este evento, HubSpot no registra el valor nuevo
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      limpiarError();
      return true;
    }

    campo.addEventListener('blur', revisar);
    form.addEventListener('submit', function (evento) {
      if (!revisar()) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        campo.focus();
      }
    }, true);
  }
});
```

- **Revisa el RUT al salir del campo** y, si está bien, lo deja guardado sin puntos.
- **Avisa a HubSpot del cambio.** [La documentación de HubSpot](https://developers.hubspot.com/docs/cms/start-building/features/forms/legacy-forms) advierte que si cambias un valor por código y no disparas un evento, el valor nuevo no se registra.
- **Bloquea el envío sólo si el RUT está mal escrito.** Si el campo está vacío y es obligatorio, HubSpot avisa por su cuenta.
- **Busca el campo por su nombre interno**, no por la clase: si la propiedad se llama «RUT Empresa», su nombre interno será algo como rut_empresa.

Probamos las funciones con más de 200.000 RUT generados al azar contra una segunda implementación, y con los casos que suelen fallar: K mayúscula y minúscula, RUT bajo el millón, ceros a la izquierda y letras en medio del número. Antes de publicar el formulario en tu sitio, pruébalo con tres casos: un RUT válido, uno con el dígito equivocado y el campo vacío.

#### ¿Qué hace que un formulario con RUT funcione bien?

El código es la parte fácil. Estas decisiones son las que se notan del otro lado del formulario:

- **Valida al salir del campo, no en cada tecla.** Marcar error mientras la persona todavía está escribiendo sólo la apura.
- **Explica el error junto al campo.** «Revisa el RUT: el dígito verificador no calza» se entiende; «RUT inválido» no dice qué corregir.
- **Guarda un solo formato.** Muestra el RUT con puntos si quieres, pero guárdalo como 12345678-5.
- **Si el dato importa, valídalo también fuera del navegador.** Lo que corre en la página se puede saltar.

#### ¿Cómo evitar RUT duplicados en HubSpot?

Validar el formato evita errores de tipeo, pero no evita que el mismo RUT entre dos veces. Para eso:

- **Guarda un solo formato** (12345678-5): con dos formatos, el mismo RUT parece dos datos distintos.
- **Exige valores únicos en la propiedad.** HubSpot lo permite en todos los planes, hasta diez propiedades únicas por objeto, pero en una propiedad de texto sólo se puede activar al crearla.
- **Si ya tienes una propiedad de RUT sin esa marca,** crea una nueva con valores únicos, normaliza los RUT existentes al formato sin puntos, resuelve los duplicados y copia los valores a la nueva.
- **Limpia antes de importar.** Las reglas de la propiedad también se aplican al importar: los RUT que no cumplan el formato van a dar error. Más abajo están las dos fórmulas para hacerlo.

¿Empresa o contacto? Si vendes a empresas, el RUT que te sirve es el de la empresa, y va en la empresa. El RUT de una persona va en su contacto y sólo lo pediría si lo necesitas para facturarle. Si estás armando el CRM desde cero, en [cómo pasar de Excel a HubSpot](https://efeoncepro.com/hubspot/de-excel-a-hubspot-en-5-dias/) cuento el orden en que conviene hacerlo.

##### Antes de importar a HubSpot: normaliza la columna del RUT

Si vas a subir una base que viene de otro sistema o de una planilla, prepárala en Excel antes de importarla. Con el RUT original en la columna A, escrito como venga, estas dos fórmulas bastan (Excel en español, Microsoft 365 o Excel 2021).

**Columna B**: deja el RUT como 12345678-5, el formato que vas a guardar en HubSpot. Quita puntos, guion, espacios y ceros a la izquierda, y pasa la k a mayúscula.

```
=LET(t;MAYUSC(SUSTITUIR(SUSTITUIR(SUSTITUIR(A2;".";"");"-";"");" ";""));VALOR(IZQUIERDA(t;LARGO(t)-1))&"-"&DERECHA(t;1))
```

**Columna C**: revisa el dígito verificador y marca «Revisar» los RUT mal escritos.

```
=LET(t;MAYUSC(SUSTITUIR(SUSTITUIR(B2;".";"");"-";""));n;SECUENCIA(8);s;SUMAPRODUCTO(--EXTRAE(TEXTO(IZQUIERDA(t;LARGO(t)-1);"00000000");n;1);RESIDUO(8-n;6)+2);x;11-RESIDUO(s;11);SI(SI(x=11;"0";SI(x=10;"K";x&""))=DERECHA(t;1);"Válido";"Revisar"))
```

Corrige las filas marcadas antes de importar, revisa si hay RUT repetidos en la columna B y sube esa columna, no la original. Si tu Excel está en inglés, las funciones se llaman UPPER, SUBSTITUTE, VALUE, LEFT, LEN, RIGHT, SEQUENCE, SUMPRODUCT, MID, TEXT, MOD e IF, y el separador es la coma. Probamos las dos fórmulas con RUT con y sin puntos, con espacios, con k minúscula, con ceros a la izquierda y bajo el millón.

#### ¿Conviene pedir el RUT en un formulario?

Mi respuesta corta: sólo si lo vas a usar. Para descargar un ebook o suscribirse a un newsletter no hace falta. Para cotizar, emitir una factura o dar de alta a un cliente, sí.

Y no es sólo una cuestión de experiencia. La [Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719), que reforma la ley de protección de datos personales, está prevista para entrar en vigencia el 1 de diciembre de 2026, y se basa en tratar sólo los datos necesarios para la finalidad que declaras. En septiembre de 2026 el Gobierno [ingresó un proyecto](https://www.carey.cl/api/archivo/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales?lang=es) para postergarla hasta el 1 de diciembre de 2027; revisa en qué quedó antes de planificar.

Esto no es asesoría legal: si tu formulario pide datos personales, revisa con tu equipo legal para qué los pides y cómo lo informas.

#### Preguntas frecuentes sobre el RUT en HubSpot

**¿HubSpot valida el RUT chileno de forma nativa?**

No. Las reglas de la propiedad pueden exigir un formato, pero no calculan el dígito verificador. Para eso necesitas código de personalización en un formulario legacy o una revisión posterior en el CRM.

**¿El código de personalización funciona en los formularios del editor nuevo?**

No. El código de personalización sólo funciona en formularios legacy en HTML sin procesar. En los del editor nuevo, la validación se configura con reglas en la propiedad.

**¿Qué plan de HubSpot necesito para validar el RUT?**

Las reglas básicas de una propiedad y los valores únicos están en todos los planes. La regla con expresión regular necesita Professional o Enterprise, y el código de personalización de formularios legacy, Marketing Hub o Content Hub Professional o Enterprise.

**¿Dónde guardo el RUT en HubSpot, en el contacto o en la empresa?**

Si vendes a empresas, en la empresa. El RUT de una persona va en su contacto y sólo vale la pena pedirlo si lo necesitas para facturarle.

**¿Validar el dígito verificador confirma que el RUT existe?**

No. Sólo confirma que el RUT está bien escrito. Para saber si está registrado hay que consultarlo en el SII.

#### En resumen

En HubSpot, el RUT se valida con reglas en la propiedad si el formulario es del editor nuevo, y con código si es legacy en HTML sin procesar. En los dos casos, lo que más pesa en el CRM es guardarlo siempre igual, exigir valores únicos desde que creas la propiedad y pedirlo sólo cuando lo vas a usar.

- Si quieres seguir esta conversación, lee [Glitch](https://efeoncepro.com/category/glitch/): cada lunes, una idea sobre IA, marketing y negocios.
- Para saber si tus formularios de HubSpot se están midiendo bien, sigue con [cómo rastrear formularios de HubSpot en GA4](https://efeoncepro.com/hubspot/como-rastrear-formularios-hubspot-en-ga4-paso-a-paso/).
- Y si estás implementando u ordenando HubSpot en Chile, conoce cómo trabajamos [HubSpot en Efeonce](https://efeoncepro.com/servicios-contratar-hubspot/).

#### Fuentes y nota de actualización

- HubSpot. [Set validation rules for properties](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties).
- HubSpot. [Create regex validation rules for properties](https://knowledge.hubspot.com/properties/regex-validation-rules).
- HubSpot Developers. [Legacy forms](https://developers.hubspot.com/docs/cms/start-building/features/forms/legacy-forms).
- Biblioteca del Congreso Nacional. [Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719).
- Carey (2026). [Gobierno ingresa proyecto de ley que posterga en un año la entrada en vigor de la Ley 21.719](https://www.carey.cl/api/archivo/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales?lang=es).

Este artículo se publicó en noviembre de 2024 como un tutorial para validar el RUT en formularios de HubSpot y se reescribió en octubre de 2026: se actualizó a los dos editores de formularios que tiene hoy HubSpot, se corrigió un ejemplo de RUT válido que no lo era, se reescribió el código para que HubSpot registre el valor y acepte RUT bajo el millón, se sumó cómo evitar RUT duplicados en el CRM y cómo normalizar una base antes de importarla, y se retiró la afirmación de que validar el RUT «cumple normativas». Lo desarrolló Julio Reyes con apoyo de IA en investigación, código y edición; el código y las fórmulas se probaron antes de publicar, y Julio aprobó la versión final.
