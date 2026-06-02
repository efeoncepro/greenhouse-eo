# Saludo de Nexa — Hero del Home

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-06-01 por Claude (Opus 4.8)
> **Última actualización:** 2026-06-01 por Claude (Opus 4.8)
> **Documentación técnica:** `src/components/greenhouse/nexa/NexaGreetingsCard.tsx`, `src/config/home-greetings.ts`, `src/views/greenhouse/home/v2/HomeHeroAi.tsx`, `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Para qué sirve

Es la **tarjeta de bienvenida de Nexa** en lo primero que ves al entrar al portal (el *home*). Saluda a la persona por su nombre, le recuerda su rol y le ofrece un **campo para preguntarle a Nexa** (la IA operativa) lo que necesite, más unos **accesos rápidos** a lo más usado.

No es decorativa: es la **puerta de entrada a la operación** — desde ahí se arranca una pregunta o se salta a una acción frecuente.

## Qué muestra

| Elemento | Qué es |
|---|---|
| **Avatar de Nexa** + chip "¡Hola, soy Nexa!" | La identidad de la asistente. Debajo, un aviso chico de que Nexa usa IA generativa. |
| **Saludo** | Un saludo personalizado y **distinto cada vez** (ver abajo). |
| **Rol · empresa** | Ej. "Colaborador · Efeonce Group". |
| **Campo de pregunta** | Donde le escribís a Nexa. El texto de ejemplo va **rotando** para mostrarte qué le podés preguntar. |
| **Botón enviar** | Aparece "apagado" cuando el campo está vacío y se **enciende** (relleno) cuando escribís; muestra un *spinner* al enviar. |
| **Accesos rápidos** | Chips con ícono (ej. *Mis tareas*, *Mis horas*, *Mi nómina*) que dependen de tu rol. |

## El saludo siempre cambia (y "sabe" el momento)

El saludo nunca es fijo: se elige de un **catálogo de ~100 frases** según el contexto, para que se sienta vivo y oportuno. Las dimensiones que influyen:

- **Hora del día** — madrugada, mañana, tarde o noche (es la base, la que más manda).
- **Día de la semana** — el lunes habla de arrancar la semana; el viernes, de cerrarla; el fin de semana baja el tono.
- **Momento del mes** — a inicio de mes invita a planificar; a fin de mes habla de cuadrar/cerrar.
- **Estación** (hemisferio sur, Chile) — verano, otoño, invierno, primavera.
- **Feriados de Chile** — Año Nuevo, Fiestas Patrias (el 18), Navidad tienen su saludo especial ese día.

La frase de la hora es la columna vertebral; las demás **aparecen de vez en cuando** para que se sienta consciente del momento sin volverse repetitivo o forzado. Si la persona no tiene nombre real cargado (ej. una cuenta genérica), el saludo se ajusta solo y omite el nombre.

## Detalles que dan "vida" (microinteracciones)

- El avatar **flota** suavemente.
- Los tres puntitos **laten** en secuencia (señal de "Nexa está en línea").
- Los elementos **entran escalonados** al cargar (avatar → saludo → campo).
- El texto de ejemplo del campo **se desvanece y cambia** mostrando distintas preguntas.
- Los accesos rápidos **se levantan** al pasar el mouse.

Todo esto **respeta la preferencia de "reducir movimiento"** del sistema operativo: si la persona la tiene activada, no hay animaciones (la tarjeta se ve completa y quieta).

## Qué no hace

- No "sigue el mouse" ni el avatar tiene ojos que se mueven (hoy el avatar es una imagen fija). Esa idea quedó **evaluada y registrada** para más adelante (ver `docs/tasks/to-do/TASK-989-nexa-living-avatar-cursor-aware.md`).
- No reemplaza la búsqueda global del portal (⌘K) — es la entrada a **Nexa**, no al buscador.

## Reusable

`NexaGreetingsCard` es un **componente reutilizable**: hoy lo usa el home, pero puede montarse en otras superficies (una landing de Nexa, un estado vacío, etc.) pasándole el saludo, el rol, los accesos y el manejador de envío.

> **Detalle técnico:** el componente vive en `src/components/greenhouse/nexa/NexaGreetingsCard.tsx` (presentacional, props-driven). El home lo alimenta vía el adapter `src/views/greenhouse/home/v2/HomeHeroAi.tsx`. El catálogo de saludos y el selector `pickHomeGreeting` están en `src/config/home-greetings.ts` (con tests en `home-greetings.test.ts`). El diseño original proviene del archivo Figma del design system; el componente final fue replicado a un archivo Figma de referencia aparte.
