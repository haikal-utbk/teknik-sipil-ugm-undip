import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Timer, RotateCcw, Plus, X } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";
import { QUESTION_BANK } from "../data/questionBank";

const uid = () => Math.random().toString(36).slice(2, 10);
const TIME_PER_SOAL = 90; // detik, dipakai saat Mode Ujian aktif

export default function BankSoal({ soalHistory, setSoalHistory, initialFilter, soalRequests, setSoalRequests }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [filter, setFilter] = useState(initialFilter || "Semua");
  const [examMode, setExamMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_SOAL);
  const [reviewQueue, setReviewQueue] = useState(null); // null = mode normal, array = Mode Review Soal Salah
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqSubtes, setReqSubtes] = useState(SUBTES[0].short);
  const [reqNote, setReqNote] = useState("");
  const savedRef = useRef(false);

  const questions = reviewQueue || (filter === "Semua" ? QUESTION_BANK : QUESTION_BANK.filter((q) => q.subtes === filter));
  const current = questions[idx];

  const choose = (i) => {
    setSelected(i);
    setAnswers((a) => ({ ...a, [current.id]: i }));
  };
  const next = () => {
    if (idx < questions.length - 1) {
      setIdx((v) => v + 1);
      setSelected(answers[questions[idx + 1]?.id] ?? null);
      setTimeLeft(TIME_PER_SOAL);
    } else setFinished(true);
  };
  const prev = () => {
    if (idx > 0) {
      setIdx((v) => v - 1);
      setSelected(answers[questions[idx - 1]?.id] ?? null);
      setTimeLeft(TIME_PER_SOAL);
    }
  };
  const restart = () => { setIdx(0); setSelected(null); setAnswers({}); setFinished(false); setTimeLeft(TIME_PER_SOAL); savedRef.current = false; };
  const changeFilter = (f) => { setFilter(f); setReviewQueue(null); setIdx(0); setSelected(null); setAnswers({}); setFinished(false); setTimeLeft(TIME_PER_SOAL); savedRef.current = false; };
  const toggleExamMode = () => { setExamMode((v) => !v); restart(); };
  const startReview = (wrongQuestions) => { setReviewQueue(wrongQuestions); restart(); };

  const submitRequest = () => {
    if (!setSoalRequests) return;
    setSoalRequests((r) => [...r, { id: uid(), subtes: reqSubtes, note: reqNote.trim(), date: new Date().toISOString().slice(0, 10) }]);
    setReqNote("");
    setShowRequestForm(false);
  };
  const removeRequest = (id) => setSoalRequests && setSoalRequests((r) => r.filter((x) => x.id !== id));

  // Timer Mode Ujian: hitung mundur per soal, otomatis lanjut kalau waktu habis
  useEffect(() => {
    if (!examMode || finished || !current) return;
    if (timeLeft <= 0) {
      next();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [examMode, timeLeft, finished, current]);

  const score = Object.entries(answers).reduce((acc, [qid, ans]) => {
    const q = QUESTION_BANK.find((x) => x.id === qid);
    return acc + (q && q.answer === ans ? 1 : 0);
  }, 0);
  const wrongQuestions = questions.filter((q) => answers[q.id] !== q.answer);

  // Simpan riwayat sesi begitu selesai (sekali per sesi)
  useEffect(() => {
    if (!finished || savedRef.current || questions.length === 0) return;
    savedRef.current = true;
    setSoalHistory((h) => [
      ...h,
      { id: uid(), date: new Date().toISOString().slice(0, 10), filter: reviewQueue ? "Review" : filter, examMode, total: questions.length, score },
    ]);
  }, [finished]);

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
      <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Bank Soal — Teknik Sipil</h1>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>Soal latihan buatan sendiri dengan konteks umum/netral mengikuti gaya UTBK-SNBT asli — bukan soal resmi SNPMB, bukan pengganti try out resmi.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {["Semua", ...SUBTES.map((s) => s.short)].map((f) => (
          <button key={f} onClick={() => changeFilter(f)} className="px-3 py-1 text-xs font-medium" style={{ background: filter === f ? T.navy : "#fff", color: filter === f ? "#fff" : T.inkSoft, border: `1px solid ${filter === f ? T.navy : T.paperLine}` }}>
            {f}
          </button>
        ))}
        {setSoalRequests && (
          <button
            onClick={() => setShowRequestForm((v) => !v)}
            className="ml-auto px-3 py-1 text-xs font-medium flex items-center gap-1.5"
            style={{ border: `1px solid ${T.paperLine}`, color: T.inkSoft }}
          >
            <Plus size={13} /> Minta Soal Baru{soalRequests?.length > 0 ? ` (${soalRequests.length})` : ""}
          </button>
        )}
        <button
          onClick={toggleExamMode}
          className={setSoalRequests ? "px-3 py-1 text-xs font-medium flex items-center gap-1.5" : "ml-auto px-3 py-1 text-xs font-medium flex items-center gap-1.5"}
          style={{ background: examMode ? T.amber : "#fff", color: examMode ? "#fff" : T.inkSoft, border: `1px solid ${examMode ? T.amber : T.paperLine}` }}
          title="Mode Ujian: timer 90 detik per soal, otomatis lanjut kalau waktu habis"
        >
          <Timer size={13} /> Mode Ujian {examMode ? "ON" : "OFF"}
        </button>
      </div>

      {showRequestForm && (
        <BlueprintCard className="mb-4">
          <Eyebrow>Minta Soal Baru</Eyebrow>
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
            Permintaan ini tersimpan di datamu (belum otomatis dibuatkan) — sampaikan ke asisten AI-mu di sesi chat berikutnya supaya soalnya ditambahkan.
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
        </BlueprintCard>
      )}

      {!finished ? (
        <BlueprintCard>
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>{reviewQueue ? "Mode Review · " : ""}Soal {idx + 1} / {questions.length} · {current.subtes}{current.topic ? ` · ${current.topic}` : ""}</Eyebrow>
            <button onClick={restart} className="text-xs flex items-center gap-1" style={{ color: T.steel }}>
              <RefreshCw size={12} /> Ulangi
            </button>
          </div>

          {examMode && (
            <div className="mb-4">
              <div className="h-1.5 w-full" style={{ background: T.paperLine }}>
                <div className="h-full transition-all" style={{ width: `${(timeLeft / TIME_PER_SOAL) * 100}%`, background: timeLeft <= 15 ? T.red : T.amber }} />
              </div>
              <div className="text-xs mt-1 text-right" style={{ color: T.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>{timeLeft}s</div>
            </div>
          )}

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
            <button onClick={next} disabled={!examMode && selected === null} className="px-4 py-1.5 text-sm font-medium" style={{ background: (!examMode && selected === null) ? T.paperLine : T.steel, color: "#fff" }}>
              {idx === questions.length - 1 ? "Selesai" : "Selanjutnya"}
            </button>
          </div>
        </BlueprintCard>
      ) : (

        <BlueprintCard>
          <Eyebrow>Hasil{reviewQueue ? " · Mode Review" : ""}</Eyebrow>
          <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.navy }}>{score} / {questions.length}</div>
          <div className="text-sm mb-4" style={{ color: T.inkSoft }}>jawaban benar{examMode ? " · Mode Ujian" : ""}</div>
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
                  {q.pembahasan && (
                    <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
                      <span className="font-medium" style={{ color: T.steel }}>Pembahasan:</span> {q.pembahasan}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={restart} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.steel, color: "#fff" }}>
              <RefreshCw size={13} /> Ulangi Latihan
            </button>
            {wrongQuestions.length > 0 && (
              <button onClick={() => startReview(wrongQuestions)} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ background: T.amber, color: "#fff" }}>
                <RotateCcw size={13} /> Review {wrongQuestions.length} Soal yang Salah
              </button>
            )}
          </div>
        </BlueprintCard>
      )}
    </div>
  );
}
