import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importando a navegação
import './Cadastro.css';

export default function Cadastro() {
  const [profissao, setProfissao] = useState('padrao');
  const [isLogin, setIsLogin] = useState(false);
  
  // Inicializando o hook de navegação
  const navigate = useNavigate();

  const alternarTela = (e) => {
    e.preventDefault();
    setIsLogin(!isLogin);
  };

  // Função que lida com o clique do botão de Entrar/Cadastrar
  const lidarComAcesso = (e) => {
    e.preventDefault(); // Impede o recarregamento da página
    // Aqui no futuro entrará a validação do Firebase. 
    // Por enquanto, apenas redirecionamos direto:
    navigate('/dashboard');
  };

  return (
    <div className="cadastro-container">
      <div className="formulario-box">
        <h2>{isLogin ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
        <p>
          {isLogin 
            ? 'Bem-vindo de volta! Insira seus dados para continuar.' 
            : 'Escolha sua área de atuação para personalizarmos seu painel.'}
        </p>

        {/* Adicionando o evento onSubmit no formulário */}
        <form onSubmit={lidarComAcesso}>
          {!isLogin && (
            <>
              <label>Nome Completo</label>
              <input type="text" placeholder="Seu nome" required />
            </>
          )}

          <label>Email</label>
          <input type="email" placeholder="seu@email.com" required />

          {!isLogin && (
            <>
              <label>Sua Profissão</label>
              <select 
                value={profissao} 
                onChange={(e) => setProfissao(e.target.value)}
              >
                <option value="padrao">Selecione uma opção...</option>
                <option value="cabeleireiro">Cabeleireiro(a) / Barbeiro</option>
                <option value="tatuador">Tatuador(a)</option>
                <option value="ar_condicionado">Instalador de Ar Condicionado</option>
                <option value="celular">Técnico de Celular</option>
              </select>
            </>
          )}

          <label>Senha</label>
          <input type="password" placeholder="Sua senha" required />

          <button type="submit" className="btn-cadastrar">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="divisor">ou</div>

        {/* O botão do Google também ganha o redirecionamento onClick */}
        <button type="button" className="btn-google" onClick={() => navigate('/dashboard')}>
          Continuar com o Google
        </button>

        <div className="texto-login">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <a href="#" className="link-login" onClick={alternarTela}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </a>
        </div>
      </div>
    </div>
  );
}