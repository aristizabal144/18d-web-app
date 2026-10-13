import { supabase } from '@/utils/supabase'

// Estado compartido a nivel de módulo: una sola consulta por sesión de usuario.
const esAdmin = ref<boolean | null>(null)
let usuarioVerificado: string | null = null
let consultaEnCurso: Promise<boolean> | null = null

supabase.auth.onAuthStateChange((_evento, session) => {
  if ((session?.user.id ?? null) !== usuarioVerificado) {
    esAdmin.value = null
    usuarioVerificado = null
    consultaEnCurso = null
  }
})

/**
 * Verifica si el usuario actual tiene rol 'admin' usando la misma función
 * public.is_admin() que aplican las políticas RLS.
 */
export const verificarAdmin = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  const usuarioId = session?.user.id ?? null

  if (!usuarioId) {
    esAdmin.value = false

    return false
  }

  if (usuarioId === usuarioVerificado && esAdmin.value !== null)
    return esAdmin.value

  if (!consultaEnCurso) {
    consultaEnCurso = (async () => {
      const { data, error } = await supabase.rpc('is_admin')
      if (error)
        console.error('Error al verificar el rol de administrador:', error)

      usuarioVerificado = usuarioId
      esAdmin.value = !error && data === true
      consultaEnCurso = null

      return esAdmin.value
    })()
  }

  return consultaEnCurso
}

export const usePermisos = () => {
  if (esAdmin.value === null)
    verificarAdmin()

  return {
    esAdmin: computed(() => esAdmin.value === true),
    verificarAdmin,
  }
}
