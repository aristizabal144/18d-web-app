<script setup lang="ts">
import type { Vale } from './useValesStore'

const props = defineProps<{
  isDialogVisible: boolean
  vale: Vale | null
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
}>()

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Imprimir recibo de vale
const printValeRecibo = () => {
  if (!props.vale) return
  const w = window.open('', '_blank', 'width=800,height=800')
  if (!w) return

  const saldo = Number(props.vale.saldo_pendiente ?? (props.vale.monto_total - props.vale.monto_abonado))
  const abonosList = props.vale.abonos || []

  const abonosRowsHtml = abonosList.length > 0
    ? abonosList.map((a, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td>${formatDate(a.fecha)}</td>
          <td style="text-transform: capitalize;">${a.tipo_pago}</td>
          <td>${a.notas || '-'}</td>
          <td style="text-align: right; font-weight: bold; color: #1b5e20;">${formatCurrency(a.valor)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align: center; color: #888; padding: 12px;">Sin abonos registrados</td></tr>'

  w.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Comprobante de Vale - ${props.vale.beneficiario}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #8b6b15; padding-bottom: 12px; margin-bottom: 20px; }
        .brand { font-size: 24px; font-weight: 900; color: #8b6b15; letter-spacing: 1px; }
        .sub { font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
        .box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #fffcf7; }
        .box-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #1e1b16; color: #f5d77f; padding: 8px; font-size: 11px; text-transform: uppercase; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        .signatures { display: flex; justify-content: space-around; margin-top: 40px; }
        .sig-block { text-align: center; width: 200px; }
        .sig-line { border-bottom: 1px solid #111; height: 35px; }
        .sig-label { font-size: 10px; font-weight: 700; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">18D JOYEROS</div>
        <div class="sub">COMPROBANTE OFICIAL DE VALE / PRÉSTAMO DE DINERO</div>
      </div>

      <div class="box">
        <div style="font-size: 18px; font-weight: 800; color: #111;">${props.vale.beneficiario}</div>
        <div style="font-size: 13px; color: #555; margin-top: 2px;"><strong>Concepto:</strong> ${props.vale.concepto}</div>
        
        <div class="box-grid">
          <div><strong>Monto Total:</strong> ${formatCurrency(props.vale.monto_total)}</div>
          <div><strong>Fecha Emisión:</strong> ${formatDate(props.vale.fecha_emision)}</div>
          <div><strong>Total Abonado:</strong> <span style="color: #1b5e20;">${formatCurrency(props.vale.monto_abonado)}</span></div>
          <div><strong>Saldo Pendiente:</strong> <span style="color: #c62828; font-weight: bold;">${formatCurrency(saldo)}</span></div>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #8b6b15; margin-bottom: 4px;">
        Historial de Abonos Recibidos
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Fecha</th>
            <th>Medio Pago</th>
            <th>Notas</th>
            <th style="text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${abonosRowsHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">FIRMA BENEFICIARIO</div>
          <div style="font-size: 10px; color: #555;">${props.vale.beneficiario}</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-label">REPRESENTANTE 18D JOYEROS</div>
          <div style="font-size: 10px; color: #555;">Control de Cartera & Vales</div>
        </div>
      </div>

      <script>
        window.onload = function() { window.print(); }
      <\/script>
    </body>
    </html>
  `)
  w.document.close()
}
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    max-width="650"
    scrollable
    @update:model-value="val => emit('update:isDialogVisible', val)"
  >
    <VCard v-if="vale">
      <VCardTitle class="d-flex justify-space-between align-center pa-4 border-b">
        <div class="d-flex align-center gap-2">
          <VIcon icon="tabler-receipt" color="primary" size="24" />
          <span class="text-h6 font-weight-bold">Detalle del Vale / Préstamo</span>
        </div>
        <div class="d-flex align-center gap-2">
          <VBtn size="small" color="primary" prepend-icon="tabler-printer" @click="printValeRecibo">
            Imprimir Comprobante
          </VBtn>
          <VBtn icon variant="text" size="small" @click="emit('update:isDialogVisible', false)">
            <VIcon icon="tabler-x" />
          </VBtn>
        </div>
      </VCardTitle>

      <VCardText class="pa-6">
        <!-- Tarjeta del Vale -->
        <VCard border class="pa-4 mb-6" variant="tonal" color="primary">
          <div class="d-flex justify-space-between align-start mb-2">
            <div>
              <div class="text-caption text-uppercase font-weight-bold opacity-75">Beneficiario / Deudor</div>
              <div class="text-h6 font-weight-bold">{{ vale.beneficiario }}</div>
              <div v-if="vale.usuario" class="text-caption">
                Usuario App: {{ vale.usuario.nombre }} {{ vale.usuario.apellido }} ({{ vale.usuario.email }})
              </div>
            </div>
            <VChip
              size="small"
              class="font-weight-bold text-uppercase"
              :color="vale.estado === 'cancelado' ? 'success' : vale.estado === 'parcial' ? 'warning' : 'error'"
            >
              {{ vale.estado }}
            </VChip>
          </div>

          <div class="text-body-2 mb-4">
            <strong>Motivo / Concepto:</strong> {{ vale.concepto }}
          </div>

          <VRow class="text-caption">
            <VCol cols="6" sm="3">
              <span class="d-block text-medium-emphasis">Fecha Emisión</span>
              <strong class="text-body-2">{{ formatDate(vale.fecha_emision) }}</strong>
            </VCol>
            <VCol cols="6" sm="3">
              <span class="d-block text-medium-emphasis">Monto Total</span>
              <strong class="text-body-2">{{ formatCurrency(vale.monto_total) }}</strong>
            </VCol>
            <VCol cols="6" sm="3">
              <span class="d-block text-medium-emphasis">Total Abonado</span>
              <strong class="text-body-2 text-success">{{ formatCurrency(vale.monto_abonado) }}</strong>
            </VCol>
            <VCol cols="6" sm="3">
              <span class="d-block text-medium-emphasis">Saldo Pendiente</span>
              <strong class="text-body-2 text-error font-weight-bold">{{ formatCurrency(vale.saldo_pendiente ?? (vale.monto_total - vale.monto_abonado)) }}</strong>
            </VCol>
          </VRow>
        </VCard>

        <!-- Historial de Abonos -->
        <div class="text-subtitle-2 font-weight-bold text-uppercase mb-3 d-flex justify-space-between align-center">
          <span>Historial de Abonos ({{ vale.abonos?.length || 0 }})</span>
        </div>

        <VTable v-if="vale.abonos && vale.abonos.length > 0" class="border rounded">
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">#</th>
              <th>Fecha Abono</th>
              <th>Medio Pago</th>
              <th>Notas / Concepto</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(abono, index) in vale.abonos" :key="abono.id">
              <td class="text-center font-weight-bold">{{ index + 1 }}</td>
              <td>{{ formatDate(abono.fecha) }}</td>
              <td class="text-capitalize">
                <VChip
                  size="x-small"
                  :color="abono.tipo_pago === 'efectivo' ? 'info' : 'secondary'"
                  class="font-weight-medium"
                >
                  {{ abono.tipo_pago }}
                </VChip>
              </td>
              <td class="text-caption">{{ abono.notas || '-' }}</td>
              <td class="text-right font-weight-bold text-success font-mono">
                {{ formatCurrency(abono.valor) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <VAlert v-else type="info" variant="tonal" class="text-center py-3">
          No hay abonos registrados previamente para este vale.
        </VAlert>
      </VCardText>

      <VCardActions class="pa-4 border-t justify-end">
        <VBtn color="secondary" variant="tonal" @click="emit('update:isDialogVisible', false)">
          Cerrar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
