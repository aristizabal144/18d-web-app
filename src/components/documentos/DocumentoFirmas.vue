<script setup lang="ts">
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

const props = withDefaults(defineProps<{
  nombreCliente?: string
  etiquetaCliente?: string
  etiquetaAutorizada?: string

  /** Reemplaza el texto bajo la firma autorizada (vista previa sin guardar) */
  textoFirma?: string | null
}>(), {
  nombreCliente: '',
  etiquetaCliente: 'Firma Cliente',
  etiquetaAutorizada: 'Firma Autorizada',
  textoFirma: undefined,
})

const negocio = useNegocioStore()

const firma = computed(() => props.textoFirma || negocio.textoFirma)
</script>

<template>
  <div class="d-flex justify-space-around text-center pt-4 signatures-row">
    <div class="signature-block">
      <div class="signature-line" />
      <span class="text-xs font-weight-bold d-block mt-1 signature-label">{{ etiquetaCliente }}</span>
      <span class="text-xs signature-sub">{{ nombreCliente }}</span>
    </div>
    <div class="signature-block">
      <div class="signature-line" />
      <span class="text-xs font-weight-bold d-block mt-1 signature-label">{{ etiquetaAutorizada }}</span>
      <span class="text-xs signature-sub">{{ firma }}</span>
    </div>
  </div>
</template>
