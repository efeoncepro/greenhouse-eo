> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-15 por agente
> **Ultima actualizacion:** 2026-08-15 por agente
> **Documentacion tecnica:** `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md` (seccion "Favicon / iconografia de pestana")

# Favicon — iconografia de pestana del portal

## Para que sirve

El favicon es el icono chico que identifica a Greenhouse en la pestana del navegador, en el
historial, en la barra de direcciones y en los accesos directos que alguien guarde del portal. Es una
de las pocas piezas de marca que el usuario ve **todo el tiempo**, incluso cuando el portal esta en
segundo plano. Si es el icono equivocado, el portal se ve prestado.

Este documento explica de donde sale ese icono, como se regenera y por que a veces parece que un
cambio "no funciono" cuando en realidad si funciono.

## De donde sale el icono

Hay **un solo original**: el SVG de marca en
`public/images/greenhouse/SVG/favicon-blue-negative.svg` — el isotipo de Greenhouse en blanco sobre
un cuadrado azul redondeado.

De ese original se generan tres archivos derivados, que son los que el navegador consume:

| Archivo | Que es | Quien lo usa |
|---|---|---|
| `src/app/favicon.ico` | Icono clasico en cuatro tamanos (16, 32, 48 y 64 px) | Pestana, historial, barra de direcciones, marcadores |
| `src/app/icon.svg` | El vectorial, nitido en cualquier tamano | Navegadores modernos (lo prefieren sobre el `.ico`) |
| `src/app/apple-icon.png` | Version de 180x180 px sin transparencia | iPhone/iPad cuando alguien guarda el portal en su pantalla de inicio |

Estan en la raiz de `src/app/` a proposito: Next.js los reconoce por su **nombre de archivo** y arma
las declaraciones del `<head>` solo, agregandoles una huella unica que cambia cuando el archivo
cambia. Eso ultimo importa: es lo que hace que el navegador note un icono nuevo en vez de quedarse
con el anterior para siempre.

> Detalle tecnico: la convencion de archivos de Next App Router y las reglas duras estan en
> `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`.

## Como se regenera

Cuando cambia la marca, **no se editan los tres derivados a mano**. Se cambia el SVG original y se
corre:

```bash
pnpm branding:favicon
```

El comando rasteriza el SVG a los tamanos que corresponden y reescribe los tres archivos. Es
repetible: correrlo dos veces sobre el mismo original produce exactamente el mismo resultado.

## Que significa cada senal

| Senal | Que significa |
|---|---|
| `/favicon.ico` responde `200 image/x-icon` | Correcto. El archivo existe y el navegador lo puede tomar. |
| `/favicon.ico` responde `404` | **Roto.** Falta el archivo. El navegador pide esa ruta siempre, aunque el `<head>` declare otra cosa, y mientras recibe el error muestra el icono que tenga guardado de antes. |
| La pestana muestra un icono y despues cambia a otro | Sintoma del `404` de arriba: el navegador alcanza a pintar el icono viejo antes de resolver el nuestro. |
| El icono correcto aparece en la pestana pero no en la barra de direcciones | No es un problema del portal. Ver la seccion siguiente. |

## Que no hacer

- **No editar** `favicon.ico`, `icon.svg` ni `apple-icon.png` directamente. Son derivados; el
  proximo `pnpm branding:favicon` los sobreescribe y el cambio se pierde.
- **No declarar el icono ademas en el codigo del layout.** Teniendo los archivos, declararlo tambien
  en `metadata` hace que las dos definiciones compitan. Fue exactamente la causa del incidente que
  origino este documento.
- **No dar por bueno un cambio de favicon mirando el navegador propio.** Es la trampa mas comun; se
  explica abajo.

## Problemas comunes

### "Cambie el favicon y sigo viendo el viejo"

Es lo esperado, y casi nunca significa que el cambio fallo.

Los navegadores guardan los favicons en una base de datos propia, **separada del cache normal de
paginas**. Esa base alimenta la barra de direcciones, el historial y los marcadores, y no se refresca
cuando uno recarga la pagina — ni siquiera con recarga forzada. Un icono que se vio una vez puede
quedar ahi meses.

Para comprobar de verdad si el cambio quedo bien, hay dos verificaciones que no dependen del
navegador propio:

```bash
curl -I https://greenhouse.efeoncepro.com/favicon.ico
```

Debe responder `200` con tipo `image/x-icon`. Y en la consola del navegador, sobre el portal abierto:

```js
[...document.querySelectorAll('link[rel*="icon"]')].map(l => l.rel + ' → ' + l.href)
```

Debe listar **un** icono `.ico`, **un** `icon.svg` y **un** `apple-touch-icon`. Si aparecen
duplicados o rutas que no son esas, ahi si hay un problema real.

### "Quiero forzar que mi navegador tome el icono nuevo"

En Chrome, cerrando el navegador primero:

```bash
rm ~/Library/Application\ Support/Google/Chrome/Default/Favicons*
```

Chrome reconstruye esa base al reabrir. Se pierden los iconos guardados de todos los sitios, pero se
vuelven a descargar solos al visitarlos — es inocuo. La alternativa sin tocar archivos es
`chrome://settings/clearBrowserData` → "Imagenes y archivos almacenados en cache", que hace lo mismo
de forma menos precisa.

### "El icono se ve borroso en la pestana"

Revisar que `favicon.ico` tenga los cuatro tamanos. Un `.ico` de un solo tamano obliga al navegador a
escalar, y el escalado de un isotipo con detalle fino se ve sucio a 16 px. `pnpm branding:favicon`
genera los cuatro; si alguien reemplazo el archivo a mano, es probable que haya quedado con uno solo.

## Historia

El portal heredo el favicon del template Vuexy. En julio de 2026 se elimino ese archivo, pero no se
lo reemplazo por el de Greenhouse: la marca quedo declarada solo como SVG desde el codigo del layout,
y `/favicon.ico` empezo a responder `404`. Durante unas dos semanas el portal mostro el icono de
Vuexy antes del de Greenhouse en cada carga.

El sintoma sobrevivio a un primer intento de arreglo, porque la base de favicons del navegador del
operador seguia sirviendo el icono viejo en la barra de direcciones — de ahi la advertencia repetida
en este documento sobre no verificar contra el navegador propio.

> Detalle tecnico: reglas duras, caso fuente y contrato de generacion en
> `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`. Generador en
> `scripts/branding/build-favicon.mjs`.
