// Cartão com o banner do item (jogo, app, sistema ou ferramenta), o nome, etiquetas opcionais e a frase curta.

import Image from 'next/image'
import Link from 'next/link'
import { ALTURA_BANNER, LARGURA_BANNER } from '@/lib/banners'

export default function CartaoBanner({ href, banner, nome, texto, etiquetas = [], grande = false, sizes = '(max-width: 720px) 90vw, 380px', priority = false }) {
  return (
    <Link href={href} className={`cartao${grande ? ' cartao-grande' : ''}`}>
      <Image src={banner} alt={`${nome}: ${texto}`} width={LARGURA_BANNER} height={ALTURA_BANNER} sizes={sizes} priority={priority} />
      <span className="cartao-corpo">
        <strong>{nome}</strong>
        {etiquetas.length > 0 && (
          <span className="cartao-etiquetas">
            {etiquetas.map((e) => (
              <span key={e}>{e}</span>
            ))}
          </span>
        )}
        <span className="cartao-texto">{texto}</span>
      </span>
    </Link>
  )
}
