import React from "react";
import PaketLatihan from "./PaketLatihan";

export default function BankSoal({ soalHistory, setSoalHistory, initialFilter, soalRequests, setSoalRequests }) {
  return (
    <PaketLatihan
      soalHistory={soalHistory}
      setSoalHistory={setSoalHistory}
      soalRequests={soalRequests}
      setSoalRequests={setSoalRequests}
      initialFocusSubtes={initialFilter}
    />
  );
}
