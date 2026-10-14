import Link from 'next/link'

export default function ToolCard({ tool }) {
  return (
    <Link href={`/ferramentas/${tool.slug}`} className="tool-card">
      <span className="tool-badge" aria-hidden="true">{tool.badge}</span>
      <span className="tool-card-body">
        <strong>{tool.name}</strong>
        <span>{tool.short}</span>
      </span>
      <span className="tool-card-arrow" aria-hidden="true">→</span>
    </Link>
  )
}
