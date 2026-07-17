import React, { useState, useEffect } from "react";
import { Plus, X, Wand2 } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";
import { QUESTION_BANK } from "../data/questionBank";

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUS_OPTS = [
  { v: "belum", label: "Belum mulai", color: "#9AA7B0" },
  { v: "proses", label: "Sedang dipelajari", color: T.amber },
  { v: "selesai", label: "Selesai", color: T.teal },
];

// Ambang batas auto-tandai "Selesai": minimal 3 soal dikerjakan di topik itu di Bank
// Soal, dengan akurasi minimal 80%.
const AUTO_MIN_ATTEMPTS = 3;
const AUTO_ACCURACY = 0.8;

function defaultTopicsFor(subtesShort) {
  const seen = [];
  QUESTION_BANK.forEach((q) => {
    if (q.subtes === subtesShort && q.topic && !seen.includes(q.topic)) seen.push(q.topic);
  });
  return seen;
}

export default function Materi({ materi, setMateri, topicStats }) {
  const [form, setForm] = useState({ subject: "PU", topic: "", target: "" });

  const add = () => {
    if (!form.topic.trim()) return;
    setMateri([...materi, { id: uid(), subject: form.subject, topic: form.topic, target: form.target, status: "belum" }]);
    setForm({ ...form, topic: "", target: "" });
  };
  const setStatus = (id, status) => setMateri(materi.map((m) => (m.id === id ? { ...m, status, autoStatus: false } : m)));
  const remove = (id) => setMateri(materi.filter((m) => m.id !== id));

  const autoFillTopics = () => {
    const existing = new Set(materi.map((m) => `${m.subject}::${m.topic}`));
    const additions = [];
    SUBTES.forEach((s) => {
      defaultTopicsFor(s.short).forEach((topic) => {
        const key = `${s.short}::${topic}`;
        if (!existing.has(key)) additions.push({ id: uid(), subject: s.short, topic, target: "", status: "belum" });
      });
    });
    if (additions.length > 0) setMateri([...materi, ...additions]);
  };

  // Auto-tandai "Selesai" begitu akurasi topik di Bank Soal memenuhi ambang batas —
  // kecuali kamu pernah mengubah status topik itu secara manual (autoStatus: false),
  // supaya tidak menimpa keputusanmu sendiri.
  useEffect(() => {
    if (!topicStats) return;
    const toComplete = materi.filter((m) => {
      if (m.status === "selesai" || m.autoStatus === false) return false;
      const stat = topicStats[`${m.subject}::${m.topic}`];
      return stat && stat.total >= AUTO_MIN_ATTEMPTS && stat.correct / stat.total >= AUTO_ACCURACY;
    });
    if (toComplete.length === 0) return;
    const ids = new Set(toComplete.map((m) => m.id));
    setMateri(materi.map((m) => (ids.has(m.id) ? { ...m, status: "selesai", autoStatus: true } : m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicStats]);

  const bySubject = SUBTES.reduce((acc, s) => ({ ...acc, [s.short]: materi.filter((m) => m.subject === s.short) }), {});

  return (
    <div>
      <Eyebrow>Penguasaan Materi</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Target Materi per Topik</h1>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
        Status "Selesai" bisa otomatis tercentang begitu akurasimu di topik itu ≥80% dari minimal 3 soal di Bank Soal — kecuali kamu ubah manual, statusnya tidak akan ditimpa lagi.
      </p>

      <BlueprintCard className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Eyebrow>Tambah Topik</Eyebrow>
          <button onClick={autoFillTopics} className="text-xs flex items-center gap-1" style={{ color: T.steel }}>
            <Wand2 size={13} /> Isi Otomatis Semua Topik
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }}>
            {SUBTES.map((s) => <option key={s.key} value={s.short}>{s.short} — {s.label}</option>)}
          </select>
          <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nama topik, cth. Barisan & Deret" className="flex-1 border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }} />
          <input type="date" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }} />
          <button onClick={add} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 justify-center" style={{ background: T.steel, color: "#fff" }}>
            <Plus size={15} /> Tambah
          </button>
        </div>
        <div className="text-xs mt-2" style={{ color: T.inkSoft }}>
          "Isi Otomatis" mengambil daftar topik yang memang sudah dilatih di Bank Soal per subtes, tanpa menghapus topik yang sudah kamu tambahkan.
        </div>
      </BlueprintCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBTES.map((s) => (
          <BlueprintCard key={s.key}>
            <Eyebrow>{s.short} — {s.label}</Eyebrow>
            <ul className="mt-2 space-y-2">
              {bySubject[s.short].map((m) => {
                const st = STATUS_OPTS.find((o) => o.v === m.status);
                const stat = topicStats?.[`${m.subject}::${m.topic}`];
                return (
                  <li key={m.id} className="flex items-center gap-2 text-sm group">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                    <span className="flex-1 min-w-0" style={{ color: m.status === "selesai" ? T.inkSoft : T.ink, textDecoration: m.status === "selesai" ? "line-through" : "none" }}>
                      {m.topic}
                      {stat && (
                        <span className="block text-[11px]" style={{ color: T.inkSoft, textDecoration: "none" }}>
                          Akurasi Bank Soal: {Math.round((stat.correct / stat.total) * 100)}% ({stat.total} soal)
                        </span>
                      )}
                    </span>
                    {m.target && <span className="text-xs shrink-0" style={{ color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{m.target}</span>}
                    <select value={m.status} onChange={(e) => setStatus(m.id, e.target.value)} className="text-xs border px-1 py-0.5 shrink-0" style={{ borderColor: T.paperLine, color: T.inkSoft }}>
                      {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select>
                    <button onClick={() => remove(m.id)} style={{ color: T.red }} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <X size={13} />
                    </button>
                  </li>
                );
              })}
              {bySubject[s.short].length === 0 && <li className="text-sm" style={{ color: T.inkSoft }}>Belum ada topik.</li>}
            </ul>
          </BlueprintCard>
        ))}
      </div>
    </div>
  );
}
