<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePedidosStore } from '@/views/apps/pedidos/usePedidosStore'
import type { Abono, Pedido, ResumenPagos } from '@/views/apps/pedidos/usePedidosStore'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

const props = defineProps<{
  modelValue: boolean
  pedido: Pedido | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const pedidoStore = usePedidosStore()

// State
const abonos = ref<Abono[]>([])
const resumen = ref<ResumenPagos>({ total_pedido: 0, total_abonado: 0, saldo_pendiente: 0 })
const isLoading = ref(false)

// Load data when dialog opens
const loadData = async () => {
  if (!props.pedido) return
  isLoading.value = true
  try {
    const [abonosData, resumenData] = await Promise.all([
      pedidoStore.fetchAbonos(props.pedido.id),
      pedidoStore.fetchResumenPagos(props.pedido.id),
    ])
    abonos.value = abonosData
    resumen.value = resumenData
  }
  catch (error) {
    console.error('Error al cargar información de abonos para factura:', error)
  }
  finally {
    isLoading.value = false
  }
}

watch(() => props.modelValue, val => {
  if (val && props.pedido)
    loadData()
})

// Helpers
const negocio = useNegocioStore()
const { formatCurrency, formatDate: formatFecha, formatShortDate: formatFechaCorta } = useFormato()
const { variablesCss, imprimirFactura } = usePrintDocument()

const formatDate = (dateString: string | null | undefined) => formatFecha(dateString, 'N/A')
const formatShortDate = (dateString: string | null | undefined) => formatFechaCorta(dateString, 'N/A')

// Ref para el contenedor de la factura
const invoiceRef = ref<HTMLElement | null>(null)

const printInvoice = () => imprimirFactura(invoiceRef.value, `Comprobante ${negocio.nombreComercial}`)

// Current date formatted
const fechaEmision = computed(() => formatFecha(new Date()))

// Status badge
const estadoPagoInfo = computed(() => {
  const saldo = resumen.value.saldo_pendiente
  if (saldo === 0 && resumen.value.total_abonado > 0) {
    return { label: 'PAGADO COMPLETO', color: '#1b5e20', bg: '#e8f5e9', border: '#2e7d32' }
  }
  if (saldo < 0) {
    return { label: 'SALDO A FAVOR', color: '#e65100', bg: '#fff3e0', border: '#ed6c02' }
  }
  if (resumen.value.total_abonado > 0) {
    return { label: 'ABONADO (PENDIENTE SALDO)', color: '#01579b', bg: '#e1f5fe', border: '#0288d1' }
  }
  return { label: 'SIN ABONOS', color: '#c62828', bg: '#ffebee', border: '#d32f2f' }
})
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="850"
    scrollable
    class="factura-dialog"
  >
    <VCard v-if="pedido" class="factura-card">
      <!-- ========================================== -->
      <!-- Header del Dialog (No imprimible) -->
      <!-- ========================================== -->
      <VCardTitle class="d-flex align-center justify-space-between pa-4 border-b no-print">
        <div class="d-flex align-center gap-2">
          <VIcon icon="tabler-file-invoice" color="primary" size="24" />
          <span class="text-h6 font-weight-bold">Previsualización de Comprobante / Factura</span>
        </div>

        <div class="d-flex align-center gap-2">
          <VBtn
            color="primary"
            prepend-icon="tabler-printer"
            size="small"
            @click="printInvoice"
          >
            Imprimir Comprobante
          </VBtn>
          <VBtn
            icon
            variant="text"
            size="small"
            @click="isOpen = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>
        </div>
      </VCardTitle>

      <!-- ========================================== -->
      <!-- DOCUMENTO IMPRIMIBLE DE LA FACTURA -->
      <!-- ========================================== -->
      <VCardText class="pa-6 printable-invoice-wrapper">
        <div
          ref="invoiceRef"
          class="invoice-container documento-factura pa-6"
          :style="variablesCss"
        >
          <!-- 1. Encabezado & Logo -->
          <DocumentoEncabezado>
            <div class="text-right invoice-meta">
              <div class="invoice-title text-h5 font-weight-bold mb-1">
                COMPROBANTE DE PEDIDO
              </div>
              <div class="invoice-number font-mono text-subtitle-1 font-weight-bold mb-1">
                {{ pedido.referencia }}
              </div>
              <div class="text-xs invoice-subtext mb-2">
                Fecha de Emisión: <strong>{{ fechaEmision }}</strong>
              </div>
              <!-- Badge estado pago -->
              <div
                class="invoice-status-chip d-inline-block px-3 py-1 rounded text-xs font-weight-bold"
                :style="{ color: estadoPagoInfo.color, backgroundColor: estadoPagoInfo.bg, border: `1px solid ${estadoPagoInfo.border}` }"
              >
                {{ estadoPagoInfo.label }}
              </div>
            </div>
          </DocumentoEncabezado>

          <hr class="invoice-divider mb-6">

          <!-- 2. Información del Cliente y Pedido -->
          <div class="invoice-info-grid mb-6">
            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                <VIcon icon="tabler-user" size="14" class="me-1" /> Datos del Cliente
              </div>
              <div class="text-sm font-weight-bold text-capitalize info-box__main">
                {{ pedido.cliente ? `${pedido.cliente.nombre} ${pedido.cliente.apellido}` : 'Cliente General' }}
              </div>
              <div class="text-xs info-box__sub mt-1">
                Atendido por: <strong>{{ pedido.responsable ? `${pedido.responsable.nombre} ${pedido.responsable.apellido}` : negocio.nombreComercial }}</strong>
              </div>
            </div>

            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                <VIcon icon="tabler-calendar-event" size="14" class="me-1" /> Tiempos del Trabajo
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Fecha de Ingreso:</span>
                <strong class="info-box__main">{{ formatDate(pedido.fecha_inicio) }}</strong>
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Fecha Estimada Entrega:</span>
                <strong class="info-box__highlight">{{ formatDate(pedido.fecha_fin) }}</strong>
              </div>
              <div v-if="pedido.estado === 'entregado' && pedido.fecha_entregado" class="d-flex justify-space-between text-xs">
                <span class="info-box__sub">Fecha Real de Entrega:</span>
                <strong style="color: #1b5e20;">{{ formatDate(pedido.fecha_entregado) }}</strong>
              </div>
            </div>
          </div>

          <!-- 3. Especificaciones y Desglose del Pedido -->
          <div class="table-section mb-6">
            <div class="section-title text-xs font-weight-bold text-uppercase mb-2">
              Detalle del Pedido & Especificaciones
            </div>

            <table class="invoice-table w-100">
              <thead>
                <tr>
                  <th class="text-left">DESCRIPCIÓN DE LA JOYA</th>
                  <th class="text-center">COLOR ORO</th>
                  <th class="text-center">TALLA</th>
                  <th class="text-center">PESO</th>
                  <th class="text-center">VALOR GRAMO</th>
                  <th class="text-right">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="font-weight-bold text-body-2 item-title">
                      {{ pedido.titulo }}
                    </div>
                    <div v-if="pedido.descripcion" class="text-xs item-desc mt-1">
                      {{ pedido.descripcion }}
                    </div>
                    <div v-if="pedido.diseno" class="text-xs item-3d mt-1">
                      <VIcon icon="tabler-cube-3d-sphere" size="12" class="me-1" />
                      Diseño 3D: {{ pedido.diseno.referencia }} - {{ pedido.diseno.titulo }}
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge-gold-color font-weight-medium text-xs">
                      {{ pedido.color_oro?.nombre || 'Amarillo' }}
                    </span>
                  </td>
                  <td class="text-center font-weight-medium text-xs">
                    {{ pedido.talla ? pedido.talla : '-' }}
                  </td>
                  <td class="text-center text-xs">
                    <div v-if="pedido.peso_final && pedido.peso_final > 0">
                      <strong>{{ pedido.peso_final }} g</strong> (Final)
                    </div>
                    <div v-else-if="pedido.peso">
                      {{ pedido.peso }} g (Estimado)
                    </div>
                    <div v-else>
                      -
                    </div>
                  </td>
                  <td class="text-center text-xs font-mono">
                    {{ pedido.precio_gramo && pedido.precio_gramo > 0 ? formatCurrency(pedido.precio_gramo) : '-' }}
                  </td>
                  <td class="text-right font-weight-bold text-body-2 item-price">
                    {{ formatCurrency(pedido.total_pedido) }}
                  </td>
                </tr>

                <!-- Sub-filas para desglose si existe precio por gramo o adicionales -->
                <tr v-if="pedido.peso_final > 0 && pedido.precio_gramo > 0" class="sub-row">
                  <td colspan="5" class="text-right text-xs sub-row-label">
                    Liquidación Peso Final ({{ pedido.peso_final }}g × {{ formatCurrency(pedido.precio_gramo) }}/g):
                  </td>
                  <td class="text-right text-xs font-mono sub-row-val">
                    {{ formatCurrency(pedido.peso_final * pedido.precio_gramo) }}
                  </td>
                </tr>

                <tr v-if="pedido.precio_adicionales > 0" class="sub-row">
                  <td colspan="5" class="text-right text-xs sub-row-label">
                    Adicionales / Trabajo especial ({{ pedido.descripcion_adicionales || 'Piedras y engaste' }}):
                  </td>
                  <td class="text-right text-xs font-mono sub-row-val">
                    {{ formatCurrency(pedido.precio_adicionales) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 4. Sección de Abonos e Historial de Pagos -->
          <div class="table-section mb-6">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="section-title text-xs font-weight-bold text-uppercase">
                Historial de Abonos & Pagos
              </div>
              <span class="text-xs font-weight-medium text-sub font-mono">
                {{ abonos.length }} abono(s) registrado(s)
              </span>
            </div>

            <!-- Loading abonos -->
            <div v-if="isLoading" class="text-center py-4">
              <VProgressCircular indeterminate size="20" color="primary" />
            </div>

            <!-- Tabla de abonos -->
            <table v-else-if="abonos.length > 0" class="invoice-table invoice-table--abonos w-100">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">#</th>
                  <th class="text-left">FECHA ABONO</th>
                  <th class="text-left">MEDIO DE PAGO</th>
                  <th class="text-left">CONCEPTO / NOTAS</th>
                  <th class="text-right">MONTO ABONADO</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(abono, index) in abonos" :key="abono.id">
                  <td class="text-center text-xs font-mono text-sub">{{ index + 1 }}</td>
                  <td class="text-xs">{{ formatShortDate(abono.fecha) }}</td>
                  <td class="text-xs text-capitalize font-weight-medium">
                    {{ abono.tipo_pago === 'efectivo' ? '💵 Efectivo' : '💳 Transferencia' }}
                  </td>
                  <td class="text-xs text-sub">{{ abono.notas || 'Abono a pedido' }}</td>
                  <td class="text-right text-xs font-weight-bold abono-monto font-mono">
                    + {{ formatCurrency(abono.valor) }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Sin abonos -->
            <div v-else class="no-abonos-box text-center py-3 px-4 rounded text-xs">
              No se han registrado abonos previos para este pedido.
            </div>
          </div>

          <!-- 5. Resumen Financiero Total -->
          <div class="d-flex justify-end mb-8">
            <div class="totals-summary-box pa-4 rounded-lg">
              <div class="d-flex justify-space-between text-sm mb-2">
                <span class="totals-label">Valor Total Pedido:</span>
                <span class="font-weight-bold font-mono totals-val">{{ formatCurrency(resumen.total_pedido) }}</span>
              </div>
              <div class="d-flex justify-space-between text-sm mb-2 text-abono">
                <span>Total Abonado:</span>
                <span class="font-weight-bold font-mono">- {{ formatCurrency(resumen.total_abonado) }}</span>
              </div>
              <hr class="my-2 border-dashed totals-hr">
              <div class="d-flex justify-space-between align-center text-body-1">
                <span class="font-weight-bold totals-title">SALDO PENDIENTE:</span>
                <span
                  class="font-weight-bold font-mono text-h6"
                  :style="{ color: resumen.saldo_pendiente <= 0 ? '#1b5e20' : '#c62828' }"
                >
                  {{ formatCurrency(resumen.saldo_pendiente) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 6. Garantía & Firmas -->
          <div class="invoice-footer mt-auto pt-4 border-t">
            <DocumentoTerminos
              :titulo="`TÉRMINOS Y GARANTÍA ${negocio.nombreMayusculas}:`"
              :texto="negocio.config.terminos_pedido"
            />

            <DocumentoFirmas :nombre-cliente="pedido.cliente ? `${pedido.cliente.nombre} ${pedido.cliente.apellido}` : ''" />
          </div>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
