import '../jornal/jornal.css'
import { classeFontesJornal } from '@/lib/jornal/fontes'

export default function JornalPublicoLayout({ children }) {
  return <div className={`jn-publico ${classeFontesJornal}`}>{children}</div>
}
