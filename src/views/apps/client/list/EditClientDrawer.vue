<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VForm } from 'vuetify/components/VForm'
import type { VForm as VFormType } from 'vuetify/components/VForm'

interface Emit {
  (e: 'update:isDrawerOpen', value: boolean): void
  (e: 'clientData', value: any): void
}

interface Props {
  isDrawerOpen: boolean
  client: any
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const isFormValid = ref(false)
const refForm = ref<VFormType>()

const id = ref('')
const nombre = ref('')
const apellido = ref('')
const telefono = ref('')

// Al abrir el drawer, cargamos los datos del cliente
watch(() => props.isDrawerOpen, (val) => {
  if (val && props.client) {
    id.value = props.client.id
    nombre.value = props.client.nombre
    apellido.value = props.client.apellido
    telefono.value = props.client.telefono || ''
  }
})

const closeNavigationDrawer = () => {
  emit('update:isDrawerOpen', false)
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      emit('clientData', {
        id: id.value,
        nombre: nombre.value,
        apellido: apellido.value,
        telefono: telefono.value,
      })
      emit('update:isDrawerOpen', false)
      nextTick(() => {
        refForm.value?.reset()
        refForm.value?.resetValidation()
      })
    }
  })
}

const handleDrawerModelValueUpdate = (val: boolean) => {
  emit('update:isDrawerOpen', val)
}

// Validaciones
const requiredValidator = (v: string) => !!v || 'Campo requerido'
const phoneValidator = (v: string) => {
  if (!v) return true // Es opcional
  return /^\+?[0-9\s\-()]{7,20}$/.test(v) || 'El teléfono debe tener entre 7 y 20 caracteres'
}
</script>

<template>
  <VNavigationDrawer
    temporary
    :width="400"
    location="end"
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <!-- 👉 Title -->
    <AppDrawerHeaderSection
      title="Editar Cliente"
      @cancel="closeNavigationDrawer"
    />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- 👉 Form -->
          <VForm
            ref="refForm"
            v-model="isFormValid"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- 👉 Email (Disabled) -->
              <VCol cols="12">
                <AppTextField
                  :model-value="props.client?.email"
                  label="Correo Electrónico"
                  disabled
                  hint="El correo no se puede cambiar"
                  persistent-hint
                />
              </VCol>

              <!-- 👉 Nombre -->
              <VCol cols="12">
                <AppTextField
                  v-model="nombre"
                  :rules="[requiredValidator]"
                  label="Nombre"
                />
              </VCol>

              <!-- 👉 Apellido -->
              <VCol cols="12">
                <AppTextField
                  v-model="apellido"
                  :rules="[requiredValidator]"
                  label="Apellido"
                />
              </VCol>

              <!-- 👉 Teléfono -->
              <VCol cols="12">
                <AppTextField
                  v-model="telefono"
                  :rules="[phoneValidator]"
                  label="Teléfono"
                />
              </VCol>

              <!-- 👉 Submit and Cancel -->
              <VCol cols="12">
                <VBtn
                  type="submit"
                  class="me-3"
                >
                  Actualizar
                </VBtn>
                <VBtn
                  type="reset"
                  variant="tonal"
                  color="error"
                  @click="closeNavigationDrawer"
                >
                  Cancelar
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>
