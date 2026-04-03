# TASK-130 — Login Auth Flow UX: Loading States, Transitions & Error Feedback

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | UX / Auth |
| Sequence | Independiente, sin dependencias |

## Summary

La pantalla de login carece de feedback visual adecuado durante la autenticación. El botón cambia de "Entrar" a "Validando acceso..." (texto estático sin indicador de actividad), los botones SSO no muestran estado de carga, no hay transición post-auth antes de redirigir al dashboard, y los errores no se categorizan. Esta task implementa un flujo de estados completo enterprise-grade.

## Why This Task Exists

El login es la primera interacción del usuario con Greenhouse. Una experiencia lenta o sin feedback genera desconfianza desde el primer segundo. Problemas actuales:

1. **Sin indicador visual de actividad** — El botón dice "Validando acceso..." pero no tiene spinner ni animación. El usuario no sabe si la app se colgó o si está trabajando.
2. **Botones SSO sin estado de carga** — Click en "Entrar con Microsoft" no muestra nada antes del redirect. Si el redirect tarda, el usuario puede hacer doble click.
3. **Doble submit posible** — Solo el botón de credenciales se deshabilita con `isSubmitting`. Los botones SSO y los inputs siguen habilitados durante la validación.
4. **Sin transición post-auth** — Después de auth exitosa, `router.replace('/auth/landing')` redirige silenciosamente. Si la page de destino tarda en cargar, hay un momento de pantalla en blanco.
5. **Error genérico** — Solo existe `login_error_credentials`. No hay categorización de errores (proveedor no responde, cuenta sin acceso, sesión expirada, red caída).

## Current Repo State

### Archivos involucrados

| Archivo | Propósito |
|---------|-----------|
| `src/views/Login.tsx` | Vista principal del login (client component) |
| `src/views/login/GreenhouseBrandPanel.tsx` | Panel izquierdo con branding |
| `src/views/login/login-constants.ts` | Constantes del layout |
| `src/app/(blank-layout-pages)/login/page.tsx` | Server component que renderiza Login |
| `src/app/auth/landing/page.tsx` | Landing post-auth: redirige a `portalHomePath` o `/dashboard` |
| `src/config/greenhouse-nomenclature.ts` | Textos: `login_button`, `login_validating`, `login_error_credentials` |

### Estado actual del flujo

```typescript
// Login.tsx — estado actual
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState('')

// Submit credentials:
setIsSubmitting(true)  // solo deshabilita el botón de submit
const result = await signIn('credentials', { redirect: false })
if (result?.error) { setError(...); setIsSubmitting(false) }
router.replace('/auth/landing')

// SSO:
await signIn('azure-ad', { callbackUrl: '/auth/landing' })  // redirect, sin loading state
await signIn('google', { callbackUrl: '/auth/landing' })    // redirect, sin loading state
```

### Problemas en el código

1. `isSubmitting` solo controla el botón de submit, no los botones SSO ni los inputs
2. No hay `CircularProgress` ni `LinearProgress` en ningún estado
3. `handleMicrosoftSignIn` y `handleGoogleSignIn` no tienen estado de loading propio
4. No hay estado de transición post-auth

## Scope

### Slice 1 — Loading states en los tres botones de auth (~1h)

#### 1a. Botón de credenciales — `LoadingButton`

Reemplazar el `Button` de submit con `LoadingButton` de `@mui/lab`:

```typescript
import LoadingButton from '@mui/lab/LoadingButton'

<LoadingButton
  fullWidth
  variant='outlined'
  type='submit'
  loading={isSubmitting}
  loadingPosition='start'
  startIcon={<i className='tabler-lock' />}
  color='secondary'
  sx={{ borderRadius: '8px', py: 1.5, textTransform: 'none', fontSize: 14, fontWeight: 500 }}
>
  {isSubmitting ? GH_MESSAGES.login_validating : GH_MESSAGES.login_button}
</LoadingButton>
```

#### 1b. Botones SSO — loading individual

Agregar estado de loading por provider:

```typescript
const [ssoLoading, setSsoLoading] = useState<'microsoft' | 'google' | null>(null)
const isAnyLoading = isSubmitting || ssoLoading !== null

const handleMicrosoftSignIn = async () => {
  setError('')
  setSsoLoading('microsoft')
  await signIn('azure-ad', { callbackUrl: '/auth/landing' })
}
```

Cada botón SSO muestra `CircularProgress` cuando su provider está loading:

```typescript
<Button
  disabled={isAnyLoading}
  startIcon={ssoLoading === 'microsoft'
    ? <CircularProgress size={20} color='inherit' />
    : <Box component='img' src='...' />
  }
>
  {ssoLoading === 'microsoft' ? 'Redirigiendo a Microsoft...' : GH_MESSAGES.login_with_microsoft}
</Button>
```

#### 1c. Deshabilitar todo el formulario durante loading

Cuando `isAnyLoading`:
- Todos los botones deshabilitados (ya cubierto con `disabled={isAnyLoading}`)
- Inputs de email/password deshabilitados
- Link "¿Olvidaste tu contraseña?" con `pointerEvents: 'none'`

### Slice 2 — LinearProgress como señal global (~30min)

Agregar un `LinearProgress` indeterminado en el top del card de auth cuando cualquier loading está activo:

```typescript
{isAnyLoading && (
  <LinearProgress
    sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      borderRadius: '8px 8px 0 0',
      height: 3
    }}
  />
)}
```

El card necesita `position: 'relative'` para que el progress se ancle correctamente.

### Slice 3 — Transición post-auth con skeleton (~1h)

El gap de UX más visible. Después de auth exitosa y antes de que la página destino cargue:

#### 3a. Estado de transición en Login.tsx

Después de `router.replace('/auth/landing')`:

```typescript
const [isTransitioning, setIsTransitioning] = useState(false)

// En handleSubmit, después de result exitoso:
setIsTransitioning(true)
router.replace('/auth/landing')
router.refresh()
```

Cuando `isTransitioning`, reemplazar el formulario con una pantalla de transición:

```typescript
{isTransitioning ? (
  <Stack spacing={3} alignItems='center' sx={{ py: 8 }}>
    <Box sx={{ /* logo */ }} />
    <Typography variant='body1' color='text.secondary'>
      Preparando tu espacio de trabajo...
    </Typography>
    <CircularProgress size={32} />
  </Stack>
) : (
  // formulario normal
)}
```

#### 3b. Skeleton en auth/landing

`src/app/auth/landing/page.tsx` es un server component que redirige. Mientras resuelve la sesión y el redirect, el usuario ve una pantalla en blanco. Agregar un `loading.tsx` sibling:

```typescript
// src/app/auth/landing/loading.tsx
export default function AuthLandingLoading() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <Stack spacing={3} alignItems='center'>
        {/* Logo */}
        <CircularProgress size={32} />
        <Typography variant='body2' color='text.secondary'>
          Preparando tu espacio de trabajo...
        </Typography>
      </Stack>
    </Box>
  )
}
```

### Slice 4 — Error categorization (~30min)

Reemplazar el error genérico con categorías específicas:

```typescript
// greenhouse-nomenclature.ts — nuevos mensajes
login_error_credentials: 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
login_error_provider_unavailable: 'El proveedor de autenticación no respondió. Intenta de nuevo en unos segundos.',
login_error_account_disabled: 'Tu cuenta no tiene acceso al portal. Contacta a tu administrador.',
login_error_session_expired: 'Tu sesión expiró. Ingresa tus credenciales nuevamente.',
login_error_network: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
```

Mapear errores de NextAuth a categorías:

```typescript
const mapAuthError = (error: string): string => {
  if (error === 'CredentialsSignin') return GH_MESSAGES.login_error_credentials
  if (error === 'AccessDenied') return GH_MESSAGES.login_error_account_disabled
  if (error === 'SessionRequired') return GH_MESSAGES.login_error_session_expired
  if (error.includes('fetch')) return GH_MESSAGES.login_error_network
  return GH_MESSAGES.login_error_credentials // fallback seguro
}
```

Alert con severity adecuada:

```typescript
{error && (
  <Alert
    severity={error.includes('conexión') ? 'warning' : 'error'}
    onClose={() => setError('')}
  >
    {error}
  </Alert>
)}
```

### Slice 5 — Textos en nomenclatura (~15min)

Agregar los nuevos textos al `GH_MESSAGES` en `greenhouse-nomenclature.ts`:

```typescript
// Loading states
login_validating: 'Validando acceso...',
login_redirecting_microsoft: 'Redirigiendo a Microsoft...',
login_redirecting_google: 'Redirigiendo a Google...',
login_preparing_workspace: 'Preparando tu espacio de trabajo...',

// Errors
login_error_credentials: 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
login_error_provider_unavailable: 'El proveedor de autenticación no respondió. Intenta de nuevo en unos segundos.',
login_error_account_disabled: 'Tu cuenta no tiene acceso al portal. Contacta a tu administrador.',
login_error_session_expired: 'Tu sesión expiró. Ingresa tus credenciales nuevamente.',
login_error_network: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
```

## Flujo de estados completo

```
[Idle]                    Botones habilitados, inputs activos
  │
  ├─ click credentials ──▶ [Validating]
  │                         LoadingButton con spinner
  │                         LinearProgress top
  │                         Inputs + SSO deshabilitados
  │                         ├─ error ──▶ [Error]  Alert categorizado, form re-habilitado
  │                         └─ ok ────▶ [Transitioning]
  │
  ├─ click Microsoft ────▶ [SSO Loading]
  │                         Botón con CircularProgress + "Redirigiendo..."
  │                         LinearProgress top
  │                         Todo deshabilitado
  │                         └─ redirect a Microsoft ──▶ (fuera del portal)
  │
  └─ click Google ───────▶ [SSO Loading] (mismo patrón)

[Transitioning]           Logo + "Preparando tu espacio de trabajo..." + spinner
  │                       Formulario oculto
  └─ redirect ──▶ [auth/landing loading.tsx]
                          Logo + spinner + "Preparando..."
                          └─ session resolved ──▶ [Dashboard]
```

## Out of Scope

- Autenticación biométrica (WebAuthn/passkeys) — mejora futura
- Remember me / persistent session — ya lo maneja NextAuth
- CAPTCHA o rate limiting de intentos — mejora futura
- Animaciones complejas de transición (Framer Motion) — el feedback debe ser funcional, no decorativo
- Cambios al branding panel izquierdo — solo se toca el form panel derecho

## Acceptance Criteria

- [ ] Botón de credenciales muestra `LoadingButton` con spinner durante submit
- [ ] Botones SSO muestran `CircularProgress` + texto "Redirigiendo a {provider}..."
- [ ] Todo el formulario se deshabilita durante cualquier loading (inputs, botones, links)
- [ ] `LinearProgress` visible en top del card durante loading
- [ ] Pantalla de transición post-auth con logo + spinner + "Preparando tu espacio de trabajo..."
- [ ] `loading.tsx` en `auth/landing` muestra spinner durante session resolution
- [ ] Errores categorizados con mensajes específicos (credentials, provider, network, access)
- [ ] Alert con botón de cerrar y severity adecuada
- [ ] No hay doble submit posible en ningún flujo
- [ ] Textos en `GH_MESSAGES` de nomenclatura centralizada
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Build
pnpm build
pnpm test

# Manual — credenciales
1. Ir a /login
2. Ingresar email + password
3. Click "Entrar"
4. ✓ Spinner visible en botón
5. ✓ LinearProgress en top
6. ✓ Inputs deshabilitados
7. ✓ Botones SSO deshabilitados
8. ✓ Si falla: Alert con mensaje categorizado, form re-habilitado
9. ✓ Si ok: transición "Preparando tu espacio de trabajo..."

# Manual — SSO
1. Click "Entrar con Microsoft"
2. ✓ Botón muestra spinner + "Redirigiendo a Microsoft..."
3. ✓ Todo deshabilitado
4. ✓ Redirect a Microsoft

# Manual — transición
1. Auth exitosa por cualquier método
2. ✓ Pantalla de transición con logo + spinner
3. ✓ No hay pantalla en blanco entre login y dashboard
```

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/views/Login.tsx` | Loading states, disable form, transición post-auth |
| `src/app/auth/landing/loading.tsx` | Nuevo — skeleton durante session resolution |
| `src/config/greenhouse-nomenclature.ts` | Nuevos textos de loading y error |
