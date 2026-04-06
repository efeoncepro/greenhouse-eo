> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-05 por Claude (implementacion TASK-263)
> **Ultima actualizacion:** 2026-04-05
> **Documentacion tecnica:** [GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md)

# Sets de permisos — Gobierno de acceso por conjuntos

## ¿Que son los sets de permisos?

Los sets de permisos son conjuntos reutilizables de vistas del portal. En vez de asignar vistas una a una, un administrador puede crear un set (por ejemplo "Gestion Financiera") que incluya todas las vistas del modulo de finanzas, y asignarlo a cualquier usuario con un solo click.

## ¿Como funciona el acceso?

El sistema resuelve que vistas puede ver cada usuario combinando tres capas:

| Capa | Que hace | Ejemplo |
|------|----------|---------|
| **Roles** | Acceso base segun el rol asignado | Un "Analista de Finanzas" ve las vistas de finanzas |
| **Sets de permisos** | Acceso adicional por conjunto | El set "Nomina Completa" agrega vistas de nomina |
| **Ajustes manuales** | Excepciones individuales | Conceder o revocar una vista especifica para un usuario |

Los sets de permisos solo pueden **agregar** vistas. No pueden revocar lo que el rol ya otorga.

## Sets de sistema

Greenhouse incluye 6 sets predefinidos que cubren los modulos principales:

| Set | Seccion | Vistas |
|-----|---------|--------|
| Gestion Financiera | Finanzas | 11 |
| Nomina Completa | Equipo | 3 |
| Agencia Operaciones | Gestion | 5 |
| Solo Lectura Agencia | Gestion | 3 |
| Admin Plataforma | Administracion | 12 |
| Mi Ficha Completa | Mi Ficha | 8 |

Los sets de sistema se pueden editar (agregar o quitar vistas) pero no eliminar.

## Como gestionar sets de permisos

### Crear un set

1. Ir a **Admin Center > Vistas y acceso**
2. Click en el tab **Sets de permisos**
3. Click en **Crear set de permisos**
4. Ingresar nombre, descripcion opcional y seccion
5. Seleccionar las vistas que incluira el set
6. Click en **Crear set de permisos**

### Editar un set

1. En el tab **Sets de permisos**, hacer click en el set que se quiere editar
2. Se abre un panel de detalle a la derecha
3. Modificar nombre, descripcion o las vistas incluidas
4. Click en **Guardar cambios**

### Asignar usuarios a un set

1. Abrir el detalle de un set (click en la card)
2. En la seccion **Usuarios asignados**, click en **Asignar usuarios**
3. Buscar usuarios por nombre o email en el buscador
4. Seleccionar uno o mas usuarios
5. Click en **Asignar usuarios**

### Revocar un usuario de un set

1. Abrir el detalle del set
2. En la lista de usuarios, click en el icono de revocar junto al usuario
3. Confirmar la revocacion en el dialogo

### Eliminar un set (solo sets custom)

1. Abrir el detalle del set
2. Click en **Eliminar set**
3. Confirmar la eliminacion en el dialogo

## Ver los accesos efectivos de un usuario

1. Ir a **Admin Center > Usuarios**
2. Click en un usuario
3. Click en el tab **Accesos**
4. Se muestran 4 secciones:
   - **Roles asignados** — que roles tiene el usuario
   - **Sets de permisos** — que sets tiene asignados
   - **Ajustes manuales** — excepciones individuales (si las hay)
   - **Vistas efectivas** — todas las vistas que puede ver, agrupadas por seccion, con la fuente de cada una

Cada vista muestra de donde viene el acceso:
- **Rol** — acceso otorgado por un rol asignado
- **Rol (por defecto)** — acceso heredado del rol sin configuracion explicita
- **Set de permisos** — acceso otorgado por un set asignado
- **Ajuste manual** — acceso otorgado o revocado individualmente

## Importante

- Los cambios en sets de permisos **requieren que el usuario cierre e inicie sesion de nuevo** para que tomen efecto.
- Cada operacion queda registrada en el log de auditoria.

> Detalle tecnico: [GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md) — tablas, API, resolucion, audit trail
