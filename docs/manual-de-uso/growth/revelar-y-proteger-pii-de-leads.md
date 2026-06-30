# Revelar y proteger PII de leads (Formularios Growth)

> Para operadores del portal. Explica cómo ver el dato completo de un lead enmascarado y qué reglas aplican. Documentación funcional: [postura-pii-formularios](../../documentation/growth/postura-pii-formularios.md).

## Para qué sirve

Los datos personales de los leads (correo, teléfono, RUT) aparecen **enmascarados** en el panel (`j***@empresa.cl`, `xx.xxx.678-K`). Cuando necesitas el valor completo —por ejemplo, el correo real para contactar al lead— usas **Revelar**. Cada reveal queda auditado.

## Antes de empezar

- Necesitas el permiso **`growth.forms.lead_pii.reveal`**. Hoy lo tienen administradores internos y operaciones. Si no lo ves, no es un error: tu rol no lo incluye (por ejemplo, los roles comerciales no revelan cédulas).
- Ten clara la **razón** del reveal: vas a tener que escribirla (mínimo 10 caracteres) y queda registrada con tu nombre.

## Paso a paso

1. Abre el lead en el panel de formularios (cuando esté disponible la pantalla del cockpit — TASK-1256).
2. Junto al dato enmascarado, usa la acción **Revelar**.
3. Escribe la razón (ej.: "Contactar al lead por cotización aprobada").
4. Confirma. Verás el valor completo y se habrá registrado el acceso.

Programáticamente (agentes / integraciones):

```bash
# Vista enmascarada del lead
GET  /api/admin/growth/forms/submissions/{submissionId}/lead

# Revelar UN campo (requiere capability + reason ≥ 10)
POST /api/admin/growth/forms/submissions/{submissionId}/reveal
     { "fieldKey": "email", "reason": "Contactar al lead por cotización aprobada" }
```

## Qué significan los estados

- **Enmascarado**: lo que ves por defecto. El valor real existe pero está oculto.
- **Cifrado** (solo RUT): el dato está cifrado en la base; ni siquiera se descifra para mostrar la máscara. Solo el reveal lo descifra.
- **Revelado**: viste el valor completo. Quedó una fila de auditoría que **no se puede borrar**.

## Qué no hacer

- No reveles datos "por las dudas". Cada reveal queda auditado y una señal vigila accesos sin razón.
- No intentes enviar el **RUT a HubSpot**: por diseño, la cédula nunca sale del portal. El correo y el teléfono sí fluyen al CRM normalmente.
- No accedas a la base de datos para leer la cédula directo: está cifrada, y un reveal sin razón válida dispara una alerta.

## Problemas comunes

- **"No veo el botón Revelar"**: tu rol no tiene la capability. Pídela a un administrador si tu función la requiere.
- **"Me pide una razón más larga"**: el mínimo son 10 caracteres; escribe el motivo real del acceso.
- **El RUT no llegó a HubSpot**: es correcto, es intencional (Ley 21.719). HubSpot recibe correo/nombre/empresa, no la cédula.

## Referencias técnicas

- Lógica: `src/lib/growth/forms/pii/` (`reveal.ts`, `masked-reader.ts`, `encryption.ts`).
- Auditoría: `greenhouse_growth.lead_pii_reveal_audit` (append-only).
- Señal: `growth.forms.pii_reveal_without_reason` (estado sano = 0).
- Spec: [TASK-1255](../../tasks/in-progress/TASK-1255-growth-forms-pii-hardening-ley-21719.md).

## Delta 2026-06-26 (TASK-1256) — ya tiene interfaz en el cockpit

Lo anterior describía los contratos; ahora hay UI en el cockpit de Growth Forms (`/admin/growth/forms`).

### Revelar un dato de un lead (desde el cockpit)

1. Selecciona el formulario y abre **Abrir evidencia** en el inspector.
2. En **Datos del lead** verás los campos sensibles **enmascarados** por default (ej. `c***@empresa.com`, `12.345.6**-K`) con el chip **Enmascarado**.
3. Si tienes permiso, cada dato revelable muestra el botón **Revelar**. Al pulsarlo se abre un diálogo:
   - Escribe el **Motivo del acceso** (mínimo 10 caracteres).
   - Un aviso te recuerda que la acción **queda registrada** con tu usuario, la fecha y el motivo.
   - Pulsa **Revelar dato**. El valor se muestra y queda en la bitácora.
4. Si **no** tienes la capability `growth.forms.lead_pii.reveal`, no verás el botón Revelar (solo el dato enmascarado) — es esperado.

### Configurar la validación de un formulario (builder)

Al crear un formulario (botón **Nuevo formulario** → Composer), en la sección **Validación y datos**:

- **Gate de correo corporativo**: *Sin gate* / *Advertir* / *Bloquear*. "Bloquear" rechaza gmail/temporales antes de aceptar el lead.
- **Pedir teléfono** (con país por defecto) y **Pedir RUT / cédula**: agregan esos campos con su validador correcto.
- Todo se elige de un **catálogo gobernado** (listas/interruptores). No hay campo de "regex" — cada validador es seguro por construcción.

> Detalle técnico: la config se persiste en una versión nueva del formulario (las publicadas son inmutables). Spec: [TASK-1256](../../tasks/complete/TASK-1256-growth-forms-field-masks-submit-gate-admin-config.md).
