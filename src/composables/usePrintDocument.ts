import documentoFacturaCss from '@/components/documentos/documento-factura.scss?inline'
import type { PaletaMarca } from '@/utils/colorMarca'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

// Subconjunto de utilidades de Vuetify que usan los documentos; la ventana de
// impresión no carga los estilos de la app.
const ESTILOS_UTILIDADES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; padding: 20px; }
  .d-flex { display: flex; }
  .flex-column { flex-direction: column; }
  .align-start { align-items: flex-start; }
  .align-center { align-items: center; }
  .justify-space-between { justify-content: space-between; }
  .justify-space-around { justify-content: space-around; }
  .justify-end { justify-content: flex-end; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-capitalize { text-transform: capitalize; }
  .text-uppercase { text-transform: uppercase; }
  .font-weight-bold { font-weight: 700; }
  .font-weight-medium { font-weight: 500; }
  .text-xs { font-size: 0.75rem; }
  .text-sm { font-size: 0.875rem; }
  .text-body-2 { font-size: 0.875rem; }
  .text-body-1 { font-size: 1rem; }
  .text-subtitle-1 { font-size: 1rem; }
  .text-h5 { font-size: 1.5rem; }
  .text-h6 { font-size: 1.25rem; }
  .d-block { display: block; }
  .d-inline-block { display: inline-block; }
  .mb-1 { margin-bottom: 4px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-6 { margin-bottom: 24px; }
  .mb-8 { margin-bottom: 32px; }
  .mt-1 { margin-top: 4px; }
  .mt-auto { margin-top: auto; }
  .me-1 { margin-right: 4px; }
  .ms-1 { margin-left: 4px; }
  .pa-4 { padding: 16px; }
  .pa-6 { padding: 24px; }
  .px-3 { padding-left: 12px; padding-right: 12px; }
  .px-4 { padding-left: 16px; padding-right: 16px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .py-3 { padding-top: 12px; padding-bottom: 12px; }
  .pt-4 { padding-top: 16px; }
  .my-2 { margin-top: 8px; margin-bottom: 8px; }
  .gap-2 { gap: 8px; }
  .w-100 { width: 100%; }
  .rounded { border-radius: 4px; }
  .rounded-lg { border-radius: 8px; }
  .border-t { border-top: 1px solid #e0e0e0; }
  hr.border-dashed { border-style: dashed; }
  .v-icon, i { display: none; }
  @media print {
    body { padding: 0; margin: 0; }
    @page { margin: 15mm; }
  }
`

export interface OpcionesImpresion {
  titulo: string
  cuerpo: string
  estilos?: string
  ancho?: number
  alto?: number

  /** Cierra la ventana después de imprimir */
  cerrarAlTerminar?: boolean
}

export const variablesCssMarca = (paleta: PaletaMarca) => ({
  '--doc-primario': paleta.primario,
  '--doc-primario-oscuro': paleta.oscuro,
  '--doc-primario-claro': paleta.claro,
  '--doc-primario-rgb': paleta.rgb,
})

const escaparHtml = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Centraliza la impresión de documentos en una ventana nueva con los colores
 * de marca del negocio inyectados como variables CSS.
 */
export const usePrintDocument = () => {
  const negocio = useNegocioStore()

  /** Variables CSS para enlazar con :style en la vista previa en pantalla. */
  const variablesCss = computed(() => variablesCssMarca(negocio.paleta))

  const estilosVariables = () => {
    const declaraciones = Object.entries(variablesCss.value)
      .map(([nombre, valor]) => `${nombre}: ${valor};`)
      .join(' ')

    return `:root { ${declaraciones} }`
  }

  const imprimirHtml = (opciones: OpcionesImpresion) => {
    const { titulo, cuerpo, estilos = '', ancho = 900, alto = 1000, cerrarAlTerminar = false } = opciones

    const ventana = window.open('', '_blank', `width=${ancho},height=${alto}`)
    if (!ventana)
      return

    ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escaparHtml(titulo)}</title>
  <style>${estilosVariables()}</style>
  <style>${estilos}</style>
</head>
<body>
${cuerpo}
<script>
  window.onload = function () {
    window.focus();
    window.print();
    ${cerrarAlTerminar ? 'window.onafterprint = function () { window.close(); };' : ''}
  };
<\/script>
</body>
</html>`)
    ventana.document.close()
  }

  /** Imprime el contenido de un elemento renderizado con los estilos de factura compartidos. */
  const imprimirFactura = (elemento: HTMLElement | null, titulo: string) => {
    if (!elemento)
      return

    imprimirHtml({
      titulo,
      cuerpo: `<div class="documento-factura">${elemento.innerHTML}</div>`,
      estilos: `${ESTILOS_UTILIDADES}\n${documentoFacturaCss}`,
      ancho: 850,
      alto: 1100,
      cerrarAlTerminar: true,
    })
  }

  return {
    variablesCss,
    estilosVariables,
    imprimirHtml,
    imprimirFactura,
  }
}
