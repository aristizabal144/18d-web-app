<script setup lang="ts">
defineProps<{
  titulo: string
  texto?: string | null
}>()
</script>

<template>
  <div
    v-if="texto"
    class="text-xs invoice-terms text-center mb-8 px-4"
  >
    <strong>{{ titulo }}</strong> {{ texto }}
  </div>
</template>
