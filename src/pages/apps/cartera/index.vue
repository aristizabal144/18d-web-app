<script setup lang="ts">
import { useCarteraStore } from '@/views/apps/cartera/useCarteraStore'
import type { CarteraCliente, CarteraPedido, CarteraStats } from '@/views/apps/cartera/useCarteraStore'

const carteraStore = useCarteraStore()

// ── Filtros ──────────────────────────────────
const selectedCliente = ref<string | null>(null)
const clientes = ref<{ id: string; nombre: string; apellido: string }[]>([])

const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)

// ── Estado ───────────────────────────────────
const isLoadingStats = ref(false)
const isLoadingClientes = ref(false)
const isLoadingDetalle = ref(false)

const stats = ref<CarteraStats>({
  total_facturado: 0,
  total_recaudado: 0,
  total_efectivo_mes: 0,
  total_transferencia_mes: 0,
  total_pendiente: 0,
  clientes_con_saldo: 0,
})

const carteraClientes = ref<CarteraCliente[]>([])
const detalleCliente = ref<CarteraPedido[]>([])
const clienteSeleccionadoInfo = ref<CarteraCliente | null>(null)
const detalleDialogOpen = ref(false)
const snackbar = ref({ show: false, message: '', color: 'error' })

// ── Helpers ───────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-'
  const dt = d.includes('T') ? new Date(d) : new Date(`${d}T12:00:00`)
  return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const porcentajeCobrado = (cliente: CarteraCliente) => {
  if (!cliente.total_pedidos) return 0
  return Math.min(100, Math.round((cliente.total_abonado / cliente.total_pedidos) * 100))
}

// ── Fetch ─────────────────────────────────────
const loadStats = async () => {
  isLoadingStats.value = true
  try {
    stats.value = await carteraStore.fetchCarteraStats(fechaInicio.value, fechaFin.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar estadísticas', color: 'error' }
  } finally {
    isLoadingStats.value = false
  }
}

const loadCartera = async () => {
  isLoadingClientes.value = true
  try {
    carteraClientes.value = await carteraStore.fetchCarteraByCliente(fechaInicio.value, fechaFin.value, selectedCliente.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar cartera', color: 'error' }
  } finally {
    isLoadingClientes.value = false
  }
}

const loadAll = () => {
  loadStats()
  loadCartera()
}

const openDetalle = async (cliente: CarteraCliente) => {
  clienteSeleccionadoInfo.value = cliente
  detalleDialogOpen.value = true
  isLoadingDetalle.value = true
  try {
    detalleCliente.value = await carteraStore.fetchPedidosByCliente(cliente.cliente_id, fechaInicio.value, fechaFin.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar detalle', color: 'error' }
  } finally {
    isLoadingDetalle.value = false
  }
}

const printReporte = () => {
  const filas = carteraClientes.value.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.nombre} ${c.apellido}</td>
      <td>${c.pedidos_count}</td>
      <td style="text-align:right">${formatCurrency(c.total_pedidos)}</td>
      <td style="text-align:right;color:#2e7d32">${formatCurrency(c.total_abonado)}</td>
      <td style="text-align:right;color:#1565c0">${formatCurrency(c.total_efectivo)}</td>
      <td style="text-align:right;color:#7b1fa2">${formatCurrency(c.total_transferencia)}</td>
      <td style="text-align:right;font-weight:bold;color:${c.saldo_pendiente > 0 ? '#c62828' : '#2e7d32'}">${formatCurrency(c.saldo_pendiente)}</td>
    </tr>`).join('')

  const rango = `${fechaInicio.value ? formatDate(fechaInicio.value) : 'Inicio'} al ${fechaFin.value ? formatDate(fechaFin.value) : 'Hoy'}`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Cartera 18D Joyeros</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111}
      h1{color:#8b6b15;margin:0;font-size:20px} .sub{color:#666;font-size:12px;margin-bottom:16px}
      .cards{display:flex;gap:12px;margin-bottom:20px}
      .card{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 14px;text-align:center}
      .card .lbl{font-size:10px;text-transform:uppercase;color:#666;font-weight:700}
      .card .val{font-size:16px;font-weight:bold;margin-top:4px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e1b16;color:#f5d77f;padding:7px 9px;font-size:10px;text-transform:uppercase}
      td{padding:7px 9px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even){background:#fafafa}
      .foot{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#888}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #8b6b15;padding-bottom:12px;margin-bottom:16px">
      <div><h1>18D JOYEROS</h1><div class="sub">Informe de Cartera — ${rango}</div></div>
      <div style="text-align:right;font-size:11px;color:#444">
        <div>Impreso: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</div>
        <div>Clientes: ${carteraClientes.value.length}</div>
      </div>
    </div>
    <div class="cards">
      <div class="card"><div class="lbl">Total Facturado</div><div class="val" style="color:#8b6b15">${formatCurrency(stats.value.total_facturado)}</div></div>
      <div class="card"><div class="lbl">Total Recaudado</div><div class="val" style="color:#2e7d32">${formatCurrency(stats.value.total_recaudado)}</div></div>
      <div class="card"><div class="lbl">Efectivo</div><div class="val" style="color:#1565c0">${formatCurrency(stats.value.total_efectivo_mes)}</div></div>
      <div class="card"><div class="lbl">Transferencia</div><div class="val" style="color:#7b1fa2">${formatCurrency(stats.value.total_transferencia_mes)}</div></div>
      <div class="card"><div class="lbl">Saldo Pendiente</div><div class="val" style="color:#c62828">${formatCurrency(stats.value.total_pendiente)}</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Facturado</th><th>Abonado</th><th>Efectivo</th><th>Transferencia</th><th>Saldo</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="8" style="text-align:center;color:#888;padding:16px">Sin registros</td></tr>'}</tbody></table>
    <div class="foot"><div>18D Joyeros — Informe de Cartera</div><div>Generado automáticamente</div></div>
    <script>window.onload=()=>window.print()<\/script></body></html>`

  const w = window.open('', '_blank', 'width=1000,height=750')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

watch([fechaInicio, fechaFin, selectedCliente], loadAll, { deep: true })

onMounted(async () => {
  try {
    clientes.value = await carteraStore.fetchClientes()
  } catch {}
  loadAll()
})
</script>

<template>
  <section>
    <!-- ── Header ─────────────────────────────── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-report-money" color="primary" size="28" />
          Cartera
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Pedidos entregados — seguimiento de cobros y saldos
        </p>
      </div>
      <VBtn color="secondary" variant="tonal" prepend-icon="tabler-printer" @click="printReporte">
        Imprimir / PDF
      </VBtn>
    </div>

    <!-- ── Filtros ─────────────────────────────── -->
    <VCard class="mb-6" elevation="1">
      <VCardText class="py-3">
        <VRow dense align="center">
          <VCol cols="12" sm="3">
            <AppDateTimePicker
              v-model="fechaInicio"
              label="Desde"
              placeholder="Fecha inicio"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" sm="3">
            <AppDateTimePicker
              v-model="fechaFin"
              label="Hasta"
              placeholder="Fecha fin"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" sm="4">
            <AppAutocomplete
              v-model="selectedCliente"
              :items="[{ value: null, title: 'Todos los clientes' }, ...clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))]"
              label="Filtrar por cliente"
              placeholder="Todos los clientes"
              density="compact"
              clearable
            />
          </VCol>
          <VCol cols="12" sm="2" class="d-flex align-end">
            <VBtn block color="primary" variant="tonal" :loading="isLoadingStats || isLoadingClientes" @click="loadAll">
              <VIcon icon="tabler-refresh" class="me-1" size="16" />
              Actualizar
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- ── Stats cards ────────────────────────── -->
    <VRow class="mb-6">
      <!-- Facturado -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="warning" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-file-invoice" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Facturado</span>
              <span class="text-h6 font-weight-bold text-warning">{{ formatCurrency(stats.total_facturado) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Recaudado -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="success" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-circle-check" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Recaudado</span>
              <span class="text-h6 font-weight-bold text-success">{{ formatCurrency(stats.total_recaudado) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Efectivo -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="info" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-cash" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Efectivo</span>
              <span class="text-h6 font-weight-bold text-info">{{ formatCurrency(stats.total_efectivo_mes) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Transferencia -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="secondary" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-building-bank" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Transferencia</span>
              <span class="text-h6 font-weight-bold text-secondary">{{ formatCurrency(stats.total_transferencia_mes) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Pendiente -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="error" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-alert-circle" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Por cobrar</span>
              <span class="text-h6 font-weight-bold text-error">{{ formatCurrency(stats.total_pendiente) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Clientes con saldo -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="primary" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-users" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Con saldo</span>
              <span class="text-h6 font-weight-bold text-primary">{{ stats.clientes_con_saldo }}</span>
              <span class="text-xs text-disabled d-block">clientes</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tabla por cliente ───────────────────── -->
    <VCard elevation="2">
      <VCardItem class="pa-4">
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon icon="tabler-users" size="20" color="primary" />
          Cartera por Cliente
        </VCardTitle>
        <template #append>
          <VProgressCircular v-if="isLoadingClientes" indeterminate size="22" width="2" color="primary" />
        </template>
      </VCardItem>
      <VDivider />

      <VCardText class="pa-0">
        <!-- Empty -->
        <div v-if="!isLoadingClientes && carteraClientes.length === 0" class="py-12 text-center">
          <VIcon icon="tabler-report-off" size="56" color="disabled" class="mb-3" style="opacity:0.3" />
          <p class="text-body-1 text-disabled mb-0">
            No hay pedidos entregados en el período seleccionado
          </p>
        </div>

        <!-- Cards de clientes -->
        <div v-else class="pa-4 d-flex flex-column gap-3">
          <div
            v-for="cliente in carteraClientes"
            :key="cliente.cliente_id"
            class="cliente-card"
            @click="openDetalle(cliente)"
          >
            <!-- ── Zona superior: identidad + estado ── -->
            <div class="cliente-card__header">
              <div class="d-flex align-center gap-3">
                <VAvatar
                  :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                  variant="tonal"
                  size="44"
                  rounded="lg"
                >
                  <span class="text-body-1 font-weight-black">
                    {{ (cliente.nombre[0] || '').toUpperCase() }}{{ (cliente.apellido[0] || '').toUpperCase() }}
                  </span>
                </VAvatar>
                <div>
                  <div class="text-body-1 font-weight-bold text-on-surface">
                    {{ cliente.nombre }} {{ cliente.apellido }}
                  </div>
                  <div class="d-flex align-center gap-2 mt-1">
                    <VChip
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="tabler-shopping-bag"
                    >
                      {{ cliente.pedidos_count }} pedido{{ cliente.pedidos_count !== 1 ? 's' : '' }}
                    </VChip>
                    <VChip
                      size="x-small"
                      :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                      variant="tonal"
                    >
                      {{ cliente.saldo_pendiente > 0 ? 'Con saldo' : 'Al día' }}
                    </VChip>
                  </div>
                </div>
              </div>
              <VBtn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="tabler-eye"
                class="flex-shrink-0"
              >
                Ver detalle
              </VBtn>
            </div>

            <!-- ── Zona métricas: 4 columnas ── -->
            <div class="cliente-card__metrics">
              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--warning">
                  <VIcon icon="tabler-file-invoice" size="14" color="warning" />
                </div>
                <div class="metric-col__label">Facturado</div>
                <div class="metric-col__value text-warning">{{ formatCurrency(cliente.total_pedidos) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--success">
                  <VIcon icon="tabler-circle-check" size="14" color="success" />
                </div>
                <div class="metric-col__label">Recaudado</div>
                <div class="metric-col__value text-success">{{ formatCurrency(cliente.total_abonado) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--info">
                  <VIcon icon="tabler-cash" size="14" color="info" />
                </div>
                <div class="metric-col__label">Efectivo</div>
                <div class="metric-col__value text-info">{{ formatCurrency(cliente.total_efectivo) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--secondary">
                  <VIcon icon="tabler-building-bank" size="14" color="secondary" />
                </div>
                <div class="metric-col__label">Transferencia</div>
                <div class="metric-col__value text-secondary">{{ formatCurrency(cliente.total_transferencia) }}</div>
              </div>

              <div class="metric-divider metric-divider--strong" />

              <div class="metric-col metric-col--saldo">
                <div
                  class="metric-col__icon-wrap"
                  :class="cliente.saldo_pendiente > 0 ? 'metric-col__icon-wrap--error' : 'metric-col__icon-wrap--success'"
                >
                  <VIcon
                    :icon="cliente.saldo_pendiente > 0 ? 'tabler-alert-circle' : 'tabler-circle-check'"
                    size="14"
                    :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                  />
                </div>
                <div class="metric-col__label">Por cobrar</div>
                <div
                  class="metric-col__value font-weight-black"
                  :class="cliente.saldo_pendiente > 0 ? 'text-error' : 'text-success'"
                >
                  {{ formatCurrency(cliente.saldo_pendiente) }}
                </div>
              </div>
            </div>

            <!-- ── Barra progreso ── -->
            <div class="cliente-card__footer">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-xs text-disabled font-weight-medium">Progreso de cobro</span>
                <span
                  class="text-xs font-weight-bold"
                  :class="porcentajeCobrado(cliente) >= 100 ? 'text-success' : porcentajeCobrado(cliente) >= 50 ? 'text-warning' : 'text-error'"
                >{{ porcentajeCobrado(cliente) }}%</span>
              </div>
              <VProgressLinear
                :model-value="porcentajeCobrado(cliente)"
                :color="porcentajeCobrado(cliente) >= 100 ? 'success' : porcentajeCobrado(cliente) >= 50 ? 'warning' : 'error'"
                bg-color="rgba(var(--v-border-color), 0.2)"
                rounded
                height="6"
              />
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- ── Dialog Detalle Cliente ─────────────── -->
    <VDialog v-model="detalleDialogOpen" max-width="820" scrollable>
      <VCard v-if="clienteSeleccionadoInfo">
        <VCardItem class="pa-4">
          <VCardTitle class="d-flex align-center gap-2">
            <VIcon icon="tabler-user-circle" color="primary" size="20" />
            {{ clienteSeleccionadoInfo.nombre }} {{ clienteSeleccionadoInfo.apellido }}
          </VCardTitle>
          <template #append>
            <VBtn icon variant="text" size="small" @click="detalleDialogOpen = false">
              <VIcon icon="tabler-x" />
            </VBtn>
          </template>
        </VCardItem>
        <VDivider />

        <!-- Resumen del cliente -->
        <VCardText class="pa-4">
          <VRow dense class="mb-4">
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Facturado</span>
                <span class="resumen-val text-warning">{{ formatCurrency(clienteSeleccionadoInfo.total_pedidos) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Abonado</span>
                <span class="resumen-val text-success">{{ formatCurrency(clienteSeleccionadoInfo.total_abonado) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Efectivo</span>
                <span class="resumen-val text-info">{{ formatCurrency(clienteSeleccionadoInfo.total_efectivo) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box border-error">
                <span class="resumen-label">Saldo Pendiente</span>
                <span class="resumen-val text-error font-weight-bold">{{ formatCurrency(clienteSeleccionadoInfo.saldo_pendiente) }}</span>
              </div>
            </VCol>
          </VRow>

          <VProgressLinear
            :model-value="porcentajeCobrado(clienteSeleccionadoInfo)"
            :color="porcentajeCobrado(clienteSeleccionadoInfo) >= 100 ? 'success' : 'warning'"
            rounded height="8" class="mb-4"
          />

          <!-- Pedidos del cliente -->
          <div v-if="isLoadingDetalle" class="text-center py-6">
            <VProgressCircular indeterminate color="primary" />
          </div>

          <div v-else-if="detalleCliente.length === 0" class="text-center py-6 text-disabled">
            Sin pedidos entregados en el período
          </div>

          <div v-else>
            <div
              v-for="pedido in detalleCliente"
              :key="pedido.id"
              class="pedido-row mb-2"
            >
              <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                <div>
                  <div class="d-flex align-center gap-2">
                    <VChip size="x-small" color="primary" variant="tonal">{{ pedido.referencia }}</VChip>
                    <span class="font-weight-medium text-body-2">{{ pedido.titulo }}</span>
                  </div>
                  <div class="text-xs text-disabled mt-1">
                    <VIcon icon="tabler-calendar-check" size="12" class="me-1" />
                    Entregado: {{ formatDate(pedido.fecha_entregado) }}
                  </div>
                </div>
                <div class="d-flex gap-3 text-sm flex-wrap">
                  <span class="text-disabled">Total: <strong class="text-on-surface">{{ formatCurrency(pedido.total_pedido) }}</strong></span>
                  <span class="text-disabled">Abono: <strong class="text-success">{{ formatCurrency(pedido.total_abonado) }}</strong></span>
                  <span>
                    <VChip
                      size="small"
                      :color="pedido.saldo_pendiente <= 0 ? 'success' : 'error'"
                      variant="tonal"
                    >
                      {{ pedido.saldo_pendiente <= 0 ? 'Pagado' : `Debe: ${formatCurrency(pedido.saldo_pendiente)}` }}
                    </VChip>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style scoped>
/* ── Card principal ── */
.cliente-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  background: rgba(var(--v-theme-surface), 1);
}
.cliente-card:hover {
  box-shadow: 0 6px 24px rgba(var(--v-shadow-key-umbra-color), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.35);
  transform: translateY(-1px);
}

/* ── Header: identidad + botón ── */
.cliente-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  gap: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* ── Métricas: fila de columnas ── */
.cliente-card__metrics {
  display: flex;
  align-items: center;
  padding: 0;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 8px;
  gap: 4px;
  min-width: 0;
}
.metric-col--saldo {
  flex: 1.3;
}
.metric-col__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.metric-col__icon-wrap--warning { background: rgba(var(--v-theme-warning), 0.12); }
.metric-col__icon-wrap--success { background: rgba(var(--v-theme-success), 0.12); }
.metric-col__icon-wrap--info    { background: rgba(var(--v-theme-info),    0.12); }
.metric-col__icon-wrap--secondary { background: rgba(var(--v-theme-secondary), 0.12); }
.metric-col__icon-wrap--error   { background: rgba(var(--v-theme-error),   0.12); }

.metric-col__label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.45);
  white-space: nowrap;
}
.metric-col__value {
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

/* Divisores entre columnas */
.metric-divider {
  width: 1px;
  height: 40px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}
.metric-divider--strong {
  height: 48px;
  background: rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
}

/* ── Footer: barra progreso ── */
.cliente-card__footer {
  padding: 10px 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 1);
}

/* ── Resumen dentro del dialog ── */
.resumen-box {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
}
.resumen-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 600;
  margin-bottom: 4px;
}
.resumen-val {
  display: block;
  font-size: 1rem;
  font-weight: 700;
}
.pedido-row {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 14px;
  background: rgba(var(--v-theme-surface), 0.6);
}
</style>
