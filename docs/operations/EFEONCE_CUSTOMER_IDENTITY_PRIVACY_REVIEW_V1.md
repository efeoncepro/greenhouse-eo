# Efeonce Customer Identity — Revisión de Privacidad y Subprocesador V1

> **Tipo de documento:** Memo de revisión de privacidad (orientativo — NO es asesoría legal)
> **Versión:** 1.0
> **Creado:** 2026-08-05 por Claude (TASK-1631 Slice 0 / S0.3, skill `legal-privacy-ip-operator`)
> **Última actualización:** 2026-08-05
> **Documentación técnica:** [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](../architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
> **⚠️ Este memo estructura el riesgo y las preguntas; la validación final es de un abogado habilitado en la
> jurisdicción aplicable ANTES de firmar el DPA o provisionar el tenant productivo.**

## Por qué existe este memo

`TASK-1631` es el **primer flujo que rutearía datos personales de personas de organizaciones cliente a un
procesador externo nuevo** (el proveedor de identidad, candidato WorkOS). El gate de privacidad es independiente
del gate comercial: aprobar el plan de USD 99/mes no cierra esta revisión, y viceversa.

## Contexto normativo (as-of de la skill: 2026-07; reverificar vigencia)

- **Chile — Ley 21.719** (publicada 13-dic-2024): plena vigencia el **1-dic-2026**, crea la **APDP** con potestad
  de multar y suspender tratamientos. Régimen GDPR-like: bases de licitud, minimización, notificación de brechas,
  régimen de transferencia internacional. El rollout de esta task convive con esa entrada en vigencia.
- **Colombia — Ley 1581/2012** (SIC, RNBD); reforma aprobada en comisión pero **aún no es ley**.
- **México — NUEVA LFPDPPP (vigente 21-mar-2025)**: el INAI fue disuelto; la autoridad es la Secretaría
  Anticorrupción y Buen Gobierno. No citar materiales pre-2025.
- **Perú — Ley 29733 + Reglamento D.S. 016-2024-JUS (vigente 31-mar-2025)**: ANPDP; DPO obligatorio en ciertos
  casos; registro de bancos de datos.
- **GDPR**: alcance extraterritorial si hay titulares en la UE (clientes Globe internacionales pueden arrastrarlo).

## Roles

- **Efeonce Group SpA** actúa como **responsable (controller)** de los datos de contacto B2B de las personas de
  sus organizaciones cliente que administra en Account 360 para la relación comercial y el acceso MCP.
- **El proveedor de identidad (WorkOS u otro)** actuaría como **encargado (processor)** de Efeonce para la
  autenticación, y sus proveedores (p. ej. AWS) como **sub-encargados**.
- En la ruta **native** no aparece un encargado nuevo: los datos siguen en el stack actual (GCP), que ya es una
  transferencia internacional existente y declarada del stack Efeonce.

## Qué datos personales se envían al proveedor (y cuáles NO)

| Se envía (mínimo necesario) | NO se envía (queda en Efeonce) |
| --- | --- |
| Nombre y apellido de la persona invitada | Datos comerciales de la organización (contratos, precios, pipeline) |
| Email corporativo | Datos de Globe (workspaces, assets, créditos, prompts) |
| Afiliación a la organización externa (nombre de la org en el IDP) | El grafo Account 360, memberships y grants (viven en Greenhouse) |
| Metadata de autenticación (timestamps de sesión, IP, user agent — lo que el IDP registra por operar) | Tokens/sesiones de Greenhouse, `NEXTAUTH_SECRET`, cookies del portal |
| Credencial administrada por el IDP (password/passkey/MFA) | Cualquier dato sensible (no aplica a este flujo) |

**Principio de minimización aplicado:** el binding canónico (persona ↔ `identity_profile`, organización ↔
Account 360, grants por capability) vive en Greenhouse. El IDP solo autentica; no es directorio comercial ni
fuente de autorización.

## Checklist de cierre (los ítems que el operador/abogado deben resolver antes de provisionar)

- [ ] **DPA firmado con el proveedor** con el contenido mínimo: objeto/duración/finalidad, tipos de datos y
      titulares, instrucciones, confidencialidad, medidas de seguridad, régimen de sub-encargados con flow-down,
      asistencia ante derechos ARCO y brechas, devolución/eliminación al término, auditoría.
- [ ] **Lista de subprocesadores del proveedor** obtenida y revisada (para WorkOS: hosting AWS en EEUU;
      confirmar lista vigente) + mecanismo de notificación de cambios de subprocesador.
- [ ] **Región de almacenamiento y tratamiento** confirmada por escrito (WorkOS opera en EEUU; si ofrece
      residencia UE/otra, decidir según cartera). La transferencia CL→EEUU debe apoyarse en el mecanismo del
      régimen chileno vigente (cláusulas contractuales/garantías de la 21.719 al entrar en vigencia) — el stack
      Efeonce ya transfiere a EEUU (GCP, HubSpot, Notion), así que el proveedor **no inaugura** la transferencia
      internacional, pero **sí agrega un encargado nuevo** que debe quedar declarado.
- [ ] **Retención y supresión**: política del proveedor + verificación de que la baja/revocación de una persona
      u organización elimina sus datos del IDP en un plazo definido (API de borrado ejercitada en el canary).
- [ ] **Derechos ARCO+ (acceso, rectificación, supresión, oposición, portabilidad)**: canal definido — el titular
      ejerce ante Efeonce (responsable) y Efeonce instruye al proveedor (encargado). Documentar el flujo y plazos
      por país (CL/CO/MX/PE difieren).
- [ ] **Notificación contractual a clientes**: revisar los MSA/DPA vigentes con cada organización de la primera
      cohorte — si algún contrato exige notificar o autorizar sub-encargados nuevos, notificar ANTES de invitar a
      sus personas. (La cohorte es allowlisted y pequeña: la revisión es contrato por contrato, no masiva.)
- [ ] **Aviso de privacidad**: actualizar la política de privacidad de Efeonce declarando el nuevo encargado y la
      finalidad (autenticación B2B), por jurisdicción (`efeonce-public-site-wordpress` ejecuta).
- [ ] **Plan de brechas**: incorporar al proveedor al plan de respuesta a incidentes (la 21.719 introduce deber de
      notificar brechas; GDPR 72h si aplica).
- [ ] **Validación con abogado habilitado** en Chile (y en CO/MX/PE si la primera cohorte incluye titulares de
      esos países) antes de firmar.

## Comparación de riesgo de privacidad por ruta

| | WorkOS (buy) | Native (build) | Híbrido |
| --- | --- | --- | --- |
| Encargado nuevo | **Sí** — DPA + subprocesadores + notificación contractual | No — datos quedan en el stack GCP existente | Sí, acotado a clientes con SSO propio |
| Transferencia internacional nueva | No (EEUU ya es destino del stack); encargado nuevo sí | No | No/acotada |
| Superficie de brecha | Compartida con proveedor especializado (SOC 2; verificar certificaciones vigentes) | 100% propia — Efeonce responde solo, con la 21.719 plena en dic-2026 | Mixta |
| Carga de cumplimiento | DPA + declaración + ARCO delegado | Toda la seguridad operacional propia (deber de accountability) | Ambas |

**Lectura honesta:** la ruta native evita el trámite de encargado nuevo pero concentra en Efeonce el 100% de la
responsabilidad de seguridad de un servicio de autenticación público justo cuando el régimen chileno estrena
agencia sancionadora. La ruta WorkOS agrega un encargado que exige papeleo (DPA, declaración, notificación
contractual) pero descarga la operación de seguridad en un especialista. Ninguna ruta elimina la obligación de
Efeonce como responsable.

## Hand-off

- Firma/DPA como cláusula → módulo `05` de la skill legal + abogado habilitado.
- Declaración en el sitio → `efeonce-public-site-wordpress`.
- Seguridad/PII runtime → `greenhouse-secret-hygiene` + `arch-architect`.
- La decisión de composición y su costo → ADR §`Slice 0 measurement` (documento técnico enlazado arriba).
