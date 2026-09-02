# Contacto Efeonce — brief de reconstrucción V1

Estado: `TASK-1801` registrada en `to-do`; implementación y rollout pendientes
Fecha: 2026-08-31
Superficie objetivo: `https://efeoncepro.com/contacto/`
Runtime: WordPress/Elementor como host; Growth Forms y Meetings como contratos canónicos

## Propósito

Reconstruir Contacto como una superficie que dirige a cada persona al canal y equipo adecuados. Debe servir a
potenciales clientes, partners, clientes actuales, postulantes y otras consultas, y permitir sugerencias y reclamos
sin obligarlos a completar un formulario comercial.

El primer fold ofrece dos acciones independientes: **Enviar un mensaje** y **Agendar una reunión**. En escritorio,
formulario y alternativa de agenda pueden convivir en dos columnas; a 390 px se apilan sin ocultar ninguna acción.
La página conserva continuidad visual con el sitio vigente y evita una introducción extensa o motion que retrase el
contacto.

## Formulario por motivo

El primer control pregunta **¿Para qué quieres contactarnos?**; no exige que la persona conozca una taxonomía de
stakeholders. Growth Forms gobierna definición, versiones, campos, condiciones, validación, consentimiento,
destinos, dispatch y reintentos. WordPress sólo hospeda el renderer.

| Motivo | Campos condicionales |
| --- | --- |
| Quiero contratar un servicio | Empresa; necesidad/servicio, incluido «Necesito orientación»; descripción; plazo aproximado; presupuesto opcional con «Por definir» |
| Quiero explorar una alianza | Organización; sitio web; tipo de colaboración; propuesta |
| Ya soy cliente y necesito ayuda | Empresa; servicio/proyecto relacionado; descripción; acceso al portal como alternativa sin bloquear el envío |
| Quiero compartir una sugerencia | Tema; sugerencia; no exige empresa ni teléfono |
| Quiero presentar un reclamo | Qué ocurrió; servicio relacionado cuando aplique; fecha aproximada; respuesta o solución esperada; no exige contrato |
| Quiero trabajar con Efeonce | Orientación a Careers y postulaciones para evitar una recepción paralela de CV |
| Otra consulta | Asunto; mensaje; cubre prensa, instituciones y proveedores |

Datos comunes: nombre y correo. País se solicita cuando ayuda al routing y siempre ofrece «Otro país». Teléfono es
opcional; el formulario no exige correo corporativo. El flujo corto es `motivo → mensaje y datos`. Volver conserva
los datos comunes y cambiar de motivo no envía valores ocultos del motivo anterior.

## Agendar

La reunión no requiere enviar antes el formulario. La experiencia declara propósito, duración, modalidad,
disponibilidad y zona horaria; sólo confirma éxito con receipt del servidor. Si no hay disponibilidad, permite
volver al mensaje conservando el contexto. Reutiliza Meetings y requiere activación/evidencia propia para Contacto:
el piloto `/agenda/` o una activación en otra landing no autorizan esta superficie por inferencia.

Sugerencias y reclamos priorizan el canal escrito y su seguimiento; agendar nunca es requisito para presentarlos.

## Datos institucionales vigentes

- **Dirección de referencia:** Dr. Manuel Barros Borgoño 71, oficina 1105, Providencia, Chile.
- **Teléfono Chile:** +56 9 3732 3064.
- **Teléfono Estados Unidos:** +1 (239) 235-2073.
- **Correo comercial:** sales@efeoncepro.com.
- **Mercados donde operamos:** Chile, Estados Unidos, Colombia, México y Perú.

Fuentes: `src/config/efeonce-brand.ts` para dirección fallback y mercados; contrato `contactDetails` de
`src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json` y HTML de `back-cover-full.html` para
los datos de las contraportadas. La cobertura no implica oficina ni entidad legal en cada mercado. No publicar
Las Bellotas 199, un horario, atención presencial, «Cómo llegar» ni WhatsApp hasta verificar cada dato; un número
telefónico no prueba que sea un canal WhatsApp.

## Routing, privacidad y respuesta

Cada motivo debe declarar owner/destino, confirmación y plazo real. Sugerencias y reclamos no entran por defecto
a una secuencia comercial. El consentimiento de marketing es opcional y separado de la gestión de la consulta.
Los textos libres y datos personales no se envían a analítica. Un reclamo devuelve referencia de seguimiento. Los
errores conservan el borrador y el reintento es idempotente. Adjuntos quedan fuera de V1 salvo necesidad y storage
seguro explícitos. La promesa pública actual de respuesta en menos de 24 horas no se conserva sin compromiso
operativo verificable.

## Secciones de la página

1. Apertura «¿En qué podemos ayudarte?» y las dos acciones.
2. Formulario condicional.
3. Agenda independiente.
4. Dirección, canales y cobertura; mapa regional liviano y enlace a mapa sólo después de verificar la atención.
5. Preguntas prácticas sobre seguimiento, privacidad, otros países y canales para clientes.

## Estado, alcance y verificación

Este brief actualiza fuentes del repo; **no publica WordPress ni cambia el runtime**. Antes de implementar la task hay
que confirmar owners por motivo, SLA de respuesta, atención presencial/horarios, tratamiento de Careers y política
de reclamos. La implementación debe probar routing completo, validación/condiciones, consentimientos, no-PII en
telemetría, recovery/idempotencia, booking y receipt reales, teclado, lector de pantalla, reduced motion, 390 px,
`scrollWidth === clientWidth`, SEO/canonical y todos los enlaces que hoy llegan a `/contacto/`.

El rollout debe corregir la página pública que todavía muestra Las Bellotas 199, el teléfono anterior, cuatro
mercados o una narrativa de Estados Unidos sólo como futuro. También debe revisar los consumidores públicos de
la lista histórica de cuatro mercados; una cifra histórica como «120+ empresas en 4 países» conserva su alcance y
no se convierte automáticamente en una prueba de clientes en cinco países.
