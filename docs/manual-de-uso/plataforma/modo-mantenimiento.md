# Activar y desactivar el Modo Mantenimiento

## Para que sirve

Poner el portal Greenhouse (o todo el trafico que no este en la lista permitida)
detras de la pagina **"En mantenimiento"** durante una mantencion planificada, sin
tocar codigo — solo configuracion + redeploy. Mientras esta activo, las personas ven
la pagina de mantenimiento con un codigo 503 honesto, y tu (operador) puedes seguir
navegando con un bypass para verificar.

## Antes de empezar

- Acceso a las variables de entorno del ambiente (Vercel: Production / Staging /
  Preview) y permiso para redeploy.
- Tener claro el alcance: el modo bloquea **todo** menos la lista permitida
  (`/maintenance`, recursos del framework, `/api/auth/*`, `/api/health`, imagenes y
  marca). No es selectivo por seccion.

## Paso a paso — Encender

1. En el ambiente objetivo, define las variables:
   - `MAINTENANCE_MODE=true`
   - `MAINTENANCE_BYPASS_SECRET=<secreto>` (opcional pero recomendado). Genera uno con:
     ```bash
     openssl rand -hex 32
     ```
2. **Redeploy** el ambiente (Vercel lee las variables al desplegar; no se aplican en
   caliente).
3. Verifica con el bypass (no como visitante normal, para no quedar bloqueado tu
   mismo): abre en el navegador
   `https://<host>/?gh_bypass=<secreto>`. Eso deja una cookie de bypass por la sesion
   y deberias navegar normal.
4. Verifica el lado visitante en una ventana privada (sin la cookie): deberias ver la
   pagina "En mantenimiento". Opcional, por terminal:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://<host>/login   # espera 503
   curl -s -o /dev/null -w "%{http_code}\n" https://<host>/maintenance  # espera 200
   ```

## Paso a paso — Apagar

1. En el ambiente objetivo, define `MAINTENANCE_MODE=false` (o elimina la variable).
2. **Redeploy**.
3. Verifica que una ruta normal vuelve a responder (ej. `/login` ya no da 503).

## Que significan las senales

- **503 + Retry-After**: respuesta correcta de "estamos en mantenimiento, vuelve mas
  tarde". Es lo esperado para visitantes mientras el modo esta activo.
- **Cookie `gh-maintenance-bypass`**: tu pase de operador para navegar el sitio en
  vivo durante el mantenimiento. Dura la sesion (8h).
- **5 mensajes rotativos** en la pagina: es esperado; cada refresh muestra una
  variante distinta.

## Que no hacer

- No enciendas el modo **sin** definir el bypass si necesitaras navegar el sitio para
  apagarlo o verificar: igual puedes apagarlo via env + redeploy, pero el bypass te
  ahorra el viaje.
- No esperes que el cambio aplique sin redeploy. Sin redeploy, el flag no toma efecto.
- No compartas el `MAINTENANCE_BYPASS_SECRET` en canales publicos; tratalo como
  secreto (rotalo si se expone).
- No agregues rutas criticas nuevas a la lista permitida sin pensarlo: lo permitido
  queda accesible durante el mantenimiento.

## Problemas comunes

- **Encendi el modo pero el sitio sigue normal**: falto el redeploy, o lo pusiste en
  el ambiente equivocado.
- **Me bloquee a mi mismo**: vuelve a entrar con `?gh_bypass=<secreto>`; si no
  configuraste el secreto, apaga el modo via env + redeploy.
- **Un monitor marca caida**: es esperado (503). Si el monitor debe seguir verde,
  asegurate de que apunte a `/api/health` (esta en la lista permitida).

## Referencias tecnicas

- Configuracion (SSOT): `src/config/maintenance.ts`
- Aplicacion: `middleware.ts` (primer middleware del repo; default OFF, fail-open)
- Pagina: `src/views/UnderMaintenance.tsx` + `src/app/(blank-layout-pages)/maintenance/page.tsx`
- Doc funcional: `docs/documentation/plataforma/pagina-mantenimiento.md`
