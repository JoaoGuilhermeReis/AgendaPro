import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import './MeusClientes.css';

export default function MeusClientes() {
  const navigate = useNavigate();
  const fazerLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (erro) {
      console.error("Erro ao sair:", erro);
    }
  };

  const [clientes, setClientes] = useState([]);
  
  // Substituímos "valor" por "desconto" com o padrão "0" (Sem desconto)
  const [formulario, setFormulario] = useState({
    nome: '', whatsapp: '', servico: '', desconto: '0', dataRealizada: '', tempoRetorno: '1m'
  });
  const [editandoId, setEditandoId] = useState(null);
  
  const [notificacao, setNotificacao] = useState({ ativa: false, titulo: '', subtitulo: '' });

  useEffect(() => {
    const buscarClientes = async () => {
      try {
        const usuarioAtual = auth.currentUser;
        if (!usuarioAtual) return; // Segurança extra

        // A MÁGICA AQUI: Filtra pela etiqueta do usuário!
        const q = query(collection(db, "clientes"), where("userId", "==", usuarioAtual.uid));
        const querySnapshot = await getDocs(q);
        
        const lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });
        setClientes(lista);
      } catch (erro) {
        console.error("Erro ao buscar clientes:", erro);
      }
    };
    buscarClientes();
  }, []);

  const lidarComMudanca = (e) => {
    const { name, value } = e.target;

    // Se o campo for o WhatsApp, aplicamos o bloqueio
    if (name === 'whatsapp') {
      let valorLimpo = value.replace(/\D/g, ''); // Arranca letras e símbolos
      
      // Trava em 10 números (sem o 9 na frente)
      if (valorLimpo.length > 10) {
        valorLimpo = valorLimpo.slice(0, 10);
      }
      
      setFormulario({ ...formulario, [name]: valorLimpo });
    } else {
      // Se for qualquer outro campo (nome, serviço, data), segue normal
      setFormulario({ ...formulario, [name]: value });
    }
  };

  const calcularDataRetorno = (dataInicial, tempo) => {
    const data = new Date(dataInicial);
    const valor = parseInt(tempo.slice(0, -1));
    const unidade = tempo.slice(-1);

    if (unidade === 'd') {
      data.setDate(data.getDate() + valor);
    } else if (unidade === 'm') {
      data.setMonth(data.getMonth() + valor);
    }
    
    return data.toISOString().split('T')[0];
  };

  const salvarCliente = async (e) => {
    e.preventDefault();

    if (!formulario.nome || !formulario.dataRealizada) {
      alert("Por favor, preencha pelo menos o nome e a data do serviço.");
      return;
    }

    const dataRetornoCalculada = calcularDataRetorno(formulario.dataRealizada, formulario.tempoRetorno);

    if (editandoId) {
      try {
        const clienteRef = doc(db, "clientes", editandoId);
        await updateDoc(clienteRef, {
          ...formulario,
          dataRetorno: dataRetornoCalculada
        });

        setClientes(clientes.map(cliente => 
          cliente.id === editandoId 
            ? { ...cliente, ...formulario, dataRetorno: dataRetornoCalculada }
            : cliente
        ));
        setEditandoId(null);
        
        setNotificacao({
          ativa: true,
          titulo: `Cliente atualizado!`,
          subtitulo: `As informações de ${formulario.nome} foram salvas.`
        });
        setTimeout(() => setNotificacao({ ativa: false, titulo: '', subtitulo: '' }), 5000);

      } catch (erro) {
        console.error("Erro ao atualizar:", erro);
        alert("Erro ao atualizar o cliente.");
      }
    } else {
      try {
        const novoClienteParaGuardar = {
          nome: formulario.nome,
          whatsapp: formulario.whatsapp,
          servico: formulario.servico,
          desconto: formulario.desconto,
          dataRealizada: formulario.dataRealizada,
          dataRetorno: dataRetornoCalculada,
          status: 'Aguardando',
          userId: auth.currentUser.uid // A ETIQUETA INVISÍVEL COLADA AQUI!
        };

        const docRef = await addDoc(collection(db, "clientes"), novoClienteParaGuardar);
        setClientes([...clientes, { id: docRef.id, ...novoClienteParaGuardar }]);
        
        const partesData = dataRetornoCalculada.split('-');
        const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

        setNotificacao({
          ativa: true,
          titulo: `${formulario.nome} adicionado com sucesso!`,
          subtitulo: `🤖 O robô enviará o lembrete automático no dia ${dataFormatada}.`
        });

        setTimeout(() => {
          setNotificacao({ ativa: false, titulo: '', subtitulo: '' });
        }, 5000);

      } catch (erro) {
        console.error("Erro ao guardar no Firebase: ", erro);
        alert("Ocorreu um erro ao guardar o cliente.");
      }
    }

    setFormulario({ nome: '', whatsapp: '', servico: '', desconto: '0', dataRealizada: '', tempoRetorno: '1m' });
  };

  const editarCliente = (cliente) => {
    setFormulario({
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      servico: cliente.servico,
      desconto: cliente.desconto || '0',
      dataRealizada: cliente.dataRealizada,
      tempoRetorno: '1m' 
    });
    setEditandoId(cliente.id);
  };

  const excluirCliente = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente do sistema?")) {
      try {
        await deleteDoc(doc(db, "clientes", id));
        setClientes(clientes.filter(cliente => cliente.id !== id));
      } catch (erro) {
        console.error("Erro ao excluir:", erro);
        alert("Erro ao excluir o cliente.");
      }
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          {/* Ícone de Relógio Minimalista */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="icone-relogio">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 12"></polyline>
          </svg>

          {/* O Texto da Logo */}
          <h2 className="logo-texto" style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>
            Agenda<span style={{ color: '#10b981' }}>Pro</span>
          </h2>
        </div>
        <nav className="menu-navegacao">
          <button className="menu-item" onClick={() => navigate('/dashboard')}>Visão Geral</button>
          <button className="menu-item ativo">Meus Clientes</button>
          <button className="menu-item" onClick={() => navigate('/calendario')}>Agendamento</button>
          <button className="menu-item" onClick={() => navigate('/mensagens')}>Mensagens WhatsApp</button>
          <button className="menu-item" onClick={fazerLogout} style={{ marginTop: 'auto', color: '#dc2626', fontWeight: 'bold' }}>
           Sair
          </button></nav>
      </aside>

      <main className="conteudo-principal">
        <header className="header-dashboard">
          
        </header>

        <div className="clientes-grid">
          <section className="card-formulario">
            <h3 className="titulo-sessao">{editandoId ? 'Editar Cliente' : 'Novo Serviço'}</h3>
            <form onSubmit={salvarCliente} className="form-clientes">
              <div className="campo">
                <label>Nome do Cliente</label>
                <input type="text" name="nome" value={formulario.nome} onChange={lidarComMudanca} placeholder="Ex: João Silva" required />
              </div>
              
              <div className="campo">
                <label>WhatsApp (DDD + Número s/ o 9)</label>
                <input 
                  type="text" 
                  name="whatsapp" 
                  value={formulario.whatsapp} 
                  onChange={lidarComMudanca} 
                  placeholder="Ex: 7912345678" 
                  required 
                />
                <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                  Apenas números ({formulario.whatsapp.length}/10)
                </small>
              </div>

              <div className="campo">
                <label>Serviço Realizado</label>
                <input type="text" name="servico" value={formulario.servico} onChange={lidarComMudanca} placeholder="Ex: Cabelo e Sobrancelha" required />
              </div>

              {/* NOVO CAMPO DE DESCONTO AQUI */}
              <div className="campo">
                <label>Gatilho: Desconto no Retorno</label>
                <select name="desconto" value={formulario.desconto} onChange={lidarComMudanca} style={{ borderColor: '#10b981', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 'bold' }}>
                  <option value="0">Sem desconto</option>
                  <option value="5">  5% de Desconto</option>
                  <option value="10"> 10% de Desconto</option>
                  <option value="15"> 15% de Desconto</option>
                  <option value="20"> 20% de Desconto</option>
                </select>
              </div>

              <div className="grid-2-col">
                <div className="campo">
                  <label>Data do Serviço</label>
                  <input type="date" name="dataRealizada" value={formulario.dataRealizada} onChange={lidarComMudanca} required />
                </div>
                <div className="campo">
                  <label>Retorno em</label>
                  <select name="tempoRetorno" value={formulario.tempoRetorno} onChange={lidarComMudanca}>
                    <option value="7d">7 Dias</option>
                    <option value="15d">15 Dias</option>
                    <option value="1m">1 Mês</option>
                    <option value="3m">3 Meses</option>
                    <option value="6m">6 Meses</option>
                    <option value="12m">1 Ano</option>
                  </select>
                </div>
              </div>

              <div className="acoes-botoes">
                <button type="submit" className={editandoId ? "btn-atualizar" : "btn-salvar"} style={{ flex: 1 }}>
                  {editandoId ? 'Salvar Alterações' : 'Adicionar Cliente'}
                </button>
                {editandoId && (
                  <button type="button" className="btn-cancelar" onClick={() => { setEditandoId(null); setFormulario({ nome: '', whatsapp: '', servico: '', desconto: '0', dataRealizada: '', tempoRetorno: '1m' }); }} style={{ flex: 1 }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="card-lista">
            <h3 className="titulo-sessao">Histórico de Clientes</h3>
            <div className="tabela-container">
              {clientes.length === 0 ? (
                <p className="mensagem-vazia">Nenhum cliente cadastrado ainda.</p>
              ) : (
                <table className="tabela-clientes">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Serviço</th>
                      <th>Data Retorno</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(cliente => {
                      const dataRetornoFormatada = cliente.dataRetorno.split('-').reverse().join('/');
                      // Mostramos uma etiqueta verde na tabela se houver desconto
                      const temDesconto = cliente.desconto && cliente.desconto !== '0';

                      return (
                        <tr key={cliente.id}>
                          <td>
                            <strong>{cliente.nome}</strong><br/>
                            <span className="texto-miudo">{cliente.whatsapp}</span>
                          </td>
                          <td>
                            {cliente.servico}
                            {temDesconto && (
                              <span style={{ display: 'block', fontSize: '12px', color: '#059669', fontWeight: 'bold', marginTop: '2px' }}>
                                🎁 {cliente.desconto}% OFF liberado
                              </span>
                            )}
                          </td>
                          <td>{dataRetornoFormatada}</td>
                          <td>
                            <span className={`badge ${cliente.status === 'Avisado no WhatsApp' ? 'badge-verde' : 'badge-amarelo'}`}>
                              {cliente.status === 'Avisado no WhatsApp' ? 'Avisado' : 'Aguardando'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
    <button type="button" onClick={() => editarCliente(cliente)} className="btn-icone editar" title="Editar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    </button>
    
    <button type="button" onClick={() => excluirCliente(cliente.id)} className="btn-icone excluir" title="Excluir">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
  </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {notificacao.ativa && (
          <div className="toast-notificacao">
            <div className="toast-icone">✅</div>
            <div className="toast-conteudo">
              <strong>{notificacao.titulo}</strong>
              <p>{notificacao.subtitulo}</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}