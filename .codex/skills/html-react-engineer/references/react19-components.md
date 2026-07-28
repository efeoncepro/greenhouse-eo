# Referencia — componer componentes con React 19

Verificado contra React 19.2 (react.dev, 2025-10-01). Patch vigente a 2026-07: 19.2.7.
**Frontera:** acá está *cómo se estructura el componente*. *Dónde corre* (RSC, hydration, streaming,
boundaries) es de **`frontend-architect`**.

⚠️ **Estas APIs son greenfield en los tres repos** (ver `SOURCES.md`). No son el idiom local.
Introducirlas es una decisión de arquitectura, no de componente.

---

## Formularios: `useActionState` + `useFormStatus`

Reemplazan el trío `useState`/`isLoading`/`error` reescrito en cada formulario.

```jsx
function UpdateName() {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      const error = await updateName(formData.get('name'))
      if (error) return { error }
      return { ok: true }
    },
    { }        // estado inicial
  )

  return (
    <form action={formAction}>
      <label htmlFor="name">Nombre</label>
      <input id="name" name="name" />
      <SubmitButton />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()      // lee el <form> ANCESTRO
  return <button type="submit" disabled={pending}>Guardar</button>
}
```

Puntos finos:

- **`useFormStatus` lee el `<form>` ancestro**, no uno propio. El componente que lo llama tiene que
  estar **dentro** del form; si no, siempre da `pending: false`. Es el error #1.
- La acción recibe `(estadoPrevio, formData)`. `formData` es un `FormData` real: **cada control
  necesita `name`**.
- Funciona con una función cliente async; **no requiere Server Actions**. Importa para este
  ecosistema, donde `'use server'` no se usa: se puede adoptar la ergonomía del formulario sin
  cambiar la arquitectura de datos.
- El `isPending` del tercer valor es del propio `useActionState`; `useFormStatus` es para hijos.

---

## `useOptimistic` — feedback inmediato con rollback

```jsx
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (current, nuevo) => [...current, { ...nuevo, pending: true }]
)

async function onSubmit(formData) {
  addOptimistic({ text: formData.get('text') })
  await enviar(formData)      // si falla, React revierte solo
}
```

React revierte al terminar la acción si el estado real no confirmó. **No escribas tu propio rollback.**

**Cuándo NO usarlo:** cuando el fallo es probable o caro (un pago, una aprobación, algo irreversible).
Mostrar éxito y revertirlo es peor que mostrar un spinner. La regla es de `state-design`; acá está el
mecanismo.

---

## `useEffectEvent` (19.2) — el fix estructural de las dependencias

```jsx
const onConnected = useEffectEvent(() => {
  showNotification('Connected!', theme)      // lee siempre el theme actual
})

useEffect(() => {
  connection.on('connected', () => onConnected())
}, [roomId])    // theme NO está en deps y no hace falta: no re-conecta al cambiar el tema
```

Resuelve el conflicto real: el efecto **usa** un valor pero no debe **reaccionar** a él. Antes se
resolvía con un ref manual o con un `eslint-disable`, ambos frágiles.

Reglas: se llama **solo desde efectos**, no se pasa a otro componente ni se pone en deps.

---

## `<Activity>` (19.2) — ocultar sin desmontar

```jsx
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <Page />
</Activity>
```

- `visible`: monta efectos, procesa updates normalmente.
- `hidden`: **desmonta los efectos**, preserva el estado, y difiere los updates hasta que React está
  ocioso.

Es la respuesta correcta a "quiero conservar el estado de este panel/tab/ruta sin pagar su render".
Antes: `display: none` (que **no** desmonta efectos — timers y suscripciones siguen vivos) o desmontar
de verdad (perdiendo estado y scroll).

---

## `use()` — leer una promesa o un contexto en el render

```jsx
const data = use(dataPromise)     // suspende hasta resolver
const theme = use(ThemeContext)   // se puede llamar condicionalmente, a diferencia de useContext
```

Necesita un `<Suspense>` arriba. **La promesa no puede crearse en el render de un componente cliente**
(se crearía una nueva en cada render, loop infinito): viene de un Server Component, de un cache o de
un framework.

⚠️ En greenhouse-eo hay **3 `Suspense` en todo el repo**. Introducir `use()` implica introducir
boundaries de Suspense — decisión de `frontend-architect`.

---

## React Compiler 1.0 — qué cambia en cómo escribís

Activo en `efeonce-globe` (`babel-plugin-react-compiler@1.0.0`, pin exacto).

- **No agregues `useMemo`/`useCallback`/`React.memo` por performance.** El compiler memoiza mejor y
  con más contexto. La memoización manual puede **impedirle** optimizar.
- **Escribí componentes puros.** El compiler se abstiene cuando detecta efectos secundarios escondidos:
  mutar props, mutar un objeto del render, leer/escribir globals. Un componente "sucio" simplemente no
  se optimiza — en silencio.
- **`eslint-plugin-react-hooks` limpio es la precondición** (v7 en Globe; v6+ usa flat config por
  defecto). Las reglas de hooks dejaron de ser un consejo: son el contrato de entrada del compiler.
- `useMemo` sigue siendo válido por **semántica**: preservar identidad referencial donde algo depende
  de ella.

---

## Estado y efectos: los errores que se repiten

### Estado duplicado / derivado

```jsx
// ✗ dos fuentes de verdad que se desincronizan
const [items, setItems] = useState(props.items)
useEffect(() => setItems(props.items), [props.items])

// ✓ derivá durante el render
const visibles = items.filter(i => i.active)
```

### Resetear estado al cambiar de entidad

```jsx
// ✗ efecto que limpia
useEffect(() => { setDraft('') }, [userId])

// ✓ remontá con key — React descarta todo el estado del subárbol
<Profile key={userId} userId={userId} />
```

`key` no es solo para listas: es la forma canónica de decir "esto es otra instancia".

### `key` en listas

Índice del array **solo** si la lista nunca se reordena, filtra ni recibe inserciones. En cuanto
alguna de las tres pasa, el estado interno de los hijos se pega al elemento equivocado — inputs que
muestran el valor de otra fila, checkboxes que saltan.

### Efectos que no deberían existir

No necesitás efecto para: transformar datos para el render · responder a un evento del usuario ·
resetear por cambio de prop (`key`) · calcular derivados.
Sí para: suscripciones, observers, timers, APIs no-React, sincronizar con `localStorage`.

---

## Composición: la escalera

Cuando aparecen props booleanas acumuladas (`isCompact`, `hasIcon`, `showFooter`), el componente está
tratando de ser varios. En orden de preferencia:

**1. children / slots** — el consumidor decide qué va adentro.

```jsx
<Card>
  <Card.Header>…</Card.Header>
  <Card.Body>…</Card.Body>
</Card>
```

**2. compound components** — piezas que comparten contexto implícito. Da flexibilidad de orden sin
explotar el API.

**3. `variant` con valores cerrados** — cuando las combinaciones son finitas y conocidas.

**4. booleanas** — última opción, y solo si son verdaderamente independientes.

> En Greenhouse hay un paso previo: **buscá la primitive existente antes de construir**
> (Greenhouse primitive → wrapper Vuexy `Custom*` → MUI base). Nacer una primitive tiene protocolo
> propio → `greenhouse-product-ui-architect`.

---

## Refs

- `ref` es una **prop normal** desde React 19: `forwardRef` ya no hace falta para componentes nuevos.
- `useImperativeHandle` solo para exponer una API imperativa acotada (`focus()`, `scrollTo()`), nunca
  para exponer estado.
- **Cleanup de ref callback** (19): el callback puede devolver una función de limpieza, en vez del
  patrón `if (node === null)`.

---

## Lo que NO decide esta skill

| Pregunta | Dueña |
|---|---|
| ¿Server o Client Component? ¿dónde va el boundary? | `frontend-architect` |
| ¿Server Action o API route? | `frontend-architect` + Full API Parity del repo |
| ¿Qué estados de UI existen y qué comunican? | `state-design` |
| ¿Cuándo valida el formulario y cómo se recupera del error? | `forms-ux` |
| ¿Cómo se ve, qué jerarquía tiene? | `modern-ui` / `greenhouse-ai-design-studio` |
| ¿Pasa WCAG? | `a11y-architect` |
| ¿Qué dice el texto? | `greenhouse-ux-writing` |
