# Tracking y dominios en Resend

Verificado contra documentación oficial el 2026-08-20. Usa `[DOC]` para hechos documentados,
`[OBS]` para evidencia del runtime Greenhouse y `[NO-DOC]` para lo que requiere canary.

## Contrato actual

- [DOC] Open y click tracking nacen apagados por dominio.
- [DOC] Tracking activo requiere dos condiciones: el flag `open_tracking|click_tracking` habilitado
  y un `tracking_subdomain` configurado y verificado.
- [DOC] Open tracking inserta un pixel transparente; click tracking reescribe cada enlace HTML para
  pasar por el subdominio y redirigir luego a la URL original.
- [DOC] Resend recomienda limitar tracking a broadcasts; el tracking puede perjudicar la
  entregabilidad de correos transaccionales sensibles.

## Drift que no debe ocultarse

- [OBS] El 2026-08-19, `efeoncepro.com` produjo eventos `email.clicked` firmados aunque su readback
  observado indicaba `tracking_subdomain=None`.
- Esto contradice el contrato documental actual. Puede ser estado histórico, un campo omitido en un
  readback anterior o comportamiento de cuenta no descrito.
- Regla fail-closed: para magic links, bearer links, resets e invitaciones, exige
  `click_tracking=false` y verifica el href de un correo canary. Ni el flag ni el subdominio por sí
  solos prueban el comportamiento.
- [NO-DOC] Resend no documenta cómo preserva fragmentos, query strings o paths con secretos durante
  el rewrite. No lo completes por intuición.

## Operación de dominios

1. Resuelve el dominio exacto del `from`; raíz y subdominio son objetos independientes.
2. Lee estado con `GET /domains/{id}`. El response incluye nombre, región, flags de tracking,
   `tracking_subdomain`, capabilities y DNS records.
3. `PATCH /domains/{id}` muta, pero responde sólo `{object, id}`. Haz readback posterior con `GET`.
4. Al crear o cambiar el tracking subdomain, publica el CNAME y llama al endpoint de verificación.
5. Un tracking subdomain creado no puede removerse: sólo cambiarse. El nuevo valor requiere
   verificación y el anterior sigue activo mientras tanto.
6. Borrar el dominio elimina el proxy de tracking y puede romper links ya enviados. Es una acción
   destructiva separada, con aprobación y rollback.

## Checklist de seguridad

- dominio y región exactos;
- `open_tracking`, `click_tracking`, `tracking_subdomain` y DNS leídos por `GET`;
- tipo de correo: secreto/transaccional/marketing;
- canary con href recibido para cualquier link con credencial;
- eventos `email.clicked` consultados sólo como evidencia de rewrite, no como prueba de link sano;
- no exponer API keys, DNS secrets ni URLs con tokens en logs o capturas.

## Fuentes oficiales

- [Open and Click Tracking](https://resend.com/docs/dashboard/domains/tracking)
- [Retrieve Domain](https://resend.com/docs/api-reference/domains/get-domain)
- [Update Domain](https://resend.com/docs/api-reference/domains/update-domain)
- [Deliverability Insights](https://resend.com/docs/dashboard/emails/deliverability-insights)
