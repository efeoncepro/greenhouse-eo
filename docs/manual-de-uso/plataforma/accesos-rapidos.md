# Manual de uso — Accesos Rapidos del header

> **Tipo:** Manual de uso (paso a paso)
> **Version:** 1.0
> **Creado:** 2026-05-04 por agente (TASK-553)
> **Documento funcional:** [accesos-rapidos.md](../../documentation/plataforma/accesos-rapidos.md)

---

## Para que sirve

Llegar en un click a las pantallas que mas usas, sin pasar por el menu lateral. Si haces nomina todos los meses, podes pinear "Permisos" y "Por pagar" y tenerlos siempre arriba a mano. Si entras a un modulo distinto cada semana, los recomendados ya te los pone Greenhouse segun tu rol.

---

## Antes de empezar

- Tu cuenta tiene que estar autenticada.
- Los atajos que ves son los que tu cuenta puede abrir. Si te falta uno, es porque tu rol o tus permisos no lo incluyen — habla con un admin.
- Lo que pineas se guarda solo para vos, no afecta a nadie mas del equipo.

---

## Paso a paso

### Abrir el panel

1. Mira la barra superior del portal.
2. Identifica el icono con una grilla y un `+` (al lado de la campanita de notificaciones).
3. Click. Aparece un popover con la lista de tus accesos.

### Agregar un acceso

1. Con el panel abierto, click en el `+` arriba a la derecha del popover.
2. Aparece la lista de "Disponibles" — todos los accesos que podes pinear.
3. Click en el que quieres. El acceso se agrega a tus pineados y vuelves a la vista principal.

### Quitar un acceso

1. Con el panel abierto, apoya el cursor sobre el tile del acceso que quieres quitar.
2. Aparece una `×` chiquita arriba a la derecha del tile.
3. Click en la `×`. El acceso desaparece.

### Reordenar tus accesos

Hoy se reordenan en el orden en que los pineaste. Para cambiar el orden:

1. Quita el atajo (paso anterior).
2. Vuelve a agregarlo.

(El reordenamiento drag-and-drop esta en el roadmap pero no esta disponible aun.)

---

## Que significan los estados

| Que ves | Que significa |
|---------|----------------|
| Spinner + "Cargando accesos..." | Greenhouse esta consultando tus permisos al servidor. Espera 1-2 segundos. |
| 4 atajos con tile gris debajo de cada uno | Recomendados — todavia no pineaste nada propio. |
| Atajos con `×` al pasar el cursor | Pineados — esos son tus atajos guardados. Podes quitarlos. |
| `+` deshabilitado | Ya pineaste todo lo que tu cuenta puede pinear. No hay mas accesos disponibles. |
| "Agrega accesos con +" | Tu lista de pineados quedo vacia. El recomendado funciona como respaldo. |
| "No pudimos cargar tus accesos" | El portal no pudo conectarse al backend. Click "Intentar de nuevo". |

---

## Que NO hacer

- **No pinees todo lo que veas** — pinear 13 atajos no te ahorra clicks, te llena la pantalla. Pinea 4 a 6, los que de verdad uses cada dia.
- **No reportes "este acceso no me aparece" sin verificar permisos** — si no aparece, casi seguro tu cuenta no lo tiene autorizado. Habla con tu admin antes de abrir un ticket.
- **No edites el catalogo TypeScript directamente** — agregar atajos es una tarea de desarrollo (TASK-553 + extender [src/lib/shortcuts/catalog.ts](../../../src/lib/shortcuts/catalog.ts)).

---

## Problemas comunes

### "El boton + esta deshabilitado"

Causa: ya pineaste todos los atajos que tu cuenta puede pinear.
Que hacer: revisa la lista de pineados y quita los que ya no usas.

### "Veo accesos diferentes en mi laptop y en el celular"

No deberia pasar — los pineados se guardan por usuario, no por dispositivo. Si pasa, recarga la pagina (Ctrl+R o Cmd+R) en el dispositivo que muestra menos.

### "Pineo un acceso y desaparece al refrescar"

Causa: el navegador esta bloqueando cookies o el backend rechazo la sesion.
Que hacer: verifica que estas logueado (refresh la pagina), si persiste contacta al admin.

### "Veo un atajo viejo que ya no quiero"

Causa: pineaste algo en algun momento y se quedo.
Que hacer: hover sobre el tile, click en la `×`. Listo.

---

## Referencias tecnicas

- Documento funcional: [accesos-rapidos.md](../../documentation/plataforma/accesos-rapidos.md)
- Spec arquitectura: [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md) (Delta 2026-05-04)
- Codigo base: [src/lib/shortcuts/](../../../src/lib/shortcuts/), [src/components/layout/shared/ShortcutsDropdown.tsx](../../../src/components/layout/shared/ShortcutsDropdown.tsx)
- API canonica: `GET /api/me/shortcuts`, `POST /api/me/shortcuts`, `DELETE /api/me/shortcuts/[shortcutKey]`, `PUT /api/me/shortcuts/order`
- Migracion PG: [migrations/20260505001826707_task-553-user-shortcut-pins.sql](../../../migrations/20260505001826707_task-553-user-shortcut-pins.sql)
