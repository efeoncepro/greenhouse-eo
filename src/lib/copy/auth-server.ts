// Copy visible del authorization server propio de Efeonce (`auth.efeonce.org`).
//
// TASK-1829 crea las páginas mínimas del protocolo (inicio de sesión requerido, consentimiento,
// error). TASK-1830 y la task ui-ux de login/consentimiento las reemplazan por las pantallas reales
// y extienden este archivo; el copy vive acá, nunca inline en el HTML. es-CL, tuteo, sin voseo.

export const GH_AUTH_SERVER = {
  brand_title: 'Efeonce ID',
  page_lang: 'es-CL',

  // Inicio de sesión requerido (hasta TASK-1830)
  login_required_title: 'Necesitas iniciar sesión',
  login_required_body:
    'Para autorizar esta aplicación primero tienes que iniciar sesión con tu identidad de Efeonce. El inicio de sesión todavía no está disponible en este entorno.',
  login_required_hint: 'Vuelve a intentarlo desde la aplicación cuando el inicio de sesión esté habilitado.',

  // Step-up
  step_up_required_title: 'Verificación adicional requerida',
  step_up_required_body:
    'La aplicación pide permisos de escritura. Para concederlos tienes que confirmar tu identidad con un segundo factor.',

  // Consentimiento
  consent_title: 'Autorizar acceso',
  consent_intro: (clientName: string) => `${clientName} quiere acceder a tu cuenta de Efeonce con estos permisos:`,
  consent_scope_label: 'Permiso',
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
  login_rate_limited_title: 'Demasiados intentos',
  login_rate_limited_body: 'Espera unos minutos antes de volver a pedir un enlace de acceso.',

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
