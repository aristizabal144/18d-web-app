<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Arreglo, ArregloPayload, ClienteArreglo, EstadoArreglo, TipoPagoArreglo } from './useArreglosStore'
import { toLocalDateStr } from './useArreglosStore'

const props = defineProps<{
  isDialogVisible: boolean
  arregloData?: Arreglo | null
  clientes: ClienteArreglo[]
  clienteInicial?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:isDialogVisible', val: boolean): void
  (e: 'submit', payload: ArregloPayload): void
}>()

const hoy = () => toLocalDateStr(new Date())

const fecha = ref(hoy())
const cantidad = ref<number>(1)
const descripcion = ref('')
const valor = ref<number | null>(null)
const clienteId = ref<string | null>(null)
const estado = ref<EstadoArreglo>('pendiente')
const fechaPago = ref<string | null>(null)
const tipoPago = ref<TipoPagoArreglo | null>(null)
const notas = ref('')
const isLoading = ref(false)

const isEditing = computed(() => !!props.arregloData)

const itemsClientes = computed(() =>
  props.clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` })),
)

watch(() => props.isDialogVisible, newVal => {
  if (!newVal)
    return

  const a = props.arregloData

  fecha.value = a?.fecha?.substring(0, 10) || hoy()
  cantidad.value = a?.cantidad || 1
  descripcion.value = a?.descripcion || ''
  valor.value = a?.valor || null
  clienteId.value = a ? a.cliente_id || null : props.clienteInicial || null
  estado.value = a?.estado || 'pendiente'
  fechaPago.value = a?.fecha_pago || null
  tipoPago.value = a?.tipo_pago || null
  notas.value = a?.notas || ''
})

watch(estado, nuevo => {
  if (nuevo === 'cancelado') {
    fechaPago.value ||= hoy()
    tipoPago.value ||= 'efectivo'
  }
})

const esValido = computed(() =>
  !!descripcion.value.trim()
  && !!valor.value && valor.value > 0
  && (estado.value === 'pendiente' || (!!fechaPago.value && !!tipoPago.value)),
)

const onSubmit = () => {
  if (!esValido.value)
    return

  isLoading.value = true
  try {
    const cancelado = estado.value === 'cancelado'

    emit('submit', {
      fecha: fecha.value,
      cantidad: cantidad.value || 1,
      descripcion: descripcion.value.trim(),
      valor: Number(valor.value),
      cliente_id: clienteId.value || null,
      estado: estado.value,
      fecha_pago: cancelado ? fechaPago.value : null,
      tipo_pago: cancelado ? tipoPago.value : null,
      notas: notas.value.trim() || null,
    })
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
    max-width="600"
    persistent
    @update:model-value="val => emit('update:isDialogVisible', val)"
  >
    <VCard class="pa-2">
      <!-- Header -->
      <VCardItem class="pb-4">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-2">
            <VAvatar
              :color="isEditing ? 'warning' : 'primary'"
              variant="tonal"
              size="38"
              rounded
            >
              <VIcon
                :icon="isEditing ? 'tabler-edit' : 'tabler-tools'"
                size="22"
              />
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

          <VBtn
            icon
            variant="text"
            color="default"
            size="small"
            @click="emit('update:isDialogVisible', false)"
          >
            <VIcon
              icon="tabler-x"
              size="20"
            />
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
                :items="itemsClientes"
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
            <VCol
              cols="12"
              sm="4"
            >
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
            <VCol
              cols="12"
              sm="4"
            >
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
            <VCol
              cols="12"
              sm="4"
            >
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Fecha *
              </label>
              <AppTextField
                v-model="fecha"
                type="date"
                density="compact"
              />
            </VCol>

            <!-- Estado -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Estado
              </label>
              <div class="d-flex gap-3">
                <VBtn
                  :variant="estado === 'pendiente' ? 'flat' : 'outlined'"
                  :color="estado === 'pendiente' ? 'warning' : 'secondary'"
                  class="flex-grow-1"
                  prepend-icon="tabler-clock"
                  @click="estado = 'pendiente'"
                >
                  Pendiente de pago
                </VBtn>
                <VBtn
                  :variant="estado === 'cancelado' ? 'flat' : 'outlined'"
                  :color="estado === 'cancelado' ? 'success' : 'secondary'"
                  class="flex-grow-1"
                  prepend-icon="tabler-circle-check"
                  @click="estado = 'cancelado'"
                >
                  Cancelado
                </VBtn>
              </div>
            </VCol>

            <!-- Datos de pago -->
            <template v-if="estado === 'cancelado'">
              <VCol
                cols="12"
                sm="6"
              >
                <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                  Medio de pago *
                </label>
                <AppSelect
                  v-model="tipoPago"
                  :items="[{ value: 'efectivo', title: 'Efectivo' }, { value: 'transferencia', title: 'Transferencia' }]"
                  density="compact"
                />
              </VCol>
              <VCol
                cols="12"
                sm="6"
              >
                <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                  Fecha de pago *
                </label>
                <AppTextField
                  v-model="fechaPago"
                  type="date"
                  density="compact"
                />
              </VCol>
            </template>

            <!-- Notas -->
            <VCol cols="12">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">
                Notas internas
              </label>
              <AppTextarea
                v-model="notas"
                placeholder="Ej: El cliente trae la piedra, recoger el viernes..."
                rows="2"
                auto-grow
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
            Cerrar
          </VBtn>

          <VBtn
            color="primary"
            type="submit"
            :loading="isLoading"
            :disabled="!esValido"
          >
            {{ isEditing ? 'Actualizar' : 'Registrar' }}
          </VBtn>
        </VCardText>
      </VForm>
    </VCard>
  </VDialog>
</template>
