import React from "react";
import PaketLatihan from "./PaketLatihan";

export default function BankSoal({ soalHistory, setSoalHistory, initialFilter, initialAction, soalRequests, setSoalRequests, tryouts, setTryouts, topicStats, setTopicStats }) {
  return (
    <PaketLatihan
      soalHistory={soalHistory}
      setSoalHistory={setSoalHistory}
      soalRequests={soalRequests}
      setSoalRequests={setSoalRequests}
      initialFocusSubtes={initialFilter}
      initialAction={initialAction}
      tryouts={tryouts}
      setTryouts={setTryouts}
      topicStats={topicStats}
      setTopicStats={setTopicStats}
    />
  );
}
