# TASK-2007 — Flujos de primitivas AXIS

## Entry and Exit

El Lab presenta composiciones aisladas, sin navegación de producto ni persistencia. Salida por navegación normal. Selección: trigger/input → popup → elegir → cerrar; Escape cancela exploración, Tab deja continuar. Foco y selección son independientes.

## States and Recovery

Remoto: query → loading → resultados o error → retry; valor confirmado persiste durante carga/error mediante selectedOption explícita. Opción revocada explícitamente deja de enviarse. Clear es acción independiente. Reset cancelado no modifica estado.

Disclosure: acción abre región inline y foco permanece en trigger; Escape desde región cierra y restaura trigger. Cierre no declara rechazo comercial. Dialog modal usa showModal y devuelve foco al invocador; complementary no roba foco.

Multiselección: abrir listbox → flechas mueven foco → espacio alterna → Escape cierra. Chips eliminan valores con nombre accesible. FormData repite name. Tabs usan activación manual con flechas/Home/End y Enter/espacio.

Colección: filtro cambia resultados y vuelve a página 1; empty conserva filtros y permite recuperar. Fecha/rango usa ISO sin zona horaria, archivo sólo selecciona, no sube. Feedback expone estado sin mover foco ni borrar borrador.

## Verification

Teclado, touch emulado, FormData, reset normal/cancelado, error/retry, foco en dialog, 390/320 px y RTL. AT y touch físico no se declaran comprobados por automatización.

## GVC Scenario Plan

Ejecutar product-primitives.spec.ts y Forms: desktop/mobile, popup dentro de dialog, foco, reset y error/retry. Capturas y scroll-width en dossier AXIS.

## Design Decision Log

Mantener semánticas separadas: disclosure inline, dialog modal y complementary pasivo. Búsqueda remota no determina autoridad; selectedOption explícita diferencia lista paginada de opción revocada.


## Scheduler y Growth CTA — revisión aprobada 2026-10-05

CTA arbitrado → invitación → formulario inline, agenda dialog/inline o anchor real según acción.
Cerrar contenido colapsa y conserva borrador/selección; dismissed corresponde sólo a rechazo de
la invitación. Escape scoped y retorno al invocador; panel pasivo no roba foco. Adapter monta con
AbortSignal y disposer; cancelación de trabajo tardío no pinta fuera de la instancia destruida.

Scheduler: mes → fecha → slot → datos → submit del consumidor → comprobante confirmado o error
honesto. Ambiguous no habilita retry de reserva. Reabrir o cambiar contenedor no remonta un booking.
Fixtures AXIS no envían, reservan ni miden. Dos banners usan el mismo flujo, con jerarquía editorial
compacta/minimal y marca/spotlight; aprobación visual integral no acredita package release/adopción.
QA y estados: dossiers AXIS `docs/quality/scheduler.md` y `docs/quality/growth-cta.md`.
