import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { T, BlueprintCard, Eyebrow, IconBtn } from "../tokens";
import { SUBTES, avgSkor } from "../lib/scoring";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function TryOut({ tryouts, setTryouts }) {
  const [form, setForm] = useState({ name: "", date: new Date().toISOString().slice(0, 10), pk: "", pm: "", li: "", le: "" });

  const addTryout = () => {
    if (!form.name.trim()) return;
    const entry = { id: uid(), name: form.name, date: form.date, skor: { pk: form.pk, pm: form.pm, li: form.li, le: form.le } };
    setTryouts([...tryouts, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setForm({ name: "", date: new Date().toISOString().slice(0, 10), pk: "", pm: "", li: "", le: "" });
  };
  const remove = (id) => setTryouts(tryouts.filter((t) => t.id !== id));

  const chartData = tryouts.map((t) => ({
    name: t.date,
    ...SUBTES.reduce((acc, s) => ({ ...acc, [s.short]: Number(t.skor?.[s.key] || 0) }), {}),
  }));

  return (
    <div>
      <Eyebrow>Perkembangan Nilai</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tracker Try Out</h1>

      <BlueprintCard className="mb-6">
        <Eyebrow>Catat Hasil Baru</Eyebrow>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 items-end mt-2">
          <label className="text-xs col-span-2" style={{ color: T.inkSoft }}>
            Nama try out
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="block w-full border px-2 py-1.5 text-sm mt-1" style={{ borderColor: T.paperLine }} placeholder="cth. TO Ganesha #3" />
          </label>
          <label className="text-xs" style={{ color: T.inkSoft }}>
            Tanggal
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="block w-full border px-2 py-1.5 text-sm mt-1" style={{ borderColor: T.paperLine }} />
          </label>
          {SUBTES.map((s) => (
            <label key={s.key} className="text-xs" style={{ color: T.inkSoft }}>
              {s.short}
              <input type="number" min="0" max="1000" value={form[s.key]} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} className="block w-full border px-2 py-1.5 text-sm mt-1" style={{ borderColor: T.paperLine }} placeholder="0-1000" />
            </label>
          ))}
          <button onClick={addTryout} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 justify-center" style={{ background: T.steel, color: "#fff" }}>
            <Plus size={15} /> Simpan
          </button>
        </div>
      </BlueprintCard>

      {tryouts.length > 0 && (
        <BlueprintCard className="mb-6">
          <Eyebrow>Grafik Perkembangan</Eyebrow>
          <div style={{ width: "100%", height: 280 }} className="mt-2">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke={T.paperLine} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={T.inkSoft} />
                <YAxis domain={[0, 1000]} tick={{ fontSize: 11 }} stroke={T.inkSoft} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="PU" stroke={T.steel} strokeWidth={2} />
                <Line type="monotone" dataKey="PM" stroke={T.amber} strokeWidth={2} />
                <Line type="monotone" dataKey="LI" stroke={T.teal} strokeWidth={2} />
                <Line type="monotone" dataKey="LE" stroke={T.red} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </BlueprintCard>
      )}

      <BlueprintCard>
        <Eyebrow>Riwayat</Eyebrow>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                <th className="text-left py-2 pr-3" style={{ color: T.inkSoft, fontWeight: 500 }}>Try Out</th>
                <th className="text-left py-2 pr-3" style={{ color: T.inkSoft, fontWeight: 500 }}>Tanggal</th>
                {SUBTES.map((s) => <th key={s.key} className="text-right py-2 pr-3" style={{ color: T.inkSoft, fontWeight: 500 }}>{s.short}</th>)}
                <th className="text-right py-2 pr-3" style={{ color: T.inkSoft, fontWeight: 500 }}>Rata²</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tryouts.slice().reverse().map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                  <td className="py-2 pr-3">{t.name}</td>
                  <td className="py-2 pr-3" style={{ color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{t.date}</td>
                  {SUBTES.map((s) => <td key={s.key} className="text-right py-2 pr-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.skor?.[s.key] || "—"}</td>)}
                  <td className="text-right py-2 pr-3 font-semibold" style={{ color: T.navy, fontFamily: "'IBM Plex Mono', monospace" }}>{avgSkor(t)}</td>
                  <td className="text-right py-2"><IconBtn onClick={() => remove(t.id)} danger><Trash2 size={14} /></IconBtn></td>
                </tr>
              ))}
              {tryouts.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-sm" style={{ color: T.inkSoft }}>Belum ada catatan try out.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </BlueprintCard>
    </div>
  );
}
