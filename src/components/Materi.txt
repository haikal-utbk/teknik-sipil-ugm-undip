import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUS_OPTS = [
  { v: "belum", label: "Belum mulai", color: "#9AA7B0" },
  { v: "proses", label: "Sedang dipelajari", color: T.amber },
  { v: "selesai", label: "Selesai", color: T.teal },
];

export default function Materi({ materi, setMateri }) {
  const [form, setForm] = useState({ subject: "PU", topic: "", target: "" });

  const add = () => {
    if (!form.topic.trim()) return;
    setMateri([...materi, { id: uid(), subject: form.subject, topic: form.topic, target: form.target, status: "belum" }]);
    setForm({ ...form, topic: "", target: "" });
  };
  const setStatus = (id, status) => setMateri(materi.map((m) => (m.id === id ? { ...m, status } : m)));
  const remove = (id) => setMateri(materi.filter((m) => m.id !== id));

  const bySubject = SUBTES.reduce((acc, s) => ({ ...acc, [s.short]: materi.filter((m) => m.subject === s.short) }), {});

  return (
    <div>
      <Eyebrow>Penguasaan Materi</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Target Materi per Topik</h1>

      <BlueprintCard className="mb-6">
        <Eyebrow>Tambah Topik</Eyebrow>
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
      </BlueprintCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBTES.map((s) => (
          <BlueprintCard key={s.key}>
            <Eyebrow>{s.short} — {s.label}</Eyebrow>
            <ul className="mt-2 space-y-2">
              {bySubject[s.short].map((m) => {
                const st = STATUS_OPTS.find((o) => o.v === m.status);
                return (
                  <li key={m.id} className="flex items-center gap-2 text-sm group">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                    <span className="flex-1" style={{ color: m.status === "selesai" ? T.inkSoft : T.ink, textDecoration: m.status === "selesai" ? "line-through" : "none" }}>{m.topic}</span>
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
