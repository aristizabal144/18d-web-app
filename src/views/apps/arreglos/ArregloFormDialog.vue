<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Arreglo } from './useArreglosStore'

const props = defineProps<{
  isDialogVisible: boolean
  arregloData?: Arreglo | null
  clientes: Array<{ id: string; nombre: string; apellido: string }>
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
  (e: 'submit', payload: { fecha: string; cantidad: number; descripcion: string; valor: number; cliente_id?: string | null }): void
}>()

const fecha = ref(new Date().toISOString().substring(0, 10))
const cantidad = ref<number>(1)
const descripcion = ref('')
const valor = ref<number | null>(null)
const clienteId = ref<string | null>(null)
const isLoading = ref(false)

const isEditing = computed(() => !!props.arregloData)

watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    if (props.arregloData) {
      fecha.value = props.arregloData.fecha?.substring(0, 10) || new Date().toISOString().substring(0, 10)
      cantidad.value = props.arregloData.cantidad || 1
      descripcion.value = props.arregloData.descripcion || ''
      valor.value = props.arregloData.valor || null
      clienteId.value = props.arregloData.cliente_id || null
    } else {
      fecha.value = new Date().toISOString().substring(0, 10)
      cantidad.value = 1
      descripcion.value = ''
      valor.value = null
      clienteId.value = null
    }
  }
})

const onSubmit = () => {
  if (!descripcion.value.trim() || !valor.value || valor.value <= 0) return

  isLoading.value = true
  try {
    emit('submit', {
      fecha: fecha.value,
      cantidad: cantidad.value || 1,
      descripcion: descripcion.value.trim(),
      valor: Number(valor.value),
      cliente_id: clienteId.value || null,
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
            <VAvatar :color="isEditing ? 'warning' : 'primary'" variant="tonal" size="38" rounded>
              <VIcon :icon="isEditing ? 'tabler-edit' : 'tabler-tools'" size="22" />
            </VAvatar>
            <div>
              <h5 class="text-h5 font-weight-bold mb-0">
                {{ isEditing ? 'Editar Arreglo' : 'Registrar Arreglo' }}
              </h5>
              <span class="text-caption text-disabled">
                {{ isEditing ? 'Modificar datos del servicio' : 'Nuevo servicio de taller' }}
              </span>
            </div>
          </div>

          <VBtn icon variant="text" color="default" size="small" @click="emit('update:isDialogVisible', false)">
            <VIcon icon="tabler-x" size="20" />
          </VBtn>
        </div>
      </VCardItem>

      <VDivider class="mb-4" />

      <!-- Form -->
      <VForm @submit.prevent="onSubmit">
        <VCardText class="pt-2">
          <VRow>
            <!-- Cliente -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Cliente
              </label>
              <AppAutocomplete
                v-model="clienteId"
                :items="clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))"
                placeholder="Seleccionar cliente..."
                density="compact"
                clearable
              />
            </VCol>

            <!-- Descripción -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Descripción del Arreglo *
              </label>
              <AppTextField
                v-model="descripcion"
                placeholder="Ej: Cambio de piedra en anillo, soldadura de cadena..."
                density="compact"
              />
            </VCol>

            <!-- Cantidad de Piezas -->
            <VCol cols="12" sm="4">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Cantidad *
              </label>
              <AppTextField
                v-model.number="cantidad"
                placeholder="1"
                type="number"
                min="1"
                density="compact"
              />
            </VCol>

            <!-- Valor -->
            <VCol cols="12" sm="4">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Valor ($) *
              </label>
              <AppTextField
                v-model.number="valor"
                placeholder="0"
                type="number"
                prefix="$"
                density="compact"
              />
            </VCol>

            <!-- Fecha -->
            <VCol cols="12" sm="4">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Fecha *
              </label>
              <AppTextField
                v-model="fecha"
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
            :disabled="!descripcion.trim() || !valor || valor <= 0"
          >
            {{ isEditing ? 'Actualizar' : 'Registrar' }}
          </VBtn>
        </VCardText>
      </VForm>
    </VCard>
  </VDialog>
</template>
