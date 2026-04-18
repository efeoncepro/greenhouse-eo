# Modulo de Objetivos y OKRs

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-16 por Claude
> **Ultima actualizacion:** 2026-04-16 por Claude
> **Documentacion tecnica:** `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` §4.4

## Que es

El modulo de objetivos y OKRs permite definir ciclos de objetivos (trimestrales, semestrales o anuales), crear goals con key results medibles, y dar seguimiento al progreso de cada colaborador. Es la herramienta formal para declarar que se propone lograr cada persona, equipo y la empresa en un periodo determinado.

Antes de este modulo, las metas se discutian verbalmente y no habia seguimiento estructurado. Ahora cada objetivo queda registrado, con indicadores claros y progreso visible para el colaborador, su supervisor y HR.

## Roles y permisos

| Rol | Que puede hacer |
|-----|----------------|
| HR / Admin | Crear y administrar ciclos, crear goals de empresa, ver seguimiento global de todos los colaboradores |
| Colaborador | Ver sus objetivos personales, registrar avance en key results, ver goals de su departamento y empresa como contexto |
| Supervisor | Ver los goals de su equipo directo y registrar avance en nombre de sus reportes |

## Ciclos de objetivos

Un ciclo define el periodo durante el cual se trabajan los objetivos. Puede ser trimestral, semestral o anual.

Cada ciclo pasa por un lifecycle de 4 estados:

| Estado | Significado |
|--------|-------------|
| Borrador | HR esta configurando el ciclo. Los colaboradores aun no lo ven |
| Activo | El ciclo esta vigente. Los colaboradores pueden ver sus goals y registrar avance |
| En revision | El periodo termino y HR esta evaluando resultados. No se acepta nuevo avance |
| Cerrado | Evaluacion completa. El ciclo queda como historico |

Solo HR o Admin pueden mover un ciclo entre estados.

## Estructura en cascada

Los objetivos se organizan en tres niveles que dan contexto de arriba hacia abajo:

```
Empresa    "Aumentar retencion de clientes al 95%"
  |
  +-- Departamento (Design)    "Reducir RpA promedio a <1.5"
  |     |
  |     +-- Individual (Melkin)     "Entregar 100% de piezas con FTR en Q2"
  |     +-- Individual (Andres)     "Reducir cycle time promedio a <48h"
  |
  +-- Departamento (Account)   "NPS score >= 85 en todos los clientes"
        |
        +-- Individual (Valentina)  "Implementar check-in mensual con 3 clientes top"
```

- Los goals de empresa dan la direccion estrategica general
- Los goals de departamento traducen esa direccion a objetivos del area
- Los goals individuales son lo que cada persona se compromete a lograr

Un colaborador siempre puede ver los goals de su departamento y de la empresa para entender como su trabajo se conecta con el objetivo mayor.

## Key Results

Cada goal puede tener uno o mas key results: indicadores medibles con un valor objetivo (target) y un valor actual que se actualiza conforme avanza el trabajo.

Ejemplo:

| Key Result | Target | Actual | Progreso |
|------------|--------|--------|----------|
| Cycle time de diseno menor a 36h | 36 | 42 | 50% |
| Cycle time de contenido menor a 24h | 24 | 28 | 80% |
| Zero tasks atascadas mas de 72h | 0 | 1 | 66% |

El progreso del goal se calcula automaticamente como el promedio de sus key results. Si un goal no tiene key results definidos, el progreso se registra directamente.

## Elegibilidad por tipo de contrato

No todos los tipos de contrato tienen el mismo nivel de acceso al modulo:

| Tipo de contrato | Acceso |
|------------------|--------|
| Indefinido | Completo: crear goals, registrar avance, ver todo |
| Plazo fijo | Completo si lleva mas de 3 meses en la empresa |
| EOR | Completo |
| Contractor | Solo lectura de goals de departamento y empresa, si lleva mas de 6 meses |
| Honorarios | Sin acceso al modulo |

## Superficies del portal

### /my/goals — Mis objetivos (self-service)

Vista personal del colaborador. Muestra:

- Selector de ciclo activo (ej: "Q2 2026")
- Resumen: cantidad de objetivos y promedio de avance
- Card por cada goal personal con sus key results y barra de progreso
- Boton "Registrar avance" que abre un formulario para actualizar valores de cada key result
- Seccion de contexto: goals del departamento y de la empresa

### /hr/goals — Objetivos (admin)

Vista administrativa con tres tabs:

| Tab | Que muestra |
|-----|-------------|
| Ciclos | Lista de ciclos con estado, fechas y cantidad de goals. Click para ver detalle |
| Seguimiento | Tabla con todos los colaboradores, sus goals y progreso promedio. Filtros por departamento y estado. Heatmap de colores: verde (80%+), amarillo (50-79%), rojo (menos de 50%) |
| Empresa | Arbol de goals en cascada (empresa, departamento, individual). Permite crear goals rapidamente |

## Complementariedad con el ICO Engine

Goals y ICO miden cosas distintas y no se solapan:

| | Goals | ICO |
|-|-------|-----|
| Que mide | Intencion estrategica: que se propone lograr | Delivery operativo: que esta entregando |
| Quien lo define | HR, supervisores y el propio colaborador | Se calcula automaticamente desde la operacion |
| Frecuencia | Por ciclo (trimestre, semestre, ano) | Materializado diariamente |
| Ejemplo | "Reducir cycle time a menos de 48h" | RpA actual: 1.2, OTD: 87% |

El modulo de evaluaciones de desempeno (futuro) es donde convergen ambos: combina el cumplimiento de goals con las metricas ICO para una vision completa.

---

> Detalle tecnico: `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` §4.4, §7.2
> Codigo fuente: `src/lib/hr-goals/`, `src/app/api/hr/goals/`, `src/views/greenhouse/hr-goals/`
