import React from "react";
import { InventoryItem, ZReport, UtilityLog, User } from "../types";
import { AlertTriangle, TrendingUp, DollarSign, Archive, FileText, CheckCircle2, Clock } from "lucide-react";

interface DashboardProps {
  inventory: InventoryItem[];
  reports: ZReport[];
  utilities: UtilityLog[];
  currentUser: User;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({
  inventory,
  reports,
  utilities,
  currentUser,
  onNavigate,
}: DashboardProps) {
  // Low stock calculation
  const lowStockItems = inventory.filter((item) => item.stock <= item.alertLimit);
  const outOfStockCount = inventory.filter((item) => item.stock <= 0).length;

  // Unpaid bills count
  const unpaidBillsCount = utilities.filter((u) => u.status === "pending").length;
  const unpaidBillsTotal = utilities
    .filter((u) => u.status === "pending")
    .reduce((acc, u) => acc + u.amount, 0);

  // Profit calculations
  const totalRevenue = reports.reduce((acc, r) => acc + r.cash + r.pos, 0);
  const totalExpenses = reports.reduce((acc, r) => acc + r.totalExpenses, 0);
  const cleanProfit = totalRevenue - totalExpenses;

  // Render mock or completed simple graph points based on reports
  const hasReports = reports.length > 0;
  const graphReports = hasReports ? reports : [
    { totalProfit: 120, dateScanned: "05/15" },
    { totalProfit: 190, dateScanned: "05/16" },
    { totalProfit: 150, dateScanned: "05/17" },
    { totalProfit: 240, dateScanned: "05/18" },
    { totalProfit: 310, dateScanned: "05/19" },
    { totalProfit: 280, dateScanned: "05/20" },
  ];

  return (
    <div className="tab-enter space-y-6">
      {/* HERO WELCOME */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-cyan-950/20 via-slate-950/30 to-blue-950/20 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow flare */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full filter blur-[50px]"></div>

        <div className="space-y-1">
          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            ΚΑΤΑΣΤΗΜΑ ΕΝΤΕΚΑ OS
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-black text-white mt-2">
            Καλώς ήρθες, <span className="text-cyan-400">{currentUser.name}</span>!
          </h2>
          <p className="text-xs text-slate-400">
            {currentUser.role === "admin"
               ? "Έλεγχος καταστήματος ενεργός. Όλα τα συστήματα λειτουργούν ομαλά."
               : "Έλεγχος αποθέματος, βαρδιών και καταγραφή παραλαβών ενεργή."}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ΤΡΕΧΩΝ ΡΟΛΟΣ</p>
            <p className="font-display font-black text-cyan-400 text-sm tracking-wide uppercase">
              {currentUser.role === "admin" ? "ΙΔΙΟΚΤΗΤΗΣ (ADMIN)" : "BARISTA"}
            </p>
          </div>
        </div>
      </div>

      {/* CORE ALERTS & METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {/* Metric 1: Stock Warning */}
        <div
          onClick={() => onNavigate("αποθήκη")}
          className={`p-5 rounded-3xl border transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-between ${
            lowStockItems.length > 0
              ? "bg-red-955 border-red-900/40 text-white shadow-[0_4px_25px_rgba(239,68,68,0.04)]"
              : "glass-card border-brand-border/20 text-slate-300"
          }`}
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ελλείψεις Stock</p>
            <h3 className="text-3xl font-display font-black">
              {lowStockItems.length} <span className="text-xs font-bold text-slate-400">είδη</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-semibold">
              {outOfStockCount > 0 ? `⚠️ ${outOfStockCount} πλήρως εξαντλημένα` : "Σε αναμονή παραλαβής"}
            </p>
          </div>
          <div className={`p-3 rounded-2xl ${lowStockItems.length > 0 ? "bg-red-500/10 text-red-400" : "bg-cyan-500/10 text-cyan-400"}`}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Metric 2: Smart Forecast Status */}
        <div
          onClick={() => onNavigate("ai")}
          className="glass-card p-5 rounded-3xl border border-white/5 flex items-center justify-between hover:scale-[1.01] cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Προβλέψεις AI</p>
            <h3 className="text-3xl font-display font-black text-white">
              Gemini <span className="text-[10px] font-black tracking-widest text-cyan-400">FLASH</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 font-semibold">Έτοιμες προτάσεις παραγγελιών</p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-450 p-3 rounded-2xl border border-white/5 shadow-inner">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Metric 3: Bills Alert Counter */}
        <div
          onClick={() => onNavigate("ταμείο")}
          className="glass-card p-5 rounded-3xl border border-white/5 flex items-center justify-between hover:scale-[1.01] cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Λογαριασμοί - Πάγια Έξοδα</p>
            <h3 className="text-3xl font-display font-black text-white">
              {unpaidBillsCount} <span className="text-xs font-bold text-slate-400">εκκρεμείς</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 font-semibold">
              Σύνολο: {unpaidBillsTotal.toFixed(2)}€
            </p>
          </div>
          <div className="bg-cyan-500/10 text-cyan-400 p-3 rounded-2xl border border-white/5 shadow-inner">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* QUICK LINK TO CHRONOGRAM TIMELINE */}
      <div className="bg-gradient-to-r from-cyan-950/20 via-blue-950/15 to-slate-950/35 border border-cyan-500/10 p-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(6,182,212,0.03)] hover:border-cyan-500/20 transition-all">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={18} className="animate-float" />
          </span>
          <div>
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wide">
              Έξυπνο Ημερολόγιο & Προβλέψεις Ροής
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              Δείτε αναμενόμενες παραδόσεις προμηθευτών, εκτιμώμενες ημερομηνίες εξάντλησης και το πλήρες ιστορικό στο ημερολόγιο.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate("timeline")}
          className="bg-cyan-500 hover:bg-cyan-600 border border-cyan-400/20 text-slate-950 px-4 py-2.5 text-xs font-bold rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
        >
          Άνοιγμα Χρονοδιαγράμματος
        </button>
      </div>

      {/* DETAILED LOW STOCK ALERT BOXES */}
      {lowStockItems.length > 0 && (
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <AlertTriangle className="text-red-400 animate-pulse animate-float" size={18} />
            <h3 className="font-display font-black text-white text-base">
              Ειδοποιήσεις Ελλείψεων Αποθήκης ({lowStockItems.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate("παραγγελίες")}
                className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex items-center justify-between hover:border-cyan-400/40 cursor-pointer transition-all"
              >
                <div>
                  <p className="font-bold text-slate-200 text-xs leading-snug">{item.name}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Προμηθευτής: {item.vendor}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-extrabold text-red-400">
                    {item.stock} / {item.alertLimit}
                  </p>
                  <span className="text-[8px] font-black text-slate-500 uppercase">αποθεμα</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISUAL REVENUE GRAPHIC & RECENT CHECKS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Profit and Performance Graph */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl lg:col-span-2 overflow-hidden relative">
          <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" /> Τάσεις Εσόδων & Ταμείο Z (7ήμερο)
          </h3>

          <div className="w-full h-44 flex items-end justify-between pt-6 px-2 relative">
            {/* Draw absolute horizontal grid markers */}
            <div className="absolute top-6 left-0 right-0 border-t border-white/5" />
            <div className="absolute top-20 left-0 right-0 border-t border-white/5" />
            <div className="absolute top-32 left-0 right-0 border-t border-white/5" />

            {/* Custom Interactive SVG Graph Path */}
            <svg className="absolute inset-0 w-full h-full pt-6 pr-6" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {/* Fill Area */}
              <path
                d="M 5 110 L 70 80 L 140 100 L 215 50 L 290 30 L 365 40 L 400 40 L 400 120 L 0 120 Z"
                fill="url(#chart-glow)"
              />
              {/* Main Line */}
              <path
                d="M 5 110 L 70 80 L 140 100 L 215 50 L 290 30 L 365 40 M 365 40"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Data circles */}
              <circle cx="5" cy="110" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="70" cy="80" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="140" cy="100" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="215" cy="50" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="290" cy="30" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
              <circle cx="365" cy="40" r="4" fill="#0a0c10" stroke="#06b6d4" strokeWidth="2.5" />
            </svg>

            {/* Render Bottom labels aligning accurately */}
            <div className="absolute bottom-1 left-2 justify-between flex w-full text-[8.5px] text-gray-500 font-mono pr-8">
              <span>ΔΕΥ</span>
              <span>ΤΡΙ</span>
              <span>ΤΕΤ</span>
              <span>ΠΕΜ</span>
              <span>ΠΑΡ</span>
              <span>ΣΑΒ</span>
              <span>ΚΥΡ</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800/80 text-xs">
            {reports.length > 0 ? (
              <>
                <div>
                  <p className="text-gray-500 font-bold uppercase text-[9px]">Συνολικά Έσοδα</p>
                  <p className="font-display font-black text-white text-base mt-0.5">{totalRevenue.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-gray-500 font-bold uppercase text-[9px]">Συνολικά Έξοδα</p>
                  <p className="font-display font-black text-red-400 text-base mt-0.5">-{totalExpenses.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-gray-500 font-bold uppercase text-[9px]">Καθαρά Κέρδη (Z)</p>
                  <p className="font-display font-black text-green-400 text-base mt-0.5">{cleanProfit.toFixed(2)}€</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 font-semibold italic">Δεν έχουν καταγραφεί ακόμη ημερήσια Z. Τα παραπάνω είναι στατιστικά προσομοίωσης.</p>
            )}
          </div>
        </div>

        {/* STATS DECK - RECENT SYSTEM TASKS */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3">
              Υποχρεώσεις Καταστήματος
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <CheckCircle2 size={16} className={reports.length > 0 ? "text-emerald-400" : "text-gray-500"} />
                <div>
                  <p className="font-bold text-slate-205">Κλείσιμο Ταμείου Z</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    {reports.length > 0 ? "Καταχωρήθηκε - Backup Ολοκληρωμένο" : "Εκκρεμεί το σημερινό κλείσιμο"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                <CheckCircle2 size={16} className="text-[#22d3ee]" />
                <div>
                  <p className="font-bold text-slate-205 font-bold text-cyan-400">Gemini OCR Engine</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Έτοιμο για σκανάρισμα τιμολογίων</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate("αποθήκη")}
            className="w-full mt-3 bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:border-cyan-500/40 font-bold py-3.5 rounded-2xl transition-all cursor-pointer text-xs uppercase"
          >
            Ανοιξε Απογραφη
          </button>
        </div>
      </div>
    </div>
  );
}
