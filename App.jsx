import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./Auth";
import StudyApp from "./StudyApp";
import { T } from "./tokens";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = belum dicek

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: T.navy }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.steelLight }}>Memuat…</div>
      </div>
    );
  }

  return session ? <StudyApp session={session} /> : <Auth />;
}
