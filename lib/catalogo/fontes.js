import { Fredoka, Playfair_Display, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google'

// As quatro fontes que o lojista pode escolher no catálogo (só carregam nas páginas do catálogo).
const moderna = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--ctf-moderna', display: 'swap' })
const elegante = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--ctf-elegante', display: 'swap', preload: false })
const divertida = Fredoka({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--ctf-divertida', display: 'swap', preload: false })
const tech = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--ctf-tech', display: 'swap', preload: false })

export const classeFontes = [moderna.variable, elegante.variable, divertida.variable, tech.variable].join(' ')
