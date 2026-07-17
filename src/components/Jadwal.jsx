import React, { useState, useEffect, useRef } from "react";
import { Plus, Check, X, Bell, BellOff, Play, Pause, RotateCcw, Flame, Wand2, ArrowRight } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";
import { requestNotificationPermission, isNotificationSupported, showNotification, playBeep } from "../lib/notify";

const uid = () => Math.random().toString(36).slice(2, 10);
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const todayKey = () => new Date().toISOString().slice(0, 10);
const todayDayName = () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];

const DEFAULT_STUDY_SLOTS = [
  { label: "Sore", start: "16:00", end: "17:30" },
  { label: "Malam", start: "19:30", end: "21:00" },
];

// Pola mingguan default — berulang otomatis tiap minggu sampai H-1 UTBK (bukan 282
// entri tanggal satu-satu, supaya ringan & tetap gampang diedit manual). Subtes
// kuantitatif (PU/PK/PM) sengaja lebih sering muncul karena relevan untuk Teknik Sipil
// — lihat juga kartu "Kelompok Prioritas" di Analitik. Minggu diisi Simulasi Penuh
// (blok panjang ±3 jam 15 menit, tidak dipaksa ke slot sore/malam biasa).
const AUTO_SCHEDULE_ROTATION = {
  Senin: ["PU", "PM"],
  Selasa: ["LBI", "PK"],
  Rabu: ["PBM", "PU"],
  Kamis: ["LBE", "PM"],
  Jumat: ["PPU", "PK"],
  Sabtu: ["REVIEW", "MATERI"],
  Minggu: ["SIMULASI"],
};

function autoItemText(code) {
  if (code === "REVIEW") return "Review dan bahas ulang soal yang salah dari sesi latihan sebelumnya";
  if (code === "MATERI") return "Belajar materi baru 30-45 menit (cek Target Materi)";
  if (code === "SIMULASI") return "Simulasi Penuh 1 Paket Latihan di Bank Soal (blok panjang, ±3 jam 15 menit — atur sendiri jam mulainya)";
  const s = SUBTES.find((x) => x.short === code);
  return s ? `Latihan subtes ${s.label} (${s.short})` : code;
}

// Menghubungkan agenda hasil generate ke aksi konkret di Bank Soal — dipakai tombol
// "Kerjakan" dan untuk mencocokkan otomatis kapan agenda itu selesai dikerjakan.
function autoItemLink(code) {
  if (code === "SIMULASI") return { type: "simulasi" };
  if (code === "REVIEW") return { type: "review" };
  if (code === "MATERI") return { type: "materi" };
  return { type: "subtes", subtes: code };
}

// Pola belajar mandiri/bimbel yang terbukti efektif: latihan aktif per subtes (retrieval
// practice), review kesalahan, mempelajari materi baru, dan simulasi ujian berkala.
// Disediakan sebagai pilihan cepat supaya agenda tetap terarah tanpa perlu mengetik.
const QUICK_AGENDA_GROUPS = [
  {
    group: "Latihan Soal (Paket Latihan)",
    items: [
      "Latihan subtes Penalaran Umum (PU)",
      "Latihan subtes Pengetahuan & Pemahaman Umum (PPU)",
      "Latihan subtes Pemahaman Bacaan & Menulis (PBM)",
      "Latihan subtes Pengetahuan Kuantitatif (PK)",
      "Latihan subtes Literasi Bahasa Indonesia (LBI)",
      "Latihan subtes Literasi Bahasa Inggris (LBE)",
      "Latihan subtes Penalaran Matematika (PM)",
      "Simulasi Penuh 1 Paket Latihan (±3 jam 15 menit)",
    ],
  },
  {
    group: "Review & Evaluasi",
    items: [
      "Review dan bahas ulang soal yang salah dari sesi latihan sebelumnya",
      "Cek Analitik: lihat subtes terlemah & progres try out",
    ],
  },
  {
    group: "Belajar Materi",
    items: [
      "Belajar materi baru 30-45 menit (cek Target Materi)",
      "Hafalan rumus / kosakata penting 15 menit",
    ],
  },
];

// Streak beruntun: hitung mundur dari hari ini (atau kemarin kalau hari ini belum ada
// agenda yang dicentang, biar streak tidak langsung putus sebelum hari berakhir).
function computeStreak(studyLog) {
  const set = new Set(studyLog || []);
  const today = todayKey();
  const doneToday = set.has(today);
  const cursor = new Date();
  if (!doneToday) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, doneToday };
}

export default function Jadwal({ schedule, setSchedule, config, setConfig, notifEnabled, setNotifEnabled, studyLog, setStudyLog, onStartAgenda }) {
  const [inputs, setInputs] = useState({});
  const { streak, doneToday } = computeStreak(studyLog);

  const addItem = (day) => {
    const text = (inputs[day] || "").trim();
    if (!text) return;
    const list = schedule[day] || [];
    setSchedule({ ...schedule, [day]: [...list, { id: uid(), text, done: false }] });
    setInputs({ ...inputs, [day]: "" });
  };
  const addPreset = (day, text) => {
    const list = schedule[day] || [];
    setSchedule({ ...schedule, [day]: [...list, { id: uid(), text, done: false }] });
  };

  const studySlots = config.studySlots || DEFAULT_STUDY_SLOTS;
  const setSlotTime = (i, field, value) => {
    const next = studySlots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    setConfig({ ...config, studySlots: next });
  };
  const generateAutoSchedule = () => {
    const slots = studySlots;
    const next = {};
    DAYS.forEach((day) => {
      const codes = AUTO_SCHEDULE_ROTATION[day] || [];
      next[day] = codes.map((code, i) => {
        const prefix = code === "SIMULASI" ? "" : `${slots[i]?.start || "?"}–${slots[i]?.end || "?"} — `;
        return { id: uid(), text: `${prefix}${autoItemText(code)}`, done: false, link: autoItemLink(code) };
      });
    });
    setSchedule(next);
  };
  const toggle = (day, id) => {
    let willBeDone = false;
    const list = (schedule[day] || []).map((it) => {
      if (it.id !== id) return it;
      willBeDone = !it.done;
      return { ...it, done: willBeDone };
    });
    setSchedule({ ...schedule, [day]: list });
    if (willBeDone && setStudyLog) {
      const today = todayKey();
      setStudyLog((log) => (log.includes(today) ? log : [...log, today]));
    }
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BlueprintCard>
          <Eyebrow>Streak Konsistensi</Eyebrow>
          <div className="flex items-baseline gap-2">
            <Flame size={28} color={streak > 0 ? T.amber : T.paperLine} />
            <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: streak > 0 ? T.navy : T.inkSoft }}>{streak}</div>
            <div className="text-sm" style={{ color: T.inkSoft }}>hari beruntun</div>
          </div>
          <div className="text-xs mt-3" style={{ color: doneToday ? T.teal : T.inkSoft }}>
            {doneToday ? "Sudah checklist agenda hari ini — mantap!" : "Belum ada agenda yang dicentang hari ini."}
          </div>
        </BlueprintCard>

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

      <BlueprintCard className="mb-6">
        <Eyebrow>Jadwal Otomatis</Eyebrow>
        <div className="text-sm mb-3" style={{ color: T.ink }}>
          Buat pola belajar mingguan sekali klik — Senin–Jumat diisi latihan subtes (diseringkan ke PU/PK/PM karena relevan untuk Teknik Sipil), Sabtu untuk review & materi, Minggu untuk Simulasi Penuh. Atur dulu slot waktunya, lalu klik generate. Setelah dibuat, pola ini sepenuhnya milikmu — bisa diedit bebas dan tidak akan tertimpa otomatis.
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          {studySlots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-10" style={{ color: T.inkSoft }}>{slot.label}</span>
              <input type="time" value={slot.start} onChange={(e) => setSlotTime(i, "start", e.target.value)} className="border px-2 py-1 text-sm" style={{ borderColor: T.paperLine }} />
              <span className="text-xs" style={{ color: T.inkSoft }}>–</span>
              <input type="time" value={slot.end} onChange={(e) => setSlotTime(i, "end", e.target.value)} className="border px-2 py-1 text-sm" style={{ borderColor: T.paperLine }} />
            </div>
          ))}
        </div>
        <button onClick={generateAutoSchedule} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.navy, color: "#fff" }}>
          <Wand2 size={14} /> Buat Jadwal Otomatis
        </button>
        <div className="text-xs mt-2" style={{ color: T.inkSoft }}>
          Perhatian: ini mengganti seluruh agenda yang sudah ada di ketujuh hari dengan pola default di atas.
        </div>
      </BlueprintCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const isToday = day === todayDayName();
          return (
          <BlueprintCard key={day} style={!isToday ? { opacity: 0.55 } : undefined}>
            <div className="flex items-center justify-between mb-2">
              <Eyebrow>{day}</Eyebrow>
              {!isToday && <span className="text-[10px]" style={{ color: T.inkSoft }}>Terkunci — bukan hari ini</span>}
            </div>
            <div style={!isToday ? { pointerEvents: "none" } : undefined}>
            <ul className="space-y-1.5 mb-3 min-h-[24px]">
              {(schedule[day] || []).map((it) => (
                <li key={it.id} className="flex items-start gap-2 text-sm group">
                  <button onClick={() => toggle(day, it.id)} className="mt-0.5 shrink-0" style={{ color: it.done ? T.teal : T.paperLine }}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                  <span className="flex-1" style={{ textDecoration: it.done ? "line-through" : "none", color: it.done ? T.inkSoft : T.ink }}>{it.text}</span>
                  {it.link && !it.done && onStartAgenda && (
                    <button onClick={() => onStartAgenda(it.link)} className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5" style={{ background: T.steel, color: "#fff" }}>
                      Kerjakan <ArrowRight size={10} />
                    </button>
                  )}
                  <button onClick={() => remove(day, it.id)} style={{ color: T.red }} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addPreset(day, e.target.value);
                e.target.value = "";
              }}
              className="w-full border px-2 py-1.5 text-sm mb-1.5"
              style={{ borderColor: T.paperLine, color: T.inkSoft }}
            >
              <option value="" disabled>+ Pilihan cepat (tanpa ketik)…</option>
              {QUICK_AGENDA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((text) => <option key={text} value={text}>{text}</option>)}
                </optgroup>
              ))}
            </select>
            <div className="flex gap-1.5">
              <input
                value={inputs[day] || ""}
                onChange={(e) => setInputs({ ...inputs, [day]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addItem(day)}
                placeholder="…atau tulis agenda sendiri"
                className="flex-1 border px-2 py-1.5 text-sm min-w-0"
                style={{ borderColor: T.paperLine }}
              />
              <button onClick={() => addItem(day)} className="px-2" style={{ background: T.steel, color: "#fff" }}>
                <Plus size={15} />
              </button>
            </div>
            </div>
          </BlueprintCard>
          );
        })}
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
