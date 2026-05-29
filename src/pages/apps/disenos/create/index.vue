<script setup lang="ts">
import { useDisenos3dStore } from '@/views/apps/disenos/useDisenos3dStore'

const disenoStore = useDisenos3dStore()
const router = useRouter()

// 👉 Form state
const isFormValid = ref(false)
const refForm = ref()
const isSubmitting = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// 👉 Form data
const titulo = ref('')
const descripcion = ref('')
const fechaInicio = ref('')
const fechaFin = ref('')
const talla = ref('')
const peso = ref<number | null>(null)
const colorId = ref<number | null>(null)
const responsableId = ref('')
const clienteId = ref('')
const precioDiseno = ref(0)
const precioImpresion = ref(0)

// 👉 Image
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// 👉 Lookup data
const colores = ref<{ id: number; nombre: string }[]>([])
const responsables = ref<{ id: string; nombre: string; apellido: string }[]>([])
const clientes = ref<{ id: string; nombre: string; apellido: string }[]>([])

// 👉 Color visual map for preview
const colorVisualMap: Record<string, string> = {
  Amarillo: '#C9A84C',
  Blanco: '#C0C0C0',
  Rosado: '#E91E63',
  Multicolor: 'linear-gradient(135deg, #C9A84C, #C0C0C0, #E91E63)',
}

// 👉 Load lookups
const loadLookups = async () => {
  try {
    const [coloresData, responsablesData, clientesData] = await Promise.all([
      disenoStore.fetchColores(),
      disenoStore.fetchResponsables(),
      disenoStore.fetchClientes(),
    ])

    colores.value = coloresData
    responsables.value = responsablesData
    clientes.value = clientesData
  } catch (error) {
    console.error('Error loading lookups:', error)
  }
}

onMounted(() => {
  loadLookups()
})

// 👉 Image handling
const onImageSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      snackbar.value = { show: true, message: 'Solo se permiten archivos de imagen', color: 'error' }
      return
    }

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      snackbar.value = { show: true, message: 'La imagen no debe superar 5MB', color: 'error' }
      return
    }

    imageFile.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

const removeImage = () => {
  imageFile.value = null
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = null
  }
}

// 👉 Computed: precio total
const precioTotal = computed(() => (precioDiseno.value || 0) + (precioImpresion.value || 0))

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// 👉 Validators
const requiredValidator = (v: any) => !!v || 'Campo requerido'
const requiredSelectValidator = (v: any) => v !== null && v !== undefined && v !== '' || 'Selecciona una opción'

// 👉 Submit
const onSubmit = async () => {
  const { valid } = await refForm.value?.validate()
  if (!valid) return

  isSubmitting.value = true
  try {
    await disenoStore.addDiseno({
      titulo: titulo.value,
      descripcion: descripcion.value || null,
      fecha_inicio: fechaInicio.value,
      fecha_fin: fechaFin.value,
      talla: talla.value || null,
      peso: peso.value,
      color_id: colorId.value!,
      responsable_id: responsableId.value,
      cliente_id: clienteId.value,
      precio_diseno: precioDiseno.value || 0,
      precio_impresion: precioImpresion.value || 0,
    }, imageFile.value)

    snackbar.value = { show: true, message: 'Diseño creado exitosamente', color: 'success' }

    // Redirigir al listado después de un breve delay
    setTimeout(() => {
      router.push({ name: 'apps-disenos-list' })
    }, 800)
  } catch (error: any) {
    console.error('Error creating diseño:', error)
    snackbar.value = { show: true, message: error.message || 'Error al crear el diseño', color: 'error' }
  } finally {
    isSubmitting.value = false
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }
})
</script>

<template>
  <section>
    <!-- 👉 Header -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <VBtn
            icon
            variant="text"
            size="small"
            :to="{ name: 'apps-disenos-list' }"
          >
            <VIcon icon="tabler-arrow-left" />
          </VBtn>
          <h4 class="text-h4 font-weight-bold">Nuevo Diseño 3D</h4>
        </div>
        <p class="text-body-1 text-disabled mb-0 ms-10">
          Completa la información para registrar un nuevo diseño
        </p>
      </div>
    </div>

    <VForm
      ref="refForm"
      v-model="isFormValid"
      @submit.prevent="onSubmit"
    >
      <VRow>
        <!-- ======================== -->
        <!-- COLUMNA IZQUIERDA: Formulario -->
        <!-- ======================== -->
        <VCol cols="12" lg="8">
          <!-- Información Principal -->
          <VCard class="mb-6">
            <VCardText>
              <div class="d-flex align-center gap-2 mb-4">
                <VAvatar color="primary" variant="tonal" size="36">
                  <VIcon icon="tabler-cube-3d-sphere" size="20" />
                </VAvatar>
                <h6 class="text-h6 font-weight-medium">Información del Diseño</h6>
              </div>

              <VRow>
                <!-- Título -->
                <VCol cols="12">
                  <AppTextField
                    v-model="titulo"
                    :rules="[requiredValidator]"
                    label="Título del Diseño *"
                    placeholder="Ej: Anillo de compromiso solitario"
                  />
                </VCol>

                <!-- Descripción -->
                <VCol cols="12">
                  <AppTextarea
                    v-model="descripcion"
                    label="Descripción"
                    placeholder="Describe los detalles del diseño, especificaciones técnicas, etc."
                    rows="3"
                  />
                </VCol>

                <!-- Fechas -->
                <VCol cols="12" md="6">
                  <AppDateTimePicker
                    v-model="fechaInicio"
                    :rules="[requiredValidator]"
                    label="Fecha de Inicio *"
                    placeholder="Seleccionar fecha"
                    :config="{ dateFormat: 'Y-m-d' }"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppDateTimePicker
                    v-model="fechaFin"
                    :rules="[requiredValidator]"
                    label="Fecha de Entrega *"
                    placeholder="Seleccionar fecha"
                    :config="{ dateFormat: 'Y-m-d' }"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Especificaciones Técnicas -->
          <VCard class="mb-6">
            <VCardText>
              <div class="d-flex align-center gap-2 mb-4">
                <VAvatar color="info" variant="tonal" size="36">
                  <VIcon icon="tabler-settings" size="20" />
                </VAvatar>
                <h6 class="text-h6 font-weight-medium">Especificaciones Técnicas</h6>
              </div>

              <VRow>
                <!-- Color del Oro -->
                <VCol cols="12" md="4">
                  <AppSelect
                    v-model="colorId"
                    :rules="[requiredSelectValidator]"
                    :items="colores.map(c => ({ value: c.id, title: c.nombre }))"
                    label="Color del Oro *"
                    placeholder="Seleccionar color"
                  />
                </VCol>

                <!-- Talla -->
                <VCol cols="12" md="4">
                  <AppTextField
                    v-model="talla"
                    label="Talla"
                    placeholder="Ej: 7, 8.5"
                    hint="Solo para anillos"
                    persistent-hint
                  />
                </VCol>

                <!-- Peso -->
                <VCol cols="12" md="4">
                  <AppTextField
                    v-model.number="peso"
                    label="Peso (gramos)"
                    placeholder="Ej: 3.5"
                    type="number"
                    step="0.001"
                    hint="Peso del trabajo terminado"
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Asignación -->
          <VCard class="mb-6">
            <VCardText>
              <div class="d-flex align-center gap-2 mb-4">
                <VAvatar color="warning" variant="tonal" size="36">
                  <VIcon icon="tabler-users" size="20" />
                </VAvatar>
                <h6 class="text-h6 font-weight-medium">Asignación</h6>
              </div>

              <VRow>
                <!-- Responsable -->
                <VCol cols="12" md="6">
                  <AppAutocomplete
                    v-model="responsableId"
                    :rules="[requiredSelectValidator]"
                    :items="responsables.map(r => ({ value: r.id, title: `${r.nombre} ${r.apellido}` }))"
                    label="Responsable (Diseñador) *"
                    placeholder="Buscar diseñador..."
                  />
                </VCol>

                <!-- Cliente -->
                <VCol cols="12" md="6">
                  <AppAutocomplete
                    v-model="clienteId"
                    :rules="[requiredSelectValidator]"
                    :items="clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))"
                    label="Cliente *"
                    placeholder="Buscar cliente..."
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>

        <!-- ======================== -->
        <!-- COLUMNA DERECHA: Imagen + Precios -->
        <!-- ======================== -->
        <VCol cols="12" lg="4">
          <!-- Imagen del Diseño -->
          <VCard class="mb-6">
            <VCardText>
              <div class="d-flex align-center gap-2 mb-4">
                <VAvatar color="success" variant="tonal" size="36">
                  <VIcon icon="tabler-photo" size="20" />
                </VAvatar>
                <h6 class="text-h6 font-weight-medium">Imagen</h6>
              </div>

              <!-- Preview -->
              <div
                v-if="imagePreview"
                class="position-relative mb-4 rounded overflow-hidden"
              >
                <VImg
                  :src="imagePreview"
                  height="220"
                  cover
                  class="rounded"
                />
                <VBtn
                  icon
                  variant="flat"
                  color="error"
                  size="x-small"
                  class="position-absolute"
                  style="inset-block-start: 8px; inset-inline-end: 8px;"
                  @click="removeImage"
                >
                  <VIcon icon="tabler-x" size="14" />
                </VBtn>
              </div>

              <!-- Upload area -->
              <div
                v-else
                class="upload-area d-flex flex-column align-center justify-center rounded pa-6"
                style="border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity)); cursor: pointer; min-block-size: 180px;"
                @click="($refs.fileInput as HTMLInputElement)?.click()"
              >
                <VIcon icon="tabler-cloud-upload" size="40" color="primary" class="mb-2" style="opacity: 0.6;" />
                <p class="text-sm font-weight-medium mb-1">Clic para subir imagen</p>
                <p class="text-xs text-disabled mb-0">PNG, JPG o WEBP (máx. 5MB)</p>
              </div>

              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none;"
                @change="onImageSelected"
              >
            </VCardText>
          </VCard>

          <!-- Precios -->
          <VCard class="mb-6">
            <VCardText>
              <div class="d-flex align-center gap-2 mb-4">
                <VAvatar color="primary" variant="tonal" size="36">
                  <VIcon icon="tabler-currency-dollar" size="20" />
                </VAvatar>
                <h6 class="text-h6 font-weight-medium">Precios</h6>
              </div>

              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model.number="precioDiseno"
                    label="Precio Diseño (COP)"
                    placeholder="0"
                    type="number"
                    prefix="$"
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model.number="precioImpresion"
                    label="Precio Impresión (COP)"
                    placeholder="0"
                    type="number"
                    prefix="$"
                  />
                </VCol>

                <VCol cols="12">
                  <VDivider class="mb-3" />
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-body-1 font-weight-medium">Total:</span>
                    <span class="text-h5 font-weight-bold text-primary">
                      {{ formatCurrency(precioTotal) }}
                    </span>
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Acciones -->
          <VCard>
            <VCardText>
              <VBtn
                block
                type="submit"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                prepend-icon="tabler-device-floppy"
                class="mb-3"
              >
                Guardar Diseño
              </VBtn>
              <VBtn
                block
                variant="tonal"
                color="secondary"
                prepend-icon="tabler-x"
                :to="{ name: 'apps-disenos-list' }"
              >
                Cancelar
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VForm>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style lang="scss" scoped>
.upload-area {
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    border-color: rgb(var(--v-theme-primary)) !important;
    background-color: rgba(var(--v-theme-primary), 0.04);
  }
}
</style>
