# Rooms/Auth — conciliación documental y de skills26Oct2026

Estado: actualización documental; backend, canary y pendientes reconciliados. Ningún cambio de código de
aplicación, merge, push, deploy, flag, correo, sesión o dato de negocio. Codex conserva backend y Claude
Design interfaz. Auth queda retenido en PR por decisión humana, aunque sus checks estén aprobados.

## Fuentes verificadas

- [Readback sin mutaciones](2026-10-26-docs-skills-state-readback.json): metadata cloud/flags a17:38:40 Chile
  y seguimiento CI posterior con fecha propia (`ciFollowUp`). Rooms main `e4b2e890`, deployment PROMOTED;
  Auth00168-vzb100% y SHA754a2a28. PR263/264 OPEN, sin merge, ambos CI/Vercel PASS en el seguimiento.
- [Canary real](2026-10-26-auth-rooms-real-image-canary.md): Microsoft/MFA, un PNG físico, dos WebP,
  lectura privada, único correo recibido, aislamiento y revocación. Invitación revocada/sala archivada;
  first-party/OTP/invitaciones/medios web OFF. Emisor OAuth/MCP y login base siguen activos.
- [Disparo automático](2026-10-26-automatic-media-dispatch.json): Scheduler OIDC200 en vacío sin Job y
  202 con demanda sintética archivada→Job4r9nz SUCCESS→lease/ack liberados. No es un segundo canary de imagen.
- [DB8/26tablas y ACL](2026-10-26-media-dispatch-database.json),
  [storage/IAM](2026-10-26-media-storage-infra.json) y [recovery histórico](2026-10-26-media-backend-recovery.md).
- [Control Auth retenido](2026-10-26-auth-deploy-control.md): snapshot previo conservado; su CI pendiente
  quedó superado por el seguimiento nuevo. Código control LOCAL+PR no equivale a workflow remoto integrado.

## Cobertura y responsables

Tres subagentes actualizaron dominio Rooms, dominio Auth y tasks/epics; raíz actualizó contexto, índices,
routers, flags y continuidad técnica de privacidad. [Manifiesto](2026-10-26-docs-skills-manifest.json).

- Skill Rooms y espejo Claude: contrato operativo, agente/ledger; arquitectura, dossier, guía de integración,
  funcionales y manuales local/worker. Diferencia implementación cloud de consumer/activación pendientes.
- Skill Auth y espejo Claude: first-party/OTP/login, contratos funcionales, manuales y runbook. Distingue
  código vivo, corrección preparada y retención del operador; correo ya comprobado no se repite.
- Tasks2058–2072 y1833/1834, planes, EPIC044/052 e índices: Status real, AC con evidencia y próximos pasos.
  Ningún movimiento de lifecycle ni declaración de todo el roadmap como completo.
- AGENTS/CLAUDE, project_context, Handoff, changelog, índice ADR, catálogos funcional/manual y router JSON.
  Router machine-readable ahora descubre Rooms/Auth como ya lo exigía el router humano.
- Referencias UI previas rotuladas como scaffold/dirección histórica; requisitos AXIS, motion moderno,
  reduced-motion/fallback/accesibilidad se conservan. Ninguna aceptación visual inventada.
- Privacidad: sólo continuidad técnica de inventario y canary. Decisiones jurídicas, tratamiento, plazos,
  residencia integral y aprobación responsable siguen pendientes; ninguna certificación/pentest nueva.

## Lo que queda por hacer

| Frente | Próximo paso / dueño | Límite |
| --- | --- | --- |
| Conexión Claude Design | Codex/integrador: entorno aislado, datos/permisos y sesiones de prueba; conectar DTO/readers/commands/media same-origin | Entorno todavía pendiente; no reutilizar sala archivada como activa ni copiar autoridad Production a Preview |
| Nueva interfaz | Claude Design: autoría, lectura y estados; ambos verifican cargar→procesar→adjuntar→publicar→leer y negativas | Backend listo no acredita conexión ni aceptación visual |
| Activación general | Decisión explícita y readback de flags, acceso y rollout | Acceso humano sigue OFF; Scheduler ON sólo máquina |
| Recovery ampliado | Ensayar restore con coordinador de migración8/26tablas antes de declarar recovery total del esquema vigente | Ensayo7/25 y claim/fencing/ack8 son evidencias distintas; no inferir restore8 |
| Auth publicación | Mantener PR263/264 abiertas hasta nueva instrucción | CI verde no autoriza merge; proteger futuros triggers ajenos src/lib y reconciliar runtime antes de build |
| Roadmap EPIC052/044 | Mantener alcance por unidad: autoría completa, presentación/colaboración, integraciones/MCP, DNS, privacidad y seguridad pendientes donde corresponda | No confundir corte de imágenes con todo el backend/producto ni pentest propio con evaluación completa |

## Historia y exclusiones revisadas

Auditorías de canary/infra/recovery, recibos, imágenes, scorecards y evidencia fechada quedan intactos;
se enlazan desde la continuidad vigente. Los planes antiguos conservan su receta/fecha con delta de estado.
AXIS, marca, La órbita, Resend, mailer, MCP, release y secret-hygiene fueron revisados por referencias:
sus contratos reutilizables no cambiaron; estado mutable pertenece a las skills Rooms/Auth, no se duplica
como supuesta nueva aprobación en las demás skills. No se editaron activos de marca ni código UI.

WIP comercial/editorial y generaciones ajenas preservados. Memorias personales no actualizadas: el pedido
se refiere a skills/docs del proyecto. Sin pruebas de aplicación repetidas ni nueva llamada de generación.

## Validación

- Skills espejo PASS (Rooms/Auth y catálogo global), whitespace PASS.
- 17 tasks focales PASS; TASK-2070 repetida tras cerrar su evidencia documental, sin move. Ops-lint changed:
  cero errores y 14 advertencias globales de paridad preexistentes, fuera de Rooms/Auth.
- Closure focal del diff propio: sin faltas documentales; aviso informativo de owners presentes.
- Feature-flags audit offline estricto PASS (179 flags, cero sin ledger); índices Creative Studio,
  inventario de modelos y freshness estricto PASS. No llamadas de generación ni cambios de proveedores.
- Enlaces locales: 2918 destinos examinados, 192 nuevos/modificados, cero rotos introducidos.
  Se corrigieron dos referencias pertinentes de Auth (TASK-1804/1852). Permanecen 57 referencias
  preexistentes de índices globales/archivo histórico ajenos al alcance; algunos enlaces archivados
  mantienen contexto de raíz por preservación byte-for-byte. No se declara un link-check global limpio.
- Contexto: se rotó una entrada antigua del changelog a octubre conservando su hash y cuerpo original;
  Handoff permanece en20sesiones; changelog60entradas. `docs:context-check:strict` PASS: cero errores y cero advertencias, ejecutado al final antes del commit.
- Sin suite de aplicación nueva: se conserva evidencia234backend/9focales/Playwright53PASS3skip y
 22Python+14VitestAuth; CI263/264 ya PASS, lo que no levanta la retención humana.

TASK-2070 conserva cierre administrativo de lifecycle pendiente; sólo se acreditó la documentación y
sus límites. Resto de lifecycle y snapshots históricos sin movimientos ni reescritura retrospectiva.
