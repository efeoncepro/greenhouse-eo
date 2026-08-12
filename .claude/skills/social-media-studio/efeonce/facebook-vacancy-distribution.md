# Difusión de vacantes de Efeonce en grupos de Facebook

Usa este companion para distribuir una vacante ya publicada en Greenhouse a grupos de Facebook. Compone `social-media-studio` con `greenhouse-talent-people-operator`; no reemplaza el dominio Hiring ni sus comandos.

## Precondiciones

1. El opening ya está publicado por el flujo canónico de Hiring y se verificaron su detalle y apply URL públicos.
2. El copy es candidato-facing, aprobado y consistente con los datos públicos del opening. No reveles presupuesto, rate bands, notas internas ni datos de candidatos.
3. El operador confirmó explícitamente el lote de publicaciones.
4. Solo usa grupos a los que el operador ya pertenece, salvo autorización explícita para unirse a otros. Lee y respeta las reglas del grupo.

## Ejecución y evidencia

1. Prioriza grupos afines al rol y alterna audiencias para reducir repetición; no publiques el mismo opening dos veces en un grupo.
2. Publica un rol por acción y espera el resultado antes de navegar. Clasifica cada destino como `visible`, `enviada a aprobación`, `sin editor` o `no verificable`.
3. Si una interfaz deja el estado ambiguo, verifica el texto exacto de la oferta en el grupo antes de reintentar. Un timeout nunca prueba que el envío falló.
4. No marques una publicación enviada a aprobación como visible. Revalida después con la sesión autenticada del operador.
5. Adjunta imágenes solo si el mecanismo de carga funciona. No eludas el selector de archivos ni fuerces una carga; si se decide publicar sin imagen, requiere autorización expresa y se registra en el cierre.
6. Conserva un registro fechado con opening, URL de postulación, texto aprobado, grupos, estado observado, assets usados/no usados y cualquier moderación pendiente. Usa `docs/operations/hiring/` para campañas internas de Efeonce.

## Límites

- La publicación de vacantes en Facebook es distribución externa de un opening; no crea, actualiza ni publica el opening en Greenhouse. Para eso usa `greenhouse-talent-people-operator` y el manual `docs/manual-de-uso/hr/operar-careers-publicas.md`.
- No envíes DMs masivos, invitaciones ni te unas a grupos sin una autorización separada.
- La confirmación humana es obligatoria antes de publicar, incluso si el copy ya fue aprobado.

Referencia de una ejecución real: `docs/operations/hiring/2026-08-11-facebook-vacancy-distribution.md`.
