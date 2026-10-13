<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Factura3d } from '@/views/apps/impresiones3d/useFacturas3dStore'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

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
const negocio = useNegocioStore()
const { formatCurrency, formatDate: formatFecha } = useFormato()
const { variablesCss, imprimirFactura } = usePrintDocument()

const formatDate = (dateString: string | null | undefined) => formatFecha(dateString, 'N/A')

const getItemSubtotal = (item: { precio: number; peso: number }) => {
  return Number(item.precio || 0) * Number(item.peso || 0)
}

// Ref para el contenedor de la factura
const invoiceRef = ref<HTMLElement | null>(null)

const printInvoice = () => imprimirFactura(invoiceRef.value, `Factura Impresión 3D - ${negocio.nombreComercial}`)

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
        <div
          ref="invoiceRef"
          class="invoice-container documento-factura pa-6"
          :style="variablesCss"
        >
          <!-- 1. Encabezado & Logo -->
          <DocumentoEncabezado eslogan="División de Impresión 3D & Diseños">
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
          </DocumentoEncabezado>

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
                Responsable: <strong>{{ negocio.nombreComercial }} — Impresiones 3D</strong>
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
            <div class="totals-summary-box totals-summary-box--ancho pa-4 rounded-lg">
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
                <span
                  class="font-weight-bold font-mono text-h6"
                  style="color: var(--doc-primario-oscuro);"
                >
                  {{ formatCurrency(Number(factura.total)) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Garantía & Firmas -->
          <div class="invoice-footer mt-auto pt-4 border-t">
            <DocumentoTerminos
              :titulo="`TÉRMINOS Y GARANTÍA ${negocio.nombreMayusculas} — IMPRESIONES 3D:`"
              :texto="negocio.config.terminos_impresion3d"
            />

            <DocumentoFirmas :nombre-cliente="factura.cliente ? `${factura.cliente.nombre} ${factura.cliente.apellido}` : ''" />
          </div>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
