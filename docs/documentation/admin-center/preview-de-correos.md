# Preview de Correos — Herramienta de Vista Previa y Prueba de Emails

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-06 por Claude (asistido por Julio Reyes)
> **Ultima actualizacion:** 2026-04-06 por Claude
> **Documentacion tecnica:** `docs/architecture/GREENHOUSE_EMAIL_PREVIEW_V1.md`

## Que es

El Preview de Correos es una herramienta del Admin Center que permite a los administradores ver exactamente como se ven los emails del sistema antes de que lleguen a los destinatarios. Tambien permite enviar un correo de prueba real a tu propia bandeja de entrada para verificar como se ve en un cliente de correo (Gmail, Outlook, etc.).

No es un editor visual — no permite modificar el diseno de los templates. Su proposito es revisar, probar y validar los correos que Greenhouse envia automaticamente.

## Como acceder

1. Ir a **Admin Center** en el menu lateral
2. Dentro de la seccion **Platform**, seleccionar **Preview de correos**

**Requisito de acceso:** solo usuarios con rol `efeonce_admin` o con el permiso `administracion.email_delivery` asignado en su set de permisos pueden acceder.

## Que se puede hacer

### Ver todos los templates de correo

La barra lateral izquierda muestra todos los templates de correo registrados en el sistema. Cada uno muestra su nombre y el dominio al que pertenece (identidad, nomina, sistema). Al hacer clic en uno, se carga la vista previa en el panel central.

### Cambiar idioma

Los templates que soportan multiples idiomas permiten alternar entre **espanol (ES)** e **ingles (EN)** usando el selector de idioma en la barra de herramientas. Al cambiar, la vista previa se recarga automaticamente con la version en el idioma seleccionado.

### Cambiar vista escritorio y movil

El selector de viewport permite alternar entre:

- **Escritorio** (600px de ancho) — como se ve el correo en un monitor
- **Movil** (375px de ancho) — como se ve en un telefono

### Editar datos de ejemplo

El panel derecho ("Datos de ejemplo") muestra los campos que usa cada template: nombre del destinatario, URL, cliente, montos, etc. Al modificar cualquier campo, la vista previa se actualiza automaticamente (con un breve retraso para no sobrecargar el servidor).

Esto permite probar como se ve el correo con diferentes datos sin necesidad de tocar codigo.

### Enviar un correo de prueba

El boton **Enviar prueba** envia un correo real a tu propia direccion de email (la del usuario administrador logueado). El correo pasa por todo el sistema de entrega normal: resolucion de contexto, rate limiting y tracking. Esto permite verificar como se ve el correo en tu bandeja de entrada real.

> El correo de prueba queda registrado en el sistema de tracking con la etiqueta `email_preview_test`.

## Templates disponibles

| Template                    | Dominio    | Idiomas   | Descripcion                                                |
| --------------------------- | ---------- | --------- | ---------------------------------------------------------- |
| Invitacion de onboarding    | Identidad  | ES / EN   | Se envia al invitar un usuario nuevo a la plataforma       |
| Restablecer contrasena      | Identidad  | ES / EN   | Enlace para cambiar la contrasena                          |
| Verificacion de correo      | Identidad  | ES / EN   | Confirmar la direccion de correo electronico               |
| Notificacion generica       | Sistema    | ES / EN   | Template generico para notificaciones del sistema          |
| Nomina cerrada              | Nomina     | Solo ES   | Notificacion de que la nomina del periodo fue exportada    |
| Recibo de nomina            | Nomina     | Solo ES   | Liquidacion individual del colaborador                     |

## Como agregar un nuevo template

Los templates que aparecen en el Preview se auto-descubren. Para que un nuevo template aparezca en la herramienta, solo se necesita agregar una llamada a `registerPreviewMeta()` en el archivo `src/lib/email/templates.ts` con los datos del template (nombre, dominio, datos de ejemplo y esquema de campos editables).

No hace falta modificar la interfaz grafica ni ningun archivo de configuracion. Al desplegar la version con la nueva llamada, el template aparece automaticamente en la barra lateral.

> Detalle tecnico: ver seccion "Extensibility" en [GREENHOUSE_EMAIL_PREVIEW_V1.md](../../architecture/GREENHOUSE_EMAIL_PREVIEW_V1.md)

## Limitaciones

- **No es un editor visual** — no permite cambiar colores, tipografia ni estructura del template. Para eso se usa el servidor de desarrollo local con react-email.
- **No reemplaza el entorno de desarrollo** — los cambios de codigo en templates requieren desarrollo local y despliegue.
- **No muestra adjuntos PDF** — templates como el recibo de nomina incluyen un PDF adjunto, pero la vista previa solo muestra el cuerpo HTML del correo, no los archivos adjuntos.
- **Rate limiting aplica** — los envios de prueba estan sujetos al mismo limite de 10 correos por hora por destinatario que los envios normales.
