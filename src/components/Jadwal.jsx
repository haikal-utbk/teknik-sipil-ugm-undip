import React, { useState, useEffect, useRef } from "react";
import { Plus, Check, X, Bell, BellOff, Play, Pause, RotateCcw } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { requestNotificationPermission, isNotificationSupported, showNotification, playBeep } from "../lib/notify";

const uid = () => Math.random().toString(36).slice(2, 10);
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function Jadwal({ schedule, setSchedule, config, setConfig, notifEnabled, setNotifEnabled }) {
  const [inputs, setInputs] = useState({});

  const addItem = (day) => {
    const text = (inputs[day] || "").trim();
    if (!text) return;
    const list = schedule[day] || [];
    setSchedule({ ...schedule, [day]: [...list, { id: uid(), text, done: false }] });
    setInputs({ ...inputs, [day]: "" });
  };
  const toggle = (day, id) => {
    const list = (schedule[day] || []).map((it) => (it.id === id ? { ...it, done: !it.done } : it));
    setSchedule({ ...schedule, [day]: list });
  };
  const remove = (day, id) => {
    const list = (schedule[day] || []).filter((it) => it.id !== id);
    setSchedule({ ...schedule, [day]: list });
  };

  const enableNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifEnabled(perm === "granted");
  };

  return (
    <div>
      <Eyebrow>Perencanaan Mingguan</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Jadwal Belajar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BlueprintCard>
          <Eyebrow>Pengingat Harian</Eyebrow>
          <label className="block text-xs mb-2" style={{ color: T.inkSoft }}>
            Jam pengingat
            <input
              type="time"
              value={config.reminderTime || "19:00"}
              onChange={(e) => setConfig({ ...config, reminderTime: e.target.value })}
              className="block mt-1 border px-2 py-1.5 text-sm"
              style={{ borderColor: T.paperLine }}
            />
          </label>
          {!isNotificationSupported() ? (
            <div className="text-xs" style={{ color: T.inkSoft }}>Browser ini tidak mendukung notifikasi.</div>
          ) : notifEnabled ? (
            <button onClick={() => setNotifEnabled(false)} className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ background: T.teal, color: "#fff" }}>
              <Bell size={13} /> Pengingat aktif — klik untuk matikan
            </button>
          ) : (
            <button onClick={enableNotif} className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
              <BellOff size={13} /> Aktifkan pengingat browser
            </button>
          )}
          <div className="text-xs mt-2" style={{ color: T.inkSoft }}>
            Catatan: notifikasi ini hanya berbunyi selagi aplikasi terbuka di tab browser — bukan push notification yang jalan di background.
          </div>
        </BlueprintCard>

        <Pomodoro notifEnabled={notifEnabled} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => (
          <BlueprintCard key={day}>
            <Eyebrow>{day}</Eyebrow>
            <ul className="space-y-1.5 mb-3 min-h-[24px]">
              {(schedule[day] || []).map((it) => (
                <li key={it.id} className="flex items-start gap-2 text-sm group">
                  <button onClick={() => toggle(day, it.id)} className="mt-0.5 shrink-0" style={{ color: it.done ? T.teal : T.paperLine }}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                  <span className="flex-1" style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? T.inkSoft : T.ink }}>{it.text}</span>
                  <button onClick={() => remove(day, it.id)} style={{ color: T.red }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5">
              <input
                value={inputs[day] || ""}
                onChange={(e) => setInputs({ ...inputs, [day]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addItem(day)}
                placeholder="Tambah agenda…"
                className="flex-1 border px-2 py-1.5 text-sm min-w-0"
                style={{ borderColor: T.paperLine }}
              />
              <button onClick={() => addItem(day)} className="px-2" style={{ background: T.steel, color: "#fff" }}>
                <Plus size={15} />
              </button>
            </div>
          </BlueprintCard>
        ))}
      </div>
    </div>
  );
}

const PRESETS = [
  { label: "25 / 5", focus: 25 * 60, brk: 5 * 60 },
  { label: "50 / 10", focus: 50 * 60, brk: 10 * 60 },
];

function Pomodoro({ notifEnabled }) {
  const [preset, setPreset] = useState(0);
  const [mode, setMode] = useState("focus"); // "focus" | "break"
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].focus);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);

  const durationFor = (m, p = PRESETS[preset]) => (m === "focus" ? p.focus : p.brk);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      playBeep();
      const nextMode = mode === "focus" ? "break" : "focus";
      if (mode === "focus") setCycles((c) => c + 1);
      if (notifEnabled) {
        showNotification(
          nextMode === "break" ? "Waktunya istirahat" : "Waktunya fokus lagi",
          nextMode === "break" ? "Sesi fokus selesai, ambil jeda sebentar." : "Jeda selesai, lanjut belajar."
        );
      }
      setMode(nextMode);
      setSecondsLeft(durationFor(nextMode));
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secondsLeft, mode]);

  const changePreset = (i) => {
    setPreset(i);
    setMode("focus");
    setSecondsLeft(PRESETS[i].focus);
    setRunning(false);
  };
  const reset = () => {
    setMode("focus");
    setSecondsLeft(PRESETS[preset].focus);
    setRunning(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <BlueprintCard>
      <Eyebrow>Fokus Belajar (Pomodoro)</Eyebrow>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1.5">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => changePreset(i)} className="px-2 py-1 text-xs" style={{ background: preset === i ? T.navy : "#fff", color: preset === i ? "#fff" : T.inkSoft, border: `1px solid ${preset === i ? T.navy : T.paperLine}` }}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: T.inkSoft }}>{mode === "focus" ? "Fokus" : "Istirahat"} · siklus ke-{cycles + 1}</span>
      </div>
      <div className="text-4xl font-bold text-center py-2" style={{ fontFamily: "'IBM Plex Mono', monospace", color: mode === "focus" ? T.navy : T.teal }}>
        {mm}:{ss}
      </div>
      <div className="flex justify-center gap-2 mt-2">
        <button onClick={() => setRunning((r) => !r)} className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
          {running ? <Pause size={13} /> : <Play size={13} />} {running ? "Jeda" : "Mulai"}
        </button>
        <button onClick={reset} className="px-3 py-1.5 text-xs font-medium flex items-center gap-1.5" style={{ border: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>
    </BlueprintCard>
  );
}
