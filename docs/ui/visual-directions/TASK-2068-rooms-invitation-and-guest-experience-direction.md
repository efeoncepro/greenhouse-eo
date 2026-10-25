# TASK-2068 — Una invitación que conduce al trabajo

Fuente de implementación propuesta 2026-10-25, no aceptación visual. Continúa la dirección Rooms existente y la auditoría Product Design de TASK-2059; no cambia identidad ni genera otra plantilla.

## Dirección

La entrada es breve y editorial: marca Rooms reconocible, título claro, código y acción. Un plano navy enmarca papel legible; el acento Growth aparece en la acción. No hero de marketing, fotografía decorativa, onboarding ni panel de métricas para acceder a una propuesta.

La gestión es una lista contextual por sala, con nombres/destinatarios y estados que se pueden leer. El diálogo concentra una sola decisión y muestra sus consecuencias. La edición compartida recupera todo el espacio: pieza dominante cuando existe media, artículo con ancho de lectura cuando el perfil es editorial, radiografía sólo a demanda.

## Reuse y fidelidad

Logo Rooms oficial desde axis-brand-assets sin redibujar; tamaño heredado224/176 sujeto a reflow real. Bricolage editorial/Poppins funcional; colores/espaciado/superficies por adapter de tokens AXIS. Button/Badge/Field/Input/Checkbox/Dialog empaquetados; sin aproximaciones CSS ni copiar controles del Lab.

Fuente durable: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`, `TASK-2059-rooms-first-experience-direction.md` y `docs/ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md`. Las referencias anteriores son evidencia del diseño existente, no aprobación de las pantallas nuevas.

## Targets y jerarquía

Desktop 1440/1024: header claro, área de entrada estrecha y centrada en el campo; gestión amplia en filas, lector ocupa su espacio. Mobile 390/320: columna continua, sin fondos vacíos que empujen el código fuera del teclado visible. Primary action única por estado, secundarios discretos pero accesibles; destructivo nunca se disfraza de CTA principal.

## Copy esencial candidato

- “Entra a la sala.” / “Código de acceso” / “Entrar a la sala”.
- “Ingresa el código de seis dígitos que recibiste junto al enlace.”
- “No pudimos validar este código. Revísalo e inténtalo otra vez.”
- “Este enlace no está disponible. Vuelve al correo de invitación o contacta a quien te invitó.”
- “Tu sesión terminó. Abre nuevamente el enlace de tu invitación.”
- “Invitar a esta sala” / “Enviar invitación” / “Revocar acceso”.
- Delivery: “Preparando envío”, “Envío aceptado”, “No se pudo enviar”. No “Correo entregado” sin receipt que lo pruebe.

Copy final queda en módulo central, con pruebas de error genérico. No presentar nombres/emails antes de autorización ni llamar MFA al mismo canal.

## Visual acceptance

Revisar primer fold OTP+gestión+lector renderizados en in-app browser y compararlos con referencia de marca. Medir contraste/overflow/foco/ratio en4 anchos y200% texto. Dossier/scorecard son técnicos; Julio acepta el resultado visible después de verlo. No reclamar aceptación por aprobar plan, hook, snapshot o tests.
