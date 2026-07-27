/**
 * Utilitários compartilhados pelas funções em /api.
 * Ficam fora de /api para não virarem endpoints públicos por acidente.
 */

/**
 * Lê o corpo JSON da requisição funcionando em todos os casos:
 * quando a plataforma já parseou (objeto), quando entrega string ou Buffer,
 * e quando entrega o stream cru. Lança em corpo inválido.
 */
export async function readJsonBody(req) {
  const b = req.body;
  if (b !== undefined && b !== null && b !== "") {
    if (typeof b === "string") return JSON.parse(b);
    if (Buffer.isBuffer(b)) return JSON.parse(b.toString("utf8"));
    return b;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * Verifica o ID token do Firebase no servidor e devolve os dados do usuário.
 * Sem isso, qualquer um poderia se passar por VIP — ou usar a IA de graça
 * na cota do dono do app.
 * Devolve null quando o token é inválido, ausente ou a verificação falha.
 */
export async function verifyFirebaseUser(idToken, timeoutMs = 4000) {
  if (!idToken || typeof idToken !== "string") return null;
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const u = data.users?.[0];
    if (!u?.email) return null;
    return {
      uid: u.localId,
      email: u.email.toLowerCase(),
      emailVerified: u.emailVerified === true,
      googleLinked: (u.providerUserInfo || []).some(
        (p) => p.providerId === "google.com"
      ),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Emails do motor VIP — só no servidor, nunca no bundle do navegador. */
export function vipEmails() {
  return (process.env.VIP_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Um usuário só chega no motor VIP se o email dele está na lista E a posse
 * daquele email foi comprovada. O app usa apenas login Google (que já entrega
 * email verificado), então isso não bloqueia ninguém real — mas impede que
 * alguém cadastre um email VIP por outro provedor só para gastar o Opus 5.
 */
export function isVipUser(user) {
  if (!user?.email) return false;
  if (!user.emailVerified && !user.googleLinked) return false;
  return vipEmails().includes(user.email);
}

/** Limita uma promise que não aceita AbortSignal, para não estourar o tempo da função. */
export function withTimeout(promise, ms, label = "tempo esgotado") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
