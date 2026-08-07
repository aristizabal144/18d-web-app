<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePedidosStore } from '@/views/apps/pedidos/usePedidosStore'
import type { Abono, Pedido, ResumenPagos } from '@/views/apps/pedidos/usePedidosStore'
import logoDorado from '@images/logos/logo-dorado.png'

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
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('es-ES', options)
}

const formatShortDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A'
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('es-ES', options)
}

// Ref para el contenedor de la factura
const invoiceRef = ref<HTMLElement | null>(null)

const printInvoice = () => {
  const el = invoiceRef.value
  if (!el) return

  const printWindow = window.open('', '_blank', 'width=850,height=1100')
  if (!printWindow) return

  const html = el.innerHTML

  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante 18D Joyeros</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; padding: 20px; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .d-flex { display: flex; }
    .flex-column { flex-direction: column; }
    .align-start { align-items: flex-start; }
    .align-center { align-items: center; }
    .justify-space-between { justify-content: space-between; }
    .justify-space-around { justify-content: space-around; }
    .justify-end { justify-content: flex-end; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-capitalize { text-transform: capitalize; }
    .text-uppercase { text-transform: uppercase; }
    .font-weight-bold { font-weight: 700; }
    .font-weight-medium { font-weight: 500; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-body-2 { font-size: 0.875rem; }
    .text-body-1 { font-size: 1rem; }
    .text-subtitle-1 { font-size: 1rem; }
    .text-h5 { font-size: 1.5rem; }
    .text-h6 { font-size: 1.25rem; }
    .d-block { display: block; }
    .d-inline-block { display: inline-block; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-6 { margin-bottom: 24px; }
    .mb-8 { margin-bottom: 32px; }
    .mt-1 { margin-top: 4px; }
    .mt-auto { margin-top: auto; }
    .me-1 { margin-right: 4px; }
    .ms-1 { margin-left: 4px; }
    .pa-4 { padding: 16px; }
    .pa-6 { padding: 24px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-3 { padding-top: 12px; padding-bottom: 12px; }
    .pt-4 { padding-top: 16px; }
    .my-2 { margin-top: 8px; margin-bottom: 8px; }
    .gap-2 { gap: 8px; }
    .w-100 { width: 100%; }
    .rounded { border-radius: 4px; }
    .rounded-lg { border-radius: 8px; }
    img.invoice-logo { max-width: 160px; height: auto; }
    .company-name { color: #111; font-size: 0.875rem; }
    .company-details, .company-details span { color: #333; }
    .invoice-title { color: #8b6b15; }
    .invoice-number { color: #111; }
    .invoice-subtext { color: #444; }
    .invoice-subtext strong { color: #111; }
    hr.invoice-divider { border: 0; border-top: 2px solid #8b6b15; opacity: 0.9; }
    .invoice-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-box { background: #fdfbf7; border: 1px solid #e5dac4; color: #111; }
    .info-box__title { color: #8b6b15; }
    .info-box__main { color: #111; }
    .info-box__sub { color: #444; }
    .info-box__sub strong { color: #111; }
    .info-box__highlight { color: #8b6b15; }
    .section-title { color: #555; letter-spacing: 0.5px; }
    .text-sub { color: #555; }
    .item-title { color: #111; }
    .item-desc { color: #444; }
    .item-3d { color: #8b6b15; }
    .item-price { color: #111; }
    .sub-row-label { color: #555; }
    .sub-row-val { color: #222; }
    .abono-monto { color: #1b5e20; }
    .text-abono { color: #1b5e20; }
    table.invoice-table { border-collapse: collapse; width: 100%; }
    .invoice-table th { background: #1e1b16; color: #f5d77f; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #8b6b15; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; color: #111; }
    .invoice-table .sub-row td { background: #f8f8f8; padding: 6px 12px; }
    .invoice-table--abonos th { background: #2b2b2b; color: #fff; border-bottom: 2px solid #666; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-gold-color { background: rgba(201,168,76,0.2); color: #8b6b15; border: 1px solid rgba(201,168,76,0.4); padding: 3px 8px; border-radius: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-abonos-box { background: #f9f9f9; border: 1px dashed #ccc; color: #555; }
    .totals-summary-box { width: 320px; background: #fdfbf7; border: 1px solid #d9ccaf; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .totals-label { color: #444; }
    .totals-val { color: #111; }
    .totals-title { color: #111; }
    hr.totals-hr { border-color: #d9ccaf; }
    hr.border-dashed { border-style: dashed; }
    .invoice-terms { color: #444; }
    .invoice-terms strong { color: #111; }
    .signature-block { width: 220px; }
    .signature-line { border-bottom: 1px solid #222; height: 40px; }
    .signature-label { color: #111; }
    .signature-sub { color: #444; }
    .border-t { border-top: 1px solid #e0e0e0; }
    .invoice-status-chip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .signatures-row { display: flex; justify-content: space-around; margin-top: 24px; }
    /* Vuetify icons fallback: hide them in print */
    .v-icon, i { display: none; }
    @media print {
      body { padding: 0; margin: 0; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>${html}</body>
</html>`)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.onafterprint = () => printWindow.close()
  }
}

// Current date formatted
const fechaEmision = computed(() => {
  return new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

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
        <div ref="invoiceRef" class="invoice-container pa-6">
          <!-- 1. Encabezado & Logo -->
          <div class="d-flex justify-space-between align-start mb-6 invoice-header">
            <div class="d-flex flex-column align-start">
              <img
                :src="logoDorado"
                alt="18D Joyeros Logo"
                class="invoice-logo mb-2"
              >
              <div class="company-details text-xs">
                <strong class="company-name text-body-2 font-weight-bold d-block">18D JOYEROS S.A.S</strong>
                <span>NIT: 901.482.930-1</span><br>
                <span>Joyería Fina & Diseños Personalizados 18k</span><br>
                <span>Medellín, Colombia</span><br>
                <span>Contacto: +57 (300) 18D-JOYA | info@18djoyeros.com</span>
              </div>
            </div>

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
          </div>

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
                Atendido por: <strong>{{ pedido.responsable ? `${pedido.responsable.nombre} ${pedido.responsable.apellido}` : '18D Joyeros' }}</strong>
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
            <div class="text-xs invoice-terms text-center mb-8 px-4" style="line-height: 1.5;">
              <strong>TÉRMINOS Y GARANTÍA 18D JOYEROS:</strong>
              Garantía de por vida en la ley del metal (Oro 18k). No cubre pérdida de piedras por uso inadecuado o golpes. Conserve este comprobante para el retiro de su joya.
            </div>

            <div class="d-flex justify-space-around text-center pt-4 signatures-row">
              <div class="signature-block">
                <div class="signature-line" />
                <span class="text-xs font-weight-bold d-block mt-1 signature-label">Firma Cliente</span>
                <span class="text-xs signature-sub">{{ pedido.cliente ? `${pedido.cliente.nombre} ${pedido.cliente.apellido}` : '' }}</span>
              </div>
              <div class="signature-block">
                <div class="signature-line" />
                <span class="text-xs font-weight-bold d-block mt-1 signature-label">Firma Autorizada</span>
                <span class="text-xs signature-sub">18D Joyeros S.A.S</span>
              </div>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}

.invoice-logo {
  max-inline-size: 160px;
  block-size: auto;
}

/* ========================================== */
/* Contenedor Principal de Factura (Fondo Blanco) */
/* ========================================== */
.invoice-container {
  background: #ffffff !important;
  color: #111111 !important;
  border-radius: 8px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.company-name {
  color: #111111 !important;
}

.company-details,
.company-details span {
  color: #333333 !important;
}

.invoice-title {
  color: #8b6b15 !important;
}

.invoice-number {
  color: #111111 !important;
}

.invoice-subtext {
  color: #444444 !important;

  strong {
    color: #111111 !important;
  }
}

.invoice-divider {
  border: 0;
  border-top: 2px solid #8b6b15;
  opacity: 0.9;
}

.invoice-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-box {
  background: #fdfbf7 !important;
  border: 1px solid #e5dac4 !important;
  color: #111111 !important;

  &__title {
    color: #8b6b15 !important;
  }

  &__main {
    color: #111111 !important;
  }

  &__sub {
    color: #444444 !important;

    strong {
      color: #111111 !important;
    }
  }

  &__highlight {
    color: #8b6b15 !important;
  }
}

.section-title {
  color: #555555 !important;
  letter-spacing: 0.5px;
}

.text-sub {
  color: #555555 !important;
}

.item-title {
  color: #111111 !important;
}

.item-desc {
  color: #444444 !important;
}

.item-3d {
  color: #8b6b15 !important;
}

.item-price {
  color: #111111 !important;
}

.sub-row-label {
  color: #555555 !important;
}

.sub-row-val {
  color: #222222 !important;
}

.abono-monto {
  color: #1b5e20 !important;
}

.text-abono {
  color: #1b5e20 !important;
}

/* ========================================== */
/* Tablas de Factura */
/* ========================================== */
.invoice-table {
  border-collapse: collapse;

  th {
    background: #1e1b16 !important;
    color: #f5d77f !important;
    padding: 10px 12px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #8b6b15 !important;
  }

  td {
    padding: 10px 12px;
    border-bottom: 1px solid #e0e0e0 !important;
    color: #111111 !important;
  }

  .sub-row td {
    background: #f8f8f8 !important;
    padding: 6px 12px;
  }

  &--abonos {
    th {
      background: #2b2b2b !important;
      color: #ffffff !important;
      border-bottom: 2px solid #666666 !important;
    }
  }
}

.badge-gold-color {
  background: rgba(201, 168, 76, 0.2) !important;
  color: #8b6b15 !important;
  border: 1px solid rgba(201, 168, 76, 0.4) !important;
  padding: 3px 8px;
  border-radius: 4px;
}

.no-abonos-box {
  background: #f9f9f9 !important;
  border: 1px dashed #cccccc !important;
  color: #555555 !important;
}

.totals-summary-box {
  inline-size: 320px;
  background: #fdfbf7 !important;
  border: 1px solid #d9ccaf !important;
  color: #111111 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.totals-label {
  color: #444444 !important;
}

.totals-val {
  color: #111111 !important;
}

.totals-title {
  color: #111111 !important;
}

.totals-hr {
  border-color: #d9ccaf !important;
}

.invoice-terms {
  color: #444444 !important;

  strong {
    color: #111111 !important;
  }
}

.signatures-row {
  display: flex;
  justify-content: space-around;
  margin-top: 24px;
}

.signature-block {
  width: 220px;
}

.signature-line {
  border-bottom: 1px solid #222222 !important;
  height: 40px;
}

.signature-label {
  color: #111111 !important;
}

.signature-sub {
  color: #444444 !important;
}


</style>

