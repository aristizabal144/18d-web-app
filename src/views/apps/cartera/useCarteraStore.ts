import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export interface CarteraCliente {
  cliente_id: string
  nombre: string
  apellido: string
  total_pedidos: number        // Suma total de los pedidos entregados
  total_abonado: number        // Suma de todos los abonos
  total_efectivo: number       // Abonos en efectivo
  total_transferencia: number  // Abonos en transferencia
  saldo_pendiente: number      // Lo que aún debe
  pedidos_count: number        // Cantidad de pedidos entregados con saldo
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
  cliente_nombre: string
  cliente_apellido: string
  cliente_id: string
}

export interface CarteraStats {
  total_facturado: number
  total_recaudado: number
  total_efectivo_mes: number
  total_transferencia_mes: number
  total_pendiente: number
  clientes_con_saldo: number
}

export const useCarteraStore = defineStore('CarteraStore', {
  actions: {
    // Obtener resumen global de cartera (pedidos entregados)
    async fetchCarteraStats(fechaInicio?: string | null, fechaFin?: string | null): Promise<CarteraStats> {
      // 1. Pedidos entregados en el rango
      let pedidosQuery = supabase
        .from('pedidos')
        .select('id, total_pedido')
        .eq('estado', 'entregado')

      if (fechaInicio)
        pedidosQuery = pedidosQuery.gte('fecha_entregado', fechaInicio)
      if (fechaFin)
        pedidosQuery = pedidosQuery.lte('fecha_entregado', fechaFin)

      const { data: pedidos, error: pedErr } = await pedidosQuery
      if (pedErr) throw pedErr

      const pedidoIds = pedidos?.map(p => p.id) || []
      const totalFacturado = pedidos?.reduce((s, p) => s + (p.total_pedido || 0), 0) || 0

      if (pedidoIds.length === 0) {
        return {
          total_facturado: totalFacturado,
          total_recaudado: 0,
          total_efectivo_mes: 0,
          total_transferencia_mes: 0,
          total_pendiente: 0,
          clientes_con_saldo: 0,
        }
      }

      // 2. Abonos de esos pedidos
      const { data: abonos, error: abonosErr } = await supabase
        .from('abonos')
        .select('pedido_id, valor, tipo_pago')
        .in('pedido_id', pedidoIds)

      if (abonosErr) throw abonosErr

      const totalRecaudado = abonos?.reduce((s, a) => s + (a.valor || 0), 0) || 0
      const totalEfectivo = abonos?.filter(a => a.tipo_pago === 'efectivo').reduce((s, a) => s + a.valor, 0) || 0
      const totalTransferencia = abonos?.filter(a => a.tipo_pago === 'transferencia').reduce((s, a) => s + a.valor, 0) || 0

      // 3. Clientes con saldo pendiente
      const saldosPorPedido = new Map<string, number>()
      pedidos?.forEach(p => {
        const abonado = abonos?.filter(a => a.pedido_id === p.id).reduce((s, a) => s + a.valor, 0) || 0
        saldosPorPedido.set(p.id, (p.total_pedido || 0) - abonado)
      })

      // Contar pedidos con saldo > 0 y obtener clientes únicos
      const { data: pedidosConCliente } = await supabase
        .from('pedidos')
        .select('id, cliente_id')
        .in('id', pedidoIds)

      const clientesConSaldo = new Set<string>()
      pedidosConCliente?.forEach(p => {
        if ((saldosPorPedido.get(p.id) || 0) > 0)
          clientesConSaldo.add(p.cliente_id)
      })

      return {
        total_facturado: totalFacturado,
        total_recaudado: totalRecaudado,
        total_efectivo_mes: totalEfectivo,
        total_transferencia_mes: totalTransferencia,
        total_pendiente: totalFacturado - totalRecaudado,
        clientes_con_saldo: clientesConSaldo.size,
      }
    },

    // Obtener cartera agrupada por cliente
    async fetchCarteraByCliente(
      fechaInicio?: string | null,
      fechaFin?: string | null,
      clienteId?: string | null,
    ): Promise<CarteraCliente[]> {
      let pedidosQuery = supabase
        .from('pedidos')
        .select(`
          id,
          total_pedido,
          cliente_id,
          cliente:profiles!pedidos_cliente_id_fkey(id, nombre, apellido)
        `)
        .eq('estado', 'entregado')

      if (fechaInicio)
        pedidosQuery = pedidosQuery.gte('fecha_entregado', fechaInicio)
      if (fechaFin)
        pedidosQuery = pedidosQuery.lte('fecha_entregado', fechaFin)
      if (clienteId)
        pedidosQuery = pedidosQuery.eq('cliente_id', clienteId)

      const { data: pedidos, error: pedErr } = await pedidosQuery
      if (pedErr) throw pedErr
      if (!pedidos || pedidos.length === 0) return []

      const pedidoIds = pedidos.map(p => p.id)

      const { data: abonos, error: abonosErr } = await supabase
        .from('abonos')
        .select('pedido_id, valor, tipo_pago')
        .in('pedido_id', pedidoIds)

      if (abonosErr) throw abonosErr

      // Agrupar por cliente
      const clienteMap = new Map<string, CarteraCliente>()
      pedidos.forEach((p: any) => {
        const cid = p.cliente_id
        const cliente = p.cliente as { id: string; nombre: string; apellido: string }

        const abonosPedido = abonos?.filter(a => a.pedido_id === p.id) || []
        const totalAbonado = abonosPedido.reduce((s, a) => s + a.valor, 0)
        const totalEfectivo = abonosPedido.filter(a => a.tipo_pago === 'efectivo').reduce((s, a) => s + a.valor, 0)
        const totalTransferencia = abonosPedido.filter(a => a.tipo_pago === 'transferencia').reduce((s, a) => s + a.valor, 0)
        const saldo = (p.total_pedido || 0) - totalAbonado

        if (!clienteMap.has(cid)) {
          clienteMap.set(cid, {
            cliente_id: cid,
            nombre: cliente?.nombre || '',
            apellido: cliente?.apellido || '',
            total_pedidos: 0,
            total_abonado: 0,
            total_efectivo: 0,
            total_transferencia: 0,
            saldo_pendiente: 0,
            pedidos_count: 0,
          })
        }

        const entry = clienteMap.get(cid)!
        entry.total_pedidos += p.total_pedido || 0
        entry.total_abonado += totalAbonado
        entry.total_efectivo += totalEfectivo
        entry.total_transferencia += totalTransferencia
        entry.saldo_pendiente += saldo
        entry.pedidos_count += 1
      })

      return Array.from(clienteMap.values()).sort((a, b) => b.saldo_pendiente - a.saldo_pendiente)
    },

    // Detalle de pedidos por cliente
    async fetchPedidosByCliente(
      clienteId: string,
      fechaInicio?: string | null,
      fechaFin?: string | null,
    ): Promise<CarteraPedido[]> {
      let query = supabase
        .from('pedidos')
        .select(`
          id, referencia, titulo, fecha_entregado, total_pedido, cliente_id,
          cliente:profiles!pedidos_cliente_id_fkey(nombre, apellido)
        `)
        .eq('estado', 'entregado')
        .eq('cliente_id', clienteId)
        .order('fecha_entregado', { ascending: false })

      if (fechaInicio)
        query = query.gte('fecha_entregado', fechaInicio)
      if (fechaFin)
        query = query.lte('fecha_entregado', fechaFin)

      const { data: pedidos, error } = await query
      if (error) throw error
      if (!pedidos || pedidos.length === 0) return []

      const pedidoIds = pedidos.map(p => p.id)
      const { data: abonos } = await supabase
        .from('abonos')
        .select('pedido_id, valor, tipo_pago')
        .in('pedido_id', pedidoIds)

      return pedidos.map((p: any) => {
        const abonosPedido = abonos?.filter(a => a.pedido_id === p.id) || []
        const totalAbonado = abonosPedido.reduce((s, a) => s + a.valor, 0)
        const totalEfectivo = abonosPedido.filter(a => a.tipo_pago === 'efectivo').reduce((s, a) => s + a.valor, 0)
        const totalTransferencia = abonosPedido.filter(a => a.tipo_pago === 'transferencia').reduce((s, a) => s + a.valor, 0)
        return {
          id: p.id,
          referencia: p.referencia,
          titulo: p.titulo,
          fecha_entregado: p.fecha_entregado,
          total_pedido: p.total_pedido || 0,
          total_abonado: totalAbonado,
          total_efectivo: totalEfectivo,
          total_transferencia: totalTransferencia,
          saldo_pendiente: (p.total_pedido || 0) - totalAbonado,
          cliente_id: p.cliente_id,
          cliente_nombre: p.cliente?.nombre || '',
          cliente_apellido: p.cliente?.apellido || '',
        }
      })
    },

    // Fetch pedidos adeudados con detalle completo para reporte de cliente
    async fetchPedidosAdeudadosDetallados(clienteId: string) {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:profiles!pedidos_cliente_id_fkey(id, nombre, apellido),
          color_oro:colores_oro(id, nombre)
        `)
        .eq('estado', 'entregado')
        .eq('cliente_id', clienteId)
        .order('fecha_entregado', { ascending: false })

      if (error) throw error
      if (!pedidos || pedidos.length === 0) return []

      const pedidoIds = pedidos.map(p => p.id)
      const { data: abonos } = await supabase
        .from('abonos')
        .select('*')
        .in('pedido_id', pedidoIds)
        .order('fecha', { ascending: true })

      const result = pedidos.map((p: any) => {
        const abonosPedido = abonos?.filter(a => a.pedido_id === p.id) || []
        const totalAbonado = abonosPedido.reduce((s, a) => s + (a.valor || 0), 0)
        const saldoPendiente = (p.total_pedido || 0) - totalAbonado
        return {
          ...p,
          abonos: abonosPedido,
          total_abonado: totalAbonado,
          saldo_pendiente: saldoPendiente,
        }
      })

      // Retornar ÚNICAMENTE pedidos con saldo adeudado (> 0)
      return result.filter(p => p.saldo_pendiente > 0)
    },

    // Fetch clientes para filtro
    async fetchClientes() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido')
        .eq('rol_id', 3)
        .order('nombre', { ascending: true })

      if (error) throw error
      return data || []
    },
  },
})
