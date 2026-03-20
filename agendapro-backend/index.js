const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');

// 1. LIGANDO O FIREBASE (Apresentando o 'db' para o sistema)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // <-- Olha o 'db' aqui! Agora o erro vai sumir.

// 2. CONFIGURANDO O ROBÔ DO WHATSAPP
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Escaneie este QR Code com o WhatsApp do profissional:');
    qrcode.generate(qr, { small: true });
});

const cron = require('node-cron'); // <-- IMPORTAÇÃO DO RELÓGIO (coloque no topo junto dos outros requires se preferir)

client.on('ready', () => {
    console.log('✅ Robô do WhatsApp conectado e pronto para trabalhar!');
    
    // ==========================================================
    // AGENDA DO ROBÔ (CRON JOBS)
    // ==========================================================

    // 1. LEMBRETES (A cada 15 minutos)
    cron.schedule('*/15 * * * *', () => {
        console.log('⏰ A verificar agendamentos para as próximas 2 horas...');
        executarLembretesDoDia();
    });

    // 2. RETORNOS E MARKETING (Todos os dias às 08:00)
    cron.schedule('0 8 * * *', () => {
        console.log('🌅 Bom dia! A iniciar disparos de retorno e desconto...');
        executarDisparoDeTeste();
    });

    // Roda uma vez assim que liga para testarmos na hora
    executarLembretesDoDia();
    executarDisparoDeTeste();
});

client.initialize();

// ========================================================
// TAREFA 1: LEMBRETES 2 HORAS ANTES
// ========================================================
async function executarLembretesDoDia() {
    const agora = new Date();
    const hoje = new Date(agora.getTime() - (agora.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
        const snapshot = await db.collection('agendamentos')
            .where('dataAgendada', '==', hoje)
            .where('status', '==', 'Confirmado')
            .get();

        if (snapshot.empty) return;

        snapshot.forEach(async (doc) => {
            const agendamento = doc.data(); // <-- AQUI USAMOS 'agendamento'
            
            const [hora, minuto] = agendamento.horario.split(':');
            const dataAgendamento = new Date();
            dataAgendamento.setHours(parseInt(hora), parseInt(minuto), 0, 0);

            const limiteLembrete = new Date();
            limiteLembrete.setHours(limiteLembrete.getHours() + 2);

            if (dataAgendamento <= limiteLembrete) {
                const numeroLimpo = agendamento.whatsapp.replace(/\D/g, '');
                const numeroComDDI = `55${numeroLimpo}`; 
                const primeiroNome = agendamento.nome.split(' ')[0];

                let textoLembrete = "🔔 *Lembrete*\n\nOlá [Nome]! Passando para confirmar nosso horário de *[Serviço]* hoje às *[Horario]*.";
                
                try {
                    const configDoc = await db.collection('configuracoes').doc(agendamento.userId).get();
                    if (configDoc.exists && configDoc.data().lembrete) {
                        textoLembrete = configDoc.data().lembrete;
                    }
                } catch (err) {
                    console.error('Erro ao buscar template de lembrete:', err);
                }

                const mensagemFinal = textoLembrete
                    .replace(/\[Nome\]/g, primeiroNome)
                    .replace(/\[Serviço\]/g, agendamento.servico)
                    .replace(/\[Horario\]/g, agendamento.horario);

                try {
                    const contato = await client.getNumberId(numeroComDDI);
                    if (contato) {
                        await client.sendMessage(contato._serialized, mensagemFinal);
                        console.log(`✅ LEMBRETE ENVIADO PARA: ${primeiroNome}`);
                        await db.collection('agendamentos').doc(doc.id).update({ status: 'Lembrado' });
                    }
                } catch (erroWhatsApp) {
                    console.error(`❌ Falha no lembrete para ${primeiroNome}:`, erroWhatsApp);
                }
            }
        });

    } catch (erroBanco) {
        console.error('❌ Erro ao ler agendamentos:', erroBanco);
    }
}

// ========================================================
// TAREFA 2: DISPAROS DE RETORNO/MANUTENÇÃO
// ========================================================
async function executarDisparoDeTeste() {
    const hoje = new Date().toISOString().split('T')[0]; 

    try {
        const snapshot = await db.collection('clientes')
            .where('dataRetorno', '==', hoje)
            .where('status', '==', 'Aguardando') 
            .get();

        if (snapshot.empty) return;

        snapshot.forEach(async (doc) => {
            const cliente = doc.data(); // <-- AQUI USAMOS 'cliente'
            const numeroLimpo = cliente.whatsapp.replace(/\D/g, '');
            const numeroComDDI = `55${numeroLimpo}`; 
            const primeiroNome = cliente.nome.split(' ')[0];

            let textoRetorno = "Olá [Nome], tudo bem? Percebi que o seu último serviço foi no dia [Data] e gostaria de saber se o [Serviço] está precisando de manutenção. Liberei um desconto de [Desconto]% para você! Vamos agendar?";
            
            try {
                const configDoc = await db.collection('configuracoes').doc(cliente.userId).get();
                if (configDoc.exists && configDoc.data().retorno) {
                    textoRetorno = configDoc.data().retorno;
                }
            } catch (err) {
                console.error('Erro ao buscar template de retorno:', err);
            }

            let dataFormatada = '';
            if (cliente.dataRealizada) {
                dataFormatada = cliente.dataRealizada.split('-').reverse().join('/');
            }

            const valorDesconto = cliente.desconto || '0';

            let mensagemFinal = textoRetorno
                .replace(/\[Nome\]/g, primeiroNome)
                .replace(/\[Serviço\]/g, cliente.servico)
                .replace(/\[Data\]/g, dataFormatada);

            if (valorDesconto === '0') {
                mensagemFinal = mensagemFinal
                    .replace(/\s*Liberei um desconto de \[Desconto\]% para você!/g, "")
                    .replace(/\s*Garanti \[Desconto\]% OFF pra você hoje!/g, "")
                    .replace(/\s*com \[Desconto\]% de desconto/g, "")
                    .replace(/\[Desconto\]%?/g, "");
            } else {
                mensagemFinal = mensagemFinal.replace(/\[Desconto\]/g, valorDesconto);
            }

            try {
                const contato = await client.getNumberId(numeroComDDI);

                if (contato) {
                    await client.sendMessage(contato._serialized, mensagemFinal);
                    console.log(`✅ AVISO DE RETORNO ENVIADO PARA: ${primeiroNome}`);
                    await db.collection('clientes').doc(doc.id).update({ status: 'Avisado no WhatsApp' });
                }
            } catch (erroWhatsApp) {
                console.error(`❌ Falha no aviso para ${primeiroNome}:`, erroWhatsApp);
            }
        });

    } catch (erroBanco) {
        console.error('❌ Erro ao tentar ler o banco do Firebase:', erroBanco);
    }
}