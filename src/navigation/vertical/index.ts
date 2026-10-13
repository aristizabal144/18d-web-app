export default [
  // ──────────────────────────────────────────
  // 🔨 TALLER FABRICACIÓN
  // ──────────────────────────────────────────
  {
    heading: 'Taller Fabricación',
  },
  {
    title: 'Informe Semanal',
    to: { name: 'root' },
    icon: { icon: 'tabler-chart-bar' },
  },
  {
    title: 'Informe Mensual',
    to: { name: 'apps-informe-mensual' },
    icon: { icon: 'tabler-calendar-stats' },
  },
  {
    title: 'Clientes',
    to: { name: 'apps-clients-list' },
    icon: { icon: 'tabler-users' },
  },
  {
    title: 'Diseños 3D',
    to: { name: 'apps-disenos-list' },
    icon: { icon: 'tabler-cube-3d-sphere' },
  },
  {
    title: 'Pedidos',
    to: { name: 'apps-pedidos-list' },
    icon: { icon: 'tabler-shopping-cart' },
  },
  {
    title: 'Cartera',
    to: { name: 'apps-cartera' },
    icon: { icon: 'tabler-report-money' },
  },
  {
    title: 'Gastos',
    to: { name: 'apps-gastos-list' },
    icon: { icon: 'tabler-wallet' },
  },
  {
    title: 'Vales',
    to: { name: 'apps-vales' },
    icon: { icon: 'tabler-receipt-refund' },
  },
  {
    title: 'Arreglos',
    to: { name: 'apps-arreglos' },
    icon: { icon: 'tabler-tools' },
  },

  // ──────────────────────────────────────────
  // 🖨️ IMPRESIONES 3D
  // ──────────────────────────────────────────
  {
    heading: 'Impresiones 3D',
  },
  {
    title: 'Facturación 3D',
    to: { name: 'apps-impresiones3d-facturacion' },
    icon: { icon: 'tabler-file-invoice' },
  },
  {
    title: 'Informe Mensual',
    to: { name: 'apps-impresiones3d-informe' },
    icon: { icon: 'tabler-chart-area-line' },
  },

  // ──────────────────────────────────────────
  // ⚙️ SISTEMA (solo admin: se oculta según meta.requiereAdmin de la ruta)
  // ──────────────────────────────────────────
  {
    heading: 'Sistema',
  },
  {
    title: 'Configuración',
    to: { name: 'apps-configuracion' },
    icon: { icon: 'tabler-settings' },
  },
]

