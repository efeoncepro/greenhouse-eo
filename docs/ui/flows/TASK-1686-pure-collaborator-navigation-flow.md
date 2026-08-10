# TASK-1686 — Navegación de colaborador puro Flow Contract

## Context

- Owner: TASK-1686.
- Audience: routeGroups=['my'], sin grupo interno operativo ni client.
- Entry: /my.
- No-goals: autorización, módulos, URLs, dashboard y chrome interno/cliente.

## Surface contract

| Superficie | Propósito | Salida collaborator |
| --- | --- | --- |
| Rail / drawer | índice trabajo | /my + buildMyNavItems + recursos plataforma |
| Avatar | identidad/cuenta mínima | identidad, Mi Perfil y salir |
| Page guard | autorización | sin cambio |

## Flow

sesión collaborator → /my → rail → hoja /my/* permitida

sesión collaborator → avatar → Mi Perfil → /my/profile

avatar → Escape/click-away → foco trigger

avatar → Salir → signOut existente

## Audience branch

isPureCollaborator ? rail/avatar personal : isInternalPortalUser ? TASK-1388 : cliente TASK-1675

El predicado sólo elige JSX; no se usa como guard ni cambia claims.

## Accessibility and recovery

- Trigger avatar: nombre, aria-haspopup=menu, aria-expanded, aria-controls, Enter/Espacio.
- Rail conserva ring/scroll label/toggle TASK-1388.
- Sin profileHref: identidad + salir, sin enlace roto.
- Flags personales omiten sólo hoja dependiente.
- URL cliente directa conserva guard actual, fuera de scope.
- Reduced motion llega mismo estado final.

## GVC sequence

1. Collaborator real carga /my; rail home/Mi Ficha y no client.
2. Tab/focus; avatar perfil/salida y no shortcuts client.
3. Escape/click-away restaura foco.
4. CmdK encuentra my autorizado y excluye client.
5. Drawer 390 conserva lista/no desborda.
6. Tests control preservan client/internal/hybrid.

## Decision log

Rail y avatar son complementarios: trabajo completo versus identidad compacta. No se crea flow client ni policy access.
