# Review visual — TASK-1675 · El menú del portal cliente compone los módulos contratados

> **Tipo:** Dossier de revisión visual (GVC premium, tres escenarios)
> **Task:** `docs/tasks/in-progress/TASK-1675-client-portal-menu-module-driven.md`
> **Wireframe:** `docs/ui/wireframes/TASK-1675-client-portal-menu-module-driven.md`
> **Scorecard:** `docs/ui/reviews/TASK-1675-client-portal-menu-module-driven.scorecard.json`
> **Revisado:** 2026-08-09 por Claude, mirando los frames
> **Veredicto:** `pass` — promedio 4.79, piso 4

## 0. Por qué este review se lee al revés

En una superficie nueva se revisa si tiene presencia, jerarquía y un momento visual dominante. Acá el
criterio es el opuesto y está escrito en el wireframe: **el after debe ser el menú de siempre más una
fila**. Cualquier otro píxel que cambie es un defecto. Un "momento visual dominante" en el sidebar
sería un fallo del trabajo, no una virtud.

Por eso la defensa real no es la inspección visual sino el par de capturas: la que tiene el módulo y la
que no. La primera demuestra que el ítem aparece; sólo la segunda demuestra que aparece **únicamente a
quien corresponde**.

## 1. Evidencia

| Frame | Persona | Qué prueba |
|---|---|---|
| `client-portal-menu-with-module/default__menu-with-module.png` | `agent-berel-client@` (Grupo Berel, `seo_v2` vigente) | El ítem existe, en la lista primaria, entre Campañas y MI CUENTA |
| `client-portal-menu-without-module/default__menu-without-module.png` | `agent-client@` (sin módulos) | El ítem **no** existe y la lista base queda intacta |
| `client-portal-menu-mobile-drawer/mobile__menu-with-module-mobile.png` | `agent-berel-client@` | A 390px el ítem está en el drawer, en la misma posición relativa |

Datos reales, cero fixtures: el assignment `seo_v2` de la organización `org-32333527-…` se verificó
contra PG antes de capturar.

## 2. Lo que la captura mostró y el contrato no anticipaba

El menú de Berel tiene **dos** ítems compuestos, no uno: `SEO` en la lista primaria y `AEO` bajo la
sección `MÓDULOS`. `AEO` se compuso solo, sin una línea de código dedicada.

Eso convierte una decisión de implementación en un hecho verificado: mergear los tres grupos del
composer (`primary`, `capabilities`, `account`) y no sólo el primario era necesario. Una lectura
literal del wireframe —que habla del ítem SEO en la lista primaria— habría producido un merge que
descarta `AEO` en silencio, es decir, exactamente el agujero que esta task existe para cerrar, sólo que
más difícil de ver.

## 3. Assertions ejecutadas

Las cinco del escenario positivo pasaron:

- el ítem `/growth/seo` está presente;
- `/growth/seo/report` **no** está — el informe es ruta hija y se alcanza por el CTA del dashboard;
- `/campanas` sigue presente, o sea que el merge no reemplazó la lista base;
- sin redirect a `/login` (la captura corrió con la identidad declarada, no con la del agente);
- sin error boundary.

Las del negativo confirmaron la ausencia del ítem con la lista base intacta.

## 4. El único defecto visual atribuible a esta task

Los ítems de módulo **no tienen subtítulo** y los ítems base sí, así que sus filas miden una línea
contra dos o tres y el ritmo vertical del bloque primario se corta al llegar a `SEO`.

Es una consecuencia declarada del contrato, no un descuido: el Copy Ledger del wireframe fija que el
label sale del `VIEW_REGISTRY` y que no hay copy nuevo. El único texto disponible en el registry es
`description`, que es prosa de governance (*"Dashboard SEO client-scoped (TASK-1310): lectura orgánica,
evolución y Search Visibility 360…"*) y como subtítulo de navegación sería peor que la ausencia.

Cerrarlo de verdad pide un campo de nav propio en el `VIEW_REGISTRY`, con su migración — fuera del
alcance de esta task. Queda anotado en `proportions` y `rhythm` del scorecard con su `nextAction`.

## 5. Hallazgos del chrome, que no son de esta task

Cuatro, los cuatro preexistentes y globales al `VerticalNav` (afectan al portal entero, interno
incluido):

1. **Ningún ítem del menú muestra anillo de foco** al tabular; el estado enfocado se comunica sólo con
   un cambio de fondo tenue. El escenario negativo es el control que lo prueba: su probe parte de
   `/campanas`, un ítem base de siempre, y produce el mismo hallazgo que el del ítem de módulo.
2. A 390px el `ScrollWrapper` del menú es un `div` con `overflow-y-auto` sin `role`, label ni
   `tabIndex`: un usuario de teclado no puede alcanzar la región scrollable.
3. El toggle del drawer es un `<i class="tabler-menu-2">` sin role de botón ni nombre accesible.
4. El panel del drawer abierto desborda 8px a la izquierda (`left: -8`).

Están **registrados en los manifests de las capturas**, no silenciados. Lo que se relajó —con el motivo
escrito inline en cada escenario— es su capacidad de bloquear una task cuyo contrato prohíbe
explícitamente tocar el chrome (*"no rediseñar el chrome del menú: eso es TASK-1388"*). Dueño
declarado: `client-portal-menu-focus-ring`. Cuando se cierre, los flags vuelven a `true` y se
recaptura.

## 6. Decisiones de escenario que vale la pena no re-descubrir

- **Tres escenarios, no uno.** `requiresStorageState` se resuelve antes de crear el contexto del
  navegador: una corrida tiene una sola identidad, así que dos personas son dos archivos.
- **El mobile va aparte y abre el drawer.** A 390px el sidebar vive en `left: -260`, fuera del
  viewport, hasta que alguien lo abre. Capturarlo sin abrirlo producía ocho hallazgos de "elemento
  fuera del viewport" que no eran del producto sino del escenario: estaba midiendo un panel oculto. Y
  como los `steps` son compartidos entre variantes, no había forma de abrirlo sólo en mobile dentro del
  mismo archivo.
- **`requireSurfaceRecipeMarker: false`.** El sidebar es chrome de layout; la propia task declara
  `Composition Shell: no aplica`. Exigirle declarar una gramática de composición que esta región no
  debe tener es un error de categoría.
