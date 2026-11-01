# Perú: diagnóstico de cobertura de búsquedas

**Corte:** 29-10-2026, America/Santiago. Sales Navigator Core de Julio Reyes.
**Estado:** diagnóstico de lectura realizado; cobertura comercial pendiente de recalibración.
Las 44 búsquedas guardadas permanecen intactas. [Manifest del diagnóstico](COBERTURA-PERU-Y-VALIDACION-DE-BUSQUEDAS-2026-10-29.json).

## Qué corrige este diagnóstico

Julio cuestionó que Perú tuviera sólo 58 personas. Era el contador de **una consulta CRM/RevOps/lifecycle**,
no de todo el país. La validación anterior comprobó persistencia de 44 búsquedas y pertinencia de muestras
(100 observaciones de tarjetas, con personas repetidas); no contrastó suficientemente los perfiles que
los filtros dejaban fuera. **Persistencia, precisión de muestra y cobertura son verificaciones distintas.**
El [inventario original](BUSQUEDAS-GUARDADAS-MERCADOS-HISPANOS-2026-10-29.md) conserva filtros e IDs reales.

## Prueba observada

En copias temporales se esperaron resultados estables y se leyó el contador principal. Se conservó tamaño
51+; sin filtro de primer grado. Las variantes de diagnóstico no se guardaron ni sustituyeron consultas.

| Paso | Consulta | Resultados observados |
| --- | --- | ---: |
| 1 | CRM original: sede de empresa Perú, diez industrias, cargo original | 58 |
| 2 | Mismo cargo y sede; retirar todas las industrias | 81 |
| 3 | Mismo cargo, sin industrias; sustituir sede por ubicación personal Perú | 106 |
| 4 | Misma ubicación personal y tamaño; ampliar vocabulario de cargos y temas | 868 |
| Control independiente | Growth y Medios Perú, búsqueda guardada distinta | 789 |

Original CRM: [1991166001](https://www.linkedin.com/sales/search/people?savedSearchId=1991166001).
Control Growth: [1991165857](https://www.linkedin.com/sales/search/people?savedSearchId=1991165857).

Cargo original:

```text
(gerente OR subgerente OR head OR director) AND (CRM OR RevOps OR "Marketing Operations" OR "Experiencia de Cliente" OR CX OR lifecycle)
```

Cargo del ensayo amplio:

```text
(gerente OR subgerente OR head OR director OR manager OR jefe OR chief) AND (CRM OR RevOps OR CX OR lifecycle OR customer OR fidelización OR retención) NOT "community manager"
```

Sólo 1→2 aísla retirar industrias. 2→3 cambia la población: empresas con sede Perú y personas ubicadas en
Perú **no son conjuntos anidados**; la diferencia neta no mide compradores relevantes excluidos. 3→4 cambia
vocabulario de liderazgo y tema a la vez, incluyendo términos amplios y retirando otros; tampoco es una
prueba aislada de una palabra ni un superconjunto Boolean estricto. Los conteos se solapan: no sumarlos,
calcular porcentajes de cobertura ni tratarlos como censo. Growth tampoco es denominador de CRM.

[LinkedIn define por separado](https://www.linkedin.com/help/sales-navigator/answer/a1452817) sede de la
empresa actual y geografía de la persona. Ninguna acredita territorio de decisión o presupuesto. Industria
en Personas requiere contraste con el negocio real de su empresa; la taxonomía no certifica el ICP.

## Qué apareció al ampliar y cómo interpretarlo

- Sandro Denegri, Mibanco: Chief Data Officer / Head of Data, Analytics & CRM; Jaime Di Negro, Limagas:
  Gerente Comercial y Experiencia de Cliente. Candidatos de liderazgo funcional, sin autoridad confirmada.
- Jahir Rosales Zapata, Atlantic City Casino & Sports: SubGerente de Growth & CRM. El resumen profesional
  menciona equipos/agencias y presupuestos/P&L: evidencia declarada de trayectoria, sin contrato actual,
  presupuesto disponible o firma verificados. Casino está fuera del corte sectorial original; no se admitió
  automáticamente al ICP ni se amplió el mandato de contacto.
- La muestra amplia también mostró a Christian Romero Córdova (Financiera ProEmpresa), Julio Cortez Segura
  (Touring y Automóvil Club del Perú) y Macarena Poblete (Cineplanet). Una jefatura requiere revisar scope.
- Franco Viale Leyva, Impulse, Head of Growth & Customer Experience, ilustra el ruido de agencia/proveedor:
  no es cliente directo pertinente por coincidir en cargo. B2B2B necesita su evaluación separada.

**868 no son 868 compradores calificados.** Manager, jefe, chief y customer amplían descubrimiento y ruido.
No se aprobaron todas las tarjetas ni se probó que esta variante sea la mejor sustitución. Abrir cobertura
no reduce el gate: gerentes/subgerentes/heads o jefaturas con responsabilidad funcional y capacidad de
impulsar contratación; priorizar evidencia de agencias/proveedores, sin prospectar ejecución pura o CM.

## Método que debe repetirse antes de recomendar una búsqueda

1. Registrar ID/consulta, objetivo, país, filtros y conteo estable. Separar estado guardado, muestra y cobertura.
2. Preparar controles pertinentes conocidos por rol/cuenta, independientes de la consulta; verificar su empleo
   actual y explicar ausencias con búsqueda nominal/cuenta. No inferir ausencia de compradores por pocos hits.
3. Contrastar por separado industria, sede/geografía, cargos bilingües, función y seniority. Una sola variable
   cuando se quiera atribuir efecto; cambios múltiples quedan como exploración. Mantener tesis y tamaño.
4. Revisar tarjetas nuevas y controles ausentes; registrar incluido/excluido, motivo, perfil/cuenta y alcance.
   Conservar una ruta amplia de descubrimiento y una selección comercial revisada, sin duplicar guardados
   automáticamente ni exigir cantidad objetivo. Sin denominador independiente no se certifica exhaustividad.
5. Proponer la definición que equilibre compradores recuperados y ruido. Si se autoriza su guardado/reemplazo,
   conciliar original/copia/cupo y releer nombres/IDs tras recarga; no borrar la original como efecto del ensayo.

## Continuidad y brechas por explorar

**Siguiente prioridad:** auditar cobertura de las 20 búsquedas de personas en cuatro mercados; las 24 de
cuentas también conservan límites sectoriales/sede. No cambiar filtros guardados dentro de este cierre documental.
Después: semántica real de Boolean/títulos normalizados y puestos simultáneos; fintech clasificada como software,
matriz/filial/presencia local y decisores regionales; ciclo de avisos semanales, copias/reemplazo y recuperación
real de cupo al eliminar; recomendaciones de cuentas/personas y señales de cambio/actividad disponibles en Core;
rutas de acceso y buying groups. Diferenciar funciones leídas en documentación de las ejercitadas en esta licencia.

Evidencia local ignorada: `.captures/sales-nav-saved-searches-2026-10-29/peru-coverage/diagnostico.json` y
`crm-amplio.png`. Este manifest elimina parámetros de sesión/tracking. Sin nuevos guardados, membresías,
mensajes, solicitudes, InMail o CRM. Documentar el ensayo no lo convierte en resultado comercial.
