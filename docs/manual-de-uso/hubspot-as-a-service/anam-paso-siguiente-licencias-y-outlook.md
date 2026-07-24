# ANAM — Paso siguiente, licencias y HubSpot Sales en Outlook web

> **Tipo:** Manual de uso
> **Versión:** 1.1
> **Actualizado:** 2026-07-24
> **Portal:** ANAM `19893546`
> **Funcional:** [`../../documentation/hubspot-as-a-service/anam-seguimiento-2026-07-24.md`](../../documentation/hubspot-as-a-service/anam-seguimiento-2026-07-24.md)
> **Técnico:** [`../../architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md`](../../architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md)

## 1. Registrar `Paso siguiente`

### Para qué sirve

Permite que cualquier persona entienda qué acción mueve el Negocio, quién la hará y cuándo. No es una etapa ni
un comentario general. También alimenta la columna operativa del backlog comercial: un Negocio abierto sin una
acción concreta no permite anticipar qué ocurrirá ni cuándo.

En Growth es obligatorio desde `Calificado 30%` y continúa siendo requerido en `Interesado 50%` y `Hot 85%`.
En Renovación es obligatorio en las cuatro etapas abiertas: `Por revisar`, `Elegibilidad confirmada`,
`Contacto iniciado` y `Propuesta en negociación`.

### Paso a paso

1. Abre el Negocio.
2. Busca la propiedad `Paso siguiente`.
3. Escribe `acción + resultado esperado + responsable + fecha`.
4. Guarda.
5. Ejecuta la acción y registra la actividad correspondiente.
6. Cuando la acción termine o cambie, reemplaza el valor por la nueva acción.

Ejemplos correctos:

- `Enviar propuesta corregida — Ana Pérez — 29/07/2026`.
- `Confirmar fecha de muestreo con cliente — Ricardo Miralles — 31/07/2026`.
- `Recibir OC aprobada — Cliente / Isabel Aguilera — 04/08/2026`.

Evita:

- `Pendiente`.
- `Hacer seguimiento`.
- `Llamar`.
- `Esperar respuesta`.

Esos textos no indican resultado, responsable ni fecha.

### Cómo se interpreta

- **Acción:** qué debe hacerse ahora, expresado con un verbo.
- **Resultado esperado:** qué hito permitirá avanzar o decidir.
- **Responsable:** quién mueve la acción; puede ser ANAM, el cliente o ambas partes.
- **Fecha:** compromiso o fecha de revisión, no una estimación indefinida.

`Paso siguiente` no reemplaza las notas, tareas, correos o llamadas. Las actividades conservan el historial; esta
propiedad muestra únicamente la próxima acción vigente. Por eso debe sustituirse después de cada avance y no
acumular una cronología dentro del mismo campo.

El seguimiento puede revisarse en
[`ANAM — Backlog comercial (PILOTO)`](https://app.hubspot.com/reports-dashboard/19893546/view/21329151), donde
cada fila muestra Negocio, etapa, owner, fecha de cierre y `Paso siguiente`.

## 2. Entender las licencias

La licencia o puesto habilita herramientas; los permisos controlan el acceso concreto.

| Puesto | Para quién | Qué habilita |
|---|---|---|
| Core/Principal Professional | Personas que trabajan en CRM, marketing u operaciones generales | Funciones principales incluidas en la suscripción, sujetas a permisos |
| Sales Hub Professional | Ejecutivos y líderes comerciales | Funciones profesionales completas de ventas, como herramientas avanzadas de prospección, seguimiento y productividad |
| Service Hub Professional | Atención, Calidad y servicio al cliente | Funciones profesionales completas de mesa de ayuda, Tickets, SLA, conocimiento y servicio |

Inventario al 2026-07-24:

- Sales Professional: 10 de 11 asignados.
- Service Professional: 1 de 3 asignados.
- Core/Principal Professional: 10 de 21 asignados.

Antes de asignar un puesto:

1. define las tareas que hará la persona;
2. elige el hub que realmente necesita;
3. asigna permisos mínimos;
4. valida el flujo con esa identidad;
5. retira el puesto si cambia de función o sale del equipo.

## 3. Instalar HubSpot Sales en Outlook web

### Antes de empezar

- Usa una cuenta Microsoft 365.
- Verifica que tu correo personal esté conectado en HubSpot.
- Si la organización restringe complementos, solicita al administrador Microsoft 365 que permita o implemente
  `HubSpot Sales`.

### Instalación

1. Abre Outlook en el navegador.
2. Crea un correo nuevo.
3. Abre `Aplicaciones` o `Obtener complementos`.
4. Busca `HubSpot Sales`.
5. Selecciona `Agregar`.
6. Vuelve al correo, abre `Aplicaciones` y elige `HubSpot Sales`.
7. Inicia sesión y autoriza la cuenta correcta.
8. Fija el complemento si Outlook ofrece esa opción.

### Uso

- `Registrar` guarda el correo en el CRM. Revisa y selecciona el contacto, empresa, negocio o ticket asociado.
- `Seguimiento` mide aperturas. El seguimiento de clics requiere un puesto Sales pagado compatible.
- Para una conversación importante, revisa las asociaciones antes de enviar; registrar en el contacto equivocado
  genera historial engañoso.

### Si el complemento no aparece o no carga

1. Abre primero un correo nuevo; el complemento se muestra dentro del contexto del mensaje.
2. Confirma que Outlook y HubSpot usan la cuenta Microsoft correcta.
3. Revisa `Aplicaciones` / `Administrar complementos` y confirma que `HubSpot Sales` esté habilitado.
4. Actualiza Outlook web y vuelve a abrir el borrador.
5. Cierra sesión en HubSpot dentro del complemento e inicia sesión otra vez.
6. Prueba en una ventana privada para descartar sesión/caché; no uses esa ventana como solución permanente.
7. Si sigue sin cargar para varias personas, escala al administrador Microsoft 365 para revisar políticas de
   complementos, consentimiento y despliegue centralizado.
8. Registra hora, usuario, navegador, captura y mensaje exacto; evita reportar sólo `no carga`.

Referencias oficiales:

- [Instalar HubSpot Sales para Outlook/Microsoft 365](https://knowledge.hubspot.com/es/connected-email/how-to-install-hubspot-sales)
- [Registrar y hacer seguimiento de correos](https://knowledge.hubspot.com/es/connected-email/track-and-log-emails-with-the-hubspot-sales-outlook-desktop-add-in)
- [Cómo funciona el seguimiento de aperturas y clics](https://knowledge.hubspot.com/es/connected-email/understand-hubspot-sales-email-open-and-click-tracking)

## Qué no hacer

- No asignar un puesto Sales o Service sólo por jerarquía; asignarlo por función.
- No usar `Paso siguiente` como nota histórica.
- No prometer que `Seguimiento` prueba que una persona leyó el correo; una apertura puede tener limitaciones de
  privacidad o cliente de correo.
- No instalar el complemento antiguo de escritorio como primera opción para Microsoft 365; usar el complemento
  de Office 365.
