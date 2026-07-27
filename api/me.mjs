import {
  readJsonBody,
  verifyFirebaseUser,
  isVipUser,
} from "../lib/api-helpers.mjs";

/**
 * Diz ao app se o usuário logado tem acesso ao motor VIP.
 *
 * Existe para que a lista de emails VIP fique só no servidor: antes ela era
 * lida no navegador (VITE_VIP_EMAILS), o que publicava emails pessoais dentro
 * do JavaScript do site — visível para qualquer pessoa que abrisse o código.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }

  const user = await verifyFirebaseUser(body?.idToken, 4000);
  if (!user) {
    // Não é erro: apenas não há usuário verificado, então não há VIP.
    return res.status(200).json({ vip: false });
  }
  return res.status(200).json({ vip: isVipUser(user) });
}
