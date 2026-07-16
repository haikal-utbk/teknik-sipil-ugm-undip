import React from "react";
import { StickyNote } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";

const REFERENSI_SKOR = [
    { kampus: "Teknik Sipil — UGM", estimasi: "~ 710 (skala 1000)", catatan: "Estimasi crowdsourcing tahun 2025" },
  { kampus: "Teknik Sipil — UNDIP", estimasi: "~ 600–700 (skala 1000)", catatan: "Kisaran dari survei alumni/mahasiswa tahun 2025" },
];

const todayName = () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];

export default function Dashboard({ config, setConfig, daysLeft, tryouts, materi, schedule, reminder, setReminder }) {
  const lastTryout = tryouts[tryouts.length - 1];
  const avg = (t) => {
    if (!t) return null;
    const vals = SUBTES.map((s) => Number(t.skor?.[s.key] || 0));
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  const doneMateri = materi.filter((m) => m.status === "selesai").length;
  const totalScheduleItems = Object.values(schedule).reduce((a, arr) => a + (arr?.length || 0), 0);
  const agendaHariIni = schedule[todayName()] || [];

  return (
    <div>
      <Eyebrow>Ringkasan</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Menuju UTBK-SNBT — {config.target1} & {config.target2}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BlueprintCard>
          <Eyebrow>Hitung Mundur</Eyebrow>
          <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>
            {daysLeft >= 0 ? daysLeft : 0} <span className="text-base font-normal" style={{ color: T.inkSoft }}>hari</span>
          </div>
          <label className="block mt-3 text-xs" style={{ color: T.inkSoft }}>
            Tanggal UTBK
            <input type="date" value={config.examDate} onChange={(e) => setConfig({ ...config, examDate: e.target.value })} className="block mt-1 w-full border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }} />
          </label>
        </BlueprintCard>

        <BlueprintCard>
          <Eyebrow>Skor Try Out Terakhir</Eyebrow>
          {lastTryout ? (
            <>
              <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{avg(lastTryout)}</div>
              <div className="text-xs mt-1" style={{ color: T.inkSoft }}>{lastTryout.name} · {lastTryout.date}</div>
            </>
          ) : (
            <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada data try out.</div>
          )}
        </BlueprintCard>

        <BlueprintCard>
          <Eyebrow>Progres Materi</Eyebrow>
          <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>
            {doneMateri}<span className="text-lg" style={{ color: T.inkSoft }}>/{materi.length}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: T.inkSoft }}>topik selesai · {totalScheduleItems} agenda belajar tercatat</div>
        </BlueprintCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BlueprintCard>
          <Eyebrow>Pengingat Harian — {todayName()}</Eyebrow>
          <ul className="mt-1 mb-3 space-y-1">
            {agendaHariIni.length > 0 ? agendaHariIni.map((it) => (
              <li key={it.id} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: it.done ? T.teal : T.amber }} />
                <span style={{ color: it.done ? T.inkSoft : T.ink, textDecoration: it.done ? "line-through" : "none" }}>{it.text}</span>
              </li>
            )) : (
              <li className="text-sm" style={{ color: T.inkSoft }}>Belum ada agenda untuk hari ini di Jadwal Belajar.</li>
            )}
          </ul>
          <label className="text-xs flex items-center gap-1.5" style={{ color: T.inkSoft }}>
            <StickyNote size={13} /> Catatan pengingat cepat
          </label>
          <input value={reminder} onChange={(e) => setReminder(e.target.value)} placeholder="cth. Jangan lupa review rumus trigonometri malam ini" className="block w-full border px-2 py-1.5 text-sm mt-1" style={{ borderColor: T.paperLine }} />
        </BlueprintCard>

        <BlueprintCard>
          <Eyebrow>Referensi Skor UTBK Tahun Lalu</Eyebrow>
          <ul className="mt-1 space-y-2.5">
            {REFERENSI_SKOR.map((r) => (
              <li key={r.kampus}>
                <div className="text-sm font-medium" style={{ color: T.ink }}>{r.kampus}</div>
                <div className="text-lg font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{r.estimasi}</div>
                <div className="text-xs" style={{ color: T.inkSoft }}>{r.catatan}</div>
              </li>
            ))}
          </ul>
          <div className="text-xs mt-3 pt-2" style={{ color: T.inkSoft, borderTop: `1px solid ${T.paperLine}` }}>
            *Bukan angka resmi dari SNPMB/kampus — PTN tidak mempublikasikan ambang kelulusan resmi. Gunakan sebagai gambaran kasar saja.
          </div>
        </BlueprintCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BlueprintCard>
          <Eyebrow>Target Kampus</Eyebrow>
          <div className="space-y-2 mt-1">
            <input value={config.target1} onChange={(e) => setConfig({ ...config, target1: e.target.value })} className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }} placeholder="Pilihan 1" />
            <input value={config.target2} onChange={(e) => setConfig({ ...config, target2: e.target.value })} className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }} placeholder="Pilihan 2" />
          </div>
        </BlueprintCard>

        <BlueprintCard>
          <Eyebrow>Materi Belum Selesai (terdekat)</Eyebrow>
          <ul className="mt-1 space-y-1.5">
            {materi.filter((m) => m.status !== "selesai").slice(0, 4).map((m) => (
              <li key={m.id} className="text-sm flex justify-between" style={{ color: T.ink }}>
                <span>{m.topic}</span>
                <span className="text-xs" style={{ color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{m.subject}</span>
              </li>
            ))}
            {materi.filter((m) => m.status !== "selesai").length === 0 && (
              <li className="text-sm" style={{ color: T.inkSoft }}>Semua materi tercatat sudah selesai 🎉</li>
            )}
          </ul>
        </BlueprintCard>
      </div>
    </div>
  );
}
