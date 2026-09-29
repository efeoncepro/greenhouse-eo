# Piezas

Aquí trabaja el equipo. Cada pieza es una carpeta `projects/<cliente>/<slug>/` con:

| Archivo | Qué es |
|---|---|
| `pieza.json` | Ficha de la pieza: formato, responsable, estado, aprobación y entregables |
| `brief.md` | El encargo: objetivo, audiencia, mensaje, restricciones y referencias |
| `prompts/` | Prompts y fichas que usaste (texto, sí entra a git) |
| `salidas/` | Lo que produjiste. **No entra a git**: se sube con `pnpm pieza:subir` |
| `referencias-locales/` | Material del cliente que no es canon. No entra a git |

Crea una pieza con `pnpm pieza:nueva <cliente> <slug>`. La plantilla está en `_plantilla/` (gestionada).
