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

  // Errores
  error_title: 'No pudimos completar la autorización',
  error_generic_body: 'La solicitud de la aplicación no es válida. Vuelve a intentarlo desde la aplicación.',
  error_invalid_client_body: 'No reconocemos la aplicación que pide acceso.',
  error_invalid_redirect_body: 'La dirección de retorno de la aplicación no está registrada.',
  error_access_denied_body: 'Tu cuenta no tiene una organización vinculada que permita este acceso.',
  error_rate_limited_body: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  error_code_label: 'Código'
} as const
