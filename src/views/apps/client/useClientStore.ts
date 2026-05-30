import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'
import { supabaseAdmin } from '@/utils/supabaseAdmin'

interface FetchClientsParams {
  q?: string
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export const useClientStore = defineStore('ClientStore', {
  actions: {
    // 👉 Fetch clients
    async fetchClients(params: FetchClientsParams) {
      const { q = '', options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('rol_id', 3) // Rol 3 = Cliente

      if (q)
        query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`)

      if (sortBy.length > 0) {
        const sort = sortBy[0]

        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }
      else {
        query = query.order('created_at', { ascending: false })
      }

      // Pagination
      if (itemsPerPage !== -1) { // -1 significa mostrar todos
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        query = query.range(from, to)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching clients:', error)
        throw error
      }

      return {
        clients: data,
        totalClients: count || 0,
      }
    },

    // 👉 Add Client
    async addClient(clientData: { nombre: string; apellido: string; email: string; telefono?: string; password?: string }) {
      // Como signup está deshabilitado, usamos supabaseAdmin para crear el auth.user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: clientData.email,
        password: clientData.password || '123', // Contraseña dinámica
        email_confirm: true,
        user_metadata: {
          nombre: clientData.nombre,
          apellido: clientData.apellido,
          telefono: clientData.telefono || null,
          rol: 'cliente',
        },
      })

      if (error) {
        console.error('Error creating client:', error)
        throw error
      }

      return data.user
    },

    // 👉 Update Client (usa RPC/POST para evitar bloqueo CORS con PATCH)
    async updateClient(id: string, clientData: { nombre: string; apellido: string; telefono?: string }) {
      const { data, error } = await supabase
        .rpc('update_profile', {
          profile_id: id,
          new_nombre: clientData.nombre,
          new_apellido: clientData.apellido,
          new_telefono: clientData.telefono || null,
        })

      if (error) {
        console.error('Error updating client:', error)
        throw error
      }

      return data
    },

    // 👉 Delete Client
    async deleteClient(id: string) {
      // Eliminar al usuario desde admin para asegurar que desaparece de auth.users y perfiles
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

      if (error) {
        console.error('Error deleting client:', error)
        throw error
      }

      return true
    },
  },
})
