import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export interface Gasto {
  id: string
  fecha: string
  descripcion: string
  tipo_pago: 'efectivo' | 'transferencia'
  valor: number
  created_at: string
}

export interface GastoStats {
  totalMesActual: number
  totalMesAnterior: number
  totalEfectivo: number
  totalTransferencia: number
  cantidadTransacciones: number
  variacionPorcentaje: number
}

interface FetchGastosParams {
  q?: string
  fechaInicio?: string | null
  fechaFin?: string | null
  tipoPago?: string | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export const useGastosStore = defineStore('GastosStore', {
  actions: {
    // 👉 Fetch gastos con paginación y filtros
    async fetchGastos(params: FetchGastosParams) {
      const { q = '', fechaInicio = null, fechaFin = null, tipoPago = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('gastos')
        .select('*', { count: 'exact' })

      // Filtro por texto (descripción)
      if (q)
        query = query.ilike('descripcion', `%${q}%`)

      // Filtro por tipo de pago
      if (tipoPago)
        query = query.eq('tipo_pago', tipoPago)

      // Filtro por rango de fechas
      if (fechaInicio)
        query = query.gte('fecha', fechaInicio)
      if (fechaFin)
        query = query.lte('fecha', fechaFin)

      // Ordenamiento
      if (sortBy.length > 0) {
        const sort = sortBy[0]

        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }
      else {
        query = query.order('fecha', { ascending: false }).order('created_at', { ascending: false })
      }

      // Paginación
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        gastos: data as Gasto[],
        totalGastos: count || 0,
      }
    },

    // 👉 Fetch todos los gastos de un rango de fechas (para reporte)
    async fetchGastosReport(fechaInicio: string, fechaFin: string) {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      return data as Gasto[]
    },

    // 👉 Estadísticas mensuales para las cards
    async fetchStats(): Promise<GastoStats> {
      const now = new Date()

      // Mes actual
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0]

      // Mes anterior
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().split('T')[0]
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString().split('T')[0]

      const [currentRes, lastRes] = await Promise.all([
        supabase
          .from('gastos')
          .select('valor, tipo_pago')
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth),
        supabase
          .from('gastos')
          .select('valor')
          .gte('fecha', startOfLastMonth)
          .lte('fecha', endOfLastMonth),
      ])

      if (currentRes.error) throw currentRes.error
      if (lastRes.error) throw lastRes.error

      const currentData = currentRes.data || []
      const lastData = lastRes.data || []

      const totalMesActual = currentData.reduce((sum, g) => sum + g.valor, 0)
      const totalMesAnterior = lastData.reduce((sum, g) => sum + g.valor, 0)
      const totalEfectivo = currentData.filter(g => g.tipo_pago === 'efectivo').reduce((sum, g) => sum + g.valor, 0)
      const totalTransferencia = currentData.filter(g => g.tipo_pago === 'transferencia').reduce((sum, g) => sum + g.valor, 0)
      const cantidadTransacciones = currentData.length

      const variacionPorcentaje = totalMesAnterior === 0
        ? (totalMesActual > 0 ? 100 : 0)
        : Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100)

      return {
        totalMesActual,
        totalMesAnterior,
        totalEfectivo,
        totalTransferencia,
        cantidadTransacciones,
        variacionPorcentaje,
      }
    },

    // 👉 Crear gasto
    async addGasto(gasto: Omit<Gasto, 'id' | 'created_at'>) {
      const { data, error } = await supabase
        .from('gastos')
        .insert(gasto)
        .select()
        .single()

      if (error) throw error

      return data as Gasto
    },

    // 👉 Actualizar gasto
    async updateGasto(id: string, updates: Partial<Omit<Gasto, 'id' | 'created_at'>>) {
      const { data, error } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data as Gasto
    },

    // 👉 Eliminar gasto
    async deleteGasto(id: string) {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
  },
})
