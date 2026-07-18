import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { avgSkor, migrateSkor } from "../lib/scoring";

const DAY_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function AdminMonitor() {
  const [students, setStudents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [studentRow, setStudentRow] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("role", "student")
        .order("email", { ascending: true });
      if (error) setError(error.message);
      else setStudents(data || []);
      setLoadingList(false);
    })();
  }, []);

  const loadStudent = async (id) => {
    setSelectedId(id);
    setLoadingData(true);
    setStudentRow(null);
    setError("");
    const { data, error } = await supabase
      .from("user_data")
      .select("data, updated_at")
      .eq("user_id", id)
      .maybeSingle();
    if (error) setError(error.message);
    else setStudentRow(data);
    setLoadingData(false);
  };

  const d = studentRow?.data;
  const tryouts = (d?.tryouts || []).map((t) => ({ ...t, skor: migrateSkor(t.skor) }));
  const lastTryout = tryouts[tryouts.length - 1];
  const materi = d?.materi || [];
  const schedule = d?.schedule || {};
  const config = d?.config || {};
  const doneMateri = materi.filter((m) => m.status === "selesai").length;
  const daysLeft = config.examDate ? Math.ceil((new Date(config.examDate) - new Date()) / 86400000) : null;

  return (
    <div>
      <Eyebrow>Pantau Anak</Eyebrow>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Progres Belajar Akun Terhubung
      </h1>

      {error && (
        <div className="text-sm mb-4" style={{ color: T.red }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        <BlueprintCard>
          <Eyebrow>Akun Student</Eyebrow>
          {loadingList ? (
            <div className="text-sm" style={{ color: T.inkSoft }}>Memuat…</div>
          ) : students.length === 0 ? (
            <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada akun student terdaftar.</div>
          ) : (
            <ul className="space-y-1 mt-1">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadStudent(s.id)}
                    className="w-full text-left px-2 py-1.5 text-sm truncate"
                    style={{
                      background: selectedId === s.id ? "rgba(44,125,160,0.12)" : "transparent",
                      color: selectedId === s.id ? T.navy : T.ink,
                      fontWeight: selectedId === s.id ? 600 : 500,
                    }}
                  >
                    {s.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BlueprintCard>

        <div>
          {!selectedId && (
            <BlueprintCard>
              <div className="text-sm" style={{ color: T.inkSoft }}>Pilih akun di sebelah kiri untuk melihat progresnya.</div>
            </BlueprintCard>
          )}

          {selectedId && loadingData && (
            <BlueprintCard>
              <div className="text-sm" style={{ color: T.inkSoft }}>Memuat data…</div>
            </BlueprintCard>
          )}

          {selectedId && !loadingData && !d && (
            <BlueprintCard>
              <div className="text-sm" style={{ color: T.inkSoft }}>
                Akun ini belum menyimpan data apa pun (belum pernah dipakai membuka aplikasi).
              </div>
            </BlueprintCard>
          )}

          {selectedId && !loadingData && d && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BlueprintCard>
                <Eyebrow>Hitung Mundur</Eyebrow>
                <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>
                  {daysLeft != null ? Math.max(daysLeft, 0) : "–"} <span className="text-base font-normal" style={{ color: T.inkSoft }}>hari</span>
                </div>
                <div className="text-xs mt-1" style={{ color: T.inkSoft }}>Target: {config.examDate || "belum diisi"}</div>
              </BlueprintCard>

              <BlueprintCard>
                <Eyebrow>Skor Try Out Terakhir</Eyebrow>
                {lastTryout ? (
                  <>
                    <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{avgSkor(lastTryout)}</div>
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
                <div className="text-xs mt-1" style={{ color: T.inkSoft }}>topik selesai</div>
              </BlueprintCard>

              <BlueprintCard className="md:col-span-3">
                <Eyebrow>Riwayat Try Out (5 terakhir)</Eyebrow>
                {tryouts.length === 0 ? (
                  <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada riwayat.</div>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {tryouts.slice(-5).reverse().map((t, i) => (
                      <li key={i} className="text-sm flex justify-between" style={{ color: T.ink }}>
                        <span>{t.name} · {t.date}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy, fontWeight: 600 }}>{avgSkor(t)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </BlueprintCard>

              <BlueprintCard className="md:col-span-3">
                <Eyebrow>Jadwal Minggu Ini</Eyebrow>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                  {DAY_ORDER.map((day) => {
                    const items = schedule[day] || [];
                    const done = items.filter((it) => it.done).length;
                    return (
                      <div key={day} className="text-sm">
                        <div style={{ color: T.inkSoft }}>{day}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy, fontWeight: 600 }}>{done}/{items.length}</div>
                      </div>
                    );
                  })}
                </div>
              </BlueprintCard>

              <BlueprintCard className="md:col-span-3">
                <Eyebrow>Materi Belum Selesai</Eyebrow>
                <ul className="mt-1 space-y-1.5">
                  {materi.filter((m) => m.status !== "selesai").slice(0, 6).map((m) => (
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

              <div className="md:col-span-3 text-xs" style={{ color: T.inkSoft }}>
                Data terakhir tersimpan: {studentRow?.updated_at ? new Date(studentRow.updated_at).toLocaleString("id-ID") : "–"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
