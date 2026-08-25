<script setup lang="ts">
import type { Factura3dItem } from '@/views/apps/impresiones3d/useFacturas3dStore'

// ─── Props & Emits ──────────────────────────────────────────────────────────

interface Props {
  isDialogVisible: boolean
  clientes: Array<{ id: string; nombre: string; apellido: string }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'submit', payload: {
    fecha: string
    cliente_id: string | null
    notas?: string
    items: Omit<Factura3dItem, 'id' | 'factura_id'>[]
  }): void
}>()

// ─── State ──────────────────────────────────────────────────────────────────

const fecha = ref(new Date().toISOString().split('T')[0])
const clienteId = ref<string | null>(null)
const notas = ref('')
const isLoading = ref(false)

const items = ref<Array<{ nombre_molde: string; precio: number; peso: number }>>([
  { nombre_molde: '', precio: 55000, peso: 0 },
])

// ─── Computed ───────────────────────────────────────────────────────────────

const totalGeneral = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.peso || 0)), 0),
)

const pesoTotal = computed(() =>
  items.value.reduce((sum, item) => sum + Number(item.peso || 0), 0),
)

const clientesItems = computed(() => [
  { value: null, title: 'Sin cliente asignado' },
  ...props.clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` })),
])

const formValid = computed(() => {
  if (!fecha.value) return false
  if (items.value.length === 0) return false
  return items.value.every(item => item.nombre_molde.trim() !== '' && Number(item.peso) > 0)
})

// ─── Métodos ────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getItemSubtotal = (item: { precio: number; peso: number }) => {
  return Number(item.precio || 0) * Number(item.peso || 0)
}

const addItem = () => {
  items.value.push({ nombre_molde: '', precio: 55000, peso: 0 })
}

const removeItem = (index: number) => {
  if (items.value.length > 1)
    items.value.splice(index, 1)
}

const resetForm = () => {
  fecha.value = new Date().toISOString().split('T')[0]
  clienteId.value = null
  notas.value = ''
  items.value = [{ nombre_molde: '', precio: 55000, peso: 0 }]
}

const onClose = () => {
  resetForm()
  emit('update:isDialogVisible', false)
}

const onSubmit = async () => {
  if (!formValid.value) return
  isLoading.value = true
  try {
    await emit('submit', {
      fecha: fecha.value,
      cliente_id: clienteId.value,
      notas: notas.value || undefined,
      items: items.value.map(item => ({
        nombre_molde: item.nombre_molde,
        precio: Number(item.precio),
        peso: Number(item.peso),
      })),
    })
    resetForm()
    emit('update:isDialogVisible', false)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    max-width="820"
    persistent
    @update:model-value="$emit('update:isDialogVisible', $event)"
  >
    <VCard class="pa-1">
      <!-- ── Header ── -->
      <VCardItem class="pb-2">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-3">
            <VAvatar
              color="primary"
              variant="tonal"
              size="42"
              rounded="lg"
            >
              <VIcon icon="tabler-file-invoice" size="24" />
            </VAvatar>
            <div>
              <h5 class="text-h5 font-weight-bold mb-0">
                Nueva Factura de Impresión 3D
              </h5>
              <span class="text-caption text-disabled">
                Registra los moldes impresos con su peso y precio
              </span>
            </div>
          </div>
          <VBtn
            icon
            variant="text"
            color="default"
            size="small"
            @click="onClose"
          >
            <VIcon icon="tabler-x" size="20" />
          </VBtn>
        </div>
      </VCardItem>

      <VDivider />

      <VCardText class="pt-4">
        <!-- ── Cabecera de Factura ── -->
        <VRow dense class="mb-4">
          <VCol cols="12" sm="5">
            <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
              Fecha *
            </label>
            <AppDateTimePicker
              v-model="fecha"
              placeholder="Seleccionar fecha"
              :config="{ dateFormat: 'Y-m-d' }"
              density="compact"
            />
          </VCol>

          <VCol cols="12" sm="7">
            <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
              Cliente
            </label>
            <AppAutocomplete
              v-model="clienteId"
              :items="clientesItems"
              placeholder="Seleccionar cliente"
              density="compact"
              clearable
            />
          </VCol>

          <VCol cols="12">
            <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
              Notas (opcional)
            </label>
            <AppTextField
              v-model="notas"
              placeholder="Observaciones, referencias adicionales..."
              density="compact"
            />
          </VCol>
        </VRow>

        <VDivider class="mb-4" />

        <!-- ── Tabla de Ítems ── -->
        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-sm font-weight-bold text-uppercase text-medium-emphasis">
            Ítems de la Factura
          </span>
          <VBtn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="tabler-plus"
            @click="addItem"
          >
            Agregar ítem
          </VBtn>
        </div>

        <!-- Encabezado de columnas -->
        <div class="items-header d-none d-sm-grid mb-1 px-2">
          <span class="text-xs font-weight-bold text-uppercase text-disabled">Nombre del Molde</span>
          <span class="text-xs font-weight-bold text-uppercase text-disabled text-center">Precio / g</span>
          <span class="text-xs font-weight-bold text-uppercase text-disabled text-center">Peso (g)</span>
          <span class="text-xs font-weight-bold text-uppercase text-disabled text-end pe-2">Subtotal</span>
          <span />
        </div>

        <!-- Filas de ítems -->
        <div class="items-list">
          <div
            v-for="(item, index) in items"
            :key="index"
            class="item-row rounded-lg mb-2 pa-3"
          >
            <!-- Mobile: apilado / Desktop: en fila -->
            <div class="item-row__grid">
              <!-- Nombre del molde -->
              <AppTextField
                v-model="item.nombre_molde"
                :placeholder="`Molde ${index + 1}`"
                density="compact"
                :error="item.nombre_molde.trim() === '' && items.length > 0"
              />

              <!-- Precio -->
              <AppTextField
                v-model.number="item.precio"
                type="number"
                placeholder="55000"
                density="compact"
                prefix="$"
                min="0"
              />

              <!-- Peso -->
              <AppTextField
                v-model.number="item.peso"
                type="number"
                placeholder="0"
                density="compact"
                suffix="g"
                min="0"
                :error="Number(item.peso) <= 0"
              />

              <!-- Subtotal (Peso * Precio) -->
              <div class="text-end font-weight-bold text-success pe-2 text-truncate" style="font-size: 13px;">
                {{ formatCurrency(getItemSubtotal(item)) }}
              </div>

              <!-- Eliminar -->
              <div class="d-flex align-center justify-center">
                <IconBtn
                  color="error"
                  :disabled="items.length === 1"
                  @click="removeItem(index)"
                >
                  <VIcon icon="tabler-trash" size="18" />
                </IconBtn>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Totales ── -->
        <VDivider class="mt-3 mb-3" />

        <div class="totals-row pa-3 rounded-lg">
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center gap-6">
              <div class="d-flex flex-column align-center">
                <span class="text-caption text-disabled text-uppercase font-weight-bold">
                  Ítems
                </span>
                <span class="text-h6 font-weight-bold">
                  {{ items.length }}
                </span>
              </div>
              <VDivider vertical style="height: 32px;" />
              <div class="d-flex flex-column align-center">
                <span class="text-caption text-disabled text-uppercase font-weight-bold">
                  Peso Total
                </span>
                <span class="text-h6 font-weight-bold text-info">
                  {{ pesoTotal.toFixed(1) }} g
                </span>
              </div>
            </div>

            <div class="d-flex flex-column align-end">
              <span class="text-caption text-disabled text-uppercase font-weight-bold">
                Total Factura
              </span>
              <span class="text-h4 font-weight-bold text-primary">
                {{ formatCurrency(totalGeneral) }}
              </span>
            </div>
          </div>
        </div>
      </VCardText>

      <!-- ── Acciones ── -->
      <VCardText class="d-flex justify-end gap-3 pt-2">
        <VBtn
          variant="tonal"
          color="secondary"
          @click="onClose"
        >
          Cancelar
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="tabler-device-floppy"
          :loading="isLoading"
          :disabled="!formValid"
          @click="onSubmit"
        >
          Guardar Factura
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.items-header {
  display: grid;
  grid-template-columns: 1fr 130px 100px 130px 44px;
  gap: 8px;
}

.item-row {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: border-color 0.2s ease;
}

.item-row:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.item-row__grid {
  display: grid;
  grid-template-columns: 1fr 130px 100px 130px 44px;
  gap: 8px;
  align-items: center;
}

@media (max-width: 600px) {
  .items-header {
    display: none;
  }

  .item-row__grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto;
  }

  .item-row__grid > :last-child {
    grid-column: 1 / -1;
    justify-self: end;
  }
}

.totals-row {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}
</style>
