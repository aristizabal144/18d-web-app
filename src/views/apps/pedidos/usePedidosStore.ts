import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

interface FetchPedidosParams {
  q?: string
  colorId?: number | null
  estado?: string | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export interface Pedido {
  id: string
  referencia: string
  fecha_inicio: string
  fecha_fin: string
  titulo: string
  descripcion: string | null
  talla: string | null
  peso: number | null
  color_id: number
  responsable_id: string
  cliente_id: string
  tiene_diseno: boolean
  id_diseno: string | null
  peso_final: number | null
  precio_gramo: number | null
  precio_adicionales: number
  descripcion_adicionales: string | null
  total_pedido: number
  estado: string
  imagen: string | null
  created_at: string

  // Joined fields
  color_oro?: { id: number; nombre: string }
  responsable?: { id: string; nombre: string; apellido: string }
  cliente?: { id: string; nombre: string; apellido: string }
  diseno?: { id: string; referencia: string; titulo: string } | null
}

export const usePedidosStore = defineStore('PedidosStore', {
  actions: {
    // 👉 Fetch Pedidos con paginación, búsqueda y filtros
    async fetchPedidos(params: FetchPedidosParams) {
      const { q = '', colorId = null, estado = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('pedidos')
        .select(`
          *,
          color_oro:colores_oro(id, nombre),
          responsable:profiles!pedidos_responsable_id_fkey(id, nombre, apellido),
          cliente:profiles!pedidos_cliente_id_fkey(id, nombre, apellido),
          diseno:disenos_3d!pedidos_id_diseno_fkey(id, referencia, titulo)
        `, { count: 'exact' })

      // Filtro por texto de búsqueda
      if (q)
        query = query.or(`titulo.ilike.%${q}%,referencia.ilike.%${q}%,descripcion.ilike.%${q}%`)

      // Filtro por color
      if (colorId)
        query = query.eq('color_id', colorId)

      // Filtro por estado
      if (estado)
        query = query.eq('estado', estado)

      // Sorting
      if (sortBy.length > 0) {
        const sort = sortBy[0]

        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }
      else {
        query = query.order('created_at', { ascending: false })
      }

      // Pagination
      if (itemsPerPage !== -1) {
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1

        query = query.range(from, to)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching pedidos:', error)
        throw error
      }

      return {
        pedidos: data as Pedido[],
        totalPedidos: count || 0,
      }
    },

    // 👉 Fetch un pedido por ID
    async fetchPedidoById(id: string) {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          color_oro:colores_oro(id, nombre),
          responsable:profiles!pedidos_responsable_id_fkey(id, nombre, apellido),
          cliente:profiles!pedidos_cliente_id_fkey(id, nombre, apellido),
          diseno:disenos_3d!pedidos_id_diseno_fkey(id, referencia, titulo)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching pedido:', error)
        throw error
      }

      return data as Pedido
    },

    // 👉 Crear Pedido (usa RPC para atomicidad con diseño)
    async addPedido(pedidoData: Partial<Pedido>, imageFile?: File | null) {
      let imagePath: string | null = null

      // Upload de imagen si se proporciona
      if (imageFile)
        imagePath = await this.uploadImage(imageFile)

      const { data, error } = await supabase.rpc('create_pedido_con_diseno', {
        p_fecha_inicio: pedidoData.fecha_inicio,
        p_fecha_fin: pedidoData.fecha_fin,
        p_titulo: pedidoData.titulo,
        p_descripcion: pedidoData.descripcion || null,
        p_talla: pedidoData.talla || null,
        p_peso: pedidoData.peso || null,
        p_color_id: pedidoData.color_id,
        p_responsable_id: pedidoData.responsable_id,
        p_cliente_id: pedidoData.cliente_id,
        p_tiene_diseno: pedidoData.tiene_diseno || false,
        p_peso_final: pedidoData.peso_final || 0,
        p_precio_gramo: pedidoData.precio_gramo || 0,
        p_precio_adicionales: pedidoData.precio_adicionales || 0,
        p_descripcion_adicionales: pedidoData.descripcion_adicionales || null,
        p_total_pedido: pedidoData.total_pedido || 0,
        p_estado: pedidoData.estado || 'pendiente_fabricar',
        p_imagen: imagePath,
      })

      if (error) {
        console.error('Error creating pedido:', error)

        // Si falla y se subió imagen, limpiar
        if (imagePath)
          await this.deleteImage(imagePath)

        throw error
      }

      return data
    },

    // 👉 Actualizar Pedido
    async updatePedido(id: string, pedidoData: Partial<Pedido>, imageFile?: File | null, removeImage?: boolean) {
      let imagePath = pedidoData.imagen || null

      // Si se quiere eliminar la imagen actual
      if (removeImage && imagePath) {
        await this.deleteImage(imagePath)
        imagePath = null
      }

      // Si se sube una nueva imagen
      if (imageFile) {
        // Borrar la imagen anterior si existe
        if (pedidoData.imagen)
          await this.deleteImage(pedidoData.imagen)

        imagePath = await this.uploadImage(imageFile)
      }

      const { data, error } = await supabase.rpc('update_pedido', {
        p_id: id,
        p_fecha_inicio: pedidoData.fecha_inicio,
        p_fecha_fin: pedidoData.fecha_fin,
        p_titulo: pedidoData.titulo,
        p_descripcion: pedidoData.descripcion || null,
        p_talla: pedidoData.talla || null,
        p_peso: pedidoData.peso || null,
        p_color_id: pedidoData.color_id,
        p_responsable_id: pedidoData.responsable_id,
        p_cliente_id: pedidoData.cliente_id,
        p_tiene_diseno: pedidoData.tiene_diseno || false,
        p_id_diseno: pedidoData.id_diseno || null,
        p_peso_final: pedidoData.peso_final || 0,
        p_precio_gramo: pedidoData.precio_gramo || 0,
        p_precio_adicionales: pedidoData.precio_adicionales || 0,
        p_descripcion_adicionales: pedidoData.descripcion_adicionales || null,
        p_total_pedido: pedidoData.total_pedido || 0,
        p_estado: pedidoData.estado || 'pendiente_fabricar',
        p_imagen: imagePath,
      })

      if (error) {
        console.error('Error updating pedido:', error)
        throw error
      }

      return data
    },

    // 👉 Eliminar Pedido
    async deletePedido(id: string) {
      // Primero obtener el pedido para saber si tiene imagen
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('imagen')
        .eq('id', id)
        .single()

      // Eliminar imagen del storage si existe
      if (pedido?.imagen)
        await this.deleteImage(pedido.imagen)

      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting pedido:', error)
        throw error
      }

      return true
    },

    // 👉 Upload imagen al bucket (subcarpeta pedidos/)
    async uploadImage(file: File): Promise<string> {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `pedidos/${fileName}`

      const { error } = await supabase.storage
        .from('disenos-imagenes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Error uploading image:', error)
        throw error
      }

      return filePath
    },

    // 👉 Eliminar imagen del bucket
    async deleteImage(filePath: string) {
      const { error } = await supabase.storage
        .from('disenos-imagenes')
        .remove([filePath])

      if (error)
        console.error('Error deleting image:', error)
    },

    // 👉 Obtener URL pública de imagen
    getImageUrl(filePath: string): string {
      const { data } = supabase.storage
        .from('disenos-imagenes')
        .getPublicUrl(filePath)

      return data.publicUrl
    },

    // 👉 Fetch responsables (rol_id = 1)
    async fetchResponsables() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido')
        .eq('rol_id', 1)
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error fetching responsables:', error)
        throw error
      }

      return data || []
    },

    // 👉 Fetch clientes (rol_id = 3)
    async fetchClientes() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido')
        .eq('rol_id', 3)
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error fetching clientes:', error)
        throw error
      }

      return data || []
    },

    // 👉 Fetch colores de oro
    async fetchColores() {
      const { data, error } = await supabase
        .from('colores_oro')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching colores:', error)
        throw error
      }

      return data || []
    },
  },
})
