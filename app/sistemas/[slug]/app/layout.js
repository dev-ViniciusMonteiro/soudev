// Por dentro cada sistema continua com o estilo próprio (paleta e fonte de antes): veja .tema-classico em app/tema.css.
export default function TemaClassicoLayout({ children }) {
  return <div className="tema-classico">{children}</div>
}
