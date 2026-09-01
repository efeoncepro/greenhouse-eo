# Performance Report Agosto 2026 — evidencia TeamBot

> Fecha: 2026-09-01
> Alcance: anuncio grupal `EO Team` + follow-ups personales 1:1
> Estado: ejecutado y aceptado por Bot Framework; sin afirmación de lectura

## Fuente y aprobación

- Informe entregado por el operador: `Performance Report — Agosto 2026` en Notion.
- El contenido grupal y los cuatro textos personales fueron revisados por el operador antes del envío.
- Corrección explícita incorporada: el volumen de Andrés no se interpreta como sobrecarga; la oportunidad se centra en FTR y cierre de revisión.

## Anuncio grupal

- Destino: `EO Team` (`chat_group`).
- Contenido: seis bloques, voz Nexa, cuatro lecturas personales y CTA `Abrir informe`.
- Fingerprint: `b95d88a98987f29403adf008`.
- Audit run: `teams-manual-2480f293-120f-4b72-9e5b-190b9b148fed` (`succeeded`).
- Message ID: `1788264933031`.
- Readback: Daniela, Andrés, Melkin y Valentina aparecen como menciones `aadUser` con sus Object IDs esperados.

## Follow-ups 1:1

Cada destinatario fue revalidado en Microsoft Entra con `accountEnabled=true`. El dry-run confirmó cero duplicados para `manual-performance-feedback:2026-08:<member>:v1`; el envío real usó cards sin mención y sin `activity.text`, con CTA al mismo informe.

| Persona | Audit run | Message ID | Outcome |
| --- | --- | --- | --- |
| Daniela Ferreira | `teams-manual-4494af33-0e0c-411c-8485-5ef5e925b0c8` | `1788265256147` | `succeeded` |
| Andrés Carlosama | `teams-manual-e5050a56-882b-4ea2-89fc-0d9a9d8e37a2` | `1788265257724` | `succeeded` |
| Melkin Hernández | `teams-manual-1f5c722d-e4b3-4370-8f8c-ef78e8f594d8` | `1788265259174` | `succeeded` |
| Valentina Hoyos | `teams-manual-fb69126c-512f-4232-8461-730253b91610` | `1788265261594` | `succeeded` |

## Identidad y hallazgos operativos

- `valenta.hoyos@efeonce.org` no resolvió en Entra. La cuenta activa observada fue `valentina.hoyos@efeonce.org`; el envío usó su Object ID revalidado.
- La lista previa de miembros de `EO Team` no mostró a Valentina, pero el readback del mensaje publicado sí devolvió su mención como `aadUser`. La membresía previa es una señal auxiliar; el mensaje publicado es la evidencia de reconocimiento de la mención.
- `succeeded` demuestra aceptación del transporte y persistencia de auditoría. No demuestra que el card se haya leído.

## Contrato promovido

- No inferir sobrecarga desde volumen sin contexto confirmado.
- Separar atrasos heredados de tiempo propio de ejecución.
- Tratar onboarding con muestra pequeña como línea base.
- Mantener aprobación, revalidación Entra, dry-run, dedupe, source object determinístico y audit independiente por destinatario.
- Los follow-ups recurrentes deben converger a Notification Hub; este caso no convierte el script temporal en una API permanente.
