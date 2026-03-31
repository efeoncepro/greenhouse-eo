export const required = (label = 'Campo') => (value: string) =>
  value.trim().length > 0 ? true : `${label} requerido`

export const email = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? true : 'Correo no válido'

export const minLength = (min: number) => (value: string) =>
  value.trim().length >= min ? true : `Mínimo ${min} caracteres`

export const dateInFuture = (value: Date | null) => {
  if (!value) {
    return 'Selecciona una fecha'
  }

  return value.getTime() > Date.now() ? true : 'La fecha debe ser futura'
}
