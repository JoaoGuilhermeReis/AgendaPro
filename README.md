O **AgendaPro** é uma plataforma SaaS desenvolvida para simplificar e automatizar a gestão de agendamentos para negócios locais (como estúdios de tatuagem, barbearias, clínicas, etc). O sistema permite o controle total de clientes e horários, com o grande diferencial de realizar disparos automáticos de mensagens via WhatsApp.

Um projeto desenvolvido sob a marca **G-Corp**.

##  Funcionalidades

- **Autenticação Segura:** Login gerenciado via Google Firebase.
- **Gestão de Clientes:** Cadastro e acompanhamento de clientes no banco de dados em tempo real (Firestore).
- **Calendário Dinâmico:** Interface intuitiva para marcação e visualização de compromissos.
- **Notificações via WhatsApp:** Um bot em Node.js integrado ao sistema que avisa o cliente sobre o agendamento automaticamente.

##  Tecnologias Utilizadas

**Front-end (Painel de Gestão):**
- React (com Vite para build ultrarrápido)
- CSS3 / Estilização Premium
- Integração com Firebase Auth e Cloud Firestore
- Hospedagem: Netlify

**Back-end (Robô de Disparos):**
- Node.js
- Bibliotecas de automação para WhatsApp Web

## Como rodar o projeto localmente

cd AgendaPro
npm install
npm run dev

# Abra um novo terminal na pasta onde está configurado o seu Node.js bot
npm install
node index.js

Pronto! 

### 1. Clonando o repositório
```bash
git clone [https://github.com/JoaoGuilhermeReis/AgendaPro.git](https://github.com/JoaoGuilhermeReis/AgendaPro.git)
