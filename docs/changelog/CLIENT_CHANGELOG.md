# CLIENT_CHANGELOG.md

Changelog client-facing de Greenhouse.

Este documento resume cambios visibles para usuarios, stakeholders internos y clientes.
No reemplaza `changelog.md` del repo, que sigue siendo el registro interno técnico-operativo.

## Cómo leer este changelog

- `Canal` indica la madurez de la capacidad (`alpha`, `beta`, `stable`)
- `Disponible para` indica el alcance real (`internal`, `pilot`, `selected_tenants`, `general`)
- el foco está en módulos y capacidades visibles, no en refactors internos
- las versiones de este changelog siguen `CalVer + canal`; `SemVer` queda reservado para APIs o contratos técnicos versionados
- cuando exista Git tag asociado, usar la misma versión base en el namespace correspondiente (`platform/`, `<module>/`, `api/<slug>/`)

## Plantilla recomendada

```md
## 2026.03-beta.1

**Canal:** Beta
**Fecha:** 2026-03-29
**Disponible para:** internal
**Módulos:** Home / Nexa, Admin Center

### Novedades

- ...

### Mejoras

- ...

### Correcciones

- ...

### Notas

- ...
```

---

## 2026.04-beta.1

**Canal:** Beta
**Fecha:** 2026-04-03
**Disponible para:** internal
**Módulos:** Agencia / Delivery

### Novedades

- No aplica como capacidad nueva.

### Mejoras

- `Agency > Delivery` vuelve a mostrar `OTD` y `RpA` del mes en curso con cálculo live real del `ICO Engine`, en vez de depender de snapshots mensuales parciales o de cerrar la vista al último mes disponible.

### Correcciones

- Se corrigió un desvío visible donde algunos Spaces podían aparecer con `OTD` irrealmente bajo al leer un snapshot abierto del mes actual.
- La vista mantiene la semántica operativa de `mes en curso`, pero ahora con métricas reales recalculadas desde la base enriquecida de Delivery.

### Notas

- Si un `RpA` del mes actual sigue sin mostrarse para un Space específico, eso ya responde al dato real disponible en el período en curso y no a una lectura incorrecta del snapshot mensual.

## 2026.03-beta.3

**Canal:** Beta
**Fecha:** 2026-03-31
**Disponible para:** internal
**Módulos:** HRIS / Finanzas / Nómina / Plataforma

### Novedades

- Greenhouse ya tiene una foundation compartida de adjuntos privados para el portal, pensada para reutilizarse entre permisos, órdenes de compra, recibos de nómina y futuros módulos documentales.

### Mejoras

- `Permisos` y `Purchase Orders` ya quedaron preparados para usar un uploader unificado en vez de depender de URLs manuales.
- Los recibos y exportaciones de nómina convergen hacia el mismo contrato privado de archivos.
- `HR > Permisos` ahora deja abrir el respaldo adjunto directamente desde `Revisar solicitud`, sin depender de rutas ocultas o lectura técnica del registro.

### Correcciones

- Se deja explícito que los archivos sensibles no deben circular como links permanentes del bucket, sino bajo acceso autenticado del portal.
- `Permisos` ya no falla al adjuntar respaldos para usuarios internos cuyo contexto tenant llega sin `clientId`/`spaceId` materializados; el ownership del archivo se normaliza correctamente antes de enlazarlo a la solicitud.

### Notas

- La foundation shared ya corre sobre infraestructura dedicada en `staging` y `production`; la adopción visible seguirá avanzando por módulo a medida que cada consumer migre su flujo completo de adjuntos.

## 2026.03-beta.2

**Canal:** Beta
**Fecha:** 2026-03-31
**Disponible para:** internal
**Módulos:** Agencia / Staff Augmentation

### Novedades

- No aplica como capacidad nueva.

### Mejoras

- `Crear placement` en `Agency > Staff Augmentation` vuelve a abrirse como drawer sobre el listado, manteniendo soporte de deep-link para abrir el flujo con `assignmentId`.

### Correcciones

- Se mantiene el carril seguro de apertura después del repair de Postgres y se evita depender de una página-card separada para iniciar el alta.

### Notas

- El flujo conserva búsqueda incremental, lectura contextual del assignment y creación del placement sobre el modelo canónico vigente.
- La experiencia vuelve a ser lateral y contextual dentro de `Agency > Staff Augmentation`.

## 2026.03-beta.1

**Canal:** Beta
**Fecha:** 2026-03-29
**Disponible para:** internal
**Módulos:** Plataforma Greenhouse, Payroll, Home / Nexa, Admin Center, HRIS

### Novedades

- Greenhouse formalizó un esquema de releases por módulo con canales `alpha`, `beta` y `stable`.

### Mejoras

- Se definió un changelog client-facing separado del changelog técnico interno.
- Se fijó una convención de tags para plataforma, módulos y APIs.

### Correcciones

- No aplica como release funcional de producto; esta entrada actúa como baseline operativa inicial del esquema de versionado.

### Notas

- Estado inicial sugerido por módulo:
  - `Payroll official` = `2026.03` (`stable`)
  - `Projected Payroll` = `2026.03-beta.1`
  - `Home / Nexa` = `2026.03-beta.1`
  - `Admin Center` = `2026.03-beta.1`
  - `HRIS` = `2026.03-alpha.1`
- Los tags reales deben salir desde un commit limpio; esta entrada no implica que todos los tags ya hayan sido creados en Git.

## Bootstrap

Esta primera entrada funciona como baseline inicial del sistema de releases.

Cuando un módulo o feature visible cambie de canal o tenga un lote de cambios que merezca comunicación externa, agregar una nueva entrada arriba siguiendo la plantilla.
