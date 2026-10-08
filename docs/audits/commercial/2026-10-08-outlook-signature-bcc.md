# Outlook de Julio: firma oficial y BCC HubSpot — 2026-10-08

## Resultado

Contrato documental actualizado por mandato explícito del operador. [Canon y decisión](../../operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): firma completa en texto por conector o gráfica oficial por Outlook UI + CCO `48713323@bcc.hubspot.com` para todo envío autorizado desde Outlook de Julio, incluidas respuestas y reenvíos. No habilita envíos autónomos ni modifica Outlook/HubSpot.

## Cobertura

AGENTS, CLAUDE, project_context, manifest de dominios, índice ADR, manuales, índice comercial y agente de seguimiento. Siete pares de skills Codex/Claude (email, HubSpot, copywriting, línea gráfica, agencia, licitaciones y Solutions Partner), commercial-expert de Claude y referencias de voz/firma. Nota de memoria agregada por mandato del operador; no se editaron los registros generados de memoria ni plugins descargados.

## Validación

- `git diff --check` focal: PASS.
- `pnpm skills:mirrors`: PASS.
- Enlaces focales al canon y fuentes de firma: 36 comprobados, 0 faltantes.
- `pnpm qa:gates --changed --agent codex <paths>`: clasificación documental y de integración; advisory, sin implementación de transporte ni prueba de envío.
- `node scripts/check-documentation-closure.mjs -- <paths>`: 0 warnings.
- `pnpm claude-md check`: presupuesto PASS (34.986 tokens estimados); audit global aún señala 1 línea histórica de arquitectura de marca no alcanzable, fuera del delta de esta regla.
- `node scripts/skills/validate-skill-routes.mjs --all`: 48 referencias faltantes fuera de los enlaces nuevos; no certifica verde global. Los enlaces nuevos se verificaron separadamente.
- Gate de contexto estricto: se ajustó la longitud de los punteros propios y se agrupó el delta en la entrada del día; la continuidad de firmas/kit del 29/09 se trasladó literalmente al final de esta auditoría. `pnpm docs:context-check:strict`: PASS final, 0 errores y 0 warnings.

## Límite operativo

En la fase documental inicial no hubo nuevos envíos, cambios de firma en Outlook, reenvío a SKY ni registro retroactivo en HubSpot. La prueba posterior se registra abajo. La preferencia se hace descubrible para futuros agentes; el cumplimiento efectivo exige revisar firma/CCO antes y Enviados después. La ingestión CRM se comprueba por separado. Sin commit ni push.

## Delta posterior: prueba por conector y aprobación de ambas vías

- Se envió por el conector Outlook, desde `jreyes@efeoncepro.com` a `jreysgo@gmail.com`, el correo **Prueba de firma en texto y BCC HubSpot | Efeonce**; copia en Enviados con fecha `2026-10-08T15:05:50Z`.
- Readback de Enviados confirmó remitente, destinatario, cuerpo con firma completa en texto y BCC `48713323@bcc.hubspot.com`. No se verificó de forma independiente entrega al buzón personal ni ingestión en HubSpot.
- El operador respondió «Me sirve, podemos usar las dos vías, la del conector y la otra donde no usas el conector y pones mi firma». Sustituye la restricción inicial de HTML obligatorio: conector con firma en texto y Outlook UI con firma gráfica quedan aprobados; ambas vías conservan BCC obligatorio.
- Validación del delta: skills espejo idénticas, diff sin errores de whitespace y cierre documental focal sin warnings.
- Canon, routers y referencias de skills/manuales se actualizaron para reflejar esta elección sin pedir autorización adicional por el transporte. No se envió otro correo al documentar esta aceptación.

## Continuidad de firma y kit conservada

Entrada trasladada íntegramente desde Handoff.md para respetar su presupuesto; historia del 29/09, no nueva verificación de aquellos pendientes.

**Avatares y firmas del equipo (29/09, noche):** los seis con bomber sobre polo piqué y fondo oscuro con el halo de la órbita (sin anillo); caras medidas con Vision. GCP `gs://efeonce-group-axis-public-media/team/avatars/v1/{1080,800}/`; firmas v3.1 en `…/email-signature/v3.1/people/` y paquetes en OneDrive `Alineación/6. Marca/Kit media/Firmas/`. Repo: `squad/` y `public/images/greenhouse/team/` a 800 px; referencias de identidad en `ai-generations/_identidad-equipo/`. Luis fuera del roster y del dashboard de Efeonce. **Firma, opción C (29/09):** el avatar con órbita mide 130 px (la de área, 106 px), a la altura del bloque de texto; AXIS `v0.3.35` (`e22051d`) publicado y fijado en Greenhouse; 9 firmas, páginas «Copiar mi firma» y zips regenerados (fotos: `firmas/fotos-orbita.mjs`). El operador avisa al equipo que vuelva a copiar. **Fondos de Teams (29/09):** nueve aprobados en la oficina moderna de Efeonce (logo 3D como product placement, órbita sutil, formato `teams` y logo 3D en el catálogo de `foto:prompt`), en OneDrive `Kit media/Fondos de Teams/` y en la página del kit de cada persona; portadas de LinkedIn/YouTube y avatar de redes parqueados (canvas https://claude.ai/artifact/72TN9B5x5NEz34kevCJQn4; el operador pidió portadas por servicio, sin decidir). **Kit del avatar (29/09):** página de descarga por persona en `gs://efeonce-group-axis-public-media/team/kit/` (`kit/paginas-kit.mjs`), carpetas de OneDrive `Kit media/<Nombre>/` con avatar y zip de firma (lo viejo en `Viejo/`) y aviso por TeamBot 1:1 + EO Team. **Pendiente:** congelar el gate visual deck-axis (declarado en BASELINE_DELTAS 2026-09-29 (s); lo congela esta sesión cuando la de Salesforce termine sus láminas; la deriva de Chromium desde `0323fb933` también va ahí) y el LinkedIn de cada firma.
