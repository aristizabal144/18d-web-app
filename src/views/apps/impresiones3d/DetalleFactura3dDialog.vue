<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Factura3d } from '@/views/apps/impresiones3d/useFacturas3dStore'
import logoDorado from '@images/logos/logo-dorado.png'

const props = defineProps<{
  isDialogVisible: boolean
  factura: Factura3d | null
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
}>()

const isOpen = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
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

const getItemSubtotal = (item: { precio: number; peso: number }) => {
  return Number(item.precio || 0) * Number(item.peso || 0)
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
  <title>Factura Impresión 3D - 18D Joyeros</title>
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
    .item-price { color: #111; }
    table.invoice-table { border-collapse: collapse; width: 100%; }
    .invoice-table th { background: #1e1b16; color: #f5d77f; padding: 10px 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #8b6b15; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .invoice-table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; color: #111; }
    .totals-summary-box { width: 340px; background: #fdfbf7; border: 1px solid #d9ccaf; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

// Status badge
const estadoPagoInfo = computed(() => {
  if (props.factura?.estado === 'pagado') {
    return { label: 'PAGADO COMPLETO', color: '#1b5e20', bg: '#e8f5e9', border: '#2e7d32' }
  }
  return { label: 'PENDIENTE DE COBRO', color: '#c62828', bg: '#ffebee', border: '#d32f2f' }
})
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="850"
    scrollable
    class="factura-dialog"
  >
    <VCard v-if="factura" class="factura-card">
      <!-- Header del Dialog (No imprimible) -->
      <VCardTitle class="d-flex align-center justify-space-between pa-4 border-b no-print">
        <div class="d-flex align-center gap-2">
          <VIcon icon="tabler-file-invoice" color="primary" size="24" />
          <span class="text-h6 font-weight-bold">Factura de Impresión 3D</span>
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

      <!-- DOCUMENTO IMPRIMIBLE DE LA FACTURA -->
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
                <span>División de Impresión 3D & Diseños</span><br>
                <span>Medellín, Colombia</span><br>
                <span>Contacto: +57 (300) 18D-JOYA | info@18djoyeros.com</span>
              </div>
            </div>

            <div class="text-right invoice-meta">
              <div class="invoice-title text-h5 font-weight-bold mb-1">
                FACTURA IMPRESIÓN 3D
              </div>
              <div class="invoice-number font-mono text-subtitle-1 font-weight-bold mb-1">
                #{{ String(factura.numero || 0).padStart(4, '0') }}
              </div>
              <div class="text-xs invoice-subtext mb-2">
                Fecha de Emisión: <strong>{{ formatDate(factura.fecha) }}</strong>
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

          <!-- 2. Información del Cliente y Trabajo 3D -->
          <div class="invoice-info-grid mb-6">
            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                <VIcon icon="tabler-user" size="14" class="me-1" /> Datos del Cliente
              </div>
              <div class="text-sm font-weight-bold text-capitalize info-box__main">
                {{ factura.cliente ? `${factura.cliente.nombre} ${factura.cliente.apellido}` : 'Cliente General' }}
              </div>
              <div class="text-xs info-box__sub mt-1">
                Responsable: <strong>18D Joyeros — Impresiones 3D</strong>
              </div>
            </div>

            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                <VIcon icon="tabler-printer" size="14" class="me-1" /> Detalle del Servicio
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Fecha de Registro:</span>
                <strong class="info-box__main">{{ formatDate(factura.fecha) }}</strong>
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Moldes Impresos:</span>
                <strong class="info-box__highlight">{{ factura.items?.length || 0 }} ítem(s)</strong>
              </div>
              <div v-if="factura.notas" class="text-xs mt-1">
                <span class="info-box__sub">Notas:</span> {{ factura.notas }}
              </div>
            </div>
          </div>

          <!-- 3. Especificaciones y Desglose de Moldes -->
          <div class="table-section mb-6">
            <div class="section-title text-xs font-weight-bold text-uppercase mb-2">
              Desglose de Moldes y Resinas 3D
            </div>

            <table class="invoice-table w-100">
              <thead>
                <tr>
                  <th class="text-left" style="width: 40px;">#</th>
                  <th class="text-left">NOMBRE DEL MOLDE</th>
                  <th class="text-center">PRECIO / G</th>
                  <th class="text-center">PESO (G)</th>
                  <th class="text-right">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in (factura.items || [])" :key="item.id || index">
                  <td class="text-left text-xs font-mono text-sub">{{ index + 1 }}</td>
                  <td>
                    <div class="font-weight-bold text-body-2 item-title">
                      {{ item.nombre_molde }}
                    </div>
                  </td>
                  <td class="text-center text-xs font-mono">
                    {{ formatCurrency(Number(item.precio)) }}
                  </td>
                  <td class="text-center text-xs font-weight-bold">
                    {{ Number(item.peso).toFixed(1) }} g
                  </td>
                  <td class="text-right font-weight-bold text-body-2 item-price font-mono">
                    {{ formatCurrency(getItemSubtotal(item)) }}
                  </td>
                </tr>
                <tr v-if="!factura.items || factura.items.length === 0">
                  <td colspan="5" class="text-center text-xs text-sub py-3">
                    Sin ítems registrados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 4. Resumen Financiero Total -->
          <div class="d-flex justify-end mb-8">
            <div class="totals-summary-box pa-4 rounded-lg">
              <div class="d-flex justify-space-between text-sm mb-2">
                <span class="totals-label">Total Ítems Impresos:</span>
                <span class="font-weight-bold font-mono totals-val">{{ factura.items?.length || 0 }} moldes</span>
              </div>
              <div class="d-flex justify-space-between text-sm mb-2">
                <span class="totals-label">Peso Total Impreso:</span>
                <span class="font-weight-bold font-mono totals-val" style="color: #0288d1;">
                  {{ Number(factura.peso_total || 0).toFixed(1) }} g
                </span>
              </div>
              <hr class="my-2 border-dashed totals-hr">
              <div class="d-flex justify-space-between align-center text-body-1">
                <span class="font-weight-bold totals-title">TOTAL FACTURA 3D:</span>
                <span class="font-weight-bold font-mono text-h6" style="color: #8b6b15;">
                  {{ formatCurrency(Number(factura.total)) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Garantía & Firmas -->
          <div class="invoice-footer mt-auto pt-4 border-t">
            <div class="text-xs invoice-terms text-center mb-8 px-4" style="line-height: 1.5;">
              <strong>TÉRMINOS Y GARANTÍA 18D JOYEROS — IMPRESIONES 3D:</strong>
              Garantía de calidad en la definición y cura de resina de impresión 3D para alta joyería. Verifique sus moldes al momento de la entrega. Conserve este comprobante.
            </div>

            <div class="d-flex justify-space-around text-center pt-4 signatures-row">
              <div class="signature-block">
                <div class="signature-line" />
                <span class="text-xs font-weight-bold d-block mt-1 signature-label">Firma Cliente</span>
                <span class="text-xs signature-sub">{{ factura.cliente ? `${factura.cliente.nombre} ${factura.cliente.apellido}` : '' }}</span>
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

/* Contenedor Principal de Factura (Fondo Blanco Elegante) */
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

.item-price {
  color: #111111 !important;
}

/* Tablas de Factura */
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
}

.totals-summary-box {
  inline-size: 340px;
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
