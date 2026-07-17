import React, { useState, useEffect, useRef } from "react";
import { Clock, ArrowRight, RefreshCw, ChevronLeft, RotateCcw, Plus, X } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";
import { QUESTION_BANK } from "../data/questionBank";

const uid = () => Math.random().toString(36).slice(2, 10);

// Struktur & durasi resmi UTBK-SNBT: 2 blok, 7 subtes berjalan berurutan sebagai
// segmen dengan waktu terkunci sendiri-sendiri — begitu waktu segmen habis, otomatis
// lanjut ke segmen berikutnya dan TIDAK BISA kembali, meniru perilaku ujian CBT asli.
// Subtes juga bisa dilatih satu-satu (bukan simulasi penuh), tapi jumlah soal & durasinya
// tetap mengikuti angka resmi ini, bukan bebas.
const PAKET_STRUCTURE = [
  { block: "Blok 1 — Tes Potensi Skolastik (TPS)", subtes: "PU", label: "Penalaran Umum", minutes: 30 },
  { block: "Blok 1 — Tes Potensi Skolastik (TPS)", subtes: "PPU", label: "Pengetahuan & Pemahaman Umum", minutes: 15 },
  { block: "Blok 1 — Tes Potensi Skolastik (TPS)", subtes: "PBM", label: "Pemahaman Bacaan & Menulis", minutes: 25 },
  { block: "Blok 1 — Tes Potensi Skolastik (TPS)", subtes: "PK", label: "Pengetahuan Kuantitatif", minutes: 20 },
  { block: "Blok 2 — Literasi & Penalaran Matematika", subtes: "LBI", label: "Literasi Bahasa Indonesia", minutes: 45 },
  { block: "Blok 2 — Literasi & Penalaran Matematika", subtes: "LBE", label: "Literasi Bahasa Inggris", minutes: 30 },
  { block: "Blok 2 — Literasi & Penalaran Matematika", subtes: "PM", label: "Penalaran Matematika", minutes: 30 },
];
const PAKET_TARGET_COUNT = { PU: 30, PPU: 20, PBM: 20, PK: 20, LBI: 30, LBE: 20, PM: 20 };
const TOTAL_MINUTES = PAKET_STRUCTURE.reduce((a, s) => a + s.minutes, 0);
const TOTAL_SOAL = Object.values(PAKET_TARGET_COUNT).reduce((a, n) => a + n, 0);

function getAvailablePakets() {
  const nums = [...new Set(QUESTION_BANK.filter((q) => q.paket).map((q) => q.paket))].sort((a, b) => a - b);
  return nums.filter((n) =>
    Object.entries(PAKET_TARGET_COUNT).every(
      ([subtes, count]) => QUESTION_BANK.filter((q) => q.paket === n && q.subtes === subtes).length >= count
    )
  );
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function PaketLatihan({ soalHistory, setSoalHistory, soalRequests, setSoalRequests, initialFocusSubtes }) {
  const [selectedPaket, setSelectedPaket] = useState(null); // null = daftar paket
  const [sessionSegments, setSessionSegments] = useState(null); // null = menu paket (belum mulai sesi)
  const [segPos, setSegPos] = useState(0);
  const [idxInSeg, setIdxInSeg] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reviewMode, setReviewMode] = useState(false); // walkthrough soal salah, tanpa timer
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqSubtes, setReqSubtes] = useState(SUBTES[0].short);
  const [reqNote, setReqNote] = useState("");
  const savedRef = useRef(false);

  const availablePakets = getAvailablePakets();
  const seg = sessionSegments?.[segPos];
  const segQuestions = seg ? (seg.questionsOverride || QUESTION_BANK.filter((q) => q.paket === selectedPaket && q.subtes === seg.subtes)) : [];
  const current = segQuestions[idxInSeg];
  const allSessionQuestions = sessionSegments
    ? sessionSegments.flatMap((s) => s.questionsOverride || QUESTION_BANK.filter((q) => q.paket === selectedPaket && q.subtes === s.subtes))
    : [];

  const startSingleSegment = (subtesShort) => {
    const segDef = PAKET_STRUCTURE.find((s) => s.subtes === subtesShort);
    setSessionSegments([segDef]);
    setSegPos(0); setIdxInSeg(0); setAnswers({}); setFinished(false); setReviewMode(false);
    setTimeLeft(segDef.minutes * 60);
    savedRef.current = false;
  };
  const startFullSimulation = () => {
    setSessionSegments(PAKET_STRUCTURE);
    setSegPos(0); setIdxInSeg(0); setAnswers({}); setFinished(false); setReviewMode(false);
    setTimeLeft(PAKET_STRUCTURE[0].minutes * 60);
    savedRef.current = false;
  };
  const startReviewWrong = (wrongQs) => {
    setSessionSegments([{ subtes: "Review", label: "Review Soal yang Salah", minutes: null, questionsOverride: wrongQs }]);
    setSegPos(0); setIdxInSeg(0); setAnswers({}); setFinished(false); setReviewMode(true);
    setTimeLeft(0);
    savedRef.current = false;
  };
  const exitToMenu = () => setSessionSegments(null);
  const exitToList = () => { setSelectedPaket(null); setSessionSegments(null); };

  // Datang dari rekomendasi Analitik ("Latihan soal X") — langsung buka paket pertama
  // yang tersedia dan mulai sesi subtes yang direkomendasikan.
  useEffect(() => {
    if (!initialFocusSubtes) return;
    const avail = getAvailablePakets();
    if (avail.length === 0) return;
    const segDef = PAKET_STRUCTURE.find((s) => s.subtes === initialFocusSubtes);
    if (!segDef) return;
    setSelectedPaket(avail[0]);
    setSessionSegments([segDef]);
    setSegPos(0); setIdxInSeg(0); setAnswers({}); setFinished(false); setReviewMode(false);
    setTimeLeft(segDef.minutes * 60);
    savedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocusSubtes]);

  const goNextSegment = () => {
    setSegPos((p) => {
      const next = p + 1;
      if (sessionSegments && next < sessionSegments.length) {
        setIdxInSeg(0);
        setTimeLeft(sessionSegments[next].minutes ? sessionSegments[next].minutes * 60 : 0);
        return next;
      }
      setFinished(true);
      return p;
    });
  };
  const nextQuestion = () => {
    if (idxInSeg < segQuestions.length - 1) setIdxInSeg((v) => v + 1);
    else goNextSegment();
  };
  const prevQuestion = () => { if (idxInSeg > 0) setIdxInSeg((v) => v - 1); };
  const choose = (i) => setAnswers((a) => ({ ...a, [current.id]: i }));

  // Timer segmen: hitung mundur, otomatis lanjut ke segmen berikutnya kalau waktu habis.
  // Mode review (soal salah) tidak pakai timer — bebas ditelusuri sendiri.
  useEffect(() => {
    if (!sessionSegments || finished || reviewMode) return;
    if (timeLeft <= 0) { goNextSegment(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, sessionSegments, finished, reviewMode]);

  const score = allSessionQuestions.reduce((acc, q) => acc + (answers[q.id] === q.answer ? 1 : 0), 0);
  const wrongQuestions = allSessionQuestions.filter((q) => answers[q.id] !== q.answer);

  useEffect(() => {
    if (!finished || savedRef.current || !sessionSegments || !setSoalHistory) return;
    savedRef.current = true;
    const label = reviewMode
      ? "Review"
      : sessionSegments.length > 1
        ? `Paket ${selectedPaket} (Penuh)`
        : `Paket ${selectedPaket} · ${sessionSegments[0].subtes}`;
    setSoalHistory((h) => [
      ...h,
      { id: uid(), date: new Date().toISOString().slice(0, 10), filter: label, examMode: !reviewMode, total: allSessionQuestions.length, score },
    ]);
  }, [finished]);

  const submitRequest = () => {
    if (!setSoalRequests) return;
    setSoalRequests((r) => [...r, { id: uid(), subtes: reqSubtes, note: reqNote.trim(), date: new Date().toISOString().slice(0, 10) }]);
    setReqNote("");
    setShowRequestForm(false);
  };
  const removeRequest = (id) => setSoalRequests && setSoalRequests((r) => r.filter((x) => x.id !== id));

  // ---------- Daftar paket ----------
  if (!selectedPaket) {
    return (
      <div>
        <Eyebrow>Latihan Soal</Eyebrow>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Paket Latihan — Teknik Sipil</h1>
        <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
          Soal latihan buatan sendiri dengan konteks umum/netral mengikuti gaya UTBK-SNBT asli. Tiap paket disusun {TOTAL_SOAL} soal dalam {PAKET_STRUCTURE.length} subtes, jumlah dan durasi tiap subtes mengikuti struktur resmi UTBK-SNBT (±{Math.round(TOTAL_MINUTES / 60)} jam {TOTAL_MINUTES % 60} menit total) — bukan soal resmi SNPMB, bukan pengganti try out resmi.
        </p>

        {availablePakets.length === 0 ? (
          <BlueprintCard className="mb-4">
            <div className="text-sm" style={{ color: T.inkSoft }}>
              Belum ada paket yang lengkap. Gunakan "Minta Soal Baru" di bawah untuk melengkapi subtes yang masih kurang, supaya paket bisa terbentuk otomatis di sini.
            </div>
          </BlueprintCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {availablePakets.map((n) => (
              <BlueprintCard key={n}>
                <Eyebrow>Paket {n}</Eyebrow>
                <div className="text-2xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{TOTAL_SOAL} soal</div>
                <div className="text-xs mb-4 flex items-center gap-1.5" style={{ color: T.inkSoft }}>
                  <Clock size={13} /> ±{Math.round(TOTAL_MINUTES / 60)} jam {TOTAL_MINUTES % 60} menit · 7 subtes
                </div>
                <button onClick={() => setSelectedPaket(n)} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
                  Buka Paket {n} <ArrowRight size={14} />
                </button>
              </BlueprintCard>
            ))}
          </div>
        )}

        {setSoalRequests && (
          <BlueprintCard>
            <div className="flex items-center justify-between">
              <Eyebrow>Minta Soal Baru</Eyebrow>
              <button onClick={() => setShowRequestForm((v) => !v)} className="text-xs flex items-center gap-1" style={{ color: T.steel }}>
                <Plus size={13} /> {showRequestForm ? "Tutup" : "Buka form"}{soalRequests?.length > 0 ? ` (${soalRequests.length})` : ""}
              </button>
            </div>
            {showRequestForm && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <select value={reqSubtes} onChange={(e) => setReqSubtes(e.target.value)} className="border px-2 py-1.5 text-sm" style={{ borderColor: T.paperLine }}>
                    {SUBTES.map((s) => <option key={s.key} value={s.short}>{s.short} — {s.label}</option>)}
                  </select>
                  <input
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    placeholder="Catatan opsional, cth. butuh level lebih sulit"
                    className="flex-1 border px-2 py-1.5 text-sm min-w-0"
                    style={{ borderColor: T.paperLine }}
                  />
                  <button onClick={submitRequest} className="px-3 py-1.5 text-sm font-medium" style={{ background: T.steel, color: "#fff" }}>
                    Catat Permintaan
                  </button>
                </div>
                <div className="text-xs mt-2" style={{ color: T.inkSoft }}>
                  Permintaan ini tersimpan di datamu (belum otomatis dibuatkan) — sampaikan ke asisten AI-mu di sesi chat berikutnya. Soal baru akan menjadi Paket berikutnya (Paket 2, dst) dengan struktur jumlah & durasi yang sama seperti sekarang.
                </div>
                {soalRequests?.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.paperLine}` }}>
                    <div className="text-xs font-medium mb-1.5" style={{ color: T.inkSoft }}>Permintaan tercatat ({soalRequests.length}):</div>
                    <ul className="space-y-1">
                      {soalRequests.map((r) => (
                        <li key={r.id} className="text-xs flex items-center justify-between gap-2" style={{ color: T.ink }}>
                          <span><b>{r.subtes}</b>{r.note ? ` — ${r.note}` : ""} <span style={{ color: T.inkSoft }}>({r.date})</span></span>
                          <button onClick={() => removeRequest(r.id)} style={{ color: T.red }}><X size={12} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </BlueprintCard>
        )}
      </div>
    );
  }

  // ---------- Menu paket: pilih subtes satu-satu atau simulasi penuh ----------
  if (!sessionSegments) {
    return (
      <div>
        <button onClick={exitToList} className="text-xs flex items-center gap-1 mb-3" style={{ color: T.inkSoft }}>
          <ChevronLeft size={12} /> Kembali ke Daftar Paket
        </button>
        <Eyebrow>Paket {selectedPaket}</Eyebrow>
        <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Pilih Subtes atau Simulasi Penuh</h1>

        <BlueprintCard className="mb-4" style={{ borderColor: T.amber }}>
          <Eyebrow>Simulasi Penuh</Eyebrow>
          <div className="text-sm mb-3" style={{ color: T.ink }}>
            Kerjakan ketujuh subtes berurutan sesuai kondisi ujian asli — {TOTAL_SOAL} soal, ±{Math.round(TOTAL_MINUTES / 60)} jam {TOTAL_MINUTES % 60} menit. Setiap subtes terkunci waktunya sendiri; sekali lanjut, tidak bisa kembali.
          </div>
          <button onClick={startFullSimulation} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.amber, color: "#fff" }}>
            Mulai Simulasi Penuh <ArrowRight size={14} />
          </button>
        </BlueprintCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAKET_STRUCTURE.map((s) => (
            <BlueprintCard key={s.subtes}>
              <Eyebrow>{s.subtes} — {s.label}</Eyebrow>
              <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: T.inkSoft }}>
                <Clock size={12} /> {PAKET_TARGET_COUNT[s.subtes]} soal · {s.minutes} menit
              </div>
              <button onClick={() => startSingleSegment(s.subtes)} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
                Latihan {s.subtes} <ArrowRight size={14} />
              </button>
            </BlueprintCard>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Hasil ----------
  if (finished) {
    return (
      <div>
        <Eyebrow>Paket {selectedPaket}</Eyebrow>
        <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Hasil{reviewMode ? " · Review Soal Salah" : sessionSegments.length > 1 ? " · Simulasi Penuh" : ` · ${sessionSegments[0].subtes}`}
        </h1>
        <BlueprintCard>
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{score} / {allSessionQuestions.length}</div>
          <div className="text-sm mb-4" style={{ color: T.inkSoft }}>jawaban benar</div>
          {sessionSegments.map((s) => {
            const qs = s.questionsOverride || QUESTION_BANK.filter((q) => q.paket === selectedPaket && q.subtes === s.subtes);
            const segScore = qs.reduce((a, q) => a + (answers[q.id] === q.answer ? 1 : 0), 0);
            return (
              <div key={s.subtes} className="mb-4 pb-4" style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                {sessionSegments.length > 1 && (
                  <div className="text-sm font-semibold mb-2" style={{ color: T.navy }}>{s.subtes} — {s.label} ({segScore}/{qs.length})</div>
                )}
                <div className="space-y-2">
                  {qs.map((q) => {
                    const ans = answers[q.id];
                    const correct = ans === q.answer;
                    return (
                      <div key={q.id} className="text-sm pb-2" style={{ borderBottom: `1px solid ${T.paperLine}` }}>
                        <div style={{ color: T.ink }}>{q.q}</div>
                        <div className="text-xs mt-1" style={{ color: correct ? T.teal : T.red }}>
                          Jawabanmu: {ans != null ? q.opts[ans] : "(belum dijawab)"} {correct ? "— benar" : `— kunci: ${q.opts[q.answer]}`}
                        </div>
                        {q.pembahasan && (
                          <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
                            <span className="font-medium" style={{ color: T.steel }}>Pembahasan:</span> {q.pembahasan}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 mt-2">
            {wrongQuestions.length > 0 && !reviewMode && (
              <button onClick={() => startReviewWrong(wrongQuestions)} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.amber, color: "#fff" }}>
                <RotateCcw size={13} /> Review {wrongQuestions.length} Soal yang Salah
              </button>
            )}
            <button onClick={exitToMenu} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
              <RefreshCw size={13} /> Kembali ke Menu Paket
            </button>
            <button onClick={exitToList} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ border: `1px solid ${T.paperLine}`, color: T.inkSoft }}>
              <ChevronLeft size={13} /> Daftar Paket
            </button>
          </div>
        </BlueprintCard>
      </div>
    );
  }

  // ---------- Sesi berjalan ----------
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>{seg.block || "Review"}</Eyebrow>
        <button onClick={exitToMenu} className="text-xs flex items-center gap-1" style={{ color: T.inkSoft }}>
          <ChevronLeft size={12} /> Batalkan sesi
        </button>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {reviewMode ? "Review Soal yang Salah" : sessionSegments.length > 1 ? `Paket ${selectedPaket} — Segmen ${segPos + 1}/${sessionSegments.length}: ${seg.subtes} · ${seg.label}` : `Paket ${selectedPaket} — ${seg.subtes} · ${seg.label}`}
      </h1>

      <BlueprintCard>
        {!reviewMode && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: T.inkSoft }}>
              <span>Waktu {sessionSegments.length > 1 ? "segmen ini" : ""} (otomatis lanjut kalau habis)</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: timeLeft <= 60 ? T.red : T.ink }}>{mmss(timeLeft)}</span>
            </div>
            <div className="h-1.5 w-full" style={{ background: T.paperLine }}>
              <div className="h-full transition-all" style={{ width: `${(timeLeft / (seg.minutes * 60)) * 100}%`, background: timeLeft <= 60 ? T.red : T.amber }} />
            </div>
          </div>
        )}

        {current ? (
          <>
            <Eyebrow>Soal {idxInSeg + 1} / {segQuestions.length}{current.topic ? ` · ${current.topic}` : ""}</Eyebrow>
            <p className="text-sm mb-4 mt-1" style={{ color: T.ink, lineHeight: 1.6 }}>{current.q}</p>
            <div className="space-y-2">
              {current.opts.map((opt, i) => (
                <button key={i} onClick={() => choose(i)} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2" style={{ border: `1px solid ${answers[current.id] === i ? T.steel : T.paperLine}`, background: answers[current.id] === i ? "rgba(44,125,160,0.08)" : "#fff", color: T.ink }}>
                  <span className="w-5 h-5 flex items-center justify-center text-xs shrink-0" style={{ border: `1px solid ${answers[current.id] === i ? T.steel : T.paperLine}`, color: answers[current.id] === i ? T.steel : T.inkSoft }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-5">
              <button onClick={prevQuestion} disabled={idxInSeg === 0} className="px-3 py-1.5 text-sm" style={{ color: idxInSeg === 0 ? T.paperLine : T.inkSoft, border: `1px solid ${T.paperLine}` }}>Sebelumnya</button>
              <button onClick={nextQuestion} className="px-4 py-1.5 text-sm font-medium" style={{ background: T.steel, color: "#fff" }}>
                {idxInSeg === segQuestions.length - 1
                  ? (segPos === sessionSegments.length - 1 ? "Selesai" : "Lanjut ke Segmen Berikutnya")
                  : "Selanjutnya"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm" style={{ color: T.inkSoft }}>Tidak ada soal di segmen ini.</div>
        )}
      </BlueprintCard>
    </div>
  );
}
