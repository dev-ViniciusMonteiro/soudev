'use client'

// Carteira de vacinas e vermífugos: próximas doses, atrasadas e lembrete pelo WhatsApp.

import { useState } from 'react'
import { Chips, Formulario, Modal, Selo, Topo, Vazio, useConfig, useMapa, useSistema, useTabela } from '../base'
import { addDias, dataBR, diasEntre, hojeISO, linkWhats } from '@/lib/sistemas/regras'

/** Só a dose mais recente de cada vacina por pet conta para o lembrete. */
export function dosesAtuais(vacinas) {
  const ultimas = new Map()
  for (const v of vacinas) {
    const k = `${v.pet_id}|${v.vacina}`
    if (!ultimas.has(k) || String(v.aplicada_em) > String(ultimas.get(k).aplicada_em)) ultimas.set(k, v)
  }
  return [...ultimas.values()].filter((v) => v.proxima_em)
}

const intervalo = (vacina) => (/verm/i.test(vacina) ? 90 : /pulga|carrap/i.test(vacina) ? 30 : 365)

export default function Vacinas() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const vacinas = useTabela('vacinas')
  const pets = useMapa('pets')
  const clientes = useMapa('clientes')
  const [filtro, setFiltro] = useState('proximas')
  const [nova, setNova] = useState(false)
  const hoje = hojeISO()
  const limite = addDias(hoje, 30)

  const atuais = dosesAtuais(vacinas)
  const atrasadas = atuais.filter((v) => v.proxima_em < hoje)
  const proximas = atuais.filter((v) => v.proxima_em >= hoje && v.proxima_em <= limite)
  const lista = (filtro === 'atrasadas' ? atrasadas : filtro === 'proximas' ? proximas : [...vacinas]).sort((a, b) => String(a.proxima_em).localeCompare(String(b.proxima_em)))

  const aplicar = (v) => {
    banco.salvar('vacinas', { pet_id: v.pet_id, vacina: v.vacina, aplicada_em: hoje, proxima_em: addDias(hoje, intervalo(v.vacina)) })
  }

  return (
    <div className="sx-modulo">
      <Topo titulo="Vacinas e retornos" sub={`${atrasadas.length} atrasadas · ${proximas.length} nos próximos 30 dias`}>
        <button type="button" className="btn btn-primary" onClick={() => setNova(true)}>
          Registrar vacina
        </button>
      </Topo>
      <Chips
        valor={filtro}
        onChange={setFiltro}
        opcoes={[
          ['proximas', 'Próximos 30 dias', proximas.length],
          ['atrasadas', 'Atrasadas', atrasadas.length],
          ['todas', 'Histórico', vacinas.length],
        ]}
      />
      {lista.length === 0 ? (
        <Vazio>Nada por aqui.</Vazio>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Tutor</th>
                <th>Vacina</th>
                <th>Aplicada</th>
                <th>Próxima</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const pet = pets.get(v.pet_id)
                const tutor = clientes.get(pet?.cliente_id)
                const dias = v.proxima_em ? diasEntre(hoje, v.proxima_em) : null
                return (
                  <tr key={v.id}>
                    <td>
                      {pet?.nome} <small className="muted">{pet?.raca}</small>
                    </td>
                    <td>{tutor?.nome}</td>
                    <td>{v.vacina}</td>
                    <td>{dataBR(v.aplicada_em)}</td>
                    <td>{v.proxima_em && <Selo tom={dias < 0 ? 'erro' : dias <= 7 ? 'aviso' : 'neutro'}>{dataBR(v.proxima_em)}{dias < 0 ? ` (${-dias}d atrasada)` : dias === 0 ? ' (hoje)' : ` (em ${dias}d)`}</Selo>}</td>
                    <td className="sx-acoes-linha">
                      {filtro !== 'todas' && (
                        <button type="button" className="btn btn-ghost" onClick={() => aplicar(v)}>
                          Aplicada hoje
                        </button>
                      )}
                      {tutor?.telefone && filtro !== 'todas' && (
                        <a
                          className="btn btn-ghost"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={linkWhats(tutor.telefone, `Olá, ${tutor.nome.split(' ')[0]}! ${dias < 0 ? 'Passou a data' : 'Está chegando a data'} da ${v.vacina} do(a) ${pet?.nome} (${dataBR(v.proxima_em)}). Quer agendar aqui na ${cfg.empresa_nome || 'loja'}? 🐾`)}
                        >
                          Lembrar tutor
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {nova && (
        <Modal titulo="Registrar vacina ou vermífugo" onFechar={() => setNova(false)}>
          <Formulario tabela="vacinas" padrao={{ aplicada_em: hoje, proxima_em: addDias(hoje, 365) }} onSalvo={() => setNova(false)} onCancelar={() => setNova(false)} />
        </Modal>
      )}
    </div>
  )
}
