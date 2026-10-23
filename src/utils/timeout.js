// Uma escrita do Firestore sem internet não falha: fica esperando para sempre
// (o SDK guarda a operação até a conexão voltar). O prazo transforma essa
// espera num erro que a tela consegue mostrar.
export const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(
    () => reject(Object.assign(new Error('timeout'), { code: 'app/timeout' })),
    ms,
  )),
]);
