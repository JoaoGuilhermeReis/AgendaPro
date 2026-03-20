/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import './Mensagens.css';

export default function Mensagens() {
  const navigate = useNavigate();
  const fazerLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (erro) {
      console.error("Erro ao sair:", erro);
    }
  };

  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState('lembrete'); // 'lembrete' ou 'retorno'

  // Listas de Clientes
  const [clientesRetorno, setClientesRetorno] = useState([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  
  // Textos Padrões
  const padraoLembrete = "Olá [Nome], tudo bem? Passando para confirmar o nosso horário de [Serviço] hoje às [Horario]. Qualquer imprevisto, avise-nos!";
  const padraoRetorno = "Olá [Nome], tudo bem? O seu último serviço foi em [Data]. O [Serviço] está precisando de manutenção? Liberei um desconto de [Desconto]% para você! Vamos agendar?";
  
  const [templateLembrete, setTemplateLembrete] = useState("A carregar...");
  const [templateRetorno, setTemplateRetorno] = useState("A carregar...");

  // Mensagens Prontas (Templates Rápidos)
  const templatesProntos = {
    lembrete: [
      { titulo: "Padrão", texto: padraoLembrete },
      { titulo: "Curto & Direto", texto: "Oi [Nome]! Lembrete do seu agendamento de [Serviço] hoje às [Horario]. Te espero aqui! ⏳" },
      { titulo: "Animado", texto: "Bom dia [Nome]! 🌟 O grande dia chegou! Nosso horário de [Serviço] está marcadíssimo para as [Horario]. Até já!" }
    ],
    retorno: [
      { titulo: "Padrão", texto: padraoRetorno },
      { titulo: "Saudades", texto: "Oi [Nome]! Já faz um tempinho desde [Data]. Que tal renovarmos o seu [Serviço]? Garanti [Desconto]% OFF pra você hoje! 🎁" },
      { titulo: "Urgência", texto: "Atenção [Nome]! Passou o prazo ideal do seu [Serviço]. Vamos agendar sua manutenção com [Desconto]% de desconto para não perder a garantia?" }
    ]
  };

  useEffect(() => {
    const carregarDados = async () => {
      const usuarioAtual = auth.currentUser;
      if (!usuarioAtual) return;
      try {
        const docConfig = await getDoc(doc(db, "configuracoes", usuarioAtual.uid));
        
        if (docConfig.exists()) {
          const dadosConfig = docConfig.data();
          setTemplateLembrete(dadosConfig.lembrete || padraoLembrete);
          setTemplateRetorno(dadosConfig.retorno || padraoRetorno);
        } else {
          setTemplateLembrete(padraoLembrete);
          setTemplateRetorno(padraoRetorno);
        }
      } catch (erro) { console.error("Erro configurações:", erro); }

      const hoje = new Date().toISOString().split('T')[0];

      // 2. Carregar Clientes para Retorno
      try {
        const qRetorno = query(
          collection(db, "clientes"), 
          where("userId", "==", usuarioAtual.uid), // <-- Cadeado
          where("dataRetorno", "<=", hoje)
        );
        const snapRetorno = await getDocs(qRetorno);
        const listaRetorno = [];
        snapRetorno.forEach(doc => {
          if (doc.data().status !== 'Avisado no WhatsApp') listaRetorno.push({ id: doc.id, ...doc.data() });
        });
        setClientesRetorno(listaRetorno);
      } catch (erro) { console.error("Erro retornos:", erro); }

      // 3. Carregar Agendamentos de Hoje (Para Lembrete)
      try {
        const qLembrete = query(
          collection(db, "agendamentos"), 
          where("userId", "==", usuarioAtual.uid), // <-- Cadeado
          where("dataAgendada", "==", hoje)
        );
        const snapLembrete = await getDocs(qLembrete);
        const listaLembrete = [];
        snapLembrete.forEach(doc => {
          if (doc.data().status === 'Confirmado') listaLembrete.push({ id: doc.id, ...doc.data() });
        });
        listaLembrete.sort((a, b) => a.horario.localeCompare(b.horario));
        setAgendamentosHoje(listaLembrete);
      } catch (erro) { console.error("Erro lembretes:", erro); }
    };
    carregarDados();
  }, []);

  const salvarTemplate = async () => {
    try {
      const usuarioAtual = auth.currentUser;
      if (!usuarioAtual) return;

      const configRef = doc(db, "configuracoes", usuarioAtual.uid);

      // Usamos o { merge: true } para salvar as duas mensagens juntas no mesmo documento do usuário
      await setDoc(configRef, {
        lembrete: templateLembrete,
        retorno: templateRetorno
      }, { merge: true });

      alert("Modelo guardado com sucesso na sua conta!");
    } catch (erro) { alert("Erro ao guardar a mensagem."); }
  };

  const aplicarMensagemPronta = (texto) => {
    if (abaAtiva === 'lembrete') setTemplateLembrete(texto);
    else setTemplateRetorno(texto);
  };

  const enviarWhatsAppManual = (pessoa) => {
    const primeiroNome = pessoa.nome.split(' ')[0];
    let mensagemFinal = "";

    if (abaAtiva === 'lembrete') {
      mensagemFinal = templateLembrete
        .replace(/\[Nome\]/g, primeiroNome)
        .replace(/\[Serviço\]/g, pessoa.servico)
        .replace(/\[Horario\]/g, pessoa.horario);
    } else {
      let dataFormatada = pessoa.dataRealizada ? pessoa.dataRealizada.split('-').reverse().join('/') : '[Data]';
      const valorDesconto = pessoa.desconto || '0';
      
      // 1. Troca apenas Nome, Serviço e Data primeiro
      mensagemFinal = templateRetorno
        .replace(/\[Nome\]/g, primeiroNome)
        .replace(/\[Serviço\]/g, pessoa.servico)
        .replace(/\[Data\]/g, dataFormatada);

      // 2. A MÁGICA: Se o desconto for 0, apaga as frases inteiras das sugestões prontas!
      if (valorDesconto === '0') {
        mensagemFinal = mensagemFinal
          .replace(/\s*Liberei um desconto de \[Desconto\]% para você!/g, "")
          .replace(/\s*Garanti \[Desconto\]% OFF pra você hoje!/g, "")
          .replace(/\s*com \[Desconto\]% de desconto/g, "")
          .replace(/\[Desconto\]%?/g, ""); // Garantia extra se o usuário escrever algo diferente
      } else {
        // Se tiver desconto real (ex: 10), aí sim ele troca a tag pelo número
        mensagemFinal = mensagemFinal.replace(/\[Desconto\]/g, valorDesconto);
      }
    }

    const textoCodificado = encodeURIComponent(mensagemFinal);
    const numeroLimpo = pessoa.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${numeroLimpo}?text=${textoCodificado}`, '_blank');
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
          <button className="menu-item" onClick={() => navigate('/calendario')}>Agendamento</button>
          <button className="menu-item ativo">Mensagens WhatsApp</button>
          <button className="menu-item" onClick={fazerLogout} style={{ marginTop: 'auto', color: '#dc2626', fontWeight: 'bold' }}>
           Sair
          </button></nav>
      </aside>

      <main className="conteudo-principal">
        <header className="header-dashboard">
          <div>
            <h1 className="boas-vindas">Central de Comunicação</h1>
            <p className="subtitulo">Configure o que o robô vai dizer nos lembretes e nas ofertas.</p>
          </div>
        </header>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="abas-container">
          
          <button className={`btn-aba ${abaAtiva === 'lembrete' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('lembrete')}>
            {/* Ícone de Sino (Notificação/Lembrete) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            Lembretes de Hoje
          </button>

          <button className={`btn-aba ${abaAtiva === 'retorno' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('retorno')}>
            {/* Ícone de Etiqueta (Oferta/Retorno) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            Ofertas de Retorno
          </button>
          
        </div>

        <div className="mensagens-grid">
          {/* ESQUERDA: EDITOR */}
          <section className="card-template">
            <h3 className="titulo-sessao">Modelo: {abaAtiva === 'lembrete' ? 'Aviso de Agendamento' : 'Oferta de Retorno'}</h3>
            
            <div className="mensagens-prontas">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            {/* Ícone de Varinha Mágica (Automático/Templates) */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16.05A3.74 3.74 0 0 0 17.95 13 3.74 3.74 0 0 0 14.9 16.05 3.74 3.74 0 0 0 17.95 19.1 3.74 3.74 0 0 0 21 16.05z"></path>
              <path d="M12.95 11.05A3.74 3.74 0 0 0 9.9 8 3.74 3.74 0 0 0 6.85 11.05 3.74 3.74 0 0 0 9.9 14.1 3.74 3.74 0 0 0 12.95 11.05z"></path>
              <line x1="2.1" y1="21.9" x2="6.85" y2="17.15"></line>
              <path d="M15.4 4.6A3.74 3.74 0 0 0 14 2 3.74 3.74 0 0 0 12.6 4.6 3.74 3.74 0 0 0 10 6 3.74 3.74 0 0 0 12.6 7.4 3.74 3.74 0 0 0 14 10a3.74 3.74 0 0 0 1.4-2.6A3.74 3.74 0 0 0 18 6a3.74 3.74 0 0 0-2.6-1.4z"></path>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
              Modelos Rápidos:
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {templatesProntos[abaAtiva].map((tmpl, index) => (
              <button key={index} className="btn-sugestao" onClick={() => aplicarMensagemPronta(tmpl.texto)}>
                {tmpl.titulo}
              </button>
            ))}
          </div>
        </div>

            <textarea 
              className="caixa-texto-mensagem"
              value={abaAtiva === 'lembrete' ? templateLembrete : templateRetorno}
              onChange={(e) => abaAtiva === 'lembrete' ? setTemplateLembrete(e.target.value) : setTemplateRetorno(e.target.value)}
              rows="6"
              style={{marginTop: '16px'}}
            ></textarea>
            
            <button className="btn-salvar" style={{ width: '100%', marginTop: '16px' }} onClick={salvarTemplate}>
               Guardar Modelo na Nuvem
            </button>
            
            <div className="dica-status">
              <span className="icone-dica">💡</span>
              <small>
                {abaAtiva === 'lembrete' 
                  ? "Use [Nome], [Serviço] e [Horario]. O robô envia 2h antes." 
                  : "Use [Nome], [Serviço], [Data] e [Desconto]. O robô envia às 08h."}
              </small>
            </div>
          </section>

          {/* DIREITA: LISTA DINÂMICA */}
          <section className="card-lista-pendentes">
            <div className="cabecalho-lista">
              <h3 className="titulo-sessao">{abaAtiva === 'lembrete' ? 'Agendamentos de Hoje' : 'Aguardando Retorno'}</h3>
            </div>
            
            <div className="lista-clientes-zap">
              {(abaAtiva === 'lembrete' ? agendamentosHoje : clientesRetorno).length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '20px' }}>
                  Nenhum envio pendente nesta categoria. 🎉
                </p>
              ) : (
                (abaAtiva === 'lembrete' ? agendamentosHoje : clientesRetorno).map((item) => (
                  <div key={item.id} className="card-cliente-zap">
                    <div className="info-cliente-zap">
                      <strong>{item.nome}</strong>
                      <span className="servico-realizado">{item.servico}</span>
                      {abaAtiva === 'lembrete' 
                        ? <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>⏰ Hoje às {item.horario}</span>
                        : <span style={{ fontSize: '13px', color: '#059669', fontWeight: 'bold' }}>🎁 {item.desconto && item.desconto !== '0' ? `${item.desconto}% OFF` : 'Vence Hoje'}</span>
                      }
                    </div>
                    <button className="btn-enviar-zap" onClick={() => enviarWhatsAppManual(item)}>
                      Enviar Manual
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}