import type { Router } from 'vue-router'
import type { NavGroup, NavLink, NavSectionTitle, VerticalNavItems } from '@layouts/types'

const esEncabezado = (item: VerticalNavItems[number]): item is NavSectionTitle => 'heading' in item

const requiereAdmin = (router: Router, item: NavLink | NavGroup): boolean => {
  if ('children' in item)
    return item.children.every(hijo => requiereAdmin(router, hijo))

  if (!item.to)
    return false

  try {
    return router.resolve(item.to).meta.requiereAdmin === true
  }
  catch {
    return false
  }
}

/**
 * Oculta los enlaces cuyas rutas tienen meta.requiereAdmin cuando el usuario no es
 * admin, y los encabezados que quedan sin enlaces visibles.
 */
export const filtrarNavegacionPorRol = (items: VerticalNavItems, router: Router, esAdmin: boolean): VerticalNavItems => {
  const visibles = items.filter(item => esEncabezado(item) || esAdmin || !requiereAdmin(router, item))

  return visibles.filter((item, indice) => {
    if (!esEncabezado(item))
      return true

    const siguiente = visibles[indice + 1]

    return !!siguiente && !esEncabezado(siguiente)
  })
}
