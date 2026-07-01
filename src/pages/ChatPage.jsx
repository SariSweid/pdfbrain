import { useState, useEffect, useRef } from "react";
import { callClaude, callClaudeMultiturn } from "../../lib/anthropicClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "../components/Sidebar";
import { useChat } from "../features/chat/useChat";
import { exportSummaryToWord, exportSummaryToPdf } from "../lib/exportUtils";
import { addHistoryEvent } from "../lib/localStore";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

// ── System prompts ─────────────────────────────────────────────────────────
function buildSystemPrompt(documentText, mode) {
  if (mode === "educator") {
    return `אתה מורה חינוכי אינטראקטיבי שמלמד את תוכן המאמר המדעי הבא.

תפקידך:
1. לשאול את הסטודנט שאלות הבנה על המאמר, אחת בכל פעם
2. לחכות לתשובתו ולתת משוב מפורט — מה נכון, מה חסר, ומה צריך לתקן
3. לציין **מאיפה במאמר** מגיע המידע (סעיף/עמוד)
4. לתת משימות קצרות: "סכם את האלגוריתם בשורה אחת", "הסבר את ההנחה הראשית"
5. להיות מעודד אך דורשן — כמו מורה טוב

תוכן המאמר:
${documentText}`;
  }
  return `אתה עוזר AI מומחה לניתוח מאמרים אקדמיים.
ענה על שאלות על המאמר הבא, ציין מאיפה במאמר המידע מגיע (סעיף/עמוד) כשרלוונטי.
תוכן המאמר:
${documentText}`;
}

// ── Markdown renderer ──────────────────────────────────────────────────────
function MarkdownContent({ text }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 style={{ fontSize:"18px", fontWeight:700, margin:"14px 0 6px", color:"var(--text-primary)" }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize:"15px", fontWeight:700, margin:"12px 0 5px", color:"var(--text-primary)", borderBottom:"1px solid var(--border)", paddingBottom:"3px" }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize:"13px", fontWeight:700, margin:"10px 0 4px", color:"var(--text-primary)" }}>{children}</h3>,
        p:  ({ children }) => <p  style={{ margin:"5px 0", fontSize:"13px", lineHeight:1.75, color:"var(--text-secondary)" }}>{children}</p>,
        strong: ({ children }) => <strong style={{ fontWeight:700, color:"var(--text-primary)" }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ margin:"5px 0", paddingRight:"18px", listStyleType:"disc" }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin:"5px 0", paddingRight:"18px" }}>{children}</ol>,
        li: ({ children }) => <li style={{ margin:"3px 0", fontSize:"13px", lineHeight:1.6, color:"var(--text-secondary)" }}>{children}</li>,
        blockquote: ({ children }) => <blockquote style={{ borderRight:"3px solid var(--brand)", paddingRight:"10px", margin:"6px 0", color:"var(--text-muted)", fontStyle:"italic" }}>{children}</blockquote>,
        code: ({ inline, children }) => inline
          ? <code style={{ background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"4px", padding:"1px 4px", fontSize:"12px", fontFamily:"monospace" }}>{children}</code>
          : <pre style={{ background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"6px", padding:"10px", overflowX:"auto", fontSize:"12px", fontFamily:"monospace", direction:"ltr", textAlign:"left" }}><code>{children}</code></pre>,
        table: ({ children }) => <table style={{ width:"100%", borderCollapse:"collapse", margin:"8px 0", fontSize:"12px" }}>{children}</table>,
        th: ({ children }) => <th style={{ background:"var(--brand)", color:"#fff", padding:"7px 10px", textAlign:"right", fontWeight:700, border:"1px solid var(--border)" }}>{children}</th>,
        td: ({ children }) => <td style={{ padding:"7px 10px", textAlign:"right", border:"1px solid var(--border)", color:"var(--text-secondary)" }}>{children}</td>,
        hr: () => <hr style={{ border:"none", borderTop:"1px solid var(--border)", margin:"10px 0" }} />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// ── Analysis card — always visible when doc has analysis ──────────────────
// chatStarted: true = chat is active, hide the "start" CTA
function AnalysisCard({ analysis, docTitle, onStartLearning, chatStarted, expanded, onToggle }) {
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf,  setExportingPdf]  = useState(false);
  const exportDoc = { title: docTitle, summary: analysis };
  const collapsed = !expanded;

  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", overflow:"hidden", flexShrink:0, width:"100%", height: expanded ? "100%" : "auto", display:"flex", flexDirection:"column", minHeight:0 }}>
      {/* Header row — always visible */}
      <div style={{ display:"flex", alignItems:"center", padding:"10px 16px", borderBottom: collapsed ? "none" : "1px solid var(--border)", gap:"8px", minHeight:"44px" }}>
        <span style={{ fontWeight:700, fontSize:"14px", color:"var(--text-primary)", flex:1 }}>📊 ניתוח המאמר</span>

        {/* Export buttons */}
        {!collapsed && (
          <>
            <button onClick={async () => { setExportingWord(true); try { await exportSummaryToWord(exportDoc); } catch (e) { alert(e.message); } setExportingWord(false); }}
              style={xBtn}>{exportingWord ? "..." : "📄 Word"}</button>
            <button onClick={async () => { setExportingPdf(true);  try { await exportSummaryToPdf(exportDoc);  } catch (e) { alert(e.message); } setExportingPdf(false); }}
              style={xBtn}>{exportingPdf ? "..." : "📄 PDF"}</button>
          </>
        )}

        {/* Collapse toggle */}
        <button onClick={onToggle} style={{ ...xBtn, fontSize:"11px", padding:"3px 8px" }}>
          {collapsed ? "▼ הצג" : "▲ כווץ"}
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
          {/* Analysis text — shorter when chat is active */}
          <div style={{ flex:1, overflowY:"auto", direction:"rtl", textAlign:"right", minHeight:0 }}>
            <MarkdownContent text={analysis} />
          </div>

          {/* Start learning CTA — only before chat begins */}
          {!chatStarted && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"14px", paddingTop:"12px", borderTop:"1px solid var(--border)", gap:"12px" }}>
              <span style={{ fontSize:"13px", color:"var(--text-muted)" }}>מוכן להתחיל את השיחה החינוכית?</span>
              <button onClick={onStartLearning}
                style={{ background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"9px 22px", fontWeight:700, fontSize:"14px", cursor:"pointer", flexShrink:0 }}>
                🎓 התחל ללמוד
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Upload fail card ───────────────────────────────────────────────────────
function UploadFailCard({ reason, onDismiss }) {
  return (
    <div style={{ background:"var(--bg-card)", border:"1.5px solid #fca5a5", borderRadius:"var(--radius-md)", padding:"32px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:"14px", textAlign:"center" }}>
      <div style={{ fontSize:"44px" }}>📄</div>
      <div>
        <h3 style={{ margin:"0 0 8px", fontSize:"16px", fontWeight:700, color:"var(--text-primary)" }}>לא ניתן לעבד את הקובץ</h3>
        {reason.split("\n").map((line, i) => (
          <p key={i} style={{ margin:"4px 0", fontSize:"14px", color:"var(--text-secondary)", lineHeight:1.6 }}>{line}</p>
        ))}
      </div>
      <p style={{ margin:0, fontSize:"13px", color:"var(--text-muted)" }}>נסה להעלות קובץ PDF שמכיל טקסט (לא PDF סרוק).</p>
      <button onClick={onDismiss} style={{ padding:"10px 24px", background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontWeight:700, fontSize:"14px", cursor:"pointer", fontFamily:"inherit" }}>
        העלה קובץ אחר
      </button>
    </div>
  );
}

// ── Grade modal ────────────────────────────────────────────────────────────
function GradeModal({ grade, onClose }) {
  if (!grade) return null;
  const color = grade.score == null ? "#9ca3af" : grade.score >= 80 ? "#22c55e" : grade.score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"var(--bg-card)", borderRadius:"var(--radius-lg)", padding:"40px", maxWidth:"480px", width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", textAlign:"center", border:"1px solid var(--border)" }}>
        <div style={{ fontSize:"48px", marginBottom:"12px" }}>🎓</div>
        <h2 style={{ margin:"0 0 8px", color:"var(--text-primary)", fontSize:"22px" }}>סיכום השיחה</h2>
        {grade.score !== null ? (
          <div style={{ width:"100px", height:"100px", borderRadius:"50%", background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"32px", fontWeight:700, margin:"20px auto" }}>
            {grade.score}
          </div>
        ) : (
          <div style={{ fontSize:"40px", margin:"16px auto", textAlign:"center" }}>⚠️</div>
        )}
        <p style={{ color:"var(--text-secondary)", margin:"0 0 16px", lineHeight:1.6 }}>{grade.feedback}</p>
        {grade.breakdown && (
          <div style={{ background:"var(--bg-page)", borderRadius:"var(--radius-sm)", padding:"16px", marginBottom:"20px", textAlign:"right" }}>
            {grade.breakdown.map((item, i) => (
              <div key={i} style={{ marginBottom:"8px", fontSize:"13px", color:"var(--text-secondary)" }}>
                <strong style={{ color:"var(--text-primary)" }}>{item.category}:</strong> {item.comment}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ background:"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", padding:"12px 32px", fontWeight:600, fontSize:"15px", cursor:"pointer" }}>סגור</button>
      </div>
    </div>
  );
}

// ── Main ChatPage ──────────────────────────────────────────────────────────
function ChatPage() {
  const {
    documents, selectedDocumentId, selectedDocument,
    messages, inputValue, setInputValue, loading, uploadError,
    handleSendMessage, handleUploadDocument, handleSelectDocument,
    handleDeleteDocument, handleUpdateDocument, handleRestartSession,
  } = useChat();

  // Mode is always educator — the toggle was removed
  const [grade,       setGrade]       = useState(null);
  const [grading,     setGrading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadFailed, setUploadFailed] = useState(null);
  const [confirmRedo,  setConfirmRedo]  = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const { isMobile, isCompact } = useResponsiveLayout();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // NOTE: uploadFailed is cleared manually (on new upload start, dismiss, or manual doc select)
  //       NOT on selectedDocumentId change — deletion of failed doc also changes that.

  // ── Upload → validate → analyse → SAVE to document ──────────────────────
  const handleUpload = async (file) => {
    setUploading(true);
    setUploadFailed(null);
    try {
      const newDoc = await handleUploadDocument(file);
      if (!newDoc) return;

      // Validate text content
      const meaningful = (newDoc.extractedText || "")
        .replace(/\[עמוד \d+\]/g, "").replace(/\s+/g, " ").trim();

      if (meaningful.length < 150) {
        handleDeleteDocument(newDoc.id);
        setUploadFailed("הקובץ לא הכיל טקסט שניתן לחלץ.\nייתכן שמדובר ב-PDF סרוק (תמונה) שאינו מכיל שכבת טקסט.");
        return;
      }

      // ── Validation passed — NOW log to history ─────────────────────────
      addHistoryEvent({
        type:       "upload",
        documentId: newDoc.id,
        title:      `הועלה: ${newDoc.title}`,
        label:      "העלאת מאמר",
        date:       newDoc.date,
      }).catch(() => {});

      // Generate analysis
      const analysisText = await callClaudeMultiturn({
        system: "אתה מנתח מאמרים אקדמיים. ספק ניתוח מפורט ומובנה בעברית, השתמש ב-Markdown (כותרות, טבלאות, bold) כדי לארגן את המידע.",
        messages: [{ role: "user", content: `נתח את המאמר הבא וספק:\n1. **תקציר** (3-4 משפטים)\n2. **שאלת המחקר הראשית**\n3. **מתודולוגיה** (טבלה אם אפשר)\n4. **ממצאים עיקריים**\n5. **אלגוריתמים/שיטות** (ציין עמוד/סעיף)\n6. **מסקנות**\n\nהמאמר:\n${newDoc.extractedText?.slice(0, 8000) || newDoc.title}` }],
        maxTokens: 1200,
      }).catch(() => "לא הצלחתי לנתח.");

      // ── Save analysis INTO the document so it survives reload ──────────
      await handleUpdateDocument(newDoc.id, { analysis: analysisText });

    } catch (err) {
      // Duplicate-file errors: also surface via the prominent fail card
      if (err?.message) setUploadFailed(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Start learning ────────────────────────────────────────────────────────
  const handleStartLearning = async () => {
    if (!selectedDocument) return;
    const systemPrompt = buildSystemPrompt(selectedDocument.extractedText || selectedDocument.title, "educator");
    await handleSendMessage(
      { preventDefault: () => {} },
      systemPrompt,
      "התחל את השיחה החינוכית — הצג את עצמך בקצרה ושאל את השאלה הראשונה על המאמר."
    );
  };

  // ── Redo: clear messages + restart educator session ──────────────────────────
  const handleRedo = async () => {
    setConfirmRedo(false);
    await handleRestartSession();

    // Log fresh session to history
    addHistoryEvent({
      type:       "chat",
      documentId: selectedDocument.id,
      title:      `שיחה חדשה: ${selectedDocument.title}`,
      label:      "שיחה חדשה",
      date:       new Date().toLocaleDateString("he-IL"),
    }).catch(() => {});

    // Bot sends new opening question
    const systemPrompt = buildSystemPrompt(
      selectedDocument.extractedText || selectedDocument.title,
      "educator"
    );
    await handleSendMessage(
      { preventDefault: () => {} },
      systemPrompt,
      "התחל שיחה חינוכית חדשה. אל תתייחס לשיחות קודמות. הצג את עצמך בקצרה ושאל את השאלה הראשונה."
    );
  };

  // ── Grade session ─────────────────────────────────────────────────────────
  const handleEndSession = async () => {
    if (!selectedDocument || messages.length === 0) return;

    // Can't grade if the student never typed anything
    const studentMessages = messages.filter((m) => m.sender === "user");
    if (studentMessages.length === 0) {
      setGrade({
        score: 0,
        feedback: "לא ניתן לחשב ציון — לא ענית על אף שאלה. נסה לענות על לפחות שאלה אחת של המורה.",
        breakdown: [],
      });
      return;
    }

    setGrading(true);
    try {
      const conversationText = messages
        .map((m) => `${m.sender === "user" ? "סטודנט" : "מורה"}: ${m.text}`)
        .join("\n");

            const rawText = await callClaudeMultiturn({
        system: `You are an academic grader. Evaluate the student's answers in the conversation.
Output ONLY a valid JSON object — no intro text, no explanation, no markdown fences.
Exact shape required:
{"score":<integer 0-100>,"feedback":"<1-2 Hebrew sentences>","breakdown":[{"category":"הבנת תוכן","comment":"<Hebrew>"},{"category":"איכות תשובות","comment":"<Hebrew>"},{"category":"מעורבות","comment":"<Hebrew>"}]}`,
        messages: [{ role: "user", content: `Grade this teacher-student conversation and return ONLY the JSON:

${conversationText}` }],
        maxTokens: 1000,
      });
      

      // Extract the JSON object even if Claude wrapped it in surrounding text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("לא התקבל JSON תקין מהמודל");

      // Try to parse; if it fails, attempt common fixes (unquoted keys, trailing commas)
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        const fixed = jsonMatch[0]
          .replace(/,\s*([}\]])/g, "$1")              // trailing commas
          .replace(/([{,]\s*)([\w]+)(\s*:)/g, '$1"$2"$3'); // unquoted keys
        parsed = JSON.parse(fixed);
      }
      if (typeof parsed.score !== "number") throw new Error("ציון חסר בתשובה");
      setGrade(parsed);

      // ── Save grade to history ──────────────────────────────────────────
      addHistoryEvent({
        type:       "grade",
        documentId: selectedDocument.id,
        title:      `ציון ${parsed.score}/100 — ${selectedDocument.title}`,
        label:      `ציון ${parsed.score}`,
        score:      parsed.score,
        feedback:   parsed.feedback ?? "",
        breakdown:  Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
        documentTitle: selectedDocument.title,
        date:       new Date().toLocaleDateString("he-IL"),
      }).catch(() => {});

    } catch (err) {
      setGrade({ score: null, feedback: `שגיאה בחישוב הציון: ${err.message}`, breakdown: [] });
    } finally {
      setGrading(false);
    }
  };

  const isEducatorMode   = true; // always educator mode
  const chatStarted      = messages.length > 0;
  const hasAnalysis      = Boolean(selectedDocument?.analysis);
  // Input is blocked until user clicks "התחל ללמוד" (analysis exists but no messages yet)
  const awaitingStart    = hasAnalysis && !chatStarted && !uploadFailed;
  const isInputDisabled  = loading || uploading || !selectedDocument || awaitingStart;

  return (
    <div style={{ display:"flex", flexDirection:isCompact ? "column" : "row", width:"100%", minWidth:0, height:"100%", minHeight:0, overflow:"hidden" }}>
      <Sidebar
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={(id) => { handleSelectDocument(id); setGrade(null); setUploadFailed(null); setConfirmRedo(false); setAnalysisExpanded(false); }}
        onUpload={handleUpload}
        uploadError={uploadError}
        uploading={uploading}
        compact={isCompact}
        mobile={isMobile}
      />

      <div style={{ flex:"1 1 auto", minWidth:0, minHeight:0, display:"flex", flexDirection:"column", background:"var(--bg-page)", overflow:"hidden" }}>

        {/* ── Top bar ── */}
        <div style={{ padding:isMobile ? "10px 12px" : "10px 20px", background:"var(--bg-card)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px", flexShrink:0, minWidth:0, flexWrap:isMobile ? "wrap" : "nowrap" }}>
          {selectedDocument ? (
            <>
              <span style={{ fontSize:"18px" }}>📄</span>
              <span style={{ fontWeight:600, color:"var(--text-primary)", fontSize:"15px", flex:"1 1 auto", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{selectedDocument.title}</span>

              {/* Redo + Score — visible once chat has started */}
              {chatStarted && !confirmRedo && (
                <>
                  <button
                    onClick={() => setConfirmRedo(true)}
                    title="נקה את השיחה והתחל מחדש"
                    style={ghostBtn}
                  >
                    🔄 שיחה חדשה
                  </button>
                  <button
                    onClick={handleEndSession}
                    disabled={grading}
                    style={{ ...ghostBtn, background:"var(--brand-light)", color:"var(--brand)", fontWeight:700, border:"1px solid var(--brand)" }}
                  >
                    {grading ? "⏳ מחשב..." : "🏁 קבל ציון"}
                  </button>
                </>
              )}

              {/* Inline redo confirmation */}
              {chatStarted && confirmRedo && (
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"13px", color:"var(--text-muted)", whiteSpace:"nowrap" }}>למחוק ולהתחיל מחדש?</span>
                  <button
                    onClick={handleRedo}
                    style={{ ...ghostBtn, color:"#ef4444", borderColor:"#fca5a5", fontWeight:700 }}
                  >
                    כן, מחק
                  </button>
                  <button
                    onClick={() => setConfirmRedo(false)}
                    style={ghostBtn}
                  >
                    ביטול
                  </button>
                </div>
              )}
            </>
          ) : (
            <span style={{ color:"var(--text-muted)", fontSize:"14px" }}>
              {uploading ? "⏳ מנתח את המאמר..." : "העלה מאמר PDF כדי להתחיל"}
            </span>
          )}
        </div>

        {/* ── Content area: analysis pinned above messages ── */}
        <div style={{ flex:"1 1 auto", display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0, minWidth:0 }}>

          {/* Analysis card — pinned at top, always visible when doc has analysis */}
          {!uploading && !uploadFailed && hasAnalysis && (
            <div style={{ padding:isMobile ? "10px 10px 0" : "12px 16px 0", flex: analysisExpanded ? "1 1 auto" : "0 0 auto", minHeight:0, minWidth:0 }}>
              <AnalysisCard
                analysis={selectedDocument.analysis}
                docTitle={selectedDocument.title}
                onStartLearning={handleStartLearning}
                chatStarted={chatStarted}
                expanded={analysisExpanded}
                onToggle={() => setAnalysisExpanded((value) => !value)}
              />
            </div>
          )}

          {/* Scrollable messages area */}
          <div style={{ flex:1, overflowY:"auto", padding:isMobile ? "12px 10px" : "14px 16px", display: analysisExpanded && hasAnalysis ? "none" : "flex", flexDirection:"column", gap:"14px", minHeight:0 }}>

            {/* Upload spinner */}
            {uploading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:"14px", color:"var(--text-muted)", textAlign:"center", padding:"40px" }}>
                <div style={{ fontSize:"36px" }}>⏳</div>
                <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)", fontWeight:500 }}>קורא ומנתח את המאמר...</p>
              </div>
            )}

            {/* Upload fail */}
            {!uploading && uploadFailed && (
              <UploadFailCard reason={uploadFailed} onDismiss={() => setUploadFailed(null)} />
            )}

            {/* Empty state — no doc selected */}
            {!uploading && !uploadFailed && !selectedDocument && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", textAlign:"center", gap:"12px" }}>
                <span style={{ fontSize:"48px" }}>📂</span>
                <p style={{ margin:0, fontSize:"16px", color:"var(--text-secondary)" }}>העלה מאמר PDF מהתפריט הימני</p>
              </div>
            )}

            {/* Empty state — doc selected, no analysis yet (shouldn't normally happen) */}
            {!uploading && !uploadFailed && selectedDocument && !hasAnalysis && messages.length === 0 && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--text-muted)", textAlign:"center", gap:"12px" }}>
                <span style={{ fontSize:"48px" }}>🎓</span>
                <p style={{ margin:0, fontSize:"15px", color:"var(--text-secondary)" }}>שאל שאלה, והמורה יתחיל לשאול אותך שאלות</p>
              </div>
            )}

            {/* Messages */}
            {!uploading && !uploadFailed && messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing dots */}
            {loading && !uploading && (
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={avatarStyle("#6366f1")}>🧠</div>
                <div style={{ background:"var(--msg-bot-bg)", border:"1px solid var(--border)", borderRadius:"12px 12px 12px 4px", padding:"12px 16px", display:"flex", gap:"4px", alignItems:"center" }}>
                  {[0,1,2].map((i) => <span key={i} style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--brand)", display:"inline-block", animation:`bounce 1.2s ease-in-out ${i*.2}s infinite` }} />)}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div style={{ flexShrink:0, padding:isMobile ? "10px" : "14px 16px", background:"var(--bg-card)", borderTop:"1px solid var(--border)", boxShadow:"0 -2px 8px rgba(0,0,0,0.05)" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inputValue.trim() || isInputDisabled) return;
              handleSendMessage(e, buildSystemPrompt(selectedDocument.extractedText || selectedDocument.title, "educator"));
            }}
            style={{ display:"flex", flexDirection:isMobile ? "column" : "row", gap:"10px", alignItems:"stretch" }}
          >
            <input
              type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isInputDisabled}
              placeholder={
                uploading      ? "ממתין לניתוח..." :
                awaitingStart  ? "לחץ על 'התחל ללמוד' כדי להתחיל..." :
                !selectedDocument ? "העלה מאמר PDF..." :
                !chatStarted ? "שאל שאלה כדי שהמורה יתחיל..." : "ענה על שאלת המורה..."
              }
              dir="rtl"
              style={{ flex:1, width:"100%", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"13px 16px", fontSize:"14px", background:isInputDisabled?"var(--bg-page)":"var(--bg-input)", color:"var(--text-primary)", outline:"none", direction:"rtl", opacity:isInputDisabled?.6:1, fontFamily:"inherit" }}
              onFocus={(e) => { if (!isInputDisabled) { e.target.style.borderColor="var(--border-focus)"; e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,.12)"; } }}
              onBlur={(e) => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
            />
            <button type="submit" disabled={isInputDisabled || !inputValue.trim()}
              style={{ background:isInputDisabled||!inputValue.trim()?"var(--text-muted)":"var(--brand)", color:"#fff", border:"none", borderRadius:"var(--radius-md)", padding:"13px 22px", fontWeight:600, fontSize:"14px", cursor:isInputDisabled||!inputValue.trim()?"not-allowed":"pointer", whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit", width:isMobile ? "100%" : "auto" }}>
              {loading ? "..." : "שלח 🚀"}
            </button>
          </form>
          {isEducatorMode && chatStarted && messages.length > 0 && (
            <p style={{ margin:"6px 0 0", fontSize:"12px", color:"var(--text-muted)", textAlign:"center" }}>
              לחץ על <strong>🏁 קבל ציון</strong> בסיום השיחה כדי לקבל הערכה
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
      <GradeModal grade={grade} onClose={() => setGrade(null)} />
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isBot = message.sender === "bot";
  return (
    <div style={{ display:"flex", flexDirection:isBot?"row":"row-reverse", alignItems:"flex-end", gap:"10px" }}>
      <div style={avatarStyle(isBot?"#6366f1":"#9ca3af")}>{isBot?"🧠":"👤"}</div>
      <div style={{ maxWidth:"75%", padding:"12px 16px", borderRadius:isBot?"16px 16px 16px 4px":"16px 16px 4px 16px", background:isBot?"var(--msg-bot-bg)":"var(--msg-user-bg)", color:isBot?"var(--msg-bot-text)":"var(--msg-user-text)", border:isBot?"1px solid var(--border)":"none", direction:"rtl", textAlign:"right", wordBreak:"break-word" }}>
        {isBot
          ? <MarkdownContent text={message.text} />
          : <span style={{ fontSize:"14px", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{message.text}</span>}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const ghostBtn = { background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-secondary)", cursor:"pointer", padding:"6px 12px", fontSize:"13px", whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit" };
const xBtn     = { background:"var(--bg-page)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-secondary)", cursor:"pointer", padding:"4px 10px", fontSize:"12px", fontWeight:600, fontFamily:"inherit" };
function avatarStyle(bg) { return { width:"32px", height:"32px", borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0 }; }

export default ChatPage;
