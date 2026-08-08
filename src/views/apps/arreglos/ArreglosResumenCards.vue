<script setup lang="ts">
import type { ArregloStats } from './useArreglosStore'

defineProps<{
  stats: ArregloStats
  loading?: boolean
}>()

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0)
}
</script>

<template>
  <VRow>
    <!-- 1. Total Arreglos del Mes -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Arreglos del Mes</span>
            <h5 class="text-h5 font-weight-bold text-primary mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="primary" />
              <span v-else>{{ formatCurrency(stats.totalMesActual) }}</span>
            </h5>
            <div class="d-flex align-center gap-1 mt-1">
              <VChip
                v-if="!loading"
                size="x-small"
                :color="stats.variacionPorcentaje >= 0 ? 'success' : 'error'"
                variant="tonal"
                class="font-weight-bold"
              >
                <VIcon
                  :icon="stats.variacionPorcentaje >= 0 ? 'tabler-trending-up' : 'tabler-trending-down'"
                  size="12"
                  class="me-1"
                />
                {{ stats.variacionPorcentaje >= 0 ? `+${stats.variacionPorcentaje}%` : `${stats.variacionPorcentaje}%` }}
              </VChip>
              <span class="text-xs text-disabled">vs mes anterior</span>
            </div>
          </div>
          <VAvatar color="primary" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-tools" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 2. Cantidad de Arreglos -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Trabajos del Mes</span>
            <h5 class="text-h5 font-weight-bold text-info mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="info" />
              <span v-else>{{ stats.cantidadArreglosMes }} arreglos</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              {{ stats.cantidadPiezasMes }} piezas intervenidas
            </span>
          </div>
          <VAvatar color="info" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-list-check" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 3. Valor Promedio por Servicio -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Promedio por Servicio</span>
            <h5 class="text-h5 font-weight-bold text-warning mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="warning" />
              <span v-else>{{ formatCurrency(stats.valorPromedioMes) }}</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Valor medio por arreglo
            </span>
          </div>
          <VAvatar color="warning" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-calculator" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 4. Total Histórico Acumulado -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Total Histórico</span>
            <h5 class="text-h5 font-weight-bold text-success mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="success" />
              <span v-else>{{ formatCurrency(stats.totalHistorico) }}</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Suma acumulada de arreglos
            </span>
          </div>
          <VAvatar color="success" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-cash-banknote" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.stats-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stats-card:hover {
  transform: translateY(-2px);
}
</style>
