import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ProtectedRoute({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // O Firebase fica "escutando" para ver se alguém fez login ou logout
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  // Enquanto o Firebase verifica o servidor, mostramos uma tela de carregamento
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f9ff', color: '#2563eb', fontWeight: 'bold' }}>
        A verificar credenciais...
      </div>
    );
  }

  // Se o Firebase responder que não há ninguém logado, manda de volta pro Login ("/")
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  // Se estiver tudo certo, ele renderiza a tela que a pessoa queria acessar
  return children;
}