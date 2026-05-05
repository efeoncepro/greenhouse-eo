# Manual: Datos legales personales

> Para que tu finiquito, contrato y boleta de honorarios salgan con tu RUT y tu direccion correctos.

## Para que sirve

Greenhouse necesita tu RUT y tu direccion para emitir documentos formales. Sin ellos, la plataforma bloquea la emision del finiquito y otros documentos legales.

## Antes de empezar

- Tener a mano tu RUT (Chile) o documento de identidad equivalente segun pais.
- Tener tu direccion legal (la que figura en tu contrato o donde pueden enviarte documentacion oficial).
- Acceso a `/my/profile` (todo colaborador autenticado lo tiene).

## Paso a paso

### Declarar o actualizar tu documento de identidad

1. Ve a `/my/profile`.
2. Abre la pestaña **Datos legales**.
3. En el panel izquierdo "Documento de identidad":
   - Selecciona el pais emisor (default: Chile).
   - Selecciona el tipo de documento (default: RUT).
   - Ingresa el numero (ejemplo: `12.345.678-K`).
   - Click en **Guardar documento**.
4. Tu RUT desaparece del formulario y aparece como `xx.xxx.678-K` (mascara). Esto es normal — el sistema lo guarda completo internamente, pero NO te lo muestra de vuelta.
5. El estado pasa a **Pendiente de revision** y HR recibe la notificacion.

### Declarar o actualizar tu direccion

1. En el panel derecho "Direcciones":
   - Selecciona el tipo (legal, residencia, correspondencia, emergencia).
   - Pais.
   - Calle y numero (ejemplo: `Av. Apoquindo 1234, Depto 501`).
   - Ciudad.
   - Region/estado (opcional).
   - Codigo postal (opcional).
   - Click en **Guardar direccion**.
2. La direccion se muestra parcialmente (ciudad, region, pais — sin la calle).

## Que significan los estados

| Estado | Significa |
|---|---|
| Pendiente de revision | HR todavia no verifico tu dato. No cuenta para finiquito. |
| Verificado | HR confirmo. Lista para finiquito y otros documentos formales. |
| Rechazado | HR detecto un problema. Lee el motivo y vuelve a declarar el dato corregido. |
| Archivado | Reemplazado por una version posterior. Queda en historial. |
| Vencido | Paso la fecha de validez (poco comun para RUT, normal para pasaportes). |

Si ves un banner amarillo o rojo arriba que dice "Datos pendientes para emitir documentos formales", significa que para tu caso (Chile dependiente, finiquito) algo falta. El listado de bloqueadores te dice exactamente que.

## Que NO hacer

- **No** ingreses datos de otra persona. El audit log registra tu identidad como declarante.
- **No** asumas que con declarar el dato basta. Hasta que HR no lo verifique, no cuenta para finiquito.
- **No** intentes "ver completo" tu propio RUT desde la plataforma — esa accion solo la pueden hacer EFEONCE_ADMIN o FINANCE_ADMIN, con motivo y queda registrado.
- **No** uses el campo notas para guardar un RUT o direccion alternativa. El sistema NUNCA lee notas como dato canonico.

## Problemas comunes

**"El sistema dice que mi RUT tiene formato invalido"**
Verifica el digito verificador. Si es K, ingresalo en mayuscula. Acepta `12.345.678-K`, `12345678-K`, `12345678K`.

**"Declare mi RUT pero el finiquito sigue bloqueado"**
Tu RUT esta en "Pendiente de revision". Avisale a HR para que lo verifique.

**"HR rechazo mi RUT y no entiendo por que"**
El motivo aparece en rojo bajo el documento rechazado. Si es ambiguo, contacta a HR directamente.

**"Quiero cambiar mi direccion"**
Declara la nueva. La anterior queda en estado "Archivado" en el historial. Solo una direccion activa por tipo (legal, residencia, etc.) puede existir a la vez.

## Referencias tecnicas

- `docs/documentation/identity/datos-legales-personales.md` (doc funcional)
- `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md` (spec)
- API: `GET/POST /api/my/legal-profile`
