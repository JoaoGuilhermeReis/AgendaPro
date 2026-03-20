/* eslint-disable no-undef */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

export default function Calendario() {
  const navigate = useNavigate();
  const fazerLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (erro) {
      console.error("Erro ao sair:", erro);
    }
  };
  const [agendamentos, setAgendamentos] = useState([]);
  
  const [formulario, setFormulario] = useState({
    nome: '', whatsapp: '', servico: '', dataAgendada: '', horario: '', valor:''
  });
  
  // NOVO ESTADO: Para sabermos se estamos a criar ou a editar
  const [editandoId, setEditandoId] = useState(null);

  const [notificacao, setNotificacao] = useState({ ativa: false, titulo: '', subtitulo: '' });

  // 1. CARREGAR AGENDAMENTOS DO FIREBASE
  useEffect(() => {
    const buscarAgendamentos = async () => {
      try {
        const usuarioAtual = auth.currentUser;
        if (!usuarioAtual) return;

        // Traz apenas os agendamentos DESTE usuário, ordenados por data
        const q = query(
          collection(db, "agendamentos"), 
          where("userId", "==", usuarioAtual.uid),
          orderBy("dataAgendada", "asc")
        );
        
        const querySnapshot = await getDocs(q);
        const lista = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });
        setAgendamentos(lista);
      } catch (erro) {
        console.error("Erro ao buscar agendamentos:", erro);
      }
    };
    buscarAgendamentos();
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

  // 2. SALVAR NOVO OU ATUALIZAR EXISTENTE
  const salvarAgendamento = async (e) => {
    e.preventDefault();

    if (editandoId) {
      // MODO EDIÇÃO
      try {
        const agendamentoRef = doc(db, "agendamentos", editandoId);
        await updateDoc(agendamentoRef, {
         nome: formulario.nome,
          whatsapp: formulario.whatsapp,
          servico: formulario.servico,
          dataAgendada: formulario.dataAgendada,
          horario: formulario.horario,
          valor: Number(formulario.valor), // <-- ADICIONE ESTA LINHA AQUI
          status: 'Confirmado',
          userId: auth.currentUser.uid });

        // Atualiza a lista na tela e reordena
        const listaAtualizada = agendamentos.map(ag => 
          ag.id === editandoId ? { ...ag, ...formulario, status: 'Confirmado' } : ag
        );
        listaAtualizada.sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada));
        setAgendamentos(listaAtualizada);
        
        setEditandoId(null);
        
        setNotificacao({
          ativa: true,
          titulo: `Agendamento Atualizado!`,
          subtitulo: `As alterações de ${formulario.nome} foram salvas.`
        });
        setTimeout(() => setNotificacao({ ativa: false, titulo: '', subtitulo: '' }), 5000);

      } catch (erro) {
        console.error("Erro ao atualizar:", erro);
        alert("Erro ao atualizar o agendamento.");
      }
    } else {
      // MODO CRIAÇÃO (Novo agendamento)
      try {
        const novoAgendamento = {
          nome: formulario.nome,
          whatsapp: formulario.whatsapp,
          servico: formulario.servico,
          dataAgendada: formulario.dataAgendada,
          horario: formulario.horario,
          status: 'Confirmado',
          userId: auth.currentUser.uid // A ETIQUETA INVISÍVEL AQUI TAMBÉM!
        };

        const docRef = await addDoc(collection(db, "agendamentos"), novoAgendamento);
        
        const novaLista = [...agendamentos, { id: docRef.id, ...novoAgendamento }];
        novaLista.sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada));
        setAgendamentos(novaLista);
        
        const dataFormatada = formulario.dataAgendada.split('-').reverse().join('/');
        setNotificacao({
          ativa: true,
          titulo: `Agendamento Salvo!`,
          subtitulo: `🤖 O robô lembrará ${formulario.nome} no dia ${dataFormatada}.`
        });
        setTimeout(() => setNotificacao({ ativa: false, titulo: '', subtitulo: '' }), 5000);

      } catch (erro) {
        console.error("Erro ao guardar agendamento: ", erro);
        alert("Ocorreu um erro ao salvar.");
      }
    }

    // Limpa formulário
    setFormulario({ nome: '', whatsapp: '', servico: '', dataAgendada: '', horario: '' });
  };

  // 3. PREENCHER FORMULÁRIO PARA EDIÇÃO
  const editarAgendamento = (agendamento) => {
    setFormulario({
      nome: agendamento.nome,
      whatsapp: agendamento.whatsapp,
      servico: agendamento.servico,
      dataAgendada: agendamento.dataAgendada,
      horario: agendamento.horario,
      valor: agendamento.valor
    });
    setEditandoId(agendamento.id);
    
    // Rola a página para o topo suavemente para a pessoa ver o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. EXCLUIR AGENDAMENTO
  const excluirAgendamento = async (id) => {
    const confirmar = window.confirm("Tem certeza que deseja excluir este agendamento?");
    if (!confirmar) return; // Se o usuário cancelar, a função para aqui

    try {
      // Aponta para o documento exato no banco de dados
      const docRef = doc(db, "agendamentos", id);
      
      // Deleta do Firebase
      await deleteDoc(docRef);
      
      // Atualiza a lista na tela imediatamente (remove o item deletado)
      setAgendamentos(agendamentos.filter(ag => ag.id !== id));
      
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir o agendamento.");
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
          <button className="menu-item" onClick={() => navigate('/clientes')}>Meus Clientes</button>
          <button className="menu-item ativo">Agendamento</button>
          <button className="menu-item" onClick={() => navigate('/mensagens')}>Mensagens WhatsApp</button>
          <button className="menu-item" onClick={fazerLogout} style={{ marginTop: 'auto', color: '#dc2626', fontWeight: 'bold' }}>
             Sair
          </button></nav>
      </aside>

      <main className="conteudo-principal">
        
        {/* TÍTULO DE FORA DO CARTÃO */}
        <div className="header-pagina">
          <h1>Agenda de Serviços</h1>
          <p>Controle os seus horários e a previsão de faturamento.</p>
        </div>

        {/* O CARTÃO BRANCO ARREDONDADO */}
        <div className="form-card">
          <h2>Novo Agendamento</h2>

          <form onSubmit={salvarAgendamento}>
            <div className="campo">
              <label>Nome do Cliente</label>
              <input type="text" name="nome" value={formulario.nome} onChange={lidarComMudanca} placeholder="Ex: Maria Oliveira" required />
            </div>
            
            <div className="campo">
              <label>WhatsApp (DDD + Número só o 9)</label>
              <input type="text" name="whatsapp" value={formulario.whatsapp} onChange={lidarComMudanca} placeholder="(99) 912345678" required />
              <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>Apenas números</small>
            </div>

            {/* BLOCO 1: Serviço e Valor do Faturamento */}
            <div className="grid-2-col">
              <div className="campo">
                <label>Serviço Agendado</label>
                <input type="text" name="servico" value={formulario.servico} onChange={lidarComMudanca} placeholder="Ex: Corte e Escova" required />
              </div>
              <div className="campo">
                <label>Valor (R$)</label>
                <input type="number" name="valor" value={formulario.valor} onChange={lidarComMudanca} placeholder="Ex: 50.00" step="0.01" required />
              </div>
            </div>

            {/* BLOCO 2: A Data e o Horário (Inteligência do Robô) */}
            <div className="grid-2-col">
              <div className="campo">
                <label>Data do Agendamento</label>
                <input type="date" name="dataAgendada" value={formulario.dataAgendada} onChange={lidarComMudanca} required />
              </div>
              <div className="campo">
                <label>Horário</label>
                <input type="time" name="horario" value={formulario.horario} onChange={lidarComMudanca} required />
              </div>
            </div>

            {/* O Botão Gigante Verde */}
            <button type="submit" className="btn-adicionar-full">
              {editandoId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
            </button>

            {editandoId && (
              <button type="button" onClick={() => { setEditandoId(null); setFormulario({ nome: '', whatsapp: '', servico: '', dataAgendada: '', horario: '', valor: '' }); }} 
              style={{ width: '100%', marginTop: '10px', padding: '16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>
                Cancelar Edição
              </button>
            )}
          </form>
        

          <section className="card-lista">
            <h3 className="titulo-sessao">Próximos Agendamentos</h3>
            <div className="tabela-container">
              {agendamentos.length === 0 ? (
                <p className="mensagem-vazia">Nenhum horário marcado ainda. A agenda está livre!</p>
              ) : (
                <div className="lista-agendamentos">
                  {agendamentos.map(agendamento => {
                    const dataFormatada = agendamento.dataAgendada.split('-').reverse().join('/');
                    const hoje = new Date().toISOString().split('T')[0];
                    const eHoje = agendamento.dataAgendada === hoje;

                    return (
                      <div key={agendamento.id} className="card-agendamento">
                        <div className="agendamento-data-hora">
                          <span className="ag-data">{eHoje ? 'HOJE' : dataFormatada}</span>
                          <span className="ag-hora">{agendamento.horario}</span>
                        </div>
                        <div className="agendamento-info">
                          <strong>{agendamento.nome}</strong>
                          <span>{agendamento.servico}</span>
                        </div>
                        
                        {/* NOVO: Ações com Botão de Editar e Excluir lado a lado */}
                       <div style={{ display: 'flex', gap: '8px' }}>
    <button type="button" onClick={() => editarAgendamento(agendamento)} className="btn-icone editar" title="Editar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    </button>
    
    <button type="button" onClick={() => excluirAgendamento(agendamento.id)} className="btn-icone excluir" title="Excluir">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
  </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {notificacao.ativa && (
          <div className="toast-notificacao">
            <div className="toast-icone">📅</div>
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