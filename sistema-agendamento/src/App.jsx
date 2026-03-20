import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import './index.css';
import Dashboard from './Dashboard';
import MeusClientes from './MeusClientes'; 
import Calendario from './Calendario';
import Mensagens from './Mensagens';
import ProtectedRoute from './ProtectedRoute'; // Importando o nosso guarda-costas!

function App() {
  return (
    <Router>
      <Routes>
        {/* ROTA PÚBLICA: Qualquer um pode acessar */}
        <Route path="/" element={<Login />} />

        {/* ROTAS PROTEGIDAS: Só passa quem fez login */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/clientes" element={
          <ProtectedRoute>
            <MeusClientes />
          </ProtectedRoute>
        } />
        
        <Route path="/calendario" element={
          <ProtectedRoute>
            <Calendario />
          </ProtectedRoute>
        } />
        
        <Route path="/mensagens" element={
          <ProtectedRoute>
            <Mensagens />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;