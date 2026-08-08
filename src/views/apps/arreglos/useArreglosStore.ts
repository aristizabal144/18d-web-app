import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export interface Arreglo {
  id: string
  fecha: string
  cantidad: number
  descripcion: string
  valor: number
  cliente_id?: string | null
  created_at?: string
  updated_at?: string
  cliente?: { id: string; nombre: string; apellido: string } | null
}

export interface ArregloStats {
  totalMesActual: number
  totalMesAnterior: number
  cantidadArreglosMes: number
  cantidadPiezasMes: number
  valorPromedioMes: number
  totalHistorico: number
  variacionPorcentaje: number
}

interface FetchArreglosParams {
  q?: string
  fechaInicio?: string | null
  fechaFin?: string | null
  clienteId?: string | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export const useArreglosStore = defineStore('ArreglosStore', {
  actions: {
    // 👉 Fetch arreglos con paginación y filtros
    async fetchArreglos(params: FetchArreglosParams = {}) {
      const { q = '', fechaInicio = null, fechaFin = null, clienteId = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('arreglos')
        .select(`
          *,
          cliente:profiles(id, nombre, apellido)
        `, { count: 'exact' })

      // Filtro por texto (descripción)
      if (q)
        query = query.ilike('descripcion', `%${q}%`)

      // Filtro por cliente
      if (clienteId)
        query = query.eq('cliente_id', clienteId)

      // Filtro por rango de fechas
      if (fechaInicio)
        query = query.gte('fecha', fechaInicio)
      if (fechaFin)
        query = query.lte('fecha', fechaFin)

      // Ordenamiento
      if (sortBy.length > 0) {
        const sort = sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      } else {
        query = query.order('fecha', { ascending: false }).order('created_at', { ascending: false })
      }

      // Paginación
      if (itemsPerPage !== -1) {
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        arreglos: (data || []) as Arreglo[],
        totalArreglos: count || 0,
      }
    },

    // 👉 Fetch todos los arreglos de un rango de fechas (para reporte PDF)
    async fetchArreglosReport(fechaInicio: string, fechaFin: string) {
      const { data, error } = await supabase
        .from('arreglos')
        .select(`
          *,
          cliente:profiles(id, nombre, apellido)
        `)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []) as Arreglo[]
    },

    // 👉 Estadísticas mensuales para las cards estilo Gastos
    async fetchStats(): Promise<ArregloStats> {
      const now = new Date()

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0]

      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().split('T')[0]
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString().split('T')[0]

      const [currentRes, lastRes, allRes] = await Promise.all([
        supabase
          .from('arreglos')
          .select('valor, cantidad')
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth),
        supabase
          .from('arreglos')
          .select('valor')
          .gte('fecha', startOfLastMonth)
          .lte('fecha', endOfLastMonth),
        supabase
          .from('arreglos')
          .select('valor'),
      ])

      if (currentRes.error) throw currentRes.error
      if (lastRes.error) throw lastRes.error
      if (allRes.error) throw allRes.error

      const currentData = currentRes.data || []
      const lastData = lastRes.data || []
      const allData = allRes.data || []

      const totalMesActual = currentData.reduce((sum, a) => sum + Number(a.valor || 0), 0)
      const totalMesAnterior = lastData.reduce((sum, a) => sum + Number(a.valor || 0), 0)
      const cantidadArreglosMes = currentData.length
      const cantidadPiezasMes = currentData.reduce((sum, a) => sum + Number(a.cantidad || 1), 0)
      const valorPromedioMes = cantidadArreglosMes > 0 ? Math.round(totalMesActual / cantidadArreglosMes) : 0
      const totalHistorico = allData.reduce((sum, a) => sum + Number(a.valor || 0), 0)

      const variacionPorcentaje = totalMesAnterior === 0
        ? (totalMesActual > 0 ? 100 : 0)
        : Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100)

      return {
        totalMesActual,
        totalMesAnterior,
        cantidadArreglosMes,
        cantidadPiezasMes,
        valorPromedioMes,
        totalHistorico,
        variacionPorcentaje,
      }
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
        return []
      }

      return data || []
    },

    // 👉 Crear registro de arreglo
    async addArreglo(arreglo: Omit<Arreglo, 'id' | 'created_at' | 'updated_at' | 'cliente'>) {
      const { data, error } = await supabase
        .from('arreglos')
        .insert({
          fecha: arreglo.fecha,
          cantidad: arreglo.cantidad || 1,
          descripcion: arreglo.descripcion,
          valor: arreglo.valor,
          cliente_id: arreglo.cliente_id || null,
        })
        .select()
        .single()

      if (error) throw error

      return data as Arreglo
    },

    // 👉 Actualizar arreglo
    async updateArreglo(id: string, updates: Partial<Omit<Arreglo, 'id' | 'created_at' | 'updated_at' | 'cliente'>>) {
      const { data, error } = await supabase
        .from('arreglos')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data as Arreglo
    },

    // 👉 Eliminar arreglo
    async deleteArreglo(id: string) {
      const { error } = await supabase
        .from('arreglos')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
  },
})
