<script setup lang="ts">
import type { ConfiguracionNegocio } from '@/views/apps/configuracion/useNegocioStore'
import {
  resolverContacto,
  resolverLogo,
  resolverRazonSocial,
  resolverUbicacion,
  useNegocioStore,
} from '@/views/apps/configuracion/useNegocioStore'

const props = defineProps<{

  /** Valores que reemplazan a la configuración guardada (vista previa sin guardar) */
  config?: Partial<ConfiguracionNegocio>

  /** Reemplaza el eslogan del negocio (p. ej. una división específica) */
  eslogan?: string
}>()

const negocio = useNegocioStore()

const datos = computed<ConfiguracionNegocio>(() => ({ ...negocio.config, ...props.config }))
const logo = computed(() => resolverLogo(datos.value))
const razonSocial = computed(() => resolverRazonSocial(datos.value).toUpperCase())
const ubicacion = computed(() => resolverUbicacion(datos.value))
const contacto = computed(() => resolverContacto(datos.value))
const esloganMostrado = computed(() => props.eslogan ?? datos.value.eslogan)
</script>

<template>
  <div class="d-flex justify-space-between align-start mb-6 invoice-header">
    <div class="d-flex flex-column align-start">
      <img
        :src="logo"
        :alt="`Logo ${datos.nombre_comercial}`"
        class="invoice-logo mb-2"
      >
      <div class="company-details text-xs">
        <strong class="company-name text-body-2 font-weight-bold d-block">{{ razonSocial }}</strong>
        <template v-if="datos.nit">
          <span>NIT: {{ datos.nit }}</span><br>
        </template>
        <template v-if="esloganMostrado">
          <span>{{ esloganMostrado }}</span><br>
        </template>
        <template v-if="datos.direccion">
          <span>{{ datos.direccion }}</span><br>
        </template>
        <template v-if="ubicacion">
          <span>{{ ubicacion }}</span><br>
        </template>
        <span v-if="contacto">Contacto: {{ contacto }}</span>
      </div>
    </div>

    <slot />
  </div>
</template>

<!-- Estilos globales (no scoped) bajo .documento-factura: también los usa la ventana de impresión -->
<style lang="scss" src="./documento-factura.scss"></style>
