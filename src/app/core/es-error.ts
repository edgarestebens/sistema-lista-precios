/** Traduce mensajes comunes de Supabase/Auth/PostgREST al español. */
export function toSpanishError(
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.'
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : typeof error === 'string'
          ? error
          : fallback;

  const m = message.toLowerCase();

  if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
    return 'Tu email aún no está confirmado. Intenta entrar de nuevo.';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Email o contraseña incorrectos';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Ese email ya está registrado. Usa la pestaña Entrar.';
  }
  if (m.includes('password should be at least') || m.includes('password is known to be weak')) {
    return 'La contraseña es demasiado corta o insegura.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'El email no es válido.';
  }
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  }
  if (m.includes('jwt') || m.includes('not authenticated') || m.includes('unauthorized')) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (m.includes('permission denied') || m.includes('row-level security') || m.includes('rls')) {
    return 'No tienes permiso para esta acción.';
  }
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    return 'Ese registro ya existe.';
  }
  if (m.includes('user_id required') || m.includes('not authenticated')) {
    return 'Debes iniciar sesión para continuar.';
  }

  // Si ya viene en español (nuestras cadenas), déjala
  if (/[áéíóúñ¿¡]/i.test(message) || /^(error al|completa|la contraseña|no se pudo)/i.test(message)) {
    return message;
  }

  // Evitar mostrar inglés crudo al usuario
  return fallback;
}
