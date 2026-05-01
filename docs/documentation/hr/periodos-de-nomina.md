# Periodos de Nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-30 por Codex
> **Ultima actualizacion:** 2026-04-30 por Codex
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

---

## Que es un periodo de nomina

Un periodo de nomina es el objeto que representa el **mes imputable** sobre el cual Greenhouse calcula la nomina oficial.

Incluye, entre otros, estos datos base:

- `year`
- `month`
- `ufValue`
- `taxTableVersion`
- `status`

El sistema usa esos valores para determinar indicadores economicos, reglas de impuesto y calculo de entries.

---

## Regla funcional importante

`year` y `month` representan el mes imputable real del periodo. No son solo una etiqueta visual.

Por eso, cuando se corrige el mes o el año de un periodo no exportado, Greenhouse reinicia el periodo a borrador y obliga a recalcular.

---

## Como se resuelve la tabla tributaria Chile

Si el periodo incluye colaboradores Chile, Greenhouse necesita una `taxTableVersion` valida para el mes imputable.

### Comportamiento actual

- La version canonica esperada sigue el patron `gael-YYYY-MM`.
- El operador ya no necesita escribirla manualmente al crear el periodo.
- Greenhouse intenta resolver automaticamente la tabla sincronizada de ese mes.
- Si no encuentra la version canonica pero existe una unica version sincronizada para ese mes, puede reutilizar esa version.
- Si no existe ninguna tabla sincronizada para ese mes, el periodo igual puede crearse como borrador, pero el calculo Chile se bloquea despues con un error explicito.

### Por que existe ese bloqueo

El sistema no debe “adivinar” impuestos Chile ni degradar el calculo a `0`. Si falta la tabla del mes, el bloqueo protege el cierre de nomina y evita resultados contables incorrectos.

---

## Que hace Greenhouse automaticamente

Greenhouse intenta resolver la tabla tributaria:

- al crear el periodo
- al editar metadatos del periodo si no se define un override manual
- al construir el readiness
- al calcular o recalcular nomina Chile
- al cotizar compensacion reversa con dependencias tributarias Chile

Esto hace que el campo tributario pase de ser una exigencia de memoria del operador a una dependencia tecnica resuelta por el sistema cuando hay datos sincronizados.

---

## Override manual

`taxTableVersion` sigue existiendo porque hay casos avanzados donde un operador tecnico necesita fijar una version especifica.

Ese override no es el camino normal. Debe usarse solo si:

- hay una razon operativa excepcional
- existe una version sincronizada conocida
- el equipo tecnico pidio usarla explicitamente

Si el override apunta a una version que no existe para el mes, Greenhouse rechaza el cambio.

---

## Relacion con UF y UTM

- `UF` se sigue resolviendo automaticamente para el mes imputable.
- `UTM` se resuelve en el calculo usando el mismo mes tributario validado.
- `taxTableVersion`, `UF` y `UTM` deben corresponder al mismo periodo imputable para que el calculo Chile sea consistente.

---

## Efecto en la experiencia operativa

Antes:

- el operador veia un input ambiguo
- el placeholder sugeria un formato viejo (`SII-*`)
- podia parecer obligatorio conocer un identificador interno

Ahora:

- el modal de creacion muestra una version esperada informativa
- el backend intenta resolver la tabla automaticamente
- el sistema avisa con claridad si falta sincronizacion antes del calculo
- el override manual queda confinado a edicion avanzada del periodo

---

## Referencias

- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [Manual de uso — Periodos de nomina](../../manual-de-uso/hr/periodos-de-nomina.md)
