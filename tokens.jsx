import React from "react";

// ---------- Design tokens (blueprint / drafting-table theme) ----------
export const T = {
  navy: "#0B2545",
  navyDeep: "#081B36",
  paper: "#F5F2EA",
  paperLine: "#DCE3E8",
  steel: "#2C7DA0",
  steelLight: "#5FA8D3",
  amber: "#E8A33D",
  teal: "#3E7C6B",
  ink: "#16232E",
  inkSoft: "#4A5A68",
  red: "#B5533C",
};

export function BlueprintCard({ children, style, className = "" }) {
  return (
    <div className={`relative p-5 ${className}`} style={{ background: "#FFFFFF", border: `1px solid ${T.paperLine}`, ...style }}>
      {["-top-px -left-px", "-top-px -right-px", "-bottom-px -left-px", "-bottom-px -right-px"].map((pos, i) => (
        <span
          key={i}
          className={`absolute ${pos} w-3 h-3`}
          style={{
            borderTop: pos.includes("top") ? `2px solid ${T.steel}` : "none",
            borderBottom: pos.includes("bottom") ? `2px solid ${T.steel}` : "none",
            borderLeft: pos.includes("left") ? `2px solid ${T.steel}` : "none",
            borderRight: pos.includes("right") ? `2px solid ${T.steel}` : "none",
          }}
        />
      ))}
      {children}
    </div>
  );
}

export function Eyebrow({ children }) {
  return (
    <div className="uppercase tracking-widest text-xs font-semibold mb-2" style={{ color: T.steel, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.12em" }}>
      {children}
    </div>
  );
}

export function IconBtn({ onClick, children, title, danger }) {
  return (
    <button onClick={onClick} title={title} className="p-2 transition-colors" style={{ color: danger ? T.red : T.steel }}>
      {children}
    </button>
  );
}
