<script setup lang="ts">
import type { ArregloResumen } from './useArreglosStore'
import { DIAS_VENCIMIENTO_ARREGLO } from './useArreglosStore'

const props = defineProps<{
  resumen: ArregloResumen
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'verPendientes'): void
  (e: 'verVencidos'): void
}>()

const { formatCurrency } = useFormato()

const variacion = computed(() => {
  const { total_mes: actual, total_mes_anterior: anterior } = props.resumen
  if (!anterior)
    return actual > 0 ? 100 : 0

  return Math.round(((actual - anterior) / anterior) * 100)
})

const promedioMes = computed(() =>
  props.resumen.cantidad_mes ? Math.round(props.resumen.total_mes / props.resumen.cantidad_mes) : 0,
)

const porcentajeEfectivo = computed(() =>
  props.resumen.cobrado_mes ? (props.resumen.cobrado_mes_efectivo / props.resumen.cobrado_mes) * 100 : 0,
)
</script>

<template>
  <VRow>
    <!-- 1. Por cobrar -->
    <VCol
      cols="12"
      sm="6"
      lg="3"
    >
      <VCard
        elevation="2"
        class="stats-card stats-card--clicable stats-card--deuda"
        @click="emit('verPendientes')"
      >
        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Por Cobrar</span>
            <VAvatar
              color="error"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <VIcon
                icon="tabler-receipt-2"
                size="20"
              />
            </VAvatar>
          </div>
          <VSkeletonLoader
            v-if="loading"
            type="heading"
            class="stats-skeleton"
          />
          <template v-else>
            <h4 class="text-h4 font-weight-bold text-error">
              {{ formatCurrency(resumen.total_pendiente) }}
            </h4>
            <div class="text-xs text-disabled mt-1">
              {{ resumen.cantidad_pendientes }} arreglo(s) · {{ resumen.clientes_con_deuda }} cliente(s)
            </div>
          </template>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 2. Cobrado este mes -->
    <VCol
      cols="12"
      sm="6"
      lg="3"
    >
      <VCard
        elevation="2"
        class="stats-card"
      >
        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Cobrado este Mes</span>
            <VAvatar
              color="success"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <VIcon
                icon="tabler-cash-banknote"
                size="20"
              />
            </VAvatar>
          </div>
          <VSkeletonLoader
            v-if="loading"
            type="heading"
            class="stats-skeleton"
          />
          <template v-else>
            <h4 class="text-h4 font-weight-bold text-success">
              {{ formatCurrency(resumen.cobrado_mes) }}
            </h4>
            <div
              v-if="resumen.cobrado_mes"
              class="split-bar mt-2"
            >
              <div
                class="split-bar__efectivo"
                :style="{ inlineSize: `${porcentajeEfectivo}%` }"
              />
            </div>
            <div class="text-xs text-disabled mt-1">
              Ef. {{ formatCurrency(resumen.cobrado_mes_efectivo) }} · Tr. {{ formatCurrency(resumen.cobrado_mes_transferencia) }}
            </div>
          </template>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 3. Arreglos del mes -->
    <VCol
      cols="12"
      sm="6"
      lg="3"
    >
      <VCard
        elevation="2"
        class="stats-card"
      >
        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Arreglos del Mes</span>
            <VAvatar
              color="primary"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <VIcon
                icon="tabler-tools"
                size="20"
              />
            </VAvatar>
          </div>
          <VSkeletonLoader
            v-if="loading"
            type="heading"
            class="stats-skeleton"
          />
          <template v-else>
            <div class="d-flex align-center gap-2 flex-wrap">
              <h4 class="text-h4 font-weight-bold text-primary">
                {{ formatCurrency(resumen.total_mes) }}
              </h4>
              <VChip
                size="x-small"
                :color="variacion >= 0 ? 'success' : 'error'"
                variant="tonal"
                class="font-weight-bold"
              >
                <VIcon
                  :icon="variacion >= 0 ? 'tabler-trending-up' : 'tabler-trending-down'"
                  size="12"
                  class="me-1"
                />
                {{ variacion >= 0 ? `+${variacion}` : variacion }}%
              </VChip>
            </div>
            <div class="text-xs text-disabled mt-1">
              {{ resumen.cantidad_mes }} arreglo(s) · {{ resumen.piezas_mes }} pza(s) · Prom. {{ formatCurrency(promedioMes) }}
            </div>
            <div class="text-xs text-disabled">
              Histórico: {{ formatCurrency(resumen.total_historico) }}
            </div>
          </template>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 4. Vencidos -->
    <VCol
      cols="12"
      sm="6"
      lg="3"
    >
      <VCard
        elevation="2"
        class="stats-card stats-card--clicable"
        @click="emit('verVencidos')"
      >
        <VCardText class="pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Vencidos +{{ DIAS_VENCIMIENTO_ARREGLO }} días</span>
            <VAvatar
              color="warning"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <VIcon
                icon="tabler-clock-exclamation"
                size="20"
              />
            </VAvatar>
          </div>
          <VSkeletonLoader
            v-if="loading"
            type="heading"
            class="stats-skeleton"
          />
          <template v-else>
            <h4 class="text-h4 font-weight-bold text-warning">
              {{ formatCurrency(resumen.total_vencido) }}
            </h4>
            <div class="text-xs text-disabled mt-1">
              {{ resumen.cantidad_vencidos ? `${resumen.cantidad_vencidos} arreglo(s) sin pagar hace más de ${DIAS_VENCIMIENTO_ARREGLO} días` : 'Sin cobros atrasados' }}
            </div>
          </template>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.stats-card {
  block-size: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stats-card--clicable {
  cursor: pointer;
}

.stats-card--clicable:hover {
  transform: translateY(-2px);
}

.stats-card--deuda {
  border-inline-start: 4px solid rgb(var(--v-theme-error)) !important;
}

.stats-skeleton {
  background: transparent;
  max-inline-size: 180px;
}

.split-bar {
  overflow: hidden;
  border-radius: 4px;
  background: rgb(var(--v-theme-info));
  block-size: 6px;
}

.split-bar__efectivo {
  background: rgb(var(--v-theme-success));
  block-size: 100%;
  transition: inline-size 0.3s ease;
}
</style>
