// Helper murni untuk perhitungan skor dan tren.

export const SUBTES = [
  { key: "pk", label: "Penalaran Umum", short: "PU", max: 1000 },
  { key: "pm", label: "Penalaran Matematika", short: "PM", max: 1000 },
  { key: "li", label: "Literasi B. Indonesia", short: "LI", max: 1000 },
  { key: "le", label: "Literasi B. Inggris", short: "LE", max: 1000 },
  ];

// Ambang referensi skor (bukan angka resmi SNPMB — lihat catatan di Dashboard/Analitik)
export const TARGETS = [
  { label: "Teknik Sipil UGM", value: 710 },
  { label: "Teknik Sipil UNDIP", value: 650 }, // titik tengah kisaran 600–700
  ];

export function avgSkor(tryout) {
    if (!tryout) return null;
    const vals = SUBTES.map((s) => Number(tryout.skor?.[s.key] || 0));
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function gapToTarget(avgLatest, targetValue) {
    if (avgLatest == null) return null;
    return targetValue - avgLatest;
}

// Regresi linear sederhana (least squares) atas (hari-ke-n sejak try out pertama, rata-rata skor)
// Mengembalikan proyeksi rata-rata skor pada examDate, atau null kalau data kurang dari 2 titik.
export function linearProjection(tryouts, examDate) {
    const points = tryouts
      .map((t) => ({ date: new Date(t.date), avg: avgSkor(t) }))
      .filter((p) => !isNaN(p.date) && p.avg != null)
      .sort((a, b) => a.date - b.date);

  if (points.length < 2) return null;

  const t0 = points[0].date.getTime();
    const xs = points.map((p) => (p.date.getTime() - t0) / 86400000); // hari sejak try out pertama
  const ys = points.map((p) => p.avg);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sumXX = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

  const examX = (new Date(examDate).getTime() - t0) / 86400000;
    const projected = intercept + slope * examX;
    return { projected: Math.round(projected), slope };
}
