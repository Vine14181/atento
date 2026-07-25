# Atento — Co-piloto de IA para TDAH

PWA que protege a memória de trabalho e combate a paralisia por sobrecarga em pessoas com TDAH.

> **Aviso de licença**: Projeto pessoal publicado para avaliação/portfólio. Não licenciado para uso, cópia ou redistribuição. Todos os direitos reservados.

## Funcionalidades

- **Brain Dump com IA** — despeje o caos mental por texto ou voz e a IA separa tarefas acionáveis (com micro-passos, duração e prioridade), notas e alarmes.
- **Descomplicador** — quebra qualquer tarefa em 3–5 micro-passos ridículos de fáceis.
- **Disjuntor** — modo emergência que esconde tudo e mostra UMA única tarefa.
- **Modo secretário** — compromissos geram alarmes de preparação automáticos.
- **Hábitos** — streaks e contadores diários, sincronizados na nuvem.
- **Diário e conquistas** — progresso real do dia, consistência semanal e gamificação.

## Stack

- React 19 + Vite (PWA)
- Firebase Auth (Google) + Firestore
- Google Gemini via Netlify Functions (chaves só no servidor; ditado por voz transcrito pelo Gemini)
- Framer Motion, Lucide, canvas-confetti

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as suas chaves
npm run dev
```

O app exige um projeto Firebase próprio (Auth Google + Firestore) e uma chave do Gemini. Sem as chaves no `.env`, a IA não funciona.

## Deploy (Netlify)

Build e redirects já configurados em `netlify.toml`. Variáveis de ambiente no painel:

- `GEMINI_API_KEY` — motor de IA padrão (Functions `ai` e `transcribe`)
- `ANTHROPIC_API_KEY` — opcional, motor VIP (Claude)
- `FIREBASE_WEB_API_KEY` — verificação server-side do token de login
- `VIP_EMAILS` — opcional, emails do motor VIP (separados por vírgula)
- `VITE_*` — mesmas variáveis do `.env.example`, para o build do front

Regras de segurança do Firestore em `firestore.rules` (dados isolados por usuário).
