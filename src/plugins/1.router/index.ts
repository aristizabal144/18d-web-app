import { setupLayouts } from 'virtual:meta-layouts'
import type { App } from 'vue'

import type { RouteRecordRaw } from 'vue-router/auto'

import { createRouter, createWebHistory } from 'vue-router/auto'
import { supabase } from '@/utils/supabase'

function recursiveLayouts(route: RouteRecordRaw): RouteRecordRaw {
  if (route.children) {
    for (let i = 0; i < route.children.length; i++)
      route.children[i] = recursiveLayouts(route.children[i])

    return route
  }

  return setupLayouts([route])[0]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash)
      return { el: to.hash, behavior: 'smooth', top: 60 }

    return { top: 0 }
  },
  extendRoutes: pages => [
    ...[...pages].map(route => recursiveLayouts(route)),
  ],
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()

  const isPublicRoute = to.meta.public === true

  if (!session && !isPublicRoute) {
    // Usuario no logueado intenta acceder a ruta protegida -> redirigir a login
    return next({ path: '/login' })
  }

  if (session && to.path === '/login') {
    // Usuario logueado intenta acceder al login -> redirigir al inicio
    return next({ path: '/' })
  }

  next()
})

export { router }

export default function (app: App) {
  app.use(router)
}
