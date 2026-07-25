/**
 * Som de alarme gerado por Web Audio — sem arquivo de áudio, funciona offline.
 * Padrão: bipes duplos agudos repetidos (clássico de despertador).
 * Retorna uma função stop().
 */
export function playAlarmSound() {
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return () => {};
  }

  let stopped = false;
  const timeouts = [];

  const beep = (when, freq = 1568, dur = 0.12) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.exponentialRampToValueAtTime(0.35, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  };

  // padrão: bi-bip ... bi-bip ... (a cada 1s), repetindo
  const cycle = () => {
    if (stopped) return;
    const t = ctx.currentTime;
    beep(t);
    beep(t + 0.18);
    beep(t + 0.36, 2093);
    timeouts.push(setTimeout(cycle, 1000));
  };
  cycle();

  // vibração junto (celular)
  const vibrate = () => {
    if (stopped) return;
    navigator.vibrate?.([300, 150, 300]);
    timeouts.push(setTimeout(vibrate, 1000));
  };
  vibrate();

  return () => {
    stopped = true;
    timeouts.forEach(clearTimeout);
    navigator.vibrate?.(0);
    ctx.close().catch(() => {});
  };
}
