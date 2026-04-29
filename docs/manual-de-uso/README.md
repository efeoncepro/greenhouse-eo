# Greenhouse EO — Manual de Uso

Esta carpeta guarda guias practicas para usar capacidades concretas del portal Greenhouse.

La diferencia con otras capas de documentacion:

- `docs/architecture/` explica contratos tecnicos, schemas, APIs y decisiones para agentes/desarrolladores.
- `docs/documentation/` explica como funciona un modulo y sus reglas de negocio.
- `docs/manual-de-uso/` explica como usar una capacidad paso a paso en el portal, que permisos necesitas, que no debes tocar y como resolver problemas comunes.

## Indice por categoria

### Finanzas

- [Sugerencias asistidas de conciliacion](finance/sugerencias-asistidas-conciliacion.md) — como generar, revisar, aceptar o descartar sugerencias AI sin alterar saldos automaticamente.
- [Finance Movement Feed](../documentation/finance/finance-movement-feed.md) — contrato reusable para mostrar movimientos financieros sin duplicar tablas, hardcodes de logos ni calculos de saldo en UI.

### Identidad y acceso

_Pendiente._

### Admin Center

_Pendiente._

### HR y Nomina

_Pendiente._

### Agencia y Operaciones

_Pendiente._

### Plataforma

_Pendiente._

## Plantilla recomendada

```md
# [Nombre de la capacidad]

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** YYYY-MM-DD por [agente/persona]
> **Ultima actualizacion:** YYYY-MM-DD por [agente/persona]
> **Modulo:** [dominio/modulo]
> **Ruta en portal:** `/ruta`
> **Documentacion relacionada:** [links]

## Para que sirve

## Antes de empezar

## Paso a paso

## Que significan los estados

## Que no hacer

## Problemas comunes

## Referencias tecnicas
```

## Regla para agentes

Cuando una implementacion agrega o cambia una capacidad visible, el agente debe revisar si existe un manual de uso para esa capacidad.

- Si existe, actualizarlo.
- Si no existe y la capacidad requiere pasos, permisos, decisiones o cuidado operativo para usarla bien, crearlo.
- Si la feature es pequena pero cambia una pantalla ya documentada, agregar un delta corto en el manual existente.

El manual debe quedar orientado al usuario-operador: claro, accionable y sin depender de leer codigo.
