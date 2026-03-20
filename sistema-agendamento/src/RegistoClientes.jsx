import { useState } from 'react';
import './RegistroClientes.css';

export default function RegistoClientes({ utilizadorAtual }) {
  // utilizadorAtual simula os dados de quem fez login: { id: 'user123', role: 'profissional' }

  const [listaServicos, setListaServicos] = useState([
    // Exemplo de um dado já existente na base de dados
    {
      id: 1,
      nomeCliente: 'João Silva',
      contactoWhatsApp: '912345678',
      descricaoServico: 'Instalação Ar Condicionado 12000 BTUs',
      dataServico: '2026-02-20',
      dataRetorno: '2026-08-20',
      idPublicador: 'user123' // ID de quem criou este registo
    }
  ]);

  const [novoRegisto, setNovoRegisto] = useState({
    nomeCliente: '',
    contactoWhatsApp: '',
    descricaoServico: '',
    dataServico: '',
    mesesParaRetorno: '6'
  });

  const lidarComMudanca = (e) => {
    setNovoRegisto({ ...novoRegisto, [e.target.name]: e.target.value });
  };

  const guardarRegisto = (e) => {
    e.preventDefault();
    
    // Lógica simples para calcular a data de retorno baseada nos meses escolhidos
    const dataInicial = new Date(novoRegisto.dataServico);
    const dataFutura = new Date(dataInicial.setMonth(dataInicial.getMonth() + parseInt(novoRegisto.mesesParaRetorno)));
    const dataRetornoFormatada = dataFutura.toISOString().split('T')[0];

    const servicoParaGuardar = {
      id: Date.now(),
      ...novoRegisto,
      dataRetorno: dataRetornoFormatada,
      idPublicador: utilizadorAtual.id // Associa o registo a quem o está a criar
    };

    setListaServicos([...listaServicos, servicoParaGuardar]);
    
    // Limpar o formulário após guardar
    setNovoRegisto({
      nomeCliente: '', contactoWhatsApp: '', descricaoServico: '', dataServico: '', mesesParaRetorno: '6'
    });
  };

  const apagarRegisto = (id) => {
    setListaServicos(listaServicos.filter(servico => servico.id !== id));
  };

  return (
    <div className="registo-container">
      <div className="formulario-seccao">
        <h2>Novo Registo de Serviço</h2>
        <form onSubmit={guardarRegisto} className="form-grid">
          <div className="input-grupo">
            <label>Nome do Cliente</label>
            <input type="text" name="nomeCliente" value={novoRegisto.nomeCliente} onChange={lidarComMudanca} required />
          </div>

          <div className="input-grupo">
            <label>Contacto (WhatsApp)</label>
            <input type="tel" name="contactoWhatsApp" value={novoRegisto.contactoWhatsApp} onChange={lidarComMudanca} placeholder="Ex: 912345678" required />
          </div>

          <div className="input-grupo">
            <label>Descrição do Serviço</label>
            <input type="text" name="descricaoServico" value={novoRegisto.descricaoServico} onChange={lidarComMudanca} placeholder="Ex: Tatuagem antebraço / Manutenção Ar" required />
          </div>

          <div className="input-grupo">
            <label>Data do Serviço</label>
            <input type="date" name="dataServico" value={novoRegisto.dataServico} onChange={lidarComMudanca} required />
          </div>

          <div className="input-grupo">
            <label>Lembrar o cliente daqui a (meses):</label>
            <select name="mesesParaRetorno" value={novoRegisto.mesesParaRetorno} onChange={lidarComMudanca}>
              <option value="1">1 Mês (Ex: Retoque de Tatuagem)</option>
              <option value="3">3 Meses (Ex: Manutenção Celular)</option>
              <option value="6">6 Meses (Ex: Limpeza de Ar Condicionado)</option>
              <option value="12">1 Ano (Ex: Revisão Geral)</option>
            </select>
          </div>

          <button type="submit" className="btn-guardar">Guardar Registo</button>
        </form>
      </div>

      <div className="lista-seccao">
        <h2>Últimos Serviços Registados</h2>
        <div className="tabela-responsiva">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Data Realizada</th>
                <th>Data de Retorno</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaServicos.map((servico) => (
                <tr key={servico.id}>
                  <td>{servico.nomeCliente} <br/><small>{servico.contactoWhatsApp}</small></td>
                  <td>{servico.descricaoServico}</td>
                  <td>{servico.dataServico}</td>
                  <td className="destaque-retorno">{servico.dataRetorno}</td>
                  <td>
                    {/* Validação rigorosa de permissões para os botões de ação */}
                    {(utilizadorAtual.id === servico.idPublicador || utilizadorAtual.role === 'admin') ? (
                      <div className="acoes-botoes">
                        <button className="btn-editar">Editar</button>
                        <button className="btn-apagar" onClick={() => apagarRegisto(servico.id)}>Excluir</button>
                      </div>
                    ) : (
                      <span className="sem-permissao">Sem permissão</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}