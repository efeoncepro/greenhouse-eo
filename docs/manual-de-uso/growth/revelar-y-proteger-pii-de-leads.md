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
