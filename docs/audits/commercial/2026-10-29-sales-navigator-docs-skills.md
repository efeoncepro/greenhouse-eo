# Sales Navigator — cierre documental y skills del chat

Corte: **29-10-2026, America/Santiago**. Owner comercial: Julio Reyes. El operador pidió consolidar todo lo
aprendido y construido, delegar revisiones y hacer commit. Este cierre documenta el recorrido interactivo y
los guardados ya autorizados; no añade autonomía, comunicaciones, gasto, scheduler o CRM.

## Resultado y fuentes dueñas

| Materia | Fuente que conserva el detalle | Estado al corte |
|---|---|---|
| Contrato técnico y permisos | [ADR B2B](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md) | Adapter UI dentro de decisión Accepted; sin API privada ni runner nuevo |
| Comportamiento funcional | [Prospección B2B](../../documentation/comercial/prospeccion-b2b.md) | Investigación, configuración, listas y comunicación diferenciadas |
| Operación repetible | [Manual Sales Navigator](../../manual-de-uso/comercial/prospectar-sales-navigator-con-agentes.md) | Chrome autenticado, filtros laterales, paginación, selección y readback |
| Plan y canal | [Política Core/InMail](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md) | Core; 150 disponibles observados, 50 iniciales históricos; conexión primero e InMail táctico |
| Servicios e ICP | [Índice y manifiestos](../../commercial/sales-navigator/README.md) | 12 fichas con landing y 5 Personas persistidas/releídas; corte inicial 4+5 preservado |
| BCI y BICE VIDA | [BCI](../../commercial/prospects/contactos-conocidos-banca-retail-2026-10/BCI-SALES-NAVIGATOR-2026-10-29.md) · [BICE VIDA](../../commercial/prospects/bice-vida-2026-10/SALES-NAVIGATOR-2026-10-29.md) | Shortlists, descartes, perfil completo y limitaciones; cuenta guardada en ronda posterior |
| Cuentas y contactos financieros | [Índice de cohorte](../../commercial/prospects/servicios-financieros-chile-2026-10/README.md) | 3 listas sectoriales; 31 cuentas nominales, Haulmer incierto; 23 personas en 5 listas por servicio |
| Método reusable | [Referencia B2B](../../../.codex/skills/efeonce-b2b-prospecting/references/sales-navigator-operations.md) | Filtros, configuración, clasificación, permiso, evidencia y recuperación de fallos |

Los manifiestos JSON conservan nombres, URLs, criterios de Personas, copys, miembros y readbacks; las skills
conservan método estable y enlaces a evidencia fechada. No se trasladan personas reales a fixtures sintéticas.

## Aprendizajes consolidados

- **Relevancia antes de acceso:** descubrir industria/sede/tamaño y verificar entidad; buscar fintech también
  fuera de la clasificación financiera. El universo295 sin relación es diferente de los subconjuntos31/28
  con acceso. Primer grado no demuestra autoridad y la hipótesis de Julio sobre decisores fuera de su red
  permanece como hipótesis. País de sede, operación local y ubicación personal son campos distintos.
- **Panel lateral:** 15 familias visibles, 14 operables; CRM bloqueado por plan. Inventario no equivale a
  probar todas las combinaciones. El rango51+ es proxy del piso comercial50; la UI de Marketing >3 conserva
  la ambigüedad con el mínimo introducido. Una búsqueda de cero resultados no demuestra ausencia de roles.
- **Oferta completa:** SEO, Efeonce | AEO, creatividad, producción, Web, HubSpot, contenido, social,
  influencers, medios, performance e inbound tienen landing comprobada. Líneas sin landing independiente,
  capacidades, rutas y ofertas propuestas conservan su canon y estado; no se inventa disponibilidad.
- **ICP y Personas:** ICP/JTBD y grupo comprador pertenecen al modelo de cliente; las cinco Personas son
  filtros reutilizables por responsabilidad. Catálogos de cargos/función/seniority pueden omitir perfiles
  pertinentes; verificar cargo/alcance reales y ampliar búsqueda antes de concluir ausencia.
- **Listas por capa:** cuentas por sector y cohorte; personas por frente de servicio y responsabilidad. Una
  lista principal por persona al inicio; una segunda requiere encaje demostrado. Diferenciar identidades
  únicas y membresías. Guardar no equivale a contactar ni a crear Contact/Lead elegible en HubSpot.
- **Prueba de persistencia:** fijar identidad y destino, revisar selección exacta, guardar, recargar y
  contrastar miembros nominales. Notificación y contador son evidencia parcial. Conservar contradicciones,
  como Haulmer guardado/notificado pero sin fila nominal consistente, sin atribuir una causa no comprobada.
- **UI operable:** cambios React, carga asíncrona, menús, selección persistente, checkbox/teclado y removal
  sólo de lista tienen recuperación descrita. Sesión/autorización del operador y capacidades del tool se
  revalidan; no extraer cookies, credenciales o estado oculto. Capturas ignoradas no sustituyen manifiestos.
- **Canal táctico:** conexión → aceptación → abordaje habitual; InMail para alta relevancia o ventana
  estratégica con motivo individual y saldo/costo comprobados. El plan Core y los guardados no habilitan
  outreach, consumo de créditos, enriquecimiento de pago ni nuevas escrituras CRM.

## Documentos y skills correspondientes

Tres revisiones delegadas cubrieron: método/skills, capas documentales/política/ADR y evidencia/manifiestos.
La consolidación principal actualiza continuidad e índices y añade routing en Commercial y Customer Model.
B2B conserva su espejo idéntico Codex/Claude; Customer Model conserva canon Codex y companion Claude con
routing equivalente; Commercial conserva el patrón de companion Codex y overlay Claude. Las referencias de oferta, pricing y HubSpot siguen en sus dueños.

No se reescriben AGENTS/CLAUDE, fichas de cada práctica o schema CRM: el router B2B existente ya alcanza este
adapter y no cambió su contrato técnico/comercial. No se modifican skills ajenas sólo por repetir el portafolio.
El ADR Accepted existente registra la extensión interactiva; no nace otro sistema ni una autoridad nueva.

## Verificación y límites

Verificación completada: JSON parseables; corte inicial4servicios/5Personas y final12/5;31cuentas únicas
nominales;23personas únicas/23acuses/5listas con readback. Se comprobaron526enlaces locales del alcance sin
roturas; quick_validate de B2B y el gate global skills:mirrors pasan. Ocho archivos por espejo B2B son
idénticos; Customer Model y Commercial conservan sus patrones canon/companion.86IDs sintéticos únicos.

[Revisión offline independiente P81–P86](2026-10-29-sales-navigator-offline-eval.md): respuestas completas,
sin acceso a rúbrica ni operaciones externas. Contraste posterior del agente principal:6/6conformes cualitativos,
sin fallos críticos; no prueba eficacia comercial o ejecución viva. Revisión independiente de147URLs únicas
no detectó credenciales/parámetros de acceso; los expedientes conservan datos profesionales autorizados.

`git diff --cached --check` y cierre documental estricto pasan; el presupuesto estricto de contexto se
comprueba sobre el árbol de trabajo y una vista del contenido preparado para commit. Se conserva únicamente
la rotación mínima de una sesión y una entrada histórica, con sus hashes íntegros, para no mezclar otras sesiones.

Persisten: asociación de Haulmer como cuenta; demanda, presupuesto, autoridad, alcance regional y proceso
comprador por validar; ningún mensaje/solicitud enviado, InMail consumido ni nueva alta CRM. No se implementó
runner desatendido ni persistencia de autenticación. La investigación no fue exhaustiva del universo295.
El siguiente paso comercial es elegir cuenta e iniciativa y validar su grupo comprador con autorización por canal.

El commit comprende sólo este chat y la rotación documental mínima que requiera su entrada. Los cambios
concurrentes de pricing, ARMOR, MG Indusol, sitio público y otras operaciones permanecen fuera de su alcance.
