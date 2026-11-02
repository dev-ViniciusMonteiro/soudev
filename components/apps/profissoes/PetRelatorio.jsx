'use client'

import { useEffect, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Cartao, FotoDemo, FotoSessao, Moldura, Selo, Vazio, dataBr, hojeIso, somaDias, uid, useDemo, useRecarregarComLink } from '../demos/kit'

const HUMOR = [['😄', 'Animado'], ['😌', 'Tranquilo'], ['😴', 'Sonolento'], ['😟', 'Ansioso'], ['🤒', 'Indisposto']]
const COMEU = [['tudo', 'Comeu tudo'], ['metade', 'Metade'], ['pouco', 'Quase nada']]
const agoraHora = () => new Date().toTimeString().slice(0, 5)

function relVazio(petId, data = hojeIso()) {
  return { id: uid(), petId, data, refeicoes: [], passeios: [], remedios: [], agua: false, humor: '', obs: '' }
}

function demo() {
  const pets = [
    { id: 'p1', nome: 'Pipoca', especie: '🐶', raca: 'Vira-lata caramelo', tutor: 'Família Rocha', telefone: '11988887777', cuidados: '2 refeições (8h e 18h), 1 xícara de ração. Remédio de alergia às 8h.' },
    { id: 'p2', nome: 'Luna', especie: '🐱', raca: 'Siamesa', tutor: 'Carla Mendes', telefone: '11977776666', cuidados: 'Ração à vontade, sachê às 19h. Limpar a caixa de areia.' },
    { id: 'p3', nome: 'Thor', especie: '🐶', raca: 'Golden retriever', tutor: 'Pedro Alves', telefone: '', cuidados: 'Passeio longo de manhã. Não pode comer frango.' },
  ]
  const hoje = relVazio('p1')
  hoje.refeicoes = [{ hora: '08:05', oque: 'Ração (1 xícara)', comeu: 'tudo' }]
  hoje.passeios = [{ hora: '08:30', min: 35, xixi: true, coco: true }]
  hoje.remedios = [{ hora: '08:05', nome: 'Antialérgico', dado: true }]
  hoje.agua = true
  hoje.humor = '😄'
  hoje.obs = 'Brincou bastante com a bolinha no quintal e dormiu no sofá depois do passeio.'
  const ontem = { ...relVazio('p1', somaDias(hojeIso(), -1)), refeicoes: [{ hora: '08:00', oque: 'Ração', comeu: 'tudo' }, { hora: '18:10', oque: 'Ração', comeu: 'metade' }], passeios: [{ hora: '08:20', min: 30, xixi: true, coco: true }, { hora: '17:30', min: 20, xixi: true, coco: false }], agua: true, humor: '😌', obs: 'Um pouco cansado à tarde, normal.' }
  const luna = { ...relVazio('p2', somaDias(hojeIso(), -1)), refeicoes: [{ hora: '19:00', oque: 'Sachê de peixe', comeu: 'tudo' }], agua: true, humor: '😌', obs: 'Caixa de areia limpa. Ficou na janela tomando sol.' }
  return { cuidador: 'Bia Pet Sitter', pets, relatorios: [hoje, ontem, luna] }
}

function Cartaozinho({ rel, pet, cuidador }) {
  const hum = HUMOR.find(([e]) => e === rel.humor)
  return (
    <div className="pr-rel">
      <div className="pr-rel-cab pr-pet-cab">
        <span className="pr-pet-avatar">{pet.especie}</span>
        <div>
          <h2>Dia de {pet.nome}</h2>
          <p>{dataBr(rel.data)} · cuidado por {cuidador}</p>
        </div>
        {hum && <span className="pr-humor" title={hum[1]}>{hum[0]} <small>{hum[1]}</small></span>}
      </div>
      <div className="dm-galeria">
        <FotoDemo tema="achado" semente={pet.nome.length} emoji={pet.especie} rotulo={`${pet.nome} hoje`} />
        <FotoDemo tema="evento" semente={pet.nome.length + 3} emoji="🎾" rotulo="Hora da brincadeira" />
      </div>
      <Cartao titulo="🍽️ Alimentação">
        {rel.refeicoes.length ? rel.refeicoes.map((r, i) => <span key={i}><b>{r.hora}</b> · {r.oque} · {COMEU.find(([k]) => k === r.comeu)?.[1]}</span>) : <span className="dm-mudo">Nenhuma refeição registrada.</span>}
        <span>💧 Água: {rel.agua ? 'pote cheio ✓' : 'não registrado'}</span>
      </Cartao>
      {rel.passeios.length > 0 && (
        <Cartao titulo="🦮 Passeios">
          {rel.passeios.map((p, i) => <span key={i}><b>{p.hora}</b> · {p.min} min {p.xixi ? '· xixi ✓' : ''} {p.coco ? '· cocô ✓' : ''}</span>)}
        </Cartao>
      )}
      {rel.remedios.length > 0 && (
        <Cartao titulo="💊 Remédios">
          {rel.remedios.map((m, i) => <span key={i}><b>{m.hora}</b> · {m.nome} {m.dado ? '✓ dado' : '✗ não dado'}</span>)}
        </Cartao>
      )}
      {rel.obs && <Cartao titulo="📝 Recado"><p style={{ margin: 0 }}>{rel.obs}</p></Cartao>}
      <p className="dm-mudo" style={{ fontSize: '.78rem' }}>As fotos são ilustrações de demonstração.</p>
    </div>
  )
}

export default function PetRelatorio() {
  useRecarregarComLink()
  const [dados, setDados, restaurar] = useDemo('pf-pet-v1', demo)
  const [secao, setSecao] = useState('hoje')
  const [petId, setPetId] = useState('p1')
  const [recebido, setRecebido] = useState(null)
  const [ver, setVer] = useState(null)
  const [link, setLink] = useState('')
  const [fotos, setFotos] = useState([])

  useEffect(() => {
    const d = lerDoLink()
    if (d?.rel) setRecebido(d)
  }, [])

  if (recebido)
    return (
      <Moldura nome="Pet Relatório" icone="🐾" cor="#ea580c" demo={false} secoes={[['r', '🐾', 'Relatório']]} secao="r" onSecao={() => {}} aviso={<>Relatório enviado por {recebido.cuidador}. <button type="button" className="dm-link" onClick={() => { setRecebido(null); limparHash() }}>Usar o app</button></>}>
        <Cartaozinho rel={recebido.rel} pet={recebido.pet} cuidador={recebido.cuidador} />
      </Moldura>
    )
  if (!dados) return null

  const pet = dados.pets.find((p) => p.id === petId) || dados.pets[0]
  const rel = dados.relatorios.find((r) => r.petId === pet?.id && r.data === hojeIso())
  const mudar = (fn) =>
    setDados((d) => {
      const atual = d.relatorios.find((r) => r.petId === pet.id && r.data === hojeIso()) || relVazio(pet.id)
      const novo = fn(structuredClone(atual))
      return { ...d, relatorios: [novo, ...d.relatorios.filter((r) => r.id !== atual.id)] }
    })
  const enviar = (r) => {
    const p = dados.pets.find((x) => x.id === r.petId)
    const l = linkCom({ cuidador: dados.cuidador, pet: p, rel: r })
    setLink(l)
    const resumo = `🐾 Dia de ${p.nome} (${dataBr(r.data)})\n${r.humor ? `Humor: ${r.humor}\n` : ''}${r.refeicoes.map((x) => `🍽️ ${x.hora} ${x.oque} (${COMEU.find(([k]) => k === x.comeu)?.[1]})`).join('\n')}${r.passeios.length ? `\n${r.passeios.map((x) => `🦮 ${x.hora} passeio de ${x.min} min`).join('\n')}` : ''}${r.obs ? `\n📝 ${r.obs}` : ''}\n\nRelatório completo: ${l}`
    window.open(`https://wa.me/${p.telefone ? `55${p.telefone}` : ''}?text=${encodeURIComponent(resumo)}`, '_blank', 'noopener')
  }

  return (
    <Moldura nome="Pet Relatório" icone="🐾" cor="#ea580c" demo={false} aviso="Os registros ficam neste aparelho. O tutor recebe o relatório por link ou WhatsApp, sem cadastro." secao={secao} onSecao={setSecao} onRestaurar={restaurar} secoes={[['hoje', '📝', 'Hoje'], ['pets', '🐾', 'Pets'], ['historico', '🗓️', 'Histórico']]}>
      {secao === 'hoje' && pet && (
        <>
          <div className="dm-chips">
            {dados.pets.map((p) => <button key={p.id} type="button" className="dm-chip" aria-pressed={p.id === pet.id} onClick={() => setPetId(p.id)}>{p.especie} {p.nome}</button>)}
          </div>
          <div className="dm-titulo">
            <h2>{pet.especie} {pet.nome}</h2>
            <Selo tom="cor">hoje</Selo>
            <p>Tutor: {pet.tutor} · {pet.cuidados}</p>
          </div>
          <div className="dm-duas">
            <div className="dm-grade">
              <Cartao titulo="🍽️ Refeições" acao={<button type="button" className="dm-btn dm-btn-p" onClick={() => mudar((r) => { r.refeicoes.push({ hora: agoraHora(), oque: pet.especie === '🐱' ? 'Sachê' : 'Ração', comeu: 'tudo' }); return r })}>＋ Agora</button>}>
                {(rel?.refeicoes || []).map((x, i) => (
                  <div key={i} className="pr-linha">
                    <input type="time" value={x.hora} onChange={(e) => mudar((r) => { r.refeicoes[i].hora = e.target.value; return r })} />
                    <input value={x.oque} onChange={(e) => mudar((r) => { r.refeicoes[i].oque = e.target.value; return r })} />
                    <select value={x.comeu} onChange={(e) => mudar((r) => { r.refeicoes[i].comeu = e.target.value; return r })}>{COMEU.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
                    <button type="button" className="dm-x" onClick={() => mudar((r) => { r.refeicoes.splice(i, 1); return r })} aria-label="Remover">✕</button>
                  </div>
                ))}
                <label className="dm-check"><input type="checkbox" checked={!!rel?.agua} onChange={(e) => mudar((r) => ({ ...r, agua: e.target.checked }))} /> 💧 Troquei a água</label>
              </Cartao>
              <Cartao titulo="🦮 Passeios" acao={<button type="button" className="dm-btn dm-btn-p" onClick={() => mudar((r) => { r.passeios.push({ hora: agoraHora(), min: 20, xixi: true, coco: false }); return r })}>＋ Agora</button>}>
                {(rel?.passeios || []).map((x, i) => (
                  <div key={i} className="pr-linha">
                    <input type="time" value={x.hora} onChange={(e) => mudar((r) => { r.passeios[i].hora = e.target.value; return r })} />
                    <input type="number" min={1} value={x.min} onChange={(e) => mudar((r) => { r.passeios[i].min = Number(e.target.value) || 0; return r })} aria-label="Minutos" />
                    <label className="dm-check"><input type="checkbox" checked={x.xixi} onChange={(e) => mudar((r) => { r.passeios[i].xixi = e.target.checked; return r })} /> xixi</label>
                    <label className="dm-check"><input type="checkbox" checked={x.coco} onChange={(e) => mudar((r) => { r.passeios[i].coco = e.target.checked; return r })} /> cocô</label>
                    <button type="button" className="dm-x" onClick={() => mudar((r) => { r.passeios.splice(i, 1); return r })} aria-label="Remover">✕</button>
                  </div>
                ))}
                {!rel?.passeios?.length && <span className="dm-mudo">Nenhum passeio ainda.</span>}
              </Cartao>
              <Cartao titulo="💊 Remédios" acao={<button type="button" className="dm-btn dm-btn-p" onClick={() => { const n = prompt('Qual remédio?'); if (n) mudar((r) => { r.remedios.push({ hora: agoraHora(), nome: n, dado: true }); return r }) }}>＋ Dei</button>}>
                {(rel?.remedios || []).map((x, i) => <span key={i}><b>{x.hora}</b> · {x.nome} ✓</span>)}
                {!rel?.remedios?.length && <span className="dm-mudo">Nenhum remédio hoje.</span>}
              </Cartao>
            </div>
            <div className="dm-grade">
              <Cartao titulo="Como foi o dia">
                <div className="dm-chips">
                  {HUMOR.map(([e, n]) => <button key={e} type="button" className="dm-chip" aria-pressed={rel?.humor === e} onClick={() => mudar((r) => ({ ...r, humor: e }))}>{e} {n}</button>)}
                </div>
                <textarea rows={3} value={rel?.obs || ''} onChange={(e) => mudar((r) => ({ ...r, obs: e.target.value }))} placeholder="Recado para o tutor: brincadeiras, comportamento, algo diferente…" />
              </Cartao>
              <Cartao titulo="📸 Fotos">
                <div className="dm-galeria">
                  {fotos.map((u) => <div key={u} className="dm-foto"><img src={u} alt="Foto (não salva)" /><span className="dm-foto-rot">agora · não salva</span></div>)}
                  <FotoDemo tema="achado" semente={pet.nome.length} emoji={pet.especie} rotulo="Exemplo" />
                </div>
                <FotoSessao rotulo="Tirar foto" onFoto={(u) => setFotos((l) => [...l, u])} />
                <small className="dm-mudo">Demonstração: as fotos não são salvas nem enviadas.</small>
              </Cartao>
              <button type="button" className="dm-btn" style={{ background: '#16a34a' }} disabled={!rel} onClick={() => enviar(rel)}>📤 Enviar relatório ao tutor</button>
              {link && <small className="dm-mudo">Link gerado e WhatsApp aberto. <button type="button" className="dm-link" onClick={() => navigator.clipboard?.writeText(link)}>Copiar link</button></small>}
            </div>
          </div>
        </>
      )}

      {secao === 'pets' && (
        <Cartao titulo="Pets que você cuida" acao={<button type="button" className="dm-btn" onClick={() => { const nome = prompt('Nome do pet:'); if (nome) setDados((d) => ({ ...d, pets: [...d.pets, { id: uid(), nome, especie: '🐶', raca: '', tutor: '', telefone: '', cuidados: '' }] })) }}>＋ Pet</button>}>
          {dados.pets.map((p) => (
            <div key={p.id} className="pr-pet-edit">
              <select value={p.especie} onChange={(e) => setDados((d) => ({ ...d, pets: d.pets.map((x) => (x.id === p.id ? { ...x, especie: e.target.value } : x)) }))} aria-label="Espécie" style={{ width: 70 }}>
                {['🐶', '🐱', '🐰', '🐦', '🐢'].map((e) => <option key={e}>{e}</option>)}
              </select>
              {['nome', 'tutor', 'telefone', 'cuidados'].map((k) => (
                <input key={k} value={p[k]} placeholder={{ nome: 'Nome', tutor: 'Tutor', telefone: 'WhatsApp do tutor', cuidados: 'Cuidados (ração, remédio, manias)' }[k]} onChange={(e) => setDados((d) => ({ ...d, pets: d.pets.map((x) => (x.id === p.id ? { ...x, [k]: k === 'telefone' ? e.target.value.replace(/\D/g, '') : e.target.value } : x)) }))} />
              ))}
            </div>
          ))}
          <label className="dm-campo"><span>Seu nome no relatório</span><input value={dados.cuidador} onChange={(e) => setDados((d) => ({ ...d, cuidador: e.target.value }))} /></label>
        </Cartao>
      )}

      {secao === 'historico' && (
        <Cartao titulo="Relatórios anteriores">
          <ul className="dm-lista">
            {[...dados.relatorios].sort((a, b) => b.data.localeCompare(a.data)).map((r) => {
              const p = dados.pets.find((x) => x.id === r.petId)
              if (!p) return null
              return (
                <li key={r.id} className="dm-item" style={{ cursor: 'default' }}>
                  <span className="dm-item-ic">{p.especie}</span>
                  <span className="dm-item-txt"><b>{p.nome} · {dataBr(r.data)}</b><small>{r.humor} {r.refeicoes.length} refeição(ões) · {r.passeios.length} passeio(s)</small></span>
                  <button type="button" className="dm-btn dm-btn-sec dm-btn-p" onClick={() => setVer(r)}>Ver</button>
                  <button type="button" className="dm-btn dm-btn-p" style={{ background: '#16a34a' }} onClick={() => enviar(r)}>Enviar</button>
                </li>
              )
            })}
          </ul>
          {!dados.relatorios.length && <Vazio>Nenhum relatório ainda.</Vazio>}
          {ver && (
            <div className="dm-cartao">
              <button type="button" className="dm-link" onClick={() => setVer(null)}>Fechar</button>
              <Cartaozinho rel={ver} pet={dados.pets.find((x) => x.id === ver.petId)} cuidador={dados.cuidador} />
            </div>
          )}
        </Cartao>
      )}
    </Moldura>
  )
}
