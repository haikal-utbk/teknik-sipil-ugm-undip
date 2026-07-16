import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES, TARGETS, avgSkor, gapToTarget, linearProjection } from "../lib/scoring";

export default function Analitik({ tryouts, materi, config, soalHistory }) {
  const sorted = tryouts.slice().sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const avgLatest = avgSkor(last);
  const avgPrev = avgSkor(prev);
  const delta = avgLatest != null && avgPrev != null ? avgLatest - avgPrev : null;
  const projection = linearProjection(sorted, config.examDate);

  const subtesRanked = last
    ? SUBTES.map((s) => ({ ...s, value: Number(last.skor?.[s.key] || 0) })).sort((a, b) => a.value - b.value)
    : [];
  const weakest = subtesRanked[0];
  const weakestMateri = weakest ? materi.filter((m) => m.subject === weakest.short && m.status !== "selesai").slice(0, 5) : [];

  const soalSessions = soalHistory || [];
  const soalAvgPct = soalSessions.length
    ? Math.round((soalSessions.reduce((a, s) => a + s.score / (s.total || 1), 0) / soalSessions.length) * 100)
    : null;

  if (!last) {
    return (
      <div>
        <Eyebrow>Insight & Prediksi</Eyebrow>
        <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analitik</h1>
        <BlueprintCard>
          <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada data try out. Isi minimal satu hasil try out di halaman Tracker Try Out untuk melihat analitik di sini.</div>
        </BlueprintCard>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Insight & Prediksi</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analitik</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {TARGETS.map((t) => {
          const gap = gapToTarget(avgLatest, t.value);
          const pct = Math.min(100, Math.round((avgLatest / t.value) * 100));
          return (
            <BlueprintCard key={t.label}>
              <Eyebrow>Jarak ke {t.label}</Eyebrow>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{avgLatest}</div>
                <div className="text-sm" style={{ color: T.inkSoft }}>/ {t.value} target</div>
              </div>
              <div className="h-2 w-full mt-3" style={{ background: T.paperLine }}>
                <div className="h-full" style={{ width: `${pct}%`, background: gap <= 0 ? T.teal : T.steel }} />
              </div>
              <div className="text-xs mt-2" style={{ color: gap <= 0 ? T.teal : T.inkSoft }}>
                {gap <= 0 ? "Sudah di atas ambang referensi 🎉" : `Butuh +${gap} poin lagi (rata-rata)`}
              </div>
            </BlueprintCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BlueprintCard>
          <Eyebrow>Subtes Terlemah</Eyebrow>
          {weakest && (
            <>
              <div className="text-sm mb-2">
                <span className="font-semibold" style={{ color: T.red }}>{weakest.short} — {weakest.label}</span>
                <span style={{ color: T.inkSoft }}> · skor terakhir {weakest.value}</span>
              </div>
              <div className="text-xs mb-1" style={{ color: T.inkSoft }}>Topik belum selesai di subtes ini yang bisa difokuskan:</div>
              <ul className="space-y-1">
                {weakestMateri.map((m) => (
                  <li key={m.id} className="text-sm" style={{ color: T.ink }}>• {m.topic}</li>
                ))}
                {weakestMateri.length === 0 && <li className="text-sm" style={{ color: T.inkSoft }}>Belum ada topik tercatat untuk subtes ini di Target Materi.</li>}
              </ul>
            </>
          )}
        </BlueprintCard>

        <BlueprintCard>
          <Eyebrow>Tren & Proyeksi</Eyebrow>
          {delta != null ? (
            <div className="flex items-center gap-2 text-sm mb-2">
              {delta > 0 ? <TrendingUp size={16} color={T.teal} /> : delta < 0 ? <TrendingDown size={16} color={T.red} /> : <Minus size={16} color={T.inkSoft} />}
              <span style={{ color: delta > 0 ? T.teal : delta < 0 ? T.red : T.inkSoft }}>
                {delta > 0 ? `Naik ${delta} poin` : delta < 0 ? `Turun ${Math.abs(delta)} poin` : "Stabil"} dibanding try out sebelumnya
              </span>
            </div>
          ) : (
            <div className="text-sm mb-2" style={{ color: T.inkSoft }}>Butuh minimal 2 try out untuk melihat tren.</div>
          )}

          {projection ? (
            <div className="text-xs mt-2 pt-2" style={{ borderTop: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
              Proyeksi kasar rata-rata skor di tanggal UTBK ({config.examDate}): <b style={{ color: T.navy }}>{projection.projected}</b>.
              Ini estimasi linear dari tren try out sejauh ini, bukan jaminan — anggap sebagai gambaran arah, bukan angka pasti.
            </div>
          ) : (
            <div className="text-xs mt-2" style={{ color: T.inkSoft }}>Butuh minimal 2 try out untuk membuat proyeksi.</div>
          )}
          {soalAvgPct != null && (
            <div className="text-xs mt-3 pt-2" style={{ borderTop: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
              Latihan Bank Soal: {soalSessions.length} sesi selesai, rata-rata benar {soalAvgPct}%.
            </div>
          )}
        </BlueprintCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBTES.map((s) => {
          const chartData = sorted.map((t) => ({ name: t.date, value: Number(t.skor?.[s.key] || 0) }));
          return (
            <BlueprintCard key={s.key}>
              <Eyebrow>{s.short} — {s.label}</Eyebrow>
              <div style={{ width: "100%", height: 140 }} className="mt-2">
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={T.inkSoft} />
                    <YAxis domain={[0, 1000]} tick={{ fontSize: 10 }} stroke={T.inkSoft} width={32} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={T.steel} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </BlueprintCard>
          );
        })}
      </div>
    </div>
  );
}
