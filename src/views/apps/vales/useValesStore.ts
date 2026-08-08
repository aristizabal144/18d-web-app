import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export interface AbonoVale {
  id: string
  vale_id: string
  valor: number
  tipo_pago: 'efectivo' | 'transferencia'
  notas?: string | null
  fecha: string
  created_at?: string
}

export interface Vale {
  id: string
  usuario_id?: string | null
  beneficiario: string
  concepto: string
  monto_total: number
  monto_abonado: number
  saldo_pendiente: number
  estado: 'pendiente' | 'parcial' | 'cancelado'
  fecha_emision: string
  created_at?: string
  updated_at?: string
  usuario?: {
    id: string
    nombre: string
    apellido: string
    email?: string
  } | null
  abonos?: AbonoVale[]
}

export interface FetchValesParams {
  q?: string
  estado?: string
  usuarioId?: string
  fechaInicio?: string
  fechaFin?: string
  options?: {
    page?: number
    itemsPerPage?: number
    sortBy?: { key: string; order: string }[]
  }
}

export interface ResumenVales {
  totalDeudaGlobal: number
  totalMontoEmitido: number
  totalMontoAbonado: number
  cantPendientes: number
  cantValesTotal: number
}

export const useValesStore = defineStore('ValesStore', {
  actions: {
    // 👉 Fetch lista de vales con filtros
    async fetchVales(params: FetchValesParams = {}) {
      const { q = '', estado = '', usuarioId = '', fechaInicio = '', fechaFin = '', options = {} } = params
      const { page = 1, itemsPerPage = 10, sortBy = [] } = options

      let query = supabase
        .from('vales')
        .select(`
          *,
          usuario:profiles(id, nombre, apellido, email),
          abonos:abonos_vales(*)
        `, { count: 'exact' })

      if (q) {
        query = query.or(`beneficiario.ilike.%${q}%,concepto.ilike.%${q}%`)
      }

      if (estado && estado !== 'todos') {
        query = query.eq('estado', estado)
      }

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId)
      }

      if (fechaInicio) {
        query = query.gte('fecha_emision', `${fechaInicio}T00:00:00`)
      }

      if (fechaFin) {
        query = query.lte('fecha_emision', `${fechaFin}T23:59:59`)
      }

      if (sortBy.length > 0) {
        const sort = sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      if (itemsPerPage !== -1) {
        const from = (page - 1) * itemsPerPage
        const to = from + itemsPerPage - 1
        query = query.range(from, to)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching vales:', error)
        throw error
      }

      return {
        vales: (data || []) as Vale[],
        totalVales: count || 0,
      }
    },

    // 👉 Obtener métricas financieras globales de vales
    async fetchResumenVales(): Promise<ResumenVales> {
      const { data, error } = await supabase
        .from('vales')
        .select('monto_total, monto_abonado, saldo_pendiente, estado')

      if (error) {
        console.error('Error fetching resumen vales:', error)
        throw error
      }

      const valesList = data || []
      let totalDeudaGlobal = 0
      let totalMontoEmitido = 0
      let totalMontoAbonado = 0
      let cantPendientes = 0

      valesList.forEach(v => {
        totalMontoEmitido += Number(v.monto_total || 0)
        totalMontoAbonado += Number(v.monto_abonado || 0)
        const saldo = Number(v.saldo_pendiente ?? (v.monto_total - v.monto_abonado))
        if (v.estado !== 'cancelado') {
          totalDeudaGlobal += saldo > 0 ? saldo : 0
          cantPendientes += 1
        }
      })

      return {
        totalDeudaGlobal,
        totalMontoEmitido,
        totalMontoAbonado,
        cantPendientes,
        cantValesTotal: valesList.length,
      }
    },

    // 👉 Fetch lista de usuarios registrados para asociar vales
    async fetchUsuariosApp() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, email')
        .order('nombre', { ascending: true })

      if (error) {
        console.error('Error fetching usuarios:', error)
        return []
      }

      return data || []
    },

    // 👉 Crear nuevo vale / préstamo
    async crearVale(payload: {
      usuario_id?: string | null
      beneficiario: string
      concepto: string
      monto_total: number
      fecha_emision?: string
    }) {
      const { data, error } = await supabase
        .from('vales')
        .insert({
          usuario_id: payload.usuario_id || null,
          beneficiario: payload.beneficiario,
          concepto: payload.concepto,
          monto_total: payload.monto_total,
          monto_abonado: 0,
          estado: 'pendiente',
          fecha_emision: payload.fecha_emision || new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear vale:', error)
        throw error
      }

      return data
    },

    // 👉 Registrar un abono a un vale
    async registrarAbono(payload: {
      vale_id: string
      valor: number
      tipo_pago: 'efectivo' | 'transferencia'
      notas?: string
      fecha?: string
    }) {
      // 1. Insertar abono
      const { data: abono, error: errorAbono } = await supabase
        .from('abonos_vales')
        .insert({
          vale_id: payload.vale_id,
          valor: payload.valor,
          tipo_pago: payload.tipo_pago,
          notas: payload.notas || null,
          fecha: payload.fecha || new Date().toISOString(),
        })
        .select()
        .single()

      if (errorAbono) {
        console.error('Error al registrar abono:', errorAbono)
        throw errorAbono
      }

      // 2. Si el trigger de la BD no estuviera activo, actualizamos manualmente la tabla vales
      const { data: todosAbonos } = await supabase
        .from('abonos_vales')
        .select('valor')
        .eq('vale_id', payload.vale_id)

      const totalAbonado = (todosAbonos || []).reduce((sum, a) => sum + Number(a.valor), 0)

      const { data: valeActual } = await supabase
        .from('vales')
        .select('monto_total')
        .eq('id', payload.vale_id)
        .single()

      if (valeActual) {
        const montoTotal = Number(valeActual.monto_total)
        let nuevoEstado: 'pendiente' | 'parcial' | 'cancelado' = 'pendiente'
        if (totalAbonado >= montoTotal) {
          nuevoEstado = 'cancelado'
        } else if (totalAbonado > 0) {
          nuevoEstado = 'parcial'
        }

        await supabase
          .from('vales')
          .update({
            monto_abonado: totalAbonado,
            estado: nuevoEstado,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.vale_id)
      }

      return abono
    },

    // 👉 Cancelar un vale totalmente (pagar el 100% del saldo pendiente)
    async cancelarValeTotalmente(valeId: string, tipoPago: 'efectivo' | 'transferencia' = 'efectivo', notas?: string) {
      // Obtener el vale para conocer el saldo pendiente
      const { data: vale, error: errorVale } = await supabase
        .from('vales')
        .select('monto_total, monto_abonado, saldo_pendiente')
        .eq('id', valeId)
        .single()

      if (errorVale || !vale) {
        throw new Error('No se encontró el vale a cancelar')
      }

      const saldoPendiente = Number(vale.saldo_pendiente ?? (vale.monto_total - vale.monto_abonado))
      if (saldoPendiente <= 0) {
        return true
      }

      return await this.registrarAbono({
        vale_id: valeId,
        valor: saldoPendiente,
        tipo_pago: tipoPago,
        notas: notas || 'Cancelación total del vale',
      })
    },

    // 👉 Eliminar un vale
    async eliminarVale(valeId: string) {
      const { error } = await supabase
        .from('vales')
        .delete()
        .eq('id', valeId)

      if (error) {
        console.error('Error al eliminar vale:', error)
        throw error
      }

      return true
    },
  },
})
