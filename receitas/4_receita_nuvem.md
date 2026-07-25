# Execução em Nuvem (Backend, Banco e Hospedagem)

Implemente a infraestrutura técnica exatamente conforme descrito abaixo.

## 1. Multiplataforma (PWA + Netlify)
- **Hospedagem:** CONFIGURE o build do Vite e faça o deploy no **Netlify**.
- **Mobile First (PWA):** CONFIGURE o plugin `vite-plugin-pwa` para gerar o `manifest.json` e o Service Worker. Certifique-se de que o app exibe o prompt "Adicionar à Tela Inicial" nos dispositivos móveis.

## 2. Banco de Dados e Contas (Firebase)
- **Autenticação:** CONFIGURE o Firebase Auth no projeto. IMPLEMENTE exclusivamente o **Google Sign-In**.
- **Isolamento de Dados:** USE as security rules do Firestore para garantir que `request.auth.uid == resource.data.uid`.
- **Banco de Dados (Firestore):** 
  - CRIE uma coleção `/users/{uid}/tasks` para salvar e ouvir (onSnapshot) as tarefas em tempo real.
  - CRIE a lógica de salvar o Cache da Memória RAM de forma vinculada ao usuário logado, para que ele tenha a mesma RAM externa sincronizada no PC e no celular.

## 3. Motor de Inteligência Artificial
- INTEGRE o SDK do **Google Gemini** (`@google/generative-ai`).
- CONFIGURE a variável de ambiente `.env` para proteger a API Key.
- FAÇA as chamadas da API usando o modelo `gemini-1.5-pro` (ou flash para velocidade), sempre forçando o retorno de respostas estruturadas (JSON) para que o frontend consuma as listas sem quebras.
