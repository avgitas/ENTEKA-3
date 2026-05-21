import React, { useState } from "react";
import { User, UserRole } from "../types";
import { Lock, Sparkles, User as UserIcon } from "lucide-react";

interface AuthProps {
  onLoginSuccess: (user: User) => void;
  allUsers: User[];
  apiError: string;
}

export default function Auth({ onLoginSuccess, allUsers, apiError }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password || (mode === "register" && !name)) {
      setErrorMsg("Παρακαλώ συμπληρώστε όλα τα πεδία.");
      return;
    }

    try {
      if (mode === "login") {
        // Simple auth matching against local db users
        const response = await fetch("/api/db");
        const db = await response.json();
        const found = db.users.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (!found) {
          setErrorMsg("Ο λογαριασμός δεν βρέθηκε. Δοκιμάστε εγγραφή.");
          return;
        }

        // Simulating matching password (allow any password since it's a sandbox, but check for approved state)
        if (!found.approved && found.role !== "admin") {
          setMode("login");
          setErrorMsg("Ο λογαριασμός σας εκκρεμεί προς έγκριση από τον Ιδιοκτήτη.");
          return;
        }

        onLoginSuccess(found);
      } else {
        // Registering a user
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "user_" + Date.now(),
            name,
            email,
            role,
            approved: role === "admin" ? true : false, // Admins (Owners) auto-approved for testing, employees require approval
          }),
        });

        if (!res.ok) {
          throw new Error("Αποτυχία εγγραφής.");
        }

        if (role === "admin") {
          setSuccessMsg("Ο λογαριασμός Ιδιοκτήτη δημιουργήθηκε! Συνδεθείτε.");
        } else {
          setSuccessMsg("Η αίτηση εστάλη! Περιμένετε έγκριση από τον Ιδιοκτήτη.");
        }
        setMode("login");
        setEmail(email);
        setPassword("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Παρουσιάστηκε σφάλμα.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/15 via-transparent to-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium background radial flares */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/5 rounded-full filter blur-[90px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full filter blur-[90px] animate-pulse-slow" style={{ animationDelay: "-6s" }}></div>

      <div className="glass-card p-8 rounded-3xl w-full max-w-sm z-10 border border-white/10 shadow-2xl animate-in zoom-in-95">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 gold-glow animate-float">
            <Lock size={28} />
          </div>
          <h1 className="text-4xl font-display font-black text-white tracking-widest mb-1 gold-text-glow">
            ΕΝΤΕΚΑ<span className="text-cyan-400">.</span>
          </h1>
          <p className="text-cyan-400 text-xs font-semibold tracking-widest uppercase">
            Κέντρο Ελέγχου
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-950/40 text-red-400 text-xs p-3.5 rounded-xl border border-red-900/40 animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-950/40 text-green-400 text-xs p-3.5 rounded-xl border border-green-900/40 animate-in fade-in">
              {successMsg}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5">
                ΟΝΟΜΑΤΕΠΩΝΥΜΟ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 focus:bg-white/10 border border-white/5 p-3.5 rounded-xl outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] text-white text-sm transition-all"
                placeholder="π.χ. Γιώργος Αυγητίδης"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 focus:bg-white/10 border border-white/5 p-3.5 rounded-xl outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] text-white text-sm transition-all"
              placeholder="username@enteka.gr"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5">
              ΚΩΔΙΚΟΣ
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 focus:bg-white/10 border border-white/5 p-3.5 rounded-xl outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] text-white text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5">
                ΡΟΛΟΣ ΧΡΗΣΤΗ
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white/5 border border-white/5 p-3.5 rounded-xl outline-none text-slate-300 text-sm focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="employee">Υπάλληλος (Barista)</option>
                <option value="admin">Ιδιοκτήτης (Admin)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-cyan-500 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg hover:bg-cyan-600 active:scale-[0.98] transition-all duration-200 mt-2 cursor-pointer gold-glow font-display text-sm tracking-wide"
          >
            {mode === "login" ? "Είσοδος" : "Δημιουργία Λογαριασμού"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-xs font-bold text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            {mode === "login"
              ? "Δεν έχετε λογαριασμό; Εγγραφή"
              : "Έχετε ήδη λογαριασμό; Είσοδος"}
          </button>
        </div>
      </div>
    </div>
  );
}
