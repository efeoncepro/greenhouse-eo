import { GH_AUTH_SERVER } from './auth-server'

export const AUTH_STEP_UP_COPY = {
  /**
   * TASK-1835 — Aviso al gastar un código de respaldo. Derivado del SSOT (`auth-server.ts`), no
   * transcrito: este archivo ya arrastraba un juego de textos paralelo al del emisor y de ahí salió
   * un copy muerto que nadie renderizaba.
   */
  backupUsedTitle: GH_AUTH_SERVER.totp_backup_used_title,
  backupRemaining: GH_AUTH_SERVER.totp_backup_remaining,
  backupContinue: GH_AUTH_SERVER.totp_backup_continue_cta,
  codeLabel: 'Código de tu aplicación o código de respaldo',
  setupCode: 'Código de tu aplicación de autenticación',
  verify: 'Verificar código',
  passkey: 'Verificar con mi passkey',
  enroll: 'Activar mi segundo factor',
  setup:
    'Escanea el QR o agrega esta clave a tu aplicación de autenticación y guarda los códigos de respaldo en un lugar seguro.',
  secret: 'Clave de configuración manual',
  qr: 'Código QR para tu aplicación de autenticación',
  backups: 'Códigos de respaldo',
  backupsWarning: GH_AUTH_SERVER.totp_backup_codes_body,
  saved: 'Guardé mis códigos de respaldo',
  confirm: 'Confirmar configuración',
  cancel: 'Volver a la solicitud',
  pending: 'Verificando…',
  rejected: 'No pudimos verificar el código o la passkey. Vuelve a intentarlo.',
  unavailable: 'No podemos verificar tu identidad en este momento. Intenta de nuevo en unos minutos.',
  expired: 'Tu sesión venció o ya no está disponible. Vuelve a la solicitud para entrar de nuevo.',
  limited: 'Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo.',
  cancelled: 'Se canceló la verificación con passkey. Puedes intentarlo otra vez.',
  unsupported:
    'Este navegador no permite verificar con passkey. Usa un código o configura una aplicación de autenticación.',
  saveRequired: 'Confirma que guardaste los códigos de respaldo antes de continuar.',
  javascript: 'Activa JavaScript para verificar tu identidad en esta página.'
} as const
