<script setup lang="ts">
import type { ResumenVales } from './useValesStore'

defineProps<{
  resumen: ResumenVales
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
    <!-- 1. Deuda Total Global Pendiente -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Deuda Total Global</span>
            <h5 class="text-h5 font-weight-bold text-error mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="error" />
              <span v-else>{{ formatCurrency(resumen.totalDeudaGlobal) }}</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Acumulado entre todos los usuarios
            </span>
          </div>
          <VAvatar color="error" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-alert-circle" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 2. Vales Activos / Pendientes -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Vales Pendientes</span>
            <h5 class="text-h5 font-weight-bold text-warning mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="warning" />
              <span v-else>{{ resumen.cantPendientes }} </span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Requieren cobro o abonos
            </span>
          </div>
          <VAvatar color="warning" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-clock" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 3. Total Abonado a la Fecha -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Total Abonado</span>
            <h5 class="text-h5 font-weight-bold text-success mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="success" />
              <span v-else>{{ formatCurrency(resumen.totalMontoAbonado) }}</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Pagos recibidos a la fecha
            </span>
          </div>
          <VAvatar color="success" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-circle-check" size="26" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 4. Monto Total Emitido -->
    <VCol cols="12" sm="6" md="3">
      <VCard elevation="2" class="stats-card">
        <VCardText class="d-flex align-center justify-space-between pa-4">
          <div>
            <span class="text-caption text-uppercase font-weight-bold text-disabled">Total Emitido</span>
            <h5 class="text-h5 font-weight-bold text-primary mt-1 mb-0">
              <VProgressCircular v-if="loading" indeterminate size="20" width="2" color="primary" />
              <span v-else>{{ formatCurrency(resumen.totalMontoEmitido) }}</span>
            </h5>
            <span class="text-xs text-disabled mt-1 d-block">
              Histórico ({{ resumen.cantValesTotal }} vales)
            </span>
          </div>
          <VAvatar color="primary" variant="tonal" size="48" rounded="lg">
            <VIcon icon="tabler-receipt-refund" size="26" />
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
