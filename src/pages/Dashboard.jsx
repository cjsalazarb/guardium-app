import Layout from '../components/Layout'
import { T } from '../lib/tokens'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <Layout>
      <div>
        <h1 style={{
          fontFamily: T.FONT_DISPLAY,
          fontSize: 36,
          color: T.TEXT,
          margin: '0 0 8px 0',
          letterSpacing: '0.02em',
        }}>
          DASHBOARD
        </h1>
        <p style={{
          fontFamily: T.FONT_BODY,
          fontSize: 16,
          color: T.TEXT_MUTED,
          margin: 0,
        }}>
          Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}. Panel de control GUARDIUM.
        </p>

        {/* KPI Cards placeholder */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
          marginTop: 32,
        }}>
          {[
            { label: 'Contratos Activos', value: '—', color: T.RED },
            { label: 'Guardias Activos', value: '—', color: T.SUCCESS },
            { label: 'Incidentes Abiertos', value: '—', color: T.WARN },
            { label: 'Facturacion Pendiente', value: '—', color: T.INFO },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: T.WHITE,
              borderRadius: T.RADIUS,
              padding: 24,
              boxShadow: T.SHADOW,
            }}>
              <div style={{
                fontSize: 36,
                fontFamily: T.FONT_DISPLAY,
                color: kpi.color,
                marginBottom: 4,
              }}>
                {kpi.value}
              </div>
              <div style={{
                fontSize: 14,
                fontFamily: T.FONT_BODY,
                color: T.TEXT_MUTED,
              }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
