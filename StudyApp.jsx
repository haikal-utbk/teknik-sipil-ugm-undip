import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Plus, Trash2, CalendarClock, ClipboardList, LineChart as LineChartIcon,
  BookOpenCheck, X, Check, HelpCircle, RefreshCw, StickyNote, LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { T, BlueprintCard, Eyebrow, IconBtn } from "./tokens";

const SUBTES = [
  { key: "pk", label: "Penalaran Umum", short: "PU", max: 1000 },
  { key: "pm", label: "Penalaran Matematika", short: "PM", max: 1000 },
  { key: "li", label: "Literasi B. Indonesia", short: "LI", max: 1000 },
  { key: "le", label: "Literasi B. Inggris", short: "LE", max: 1000 },
];

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const DEFAULT_CONFIG = { examDate: "2027-04-25", target1: "Teknik Sipil UGM", target2: "Teknik Sipil UNDIP" };

const REFERENSI_SKOR = [
  { kampus: "Teknik Sipil — UGM", estimasi: "≈ 710 (skala 1000)", catatan: "Estimasi crowdsourcing tahun 2025" },
  { kampus: "Teknik Sipil — UNDIP", estimasi: "≈ 600–700 (skala 1000)", catatan: "Kisaran dari survei alumni/mahasiswa tahun 2025" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const todayName = () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];

const QUESTION_BANK = [
  { id: "q1", subtes: "PU", q: "Semua insinyur sipil paham struktur beton. Andi adalah insinyur sipil. Kesimpulan yang tepat:", opts: ["Andi paham struktur beton", "Andi tidak paham struktur beton", "Andi mungkin paham struktur beton", "Tidak bisa disimpulkan"], answer: 0 },
  { id: "q2", subtes: "PU", q: "Jika semua yang lulus UTBK rajin belajar, dan Rani rajin belajar, maka…", opts: ["Rani pasti lulus UTBK", "Rani belum tentu lulus UTBK", "Rani tidak lulus UTBK", "Rani bukan peserta UTBK"], answer: 1 },
  { id: "q3", subtes: "PU", q: "Manakah pola yang melanjutkan deret: 2, 6, 12, 20, 30, ...?", opts: ["36", "40", "42", "44"], answer: 2 },
  { id: "q4", subtes: "PM", q: "Sebuah balok beton berukuran panjang 4 m, lebar 0,3 m, tinggi 0,5 m. Volumenya adalah…", opts: ["0,6 m³", "0,8 m³", "1,2 m³", "6 m³"], answer: 0 },
  { id: "q5", subtes: "PM", q: "Jika kemiringan (gradien) suatu jalan adalah 1:20, maka untuk kenaikan 2 m dibutuhkan jarak mendatar…", opts: ["10 m", "20 m", "40 m", "60 m"], answer: 2 },
  { id: "q6", subtes: "PM", q: "Suatu proyek dikerjakan 8 pekerja selesai dalam 15 hari. Jika ingin selesai dalam 10 hari, jumlah pekerja yang dibutuhkan adalah…", opts: ["10", "12", "14", "16"], answer: 1 },
  { id: "q7", subtes: "LI", q: "Kata 'infrastruktur' dalam sebuah teks tentang pembangunan jalan tol paling tepat dimaknai sebagai…", opts: ["Hiasan kota", "Fasilitas dan sarana dasar penunjang kegiatan", "Jenis kendaraan berat", "Dokumen perizinan"], answer: 1 },
  { id: "q8", subtes: "LI", q: "Manakah kalimat yang paling efektif dan baku?", opts: ["Dari hasil survey menunjukkan bahwa jalan tersebut rusak", "Hasil survei menunjukkan bahwa jalan tersebut rusak", "Survei tersebut hasilnya jalan itu rusak menunjukkan", "Menunjukkan hasil survei jalan itu rusak"], answer: 1 },
  { id: "q9", subtes: "LE", q: "Choose the correct sentence:", opts: ["The bridge were built in 1998.", "The bridge was built in 1998.", "The bridge building in 1998.", "The bridge has build in 1998."], answer: 1 },
  { id: "q10", subtes: "LE", q: "\"The structure's durability depends heavily on the quality of its foundation.\" The word 'durability' is closest in meaning to:", opts: ["Beauty", "Cost", "Ability to last", "Weight"], answer: 2 },
];

const DEFAULT_DATA = { config: DEFAULT_CONFIG, schedule: {}, tryouts: [], materi: [], reminder: "" };

// ---------- Aplikasi utama (data disimpan di tabel Supabase, per akun) ----------
export default function StudyApp({ session }) {
  const userId = session.user.id;
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(DEFAULT_DATA);
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

  // Muat data user dari Supabase saat pertama kali masuk
  useEffect(() => {
    (async () => {
      const { data: row, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && row?.data) {
        setData({ ...DEFAULT_DATA, ...row.data });
      }
      firstLoad.current = false;
      setLoaded(true);
    })();
  }, [userId]);

  // Simpan otomatis (debounce 700ms) setiap kali data berubah
  useEffect(() => {
    if (!loaded || firstLoad.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("user_data").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded, userId]);

  const setConfig = (v) => setData((d) => ({ ...d, config: typeof v === "function" ? v(d.config) : v }));
  const setSchedule = (v) => setData((d) => ({ ...d, schedule: typeof v === "function" ? v(d.schedule) : v }));
  const setTryouts = (v) => setData((d) => ({ ...d, tryouts: typeof v === "function" ? v(d.tryouts) : v }));
  const setMateri = (v) => setData((d) => ({ ...d, materi: typeof v === "function" ? v(d.materi) : v }));
  const setReminder = (v) => setData((d) => ({ ...d, reminder: typeof v === "function" ? v(d.reminder) : v }));

  const { config, schedule, tryouts, materi, reminder } = data;

  const daysLeft = (() => {
    const now = new Date();
    const exam = new Date(config.examDate);
    return Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
  })();

  const navItems = [
    { id: "dashboard", label: "Dasbor", icon: CalendarClock },
    { id: "jadwal", label: "Jadwal Belajar", icon: ClipboardList },
    { id: "tryout", label: "Tracker Try Out", icon: LineChartIcon },
    { id: "materi", label: "Target Materi", icon: BookOpenCheck },
    { id: "soal", label: "Bank Soal", icon: HelpCircle },
  ];

  if (!loaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.paper }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.steel }}>Memuat data…</div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex"
      style={{
        minHeight: "100vh",
        background: T.paper,
        backgroundImage: `linear-gradient(${T.paperLine} 1px, transparent 1px), linear-gradient(90deg, ${T.paperLine} 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        fontFamily: "'Inter', sans-serif",
        color: T.ink,
      }}
    >
      <style>{`input, select { font-family: 'Inter', sans-serif; } ::placeholder { color: #9AA7B0; }`}</style>

      <div className="hidden md:flex flex-col w-56 shrink-0 p-6" style={{ background: T.navy, color: "#EAF2F8" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-bold mb-1">Rencana Studi</div>
        <div className="text-xs mb-1" style={{ color: T.steelLight, fontFamily: "'IBM Plex Mono', monospace" }}>UTBK-SNBT · Teknik Sipil</div>
        <div className="text-xs mb-8 truncate" style={{ color: "#8FA3B3" }}>{session.user.email}</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors"
                style={{
                  background: active ? "rgba(95,168,211,0.18)" : "transparent",
                  color: active ? "#FFFFFF" : "#B9C9D6",
                  borderLeft: active ? `3px solid ${T.steelLight}` : "3px solid transparent",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-8" style={{ borderTop: `1px solid rgba(255,255,255,0.12)` }}>
          <div className="text-xs" style={{ color: T.steelLight, fontFamily: "'IBM Plex Mono', monospace" }}>H-{daysLeft >= 0 ? daysLeft : 0}</div>
          <div className="text-xs mt-1 mb-3" style={{ color: "#8FA3B3" }}>menuju UTBK</div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 text-xs" style={{ color: "#8FA3B3" }}>
            <LogOut size={12} /> Keluar
          </button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around p-2 z-10" style={{ background: T.navy }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-center gap-1 px-2 py-1" style={{ color: active ? "#FFFFFF" : "#8FA3B3" }}>
              <Icon size={18} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center gap-1 px-2 py-1" style={{ color: "#8FA3B3" }}>
          <LogOut size={18} />
          <span className="text-[10px]">Keluar</span>
        </button>
      </div>

      <div className="flex-1 p-6 md:p-10 pb-24 md:pb-10 overflow-auto">
        {tab === "dashboard" && <Dashboard config={config} setConfig={setConfig} daysLeft={daysLeft} tryouts={tryouts} materi={materi} schedule={schedule} reminder={reminder} setReminder={setReminder} />}
        {tab === "jadwal" && <Jadwal schedule={schedule} setSchedule={setSchedule} />}
        {tab === "tryout" && <TryOut tryouts={tryouts} setTryouts={setTryouts} />}
        {tab === "materi" && <Materi materi={materi} setMateri={setMateri} />}
        {tab === "soal" && <BankSoal />}
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ config, setConfig, daysLeft, tryouts, materi, schedule, reminder, setReminder }) {
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

// ---------- Jadwal Belajar ----------
function Jadwal({ schedule, setSchedule }) {
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

  return (
    <div>
      <Eyebrow>Perencanaan Mingguan</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Jadwal Belajar</h1>
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

// ---------- Tracker Try Out ----------
function TryOut({ tryouts, setTryouts }) {
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
              {tryouts.slice().reverse().map((t) => {
                const vals = SUBTES.map((s) => Number(t.skor?.[s.key] || 0));
                const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                    <td className="py-2 pr-3">{t.name}</td>
                    <td className="py-2 pr-3" style={{ color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{t.date}</td>
                    {SUBTES.map((s) => <td key={s.key} className="text-right py-2 pr-3" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.skor?.[s.key] || "—"}</td>)}
                    <td className="text-right py-2 pr-3 font-semibold" style={{ color: T.navy, fontFamily: "'IBM Plex Mono', monospace" }}>{avg}</td>
                    <td className="text-right py-2"><IconBtn onClick={() => remove(t.id)} danger><Trash2 size={14} /></IconBtn></td>
                  </tr>
                );
              })}
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

// ---------- Target Materi ----------
const STATUS_OPTS = [
  { v: "belum", label: "Belum mulai", color: "#9AA7B0" },
  { v: "proses", label: "Sedang dipelajari", color: T.amber },
  { v: "selesai", label: "Selesai", color: T.teal },
];

function Materi({ materi, setMateri }) {
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

// ---------- Bank Soal ----------
function BankSoal() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [filter, setFilter] = useState("Semua");

  const questions = filter === "Semua" ? QUESTION_BANK : QUESTION_BANK.filter((q) => q.subtes === filter);
  const current = questions[idx];

  const choose = (i) => {
    setSelected(i);
    setAnswers({ ...answers, [current.id]: i });
  };
  const next = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setSelected(answers[questions[idx + 1]?.id] ?? null);
    } else setFinished(true);
  };
  const prev = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setSelected(answers[questions[idx - 1]?.id] ?? null);
    }
  };
  const restart = () => { setIdx(0); setSelected(null); setAnswers({}); setFinished(false); };
  const changeFilter = (f) => { setFilter(f); setIdx(0); setSelected(null); setAnswers({}); setFinished(false); };

  const score = Object.entries(answers).reduce((acc, [qid, ans]) => {
    const q = QUESTION_BANK.find((x) => x.id === qid);
    return acc + (q && q.answer === ans ? 1 : 0);
  }, 0);

  if (!current && !finished) {
    return (
      <div>
        <Eyebrow>Latihan Soal</Eyebrow>
        <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bank Soal</h1>
        <BlueprintCard><div className="text-sm" style={{ color: T.inkSoft }}>Tidak ada soal untuk kategori ini.</div></BlueprintCard>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Latihan Soal</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bank Soal Sederhana</h1>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>Contoh soal singkat untuk pemanasan — bukan pengganti try out resmi.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {["Semua", ...SUBTES.map((s) => s.short)].map((f) => (
          <button key={f} onClick={() => changeFilter(f)} className="px-3 py-1 text-xs font-medium" style={{ background: filter === f ? T.navy : "#fff", color: filter === f ? "#fff" : T.inkSoft, border: `1px solid ${filter === f ? T.navy : T.paperLine}` }}>
            {f}
          </button>
        ))}
      </div>

      {!finished ? (
        <BlueprintCard>
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Soal {idx + 1} / {questions.length} · {current.subtes}</Eyebrow>
            <button onClick={restart} className="text-xs flex items-center gap-1" style={{ color: T.steel }}>
              <RefreshCw size={12} /> Ulangi
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: T.ink, lineHeight: 1.6 }}>{current.q}</p>
          <div className="space-y-2">
            {current.opts.map((opt, i) => (
              <button key={i} onClick={() => choose(i)} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2" style={{ border: `1px solid ${selected === i ? T.steel : T.paperLine}`, background: selected === i ? "rgba(44,125,160,0.08)" : "#fff", color: T.ink }}>
                <span className="w-5 h-5 flex items-center justify-center text-xs shrink-0" style={{ border: `1px solid ${selected === i ? T.steel : T.paperLine}`, color: selected === i ? T.steel : T.inkSoft }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={prev} disabled={idx === 0} className="px-3 py-1.5 text-sm" style={{ color: idx === 0 ? T.paperLine : T.inkSoft, border: `1px solid ${T.paperLine}` }}>Sebelumnya</button>
            <button onClick={next} disabled={selected === null} className="px-4 py-1.5 text-sm font-medium" style={{ background: selected === null ? T.paperLine : T.steel, color: "#fff" }}>
              {idx === questions.length - 1 ? "Selesai" : "Selanjutnya"}
            </button>
          </div>
        </BlueprintCard>
      ) : (
        <BlueprintCard>
          <Eyebrow>Hasil</Eyebrow>
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{score} / {questions.length}</div>
          <div className="text-sm mb-4" style={{ color: T.inkSoft }}>jawaban benar</div>
          <div className="space-y-3">
            {questions.map((q) => {
              const ans = answers[q.id];
              const correct = ans === q.answer;
              return (
                <div key={q.id} className="text-sm pb-3" style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                  <div style={{ color: T.ink }}>{q.q}</div>
                  <div className="text-xs mt-1" style={{ color: correct ? T.teal : T.red }}>
                    Jawabanmu: {ans != null ? q.opts[ans] : "(belum dijawab)"} {correct ? "— benar" : `— kunci: ${q.opts[q.answer]}`}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={restart} className="mt-4 px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
            <RefreshCw size={13} /> Ulangi Latihan
          </button>
        </BlueprintCard>
      )}
    </div>
  );
}
