"use client";
import { useState, useEffect, use } from "react";

export default function StudentPollView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [identifier, setIdentifier] = useState("");
  const [joined, setJoined] = useState(false);
  const [poll, setPoll] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      const res = await fetch(`/api/poll`);
      const data = await res.json();
      setPoll(data);
    };
    fetchPoll();
    const interval = setInterval(fetchPoll, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleVote = async (answerVal: any) => {
    setSubmitted(true);
    await fetch("/api/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", identifier, answer: answerVal }),
    });
  };

  if (!joined) {
    return (
      <div style={{ padding: "40px", maxWidth: "400px", margin: "auto", fontFamily: "sans-serif" }}>
        <h2>Join Live Class Poll</h2>
        <input 
          type="text" 
          placeholder="Enter Name or Roll Number" 
          value={identifier} 
          onChange={(e) => setIdentifier(e.target.value)} 
          style={{ width: "100%", padding: "10px", margin: "10px 0" }} 
        />
        <button 
          onClick={() => identifier.trim() && setJoined(true)} 
          style={{ width: "100%", padding: "10px", background: "blue", color: "white", border: "none" }}
        >
          Join Session
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "auto", fontFamily: "sans-serif" }}>
      <p style={{ fontSize: "12px", color: "gray" }}>Student: {identifier}</p>
      <h2>{poll?.question || "Loading..."}</h2>

      {submitted ? (
        <div style={{ background: "#e1ffd8", padding: "20px", textAlign: "center", borderRadius: "5px" }}>
          <h3>Response Recorded!</h3>
          <p>Watch the instructor screen for live results.</p>
        </div>
      ) : (
        <div>
          {poll?.type === "multiple-choice" && poll.options.map((opt: string, idx: number) => (
            <button key={idx} onClick={() => handleVote(idx)} style={{ display: "block", width: "100%", padding: "12px", margin: "10px 0", cursor: "pointer" }}>
              {opt}
            </button>
          ))}

          {poll?.type === "open-ended" && (
            <div>
              <textarea id="openText" placeholder="Type answer..." style={{ width: "100%", height: "100px", padding: "10px" }} />
              <button onClick={() => {
                const val = (document.getElementById("openText") as HTMLTextAreaElement).value;
                if(val) handleVote(val);
              }} style={{ width: "100%", padding: "10px", background: "blue", color: "white", marginTop: "10px" }}>
                Submit Answer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
