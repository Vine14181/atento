# Execução: A Espinha Dorsal (Core Features)

Programe as seguintes funcionalidades vitais do Atento seguindo esta lógica exata.

## 1. Caixa de Entrada Mágica (Brain Dump)
- **Como Programar:** Crie um grande campo de texto (`textarea`). Quando o usuário enviar os dados, ENVIE a string para a Inteligência Artificial (Gemini).
- **Lógica da IA:** A IA deve retornar um JSON estruturado identificando as tarefas e notas. Renderize a lista higienizada na tela.

## 2. O Descomplicador (Task Breaker)
- **Como Programar:** Crie uma interface onde, ao selecionar uma tarefa, a API da IA é chamada com um prompt específico.
- **Lógica da IA:** A IA DEVE quebrar a tarefa enviada em 3 a 5 passos microscópicos (ex: 1. Pegar um saco de lixo). Renderize esses micro-passos como checkboxes para o usuário marcar.

## 3. O Disjuntor (Circuit Breaker)
- **Como Programar:** Crie um botão de emergência "Estou Travado".
- **Ação:** Ao ser clicado, a interface DEVE esconder a lista inteira (display: none ou desmontar o componente) e renderizar apenas 1 tarefa gigante no centro da tela. O usuário não pode ver as outras tarefas enquanto este modo estiver ativo.

## 4. A Memória RAM Externa (Cache)
- **Como Programar:** Desenvolva um widget flutuante (botão fixo).
- **Comportamento:** Ao abrir, deve ser um bloco de notas ultrarrápido (foco automático no textarea). SALVE o conteúdo no `LocalStorage` ou Firebase em tempo real, para que aja como memória volátil, porém persistente contra fechamentos acidentais.
