import type { Arreglo, ClienteArreglo } from './useArreglosStore'
import { DIAS_VENCIMIENTO_ARREGLO, toLocalDateStr } from './useArreglosStore'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

export interface GrupoCobro {
  cliente: ClienteArreglo | null
  arreglos: Arreglo[]
}

const escapar = (texto: string | null | undefined) =>
  (texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const diasDesde = (fecha: string) => {
  const inicio = new Date(`${fecha.substring(0, 10)}T12:00:00`)

  return Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 86_400_000))
}

export const nombreCliente = (cliente: ClienteArreglo | null | undefined) =>
  cliente ? `${cliente.nombre} ${cliente.apellido}`.trim() : 'Sin cliente asignado'

/** Agrupa arreglos por cliente conservando el orden de aparición. */
export const agruparPorCliente = (arreglos: Arreglo[]): GrupoCobro[] => {
  const grupos = new Map<string, GrupoCobro>()

  for (const a of arreglos) {
    const clave = a.cliente_id || 'sin-cliente'
    const grupo = grupos.get(clave) || { cliente: a.cliente || null, arreglos: [] }

    grupo.arreglos.push(a)
    grupos.set(clave, grupo)
  }

  return [...grupos.values()]
}

/**
 * Cuenta de cobro de arreglos pendientes (una página por cliente) y
 * recordatorio de pago por WhatsApp.
 */
export const useCuentaCobroArreglos = () => {
  const negocio = useNegocioStore()
  const { formatCurrency, formatDateNumeric, formatDate } = useFormato()
  const { imprimirHtml } = usePrintDocument()

  const numeroCuenta = (grupo: GrupoCobro) => {
    const fecha = toLocalDateStr(new Date()).replace(/-/g, '')
    const sufijo = (grupo.cliente?.id || 'GEN').substring(0, 4).toUpperCase()

    return `CC-${fecha}-${sufijo}`
  }

  const paginaCliente = (grupo: GrupoCobro) => {
    const total = grupo.arreglos.reduce((s, a) => s + Number(a.valor || 0), 0)
    const piezas = grupo.arreglos.reduce((s, a) => s + Number(a.cantidad || 1), 0)
    const masAntiguo = grupo.arreglos.reduce((max, a) => Math.max(max, diasDesde(a.fecha)), 0)
    const condiciones = escapar(negocio.config.terminos_cartera).replace(/\n/g, '<br>')

    const filas = grupo.arreglos.map((a, i) => {
      const dias = diasDesde(a.fecha)

      return `
        <tr>
          <td class="c">${i + 1}</td>
          <td class="c">${formatDateNumeric(a.fecha)}</td>
          <td>
            <div class="desc">${escapar(a.descripcion)}</div>
            ${a.notas ? `<div class="nota">${escapar(a.notas)}</div>` : ''}
          </td>
          <td class="c">${a.cantidad}</td>
          <td class="c ${dias > DIAS_VENCIMIENTO_ARREGLO ? 'vencido' : ''}">${dias} d</td>
          <td class="r b">${formatCurrency(a.valor)}</td>
        </tr>`
    }).join('')

    return `
      <div class="pagina">
        <div class="encabezado">
          <div>
            <div class="marca">${escapar(negocio.nombreMayusculas)}</div>
            <div class="empresa">
              <strong>${escapar(negocio.razonSocial.toUpperCase())}</strong><br>
              ${negocio.config.nit ? `NIT: ${escapar(negocio.config.nit)}<br>` : ''}
              ${negocio.config.direccion ? `${escapar(negocio.config.direccion)}<br>` : ''}
              ${negocio.ubicacion ? `${escapar(negocio.ubicacion)}<br>` : ''}
              ${negocio.lineaContacto ? `Contacto: ${escapar(negocio.lineaContacto)}` : ''}
            </div>
          </div>
          <div class="meta">
            <div class="titulo">CUENTA DE COBRO</div>
            <div class="numero">${numeroCuenta(grupo)}</div>
            <div class="emision">Fecha de emisión: <strong>${formatDate(new Date())}</strong></div>
            <div class="chip">ARREGLOS PENDIENTES DE PAGO</div>
          </div>
        </div>

        <div class="grid">
          <div class="caja">
            <div class="caja-titulo">Cliente</div>
            <div class="caja-principal">${escapar(nombreCliente(grupo.cliente))}</div>
            ${grupo.cliente?.telefono ? `<div class="caja-sub">Tel: ${escapar(grupo.cliente.telefono)}</div>` : ''}
          </div>
          <div class="caja">
            <div class="caja-titulo">Resumen</div>
            <div class="fila"><span>Arreglos pendientes</span><strong>${grupo.arreglos.length}</strong></div>
            <div class="fila"><span>Piezas</span><strong>${piezas}</strong></div>
            <div class="fila"><span>Antigüedad máxima</span><strong>${masAntiguo} días</strong></div>
          </div>
        </div>

        <div class="seccion">Detalle de servicios de taller</div>
        <table>
          <thead>
            <tr>
              <th class="c" style="width: 36px;">#</th>
              <th class="c" style="width: 95px;">Fecha</th>
              <th>Descripción</th>
              <th class="c" style="width: 60px;">Cant.</th>
              <th class="c" style="width: 70px;">Días</th>
              <th class="r" style="width: 120px;">Valor</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>

        <div class="pie">
          <div class="condiciones">
            ${condiciones ? `<strong>Condiciones de pago:</strong><br>${condiciones}` : ''}
          </div>
          <div class="totales">
            <div class="fila"><span>Subtotal (${grupo.arreglos.length} arreglos)</span><strong>${formatCurrency(total)}</strong></div>
            <hr>
            <div class="fila total"><span>TOTAL A PAGAR</span><span>${formatCurrency(total)}</span></div>
          </div>
        </div>

        <div class="firmas">
          <div class="firma">
            <div class="linea"></div>
            <div class="etiqueta">RECIBÍ CONFORME</div>
            <div class="sub">${escapar(nombreCliente(grupo.cliente))}</div>
          </div>
          <div class="firma">
            <div class="linea"></div>
            <div class="etiqueta">${escapar(negocio.textoFirma.toUpperCase())}</div>
            <div class="sub">Taller de arreglos</div>
          </div>
        </div>
      </div>`
  }

  const imprimirCuentaCobro = (grupos: GrupoCobro[]) => {
    const conArreglos = grupos.filter(g => g.arreglos.length)
    if (!conArreglos.length)
      return

    const titulo = conArreglos.length === 1
      ? `Cuenta de cobro - ${nombreCliente(conArreglos[0].cliente)}`
      : `Cuentas de cobro de arreglos (${conArreglos.length} clientes)`

    imprimirHtml({
      titulo,
      ancho: 900,
      alto: 1000,
      cuerpo: conArreglos.map(paginaCliente).join('<div class="salto"></div>'),
      estilos: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 24px; font-size: 12px; }
        .salto { page-break-after: always; break-after: page; }
        .pagina { padding: 6px 0; }
        .encabezado { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--doc-primario-oscuro); padding-bottom: 14px; margin-bottom: 18px; }
        .marca { font-size: 22px; font-weight: 900; color: var(--doc-primario-oscuro); letter-spacing: 1px; margin-bottom: 4px; }
        .empresa { color: #444; font-size: 11px; line-height: 1.5; }
        .empresa strong { color: #111; }
        .meta { text-align: right; }
        .titulo { font-size: 20px; font-weight: 800; color: var(--doc-primario-oscuro); }
        .numero { font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; margin: 2px 0 4px; }
        .emision { color: #555; font-size: 11px; margin-bottom: 6px; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #c62828; background: #ffebee; border: 1px solid #ef9a9a; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        .caja { background: #fdfbf7; border: 1px solid #e5dac4; border-radius: 8px; padding: 12px 14px; }
        .caja-titulo { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--doc-primario-oscuro); margin-bottom: 6px; letter-spacing: 0.5px; }
        .caja-principal { font-size: 16px; font-weight: 800; text-transform: capitalize; }
        .caja-sub { color: #555; margin-top: 2px; }
        .fila { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .fila span { color: #555; }
        .seccion { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #555; letter-spacing: 0.5px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th { background: #1e1b16; color: var(--doc-primario-claro); padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 2px solid var(--doc-primario-oscuro); }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
        tr:nth-child(even) td { background: #fcfcfc; }
        .c { text-align: center; }
        .r { text-align: right; }
        .b { font-weight: 700; }
        .desc { font-weight: 600; }
        .nota { color: #666; font-size: 10px; margin-top: 2px; font-style: italic; }
        .vencido { color: #c62828; font-weight: 700; }
        .pie { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
        .condiciones { color: #444; font-size: 11px; line-height: 1.5; flex: 1; }
        .condiciones strong { color: #111; }
        .totales { width: 300px; background: #fdfbf7; border: 1px solid #d9ccaf; border-radius: 8px; padding: 12px 14px; }
        .totales hr { border: 0; border-top: 1px solid #d9ccaf; margin: 8px 0; }
        .fila.total { font-size: 15px; font-weight: 800; color: #c62828; margin: 0; }
        .fila.total span { color: #c62828; }
        .firmas { display: flex; justify-content: space-around; margin-top: 48px; }
        .firma { width: 220px; text-align: center; }
        .linea { border-bottom: 1px solid #222; height: 35px; }
        .etiqueta { font-size: 10px; font-weight: 700; margin-top: 4px; }
        .sub { font-size: 10px; color: #555; }
        @media print {
          body { padding: 0; }
          @page { size: A4; margin: 12mm; }
        }
      `,
    })
  }

  /** Normaliza el teléfono para wa.me (agrega indicativo 57 a celulares colombianos de 10 dígitos). */
  const telefonoWhatsapp = (telefono: string | null | undefined) => {
    const digitos = (telefono || '').replace(/\D/g, '')
    if (!digitos)
      return null
    if (digitos.length === 10 && negocio.config.locale.endsWith('CO'))
      return `57${digitos}`

    return digitos
  }

  const mensajeRecordatorio = (grupo: GrupoCobro) => {
    const total = grupo.arreglos.reduce((s, a) => s + Number(a.valor || 0), 0)
    const nombre = grupo.cliente?.nombre || ''

    const lineas = grupo.arreglos.map(a =>
      `• ${formatDateNumeric(a.fecha)} — ${a.descripcion}${a.cantidad > 1 ? ` (x${a.cantidad})` : ''}: ${formatCurrency(a.valor)}`,
    )

    return [
      `Hola ${nombre}, te saludamos de ${negocio.nombreComercial}.`,
      '',
      'Te compartimos el resumen de tus arreglos pendientes de pago:',
      ...lineas,
      '',
      `*Total: ${formatCurrency(total)}*`,
      '',
      '¡Muchas gracias por tu confianza!',
    ].join('\n')
  }

  /** URL de WhatsApp; sin teléfono abre el selector de contacto con el mensaje listo. */
  const urlWhatsapp = (grupo: GrupoCobro) => {
    const telefono = telefonoWhatsapp(grupo.cliente?.telefono)
    const texto = encodeURIComponent(mensajeRecordatorio(grupo))

    return telefono ? `https://wa.me/${telefono}?text=${texto}` : `https://wa.me/?text=${texto}`
  }

  return {
    imprimirCuentaCobro,
    mensajeRecordatorio,
    urlWhatsapp,
    telefonoWhatsapp,
  }
}
