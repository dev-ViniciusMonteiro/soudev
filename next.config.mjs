/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Microfone liberado só para o próprio site: o MEI na Mão entende comandos de voz.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
      {
        // Arquivos do jogo: o Google rastreia, lê o noindex e indexa só a página /jogos/<nome>.
        source: '/jogar/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
    ]
  },
}

export default nextConfig
