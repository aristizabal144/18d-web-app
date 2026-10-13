import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export type CarteraEstado = 'todos' | 'con_saldo' | 'al_dia'

export type CarteraOrden = 'cliente' | 'pedidos_count' | 'total_pedidos' | 'total_abonado' | 'saldo_pendiente' | 'porcentaje_cobrado'

export interface CarteraFiltros {
  fechaInicio?: string | null
  fechaFin?: string | null
  clienteId?: string | null
  busqueda?: string | null
}

export interface CarteraPaginacion {
  estado: CarteraEstado
  orden: CarteraOrden
  desc: boolean
  page: number
  itemsPerPage: number
}

export interface CarteraCliente {
  cliente_id: string
  nombre: string
  apellido: string
  total_pedidos: number // Suma total de los pedidos entregados
  total_abonado: number // Suma de todos los abonos
  total_efectivo: number // Abonos en efectivo
  total_transferencia: number // Abonos en transferencia
  saldo_pendiente: number // Lo que aún debe
  pedidos_count: number // Cantidad de pedidos entregados
  pedidos_con_saldo: number // Pedidos entregados que aún tienen saldo
  porcentaje_cobrado: number // 0-100
}

export interface CarteraPedido {
  id: string
  referencia: string
  titulo: string
  fecha_entregado: string | null
  total_pedido: number
  total_abonado: number
  total_efectivo: number
  total_transferencia: number
  saldo_pendiente: number
}

export interface CarteraStats {
  total_facturado: number
  total_recaudado: number
  total_efectivo: number
  total_transferencia: number
  total_pendiente: number
  total_pedidos: number
  pedidos_con_saldo: number
  total_clientes: number
  clientes_con_saldo: number
  clientes_al_dia: number
}

export const CARTERA_STATS_VACIAS: CarteraStats = {
  total_facturado: 0,
  total_recaudado: 0,
  total_efectivo: 0,
  total_transferencia: 0,
  total_pendiente: 0,
  total_pedidos: 0,
  pedidos_con_saldo: 0,
  total_clientes: 0,
  clientes_con_saldo: 0,
  clientes_al_dia: 0,
}

// PostgREST limita las respuestas a 1000 filas por petición
const LOTE_MAXIMO = 1000

const paramsFiltros = (f: CarteraFiltros) => ({
  p_desde: f.fechaInicio || null,
  p_hasta: f.fechaFin || null,
  p_cliente_id: f.clienteId || null,
  p_busqueda: f.busqueda?.trim() || null,
})

const aCliente = (row: any): CarteraCliente => ({
  cliente_id: row.cliente_id,
  nombre: row.nombre || '',
  apellido: row.apellido || '',
  total_pedidos: Number(row.total_pedidos) || 0,
  total_abonado: Number(row.total_abonado) || 0,
  total_efectivo: Number(row.total_efectivo) || 0,
  total_transferencia: Number(row.total_transferencia) || 0,
  saldo_pendiente: Number(row.saldo_pendiente) || 0,
  pedidos_count: Number(row.pedidos_count) || 0,
  pedidos_con_saldo: Number(row.pedidos_con_saldo) || 0,
  porcentaje_cobrado: Number(row.porcentaje_cobrado) || 0,
})

export const useCarteraStore = defineStore('CarteraStore', {
  actions: {
    // Resumen global de cartera (pedidos entregados) calculado en el servidor
    async fetchCarteraStats(filtros: CarteraFiltros): Promise<CarteraStats> {
      const { data, error } = await supabase.rpc('get_cartera_resumen', paramsFiltros(filtros))
      if (error)
        throw error

      const stats = { ...CARTERA_STATS_VACIAS }
      for (const key of Object.keys(stats) as (keyof CarteraStats)[])
        stats[key] = Number((data as any)?.[key]) || 0

      return stats
    },

    // Una página de la cartera agrupada por cliente
    async fetchCarteraByCliente(
      filtros: CarteraFiltros,
      pag: CarteraPaginacion,
    ): Promise<{ items: CarteraCliente[]; total: number }> {
      const { data, error } = await supabase.rpc('get_cartera_clientes', {
        ...paramsFiltros(filtros),
        p_estado: pag.estado,
        p_orden: pag.orden,
        p_desc: pag.desc,
        p_limit: pag.itemsPerPage,
        p_offset: (pag.page - 1) * pag.itemsPerPage,
      })

      if (error)
        throw error

      const rows = (data || []) as any[]

      return {
        items: rows.map(aCliente),
        total: rows.length ? Number(rows[0].total_count) : 0,
      }
    },

    // Toda la cartera filtrada (para imprimir), descargada por lotes
    async fetchCarteraCompleta(
      filtros: CarteraFiltros,
      orden: Omit<CarteraPaginacion, 'page' | 'itemsPerPage'>,
    ): Promise<CarteraCliente[]> {
      const resultado: CarteraCliente[] = []
      let page = 1
      let total = Number.POSITIVE_INFINITY

      while (resultado.length < total) {
        const lote = await this.fetchCarteraByCliente(filtros, { ...orden, page, itemsPerPage: LOTE_MAXIMO })

        total = lote.total
        resultado.push(...lote.items)
        if (lote.items.length < LOTE_MAXIMO)
          break
        page++
      }

      return resultado
    },

    // Detalle de pedidos por cliente
    async fetchPedidosByCliente(clienteId: string, filtros: CarteraFiltros): Promise<CarteraPedido[]> {
      const { data, error } = await supabase.rpc('get_cartera_pedidos_cliente', {
        p_cliente_id: clienteId,
        p_desde: filtros.fechaInicio || null,
        p_hasta: filtros.fechaFin || null,
      })

      if (error)
        throw error

      return ((data || []) as any[]).map(p => ({
        id: p.id,
        referencia: p.referencia,
        titulo: p.titulo,
        fecha_entregado: p.fecha_entregado,
        total_pedido: Number(p.total_pedido) || 0,
        total_abonado: Number(p.total_abonado) || 0,
        total_efectivo: Number(p.total_efectivo) || 0,
        total_transferencia: Number(p.total_transferencia) || 0,
        saldo_pendiente: Number(p.saldo_pendiente) || 0,
      }))
    },

    // Pedidos adeudados (saldo > 0) con detalle completo para el reporte PDF del cliente
    async fetchPedidosAdeudadosDetallados(clienteId: string) {
      const saldos = await this.fetchPedidosByCliente(clienteId, {})
      const adeudados = saldos.filter(p => p.saldo_pendiente > 0)
      if (adeudados.length === 0)
        return []

      const ids = adeudados.map(p => p.id)

      const [pedidosRes, abonosRes] = await Promise.all([
        supabase
          .from('pedidos')
          .select(`
            *,
            cliente:profiles!pedidos_cliente_id_fkey(id, nombre, apellido),
            color_oro:colores_oro(id, nombre)
          `)
          .in('id', ids)
          .order('fecha_entregado', { ascending: false }),
        supabase
          .from('abonos')
          .select('*')
          .in('pedido_id', ids)
          .order('fecha', { ascending: true }),
      ])

      if (pedidosRes.error)
        throw pedidosRes.error

      const saldoPorId = new Map(adeudados.map(p => [p.id, p]))

      const abonosPorPedido = new Map<string, any[]>()
      for (const a of abonosRes.data || []) {
        const lista = abonosPorPedido.get(a.pedido_id) || []

        lista.push(a)
        abonosPorPedido.set(a.pedido_id, lista)
      }

      return (pedidosRes.data || []).map((p: any) => ({
        ...p,
        abonos: abonosPorPedido.get(p.id) || [],
        total_abonado: saldoPorId.get(p.id)?.total_abonado || 0,
        saldo_pendiente: saldoPorId.get(p.id)?.saldo_pendiente || 0,
      }))
    },
  },
})
