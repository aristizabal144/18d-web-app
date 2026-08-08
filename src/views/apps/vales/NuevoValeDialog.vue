<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  isDialogVisible: boolean
  usuarios: Array<{ id: string; nombre: string; apellido: string; email?: string }>
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
  (e: 'submit', payload: { usuario_id: string; beneficiario: string; concepto: string; monto_total: number; fecha_emision?: string }): void
}>()

const selectedUsuarioId = ref<string | null>(null)
const concepto = ref('')
const montoTotal = ref<number | null>(null)
const fechaEmision = ref(new Date().toISOString().substring(0, 10))

const isLoading = ref(false)
const refForm = ref()

watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    selectedUsuarioId.value = null
    concepto.value = ''
    montoTotal.value = null
    fechaEmision.value = new Date().toISOString().substring(0, 10)
  }
})

const selectedUser = computed(() => {
  if (!selectedUsuarioId.value) return null
  return props.usuarios.find(u => u.id === selectedUsuarioId.value) || null
})

const onSubmit = async () => {
  if (!selectedUsuarioId.value || !selectedUser.value) return
  if (!concepto.value.trim() || !montoTotal.value || montoTotal.value <= 0) return

  isLoading.value = true
  try {
    const beneficiarioNombre = `${selectedUser.value.nombre} ${selectedUser.value.apellido}`.trim()

    emit('submit', {
      usuario_id: selectedUsuarioId.value,
      beneficiario: beneficiarioNombre,
      concepto: concepto.value.trim(),
      monto_total: Number(montoTotal.value),
      fecha_emision: fechaEmision.value,
    })
    emit('update:isDialogVisible', false)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    max-width="550"
    persistent
    @update:model-value="val => emit('update:isDialogVisible', val)"
  >
    <VCard class="pa-2">
      <!-- Header -->
      <VCardItem class="pb-4">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-2">
            <VAvatar color="primary" variant="tonal" size="38" rounded>
              <VIcon icon="tabler-receipt-refund" size="22" />
            </VAvatar>
            <div>
              <h5 class="text-h5 font-weight-bold mb-0">Emitir Nuevo Vale</h5>
              <span class="text-caption text-disabled">Registro de préstamo para usuario del sistema</span>
            </div>
          </div>

          <VBtn icon variant="text" color="default" size="small" @click="emit('update:isDialogVisible', false)">
            <VIcon icon="tabler-x" size="20" />
          </VBtn>
        </div>
      </VCardItem>

      <VDivider class="mb-4" />

      <!-- Form Content -->
      <VForm ref="refForm" @submit.prevent="onSubmit">
        <VCardText class="pt-2">
          <VRow>
            <!-- Seleccionar Usuario -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Usuario del Sistema *
              </label>
              <AppAutocomplete
                v-model="selectedUsuarioId"
                :items="usuarios.map(u => ({ value: u.id, title: `${u.nombre} ${u.apellido}`, subtitle: u.email }))"
                placeholder="Buscar y seleccionar usuario..."
                density="compact"
                clearable
              />
            </VCol>

            <!-- Concepto / Motivo -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Concepto / Motivo del Vale *
              </label>
              <AppTextField
                v-model="concepto"
                placeholder="Ej: Avance de comisión, préstamo personal, anticipo..."
                density="compact"
              />
            </VCol>

            <!-- Monto Total -->
            <VCol cols="12" sm="6">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Monto Total ($) *
              </label>
              <AppTextField
                v-model.number="montoTotal"
                placeholder="0"
                type="number"
                prefix="$"
                density="compact"
              />
            </VCol>

            <!-- Fecha de Emisión -->
            <VCol cols="12" sm="6">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Fecha de Emisión *
              </label>
              <AppTextField
                v-model="fechaEmision"
                type="date"
                density="compact"
              />
            </VCol>
          </VRow>
        </VCardText>

        <!-- Actions -->
        <VCardText class="d-flex justify-end gap-3 pt-4">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="emit('update:isDialogVisible', false)"
          >
            Cancelar
          </VBtn>

          <VBtn
            color="primary"
            type="submit"
            :loading="isLoading"
            :disabled="!selectedUsuarioId || !concepto || !montoTotal"
          >
            Emitir Vale
          </VBtn>
        </VCardText>
      </VForm>
    </VCard>
  </VDialog>
</template>
