import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export type EstadoArreglo = 'pendiente' | 'cancelado'
export type TipoPagoArreglo = 'efectivo' | 'transferencia'

export interface ClienteArreglo {
  id: string
  nombre: string
  apellido: string
  telefono?: string | null
}

export interface Arreglo {
  id: string
  fecha: string
  cantidad: number
  descripcion: string
  valor: number
  cliente_id?: string | null
  estado: EstadoArreglo
  fecha_pago?: string | null
  tipo_pago?: TipoPagoArreglo | null
  notas?: string | null
  created_at?: string
  updated_at?: string
  cliente?: ClienteArreglo | null
}

export type ArregloPayload = Pick<Arreglo, 'fecha' | 'cantidad' | 'descripcion' | 'valor' | 'cliente_id' | 'estado' | 'fecha_pago' | 'tipo_pago' | 'notas'>

export interface DatosPago {
  fecha_pago: string
  tipo_pago: TipoPagoArreglo
}

export interface ArregloResumen {
  total_pendiente: number
  cantidad_pendientes: number
  cantidad_cancelados: number
  cantidad_total: number
  clientes_con_deuda: number
  total_vencido: number
  cantidad_vencidos: number
  cobrado_mes: number
  cobrado_mes_efectivo: number
  cobrado_mes_transferencia: number
  total_mes: number
  cantidad_mes: number
  piezas_mes: number
  total_mes_anterior: number
  total_historico: number
}

export const ARREGLO_RESUMEN_VACIO: ArregloResumen = {
  total_pendiente: 0,
  cantidad_pendientes: 0,
  cantidad_cancelados: 0,
  cantidad_total: 0,
  clientes_con_deuda: 0,
  total_vencido: 0,
  cantidad_vencidos: 0,
  cobrado_mes: 0,
  cobrado_mes_efectivo: 0,
  cobrado_mes_transferencia: 0,
  total_mes: 0,
  cantidad_mes: 0,
  piezas_mes: 0,
  total_mes_anterior: 0,
  total_historico: 0,
}

export interface ArregloDeudor {
  cliente_id: string
  nombre: string | null
  apellido: string | null
  telefono: string | null
  cantidad: number
  piezas: number
  total: number
  fecha_mas_antigua: string
  dias_mas_antiguo: number
}

export const DIAS_VENCIMIENTO_ARREGLO = 30

interface FetchArreglosParams {
  q?: string
  fechaInicio?: string | null
  fechaFin?: string | null
  clienteId?: string | null
  estado?: EstadoArreglo | null
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

const SELECT_ARREGLO = '*, cliente:profiles(id, nombre, apellido, telefono)'

export const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const normalizarResumen = (data: Record<string, unknown> | null): ArregloResumen => {
  const resumen = { ...ARREGLO_RESUMEN_VACIO }

  for (const clave of Object.keys(resumen) as (keyof ArregloResumen)[])
    resumen[clave] = Number(data?.[clave] ?? 0)

  return resumen
}

export const useArreglosStore = defineStore('ArreglosStore', {
  actions: {
    // 👉 Fetch arreglos con paginación y filtros
    async fetchArreglos(params: FetchArreglosParams = {}) {
      const { q = '', fechaInicio = null, fechaFin = null, clienteId = null, estado = null, options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('arreglos')
        .select(SELECT_ARREGLO, { count: 'exact' })

      if (q)
        query = query.ilike('descripcion', `%${q}%`)

      if (clienteId)
        query = query.eq('cliente_id', clienteId)

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

      if (error)
        throw error

      return {
        arreglos: (data || []) as Arreglo[],
        totalArreglos: count || 0,
      }
    },

    // 👉 Arreglos de un rango de fechas (reporte PDF por fechas)
    async fetchArreglosReport(fechaInicio: string, fechaFin: string, estado: EstadoArreglo | null = null) {
      let query = supabase
        .from('arreglos')
        .select(SELECT_ARREGLO)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)

      if (estado)
        query = query.eq('estado', estado)

      const { data, error } = await query
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true })

      if (error)
        throw error

      return (data || []) as Arreglo[]
    },

    // 👉 Arreglos pendientes de un cliente (cuenta de cobro)
    async fetchPendientesCliente(clienteId: string) {
      const { data, error } = await supabase
        .from('arreglos')
        .select(SELECT_ARREGLO)
        .eq('cliente_id', clienteId)
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: true })
        .order('created_at', { ascending: true })

      if (error)
        throw error

      return (data || []) as Arreglo[]
    },

    // 👉 Resumen global calculado en el servidor
    async fetchResumen(): Promise<ArregloResumen> {
      const { data, error } = await supabase.rpc('get_arreglos_resumen', {
        p_hoy: toLocalDateStr(new Date()),
        p_dias_vencimiento: DIAS_VENCIMIENTO_ARREGLO,
      })

      if (error)
        throw error

      return normalizarResumen(data as Record<string, unknown> | null)
    },

    // 👉 Clientes con arreglos por cobrar, de mayor a menor deuda
    async fetchDeudores(): Promise<ArregloDeudor[]> {
      const { data, error } = await supabase.rpc('get_arreglos_deudores', {
        p_hoy: toLocalDateStr(new Date()),
      })

      if (error)
        throw error

      return ((data || []) as ArregloDeudor[]).map(d => ({
        ...d,
        cantidad: Number(d.cantidad),
        piezas: Number(d.piezas),
        total: Number(d.total),
        dias_mas_antiguo: Number(d.dias_mas_antiguo),
      }))
    },

    // 👉 Fetch clientes (rol_id = 3)
    async fetchClientes() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, telefono')
        .eq('rol_id', 3)
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error fetching clientes:', error)

        return []
      }

      return (data || []) as ClienteArreglo[]
    },

    // 👉 Crear registro de arreglo
    async addArreglo(arreglo: ArregloPayload) {
      const { data, error } = await supabase
        .from('arreglos')
        .insert({
          fecha: arreglo.fecha,
          cantidad: arreglo.cantidad || 1,
          descripcion: arreglo.descripcion,
          valor: arreglo.valor,
          cliente_id: arreglo.cliente_id || null,
          estado: arreglo.estado,
          fecha_pago: arreglo.estado === 'cancelado' ? arreglo.fecha_pago : null,
          tipo_pago: arreglo.estado === 'cancelado' ? arreglo.tipo_pago : null,
          notas: arreglo.notas || null,
        })
        .select()
        .single()

      if (error)
        throw error

      return data as Arreglo
    },

    // 👉 Actualizar arreglo
    async updateArreglo(id: string, updates: Partial<ArregloPayload>) {
      const cambios: Partial<ArregloPayload> = { ...updates }

      if (cambios.estado === 'pendiente') {
        cambios.fecha_pago = null
        cambios.tipo_pago = null
      }

      const { data, error } = await supabase
        .from('arreglos')
        .update({
          ...cambios,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error)
        throw error

      return data as Arreglo
    },

    // 👉 Marcar varios arreglos como cancelados (pagados)
    async marcarCancelados(ids: string[], pago: DatosPago) {
      if (!ids.length)
        return 0

      const { data, error } = await supabase
        .from('arreglos')
        .update({ estado: 'cancelado', ...pago, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select('id')

      if (error)
        throw error

      return data?.length || 0
    },

    // 👉 Devolver varios arreglos a pendiente
    async marcarPendientes(ids: string[]) {
      if (!ids.length)
        return 0

      const { data, error } = await supabase
        .from('arreglos')
        .update({ estado: 'pendiente', fecha_pago: null, tipo_pago: null, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select('id')

      if (error)
        throw error

      return data?.length || 0
    },

    // 👉 Cancelar todos los arreglos pendientes de un cliente
    async cancelarTodoCliente(clienteId: string, pago: DatosPago) {
      const { data, error } = await supabase
        .from('arreglos')
        .update({ estado: 'cancelado', ...pago, updated_at: new Date().toISOString() })
        .eq('cliente_id', clienteId)
        .eq('estado', 'pendiente')
        .select('id')

      if (error)
        throw error

      return data?.length || 0
    },

    // 👉 Eliminar arreglo
    async deleteArreglo(id: string) {
      const { error } = await supabase
        .from('arreglos')
        .delete()
        .eq('id', id)

      if (error)
        throw error
    },
  },
})
