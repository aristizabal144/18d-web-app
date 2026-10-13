import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

type FechaEntrada = string | Date | null | undefined

// Las fechas sin hora ('YYYY-MM-DD') se fijan al mediodía local para que la zona
// horaria no las corra al día anterior.
const aFecha = (valor: FechaEntrada): Date | null => {
  if (!valor)
    return null
  if (valor instanceof Date)
    return valor

  const fecha = valor.includes('T') || valor.includes(' ')
    ? new Date(valor)
    : new Date(`${valor}T12:00:00`)

  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/**
 * Formateadores de moneda, números y fechas según el formato regional
 * configurado en el negocio (moneda, locale y decimales).
 */
export const useFormato = () => {
  const negocio = useNegocioStore()

  const formatCurrency = (valor: number | null | undefined) => {
    const { moneda, locale, decimales_moneda: decimales } = negocio.config

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(Number(valor) || 0)
  }

  const formatNumber = (valor: number | null | undefined, decimales = 0) =>
    Number(valor || 0).toLocaleString(negocio.config.locale, {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })

  /** Fecha con opciones arbitrarias de Intl en el locale del negocio. */
  const formatDateWith = (valor: FechaEntrada, opciones: Intl.DateTimeFormatOptions, vacio = '-') => {
    const fecha = aFecha(valor)

    return fecha ? fecha.toLocaleDateString(negocio.config.locale, opciones) : vacio
  }

  /** Fecha larga: "5 de marzo de 2026". */
  const formatDate = (valor: FechaEntrada, vacio = '-') =>
    formatDateWith(valor, { year: 'numeric', month: 'long', day: 'numeric' }, vacio)

  /** Fecha compacta con mes abreviado: "5 mar 2026" (sin conectores del locale). */
  const formatShortDate = (valor: FechaEntrada, vacio = '-') => {
    const fecha = aFecha(valor)
    if (!fecha)
      return vacio

    return new Intl.DateTimeFormat(negocio.config.locale, { year: 'numeric', month: 'short', day: 'numeric' })
      .formatToParts(fecha)
      .filter(parte => parte.type !== 'literal')
      .map(parte => parte.value)
      .join(' ')
  }

  /** Fecha numérica: "05/03/2026" (el orden depende del locale). */
  const formatDateNumeric = (valor: FechaEntrada, vacio = '-') => {
    if (typeof valor === 'string' && valor.length >= 10)
      valor = valor.substring(0, 10)

    return formatDateWith(valor, { day: '2-digit', month: '2-digit', year: 'numeric' }, vacio)
  }

  /** Fecha y hora actuales para pies de reportes impresos: "5/3/2026 10:30 a. m.". */
  const formatNowDateTime = () => {
    const ahora = new Date()
    const { locale } = negocio.config

    return `${ahora.toLocaleDateString(locale)} ${ahora.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
  }

  /** Código ISO de la moneda configurada (para etiquetas como "Valor (COP)") */
  const moneda = computed(() => negocio.config.moneda)

  return {
    moneda,
    formatCurrency,
    formatNumber,
    formatDate,
    formatShortDate,
    formatDateNumeric,
    formatDateWith,
    formatNowDateTime,
  }
}
