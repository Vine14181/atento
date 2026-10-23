// Dentro do app Android da Play (Trusted Web Activity), a primeira página abre
// com document.referrer = "android-app://atento.vgp/". O referrer se perde
// quando a página navega para outro endereço (ex.: depois de excluir a conta),
// então a marca fica guardada na sessão. A checagem roda já na importação,
// na primeira carga do app.
const TWA_KEY = 'atento_twa';

function detectAndroidApp() {
  try {
    if (document.referrer.startsWith('android-app://')) sessionStorage.setItem(TWA_KEY, '1');
    return sessionStorage.getItem(TWA_KEY) === '1';
  } catch {
    return false;
  }
}

detectAndroidApp();

// true dentro do app da Play e também no PWA instalado: nos dois casos a
// pessoa já tem o app, então não faz sentido oferecer o APK.
export function isInstalledApp() {
  if (detectAndroidApp()) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch {
    return false;
  }
}
