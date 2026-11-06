import './jornal.css'
import { classeFontesJornal } from '@/lib/jornal/fontes'

export default function JornalLayout({ children }) {
  return <div className={classeFontesJornal}>{children}</div>
}
