# Mi Perfil — Vista personal del colaborador

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-06 por Claude (TASK-272)
> **Ultima actualizacion:** 2026-04-06 por Claude (TASK-272)
> **Documentacion tecnica:** docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md

---

## Que es Mi Perfil

Mi Perfil es la vista personal de cada colaborador en el portal Greenhouse. Permite ver la propia informacion laboral, equipos, proyectos y colegas en un solo lugar. Se accede desde `/my/profile` en el menu lateral del portal.

Es una vista de solo lectura: el usuario puede consultar su informacion pero no editarla directamente desde esta pantalla.

## Header visual

Al entrar a Mi Perfil, lo primero que se ve es un banner con degradado de color y el avatar del usuario. Debajo del avatar se muestra:

- **Nombre completo** del colaborador
- **Cargo** actual
- **Departamento** al que pertenece
- **Fecha de ingreso** a la organizacion
- **Badges** con informacion clave (tipo de jornada, equipo, etc.)

## Pestanas disponibles

Mi Perfil se organiza en 5 pestanas:

### Perfil

La pestana principal muestra:

- **Sobre mi**: datos personales como nombre, RUT, nacionalidad y otros campos del perfil de identidad
- **Contacto**: email, telefono y datos de contacto registrados
- **Actividad reciente**: una linea de tiempo con las solicitudes de permisos del colaborador (aprobadas, pendientes o rechazadas)
- **Equipos**: los espacios o clientes a los que el usuario esta asignado, con tarjetas visuales
- **Colegas**: otros miembros del mismo departamento u organizacion

### Equipos

Muestra en detalle los espacios y clientes donde el colaborador tiene asignaciones activas. Cada espacio se presenta como una tarjeta con el nombre del cliente y el rol del colaborador en ese espacio.

### Proyectos

Lista los proyectos en los que participa el colaborador. Se presenta como una tabla con busqueda (se puede escribir para filtrar). Cada proyecto muestra nombre, estado, progreso y otros detalles relevantes.

### Colegas

Muestra los miembros de la misma organizacion o departamento. Permite ver quienes son los companeros de equipo, sus cargos y datos de contacto basicos.

### Seguridad

Configuracion de seguridad de la cuenta (pendiente de implementar). En el futuro incluira opciones como cambio de contrasena y verificacion en dos pasos.

## De donde vienen los datos

Mi Perfil consulta 4 fuentes de datos del portal en paralelo para cargar toda la informacion:

| Fuente | Que datos trae |
|--------|---------------|
| Perfil personal (`/api/my/profile`) | Nombre, cargo, departamento, fecha de ingreso, datos de contacto, informacion de identidad |
| Asignaciones (`/api/my/assignments`) | Espacios y clientes donde el colaborador esta asignado activamente |
| Permisos (`/api/my/leave`) | Solicitudes de permisos y licencias (usadas para la linea de tiempo de actividad) |
| Miembros de la organizacion (`/api/my/organization/members`) | Colegas del mismo departamento u organizacion |

Todos los datos se cargan al mismo tiempo para que la vista se muestre lo mas rapido posible.

> **Detalle tecnico:** La vista se implementa en `src/views/greenhouse/my/my-profile/MyProfileView.tsx` usando el patron de user-profile de Vuexy con 9 componentes adaptados. La capa de transformacion mapea las respuestas de las APIs a props compatibles con los componentes visuales. Ver spec completa en `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (Delta 2026-04-06).
