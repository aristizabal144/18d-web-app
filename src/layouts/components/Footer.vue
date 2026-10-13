<script setup lang="ts">
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

const negocio = useNegocioStore()

const sitioWeb = computed(() => {
  const url = negocio.config.sitio_web?.trim()
  if (!url)
    return null

  return /^https?:\/\//i.test(url) ? url : `https://${url}`
})
</script>

<template>
  <div class="h-100 d-flex align-center justify-md-space-between justify-center">
    <!-- 👉 Footer: left content -->
    <span class="d-flex align-center text-medium-emphasis">
      &copy;
      {{ new Date().getFullYear() }}
      <span class="ms-1">{{ negocio.razonSocial }}</span>
    </span>
    <!-- 👉 Footer: right content -->
    <span
      v-if="sitioWeb"
      class="d-md-flex gap-x-4 text-primary d-none"
    >
      <a
        :href="sitioWeb"
        target="_blank"
        rel="noopener noreferrer"
      >{{ negocio.config.sitio_web }}</a>
    </span>
  </div>
</template>
