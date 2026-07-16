// Helper tipis untuk Notification API browser + bunyi beep singkat (Web Audio API).
// Catatan: ini bukan push notification sungguhan — hanya berbunyi selagi tab
// aplikasi ini terbuka di browser, tidak butuh service worker/server.

export function isNotificationSupported() {
    return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
    if (!isNotificationSupported()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return Notification.requestPermission();
}

export function showNotification(title, body) {
    if (!isNotificationSupported() || Notification.permission !== "granted") return;
    try {
          new Notification(title, { body, icon: undefined });
    } catch {
          // Beberapa browser (mis. mobile) tidak mendukung `new Notification` langsung — abaikan saja.
    }
}

export function playBeep() {
    try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
    } catch {
          // Web Audio tidak tersedia — diamkan, beep hanya pemanis.
    }
}
