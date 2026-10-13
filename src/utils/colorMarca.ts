// 🎨 Utilidades para derivar la paleta de marca a partir del color primario configurado

export const COLOR_PRIMARIO_POR_DEFECTO = '#C9A84C'

export interface PaletaMarca {

  /** Color primario tal cual se configuró */
  primario: string

  /** Variante 'primary-darken-1' del tema de Vuetify */
  primarioOscurecido: string

  /** Variante clara para el tema oscuro (code-color) */
  primarioSuave: string

  /** Tono oscuro usado en títulos y bordes de documentos impresos */
  oscuro: string

  /** Tono claro usado sobre fondos oscuros (encabezados de tablas impresas) */
  claro: string

  /** Componentes "r,g,b" del primario para usar en rgba() */
  rgb: string

  /** Color de texto legible sobre el primario */
  sobrePrimario: string
}

// La paleta histórica fue ajustada a mano; se conserva exacta para el color por defecto.
const PALETA_POR_DEFECTO: PaletaMarca = {
  primario: COLOR_PRIMARIO_POR_DEFECTO,
  primarioOscurecido: '#A07A2B',
  primarioSuave: '#E2C06A',
  oscuro: '#8B6B15',
  claro: '#F5D77F',
  rgb: '201,168,76',
  sobrePrimario: '#141414',
}

const REGEX_HEX = /^#?(?:[\da-f]{6}|[\da-f]{3})$/i

export const esColorHexValido = (valor: unknown): valor is string =>
  typeof valor === 'string' && REGEX_HEX.test(valor.trim())

export const normalizarHex = (valor: string): string => {
  let hex = valor.trim().replace('#', '')
  if (hex.length === 3)
    hex = hex.split('').map(c => c + c).join('')

  return `#${hex.toUpperCase()}`
}

const hexARgb = (hex: string): [number, number, number] => {
  const limpio = normalizarHex(hex).slice(1)

  return [0, 2, 4].map(i => Number.parseInt(limpio.slice(i, i + 2), 16)) as [number, number, number]
}

const rgbAHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

const rgbAHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min

    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn)
      h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn)
      h = (bn - rn) / d + 2
    else
      h = (rn - gn) / d + 4
    h *= 60
  }

  return [h, s * 100, l * 100]
}

const hslAHex = (h: number, s: number, l: number) => {
  const sn = Math.min(100, Math.max(0, s)) / 100
  const ln = Math.min(100, Math.max(0, l)) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  return rgbAHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

const luminanciaRelativa = ([r, g, b]: [number, number, number]) => {
  const canal = (v: number) => {
    const c = v / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export const derivarPaletaMarca = (color: string | null | undefined): PaletaMarca => {
  if (!esColorHexValido(color))
    return { ...PALETA_POR_DEFECTO }

  const primario = normalizarHex(color)
  if (primario === COLOR_PRIMARIO_POR_DEFECTO)
    return { ...PALETA_POR_DEFECTO }

  const rgb = hexARgb(primario)
  const [h, s, l] = rgbAHsl(...rgb)
  const luminancia = luminanciaRelativa(rgb)
  const contrasteNegro = (luminancia + 0.05) / 0.05
  const contrasteBlanco = 1.05 / (luminancia + 0.05)

  return {
    primario,
    primarioOscurecido: hslAHex(h, s * 1.06, l * 0.73),
    primarioSuave: hslAHex(h, s * 1.1, l + (100 - l) * 0.25),
    oscuro: hslAHex(h, s * 1.35, l * 0.58),
    claro: hslAHex(h, s * 1.6, l + (100 - l) * 0.41),
    rgb: rgb.join(','),
    sobrePrimario: contrasteNegro >= contrasteBlanco ? '#141414' : '#FFFFFF',
  }
}
