import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import {
  MessageSquare,
  Pin,
  CheckSquare,
  FileText,
  Trash2,
  Plus,
  Send,
  User as UserIcon,
  Smile,
  ShieldAlert,
  Archive,
  Mail,
  Check,
} from "lucide-react";

interface CommunicationProps {
  announcements: any[];
  groupChat: any[];
  userNotes: any[];
  feedbackMessages: any[];
  currentUser: User;
  onAddAnnouncement: (text: string) => void;
  onDeleteAnnouncement: (id: string) => void;
  onSendChatMessage: (text: string) => void;
  onAddNote: (text: string) => void;
  onToggleNote: (id: string, completed: boolean) => void;
  onDeleteNote: (id: string) => void;
}

export default function Communication({
  announcements,
  groupChat,
  userNotes,
  feedbackMessages,
  currentUser,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onSendChatMessage,
  onAddNote,
  onToggleNote,
  onDeleteNote,
}: CommunicationProps) {
  const [activeSubTab, setActiveSubTab] = useState<"announcements" | "chat" | "notes" | "feedback">("announcements");
  
  // Input fields
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [newNote, setNewNote] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = currentUser.role === "admin";

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeSubTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupChat, activeSubTab]);

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    onAddAnnouncement(newAnnouncement.trim());
    setNewAnnouncement("");
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChatMessage(chatInput.trim());
    setChatInput("");
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote("");
  };

  // Filter notes belonging to the logged-in user
  const myNotes = userNotes.filter((n) => n.userId === currentUser.id || n.userName === currentUser.name);

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
          Επικοινωνία & Σημειώσεις
        </h2>
        <p className="text-xs text-slate-400">
          Πίνακας ανακοινώσεων, ομαδική συνομιλία, προσωπικές σημειώσεις και διαχείριση παραπόνων πελατών.
        </p>
      </div>

      {/* Sub Tabs Selection */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5 hide-scrollbar">
        <button
          onClick={() => setActiveSubTab("announcements")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "announcements"
              ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Pin size={14} />
          Πίνακας Ανακοινώσεων
        </button>

        <button
          onClick={() => setActiveSubTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "chat"
              ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare size={14} />
          Ομαδικό Chat
        </button>

        <button
          onClick={() => setActiveSubTab("notes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "notes"
              ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CheckSquare size={14} />
          Προσωπικές Σημειώσεις
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab("feedback")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "feedback"
                ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldAlert size={14} />
            Κυτίο Παραπόνων (Feedback)
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* 1. ANNOUNCEMENTS BOARD */}
        {activeSubTab === "announcements" && (
          <div className="space-y-4">
            {/* Create Announcement (Admins Only) */}
            {isAdmin && (
              <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
                <h3 className="font-display font-black text-white text-sm flex items-center gap-2">
                  <Plus className="text-cyan-400" size={16} /> Νέα Ανακοίνωση Διαχειριστή
                </h3>
                <form onSubmit={handleAnnouncementSubmit} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Γράψτε μια νέα ανακοίνωση για το προσωπικό..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-500 text-slate-955 font-display font-black px-5 py-3 rounded-xl hover:bg-cyan-600 active:scale-[0.97] transition-all cursor-pointer text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5"
                  >
                    <Pin size={12} />
                    Αναρτηση
                  </button>
                </form>
              </div>
            )}

            {/* List Announcements */}
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center text-slate-500 text-xs border border-white/5 rounded-3xl">
                  <p className="font-bold">Δεν υπάρχουν τρέχουσες ανακοινώσεις.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Οι ιδιοκτήτες μπορούν να αναρτήσουν σημαντικά μηνύματα εδώ.</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="glass-card p-5 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden flex justify-between items-start gap-4">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {ann.author || "Owner"}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {new Date(ann.date).toLocaleDateString("el-GR")} {new Date(ann.date).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-semibold">{ann.text}</p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
                        title="Διαγραφή ανακοίνωσης"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. TEAM GROUP CHAT */}
        {activeSubTab === "chat" && (
          <div className="glass-card rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col h-[420px] md:h-[500px]">
            {/* Header */}
            <div className="bg-white/5 px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <h3 className="font-display font-black text-white text-sm">
                  Ομαδικό Chat Καταστήματος
                </h3>
              </div>
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                Όλοι οι χρήστες
              </span>
            </div>

            {/* Message Pane */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5 custom-scrollbar bg-slate-950/20">
              {groupChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-550 text-xs">
                  <Smile size={32} className="text-gray-650 mb-2" />
                  <p className="font-bold">Δεν υπάρχουν μηνύματα στη συνομιλία.</p>
                  <p className="text-[10px] mt-1">Στείλτε το πρώτο μήνυμα για να ξεκινήσετε τη συζήτηση!</p>
                </div>
              ) : (
                groupChat.map((msg) => {
                  const isMe = msg.userName === currentUser.name || msg.userId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 pl-1 pr-1 text-[9px] font-bold text-gray-500">
                        <span>{msg.userName}</span>
                        <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 uppercase tracking-wider">
                          {msg.role === "admin" ? "Owner" : "Staff"}
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          {new Date(msg.date).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div
                        className={`px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed border ${
                          isMe
                            ? "bg-cyan-500 text-slate-955 border-cyan-400 rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-slate-900 text-slate-200 border-white/5 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Form */}
            <form onSubmit={handleChatSubmit} className="p-4 bg-white/5 border-t border-white/5 flex gap-2 shrink-0">
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Πληκτρολογήστε μήνυμα..."
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                className="bg-cyan-500 text-slate-955 font-display font-black px-4.5 rounded-xl hover:bg-cyan-600 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* 3. PERSONAL USER NOTES */}
        {activeSubTab === "notes" && (
          <div className="space-y-4">
            {/* Create Note Card */}
            <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-3">
              <h3 className="font-display font-black text-white text-sm flex items-center gap-2">
                <CheckSquare className="text-cyan-400" size={16} /> Οι Προσωπικές μου Σημειώσεις
              </h3>
              <p className="text-[10px] text-slate-450 leading-relaxed pl-1">
                Αυτές οι σημειώσεις είναι ορατές μόνο σε εσάς. Χρησιμοποιήστε τις ως προσωπική λίστα εργασιών.
              </p>
              <form onSubmit={handleNoteSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Προσθήκη νέας σημείωσης..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
                />
                <button
                  type="submit"
                  className="bg-cyan-500 text-slate-955 font-display font-black px-5 py-3 rounded-xl hover:bg-cyan-600 active:scale-[0.97] transition-all cursor-pointer text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5"
                >
                  <Plus size={12} />
                  Προσθηκη
                </button>
              </form>
            </div>

            {/* List Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myNotes.length === 0 ? (
                <div className="glass-card p-6 col-span-2 flex flex-col items-center justify-center text-center text-slate-500 text-xs border border-white/5 rounded-3xl">
                  <p className="font-bold">Δεν έχετε καταγράψει προσωπικές σημειώσεις.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Πληκτρολογήστε μια σημείωση παραπάνω για να την κρατήσετε στη λίστα σας.</p>
                </div>
              ) : (
                myNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`glass-card p-4.5 rounded-2xl border flex items-center justify-between gap-4 transition-all shadow-md ${
                      note.completed
                        ? "bg-slate-950/20 border-white/5 opacity-55 text-slate-400 line-through"
                        : "bg-slate-900/40 border-white/10 text-white"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => onToggleNote(note.id, !note.completed)}
                        style={{ touchAction: 'manipulation' }}
                        className={`w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                          note.completed
                            ? "bg-cyan-500 border-cyan-400 text-slate-950"
                            : "border-white/20 hover:border-cyan-500/50 bg-slate-950"
                        }`}
                      >
                        {note.completed && <Check size={13} strokeWidth={3} />}
                      </button>

                      <p className="text-xs font-semibold leading-normal break-words py-0.5">
                        {note.text}
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
                      title="Διαγραφή σημείωσης"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. CUSTOMER COMPLAINTS / FEEDBACK BOX (Owner Only) */}
        {activeSubTab === "feedback" && isAdmin && (
          <div className="space-y-4">
            <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500"></div>
              <h3 className="font-display font-black text-white text-base flex items-center gap-2">
                <ShieldAlert className="text-amber-500 animate-pulse" size={20} /> Κυτίο Παραπόνων (Customer Feedback)
              </h3>
              <p className="text-xs text-slate-400 leading-normal pl-1">
                Σχόλια, παράπονα και παρατηρήσεις πελατών που υποβάλλονται απευθείας από την ιστοσελίδα <span className="text-cyan-400 font-bold">enteka.online</span>.
              </p>
            </div>

            <div className="space-y-3.5">
              {feedbackMessages.length === 0 ? (
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center text-slate-550 text-xs border border-white/5 rounded-3xl">
                  <p className="font-bold">Δεν υπάρχουν υποβληθέντα σχόλια ή παράπονα.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Τα σχόλια από την ιστοσελίδα enteka.online θα εμφανίζονται αυτόματα εδώ.</p>
                </div>
              ) : (
                feedbackMessages.map((msg) => (
                  <div key={msg.id} className="glass-card p-5 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold text-gray-500">
                        <span className="text-slate-200 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {msg.customerName || "Ανώνυμος Πελάτης"}
                        </span>
                        {msg.email && (
                          <span className="flex items-center gap-1 text-cyan-400 font-mono">
                            <Mail size={10} />
                            {msg.email}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono">
                          {new Date(msg.date || Date.now()).toLocaleDateString("el-GR")} {new Date(msg.date || Date.now()).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-semibold italic bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                        "{msg.message}"
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {msg.email && (
                        <a
                          href={`mailto:${msg.email}?subject=Απάντηση%20στο%20σχόλιό%20σας%20-%20Enteka`}
                          className="bg-cyan-500 text-slate-955 font-display font-black px-3.5 py-2.5 rounded-xl hover:bg-cyan-600 transition-all text-[10px] uppercase flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        >
                          <Mail size={12} />
                          Απαντηση
                        </a>
                      )}
                      <button
                        onClick={() => alert("Το μήνυμα αρχειοθετήθηκε (προσομοίωση).")}
                        className="bg-white/5 border border-white/10 text-slate-400 hover:text-white p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                        title="Αρχειοθέτηση"
                      >
                        <Archive size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
