import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Timer } from "lucide-react";
import { T, BlueprintCard, Eyebrow } from "../tokens";
import { SUBTES } from "../lib/scoring";
import { QUESTION_BANK } from "../data/questionBank";

const uid = () => Math.random().toString(36).slice(2, 10);
const TIME_PER_SOAL = 90; // detik, dipakai saat Mode Ujian aktif

export default function BankSoal({ soalHistory, setSoalHistory }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [filter, setFilter] = useState("Semua");
  const [examMode, setExamMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_SOAL);
  const savedRef = useRef(false);

  const questions = filter === "Semua" ? QUESTION_BANK : QUESTION_BANK.filter((q) => q.subtes === filter);
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
  const changeFilter = (f) => { setFilter(f); setIdx(0); setSelected(null); setAnswers({}); setFinished(false); setTimeLeft(TIME_PER_SOAL); savedRef.current = false; };
  const toggleExamMode = () => { setExamMode((v) => !v); restart(); };

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

  // Simpan riwayat sesi begitu selesai (sekali per sesi)
  useEffect(() => {
    if (!finished || savedRef.current || questions.length === 0) return;
    savedRef.current = true;
    setSoalHistory((h) => [
      ...h,
      { id: uid(), date: new Date().toISOString().slice(0, 10), filter, examMode, total: questions.length, score },
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
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>Soal latihan buatan sendiri bernuansa teknik sipil — bukan soal resmi SNPMB, bukan pengganti try out resmi.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {["Semua", ...SUBTES.map((s) => s.short)].map((f) => (
          <button key={f} onClick={() => changeFilter(f)} className="px-3 py-1 text-xs font-medium" style={{ background: filter === f ? T.navy : "#fff", color: filter === f ? "#fff" : T.inkSoft, border: `1px solid ${filter === f ? T.navy : T.paperLine}` }}>
            {f}
          </button>
        ))}
        <button
          onClick={toggleExamMode}
          className="ml-auto px-3 py-1 text-xs font-medium flex items-center gap-1.5"
          style={{ background: examMode ? T.amber : "#fff", color: examMode ? "#fff" : T.inkSoft, border: `1px solid ${examMode ? T.amber : T.paperLine}` }}
          title="Mode Ujian: timer 90 detik per soal, otomatis lanjut kalau waktu habis"
        >
          <Timer size={13} /> Mode Ujian {examMode ? "ON" : "OFF"}
        </button>
      </div>

      {!finished ? (
        <BlueprintCard>
          <div className="flex items-center justify-between mb-3">
            <Eyebrow>Soal {idx + 1} / {questions.length} · {current.subtes}{current.topic ? ` · ${current.topic}` : ""}</Eyebrow>
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
          <Eyebrow>Hasil</Eyebrow>
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
