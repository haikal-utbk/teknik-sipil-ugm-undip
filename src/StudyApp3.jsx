import React, { useState, useEffect, useRef } from "react";
import {
  CalendarClock, ClipboardList, LineChart as LineChartIcon,
  BookOpenCheck, HelpCircle, LogOut, Target, Users,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { migrateSkor } from "./lib/scoring";
import { T } from "./tokens";
import { showNotification } from "./lib/notify";
import Dashboard from "./components/Dashboard";
import Jadwal from "./components/Jadwal";
import TryOut from "./components/TryOut";
import Materi from "./components/Materi";
import BankSoal from "./components/BankSoal";
import Analitik from "./components/Analitik";
import AdminMonitor from "./components/AdminMonitor";

const DEFAULT_CONFIG = {
  examDate: "2027-04-25",
  target1: "Teknik Sipil UGM",
  target2: "Teknik Sipil UNDIP",
  reminderTime: "19:00",
  studySlots: [
    { label: "Sore", start: "16:00", end: "17:30" },
    { label: "Malam", start: "19:30", end: "21:00" },
  ],
};
const DEFAULT_DATA = { config: DEFAULT_CONFIG, schedule: {}, tryouts: [], materi: [], reminder: "", soalHistory: [], notifEnabled: false, studyLog: [], soalRequests: [], topicStats: {} };

const todayName = () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date().getDay()];

// ---------- Aplikasi utama (data disimpan di tabel Supabase, per akun) ----------
export default function StudyApp({ session }) {
  const userId = session.user.id;
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(DEFAULT_DATA);
  const [role, setRole] = useState("student");
  const [bankSoalFilter, setBankSoalFilter] = useState(null);
  const [bankSoalAction, setBankSoalAction] = useState(null);
  const goToBankSoal = (subtesShort) => {
    setBankSoalFilter(subtesShort);
    setBankSoalAction(null);
    setTab("soal");
  };
  // Tombol "Kerjakan" di agenda Jadwal Otomatis — buka sesi yang sesuai di Bank Soal.
  const startAgenda = (link) => {
    if (!link) return;
    if (link.type === "materi") { setTab("materi"); return; }
    if (link.type === "simulasi") { setBankSoalAction("simulasi"); setBankSoalFilter(null); setTab("soal"); return; }
    if (link.type === "subtes") { setBankSoalFilter(link.subtes); setBankSoalAction(null); setTab("soal"); return; }
    // "review": tidak bisa langsung di-deep-link (butuh soal salah dari sesi terakhir),
    // cukup buka Bank Soal supaya bisa dipilih manual.
    setBankSoalFilter(null); setBankSoalAction(null); setTab("soal");
  };
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);
  const lastNotifiedDate = useRef(null);
  const prevSoalHistoryLenRef = useRef(null);

  // Muat data user dari Supabase saat pertama kali masuk
  useEffect(() => {
    (async () => {
      const { data: row, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && row?.data) {
        const tryouts = (row.data.tryouts || []).map((t) => ({ ...t, skor: migrateSkor(t.skor) }));
        setData({ ...DEFAULT_DATA, ...row.data, tryouts, config: { ...DEFAULT_CONFIG, ...row.data.config } });
      }
      firstLoad.current = false;
      setLoaded(true);
    })();
  }, [userId]);

  // Cek role akun (admin/student) — kalau tabel profiles belum ada (migrasi
  // belum dijalankan), diamkan saja dan tetap perlakukan sebagai student.
  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.role === "admin") setRole("admin");
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
  const setSoalHistory = (v) => setData((d) => ({ ...d, soalHistory: typeof v === "function" ? v(d.soalHistory) : v }));
  const setNotifEnabled = (v) => setData((d) => ({ ...d, notifEnabled: typeof v === "function" ? v(d.notifEnabled) : v }));
  const setStudyLog = (v) => setData((d) => ({ ...d, studyLog: typeof v === "function" ? v(d.studyLog || []) : v }));
  const setSoalRequests = (v) => setData((d) => ({ ...d, soalRequests: typeof v === "function" ? v(d.soalRequests || []) : v }));
  const setTopicStats = (v) => setData((d) => ({ ...d, topicStats: typeof v === "function" ? v(d.topicStats || {}) : v }));

  const { config, schedule, tryouts, materi, reminder, soalHistory, notifEnabled, studyLog, soalRequests, topicStats } = data;

  // Begitu sesi Bank Soal selesai (entri baru di soalHistory), cocokkan dengan agenda
  // hari ini yang punya link ke sesi itu (subtes/simulasi/review) dan tandai selesai.
  useEffect(() => {
    if (!loaded) return;
    if (prevSoalHistoryLenRef.current === null || soalHistory.length <= prevSoalHistoryLenRef.current) {
      prevSoalHistoryLenRef.current = soalHistory.length;
      return;
    }
    prevSoalHistoryLenRef.current = soalHistory.length;
    const last = soalHistory[soalHistory.length - 1];
    if (!last?.sessionType) return;
    const day = todayName();
    const todays = schedule[day] || [];
    const matchIdx = todays.findIndex((it) => {
      if (it.done || !it.link) return false;
      if (last.sessionType === "full") return it.link.type === "simulasi";
      if (last.sessionType === "subtes") return it.link.type === "subtes" && it.link.subtes === last.sessionSubtes;
      if (last.sessionType === "review") return it.link.type === "review";
      return false;
    });
    if (matchIdx === -1) return;
    setSchedule({ ...schedule, [day]: todays.map((it, i) => (i === matchIdx ? { ...it, done: true } : it)) });
    const todayDate = new Date().toISOString().slice(0, 10);
    setStudyLog((log) => ((log || []).includes(todayDate) ? log : [...(log || []), todayDate]));
  }, [soalHistory, loaded]);

  // Cek tiap menit apakah sudah waktunya kirim pengingat harian (hanya selagi tab terbuka)
  useEffect(() => {
    if (!loaded) return;
    const check = () => {
      if (!notifEnabled || Notification?.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayKey = now.toISOString().slice(0, 10);
      if (hhmm === (config.reminderTime || "19:00") && lastNotifiedDate.current !== todayKey) {
        lastNotifiedDate.current = todayKey;
        const belum = (schedule[todayName()] || []).filter((it) => !it.done);
        const body = belum.length ? belum.map((it) => it.text).join(", ") : "Semua agenda hari ini sudah selesai — mantap!";
        showNotification("Pengingat belajar hari ini", body);
      }
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [loaded, notifEnabled, config.reminderTime, schedule]);

  const daysLeft = (() => {
    const now = new Date();
    const exam = new Date(config.examDate);
    return Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
  })();

  const navItems = [
    { id: "dashboard", label: "Dasbor", icon: CalendarClock },
    { id: "jadwal", label: "Jadwal Belajar", icon: ClipboardList },
    { id: "tryout", label: "Tracker Try Out", icon: LineChartIcon },
    { id: "analitik", label: "Analitik", icon: Target },
    { id: "materi", label: "Target Materi", icon: BookOpenCheck },
    { id: "soal", label: "Bank Soal", icon: HelpCircle },
    ...(role === "admin" ? [{ id: "pantau", label: "Pantau Anak", icon: Users }] : []),
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around p-2 z-10 overflow-x-auto" style={{ background: T.navy }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className="flex flex-col items-center gap-1 px-2 py-1 shrink-0" style={{ color: active ? "#FFFFFF" : "#8FA3B3" }}>
              <Icon size={18} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center gap-1 px-2 py-1 shrink-0" style={{ color: "#8FA3B3" }}>
          <LogOut size={18} />
          <span className="text-[10px]">Keluar</span>
        </button>
      </div>

      <div className="flex-1 p-6 md:p-10 pb-24 md:pb-10 overflow-auto">
        {tab === "dashboard" && <Dashboard config={config} setConfig={setConfig} daysLeft={daysLeft} tryouts={tryouts} materi={materi} schedule={schedule} reminder={reminder} setReminder={setReminder} />}
        {tab === "jadwal" && <Jadwal schedule={schedule} setSchedule={setSchedule} config={config} setConfig={setConfig} notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled} studyLog={studyLog} setStudyLog={setStudyLog} onStartAgenda={startAgenda} />}
        {tab === "tryout" && <TryOut tryouts={tryouts} setTryouts={setTryouts} />}
        {tab === "analitik" && <Analitik tryouts={tryouts} materi={materi} config={config} soalHistory={soalHistory} onFocusSubtes={goToBankSoal} />}
        {tab === "materi" && <Materi materi={materi} setMateri={setMateri} topicStats={topicStats} />}
        {tab === "soal" && <BankSoal soalHistory={soalHistory} setSoalHistory={setSoalHistory} initialFilter={bankSoalFilter} initialAction={bankSoalAction} soalRequests={soalRequests} setSoalRequests={setSoalRequests} tryouts={tryouts} setTryouts={setTryouts} topicStats={topicStats} setTopicStats={setTopicStats} />}
        {tab === "pantau" && role === "admin" && <AdminMonitor />}
      </div>
    </div>
  );
}
