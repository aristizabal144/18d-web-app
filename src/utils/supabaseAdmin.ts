import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Role Key is missing. Admin features (like user creation) may not work. Please check your .env file.')
}

// Cliente con la clave de servicio (service_role_key) para tareas administrativas.
// IMPORTANTE: Este cliente salta Row Level Security (RLS) y no debe usarse para
// peticiones normales de lectura/escritura del lado del cliente, solo para funciones de administrador.
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
