/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from './firebase'
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Dashboard.css'; // Vamos criar este CSS a seguir

export default function Dashboard() {
  const navigate = useNavigate();
  const fazerLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Estados para guardar os cálculos
  const [metricas, setMetricas] = useState({
    totalAgendamentosMes: 0,
    faturamentoMes: 0,
    clientesRetorno: 0
  });

  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);

  useEffect(() => {
    const carregarDadosDashboard = async () => {
      try {
        const usuarioAtual = auth.currentUser;
        if (!usuarioAtual) return;

        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        const hojeString = hoje.toISOString().split('T')[0];

        // 1. Buscar Agendamentos (Para Gráfico, Contagem e FATURAMENTO)
        const qAgendamentos = query(
          collection(db, "agendamentos"), 
          where("userId", "==", usuarioAtual.uid),
          orderBy("dataAgendada", "asc")
        );
        const snapAgendamentos = await getDocs(qAgendamentos);
        
        let contagemMes = 0;
        let faturamentoTotal = 0; // A nossa calculadora zera aqui
        const agendamentosDeHoje = [];
        const contagemPorDia = {}; 

        snapAgendamentos.forEach((doc) => {
          const dados = doc.data();
          
          // Proteção: Só faz o cálculo se o agendamento tiver uma data válida
          if (dados.dataAgendada) {
            const partesData = dados.dataAgendada.split('-');
            const anoAg = parseInt(partesData[0]);
            const mesAg = parseInt(partesData[1]) - 1; // No Javascript, Janeiro é 0

            // Se for do mês e ano atual, entra na matemática!
            if (mesAg === mesAtual && anoAg === anoAtual) {
              contagemMes++;
              
              // Garante que o valor é tratado como dinheiro real (número)
              const valorServico = Number(dados.valor) || 0;
              faturamentoTotal += valorServico; 
              
              const diaFormatado = partesData.reverse().slice(0, 2).join('/');
              contagemPorDia[diaFormatado] = (contagemPorDia[diaFormatado] || 0) + 1;
            }

            if (dados.dataAgendada === hojeString) {
              agendamentosDeHoje.push(dados);
            }
          }
        });

        // 2. Buscar Clientes (Apenas para contar os retornos pendentes)
        const qClientes = query(
          collection(db, "clientes"),
          where("userId", "==", usuarioAtual.uid)
        );
        const snapClientes = await getDocs(qClientes);
        
        let retornosPendentes = 0;
        snapClientes.forEach((doc) => {
          const dados = doc.data();
          if (dados.dataRetorno && dados.dataRetorno <= hojeString && dados.status !== 'Avisado no WhatsApp') {
            retornosPendentes++;
          }
        });

        const formatacaoGrafico = Object.keys(contagemPorDia).map(dia => ({
          name: dia,
          Agendamentos: contagemPorDia[dia]
        }));

        // 3. ATUALIZA A TELA COM OS VALORES REAIS
        setMetricas({
          totalAgendamentosMes: contagemMes,
          faturamentoMes: faturamentoTotal, // O valor do faturamento entra aqui!
          clientesRetorno: retornosPendentes
        });

        setDadosGrafico(formatacaoGrafico);
        setAgendamentosHoje(agendamentosDeHoje);

      } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
      }
    };

    carregarDadosDashboard();
  }, []); // Fim do useEffect

  return (
    <div className="dashboard-layout">
      {/* Menu Lateral */}
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
          <button className="menu-item ativo">Visão Geral</button>
          <button className="menu-item" onClick={() => navigate('/clientes')}>Meus Clientes</button>
          <button className="menu-item" onClick={() => navigate('/calendario')}>Agendamento</button>
          <button className="menu-item" onClick={() => navigate('/mensagens')}>Mensagens WhatsApp</button>
          <button className="menu-item" onClick={fazerLogout} style={{ marginTop: 'auto', color: '#dc2626', fontWeight: 'bold' }}>
           Sair 
          </button>
        </nav>
      </aside>

      {/* Área Principal */}
      <main className="conteudo-principal">
        <header className="header-dashboard">
          <div>
            <h1 className="boas-vindas">Visão Geral</h1>
            <p className="subtitulo">Acompanhe o desempenho do seu negócio em tempo real.</p>
          </div>
        </header>

        {/* Cards de Métricas (KPIs) */}
        <div className="kpi-grid">
          
          {/* 1. CARTÃO DE AGENDAMENTOS (Ícone de Calendário) */}
          <div className="kpi-card">
            <div className="kpi-icone" style={{ backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="kpi-info">
              <span className="kpi-titulo">Agendamentos no Mês</span>
              <strong className="kpi-valor">{metricas.totalAgendamentosMes}</strong>
            </div>
          </div>

          {/* 2. CARTÃO DE FATURAMENTO (Ícone de Dinheiro/Cifrão) */}
          <div className="kpi-card">
            <div className="kpi-icone" style={{ backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="kpi-info">
              <span className="kpi-titulo">Faturamento (Mês)</span>
              <strong className="kpi-valor">R$ {metricas.faturamentoMes.toFixed(2)}</strong>
            </div>
          </div>

          {/* 3. CARTÃO DE RETORNOS (Ícone de Relógio/Pendente) */}
          <div className="kpi-card">
            <div className="kpi-icone" style={{ backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="kpi-info">
              <span className="kpi-titulo">Retornos Pendentes</span>
              <strong className="kpi-valor">{metricas.clientesRetorno}</strong>
            </div>
          </div>

        </div>

        <div className="dashboard-grid-inferior">
          {/* Gráfico */}
          <section className="card-grafico">
            <h3 className="titulo-sessao">Movimento do Mês</h3>
            <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
              {dadosGrafico.length === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  Ainda não há agendamentos neste mês para gerar o gráfico.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="Agendamentos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Lista Rápida de Hoje */}
          <section className="card-lista-hoje">
            <h3 className="titulo-sessao">Para Hoje</h3>
            <div className="lista-agendamentos-hoje">
              {agendamentosHoje.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>Agenda livre para hoje!</p>
              ) : (
                agendamentosHoje.map((ag, index) => (
                  <div key={index} className="item-hoje">
                    <div className="item-hoje-hora">{ag.horario}</div>
                    <div className="item-hoje-info">
                      <strong>{ag.nome}</strong>
                      <span>{ag.servico}</span>
                    </div>
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