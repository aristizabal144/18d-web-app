import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface Factura3dItem {
  id?: string
  factura_id?: string
  nombre_molde: string
  precio: number
  peso: number
}

export interface Factura3d {
  id: string
  numero: number
  fecha: string
  cliente_id: string | null
  estado: 'pendiente' | 'pagado'
  total: number
  peso_total: number
  notas?: string | null
  created_at?: string
  updated_at?: string
  cliente?: { id: string; nombre: string; apellido: string } | null
  items?: Factura3dItem[]
}

export interface Factura3dStats {
  totalMes: number
  pesoTotalMes: number
  cantidadFacturasMes: number
  montoPendiente: number
  cantidadPendientes: number
  totalMesAnterior: number
  variacionPorcentaje: number
}

export interface ReporteDiario {
  fecha: string
  total: number
  peso: number
  cantidad: number
}

export interface TopCliente {
  cliente_id: string | null
  nombre: string
  apellido: string
  totalFacturas: number
  totalPeso: number
  totalMonto: number
}

interface FetchFacturasParams {
  q?: string
  fechaInicio?: string | null
  fechaFin?: string | null
  estado?: string | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useFacturas3dStore = defineStore('Facturas3dStore', {
  actions: {

    // 👉 Fetch facturas con paginación y filtros
    async fetchFacturas(params: FetchFacturasParams = {}) {
      const { q = '', fechaInicio = null, fechaFin = null, estado = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('facturas_3d')
        .select(`
          *,
          cliente:profiles(id, nombre, apellido),
          items:facturas_3d_items(*)
        `, { count: 'exact' })

      if (q)
        query = query.ilike('notas', `%${q}%`)

      if (estado)
        query = query.eq('estado', estado)

      if (fechaInicio)
        query = query.gte('fecha', fechaInicio)

      if (fechaFin)
        query = query.lte('fecha', fechaFin)

      if (sortBy.length > 0) {
        const sort = sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }
      else {
        query = query.order('fecha', { ascending: false }).order('created_at', { ascending: false })
      }

      if (itemsPerPage !== -1) {
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        facturas: (data || []) as Factura3d[],
        totalFacturas: count || 0,
      }
    },

    // 👉 Crear factura con ítems
    async createFactura(payload: {
      fecha: string
      cliente_id: string | null
      notas?: string
      items: Omit<Factura3dItem, 'id' | 'factura_id'>[]
    }) {
      // Calcular totales: total es la suma de (precio * peso) de cada ítem
      const total = payload.items.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.peso || 0)), 0)
      const peso_total = payload.items.reduce((sum, item) => sum + Number(item.peso || 0), 0)

      // Crear cabecera
      const { data: factura, error: facturaError } = await supabase
        .from('facturas_3d')
        .insert({
          fecha: payload.fecha,
          cliente_id: payload.cliente_id || null,
          notas: payload.notas || null,
          total,
          peso_total,
          estado: 'pendiente',
        })
        .select()
        .single()

      if (facturaError) throw facturaError

      // Crear ítems
      if (payload.items.length > 0) {
        const itemsToInsert = payload.items.map(item => ({
          factura_id: factura.id,
          nombre_molde: item.nombre_molde,
          precio: Number(item.precio || 55000),
          peso: Number(item.peso || 0),
        }))

        const { error: itemsError } = await supabase
          .from('facturas_3d_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      return factura as Factura3d
    },

    // 👉 Actualizar estado (pendiente ↔ pagado)
    async updateEstado(id: string, estado: 'pendiente' | 'pagado') {
      const { data, error } = await supabase
        .from('facturas_3d')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data as Factura3d
    },

    // 👉 Eliminar factura (cascade borra los ítems)
    async deleteFactura(id: string) {
      const { error } = await supabase
        .from('facturas_3d')
        .delete()
        .eq('id', id)

      if (error) throw error
    },

    // 👉 Fetch clientes
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

    // 👉 Estadísticas del mes para KPI cards
    async fetchStats(): Promise<Factura3dStats> {
      const now = new Date()

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split('T')[0]

      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().split('T')[0]
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString().split('T')[0]

      const [currentRes, lastRes, pendientesRes] = await Promise.all([
        supabase
          .from('facturas_3d')
          .select('total, peso_total, estado')
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth),
        supabase
          .from('facturas_3d')
          .select('total')
          .gte('fecha', startOfLastMonth)
          .lte('fecha', endOfLastMonth),
        supabase
          .from('facturas_3d')
          .select('total')
          .eq('estado', 'pendiente'),
      ])

      if (currentRes.error) throw currentRes.error
      if (lastRes.error) throw lastRes.error
      if (pendientesRes.error) throw pendientesRes.error

      const currentData = currentRes.data || []
      const lastData = lastRes.data || []
      const pendientesData = pendientesRes.data || []

      const totalMes = currentData.reduce((sum, f) => sum + Number(f.total || 0), 0)
      const pesoTotalMes = currentData.reduce((sum, f) => sum + Number(f.peso_total || 0), 0)
      const cantidadFacturasMes = currentData.length
      const montoPendiente = pendientesData.reduce((sum, f) => sum + Number(f.total || 0), 0)
      const cantidadPendientes = pendientesData.length
      const totalMesAnterior = lastData.reduce((sum, f) => sum + Number(f.total || 0), 0)

      const variacionPorcentaje = totalMesAnterior === 0
        ? (totalMes > 0 ? 100 : 0)
        : Math.round(((totalMes - totalMesAnterior) / totalMesAnterior) * 100)

      return {
        totalMes,
        pesoTotalMes,
        cantidadFacturasMes,
        montoPendiente,
        cantidadPendientes,
        totalMesAnterior,
        variacionPorcentaje,
      }
    },

    // 👉 Datos diarios para el informe mensual
    async fetchReporteMensual(year: number, month: number): Promise<{
      dailyData: ReporteDiario[]
      topClientes: TopCliente[]
      facturasPendientes: Factura3d[]
    }> {
      const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

      const [factRes] = await Promise.all([
        supabase
          .from('facturas_3d')
          .select(`
            id, numero, fecha, total, peso_total, estado, cliente_id,
            cliente:profiles(id, nombre, apellido),
            items:facturas_3d_items(*)
          `)
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth)
          .order('fecha', { ascending: true }),
      ])

      if (factRes.error) throw factRes.error

      const facturas = (factRes.data || []) as Factura3d[]

      // --- Datos diarios ---
      const dailyMap = new Map<string, ReporteDiario>()
      facturas.forEach(f => {
        const key = f.fecha
        const existing = dailyMap.get(key) || { fecha: key, total: 0, peso: 0, cantidad: 0 }
        existing.total += Number(f.total || 0)
        existing.peso += Number(f.peso_total || 0)
        existing.cantidad += 1
        dailyMap.set(key, existing)
      })
      const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))

      // --- Top clientes ---
      const clienteMap = new Map<string, TopCliente>()
      facturas.forEach(f => {
        const key = f.cliente_id || 'sin-cliente'
        const existing = clienteMap.get(key) || {
          cliente_id: f.cliente_id,
          nombre: f.cliente?.nombre || 'Sin cliente',
          apellido: f.cliente?.apellido || '',
          totalFacturas: 0,
          totalPeso: 0,
          totalMonto: 0,
        }
        existing.totalFacturas += 1
        existing.totalPeso += Number(f.peso_total || 0)
        existing.totalMonto += Number(f.total || 0)
        clienteMap.set(key, existing)
      })
      const topClientes = Array.from(clienteMap.values())
        .sort((a, b) => b.totalMonto - a.totalMonto)
        .slice(0, 5)

      // --- Facturas pendientes del mes ---
      const facturasPendientes = facturas.filter(f => f.estado === 'pendiente')

      return { dailyData, topClientes, facturasPendientes }
    },
  },
})
