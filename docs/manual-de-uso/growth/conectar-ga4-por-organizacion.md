# Conectar GA4 a una organización

> Estado: flujo implementado localmente; habilitación y prueba OAuth reales pendientes.

1. Abre **Agencia → Cliente → Ciclo de vida** de la organización correcta. Para Berel, usa **Grupo Berel**.
2. En la tarjeta **Google Analytics 4**, selecciona **Conectar Google Analytics**. Autoriza el alcance de solo lectura con una cuenta que tenga acceso a la propiedad GA4 del cliente.
3. Al volver a Greenhouse, elige la propiedad exacta en la lista. Para Grupo Berel, verifica nombre e ID antes de guardar; no elijas una propiedad de Efeonce ni otra organización por proximidad en la lista.
4. La tarjeta mostrará nombre e ID de la propiedad conectada. **Desconectar** desvincula la organización de su token de lectura tras confirmar en el diálogo.

El botón solo está disponible para operadores con `growth.ga4.connect` cuando `GROWTH_GA4_ENABLED=true` en el runtime. El refresh token se guarda en Secret Manager; la base almacena únicamente su referencia. La conexión por sí sola no afirma que un informe histórico haya sido leído: verifica una consulta Data API con el rango y las dimensiones requeridos.

## Prueba desde desarrollo local

No hace falta desplegar Greenhouse en producción para completar el consentimiento. Con el servidor en `http://localhost:3000`, registra exactamente `http://localhost:3000/api/admin/growth/analytics-ga4/oauth/callback` como URI de redirección autorizada en el cliente OAuth web de Google. Configura en el entorno local `GOOGLE_GA4_OAUTH_CLIENT_ID`, `GOOGLE_GA4_OAUTH_CLIENT_SECRET` y `GROWTH_GA4_ENABLED=true`, además de acceso del runtime a Secret Manager. El esquema de conexión debe estar migrado en la base usada por ese entorno; el SQL de esta task permanece pendiente del release y no se aplica anticipadamente a la base compartida.

El estado **Testing** de la pantalla de consentimiento de Google permite usuarios de prueba, pero sus autorizaciones y refresh tokens expiran a los siete días. Es una limitación del estado OAuth de Google, distinta del ambiente dev o producción de Greenhouse.
