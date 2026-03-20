import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [modoCadastro, setModoCadastro] = useState(false);
  
  // Agora usamos apenas Telefone e Senha
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');

  // 1. O BLOQUEIO DO TELEFONE (Só entra número e limite de 11)
  const lidarComMudancaTelefone = (e) => {
    // A função replace(/\D/g, '') arranca qualquer letra ou símbolo, deixando SÓ números
    let valorLimpo = e.target.value.replace(/\D/g, '');
    
    // Trava para não passar de 11 dígitos (Ex: 79 99999 9999)
    if (valorLimpo.length > 11) {
      valorLimpo = valorLimpo.slice(0, 11);
    }
    
    setTelefone(valorLimpo);
  };

  // 2. O BLOQUEIO DA SENHA FORTE
  const validarSenhaForte = (senhaDigitada) => {
    const temNumero = /[0-9]/.test(senhaDigitada);
    const temSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(senhaDigitada);
    const tamanhoCerto = senhaDigitada.length >= 6;
    
    return temNumero && temSimbolo && tamanhoCerto;
  };

  const lidarComGoogle = async () => {
    try {
      const resultado = await signInWithPopup(auth, googleProvider);
      const usuario = resultado.user;

      const docRef = doc(db, "usuarios", usuario.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          nome: usuario.displayName,
          email: usuario.email,
          dataCriacao: new Date().toISOString()
        });
      }

      navigate('/dashboard');
    } catch (erro) {
      console.error("Erro com Google:", erro);
      alert("Falha ao entrar com o Google.");
    }
  };

  const lidarComFormularioManual = async (e) => {
    e.preventDefault();

    // Verificações de Segurança antes de chamar o banco
    if (telefone.length !== 11) {
      alert("O número deve ter exatamente 11 dígitos (DDD + 9 + Número).");
      return;
    }

    if (!validarSenhaForte(senha)) {
      alert("⚠️ Senha fraca! A sua senha deve ter pelo menos 6 caracteres, incluir um número (ex: 1, 2) e um símbolo especial (ex: @, #, !).");
      return;
    }

    // O Truque: Transformamos o número num e-mail oculto para o Firebase aceitar
    const emailOculto = `${telefone}@agendapro.com`;

    try {
      if (modoCadastro) {
        // CRIAR CONTA
        const credencial = await createUserWithEmailAndPassword(auth, emailOculto, senha);
        
        await setDoc(doc(db, "usuarios", credencial.user.uid), {
          telefone: telefone,
          dataCriacao: new Date().toISOString()
        });
        
        alert("Conta criada com sucesso! Bem-vindo ao AgendaPro.");
      } else {
        // FAZER LOGIN
        await signInWithEmailAndPassword(auth, emailOculto, senha);
      }
      
      navigate('/dashboard');
    } catch (erro) {
      console.error("Erro na autenticação:", erro);
      if (erro.code === 'auth/email-already-in-use') {
        alert('Este número de WhatsApp já está cadastrado!');
      } else if (erro.code === 'auth/wrong-password' || erro.code === 'auth/user-not-found' || erro.code === 'auth/invalid-credential') {
        alert('Número ou senha incorretos.');
      } else {
        alert('Erro do Firebase: ' + erro.message);
      }
    }
  };

  return (
    <div className="tela-login-container">
      <div className="login-card">
        <div className="login-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="icone-relogio">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 12"></polyline>
          </svg>

          {/* O Texto da Logo */}
          <h2 className="logo-texto" style={{ color: 'gray', fontSize: '22px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>
            Agenda<span style={{ color: '#10b981' }}>Pro</span>
          </h2>
          <p>{modoCadastro ? 'Crie a sua conta de profissional' : 'Acesse o seu painel de controle'}</p>
        </div>

        <button className="btn-google" onClick={lidarComGoogle}>
          <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" alt="Google" className="icone-google" />
          {modoCadastro ? 'Cadastrar rápido com Google' : 'Entrar com Google'}
        </button>

        <div className="divisor">
          <span>ou use o seu WhatsApp</span>
        </div>

        <form onSubmit={lidarComFormularioManual} className="form-login">
          <div className="campo">
            <label>WhatsApp (com DDD)</label>
            <input 
              type="text" 
              value={telefone} 
              onChange={lidarComMudancaTelefone} 
              required 
              placeholder="Ex: 79912345678" 
            />
            <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
              Apenas números ({telefone.length}/11)
            </small>
          </div>

          <div className="campo">
            <label>Senha Segura</label>
            <input 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              required 
              placeholder="Mínimo 6 caracteres, números e símbolos" 
            />
          </div>

          <button type="submit" className="btn-salvar" style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
            {modoCadastro ? 'Criar Minha Conta' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="alternar-modo">
          <p>
            {modoCadastro ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
            <button type="button" className="btn-link" onClick={() => setModoCadastro(!modoCadastro)}>
              {modoCadastro ? 'Faça Login aqui' : 'Cadastre-se grátis'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}