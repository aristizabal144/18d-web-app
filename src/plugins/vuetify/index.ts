import { deepMerge } from '@antfu/utils'
import type { App } from 'vue'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VVideo } from 'vuetify/labs/VVideo'
import defaults from './defaults'
import { icons } from './icons'
import { staticPrimaryColor, themes } from './theme'
import { themeConfig } from '@themeConfig'
import { derivarPaletaMarca } from '@/utils/colorMarca'
import { leerCacheNegocio } from '@/views/apps/configuracion/useNegocioStore'

// Styles
import { cookieRef } from '@/@layouts/stores/config'
import '@core/scss/template/libs/vuetify/index.scss'
import 'vuetify/styles'

export default function (app: App) {
  // El color del negocio (caché local) es el primario por defecto; la cookie del
  // customizer solo aplica si aún no hay caché. useMarcaNegocio lo actualiza al cargar.
  const paleta = derivarPaletaMarca(
    leerCacheNegocio().color_primario ?? cookieRef('lightThemePrimaryColor', staticPrimaryColor).value,
  )

  const cookieThemeValues = {
    defaultTheme: resolveVuetifyTheme(themeConfig.app.theme),
    themes: {
      light: {
        colors: {
          'primary': paleta.primario,
          'primary-darken-1': paleta.primarioOscurecido,
        },
      },
      dark: {
        colors: {
          'primary': paleta.primario,
          'primary-darken-1': paleta.primarioOscurecido,
        },
      },
    },
  }

  const optionTheme = deepMerge({ themes }, cookieThemeValues)

  const vuetify = createVuetify({
    aliases: {
      IconBtn: VBtn,
    },
    components: {
      VVideo,
    },
    defaults,
    icons,
    theme: optionTheme,

  })

  app.use(vuetify)
}
