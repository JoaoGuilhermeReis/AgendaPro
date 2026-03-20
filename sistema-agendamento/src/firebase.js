import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


// Substitua estas chaves pelas que o Firebase lhe deu no Passo 1
const firebaseConfig = {
  apiKey: "AIzaSyD-efpslIk9lT_qHfCQu_VF1H2MuE58L9Y",
  authDomain: "agendapro-7e6f7.firebaseapp.com",
  projectId: "agendapro-7e6f7",
  storageBucket: "agendapro-7e6f7.firebasestorage.app",
  messagingSenderId: "876452645740",
  appId: "1:876452645740:web:d391237980194804ea0149"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta a Base de Dados (Firestore)
export const db = getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();