# Refresh — «Formularios con validación de RUT» → «Formato del RUT chileno» (borrador V1)

> **Estado:** borrador para revisión del autor. No publicado.
> **URL (se conserva):** https://efeoncepro.com/hubspot/como-crear-formularios-con-validacion-de-rut/ (post `246024`)
> **Autor / voz:** Julio Reyes · voz Julio, doctrina como «En Efeonce…».
> **Creado:** 2026-10-24 · **Fuente editable:** [`RUT_FORMATO_VALIDACION_REFRESH_GUTENBERG_SPEC_V1.json`](RUT_FORMATO_VALIDACION_REFRESH_GUTENBERG_SPEC_V1.json)
> (validación `pass`; sólo el aviso informativo de sumar una imagen; 77 bloques).
> **Propuesta aprobada:** [`BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md`](BLOG_REFRESH_TANDA_1_PROPUESTA_V1.md) §1.

## 1. Por qué se reescribe

| Señal | Dato | Fuente |
|---|---|---|
| Rendimiento | 1.200 impresiones en 90 días (−30 %), posición 6,5 estable, 6 clics | Search Console, 2026-07-26 → 10-23 vs. ventana previa |
| Consultas visibles | «formato rut en excel» (7,3), «formato rut chile» (4,5), «rut chile formato» (3,9): sólo 109 de 1.200 impresiones traen consulta | Search Console |
| Desajuste | El artículo no menciona Excel ni explica el formato; responde cómo armar un formulario de HubSpot | Lectura completa |
| Error | «RUT válido: 12345678K» y «12.345.678-K» son inválidos: el dígito de 12.345.678 es 5 | Cálculo módulo 11, verificado |
| Sin sustento | «Cumple normativas» (3 veces), sin norma citada | Versión publicada |
| Vencido | La técnica exige formulario legacy en HTML sin procesar con plan Professional/Enterprise, y no lo dice; sin `.change()`/evento, HubSpot no registra el valor; botón bloqueado ante autocompletado | Documentación de HubSpot |

## 2. Metadata propuesta

| Campo | Actual | Propuesto |
|---|---|---|
| Title (SEO) | Cómo crear formularios con validación de RUT chileno en minutos - Efeonce | Formato del RUT chileno: cómo validarlo en Excel y HubSpot \| Efeonce |
| Meta description | Aprende a integrar validación de RUT en formularios de HubSpot. Cumple normativas… | El RUT se escribe 12.345.678-5: cuerpo, guion y dígito verificador (0 a 9 o K). Cómo calcularlo, darle formato en Excel y validarlo en HubSpot. |
| H1 | Cómo crear formularios con validación de RUT chileno en minutos | Formato del RUT chileno: cómo escribirlo, validarlo y llevarlo limpio a HubSpot |
| Slug | `/hubspot/como-crear-formularios-con-validacion-de-rut/` | Sin cambio: ya rankea en posiciones 4–7 |
| Categoría y etiquetas | HubSpot (19) · comohacer, how-to, hubspot, tutoriales | Sin cambio |

## 3. Qué se probó antes de escribir

- **JavaScript** (`esRutValido`, `formatearRut`, `normalizarRut`): 19 casos borde y 200.000 RUT al azar contra una
  segunda implementación, sin diferencias. El código que queda en el post es idéntico byte a byte al probado.
- **Integración HubSpot legacy:** probada en un formulario simulado (jsdom) con y sin jQuery: bloquea el envío con
  el RUT mal escrito, deja enviar con el campo vacío, guarda `12345678-5` y dispara el evento `input`.
  **No probada en un portal HubSpot real.**
- **Excel:** las fórmulas se ejecutaron en Microsoft Excel de este equipo, con los nombres de función en español
  que devolvió el propio Excel (`formula local`): 7 casos, todos correctos.
- **Expresión regular de HubSpot:** probada en JavaScript con 9 casos; no usa grupos de captura.
- **Fuentes:** HubSpot KB (validación de propiedades, regex), HubSpot Developers (legacy forms), BCN (Ley 21.719) y
  alerta legal de Carey de septiembre de 2026 sobre el proyecto que posterga la vigencia.

## 4. Pendientes antes de publicar

- Probar la integración legacy en un portal real, si hay uno con Professional/Enterprise y formulario en HTML sin procesar.
- Portada e imagen social nuevas (la actual, `246029`, es de 2024, en WebP y sin `alt`).

## 5. Copia privada para revisión (2026-10-25)

- **Post privado:** WordPress `252086`, autor Julio Reyes (user `1`), manifest
  `greenhouse-cf-formato-rut-chileno-refresh-review-v1`, slug `formato-rut-chileno-revision-2026-10` (distinto del
  publicado, para no chocar). Canonical y metadatos Yoast ya apuntan a la URL real. Anónimo: `404`.
  Ver: https://efeoncepro.com/wp-admin/post.php?post=252086&action=edit (con sesión de WordPress).
- **El post publicado `246024` no se tocó.**
- **V2 (2026-10-25 02:13 UTC):** las fórmulas de Excel pasaron de una tabla a un bloque de código por columna,
  porque a 390 px la tabla cortaba las fórmulas. Escritura con guardas (privado, `_greenhouse_owned`, hash previo);
  contenido guardado = generado (hash `5c939de9…`). Respaldo de la V1: opción `_gh_rut_review_252086_v1_20261025_021316`.
- **QA del render** (contenido real de WordPress sobre la plantilla del post publicado, 1440 px y 390 px): sin desborde
  de página; 3 tablas caben; 9 bloques de código; índice con 12 enlaces, sin anclas rotas; 5 preguntas frecuentes
  con el estilo Efeonce; 1 mención de servicio.
- **Para publicar** (con tu visto bueno): escribir título, extracto, contenido y Yoast en `246024` con guardas y
  respaldo, como en inbound; después pasar `252086` a la papelera.

## 6. Borrador del artículo

# Formato del RUT chileno: cómo escribirlo, validarlo y llevarlo limpio a HubSpot

*Actualizado el [fecha de publicación] · Julio Reyes*

Si alguna vez exportaste a Excel una base de contactos chilenos, ya viste el problema: el mismo RUT escrito de cuatro formas. 12.345.678-5, 12345678-5, 123456785 y, de vez en cuando, uno que termina en una k minúscula.

Para una persona es el mismo dato. Para un CRM son cuatro registros distintos, y ninguno cruza con facturación. **El RUT es de los pocos datos que identifican a un cliente sin ambigüedad, siempre que esté bien escrito.**

Esta guía parte por lo básico (cómo se escribe un RUT y cómo se calcula su dígito verificador) y termina donde nos importa cuando implementamos HubSpot para empresas chilenas: que el RUT llegue al CRM bien escrito y una sola vez.

### ¿Cuál es el formato del RUT chileno?

**El RUT (Rol Único Tributario) se escribe con un cuerpo de hasta ocho dígitos, un guion y un dígito verificador, que va del 0 al 9 o es la letra K. Por ejemplo: 12.345.678-5.** Los puntos que separan los miles son opcionales: 12345678-5 es el mismo RUT.

| Parte | En el ejemplo | Qué es |
|---|---|---|
| Cuerpo | 12.345.678 | El número del RUT. Las personas tienen el mismo número que su RUN, el de la cédula de identidad. |
| Guion | - | Separa el cuerpo del dígito verificador. |
| Dígito verificador | 5 | Se calcula a partir del cuerpo y sirve para detectar errores de tipeo. Puede ser un número del 0 al 9 o la letra K. |

En la práctica vas a encontrar el RUT de tres maneras, y conviene usar cada una para lo suyo:

- **12.345.678-5**: con puntos y guion. Es la forma de mostrarlo a una persona.
- **12345678-5**: sin puntos y con guion. Es la forma que conviene guardar en un CRM o una base de datos.
- **123456785**: sin puntos ni guion. Es lo que suele salir de un sistema antiguo o de un Excel mal formateado.

### ¿Cómo se calcula el dígito verificador del RUT?

El dígito verificador se calcula con un algoritmo llamado módulo 11. Son cinco pasos:

1. Toma el cuerpo del RUT y recórrelo de derecha a izquierda.
2. Multiplica cada dígito por 2, 3, 4, 5, 6 y 7, en ese orden. Si quedan dígitos, vuelve a empezar desde el 2.
3. Suma todos los resultados.
4. Divide esa suma por 11, toma el resto y réstaselo a 11.
5. Si te da 11, el dígito verificador es 0. Si te da 10, es K. En cualquier otro caso, es el número que obtuviste.

Con el cuerpo 12.345.678 queda así:

| Dígito (de derecha a izquierda) | Peso | Resultado |
|---|---|---|
| 8 | 2 | 16 |
| 7 | 3 | 21 |
| 6 | 4 | 24 |
| 5 | 5 | 25 |
| 4 | 6 | 24 |
| 3 | 7 | 21 |
| 2 | 2 | 4 |
| 1 | 3 | 3 |
| **Suma** |  | **138** |

*138 dividido por 11 deja resto 6, y 11 menos 6 es 5. El RUT completo es 12.345.678-5.*

La K aparece cuando el cálculo da 10: el dígito verificador ocupa un solo carácter, así que el 10 se reemplaza por una letra.

> **Un dígito verificador correcto dice que el RUT está bien escrito. No dice que exista.**

Por eso la validación sirve para atrapar errores de tipeo, no para confirmar una identidad. Si necesitas saber si un RUT está registrado y su situación tributaria, eso se consulta en el SII.

### ¿Cómo dar formato y validar el RUT en Excel?

Antes de las fórmulas, una regla: **guarda la columna del RUT como texto.** Un RUT no es una cantidad y la K no cabe en una celda numérica.

Con el RUT en la celda A2, escrito como venga, estas fórmulas lo limpian, lo validan y lo devuelven en los dos formatos útiles. Están en Excel en español (Microsoft 365 o Excel 2021, por LET y SECUENCIA) y las probamos con RUT con y sin puntos, con k minúscula y bajo el millón.

**Columna B**: deja sólo los dígitos y la K, en mayúscula.

```
=MAYUSC(SUSTITUIR(SUSTITUIR(SUSTITUIR(A2;".";"");"-";"");" ";""))
```

**Columnas C y D**: separan el cuerpo y el dígito escrito. Una fórmula en cada columna.

```
=IZQUIERDA(B2;LARGO(B2)-1)
=DERECHA(B2;1)
```

**Columna E**: calcula el dígito verificador.

```
=LET(c;TEXTO(C2;"00000000");i;SECUENCIA(8);s;SUMAPRODUCTO(--EXTRAE(c;i;1);RESIDUO(8-i;6)+2);x;11-RESIDUO(s;11);SI(x=11;"0";SI(x=10;"K";x&"")))
```

**Columnas F y G**: dicen si el RUT es válido y lo devuelven sin puntos, listo para el CRM.

```
=SI(E2=D2;"Válido";"Inválido")
=C2&"-"&D2
```

**Columna H**: lo devuelve con puntos y guion, para mostrarlo.

```
=LET(n;VALOR(C2);m;ENTERO(n/1000000);k;RESIDUO(ENTERO(n/1000);1000);u;RESIDUO(n;1000);SI(m>0;m&"."&TEXTO(k;"000")&"."&TEXTO(u;"000");SI(k>0;k&"."&TEXTO(u;"000");u&""))&"-"&D2)
```

Si prefieres validar en una sola celda, esta fórmula hace todo junto. No admite espacios dentro del RUT:

```
=LET(t;MAYUSC(SUSTITUIR(SUSTITUIR(A2;".";"");"-";""));n;SECUENCIA(8);s;SUMAPRODUCTO(--EXTRAE(TEXTO(IZQUIERDA(t;LARGO(t)-1);"00000000");n;1);RESIDUO(8-n;6)+2);x;11-RESIDUO(s;11);SI(SI(x=11;"0";SI(x=10;"K";x&""))=DERECHA(t;1);"Válido";"Inválido"))
```

La fórmula del dígito rellena el cuerpo con ceros a la izquierda hasta ocho dígitos y aplica los pesos de derecha a izquierda, igual que el cálculo a mano. Si tu Excel está en inglés, las funciones se llaman UPPER, SUBSTITUTE, LEFT, LEN, RIGHT, TEXT, SEQUENCE, SUMPRODUCT, MID, MOD, IF, VALUE e INT, y el separador es la coma.

### ¿Cómo validar el RUT en un formulario web?

La misma lógica, en JavaScript y sin librerías. Estas funciones aceptan el RUT con o sin puntos, con k minúscula y bajo el millón:

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

Las probamos con más de 200.000 RUT generados al azar contra una segunda implementación, y con los casos que suelen fallar: K mayúscula y minúscula, RUT bajo el millón, ceros a la izquierda y letras en medio del número.

La función es la parte fácil. Lo que hace que un formulario funcione bien son estas decisiones:

- **Valida al salir del campo, no en cada tecla.** Marcar error mientras la persona todavía está escribiendo sólo la apura.
- **Explica el error junto al campo.** «Revisa el RUT: el dígito verificador no calza» se entiende; «RUT inválido» no dice qué corregir.
- **Guarda un solo formato.** Muestra el RUT con puntos si quieres, pero guárdalo como 12345678-5.
- **Si el dato importa, valídalo también en el servidor.** Lo que corre en el navegador se puede saltar.

### ¿Cómo validar el RUT en un formulario de HubSpot?

Depende del editor con que creaste el formulario. HubSpot tiene hoy dos, y cada uno se valida distinto:

| Formulario | Cómo se valida el RUT | Qué plan necesitas |
|---|---|---|
| Editor nuevo | Con reglas en la propiedad: formato, caracteres permitidos y expresión regular. No calcula el dígito verificador. | Las reglas básicas, cualquier plan. La expresión regular, Professional o Enterprise. |
| Editor legacy, en HTML sin procesar | Con código de personalización en la inserción del formulario. Sí puede calcular el dígito verificador. | Marketing Hub o Content Hub Professional o Enterprise. |
| Editor legacy, sin HTML sin procesar | No admite código de personalización. | — |

Un detalle que confunde: [según HubSpot](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties), las reglas de la propiedad se aplican en los formularios del editor nuevo, al editar registros y al importar, pero no en los formularios del editor legacy.

#### Formularios del editor nuevo: reglas en la propiedad

1. Crea una propiedad de texto de una línea llamada RUT, en la empresa o en el contacto (más abajo te explico cuál).
2. En la pestaña de reglas, bloquea los espacios.
3. Si tienes Professional o Enterprise, agrega una [regla con expresión regular](https://knowledge.hubspot.com/properties/regex-validation-rules) que exija el formato sin puntos y con guion.
4. Escribe un mensaje de error que diga cómo corregir, por ejemplo: «Escribe el RUT sin puntos y con guion, como 12345678-5».

```
^[1-9][0-9]{0,7}-[0-9kK]$
```

Esta expresión acepta 12345678-5, 999999-K y 1-9, y rechaza el RUT con puntos o sin guion. No usa grupos de captura, que el motor de HubSpot no admite. Su límite es que revisa la forma y no el dígito: 12345678-6 pasa. Si necesitas el dígito verificador en estos formularios, la alternativa es revisarlo después en el CRM, por ejemplo con una lista de registros con RUT inválido que alguien corrige.

#### Formularios legacy en HTML sin procesar: código de personalización

Este código reemplaza el código de inserción del formulario: no va debajo, va en su lugar. Pega primero las funciones de la sección anterior y después esto, cambiando el portal, el formulario y el nombre interno de tu propiedad:

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

Antes de publicarlo en tu sitio, pruébalo con tres casos: un RUT válido, uno con el dígito equivocado y el campo vacío.

### ¿Cómo evitar RUT duplicados en HubSpot?

Validar el formato evita errores de tipeo, pero no evita que el mismo RUT entre dos veces. Para eso:

- **Guarda un solo formato** (12345678-5): con dos formatos, el mismo RUT parece dos datos distintos.
- **Marca la propiedad para que exija valores únicos.** HubSpot lo permite en todos los planes, pero sólo al crear la propiedad y hasta diez propiedades únicas por objeto.
- **Limpia antes de importar.** Pasa la base por las fórmulas de Excel de arriba y sube la columna sin puntos.

¿Empresa o contacto? Si vendes a empresas, el RUT que te sirve es el de la empresa, y va en la empresa. El RUT de una persona va en su contacto y sólo lo pediría si lo necesitas para facturarle. Si estás armando el CRM desde cero, en [cómo pasar de Excel a HubSpot](https://efeoncepro.com/hubspot/de-excel-a-hubspot-en-5-dias/) cuento el orden en que conviene hacerlo.

### ¿Conviene pedir el RUT en un formulario?

Mi respuesta corta: sólo si lo vas a usar. Para descargar un ebook o suscribirse a un newsletter no hace falta. Para cotizar, emitir una factura o dar de alta a un cliente, sí.

No es sólo una cuestión de experiencia. La [Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719), que reforma la ley de protección de datos personales, está prevista para entrar en vigencia el 1 de diciembre de 2026, y se basa en tratar sólo los datos necesarios para la finalidad que declaras. En septiembre de 2026 el Gobierno [ingresó un proyecto](https://www.carey.cl/api/archivo/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales?lang=es) para postergarla hasta el 1 de diciembre de 2027; revisa en qué quedó antes de planificar.

Esto no es asesoría legal: si tu formulario pide datos personales, revisa con tu equipo legal para qué los pides y cómo lo informas.

### Preguntas frecuentes sobre el RUT

**¿El RUT se escribe con puntos?**

Los puntos son opcionales. 12.345.678-5 y 12345678-5 son el mismo RUT. Conviene mostrarlo con puntos y guardarlo sin puntos, con guion.

**¿Qué significa la K en el RUT?**

La K reemplaza al 10. Cuando el cálculo del dígito verificador da 10, se escribe K para que el dígito siga ocupando un solo carácter.

**¿Validar el dígito verificador confirma que el RUT existe?**

No. Sólo confirma que el RUT está bien escrito. Para saber si está registrado hay que consultarlo en el SII.

**¿Basta con una expresión regular para validar un RUT?**

No. Una expresión regular revisa la forma, pero no puede calcular el dígito verificador: 12345678-6 tiene la forma correcta y es un RUT inválido.

**¿Dónde guardo el RUT en HubSpot, en el contacto o en la empresa?**

Si vendes a empresas, en la empresa. El RUT de una persona va en su contacto y sólo vale la pena pedirlo si lo necesitas para facturarle.

### En resumen

Un RUT bien escrito tiene cuerpo, guion y dígito verificador. El dígito se calcula con módulo 11 y atrapa errores de tipeo, no identidades falsas. Lo que hace la diferencia en un CRM es guardarlo siempre igual, validarlo donde entra y pedirlo sólo cuando lo vas a usar.

- Si quieres seguir esta conversación, lee [Glitch](https://efeoncepro.com/category/glitch/): cada lunes, una idea sobre IA, marketing y negocios.
- Para saber si tus formularios de HubSpot se están midiendo bien, sigue con [cómo rastrear formularios de HubSpot en GA4](https://efeoncepro.com/hubspot/como-rastrear-formularios-hubspot-en-ga4-paso-a-paso/).
- Y si estás implementando o ordenando HubSpot en Chile, conoce cómo trabajamos [HubSpot en Efeonce](https://efeoncepro.com/servicios-contratar-hubspot/).

### Fuentes y nota de actualización

- HubSpot. [Set validation rules for properties](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties).
- HubSpot. [Create regex validation rules for properties](https://knowledge.hubspot.com/properties/regex-validation-rules).
- HubSpot Developers. [Legacy forms](https://developers.hubspot.com/docs/cms/start-building/features/forms/legacy-forms).
- Biblioteca del Congreso Nacional. [Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719).
- Carey (2026). [Gobierno ingresa proyecto de ley que posterga en un año la entrada en vigor de la Ley 21.719](https://www.carey.cl/api/archivo/gobierno-ingresa-proyecto-de-ley-que-posterga-en-un-ano-entrada-en-vigor-de-la-ley-sobre-proteccion-de-datos-personales?lang=es).

Este artículo se publicó en noviembre de 2024 como un tutorial para validar el RUT en formularios de HubSpot y se reescribió en octubre de 2026: se sumó el formato del RUT, el cálculo del dígito verificador y las fórmulas de Excel; se corrigió un ejemplo de RUT válido que no lo era; se actualizó el código a los dos editores de formularios de HubSpot y se retiró la afirmación de que validar el RUT «cumple normativas». Lo desarrolló Julio Reyes con apoyo de IA en investigación, código y edición; el código y las fórmulas se probaron antes de publicar, y Julio aprobó la versión final.
