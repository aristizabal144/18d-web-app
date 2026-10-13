import { useTheme } from 'vuetify'
import { layoutConfig } from '@layouts/config'
import type { LayoutConfig } from '@layouts/types'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

/**
 * Sincroniza la identidad del negocio con la app: tema de Vuetify (color primario
 * y derivados), título del menú y título de la pestaña. Carga la configuración
 * en segundo plano; mientras tanto se usan el caché local o los valores por defecto.
 */
export const useMarcaNegocio = () => {
  const negocio = useNegocioStore()
  const vuetifyTheme = useTheme()

  watch(
    () => negocio.paleta,
    paleta => {
      const { light, dark } = vuetifyTheme.themes.value
      const textoOscuro = paleta.sobrePrimario !== '#FFFFFF'

      for (const tema of [light, dark]) {
        tema.colors.primary = paleta.primario
        tema.colors['primary-darken-1'] = paleta.primarioOscurecido
      }

      light.colors['on-primary'] = textoOscuro ? '#141414' : '#FFFFFF'
      dark.colors['on-primary'] = textoOscuro ? '#0F0F11' : '#FFFFFF'
      light.variables['code-color'] = paleta.primarioOscurecido
      dark.variables['code-color'] = paleta.primarioSuave
    },
    { immediate: true },
  )

  watch(
    () => negocio.config.nombre_comercial,
    () => {
      // El tipo exige minúsculas porque el template lo capitaliza por CSS; aquí se muestra tal cual.
      layoutConfig.app.title = negocio.nombreMayusculas as LayoutConfig['app']['title']
      if (typeof document !== 'undefined')
        document.title = negocio.tituloDocumento
    },
    { immediate: true },
  )

  negocio.cargar()
}
