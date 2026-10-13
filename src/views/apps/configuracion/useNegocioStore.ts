import { defineStore } from 'pinia'
import logoPorDefecto from '@images/logos/logo-dorado.png'
import { namespaceConfig } from '@layouts/stores/config'
import { supabase } from '@/utils/supabase'
import { COLOR_PRIMARIO_POR_DEFECTO, derivarPaletaMarca } from '@/utils/colorMarca'

export interface ConfiguracionNegocio {
  nombre_comercial: string
  razon_social: string | null
  nit: string | null
  eslogan: string | null
  direccion: string | null
  ciudad: string | null
  pais: string | null
  telefono: string | null
  correo: string | null
  sitio_web: string | null
  instagram: string | null
  facebook: string | null
  whatsapp: string | null
  logo_url: string | null
  logo_claro_url: string | null
  terminos_pedido: string | null
  terminos_impresion3d: string | null
  terminos_cartera: string | null
  terminos_vales: string | null
  texto_firma_autorizada: string | null
  color_primario: string
  moneda: string
  locale: string
  decimales_moneda: number
  created_at?: string | null
  updated_at?: string | null
}

export type CambiosConfiguracion = Partial<Omit<ConfiguracionNegocio, 'created_at' | 'updated_at'>>
export type VarianteLogo = 'principal' | 'claro'

// Mismos valores que la semilla de la migración 20261012000015: la app se ve igual
// aunque la tabla aún no exista o la consulta falle.
export const NEGOCIO_DEFAULTS: ConfiguracionNegocio = {
  nombre_comercial: '18D Joyeros',
  razon_social: '18D Joyeros S.A.S',
  nit: '901.482.930-1',
  eslogan: 'Joyería Fina & Diseños Personalizados 18k',
  direccion: null,
  ciudad: 'Medellín',
  pais: 'Colombia',
  telefono: '+57 (300) 18D-JOYA',
  correo: 'info@18djoyeros.com',
  sitio_web: null,
  instagram: null,
  facebook: null,
  whatsapp: null,
  logo_url: null,
  logo_claro_url: null,
  terminos_pedido: 'Garantía de por vida en la ley del metal (Oro 18k). No cubre pérdida de piedras por uso inadecuado o golpes. Conserve este comprobante para el retiro de su joya.',
  terminos_impresion3d: 'Garantía de calidad en la definición y cura de resina de impresión 3D para alta joyería. Verifique sus moldes al momento de la entrega. Conserve este comprobante.',
  terminos_cartera: 'Garantía de por vida en la autenticidad del oro 18k.\nEl saldo pendiente debe cancelarse al momento del retiro.',
  terminos_vales: null,
  texto_firma_autorizada: '18D Joyeros S.A.S',
  color_primario: COLOR_PRIMARIO_POR_DEFECTO,
  moneda: 'COP',
  locale: 'es-CO',
  decimales_moneda: 0,
  created_at: null,
  updated_at: null,
}

// index.html lee esta misma clave para pintar el loader inicial con el nombre y color del negocio.
export const CLAVE_CACHE_NEGOCIO = namespaceConfig('negocio')

const BUCKET_BRANDING = 'branding'
const TAMANO_MAXIMO_LOGO = 2 * 1024 * 1024
const TIPOS_LOGO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp']

const COLUMNA_LOGO: Record<VarianteLogo, 'logo_url' | 'logo_claro_url'> = {
  principal: 'logo_url',
  claro: 'logo_claro_url',
}

export const leerCacheNegocio = (): Partial<ConfiguracionNegocio> => {
  try {
    const crudo = localStorage.getItem(CLAVE_CACHE_NEGOCIO)

    return crudo ? JSON.parse(crudo) : {}
  }
  catch {
    return {}
  }
}

const escribirCache = (config: ConfiguracionNegocio) => {
  try {
    localStorage.setItem(CLAVE_CACHE_NEGOCIO, JSON.stringify(config))
  }
  catch {
    // localStorage no disponible (modo privado): se ignora
  }
}

// 👉 Helpers puros: permiten resolver la identidad a partir de una configuración
// arbitraria (p. ej. valores sin guardar en la vista previa).
export const resolverLogo = (config: Pick<ConfiguracionNegocio, 'logo_url'>) =>
  config.logo_url || logoPorDefecto

export const resolverLogoClaro = (config: Pick<ConfiguracionNegocio, 'logo_url' | 'logo_claro_url'>) =>
  config.logo_claro_url || resolverLogo(config)

export const resolverRazonSocial = (config: Pick<ConfiguracionNegocio, 'razon_social' | 'nombre_comercial'>) =>
  config.razon_social || config.nombre_comercial

export const resolverUbicacion = (config: Pick<ConfiguracionNegocio, 'ciudad' | 'pais'>) =>
  [config.ciudad, config.pais].filter(Boolean).join(', ')

export const resolverContacto = (config: Pick<ConfiguracionNegocio, 'telefono' | 'correo'>) =>
  [config.telefono, config.correo].filter(Boolean).join(' | ')

export const resolverFirma = (config: Pick<ConfiguracionNegocio, 'texto_firma_autorizada' | 'razon_social' | 'nombre_comercial'>) =>
  config.texto_firma_autorizada || resolverRazonSocial(config)

export const useNegocioStore = defineStore('NegocioStore', {
  state: () => ({
    config: { ...NEGOCIO_DEFAULTS, ...leerCacheNegocio() } as ConfiguracionNegocio,
    cargado: false,
    cargando: false,
    errorCarga: null as string | null,
  }),

  getters: {
    nombreComercial: state => state.config.nombre_comercial,
    nombreMayusculas: state => state.config.nombre_comercial.toUpperCase(),
    razonSocial: state => resolverRazonSocial(state.config),
    logo: state => resolverLogo(state.config),
    logoClaro: state => resolverLogoClaro(state.config),
    ubicacion: state => resolverUbicacion(state.config),
    lineaContacto: state => resolverContacto(state.config),
    textoFirma: state => resolverFirma(state.config),
    paleta: state => derivarPaletaMarca(state.config.color_primario),
    tituloDocumento: state => `${state.config.nombre_comercial.toUpperCase()} – Diseño 3D`,

    /** La fila sigue con los valores de la semilla (nunca se guardó desde la app). */
    nuncaEditada: state => !!state.config.created_at && state.config.created_at === state.config.updated_at,
  },

  actions: {
    _aplicar(fila: Partial<ConfiguracionNegocio>) {
      this.config = { ...NEGOCIO_DEFAULTS, ...fila }
      escribirCache(this.config)
    },

    // 👉 Cargar configuración desde Supabase (no bloquea el render: se parte del caché/defaults)
    async cargar() {
      this.cargando = true
      this.errorCarga = null
      try {
        const { data, error } = await supabase
          .from('configuracion_negocio')
          .select('*')
          .eq('id', 1)
          .maybeSingle()

        if (error)
          throw error

        if (data)
          this._aplicar(data)

        this.cargado = true
      }
      catch (error: any) {
        this.errorCarga = error?.message || 'No se pudo cargar la configuración del negocio'
        console.error('Error al cargar configuración del negocio:', error)
      }
      finally {
        this.cargando = false
      }
    },

    // 👉 Guardar cambios (solo admin; lo garantiza RLS)
    async guardar(cambios: CambiosConfiguracion) {
      const { data, error } = await supabase
        .from('configuracion_negocio')
        .update(cambios)
        .eq('id', 1)
        .select()
        .maybeSingle()

      if (error)
        throw error

      // Con RLS, un UPDATE sin permiso no falla: simplemente no devuelve filas.
      if (!data)
        throw new Error('No tienes permisos para modificar la configuración o la fila no existe.')

      this._aplicar(data)

      return this.config
    },

    // 👉 Subir logo al bucket 'branding' y guardar su URL pública
    async subirLogo(file: File, variante: VarianteLogo) {
      if (!TIPOS_LOGO_PERMITIDOS.includes(file.type))
        throw new Error('Formato no permitido. Usa PNG, JPG o WEBP.')

      if (file.size > TAMANO_MAXIMO_LOGO)
        throw new Error('El logo no puede superar los 2 MB.')

      const extension = file.type.split('/')[1].replace('jpeg', 'jpg')
      const ruta = `logo-${variante}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_BRANDING)
        .upload(ruta, file, { upsert: true, contentType: file.type, cacheControl: '3600' })

      if (uploadError)
        throw uploadError

      const otrasRutas = ['png', 'jpg', 'webp']
        .filter(ext => ext !== extension)
        .map(ext => `logo-${variante}.${ext}`)

      await supabase.storage.from(BUCKET_BRANDING).remove(otrasRutas)

      const { data } = supabase.storage.from(BUCKET_BRANDING).getPublicUrl(ruta)
      const url = `${data.publicUrl}?v=${Date.now()}`

      await this.guardar({ [COLUMNA_LOGO[variante]]: url })

      return url
    },

    async quitarLogo(variante: VarianteLogo) {
      await this.guardar({ [COLUMNA_LOGO[variante]]: null })
    },
  },
})
