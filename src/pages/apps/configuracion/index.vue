<script setup lang="ts">
import type { VForm } from 'vuetify/components/VForm'
import {
  NEGOCIO_DEFAULTS,
  resolverLogo,
  resolverLogoClaro,
  useNegocioStore,
} from '@/views/apps/configuracion/useNegocioStore'
import type { CambiosConfiguracion, ConfiguracionNegocio, VarianteLogo } from '@/views/apps/configuracion/useNegocioStore'
import { COLOR_PRIMARIO_POR_DEFECTO, derivarPaletaMarca, esColorHexValido, normalizarHex } from '@/utils/colorMarca'

definePage({
  meta: {
    requiereAdmin: true,
  },
})

type FormularioNegocio = Omit<ConfiguracionNegocio, 'created_at' | 'updated_at'>

const negocio = useNegocioStore()

const CAMPOS_EDITABLES = Object.keys(NEGOCIO_DEFAULTS).filter(
  campo => campo !== 'created_at' && campo !== 'updated_at',
) as (keyof FormularioNegocio)[]

const copiarConfiguracion = (): FormularioNegocio =>
  Object.fromEntries(CAMPOS_EDITABLES.map(campo => [campo, negocio.config[campo]])) as FormularioNegocio

// ── Estado ───────────────────────────────────
const tab = ref('datos')
const refForm = ref<VForm>()
const form = ref<FormularioNegocio>(copiarConfiguracion())
const isSaving = ref(false)
const isUploading = ref<Record<VarianteLogo, boolean>>({ principal: false, claro: false })
const snackbar = ref({ show: false, message: '', color: 'success' })

const hayCambios = computed(() =>
  CAMPOS_EDITABLES.some(campo => (form.value[campo] ?? '') !== (negocio.config[campo] ?? '')),
)

const descartarCambios = () => {
  form.value = copiarConfiguracion()
  refForm.value?.resetValidation()
}

onMounted(async () => {
  const formAntesDeCargar = JSON.stringify(form.value)

  await negocio.cargar()

  // Solo refleja lo recién leído si el usuario no empezó a editar mientras cargaba
  if (JSON.stringify(form.value) === formAntesDeCargar)
    descartarCambios()
})

// ── Validaciones (lógica de @core/utils/validators con mensajes en español) ──
const REGEX_SITIO_WEB = /^[^\s.]+\.\S+$/

const reglas = {
  requerido: (v: unknown) => requiredValidator(v) === true || 'Campo requerido',
  correo: (v: unknown) => emailValidator(v) === true || 'Correo electrónico inválido',
  sitioWeb: (v: unknown) => regexValidator(v, REGEX_SITIO_WEB) === true || 'Sitio web inválido',
  colorHex: (v: unknown) => esColorHexValido(v) || 'Usa un color hexadecimal, p. ej. #C9A84C',
}

// ── Opciones de formato regional ─────────────
const monedas = [
  { title: 'Peso colombiano (COP)', value: 'COP' },
  { title: 'Peso mexicano (MXN)', value: 'MXN' },
  { title: 'Sol peruano (PEN)', value: 'PEN' },
  { title: 'Peso chileno (CLP)', value: 'CLP' },
  { title: 'Peso argentino (ARS)', value: 'ARS' },
  { title: 'Peso uruguayo (UYU)', value: 'UYU' },
  { title: 'Guaraní paraguayo (PYG)', value: 'PYG' },
  { title: 'Boliviano (BOB)', value: 'BOB' },
  { title: 'Real brasileño (BRL)', value: 'BRL' },
  { title: 'Quetzal guatemalteco (GTQ)', value: 'GTQ' },
  { title: 'Lempira hondureño (HNL)', value: 'HNL' },
  { title: 'Córdoba nicaragüense (NIO)', value: 'NIO' },
  { title: 'Colón costarricense (CRC)', value: 'CRC' },
  { title: 'Peso dominicano (DOP)', value: 'DOP' },
  { title: 'Bolívar venezolano (VES)', value: 'VES' },
  { title: 'Dólar estadounidense (USD)', value: 'USD' },
  { title: 'Euro (EUR)', value: 'EUR' },
]

const locales = [
  { title: 'Español – Colombia (es-CO)', value: 'es-CO' },
  { title: 'Español – México (es-MX)', value: 'es-MX' },
  { title: 'Español – Perú (es-PE)', value: 'es-PE' },
  { title: 'Español – Chile (es-CL)', value: 'es-CL' },
  { title: 'Español – Argentina (es-AR)', value: 'es-AR' },
  { title: 'Español – Uruguay (es-UY)', value: 'es-UY' },
  { title: 'Español – Paraguay (es-PY)', value: 'es-PY' },
  { title: 'Español – Bolivia (es-BO)', value: 'es-BO' },
  { title: 'Español – Ecuador (es-EC)', value: 'es-EC' },
  { title: 'Español – Venezuela (es-VE)', value: 'es-VE' },
  { title: 'Español – Guatemala (es-GT)', value: 'es-GT' },
  { title: 'Español – Costa Rica (es-CR)', value: 'es-CR' },
  { title: 'Español – Panamá (es-PA)', value: 'es-PA' },
  { title: 'Español – Rep. Dominicana (es-DO)', value: 'es-DO' },
  { title: 'Español – Estados Unidos (es-US)', value: 'es-US' },
  { title: 'Español – España (es-ES)', value: 'es-ES' },
  { title: 'Portugués – Brasil (pt-BR)', value: 'pt-BR' },
  { title: 'Inglés – Estados Unidos (en-US)', value: 'en-US' },
]

const opcionesDecimales = [0, 1, 2]

const ejemploMoneda = computed(() => {
  try {
    return new Intl.NumberFormat(form.value.locale, {
      style: 'currency',
      currency: form.value.moneda,
      minimumFractionDigits: form.value.decimales_moneda,
      maximumFractionDigits: form.value.decimales_moneda,
    }).format(1234567.891)
  }
  catch {
    return 'Formato no válido'
  }
})

const ejemploFecha = computed(() => {
  try {
    return new Date().toLocaleDateString(form.value.locale, { year: 'numeric', month: 'long', day: 'numeric' })
  }
  catch {
    return 'Formato no válido'
  }
})

// ── Marca / vista previa ─────────────────────
const paletaVistaPrevia = computed(() => derivarPaletaMarca(form.value.color_primario))
const estiloVistaPrevia = computed(() => variablesCssMarca(paletaVistaPrevia.value))

const colorPicker = computed({
  get: () => (esColorHexValido(form.value.color_primario) ? normalizarHex(form.value.color_primario) : COLOR_PRIMARIO_POR_DEFECTO),
  set: (valor: string) => {
    form.value.color_primario = normalizarHex(valor.slice(0, 7))
  },
})

const restablecerColor = () => {
  form.value.color_primario = COLOR_PRIMARIO_POR_DEFECTO
}

const previsualizacionLogos = computed<Record<VarianteLogo, string>>(() => ({
  principal: resolverLogo(form.value),
  claro: resolverLogoClaro(form.value),
}))

const variantesLogo: { variante: VarianteLogo; titulo: string; descripcion: string; fondo: string }[] = [
  { variante: 'principal', titulo: 'Logo principal', descripcion: 'Se usa en facturas, comprobantes y fondos claros.', fondo: '#FFFFFF' },
  { variante: 'claro', titulo: 'Logo para fondos oscuros', descripcion: 'Se usa en el login y el tema oscuro. Si no se carga, se usa el principal.', fondo: '#141414' },
]

const COLUMNA_LOGO: Record<VarianteLogo, 'logo_url' | 'logo_claro_url'> = { principal: 'logo_url', claro: 'logo_claro_url' }

const inputsLogo = ref<Record<VarianteLogo, HTMLInputElement | null>>({ principal: null, claro: null })

const seleccionarLogo = (variante: VarianteLogo) => inputsLogo.value[variante]?.click()

const onLogoSeleccionado = async (variante: VarianteLogo, evento: Event) => {
  const input = evento.target as HTMLInputElement
  const archivo = input.files?.[0]

  input.value = ''
  if (!archivo)
    return

  isUploading.value[variante] = true
  try {
    form.value[COLUMNA_LOGO[variante]] = await negocio.subirLogo(archivo, variante)
    snackbar.value = { show: true, message: 'Logo actualizado correctamente', color: 'success' }
  }
  catch (error: any) {
    snackbar.value = { show: true, message: error.message || 'Error al subir el logo', color: 'error' }
  }
  finally {
    isUploading.value[variante] = false
  }
}

const quitarLogo = async (variante: VarianteLogo) => {
  isUploading.value[variante] = true
  try {
    await negocio.quitarLogo(variante)
    form.value[COLUMNA_LOGO[variante]] = null
    snackbar.value = { show: true, message: 'Se restableció el logo por defecto', color: 'info' }
  }
  catch (error: any) {
    snackbar.value = { show: true, message: error.message || 'Error al quitar el logo', color: 'error' }
  }
  finally {
    isUploading.value[variante] = false
  }
}

// ── Guardar ──────────────────────────────────
const normalizarCambios = (): CambiosConfiguracion => {
  const cambios: Record<string, unknown> = {}

  for (const campo of CAMPOS_EDITABLES) {
    const valor = form.value[campo]

    cambios[campo] = typeof valor === 'string' ? (valor.trim() || null) : valor
  }

  cambios.nombre_comercial = form.value.nombre_comercial.trim()
  cambios.color_primario = normalizarHex(form.value.color_primario)

  return cambios as CambiosConfiguracion
}

const guardar = async () => {
  const { valid } = await refForm.value!.validate()
  if (!valid) {
    snackbar.value = { show: true, message: 'Revisa los campos marcados en rojo', color: 'error' }

    return
  }

  isSaving.value = true
  try {
    await negocio.guardar(normalizarCambios())
    form.value = copiarConfiguracion()
    snackbar.value = { show: true, message: 'Configuración guardada correctamente', color: 'success' }
  }
  catch (error: any) {
    snackbar.value = { show: true, message: error.message || 'Error al guardar la configuración', color: 'error' }
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section>
    <!-- 👉 Encabezado de la Sección -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon
            icon="tabler-settings"
            color="primary"
            size="28"
          />
          Configuración del Negocio
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Identidad, marca y formato que se muestran en la aplicación y en los documentos impresos
        </p>
      </div>

      <div class="d-flex align-center gap-3">
        <VBtn
          color="secondary"
          variant="tonal"
          prepend-icon="tabler-arrow-back-up"
          :disabled="!hayCambios || isSaving"
          @click="descartarCambios"
        >
          Descartar cambios
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="tabler-device-floppy"
          :loading="isSaving"
          :disabled="!hayCambios"
          @click="guardar"
        >
          Guardar cambios
        </VBtn>
      </div>
    </div>

    <VAlert
      v-if="negocio.errorCarga"
      type="warning"
      variant="tonal"
      class="mb-6"
    >
      No se pudo leer la configuración desde la base de datos ({{ negocio.errorCarga }}). Se muestran los valores por defecto;
      verifica que la migración de configuración se haya ejecutado.
    </VAlert>

    <VAlert
      v-else-if="negocio.nuncaEditada"
      type="info"
      variant="tonal"
      class="mb-6"
    >
      La configuración conserva los valores iniciales de la instalación. Revisa los datos del negocio, el logo y los textos
      antes de emitir documentos.
    </VAlert>

    <VRow>
      <!-- 👉 Formulario -->
      <VCol
        cols="12"
        lg="7"
      >
        <VCard>
          <VTabs
            v-model="tab"
            show-arrows
          >
            <VTab value="datos">
              <VIcon
                icon="tabler-building-store"
                start
              />
              Datos del negocio
            </VTab>
            <VTab value="marca">
              <VIcon
                icon="tabler-palette"
                start
              />
              Logo y marca
            </VTab>
            <VTab value="textos">
              <VIcon
                icon="tabler-file-text"
                start
              />
              Textos de documentos
            </VTab>
            <VTab value="regional">
              <VIcon
                icon="tabler-world"
                start
              />
              Formato regional
            </VTab>
          </VTabs>

          <VDivider />

          <VCardText>
            <VForm
              ref="refForm"
              @submit.prevent="guardar"
            >
              <!-- eager: los campos de todas las pestañas se validan al guardar -->
              <VWindow
                v-model="tab"
                class="disable-tab-transition"
              >
                <!-- Datos del negocio -->
                <VWindowItem
                  value="datos"
                  eager
                >
                  <VRow>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.nombre_comercial"
                        label="Nombre comercial *"
                        placeholder="Joyería Ejemplo"
                        :rules="[reglas.requerido]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.razon_social"
                        label="Razón social"
                        placeholder="Joyería Ejemplo S.A.S"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.nit"
                        label="NIT / Identificación tributaria"
                        placeholder="900.000.000-0"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.eslogan"
                        label="Eslogan"
                        placeholder="Joyería fina y diseños personalizados"
                      />
                    </VCol>
                    <VCol cols="12">
                      <AppTextField
                        v-model="form.direccion"
                        label="Dirección"
                        placeholder="Calle 10 # 20-30, Local 101"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.ciudad"
                        label="Ciudad"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.pais"
                        label="País"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.telefono"
                        label="Teléfono"
                        prepend-inner-icon="tabler-phone"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.correo"
                        label="Correo de contacto"
                        type="email"
                        prepend-inner-icon="tabler-mail"
                        :rules="[reglas.correo]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.sitio_web"
                        label="Sitio web"
                        placeholder="www.minegocio.com"
                        prepend-inner-icon="tabler-world-www"
                        :rules="[reglas.sitioWeb]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.whatsapp"
                        label="WhatsApp"
                        prepend-inner-icon="tabler-brand-whatsapp"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.instagram"
                        label="Instagram"
                        placeholder="@minegocio"
                        prepend-inner-icon="tabler-brand-instagram"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.facebook"
                        label="Facebook"
                        prepend-inner-icon="tabler-brand-facebook"
                      />
                    </VCol>
                  </VRow>
                </VWindowItem>

                <!-- Logo y marca -->
                <VWindowItem
                  value="marca"
                  eager
                >
                  <VRow>
                    <VCol
                      v-for="item in variantesLogo"
                      :key="item.variante"
                      cols="12"
                      md="6"
                    >
                      <div class="text-body-1 font-weight-medium mb-1">
                        {{ item.titulo }}
                      </div>
                      <p class="text-body-2 text-disabled mb-3">
                        {{ item.descripcion }}
                      </p>
                      <div
                        class="logo-preview d-flex align-center justify-center rounded mb-3"
                        :style="{ backgroundColor: item.fondo }"
                      >
                        <VImg
                          :src="previsualizacionLogos[item.variante]"
                          max-height="96"
                          max-width="220"
                          contain
                        />
                      </div>
                      <input
                        :ref="el => { inputsLogo[item.variante] = el as HTMLInputElement | null }"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        @change="onLogoSeleccionado(item.variante, $event)"
                      >
                      <div class="d-flex gap-2 flex-wrap">
                        <VBtn
                          size="small"
                          prepend-icon="tabler-upload"
                          :loading="isUploading[item.variante]"
                          @click="seleccionarLogo(item.variante)"
                        >
                          Subir logo
                        </VBtn>
                        <VBtn
                          v-if="form[item.variante === 'principal' ? 'logo_url' : 'logo_claro_url']"
                          size="small"
                          color="secondary"
                          variant="tonal"
                          prepend-icon="tabler-trash"
                          :disabled="isUploading[item.variante]"
                          @click="quitarLogo(item.variante)"
                        >
                          Usar logo por defecto
                        </VBtn>
                      </div>
                      <p class="text-caption text-disabled mt-2 mb-0">
                        PNG, JPG o WEBP · máximo 2 MB · se guarda al subirlo
                      </p>
                    </VCol>

                    <VCol cols="12">
                      <VDivider class="mb-4" />
                      <div class="text-body-1 font-weight-medium mb-1">
                        Color principal de la marca
                      </div>
                      <p class="text-body-2 text-disabled mb-4">
                        Se aplica a botones, menú, gráficos y a los títulos y bordes de los documentos impresos.
                      </p>
                      <div class="d-flex flex-wrap gap-6 align-start">
                        <VColorPicker
                          v-model="colorPicker"
                          mode="hex"
                          :modes="['hex']"
                          elevation="0"
                          class="border rounded"
                        />
                        <div
                          class="d-flex flex-column gap-4"
                          style="min-inline-size: 220px;"
                        >
                          <AppTextField
                            v-model="form.color_primario"
                            label="Color hexadecimal *"
                            placeholder="#C9A84C"
                            :rules="[reglas.requerido, reglas.colorHex]"
                          />
                          <div>
                            <div class="text-caption text-disabled mb-2">
                              Variantes derivadas
                            </div>
                            <div class="d-flex gap-2">
                              <div
                                v-for="(color, nombre) in { Principal: paletaVistaPrevia.primario, Oscuro: paletaVistaPrevia.oscuro, Claro: paletaVistaPrevia.claro }"
                                :key="nombre"
                                class="text-center"
                              >
                                <div
                                  class="color-swatch rounded mb-1"
                                  :style="{ backgroundColor: color }"
                                />
                                <span class="text-caption">{{ nombre }}</span>
                              </div>
                            </div>
                          </div>
                          <VBtn
                            size="small"
                            variant="text"
                            prepend-icon="tabler-refresh"
                            @click="restablecerColor"
                          >
                            Restablecer color por defecto
                          </VBtn>
                        </div>
                      </div>
                    </VCol>
                  </VRow>
                </VWindowItem>

                <!-- Textos de documentos -->
                <VWindowItem
                  value="textos"
                  eager
                >
                  <VRow>
                    <VCol cols="12">
                      <AppTextarea
                        v-model="form.terminos_pedido"
                        label="Términos y garantía – Comprobante de pedido"
                        rows="3"
                        auto-grow
                      />
                    </VCol>
                    <VCol cols="12">
                      <AppTextarea
                        v-model="form.terminos_impresion3d"
                        label="Términos y garantía – Factura de impresión 3D"
                        rows="3"
                        auto-grow
                      />
                    </VCol>
                    <VCol cols="12">
                      <AppTextarea
                        v-model="form.terminos_cartera"
                        label="Condiciones de cobro – Estado de cuenta de cartera"
                        hint="Escribe una condición por línea. Se agrega automáticamente «Documento expedido por …»."
                        persistent-hint
                        rows="3"
                        auto-grow
                      />
                    </VCol>
                    <VCol cols="12">
                      <AppTextarea
                        v-model="form.terminos_vales"
                        label="Condiciones – Comprobante de vale"
                        hint="Opcional. Si se deja vacío no se imprime."
                        persistent-hint
                        rows="2"
                        auto-grow
                      />
                    </VCol>
                    <VCol cols="12">
                      <AppTextField
                        v-model="form.texto_firma_autorizada"
                        label="Texto bajo la firma autorizada"
                        :placeholder="form.razon_social || form.nombre_comercial"
                        hint="Si se deja vacío se usa la razón social."
                        persistent-hint
                      />
                    </VCol>
                  </VRow>
                </VWindowItem>

                <!-- Formato regional -->
                <VWindowItem
                  value="regional"
                  eager
                >
                  <VRow>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppSelect
                        v-model="form.moneda"
                        label="Moneda *"
                        :items="monedas"
                        :rules="[reglas.requerido]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppSelect
                        v-model="form.locale"
                        label="Idioma y región (formato de números y fechas) *"
                        :items="locales"
                        :rules="[reglas.requerido]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppSelect
                        v-model="form.decimales_moneda"
                        label="Decimales en valores monetarios"
                        :items="opcionesDecimales"
                      />
                    </VCol>
                    <VCol cols="12">
                      <VAlert
                        variant="tonal"
                        color="primary"
                        icon="tabler-eye"
                      >
                        <div>Ejemplo de valor: <strong>{{ ejemploMoneda }}</strong></div>
                        <div>Ejemplo de fecha: <strong>{{ ejemploFecha }}</strong></div>
                      </VAlert>
                    </VCol>
                  </VRow>
                </VWindowItem>
              </VWindow>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>

      <!-- 👉 Vista previa del documento (refleja cambios sin guardar) -->
      <VCol
        cols="12"
        lg="5"
      >
        <VCard class="vista-previa-card">
          <VCardItem>
            <VCardTitle class="d-flex align-center gap-2">
              <VIcon
                icon="tabler-file-invoice"
                color="primary"
              />
              Vista previa de documento
            </VCardTitle>
            <VCardSubtitle>Así se verá el encabezado de facturas y comprobantes</VCardSubtitle>
          </VCardItem>

          <VCardText>
            <div
              class="invoice-container documento-factura pa-6"
              :style="estiloVistaPrevia"
            >
              <DocumentoEncabezado :config="form">
                <div class="text-right invoice-meta">
                  <div class="invoice-title text-h5 font-weight-bold mb-1">
                    COMPROBANTE
                  </div>
                  <div class="invoice-number font-mono text-subtitle-1 font-weight-bold mb-1">
                    PED-0001
                  </div>
                </div>
              </DocumentoEncabezado>

              <hr class="invoice-divider mb-6">

              <table class="invoice-table w-100 mb-6">
                <thead>
                  <tr>
                    <th class="text-left">
                      DESCRIPCIÓN
                    </th>
                    <th class="text-right">
                      VALOR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-xs">
                      Anillo de ejemplo
                    </td>
                    <td class="text-right text-xs font-mono">
                      {{ ejemploMoneda }}
                    </td>
                  </tr>
                </tbody>
              </table>

              <DocumentoTerminos
                :titulo="`TÉRMINOS Y GARANTÍA ${(form.nombre_comercial || '').toUpperCase()}:`"
                :texto="form.terminos_pedido"
              />

              <DocumentoFirmas
                nombre-cliente="Cliente de ejemplo"
                :texto-firma="form.texto_firma_autorizada || form.razon_social || form.nombre_comercial"
              />
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

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
.logo-preview {
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  block-size: 120px;
  padding-inline: 16px;
}

.color-swatch {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  block-size: 36px;
  inline-size: 56px;
}

.vista-previa-card {
  position: sticky;
  inset-block-start: 80px;
}
</style>
