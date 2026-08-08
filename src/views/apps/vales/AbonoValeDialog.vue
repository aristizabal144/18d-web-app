<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Vale } from './useValesStore'

const props = defineProps<{
  isDialogVisible: boolean
  vale: Vale | null
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
  (e: 'submitAbono', payload: { vale_id: string; valor: number; tipo_pago: 'efectivo' | 'transferencia'; notas?: string }): void
  (e: 'submitCancelarTotal', payload: { vale_id: string; tipo_pago: 'efectivo' | 'transferencia'; notas?: string }): void
}>()

const valorAbono = ref<number | null>(null)
const tipoPago = ref<'efectivo' | 'transferencia'>('efectivo')
const notas = ref('')
const isLoading = ref(false)

const saldoPendiente = computed(() => {
  if (!props.vale) return 0
  return Number(props.vale.saldo_pendiente ?? (props.vale.monto_total - props.vale.monto_abonado))
})

watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    valorAbono.value = null
    tipoPago.value = 'efectivo'
    notas.value = ''
  }
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const onRegistrarAbono = () => {
  if (!props.vale || !valorAbono.value || valorAbono.value <= 0) return
  if (valorAbono.value > saldoPendiente.value) {
    alert(`El valor del abono no puede superar el saldo pendiente (${formatCurrency(saldoPendiente.value)})`)
    return
  }

  isLoading.value = true
  try {
    emit('submitAbono', {
      vale_id: props.vale.id,
      valor: Number(valorAbono.value),
      tipo_pago: tipoPago.value,
      notas: notas.value.trim() || undefined,
    })
    emit('update:isDialogVisible', false)
  } finally {
    isLoading.value = false
  }
}

const onCancelarTotalmente = () => {
  if (!props.vale) return
  if (confirm(`¿Estás seguro de cancelar totalmente el vale de ${props.vale.beneficiario} por valor de ${formatCurrency(saldoPendiente.value)}?`)) {
    isLoading.value = true
    try {
      emit('submitCancelarTotal', {
        vale_id: props.vale.id,
        tipo_pago: tipoPago.value,
        notas: notas.value.trim() || 'Cancelación total del vale',
      })
      emit('update:isDialogVisible', false)
    } finally {
      isLoading.value = false
    }
  }
}
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    max-width="500"
    persistent
    @update:model-value="val => emit('update:isDialogVisible', val)"
  >
    <VCard v-if="vale" class="pa-2">
      <!-- Header -->
      <VCardItem class="pb-4">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-2">
            <VAvatar color="success" variant="tonal" size="38" rounded>
              <VIcon icon="tabler-currency-dollar" size="22" />
            </VAvatar>
            <div>
              <h5 class="text-h5 font-weight-bold mb-0">Registrar Abono</h5>
              <span class="text-caption text-disabled">Actualizar saldo o cancelar vale</span>
            </div>
          </div>

          <VBtn icon variant="text" color="default" size="small" @click="emit('update:isDialogVisible', false)">
            <VIcon icon="tabler-x" size="20" />
          </VBtn>
        </div>
      </VCardItem>

      <VDivider class="mb-4" />

      <VCardText class="pt-2">
        <!-- Summary Box -->
        <VAlert color="primary" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="font-weight-bold">{{ vale.beneficiario }}</span>
            <VChip size="small" color="primary" class="font-weight-bold">
              {{ vale.concepto }}
            </VChip>
          </div>
          <div class="d-flex justify-space-between text-xs mt-2">
            <span>Monto Total: <strong>{{ formatCurrency(vale.monto_total) }}</strong></span>
            <span>Abonado: <strong class="text-success">{{ formatCurrency(vale.monto_abonado) }}</strong></span>
          </div>
          <div class="d-flex justify-space-between text-sm font-weight-bold mt-2 pt-2 border-t">
            <span class="text-error">Saldo Pendiente:</span>
            <span class="text-error text-h6 font-weight-bold">{{ formatCurrency(saldoPendiente) }}</span>
          </div>
        </VAlert>

        <VForm @submit.prevent="onRegistrarAbono">
          <VRow>
            <!-- Medio de Pago -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Medio de Pago *</label>
              <VBtnToggle
                v-model="tipoPago"
                mandatory
                color="primary"
                variant="outlined"
                class="w-100 d-flex"
                density="compact"
              >
                <VBtn value="efectivo" class="flex-grow-1" prepend-icon="tabler-cash">
                  Efectivo
                </VBtn>
                <VBtn value="transferencia" class="flex-grow-1" prepend-icon="tabler-building-bank">
                  Transferencia
                </VBtn>
              </VBtnToggle>
            </VCol>

            <!-- Monto a Abonar -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Valor del Abono ($) *</label>
              <AppTextField
                v-model.number="valorAbono"
                placeholder="0"
                type="number"
                prefix="$"
                density="compact"
                :max="saldoPendiente"
              />
            </VCol>

            <!-- Notas / Referencia de Pago -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Notas / Comprobante (Opcional)</label>
              <AppTextField
                v-model="notas"
                placeholder="Ej: Abono entregado en efectivo"
                density="compact"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardText class="d-flex justify-space-between align-center pt-4">
        <!-- Cancelar Totalmente -->
        <VBtn
          color="error"
          variant="tonal"
          size="small"
          prepend-icon="tabler-circle-check-filled"
          :loading="isLoading"
          @click="onCancelarTotalmente"
        >
          Cancelar Totalmente
        </VBtn>

        <div class="d-flex gap-2">
          <VBtn variant="tonal" color="secondary" @click="emit('update:isDialogVisible', false)">
            Cerrar
          </VBtn>
          <VBtn color="success" :loading="isLoading" :disabled="!valorAbono || valorAbono <= 0" @click="onRegistrarAbono">
            Abonar
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
