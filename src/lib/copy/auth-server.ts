// Copy visible del authorization server propio de Efeonce (`auth.efeonce.org`).
//
// TASK-1829 crea las páginas mínimas del protocolo (inicio de sesión requerido, consentimiento,
// error). TASK-1830 y la task ui-ux de login/consentimiento las reemplazan por las pantallas reales
// y extienden este archivo; el copy vive acá, nunca inline en el HTML. es-CL, tuteo, sin voseo.

export const GH_AUTH_SERVER = {
  brand_title: 'Efeonce ID',
  page_lang: 'es-CL',
  font_licenses_label: 'Licencias de fuentes',
  application_context_label: 'Aplicación',
  login_methods_intro: 'Elige cómo acceder para continuar a la aplicación.',
  login_team_title: 'Equipo Efeonce',
  login_invitation_title: 'Acceso por invitación',
  /** Separador entre los dos métodos de acceso; es decorativo (`aria-hidden`), nunca la única señal. */
  login_methods_separator: 'o',
  /** Ejemplo dentro del campo; la etiqueta visible sigue siendo `login_email_label` (WCAG 3.3.2). */
  login_email_placeholder: 'nombre@empresa.com',
  /** Panel de marca del acceso: dice QUÉ es esto y CÓMO funciona, sin promesas genéricas. */
  /** Titular del panel: se parte en dos para acentuar la promesa, no por capricho tipográfico. */
  login_rail_headline: 'Un solo acceso a todo lo que',
  login_rail_headline_accent: 'Efeonce opera contigo',
  /** Línea fina al pie de la tarjeta: acota a quién le llega el enlace, sin revelar si existe. */
  login_card_note: 'Te escribimos sólo al correo con el que te invitaron.',
  login_rail_body: 'Efeonce ID es la identidad con la que entras a los espacios de trabajo y a las herramientas conectadas de tu organización.',
  login_rail_trust: 'Enlace de un solo uso. Sin contraseñas que recordar.',
  scope_read_label: 'Lectura',
  scope_write_label: 'Escritura',

  // Inicio de sesión requerido (hasta TASK-1830)
  login_required_title: 'Necesitas iniciar sesión',
  login_required_body:
    'Para autorizar esta aplicación primero tienes que iniciar sesión con tu identidad de Efeonce. Continúa para elegir cómo entrar.',
  login_required_hint: 'Después de entrar podrás revisar los permisos que solicita la aplicación.',
  login_continue_cta: 'Continuar al inicio de sesión',
  login_microsoft_cta: 'Continuar con Microsoft',

  // Step-up
  step_up_required_title: 'Verificación adicional requerida',
  step_up_required_body:
    'La aplicación pide permisos de escritura. Para concederlos tienes que confirmar tu identidad con un segundo factor.',

  // Consentimiento
  consent_title: 'Autorizar acceso',
  consent_intro: (clientName: string) => `${clientName} quiere acceder a tu cuenta de Efeonce con estos permisos:`,
  consent_scope_label: 'Permiso',
  consent_organizations_label: 'Organizaciones de este acceso',
  consent_organization_label: 'Organización de este acceso',
  consent_context_intro: (count: number) => count === 1
    ? 'Esta aplicación solicita estos permisos para la organización indicada.'
    : 'Esta aplicación solicita estos permisos para las organizaciones indicadas.',
  consent_capabilities_label: 'Ver permisos vigentes en esta organización',
  consent_allow_cta: 'Permitir',
  consent_deny_cta: 'Cancelar',
  consent_footer: 'Puedes revocar este acceso en cualquier momento desde Efeonce.',
  consent_client_id_label: 'Identificador de la aplicación',

  // Descripciones de scopes (mismos strings que el gateway)
  scope_descriptions: {
    'efeonce.mcp.read': 'Leer información de tus organizaciones en Efeonce',
    'efeonce.mcp.globe.read': 'Leer tus espacios y activos de Efeonce Globe',
    'efeonce.mcp.hiring.read': 'Leer información de procesos de selección',
    'efeonce.mcp.globe.credits.funding.ensure': 'Cargar créditos de Globe (escritura, mueve dinero)',
    'efeonce.mcp.seo.write': 'Modificar la configuración SEO de tus organizaciones (escritura)'
  } as Record<string, string>,
  scope_description_fallback: (scope: string) => `Permiso ${scope}`,

  // Inicio de sesión sin contraseña (TASK-1830)
  login_title: 'Entra a Efeonce',
  login_intro: 'Te enviamos un enlace de acceso al correo con el que te invitaron. No usamos contraseñas.',
  login_email_label: 'Correo electrónico',
  login_submit_cta: 'Enviarme el enlace',
  login_sent_title: 'Revisa tu correo',
  login_sent_body:
    'Si ese correo tiene acceso, te acaba de llegar un enlace para entrar. Es válido por 15 minutos y funciona una sola vez.',
  login_sent_hint: 'No cierres esta pestaña: puedes abrir el enlace desde el mismo navegador.',
  login_invalid_email: 'Ese correo no tiene un formato válido. Revísalo e inténtalo de nuevo.',
  // Passkey primero: el login por passkey no pide correo (credenciales descubribles), así que va
  // arriba del campo. Los dos fallbacks son distintos a propósito: «no hay soporte» es del
  // dispositivo y «no resultó» es de la ceremonia; mezclarlos manda a la persona a revisar lo que no es.
  login_passkey_cta: 'Entrar con mi passkey',
  login_passkey_unsupported: 'Este dispositivo no admite passkeys. Usa el enlace por correo.',
  login_passkey_failed: 'No resultó el acceso con passkey. Puedes intentarlo de nuevo o usar el enlace por correo.',
  login_email_fallback_hint: 'O entra con un enlace por correo:',
  login_rate_limited_title: 'Demasiados intentos',
  login_rate_limited_body: 'Espera unos minutos antes de volver a pedir un enlace de acceso.',

  // Segundo factor (TOTP). El enrolamiento muestra el secreto y los códigos UNA sola vez: si la
  // persona cierra la pantalla sin guardarlos, el camino es re-enrolar, no recuperarlos.
  totp_enroll_title: 'Activa tu segundo factor',
  totp_enroll_body:
    'Escanea el código con tu app de autenticación y escribe el número que te muestre. Recién entonces queda activo.',
  totp_enroll_secret_label: 'Si no puedes escanear, escribe este código en tu app',
  totp_enroll_code_label: 'Número que muestra tu app',
  totp_enroll_submit_cta: 'Activar',
  totp_backup_codes_title: 'Guarda tus códigos de respaldo',
  totp_backup_codes_body:
    'Cada uno sirve una sola vez y te deja entrar si pierdes el teléfono. Esta es la única vez que los ves: guárdalos donde puedas encontrarlos después.',
  totp_backup_codes_confirm_cta: 'Ya los guardé',
  totp_verify_title: 'Confirma que eres tú',
  totp_verify_body: 'Escribe el número que muestra tu app de autenticación.',
  totp_verify_backup_hint: 'También puedes usar uno de tus códigos de respaldo.',
  totp_verify_submit_cta: 'Confirmar',
  totp_invalid_code: 'Ese número no es válido o ya se usó. Espera a que tu app muestre uno nuevo.',
  totp_not_enrolled: 'Todavía no tienes un segundo factor activo. Actívalo para poder autorizar permisos de escritura.',
  // El envelope caído no es «error de sistema»: es una degradación honesta con un límite claro.
  totp_unavailable_title: 'No podemos verificar tu segundo factor ahora',
  totp_unavailable_body:
    'Vuelve a intentarlo en unos minutos. Mientras tanto puedes seguir usando tus permisos de lectura.',

  // Confirmación del enlace (página intermedia; el consumo es por POST)
  confirm_title: 'Confirma tu acceso',
  confirm_body: 'Presiona el botón para terminar de entrar. El enlace funciona una sola vez.',
  confirm_cta: 'Entrar',
  confirm_invitation_title: 'Activa tu acceso',
  confirm_invitation_body:
    'Presiona el botón para activar tu invitación. Después te enviaremos un enlace al correo con el que te invitaron.',
  confirm_invitation_cta: 'Activar mi acceso',
  invitation_accepted_title: 'Revisa tu correo',
  invitation_accepted_body:
    'Activamos tu invitación. Te enviamos un enlace de acceso al correo con el que te invitaron; es válido por 15 minutos.',

  // Resultados del consumo
  link_invalid_title: 'Este enlace ya no sirve',
  link_invalid_body: 'El enlace es inválido o ya fue usado. Pide uno nuevo desde el inicio de sesión.',
  link_expired_body: 'El enlace expiró. Pide uno nuevo desde el inicio de sesión.',
  link_used_body: 'Este enlace ya se usó. Pide uno nuevo desde el inicio de sesión.',
  link_access_revoked_title: 'Tu acceso ya no está activo',
  link_access_revoked_body:
    'Tu acceso a Efeonce fue retirado. Si crees que es un error, escríbele a la persona de Efeonce que te invitó.',
  session_started_title: 'Listo, ya entraste',
  session_started_body: 'Puedes volver a la aplicación que pidió el acceso.',
  session_closed_title: 'Cerraste tu sesión',
  session_closed_body: 'Puedes cerrar esta pestaña.',

  // Errores
  error_title: 'No pudimos completar la autorización',
  error_generic_body: 'La solicitud de la aplicación no es válida. Vuelve a intentarlo desde la aplicación.',
  error_invalid_client_body: 'No reconocemos la aplicación que pide acceso.',
  error_invalid_redirect_body: 'La dirección de retorno de la aplicación no está registrada.',
  error_access_denied_body: 'Tu cuenta no tiene una organización vinculada que permita este acceso.',
  error_rate_limited_body: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  error_code_label: 'Código'
} as const
