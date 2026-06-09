# Greenhouse UI Platform — State Management

> Parte de **Greenhouse UI Platform**. Índice + mapa "dónde vive X": [README.md](./README.md).
> Estado **vigente** (spec actual). Historial cronológico (deltas datados): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime; si este doc difiere del código, gana el runtime y este doc se actualiza (modelo 3 capas, ver `design-system-governance`).
> Estado de servidor (React Query) y estado de cliente.

---

## State Management

### Patrón actual

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Server data | Server Components + `async` | Páginas que leen datos (90% del portal) |
| Client interacción | `useState` + `useReducer` | Forms, toggles, modals |
| Sesión | NextAuth JWT | Identity, roles, routeGroups |
| Tema | MUI ThemeProvider | Dark/light mode |
| Toast | `react-toastify` | Feedback transient |
| Operating entity | `OperatingEntityContext` | Tenant switching |

### Patrón recomendado post-activación

| Contexto | Mecanismo | Cuándo |
|----------|-----------|--------|
| Forms complejos | `react-hook-form` | Forms con validación, dirty tracking, error handling |
| Forms simples | `useState` | Toggle, input simple, modal open/close |
| Server data | Server Components | Sin cambio |
| Estado global client | `useState` + Context | Sin cambio (no necesita Redux) |

