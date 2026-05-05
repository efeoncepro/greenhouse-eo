# Accesos Rapidos — Atajos del header personalizables por usuario

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-04 por agente (TASK-553)
> **Ultima actualizacion:** 2026-05-04
> **Documentacion tecnica:** [GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md) (Delta 2026-05-04)

---

## Que es esta capacidad

El boton con la grilla `+` arriba a la derecha del portal es **Accesos rapidos**. Es un panel desplegable que muestra los modulos a los que entras mas seguido y te deja agregar atajos personalizados a la barra para tenerlos a un click.

Antes de esta task, ese panel era una decoracion: mostraba 6 atajos hardcodeados iguales para todos, el boton `+` no hacia nada, y los atajos no se sincronizaban con los permisos reales del usuario. Si un cliente externo entraba al portal, igual le aparecian "Usuarios", "Roles", "Configuracion del sistema" — accesos que nunca podria abrir.

Ahora el panel es real:

- los atajos que ves dependen de tu rol y tus permisos vigentes;
- los recomendados se eligen por audiencia (admin ve admin primero, finance ve finance primero, cliente externo ve solo "Proyectos");
- podes agregar y quitar tus propios atajos con el boton `+`;
- lo que pineas se guarda y persiste entre sesiones.

---

## Las tres capas

| Capa | Que es | Cuando aparece |
|------|--------|----------------|
| **Recomendados** | Atajos sugeridos automaticamente segun tu audiencia (admin / finance / hr / colaborador / cliente). | Cuando todavia no pineaste nada propio. |
| **Disponibles** | Catalogo completo de atajos a los que tu usuario tiene acceso real (filtrados por modulo, vista autorizada y capability). | Detras del boton `+` para que elijas que pinear. |
| **Pineados** | Tus atajos personalizados. Persisten en la base de datos. | Cuando ya elegiste por lo menos uno. Aparecen primero. |

El motor de seleccion combina dos planos del modelo de acceso de Greenhouse:

- **Vista** (`authorizedViews`) — la superficie visible que tu cuenta puede abrir.
- **Entitlement** (`capability + action + scope`) — la autorizacion fina sobre el motor de capabilities.

Si pierdes acceso a un modulo (te cambian el rol, te quitan permisos), los atajos a ese modulo dejan de aparecer aunque sigan pineados en la base de datos. Cuando recuperas acceso, vuelven solos. No hay limpieza manual necesaria.

> Detalle tecnico: catalogo en [src/lib/shortcuts/catalog.ts](../../../src/lib/shortcuts/catalog.ts), resolver en [src/lib/shortcuts/resolver.ts](../../../src/lib/shortcuts/resolver.ts).

---

## Como se usa

### Abrir el panel

Click en el boton de grilla con `+` (`tabler-layout-grid-add`) arriba a la derecha. Aparece un popover con tus atajos.

### Pinear un acceso nuevo

1. Abre el panel.
2. Click en el `+` arriba a la derecha del popover.
3. Elige cualquier acceso de la lista. Solo aparecen los que tu cuenta puede abrir y que todavia no pineaste.
4. El popover vuelve a la vista principal con tu nuevo atajo agregado.

Si el `+` esta deshabilitado, ya pineaste todos los atajos disponibles para tu cuenta.

### Quitar un acceso pineado

1. Abre el panel.
2. Apoya el cursor sobre el atajo que quieres quitar.
3. Aparece una `×` arriba a la derecha del tile. Click ahi.

El atajo desaparece. La accion es reversible: podes volver a pinearlo desde el `+`.

### Sincronizacion con Home

Los atajos recomendados que se muestran en la pagina de inicio (Home) salen del **mismo motor** que el header. Cuando entras a Greenhouse, los atajos sugeridos en Home y en el header van a coincidir si todavia no pineaste nada propio. Si ya pineaste, el header muestra tus pineados; Home sigue mostrando recomendados.

---

## Quien ve que

| Audiencia | Atajos recomendados (top 4) |
|-----------|------------------------------|
| Admin (efeonce_admin) | Administracion, Agency, Finanzas, Personas |
| Internal (operations / account) | Agency, Personas, Finanzas, Nomina |
| HR (hr_payroll) | Nomina, Permisos, Personas, Mi espacio |
| Finance (finance_admin / analyst) | Finanzas, Banco, Por pagar, Ventas |
| Collaborator | Mi espacio, Personas, Nomina |
| Client (cliente externo) | Proyectos |

Los atajos recomendados son los primeros 4 visibles. El catalogo completo tiene 13 atajos; el resto aparece en el `+` para pinear opcionalmente.

---

## Que pasa cuando algo se rompe

| Sintoma | Causa probable | Que ves |
|---------|----------------|---------|
| Loading que no termina | Backend caido o lento | Spinner + "Cargando accesos..." |
| Error al cargar | API devolvio error | "No pudimos cargar tus accesos. Intenta de nuevo." con boton de reintento |
| Lista vacia | Usuario sin permisos a ningun modulo | "Agrega accesos con +" (si hay disponibles) o el `+` deshabilitado |

Cuando el panel falla, el resto del portal sigue funcionando. El header completo (search, modo claro/oscuro, notificaciones, perfil) es independiente del componente de accesos.

---

## Reliability signal

Hay un signal canonico que detecta drift en el catalogo:

- **`home.shortcuts.invalid_pins`** (kind: drift, severity: warning si > 0).

Se activa cuando un usuario tiene pineado un atajo cuya `shortcut_key` ya no existe en el catalogo TypeScript (porque alguien retiro la entry). La interfaz no se rompe — el reader del API filtra esos atajos automaticamente — pero el signal le avisa a operations que hay que revisar.

> Detalle tecnico: [src/lib/reliability/queries/shortcuts-invalid-pins.ts](../../../src/lib/reliability/queries/shortcuts-invalid-pins.ts).

---

## Como se extiende

Para registrar un atajo nuevo (ej. agregar uno a `/agency/launch`):

1. Editar [src/lib/shortcuts/catalog.ts](../../../src/lib/shortcuts/catalog.ts) — agregar una nueva entry de `CanonicalShortcut`.
2. Si la nueva entry es relevante para una audiencia especifica, ajustar `AUDIENCE_SHORTCUT_ORDER` para posicionarla.
3. Si necesita gate fino, declarar `viewCode` y/o `requiredCapability` opcionales.

No hay que tocar componentes UI ni endpoints. La proxima vez que el usuario abra el panel, el atajo nuevo aparece en `Disponibles`.

> Regla canonica de la plataforma: los atajos nunca se hardcodean en `NavbarContent` ni en ningun layout. La fuente unica es el catalogo. Drift detectado por code review y por la lint rule `greenhouse/no-untokenized-copy`.

---

## Privacidad y multi-tenant

Los atajos pineados se guardan por `user_id`, no por tenant. Si la cuenta cambia de espacio (caso multi-tenant), los pineados siguen iguales — el motor revalida acceso al render y omite los que ya no aplican.

Cuando una cuenta se da de baja, sus atajos pineados se borran automaticamente por `ON DELETE CASCADE` desde `client_users`.

> Detalle tecnico: tabla [greenhouse_core.user_shortcut_pins](../../../migrations/20260505001826707_task-553-user-shortcut-pins.sql).
