import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES, TARGETS, avgSkor, gapToTarget, linearProjection, migrateSkor } from "../lib/scoring";

const DAY_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const STATUS_LABEL = { belum: "Belum mulai", proses: "Sedang dipelajari", selesai: "Selesai" };
const STATUS_COLOR = { belum: "#9AA7B0", proses: T.amber, selesai: T.teal };

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
  const config = d?.config || {};
  const materi = d?.materi || [];
  const schedule = d?.schedule || {};
  const topicStats = d?.topicStats || {};
  const soalHistory = d?.soalHistory || [];
  const reminder = d?.reminder || "";
  const tryouts = (d?.tryouts || []).map((t) => ({ ...t, skor: migrateSkor(t.skor) })).slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastTryout = tryouts[tryouts.length - 1];
  const prevTryout = tryouts[tryouts.length - 2];
  const avgLatest = avgSkor(lastTryout);
  const avgPrev = avgSkor(prevTryout);
  const delta = avgLatest != null && avgPrev != null ? avgLatest - avgPrev : null;
  const projection = lastTryout ? linearProjection(tryouts, config.examDate) : null;

  const doneMateri = materi.filter((m) => m.status === "selesai").length;
  const daysLeft = config.examDate ? Math.ceil((new Date(config.examDate) - new Date()) / 86400000) : null;

  const subtesRanked = lastTryout
    ? SUBTES.map((s) => ({ ...s, value: Number(lastTryout.skor?.[s.key] || 0) })).sort((a, b) => a.value - b.value)
    : [];
  const weakest = subtesRanked[0];

  const soalAvgPct = soalHistory.length
    ? Math.round((soalHistory.reduce((a, s) => a + s.score / (s.total || 1), 0) / soalHistory.length) * 100)
    : null;

  const bySubject = SUBTES.reduce((acc, s) => ({ ...acc, [s.short]: materi.filter((m) => m.subject === s.short) }), {});

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
        <BlueprintCard style={{ alignSelf: "start" }}>
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

        <div className="space-y-4">
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
            <>
              {/* Ringkasan utama */}
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
                      <div className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{avgLatest}</div>
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
              </div>

              {/* Jarak ke target kampus */}
              {lastTryout && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              )}

              {/* Subtes terlemah & tren */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BlueprintCard>
                  <Eyebrow>Subtes Terlemah</Eyebrow>
                  {weakest ? (
                    <>
                      <div className="text-sm mb-2">
                        <span className="font-semibold" style={{ color: T.red }}>{weakest.short} — {weakest.label}</span>
                        <span style={{ color: T.inkSoft }}> · skor terakhir {weakest.value}</span>
                      </div>
                      <div className="text-xs mb-1" style={{ color: T.inkSoft }}>Topik belum selesai di subtes ini:</div>
                      <ul className="space-y-1">
                        {materi.filter((m) => m.subject === weakest.short && m.status !== "selesai").slice(0, 5).map((m) => (
                          <li key={m.id} className="text-sm" style={{ color: T.ink }}>• {m.topic}</li>
                        ))}
                        {materi.filter((m) => m.subject === weakest.short && m.status !== "selesai").length === 0 && (
                          <li className="text-sm" style={{ color: T.inkSoft }}>Tidak ada topik tersisa tercatat untuk subtes ini.</li>
                        )}
                      </ul>
                    </>
                  ) : (
                    <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada data try out untuk menentukan subtes terlemah.</div>
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
                      Proyeksi kasar rata-rata skor di tanggal UTBK ({config.examDate || "belum diisi"}): <b style={{ color: T.navy }}>{projection.projected}</b>.
                    </div>
                  ) : (
                    <div className="text-xs mt-2" style={{ color: T.inkSoft }}>Butuh minimal 2 try out untuk membuat proyeksi.</div>
                  )}
                  {soalAvgPct != null && (
                    <div className="text-xs mt-3 pt-2" style={{ borderTop: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
                      Latihan Bank Soal: {soalHistory.length} sesi selesai, rata-rata benar {soalAvgPct}%.
                    </div>
                  )}
                  {reminder && (
                    <div className="text-xs mt-3 pt-2" style={{ borderTop: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
                      Catatan pengingat terakhir: “{reminder}”
                    </div>
                  )}
                </BlueprintCard>
              </div>

              {/* Grafik tren per subtes */}
              {tryouts.length > 0 && (
                <BlueprintCard>
                  <Eyebrow>Tren Skor per Subtes</Eyebrow>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                    {SUBTES.map((s) => {
                      const chartData = tryouts.map((t) => ({ name: t.date, value: Number(t.skor?.[s.key] || 0) }));
                      return (
                        <div key={s.key}>
                          <div className="text-xs font-medium mb-1" style={{ color: T.inkSoft }}>{s.short} — {s.label}</div>
                          <div style={{ width: "100%", height: 120 }}>
                            <ResponsiveContainer>
                              <LineChart data={chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke={T.inkSoft} />
                                <YAxis domain={[0, 1000]} tick={{ fontSize: 9 }} stroke={T.inkSoft} width={30} />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke={T.steel} strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </BlueprintCard>
              )}

              {/* Riwayat try out */}
              <BlueprintCard>
                <Eyebrow>Riwayat Try Out</Eyebrow>
                {tryouts.length === 0 ? (
                  <div className="text-sm" style={{ color: T.inkSoft }}>Belum ada riwayat.</div>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {tryouts.slice().reverse().map((t, i) => (
                      <li key={i} className="text-sm flex justify-between" style={{ color: T.ink }}>
                        <span>{t.name} · {t.date}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy, fontWeight: 600 }}>{avgSkor(t)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </BlueprintCard>

              {/* Jadwal minggu ini */}
              <BlueprintCard>
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

              {/* Penguasaan materi per subtes, lengkap dengan akurasi Bank Soal */}
              <BlueprintCard>
                <Eyebrow>Penguasaan Materi per Topik</Eyebrow>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  {SUBTES.map((s) => (
                    <div key={s.key}>
                      <div className="text-xs font-medium mb-1.5" style={{ color: T.inkSoft }}>{s.short} — {s.label}</div>
                      <ul className="space-y-1.5">
                        {bySubject[s.short].map((m) => {
                          const stat = topicStats?.[`${m.subject}::${m.topic}`];
                          return (
                            <li key={m.id} className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[m.status] }} />
                              <span className="flex-1 min-w-0" style={{ color: m.status === "selesai" ? T.inkSoft : T.ink, textDecoration: m.status === "selesai" ? "line-through" : "none" }}>
                                {m.topic}
                                {stat && (
                                  <span className="block text-[11px]" style={{ color: T.inkSoft, textDecoration: "none" }}>
                                    Akurasi Bank Soal: {Math.round((stat.correct / stat.total) * 100)}% ({stat.total} soal)
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] shrink-0" style={{ color: T.inkSoft }}>{STATUS_LABEL[m.status]}</span>
                            </li>
                          );
                        })}
                        {bySubject[s.short].length === 0 && <li className="text-sm" style={{ color: T.inkSoft }}>Belum ada topik.</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              </BlueprintCard>

              <div className="text-xs" style={{ color: T.inkSoft }}>
                Data terakhir tersimpan: {studentRow?.updated_at ? new Date(studentRow.updated_at).toLocaleString("id-ID") : "–"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
