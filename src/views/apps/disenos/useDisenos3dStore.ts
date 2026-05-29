import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

interface FetchDisenosParams {
  q?: string
  colorId?: number | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export interface Diseno3d {
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
  precio_diseno: number
  precio_impresion: number
  imagen: string | null
  created_at: string
  // Joined fields
  color_oro?: { id: number; nombre: string }
  responsable?: { id: string; nombre: string; apellido: string }
  cliente?: { id: string; nombre: string; apellido: string }
}

export const useDisenos3dStore = defineStore('Disenos3dStore', {
  actions: {
    // 👉 Fetch Diseños con paginación, búsqueda y filtro de color
    async fetchDisenos(params: FetchDisenosParams) {
      const { q = '', colorId = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('disenos_3d')
        .select(`
          *,
          color_oro:colores_oro(id, nombre),
          responsable:profiles!disenos_3d_responsable_id_fkey(id, nombre, apellido),
          cliente:profiles!disenos_3d_cliente_id_fkey(id, nombre, apellido)
        `, { count: 'exact' })

      // Filtro por texto de búsqueda
      if (q) {
        query = query.or(`titulo.ilike.%${q}%,referencia.ilike.%${q}%,descripcion.ilike.%${q}%`)
      }

      // Filtro por color
      if (colorId) {
        query = query.eq('color_id', colorId)
      }

      // Sorting
      if (sortBy.length > 0) {
        const sort = sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      } else {
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
        console.error('Error fetching diseños:', error)
        throw error
      }

      return {
        disenos: data as Diseno3d[],
        totalDisenos: count || 0,
      }
    },

    // 👉 Fetch un diseño por ID
    async fetchDisenoById(id: string) {
      const { data, error } = await supabase
        .from('disenos_3d')
        .select(`
          *,
          color_oro:colores_oro(id, nombre),
          responsable:profiles!disenos_3d_responsable_id_fkey(id, nombre, apellido),
          cliente:profiles!disenos_3d_cliente_id_fkey(id, nombre, apellido)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching diseño:', error)
        throw error
      }

      return data as Diseno3d
    },

    // 👉 Crear Diseño (con upload de imagen)
    async addDiseno(disenoData: Partial<Diseno3d>, imageFile?: File | null) {
      let imagePath: string | null = null

      // Upload de imagen si se proporciona
      if (imageFile) {
        imagePath = await this.uploadImage(imageFile)
      }

      const { data, error } = await supabase
        .from('disenos_3d')
        .insert({
          referencia: 'TEMP', // El trigger lo reemplazará automáticamente
          fecha_inicio: disenoData.fecha_inicio,
          fecha_fin: disenoData.fecha_fin,
          titulo: disenoData.titulo,
          descripcion: disenoData.descripcion || null,
          talla: disenoData.talla || null,
          peso: disenoData.peso || null,
          color_id: disenoData.color_id,
          responsable_id: disenoData.responsable_id,
          cliente_id: disenoData.cliente_id,
          precio_diseno: disenoData.precio_diseno || 0,
          precio_impresion: disenoData.precio_impresion || 0,
          imagen: imagePath,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating diseño:', error)
        // Si falla la inserción y se subió imagen, limpiar
        if (imagePath) {
          await this.deleteImage(imagePath)
        }
        throw error
      }

      return data
    },

    // 👉 Actualizar Diseño
    async updateDiseno(id: string, disenoData: Partial<Diseno3d>, imageFile?: File | null, removeImage?: boolean) {
      let imagePath = disenoData.imagen || null

      // Si se quiere eliminar la imagen actual
      if (removeImage && imagePath) {
        await this.deleteImage(imagePath)
        imagePath = null
      }

      // Si se sube una nueva imagen
      if (imageFile) {
        // Borrar la imagen anterior si existe
        if (disenoData.imagen) {
          await this.deleteImage(disenoData.imagen)
        }
        imagePath = await this.uploadImage(imageFile)
      }

      const { data, error } = await supabase
        .rpc('update_diseno_3d', {
          p_id: id,
          p_fecha_inicio: disenoData.fecha_inicio,
          p_fecha_fin: disenoData.fecha_fin,
          p_titulo: disenoData.titulo,
          p_descripcion: disenoData.descripcion || null,
          p_talla: disenoData.talla || null,
          p_peso: disenoData.peso || null,
          p_color_id: disenoData.color_id,
          p_responsable_id: disenoData.responsable_id,
          p_cliente_id: disenoData.cliente_id,
          p_precio_diseno: disenoData.precio_diseno || 0,
          p_precio_impresion: disenoData.precio_impresion || 0,
          p_imagen: imagePath,
        })

      if (error) {
        console.error('Error updating diseño:', error)
        throw error
      }

      return data
    },

    // 👉 Eliminar Diseño
    async deleteDiseno(id: string) {
      // Primero obtener el diseño para saber si tiene imagen
      const { data: diseno } = await supabase
        .from('disenos_3d')
        .select('imagen')
        .eq('id', id)
        .single()

      // Eliminar imagen del storage si existe
      if (diseno?.imagen) {
        await this.deleteImage(diseno.imagen)
      }

      const { error } = await supabase
        .from('disenos_3d')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting diseño:', error)
        throw error
      }

      return true
    },

    // 👉 Upload imagen al bucket
    async uploadImage(file: File): Promise<string> {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `disenos/${fileName}`

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

      if (error) {
        console.error('Error deleting image:', error)
      }
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
