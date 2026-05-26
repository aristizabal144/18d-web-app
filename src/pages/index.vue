<template>
  <VRow>
    <!-- Card de Bienvenida -->
    <VCol cols="12">
      <VCard class="mb-2 position-relative" style="background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); border-bottom: 3px solid #C9A84C;">
        <VCardText class="d-flex flex-sm-row flex-column justify-space-between align-center">
          <div>
            <h4 class="text-h4 text-white mb-2">¡Bienvenido a 18D Joyeros! 💎</h4>
            <p class="text-body-1 mb-0" style="color: rgba(255, 255, 255, 0.8);">
              Aquí puedes ver un resumen de todas tus métricas de ventas y nuevos clientes en tiempo real.
            </p>
          </div>
          <div class="mt-4 mt-sm-0">
            <VIcon icon="tabler-diamond" size="60" color="primary" class="opacity-80" />
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Métricas Rápidas -->
    <VCol cols="12" md="3" sm="6">
      <VCard>
        <VCardText class="d-flex align-center justify-space-between">
          <div>
            <span class="text-sm">Ventas Hoy</span>
            <div class="d-flex align-center gap-2 my-1">
              <h4 class="text-h4">$4,500</h4>
              <span class="text-success text-sm">+15%</span>
            </div>
            <span class="text-xs text-disabled">vs ayer</span>
          </div>
          <VAvatar variant="tonal" color="success" rounded>
            <VIcon icon="tabler-currency-dollar" size="28" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="3" sm="6">
      <VCard>
        <VCardText class="d-flex align-center justify-space-between">
          <div>
            <span class="text-sm">Nuevos Clientes</span>
            <div class="d-flex align-center gap-2 my-1">
              <h4 class="text-h4">12</h4>
              <span class="text-success text-sm">+2</span>
            </div>
            <span class="text-xs text-disabled">esta semana</span>
          </div>
          <VAvatar variant="tonal" color="primary" rounded>
            <VIcon icon="tabler-users" size="28" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="3" sm="6">
      <VCard>
        <VCardText class="d-flex align-center justify-space-between">
          <div>
            <span class="text-sm">Órdenes Pendientes</span>
            <div class="d-flex align-center gap-2 my-1">
              <h4 class="text-h4">8</h4>
              <span class="text-error text-sm">-1</span>
            </div>
            <span class="text-xs text-disabled">por despachar</span>
          </div>
          <VAvatar variant="tonal" color="warning" rounded>
            <VIcon icon="tabler-shopping-cart" size="28" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="3" sm="6">
      <VCard>
        <VCardText class="d-flex align-center justify-space-between">
          <div>
            <span class="text-sm">Reparaciones</span>
            <div class="d-flex align-center gap-2 my-1">
              <h4 class="text-h4">3</h4>
              <span class="text-success text-sm">Al día</span>
            </div>
            <span class="text-xs text-disabled">en taller</span>
          </div>
          <VAvatar variant="tonal" color="info" rounded>
            <VIcon icon="tabler-tools" size="28" />
          </VAvatar>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Gráfico o Sección Principal (Placeholder) -->
    <VCol cols="12" md="8">
      <VCard title="Resumen Anual de Ventas" subtitle="Crecimiento comparativo de joyería vs reparaciones">
        <template #append>
          <VBtn size="small" variant="tonal" color="primary">Ver Reporte</VBtn>
        </template>
        <VCardText class="d-flex align-center justify-center bg-background rounded" style="height: 300px; margin: 16px">
          <div class="text-center">
            <VIcon icon="tabler-chart-bar" size="48" color="secondary" class="mb-2 opacity-50" />
            <p class="text-disabled mb-0">Aquí irá el gráfico interactivo de ventas</p>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Lista Lateral (Placeholder) -->
    <VCol cols="12" md="4">
      <VCard title="Últimas Ventas">
        <VList lines="two">
          <VListItem>
            <template #prepend>
              <VAvatar color="primary" variant="tonal">A</VAvatar>
            </template>
            <VListItemTitle>Anillo de Compromiso</VListItemTitle>
            <VListItemSubtitle>Hace 2 horas</VListItemSubtitle>
            <template #append>
              <span class="font-weight-medium text-success">+$1,200</span>
            </template>
          </VListItem>
          <VDivider inset />
          <VListItem>
            <template #prepend>
              <VAvatar color="info" variant="tonal">R</VAvatar>
            </template>
            <VListItemTitle>Reparación Reloj</VListItemTitle>
            <VListItemSubtitle>Hace 5 horas</VListItemSubtitle>
            <template #append>
              <span class="font-weight-medium text-success">+$150</span>
            </template>
          </VListItem>
          <VDivider inset />
          <VListItem>
            <template #prepend>
              <VAvatar color="primary" variant="tonal">C</VAvatar>
            </template>
            <VListItemTitle>Collar de Perlas</VListItemTitle>
            <VListItemSubtitle>Ayer</VListItemSubtitle>
            <template #append>
              <span class="font-weight-medium text-success">+$400</span>
            </template>
          </VListItem>
        </VList>
      </VCard>
    </VCol>
  </VRow>
</template>
