<script setup lang="ts">
import { usePedidosStore } from '@/views/apps/pedidos/usePedidosStore'
import type { Abono, Pedido, ResumenPagos } from '@/views/apps/pedidos/usePedidosStore'
import FacturaPedidoDialog from '@/components/dialogs/FacturaPedidoDialog.vue'

// =============================================
// Props & Emits
// =============================================
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

// =============================================
// Store
// =============================================
const pedidoStore = usePedidosStore()

// =============================================
// Estado
// =============================================
const abonos = ref<Abono[]>([])
const resumen = ref<ResumenPagos>({ total_pedido: 0, total_abonado: 0, saldo_pendiente: 0 })
const isLoading = ref(false)
const isSubmitting = ref(false)
const isDeletingId = ref<string | null>(null)

// Factura dialog
const facturaDialogOpen = ref(false)

// Formulario nuevo abono
const formValor = ref<number | null>(null)
const formTipoPago = ref<'efectivo' | 'transferencia'>('efectivo')
const formFecha = ref(new Date().toISOString().split('T')[0])
const formNotas = ref('')
const formError = ref('')

const tiposPago = [
  { value: 'efectivo', title: 'Efectivo', icon: 'tabler-cash', color: '#4CAF50' },
  { value: 'transferencia', title: 'Transferencia', icon: 'tabler-transfer', color: '#2196F3' },
]

// =============================================
// Cargar datos al abrir
// =============================================
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
    console.error(error)
  }
  finally {
    isLoading.value = false
  }
}

watch(() => props.modelValue, val => {
  if (val)
    loadData()
  else
    resetForm()
})

// =============================================
// Agregar abono
// =============================================
const addAbono = async () => {
  formError.value = ''
  if (!formValor.value || formValor.value <= 0) {
    formError.value = 'El valor debe ser mayor a 0'
    return
  }
  if (!props.pedido) return

  isSubmitting.value = true
  try {
    await pedidoStore.addAbono(
      props.pedido.id,
      formValor.value,
      formTipoPago.value,
      formFecha.value,
      formNotas.value || null,
    )
    resetForm()
    await loadData()
  }
  catch (error) {
    formError.value = 'Error al registrar el abono'
    console.error(error)
  }
  finally {
    isSubmitting.value = false
  }
}

// =============================================
// Pagar Total (abono por el saldo restante)
// =============================================
const pagarTotal = async () => {
  if (!props.pedido) return

  const saldo = resumen.value.saldo_pendiente
  if (saldo <= 0) return // ya pagado o saldo negativo

  isSubmitting.value = true
  try {
    await pedidoStore.addAbono(
      props.pedido.id,
      saldo,
      formTipoPago.value,
      formFecha.value,
      'Pago total del pedido',
    )
    await loadData()
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isSubmitting.value = false
  }
}

// =============================================
// Eliminar abono
// =============================================
const deleteAbono = async (abonoId: string) => {
  isDeletingId.value = abonoId
  try {
    await pedidoStore.deleteAbono(abonoId)
    await loadData()
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isDeletingId.value = null
  }
}

// =============================================
// Helpers
// =============================================
const resetForm = () => {
  formValor.value = null
  formTipoPago.value = 'efectivo'
  formFecha.value = new Date().toISOString().split('T')[0]
  formNotas.value = ''
  formError.value = ''
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('es-ES', options)
}

// Saldo info
const saldoInfo = computed(() => {
  const saldo = resumen.value.saldo_pendiente
  if (saldo === 0)
    return { label: 'Pagado', color: 'success', icon: 'tabler-circle-check', cardColor: 'rgba(var(--v-theme-success), 0.1)' }
  if (saldo < 0)
    return { label: 'Saldo a favor', color: 'warning', icon: 'tabler-exclamation-circle', cardColor: 'rgba(var(--v-theme-warning), 0.1)' }
  return { label: 'Pendiente de pago', color: 'error', icon: 'tabler-alert-circle', cardColor: 'rgba(var(--v-theme-error), 0.1)' }
})

// Porcentaje pagado (para la barra de progreso)
const porcentajePagado = computed(() => {
  const total = resumen.value.total_pedido
  const abonado = resumen.value.total_abonado
  if (total <= 0) return abonado > 0 ? 100 : 0
  const pct = (abonado / total) * 100
  return Math.min(Math.max(pct, 0), 100)
})
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="760"
    scrollable
  >
    <VCard v-if="pedido">
      <!-- ========================================== -->
      <!-- Header -->
      <!-- ========================================== -->
      <VCardTitle class="d-flex align-center justify-space-between pa-4 pb-2">
        <div class="d-flex align-center gap-3">
          <div class="dialog-icon-wrapper">
            <VIcon
              icon="tabler-receipt-2"
              size="22"
              color="primary"
            />
          </div>
          <div>
            <div class="text-h6 font-weight-bold">
              Gestión de Pagos
            </div>
            <div class="text-sm text-disabled font-mono">
              {{ pedido.referencia }} · {{ pedido.titulo }}
            </div>
          </div>
        </div>
        <div class="d-flex align-center gap-2">
          <VBtn
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="tabler-file-invoice"
            @click="facturaDialogOpen = true"
          >
            Ver Factura
          </VBtn>
          <VChip
            :color="saldoInfo.color"
            :prepend-icon="saldoInfo.icon"
            size="small"
            variant="tonal"
          >
            {{ saldoInfo.label }}
          </VChip>
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

      <VDivider />

      <VCardText
        class="pa-4"
        style="max-block-size: 75vh; overflow-y: auto;"
      >
        <!-- ========================================== -->
        <!-- Panel financiero -->
        <!-- ========================================== -->
        <VRow
          class="mb-4"
          dense
        >
          <!-- Total Pedido -->
          <VCol
            cols="12"
            sm="4"
          >
            <div class="finance-card">
              <div class="finance-card__label">
                <VIcon
                  icon="tabler-shopping-cart"
                  size="14"
                  class="me-1"
                />
                Total Pedido
              </div>
              <div class="finance-card__value text-on-surface">
                {{ formatCurrency(resumen.total_pedido) }}
              </div>
              <div
                v-if="resumen.total_pedido === 0"
                class="text-xs text-disabled mt-1"
              >
                Pendiente de calcular
              </div>
            </div>
          </VCol>

          <!-- Total Abonado -->
          <VCol
            cols="12"
            sm="4"
          >
            <div class="finance-card finance-card--abonado">
              <div class="finance-card__label">
                <VIcon
                  icon="tabler-circle-check"
                  size="14"
                  class="me-1"
                />
                Total Abonado
              </div>
              <div class="finance-card__value text-success">
                {{ formatCurrency(resumen.total_abonado) }}
              </div>
              <!-- Barra de progreso -->
              <VProgressLinear
                :model-value="porcentajePagado"
                color="success"
                rounded
                height="4"
                class="mt-2"
              />
              <div class="text-xs text-disabled mt-1">
                {{ porcentajePagado.toFixed(0) }}% pagado
              </div>
            </div>
          </VCol>

          <!-- Saldo Pendiente -->
          <VCol
            cols="12"
            sm="4"
          >
            <div
              class="finance-card"
              :style="{ background: saldoInfo.cardColor }"
            >
              <div class="finance-card__label">
                <VIcon
                  :icon="saldoInfo.icon"
                  size="14"
                  class="me-1"
                />
                Saldo
              </div>
              <div
                class="finance-card__value"
                :class="`text-${saldoInfo.color}`"
              >
                {{ formatCurrency(resumen.saldo_pendiente) }}
              </div>
              <div
                v-if="resumen.saldo_pendiente < 0"
                class="text-xs text-warning mt-1"
              >
                Abono anticipado
              </div>
              <div
                v-else-if="resumen.saldo_pendiente === 0 && resumen.total_abonado > 0"
                class="text-xs text-success mt-1"
              >
                ¡Pagado completo!
              </div>
            </div>
          </VCol>
        </VRow>

        <!-- ========================================== -->
        <!-- Formulario nuevo abono -->
        <!-- ========================================== -->
        <VCard
          variant="outlined"
          class="mb-4"
        >
          <VCardText class="pa-3">
            <div class="d-flex align-center gap-2 mb-3">
              <VIcon
                icon="tabler-plus-circle"
                size="18"
                color="primary"
              />
              <span class="text-sm font-weight-semibold">Registrar Abono</span>
            </div>

            <VRow dense>
              <!-- Valor -->
              <VCol
                cols="12"
                sm="4"
              >
                <VTextField
                  v-model.number="formValor"
                  label="Valor *"
                  type="number"
                  prefix="$"
                  density="compact"
                  variant="outlined"
                  :min="1"
                  :error-messages="formError"
                  hide-details="auto"
                />
              </VCol>

              <!-- Tipo de pago -->
              <VCol
                cols="12"
                sm="4"
              >
                <VSelect
                  v-model="formTipoPago"
                  :items="tiposPago"
                  item-value="value"
                  item-title="title"
                  label="Tipo de pago *"
                  density="compact"
                  variant="outlined"
                  hide-details
                >
                  <template #item="{ item, props: itemProps }">
                    <VListItem v-bind="itemProps">
                      <template #prepend>
                        <VIcon
                          :icon="item.raw.icon"
                          :color="item.raw.color"
                          size="18"
                        />
                      </template>
                    </VListItem>
                  </template>
                  <template #selection="{ item }">
                    <div class="d-flex align-center gap-2">
                      <VIcon
                        :icon="item.raw.icon"
                        :color="item.raw.color"
                        size="16"
                      />
                      <span>{{ item.raw.title }}</span>
                    </div>
                  </template>
                </VSelect>
              </VCol>

              <!-- Fecha -->
              <VCol
                cols="12"
                sm="4"
              >
                <VTextField
                  v-model="formFecha"
                  label="Fecha *"
                  type="date"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </VCol>

              <!-- Notas -->
              <VCol cols="12">
                <VTextField
                  v-model="formNotas"
                  label="Notas (opcional)"
                  density="compact"
                  variant="outlined"
                  hide-details
                  placeholder="Ej: Anticipo inicial, cuota #2..."
                />
              </VCol>
            </VRow>

            <!-- Botones acción -->
            <div class="d-flex gap-2 mt-3 flex-wrap">
              <VBtn
                color="primary"
                size="small"
                prepend-icon="tabler-plus"
                :loading="isSubmitting"
                @click="addAbono"
              >
                Agregar Abono
              </VBtn>

              <!-- Pagar Total -->
              <VBtn
                v-if="resumen.saldo_pendiente > 0"
                color="success"
                size="small"
                variant="tonal"
                prepend-icon="tabler-circle-check"
                :loading="isSubmitting"
                @click="pagarTotal"
              >
                Pagar Total ({{ formatCurrency(resumen.saldo_pendiente) }})
              </VBtn>
            </div>
          </VCardText>
        </VCard>

        <!-- ========================================== -->
        <!-- Tabla de abonos existentes -->
        <!-- ========================================== -->
        <div class="d-flex align-center gap-2 mb-2">
          <VIcon
            icon="tabler-list-details"
            size="18"
            color="secondary"
          />
          <span class="text-sm font-weight-semibold">Historial de Abonos</span>
          <VChip
            size="x-small"
            color="secondary"
            variant="tonal"
          >
            {{ abonos.length }}
          </VChip>
        </div>

        <!-- Loading -->
        <VProgressLinear
          v-if="isLoading"
          indeterminate
          color="primary"
          class="mb-2"
        />

        <!-- Sin abonos -->
        <div
          v-if="!isLoading && abonos.length === 0"
          class="d-flex flex-column align-center py-6 text-disabled"
        >
          <VIcon
            icon="tabler-receipt-off"
            size="40"
            class="mb-2"
            style="opacity: 0.3;"
          />
          <span class="text-sm">No hay abonos registrados</span>
        </div>

        <!-- Lista de abonos -->
        <div
          v-else
          class="abonos-list"
        >
          <div
            v-for="abono in abonos"
            :key="abono.id"
            class="abono-item"
          >
            <div class="abono-item__left">
              <VChip
                size="x-small"
                :color="abono.tipo_pago === 'efectivo' ? 'success' : 'info'"
                variant="tonal"
                :prepend-icon="abono.tipo_pago === 'efectivo' ? 'tabler-cash' : 'tabler-transfer'"
              >
                {{ abono.tipo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia' }}
              </VChip>
              <span class="text-xs text-disabled ms-2">
                <VIcon
                  icon="tabler-calendar"
                  size="12"
                  class="me-1"
                />
                {{ formatDate(abono.fecha) }}
              </span>
            </div>

            <div class="abono-item__notes text-xs text-disabled">
              {{ abono.notas || '' }}
            </div>

            <div class="abono-item__right">
              <span class="font-weight-bold text-success abono-item__valor">
                + {{ formatCurrency(abono.valor) }}
              </span>
              <VBtn
                icon
                variant="text"
                size="x-small"
                color="error"
                :loading="isDeletingId === abono.id"
                @click="deleteAbono(abono.id)"
              >
                <VIcon
                  icon="tabler-trash"
                  size="16"
                />
              </VBtn>
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- 👉 Dialog Factura integrando desde Abonos -->
    <FacturaPedidoDialog
      v-model="facturaDialogOpen"
      :pedido="pedido"
    />
  </VDialog>
</template>

<style lang="scss" scoped>
.font-mono {
  font-family: monospace;
}

.dialog-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.1);
  block-size: 40px;
  inline-size: 40px;
}

// ── Finance Cards ──────────────────────────
.finance-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  padding: 14px 16px;
  background: rgba(var(--v-theme-surface), 1);
  block-size: 100%;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(var(--v-shadow-key-umbra-color), 0.1);
  }

  &__label {
    display: flex;
    align-items: center;
    margin-block-end: 4px;
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  &__value {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.2;
  }
}

// ── Abonos List ────────────────────────────
.abonos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.abono-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 14px;
  background: rgba(var(--v-theme-surface), 0.6);
  gap: 8px;
  transition: background 0.15s;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.03);
  }

  &__left {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }

  &__notes {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-inline: 8px;
  }

  &__right {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 4px;
  }

  &__valor {
    font-size: 0.95rem;
    letter-spacing: 0.2px;
  }
}
</style>
