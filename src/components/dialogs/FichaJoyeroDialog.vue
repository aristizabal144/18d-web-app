<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { supabase } from '@/utils/supabase'

export interface JoyeroItemData {
  id?: string
  referencia: string
  titulo: string
  descripcion?: string | null
  talla?: string | null
  peso?: number | null
  peso_final?: number | null
  color_id?: number
  color_oro?: { id?: number; nombre: string } | string | null
  imagen?: string | null
  type?: 'pedido' | 'diseno'
  tiene_diseno?: boolean
  diseno?: { id?: string; referencia?: string; titulo?: string } | null
}

const props = defineProps<{
  modelValue: boolean
  item: JoyeroItemData | null
  imageUrl?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

// Fullscreen image zoom modal state
const isZoomOpen = ref(false)

// Color map styling
const colorMap: Record<string, { color: string; bgColor: string }> = {
  Amarillo: { color: '#B8860B', bgColor: 'rgba(201, 168, 76, 0.15)' },
  Blanco: { color: '#757575', bgColor: 'rgba(158, 158, 158, 0.15)' },
  Rosado: { color: '#E91E63', bgColor: 'rgba(233, 30, 99, 0.12)' },
  Multicolor: { color: '#7C4DFF', bgColor: 'rgba(124, 77, 255, 0.12)' },
}

const colorNombre = computed(() => {
  if (!props.item) return 'Sin definir'
  if (typeof props.item.color_oro === 'string') return props.item.color_oro
  if (props.item.color_oro?.nombre) return props.item.color_oro.nombre
  return 'Amarillo'
})

const colorStyle = computed(() => {
  return colorMap[colorNombre.value] || colorMap.Amarillo
})

// Image URL resolution
const resolvedImageUrl = computed(() => {
  if (props.imageUrl) return props.imageUrl
  if (!props.item?.imagen) return null
  if (props.item.imagen.startsWith('http://') || props.item.imagen.startsWith('https://') || props.item.imagen.startsWith('blob:')) {
    return props.item.imagen
  }
  const { data } = supabase.storage.from('disenos-imagenes').getPublicUrl(props.item.imagen)
  return data.publicUrl
})

// Helper print function
const printFicha = () => {
  window.print()
}
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="720"
    scrollable
    class="ficha-joyero-dialog"
  >
    <VCard v-if="item" class="ficha-card">
      <!-- ========================================== -->
      <!-- Header de la Ficha -->
      <!-- ========================================== -->
      <VCardTitle class="d-flex align-center justify-space-between pa-4 pb-3 border-b printable-header">
        <div class="d-flex align-center gap-3">
          <div class="dialog-icon-wrapper">
            <VIcon
              icon="tabler-jewel"
              size="24"
              color="warning"
            />
          </div>
          <div>
            <div class="d-flex align-center gap-2">
              <span class="text-h6 font-weight-bold">Ficha de Fabricación</span>
              <VChip
                size="x-small"
                color="warning"
                variant="tonal"
                class="font-weight-medium text-uppercase"
              >
                {{ item.type === 'diseno' ? 'Diseño 3D' : 'Pedido Joyería' }}
              </VChip>
            </div>
            <div class="text-xs text-disabled font-mono">
              REF: {{ item.referencia }}
            </div>
          </div>
        </div>

        <div class="d-flex align-center gap-2 no-print">
          <VBtn
            variant="tonal"
            color="secondary"
            size="small"
            prepend-icon="tabler-printer"
            @click="printFicha"
          >
            Imprimir
          </VBtn>
          <VBtn
            icon
            variant="text"
            size="small"
            @click="isOpen = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>
        </div>
      </VCardTitle>

      <!-- ========================================== -->
      <!-- Cuerpo de la Ficha -->
      <!-- ========================================== -->
      <VCardText class="pa-5 printable-content">
        <VRow>
          <!-- Columna Imagen Completa -->
          <VCol
            cols="12"
            md="6"
            class="d-flex flex-column align-center justify-center"
          >
            <div
              class="ficha-image-container"
              :class="{ 'has-image': !!resolvedImageUrl }"
              @click="resolvedImageUrl && (isZoomOpen = true)"
            >
              <VImg
                v-if="resolvedImageUrl"
                :src="resolvedImageUrl"
                max-height="340"
                width="100%"
                contain
                class="ficha-image rounded-lg"
              />
              <div
                v-else
                class="ficha-placeholder d-flex flex-column align-center justify-center rounded-lg pa-6 text-center"
              >
                <VIcon
                  icon="tabler-photo-off"
                  size="56"
                  color="warning"
                  style="opacity: 0.4;"
                  class="mb-2"
                />
                <span class="text-sm font-weight-medium text-disabled">Sin imagen de referencia</span>
              </div>

              <!-- Overlay para ampliación -->
              <div v-if="resolvedImageUrl" class="ficha-image-overlay no-print">
                <VIcon icon="tabler-zoom-in" size="24" color="white" />
                <span class="text-xs text-white font-weight-medium ms-1">Ver pantalla completa</span>
              </div>
            </div>
          </VCol>

          <!-- Columna Información para Joyero -->
          <VCol cols="12" md="6" class="d-flex flex-column gap-4">
            <!-- Título del Pedido / Diseño -->
            <div>
              <div class="text-xs text-disabled font-weight-semibold text-uppercase mb-1" style="letter-spacing: 0.5px;">
                Nombre del Trabjo
              </div>
              <h5 class="text-h5 font-weight-bold text-on-surface">
                {{ item.titulo }}
              </h5>
            </div>

            <VDivider />

            <!-- Especificaciones Técnicas (Cards) -->
            <div class="d-flex flex-column gap-3">
              <!-- Color de Oro -->
              <div class="spec-card">
                <div class="spec-card__icon-box" :style="{ backgroundColor: colorStyle.bgColor }">
                  <VIcon icon="tabler-circle-filled" size="16" :style="{ color: colorStyle.color }" />
                </div>
                <div class="flex-grow-1">
                  <div class="spec-card__label">Color de Oro</div>
                  <div class="spec-card__value font-weight-bold" :style="{ color: colorStyle.color }">
                    {{ colorNombre }}
                  </div>
                </div>
              </div>

              <!-- Talla -->
              <div class="spec-card">
                <div class="spec-card__icon-box bg-primary-light">
                  <VIcon icon="tabler-ruler-2" size="20" color="primary" />
                </div>
                <div class="flex-grow-1">
                  <div class="spec-card__label">Talla</div>
                  <div class="spec-card__value font-weight-bold">
                    {{ item.talla ? item.talla : 'No especificada' }}
                  </div>
                </div>
              </div>

              <!-- Peso -->
              <div class="spec-card">
                <div class="spec-card__icon-box bg-info-light">
                  <VIcon icon="tabler-scale" size="20" color="info" />
                </div>
                <div class="flex-grow-1">
                  <div class="spec-card__label">Peso Requerido</div>
                  <div class="spec-card__value font-weight-bold">
                    <template v-if="item.peso">
                      {{ item.peso }} g
                      <span v-if="item.peso_final && item.peso_final !== item.peso" class="text-xs text-disabled font-weight-normal ms-1">
                        (Final: {{ item.peso_final }}g)
                      </span>
                    </template>
                    <template v-else-if="item.peso_final">
                      {{ item.peso_final }} g
                    </template>
                    <template v-else>
                      Sin registrar
                    </template>
                  </div>
                </div>
              </div>

              <!-- Diseño 3D Vinculado si aplica -->
              <div v-if="item.diseno" class="spec-card spec-card--diseno">
                <div class="spec-card__icon-box bg-secondary-light">
                  <VIcon icon="tabler-cube-3d-sphere" size="20" color="secondary" />
                </div>
                <div class="flex-grow-1">
                  <div class="spec-card__label">Diseño 3D Base</div>
                  <div class="spec-card__value font-weight-medium text-secondary">
                    {{ item.diseno.referencia }} - {{ item.diseno.titulo }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Descripción / Instrucciones -->
            <div class="description-box pa-3 rounded-lg mt-1">
              <div class="d-flex align-center gap-2 mb-1">
                <VIcon icon="tabler-notes" size="16" color="warning" />
                <span class="text-xs font-weight-bold text-uppercase text-warning" style="letter-spacing: 0.5px;">
                  Instrucciones & Descripción
                </span>
              </div>
              <p class="text-sm mb-0 description-text">
                {{ item.descripcion ? item.descripcion : 'Sin descripción o notas adicionales.' }}
              </p>
            </div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- Modal Zoom Imagen Completa -->
  <VDialog
    v-model="isZoomOpen"
    max-width="900"
  >
    <VCard class="pa-2 overflow-hidden position-relative">
      <VBtn
        icon
        variant="elevated"
        color="dark"
        size="small"
        class="position-absolute"
        style="inset-block-start: 12px; inset-inline-end: 12px; z-index: 10;"
        @click="isZoomOpen = false"
      >
        <VIcon icon="tabler-x" />
      </VBtn>
      <VImg
        v-if="resolvedImageUrl"
        :src="resolvedImageUrl"
        max-height="85vh"
        contain
      />
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.font-mono {
  font-family: monospace;
}

.dialog-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(var(--v-theme-warning), 0.12);
  block-size: 42px;
  inline-size: 42px;
}

/* Contenedor de la imagen */
.ficha-image-container {
  position: relative;
  inline-size: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.5);

  &.has-image {
    cursor: pointer;

    &:hover .ficha-image-overlay {
      opacity: 1;
    }

    &:hover .ficha-image {
      transform: scale(1.03);
    }
  }
}

.ficha-image {
  transition: transform 0.3s ease;
}

.ficha-placeholder {
  min-block-size: 260px;
  background: linear-gradient(135deg, rgba(var(--v-theme-warning), 0.05), rgba(var(--v-theme-warning), 0.12));
}

.ficha-image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s ease;
  backdrop-filter: blur(2px);
}

/* Tarjetas de especificación */
.spec-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 1);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateX(3px);
    box-shadow: 0 4px 12px rgba(var(--v-shadow-key-umbra-color), 0.06);
  }

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    inline-size: 36px;
    block-size: 36px;
    flex-shrink: 0;
  }

  &__label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: rgba(var(--v-theme-on-surface), 0.6);
  }

  &__value {
    font-size: 0.95rem;
    line-height: 1.2;
  }
}

.bg-primary-light {
  background: rgba(var(--v-theme-primary), 0.12);
}

.bg-info-light {
  background: rgba(var(--v-theme-info), 0.12);
}

.bg-secondary-light {
  background: rgba(var(--v-theme-secondary), 0.12);
}

/* Caja de descripción */
.description-box {
  background: rgba(var(--v-theme-warning), 0.06);
  border: 1px dashed rgba(var(--v-theme-warning), 0.3);
}

.description-text {
  color: rgba(var(--v-theme-on-surface), 0.85);
  white-space: pre-line;
  line-height: 1.5;
}

/* Estilos de Impresión */
@media print {
  .no-print {
    display: none !important;
  }

  .ficha-card {
    box-shadow: none !important;
    border: none !important;
  }

  .printable-header {
    border-bottom: 2px solid #000 !important;
  }

  .ficha-image-container {
    border: 1px solid #ccc !important;
  }

  .spec-card {
    border: 1px solid #ddd !important;
    background: #fff !important;
  }

  .description-box {
    border: 1px solid #ccc !important;
    background: #f9f9f9 !important;
  }
}
</style>
