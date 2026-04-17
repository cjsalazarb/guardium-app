import Sidebar from './Sidebar'
import { T } from '../lib/tokens'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.BG }}>
      <Sidebar />
      <div style={{ marginLeft: 68, flex: 1, padding: 32, fontFamily: T.FONT_BODY }}>
        {children}
      </div>
    </div>
  )
}
