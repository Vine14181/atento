# Execução Visual (Frontend / UI / UX)

Siga estas regras visuais para programar a interface de usuário do app Atento.

## 1. Princípio de Design (Neurodivergente-friendly)
- **Foco Absoluto:** NÃO inclua poluição visual. Remova barras laterais inúteis e não use botões coloridos espalhados.
- **Luxo Minimalista:** IMPLEMENTE baseado em designs como Linear App e Shadcn UI. (Glassmorphism aplicado, ex: backdrop-filter blur).
- **Contraste Suave:** NÃO use preto absoluto (`#000000`) com branco puro (`#FFFFFF`). APLIQUE o fundo cinza ultra escuro (`#121212`).

## 2. Paleta de Cores (Dark Mode Nativo)
- **Background Principal:** Use `#121212`.
- **Cartões / Superfícies:** Use `#1e1e1e` (ou rgba com blur para efeito glass).
- **Cor de Destaque / Ação Primária:** Use `#6366f1` (Índigo) ou `#10b981` (Verde). APLIQUE apenas no botão principal de cada tela.
- **Texto Principal:** Use `#f3f4f6`.
- **Bordas:** Use `#374151` ou rgba translúcido (Bordas ultrafinas de 1px).

## 3. Tipografia
- Fonte Principal: IMPORT e USE **Inter** ou **Geist**.
- Pesos: 400 para textos gerais e 800 para Títulos.

## 4. Micro-interações (Dopamina Visual)
- **Glassmorphism:** APLIQUE `backdrop-filter: blur(12px)` em painéis flutuantes (como a RAM Cache).
- **Recompensas:** CONFIGURE a biblioteca `canvas-confetti` para disparar sempre que o usuário concluir um item.
- **Transições:** USE `framer-motion` para animar entradas (fade-up). Nunca troque telas de forma seca.
