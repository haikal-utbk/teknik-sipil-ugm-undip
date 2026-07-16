import React, { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { supabase } from "./lib/supabase";
import { T, Eyebrow } from "./tokens";

export default function Auth() {
  const [mode, setMode] = useState("masuk"); // masuk | daftar
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "masuk") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Akun dibuat. Jika verifikasi email aktif di project Supabase-mu, cek inbox untuk konfirmasi sebelum masuk.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      setError("Isi email dulu, lalu klik lupa password.");
      return;
    }
    setError("");
    setInfo("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else setInfo("Email reset password sudah dikirim (jika akun terdaftar).");
  };

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center p-6"
      style={{
        background: T.navy,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Rencana Studi
          </div>
          <div className="text-xs" style={{ color: T.steelLight, fontFamily: "'IBM Plex Mono', monospace" }}>
            UTBK-SNBT · Teknik Sipil
          </div>
        </div>

        <form onSubmit={submit} className="bg-white p-6" style={{ border: `1px solid ${T.paperLine}` }}>
          <Eyebrow>{mode === "masuk" ? "Masuk" : "Buat Akun"}</Eyebrow>

          <label className="text-xs flex items-center gap-1.5 mt-3" style={{ color: T.inkSoft }}>
            <Mail size={12} /> Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full border px-2 py-2 text-sm mt-1"
            style={{ borderColor: T.paperLine }}
          />

          <label className="text-xs flex items-center gap-1.5 mt-3" style={{ color: T.inkSoft }}>
            <Lock size={12} /> Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full border px-2 py-2 text-sm mt-1"
            style={{ borderColor: T.paperLine }}
          />

          {error && <div className="text-xs mt-3" style={{ color: T.red }}>{error}</div>}
          {info && <div className="text-xs mt-3" style={{ color: T.teal }}>{info}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 px-3 py-2 text-sm font-medium"
            style={{ background: T.steel, color: "#fff" }}
          >
            {loading ? "Memproses…" : mode === "masuk" ? "Masuk" : "Daftar"}
          </button>

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => { setMode(mode === "masuk" ? "daftar" : "masuk"); setError(""); setInfo(""); }}
              className="text-xs"
              style={{ color: T.steel }}
            >
              {mode === "masuk" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
            {mode === "masuk" && (
              <button type="button" onClick={forgotPassword} className="text-xs" style={{ color: T.inkSoft }}>
                Lupa password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
