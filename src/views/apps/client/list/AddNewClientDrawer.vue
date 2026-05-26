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
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const isFormValid = ref(false)
const refForm = ref<VFormType>()

const nombre = ref('')
const apellido = ref('')
const email = ref('')
const telefono = ref('')
const password = ref('') // Contraseña agregada

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
        nombre: nombre.value,
        apellido: apellido.value,
        email: email.value,
        telefono: telefono.value,
        password: password.value, // Emitimos la contraseña
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
const emailValidator = (v: string) => /.+@.+\..+/.test(v) || 'El email debe ser válido'
const phoneValidator = (v: string) => {
  if (!v) return true // Es opcional
  return /^\+?[0-9\s\-()]{7,20}$/.test(v) || 'El teléfono debe tener entre 7 y 20 caracteres (números, espacios, -, +)'
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
      title="Agregar Nuevo Cliente"
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
              <!-- 👉 Nombre -->
              <VCol cols="12">
                <AppTextField
                  v-model="nombre"
                  :rules="[requiredValidator]"
                  label="Nombre"
                  placeholder="Juan"
                />
              </VCol>

              <!-- 👉 Apellido -->
              <VCol cols="12">
                <AppTextField
                  v-model="apellido"
                  :rules="[requiredValidator]"
                  label="Apellido"
                  placeholder="Pérez"
                />
              </VCol>

              <!-- 👉 Correo -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  :rules="[requiredValidator, emailValidator]"
                  label="Correo Electrónico"
                  placeholder="juan.perez@email.com"
                />
              </VCol>

              <!-- 👉 Contraseña -->
              <VCol cols="12">
                <AppTextField
                  v-model="password"
                  :rules="[requiredValidator]"
                  label="Contraseña"
                  placeholder="••••••••"
                  type="password"
                />
              </VCol>

              <!-- 👉 Teléfono -->
              <VCol cols="12">
                <AppTextField
                  v-model="telefono"
                  :rules="[phoneValidator]"
                  label="Teléfono"
                  placeholder="+1 234 567 890"
                />
              </VCol>

              <!-- 👉 Submit and Cancel -->
              <VCol cols="12">
                <VBtn
                  type="submit"
                  class="me-3"
                >
                  Guardar
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
