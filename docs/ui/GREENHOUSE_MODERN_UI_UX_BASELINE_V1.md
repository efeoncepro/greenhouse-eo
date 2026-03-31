# Greenhouse Modern UI/UX Baseline V1

## Objetivo

Actualizar el criterio operativo de UI, UX writing y accessibility para Greenhouse con una base mas moderna que la lectura historica de Vuexy.

Este documento no reemplaza:
- `GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
- `GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`

Los complementa con reglas de calidad mas actuales para:
- jerarquia visual
- estados y feedback
- formularios
- microcopy
- accesibilidad

## Problema que corrige

Greenhouse ya no puede evaluar calidad UI solo por:
- "se parece a Vuexy"
- "entra en MUI"
- "la card se ve bonita"

Eso produce pantallas:
- demasiado planas
- con demasiadas cards de igual peso
- con copy generica
- con estados debiles
- con accesibilidad tratada como parche final

## Principios modernos para Greenhouse

### 1. First fold con una lectura dominante

La primera pantalla debe responder en segundos:
- que es esta vista
- que decision soporta
- cual es la signal dominante
- que accion sigue

Aplicacion Greenhouse:
- dashboards: una narrativa principal y 2 a 4 supporting signals
- detail/admin: summary breve arriba, drilldown despues
- settings/forms: objetivo, consecuencia y CTA principal visibles sin scroll largo

### 2. Menos igualdad visual, mas ritmo

Las superficies no deben apilar cards de igual tamano e igual contraste sin prioridad.

Preferir:
- 1 bloque dominante
- 2 a 4 bloques secundarios
- listas o tablas solo cuando el usuario necesite comparar o actuar

Evitar:
- mosaicos uniformes sin orden de lectura
- KPIs sin jerarquia ni contexto
- tablas pesadas cuando un roster o executive list basta

### 3. Layout adaptativo por tarea, no por capricho

La misma informacion no debe forzarse siempre a cards.

Patrones preferidos:
- list-detail para entidades con drilldown
- summary + table para governance
- hero + trend + risk list para executive summary
- form sections cortas con ayuda contextual para settings o flujos operativos

### 4. Estados como parte del producto

Toda surface debe contemplar:
- loading
- empty
- partial
- warning
- error
- success o confirmation cuando aplique

Regla:
- el estado vacio debe orientar la siguiente accion
- el warning debe explicar impacto
- el error debe decir que paso y que hacer ahora

### 5. Microcopy operacional, no marketing vacio

La copy UX de Greenhouse debe ser:
- clara
- breve
- accionable
- honesta sobre la calidad de la data

Preferir:
- botones con verbo especifico
- titulos que nombren la tarea
- helper text que prevenga errores
- errores con causa y siguiente paso

Evitar:
- slogans donde el usuario necesita instrucciones
- CTAs ambiguos como "Continuar" o "Enviar" si no explican la accion real
- empty states motivacionales pero no utiles

### 6. Accesibilidad desde el patron, no al cierre

Cada propuesta UI debe revisar al menos:
- estructura semantica y headings
- labels claros
- foco visible
- contraste suficiente
- target interactivo razonable
- uso no exclusivo del color para estado
- tablas y charts con texto de apoyo cuando la lectura visual sola no alcanza

## Aplicacion por tipo de superficie

### Dashboard ejecutivo

Debe priorizar:
- narrativa dominante
- lectura de salud en pocos bloques
- trends cortos
- listas de riesgo o atencion

No debe parecer:
- un collage de analytics generico
- un CRM demo reskineado

### Superficie admin o governance

Debe priorizar:
- filtros claros
- summary strip corto
- tabla o list-detail con acciones bien ubicadas
- provenance visible cuando la data viene de sync, override o seed

### Detail pages

Debe priorizar:
- identidad del objeto
- estado
- relaciones clave
- historial o actividad solo si agrega decision support

### Formularios y settings

Debe priorizar:
- una pregunta por bloque cuando sea posible
- labels explicitos
- ayuda antes del error
- validacion cerca del campo
- CTA principal claro y consecuencia entendible

## Reglas de UX writing

### Titulos
- nombran la tarea o el objeto
- no intentan ser slogan

### Subtitulos
- explican contexto o consecuencia
- maximo 1 idea principal

### Botones
- verbo + objeto si hace falta claridad
- evitar botones gemelos con peso visual identico

### Empty states
- explicar que falta
- explicar por que importa
- ofrecer accion o siguiente paso

### Errores
- decir que paso
- decir que puede hacer el usuario
- evitar culpar al usuario sin evidencia

### Estado parcial
- explicitar que parte esta disponible y que parte no
- no vender completitud cuando la data es `seeded`, `partial` o `override`

## Reglas minimas de accessibility

### Semantica
- una jerarquia de headings clara
- tablas reales para datos tabulares
- labels asociados a inputs

### Interaccion
- foco visible en keyboard navigation
- target interactivo suficiente
- no esconder affordances solo en hover

### Percepcion
- contraste suficiente para texto y controles
- iconos o color complementados con texto o tooltip
- motion util y reducible; no animacion por decoracion solamente

### Comprension
- instrucciones cerca de la tarea
- errores cerca del campo y resumibles arriba cuando el formulario es largo
- fechas, estados y numeros escritos con suficiente contexto

## Como usar esta base con las skills

Cuando un agente tome trabajo UI debe:
1. Normalizar la solicitud con `GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
2. Elegir patron con `GREENHOUSE_UI_ORCHESTRATION_V1.md`
3. Revisar esta baseline para:
   - first fold
   - ritmo y densidad
   - estados
   - microcopy
   - accessibility
4. Recién despues adaptar referencias de `full-version`

## Fuentes externas de referencia

Revisadas el `2026-03-30`.

### Sistemas de diseno y patrones
- Android Developers, canonical layouts:
  - https://developer.android.com/design/ui/mobile/guides/layout-and-content/canonical-layouts
- GOV.UK Design System:
  - https://design-system.service.gov.uk/
- US Web Design System:
  - https://designsystem.digital.gov/

### Content design y UX writing
- Atlassian Design, content design:
  - https://atlassian.design/get-started/content-design
- GOV.UK guidance y patrones de formularios/errores:
  - https://design-system.service.gov.uk/

### Accessibility
- W3C Web Accessibility Initiative:
  - https://www.w3.org/WAI/
- WCAG Quick Reference:
  - https://www.w3.org/WAI/WCAG21/quickref/

## Decision institucional

Para Greenhouse, "buena UI" ya no significa solo:
- respetar Vuexy
- no romper MUI

Tambien debe significar:
- reducir tiempo de comprension
- mejorar decision support
- escribir mejor
- mostrar estados honestos
- sostener accesibilidad basica desde el primer slice
