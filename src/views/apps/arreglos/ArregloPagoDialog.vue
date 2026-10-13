<script setup lang="ts">
import type { DatosPago, TipoPagoArreglo } from './useArreglosStore'
import { toLocalDateStr } from './useArreglosStore'

const props = defineProps<{
  isDialogVisible: boolean
  cantidad: number
  total: number
  descripcion?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
  (e: 'confirm', pago: DatosPago): void
}>()

const { formatCurrency } = useFormato()

const fechaPago = ref(toLocalDateStr(new Date()))
const tipoPago = ref<TipoPagoArreglo>('efectivo')

const opcionesPago: { value: TipoPagoArreglo; title: string; icon: string }[] = [
  { value: 'efectivo', title: 'Efectivo', icon: 'tabler-cash' },
  { value: 'transferencia', title: 'Transferencia', icon: 'tabler-building-bank' },
]

watch(() => props.isDialogVisible, visible => {
  if (visible) {
    fechaPago.value = toLocalDateStr(new Date())
    tipoPago.value = 'efectivo'
  }
})

const confirmar = () => {
  if (!fechaPago.value)
    return

  emit('confirm', { fecha_pago: fechaPago.value, tipo_pago: tipoPago.value })
}
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    max-width="460"
    @update:model-value="val => emit('update:isDialogVisible', val)"
  >
    <VCard>
      <VCardItem class="pb-2">
        <template #prepend>
          <VAvatar
            color="success"
            variant="tonal"
            size="42"
            rounded="lg"
          >
            <VIcon
              icon="tabler-cash-register"
              size="24"
            />
          </VAvatar>
        </template>
        <VCardTitle class="text-h5 font-weight-bold">
          Registrar pago
        </VCardTitle>
        <VCardSubtitle>
          {{ descripcion || `${cantidad} arreglo(s) pasarán a cancelado` }}
        </VCardSubtitle>
        <template #append>
          <IconBtn @click="emit('update:isDialogVisible', false)">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </template>
      </VCardItem>

      <VCardText>
        <div class="total-box pa-4 rounded-lg mb-5 d-flex align-center justify-space-between">
          <div>
            <div class="text-caption text-uppercase font-weight-bold text-disabled">
              Total a recibir
            </div>
            <div class="text-xs text-disabled">
              {{ cantidad }} arreglo(s)
            </div>
          </div>
          <span class="text-h4 font-weight-bold text-success">{{ formatCurrency(total) }}</span>
        </div>

        <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-2 d-block">Medio de pago</label>
        <div class="d-flex gap-3 mb-5">
          <VBtn
            v-for="op in opcionesPago"
            :key="op.value"
            :variant="tipoPago === op.value ? 'flat' : 'outlined'"
            :color="tipoPago === op.value ? 'primary' : 'secondary'"
            class="flex-grow-1"
            :prepend-icon="op.icon"
            @click="tipoPago = op.value"
          >
            {{ op.title }}
          </VBtn>
        </div>

        <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Fecha de pago</label>
        <AppTextField
          v-model="fechaPago"
          type="date"
          density="compact"
        />
      </VCardText>

      <VCardText class="d-flex justify-end gap-3">
        <VBtn
          variant="tonal"
          color="secondary"
          @click="emit('update:isDialogVisible', false)"
        >
          Volver
        </VBtn>
        <VBtn
          color="success"
          prepend-icon="tabler-check"
          :loading="loading"
          :disabled="!fechaPago || !cantidad"
          @click="confirmar"
        >
          Marcar como cancelado
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.total-box {
  border: 1px dashed rgba(var(--v-theme-success), 0.5);
  background: rgba(var(--v-theme-success), 0.06);
}
</style>
