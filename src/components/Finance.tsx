import React, { useState } from "react";
import { ZReport, UtilityLog, User } from "../types";
import { DollarSign, Percent, Plus, Trash2, Calendar, FileText, CheckCircle, Zap, Droplet, PhoneCall } from "lucide-react";

interface FinanceProps {
  reports: ZReport[];
  utilities: UtilityLog[];
  currentUser: User;
  onAddZReport: (data: Partial<ZReport>) => void;
  onAddUtility: (data: Partial<UtilityLog>) => void;
  onToggleUtility: (id: string, details: Partial<UtilityLog>) => void;
  deductRecipeIngredients: (recipeName: string, multiplier: number) => Promise<boolean>;
}

export default function Finance({
  reports,
  utilities,
  currentUser,
  onAddZReport,
  onAddUtility,
  onToggleUtility,
  deductRecipeIngredients,
}: FinanceProps) {
  const [cashVal, setCashVal] = useState("");
  const [posVal, setPosVal] = useState("");
  const [expenses, setExpenses] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [newExpName, setNewExpName] = useState("");
  const [newExpAmt, setNewExpAmt] = useState("");

  // Utility state
  const [utilName, setUtilName] = useState("ΔΕΗ - Ρεύμα");
  const [utilAmt, setUtilAmt] = useState("");
  const [utilDate, setUtilDate] = useState("");

  // Recipe deduction simulation
  const [deductProduct, setDeductProduct] = useState("freddo_espresso");
  const [deductQty, setDeductQty] = useState("10");

  const isAdmin = currentUser.role === "admin";

  const handleAddExpense = () => {
    if (!newExpName || !newExpAmt) return;
    setExpenses((p) => [
      ...p,
      { id: Date.now().toString(), name: newExpName, amount: parseFloat(newExpAmt) || 0 },
    ]);
    setNewExpName("");
    setNewExpAmt("");
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((p) => p.filter((e) => e.id !== id));
  };

  const handleSaveZ = () => {
    const cash = parseFloat(cashVal) || 0;
    const pos = parseFloat(posVal) || 0;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netCash = cash - totalExpenses;
    const totalProfit = cash + pos - totalExpenses;

    const share40 = totalProfit * 0.4;
    const share60 = totalProfit * 0.6;

    onAddZReport({
      cash,
      pos,
      expenses,
      totalExpenses,
      netCash,
      totalProfit,
      share40,
      share60,
    });

    // Reset fields
    setCashVal("");
    setPosVal("");
    setExpenses([]);
    alert("Το Z αποθηκεύτηκε και έγινε backup στο Google Drive (προσομοίωση)!");
  };

  const handleAddUtil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utilAmt || !utilDate) return;
    onAddUtility({
      name: utilName,
      amount: parseFloat(utilAmt) || 0,
      dueDate: utilDate,
      status: "pending",
    });
    setUtilAmt("");
    setUtilDate("");
  };

  const handleToggleUtilStatus = (item: UtilityLog) => {
    const nextStatus = item.status === "pending" ? "completed" : "pending";
    onToggleUtility(item.id, {
      status: nextStatus,
      paymentDate: nextStatus === "completed" ? new Date().toISOString().substring(0, 10) : undefined,
    });
  };

  const handleRecipeTrigger = async () => {
    const mult = parseInt(deductQty) || 1;
    const res = await deductRecipeIngredients(deductProduct, mult);
    if (res) {
      alert(`Τα υλικά για ${mult}x ${deductProduct === "freddo_espresso" ? "Freddo Espresso" : "Freddo Cappuccino"} αφαιρέθηκαν επιτυχώς από την αποθήκη!`);
      window.location.reload();
    } else {
      alert("Αποτυχία έκπτωσης. Ελέγξτε αν υπάρχει επαρκές απόθεμα.");
    }
  };

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
          Ταμείο & Οικονομικά
        </h2>
        <p className="text-xs text-slate-400">
          Ημερήσιο κλείσιμο Z, καταγραφή εξόδων, διαμοιρασμός κερδών 40% / 60% και παρακολούθηση λογαριασμών - πάγιων εξόδων.
        </p>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Z-REPORT FORM */}
          <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <Percent className="text-cyan-400" size={20} /> Ημερήσιο Κλείσιμο Ταμείου
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ζ Μετρητά (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={cashVal}
                    onChange={(e) => setCashVal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3.5 text-lg font-black text-white outline-none focus:border-cyan-500/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ζ POS (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={posVal}
                    onChange={(e) => setPosVal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3.5 text-lg font-black text-white outline-none focus:border-cyan-500/55"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                </div>
              </div>
            </div>

            {/* EXPENSES LOGGER */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ημερήσια Έξοδα από Μετρητά</p>

              {expenses.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850 space-y-2">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{exp.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-red-400">-{exp.amount.toFixed(2)}€</span>
                        <button
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-gray-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Περιγραφή..."
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
                />
                <input
                  type="number"
                  placeholder="Ποσό..."
                  value={newExpAmt}
                  onChange={(e) => setNewExpAmt(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="bg-slate-900 border border-slate-800 text-cyan-400 p-2.5 rounded-xl hover:bg-slate-850 cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* SAVE Z-REPORT */}
            <button
              onClick={handleSaveZ}
              className="w-full bg-cyan-500 text-slate-955 font-display font-black py-3.5 rounded-xl hover:bg-cyan-600 active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs uppercase"
            >
              ΥΠΟΛΟΓΙΣΜΟΣ & ΚΑΤΑΧΩΡΗΣΗ Ζ
            </button>
          </div>

          {/* DYNAMIC RETROSPECTIVE RESULTS */}
          {reports.length > 0 ? (
            <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"></div>
              <h3 className="font-display font-black text-cyan-400 text-sm uppercase tracking-widest pb-1">
                Συνεταιρικό Μερίδιο & Αναλύσεις
              </h3>

              {reports.slice(-1).map((r) => (
                <div key={r.id} className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-850">
                    <div>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Μερίδιο 40% (Owner A)</p>
                      <p className="text-xl font-display font-black text-white">{r.share40.toFixed(2)}€</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Μερίδιο 60% (Owner B)</p>
                      <p className="text-xl font-display font-black text-white">{r.share60.toFixed(2)}€</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 block text-xs">
                    <div className="flex justify-between items-center py-1 bg-slate-950/20 px-3 rounded-lg">
                      <span className="text-slate-400 font-medium">Καθαρά Μετρητά Συρταριού:</span>
                      <span className="font-bold text-white text-sm">{r.netCash.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center py-1 bg-slate-950/20 px-3 rounded-lg">
                      <span className="text-slate-400 font-medium">Συνολικό Κέρδος (Μετρητά + POS):</span>
                      <span className="font-bold text-green-400 text-sm">{r.totalProfit.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center py-1 bg-slate-950/20 px-3 rounded-lg">
                      <span className="text-slate-400 font-medium font-bold text-red-400">Έξοδα Ημέρας:</span>
                      <span className="font-bold text-red-400 text-sm">-{r.totalExpenses.toFixed(2)}€</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-500 font-bold uppercase text-center pt-2">
                    * Η βάση δεδομένων εξάγει αυτόματα αντίγραφο CSV στο Google Drive.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center text-slate-400 text-xs border border-white/5 rounded-3xl">
              <p className="font-bold mb-1">Δεν υπάρχει καταχωρημένο Z για σήμερα.</p>
              <p className="text-gray-500">Πληκτρολογήστε τα μετρητά και POS για να δημιουργήσετε την αναφορά.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-900 text-slate-450 p-6 rounded-3xl text-sm font-semibold max-w-md mx-auto text-center leading-relaxed">
          🔒 Τα οικονομικά στοιχεία, οι τιμές κόστους και οι διαμοιρασμοί κερδών είναι ορατά μόνο στους Ιδιοκτήτες.
        </div>
      )}

      {/* INGREDIENTS RECIPE DECREMENT SIMULATOR */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
          <Zap className="text-cyan-400" size={20} /> Αυτόματη Έκπτωση Υλικών (Recipe Deductor)
        </h3>
        <p className="text-xs text-slate-400 leading-normal">
          Όταν σερβίρονται καφέδες, αφαιρέστε αυτόματα τα αντίστοιχα γραμμάρια καφέ, γάλακτος, ποτηριών και καλαμακίων από το σύστημα stock της αποθήκης.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={deductProduct}
            onChange={(e) => setDeductProduct(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-slate-355 outline-none cursor-pointer"
          >
            <option value="freddo_espresso">Freddo Espresso (Κόκκοι, Ποτήρι, Καλαμάκι)</option>
            <option value="freddo_cappuccino">Freddo Cappuccino (Κόκκοι, Γάλα, Ποτήρι, Καλαμάκι)</option>
            <option value="freddo_cappuccino_vegan">Freddo Cappuccino Vegan (Κόκκοι, Γάλα Αμυγδάλου, Ποτήρι)</option>
          </select>

          <input
            type="number"
            value={deductQty}
            onChange={(e) => setDeductQty(e.target.value)}
            placeholder="Ποσότητα"
            className="w-24 bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-center font-bold text-white outline-none"
          />

          <button
            onClick={handleRecipeTrigger}
            className="bg-cyan-500 text-slate-955 font-display font-black px-6 py-3 rounded-xl hover:bg-cyan-600 active:scale-[0.97] transition-all cursor-pointer text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            Έκπτωση
          </button>
        </div>
      </div>

      {/* HELPERS & UTILITY TRACKER (DEH, EYDAP, κτλ) */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
          <Calendar className="text-cyan-400" size={20} /> Λογαριασμοί - Πάγια Έξοδα
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active tracker list */}
          <div className="space-y-3.5">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Εγγεγραμμένοι Λογαριασμοί</p>

            {utilities.length === 0 ? (
              <p className="text-xs text-gray-600 font-semibold pl-1">Δεν έχουν προστεθεί λογαριασμοί.</p>
            ) : (
              utilities.map((item) => {
                const isPaid = item.status === "completed";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleUtilStatus(item)}
                    className={`p-3.5 rounded-2xl border flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${
                      isPaid
                        ? "bg-slate-950/40 border-slate-850 text-slate-355 opacity-70 hover:opacity-100"
                        : "bg-cyan-950/20 border-cyan-900/30 text-white hover:border-cyan-550/45 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        isPaid ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-cyan-500/10 text-cyan-400 border-cyan-550/30"
                      }`}>
                        {item.name.includes("Ρεύμα") || item.name.includes("ΔΕΗ") ? (
                          <Zap size={16} />
                        ) : item.name.includes("Ύδρευση") || item.name.includes("ΕΥΔΑΠ") ? (
                          <Droplet size={16} />
                        ) : (
                          <PhoneCall size={16} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                          {isPaid ? `Εξοφλήθηκε στις: ${item.paymentDate}` : `DueDate: ${item.dueDate}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <p className="font-display font-black text-sm text-white">{item.amount.toFixed(2)}€</p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        isPaid ? "bg-green-950/40 text-green-400 border border-green-900/30" : "bg-red-955 text-red-500 border border-red-900/20 animate-pulse"
                      }`}>
                        {isPaid ? "ΕΖΟΦΛΗΘΗ" : "ΕΚΚΡΕΜΕΙ"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add utilities form */}
          {isAdmin && (
            <div className="bg-slate-950/45 p-4.5 rounded-2xl border border-white/5 space-y-3.5">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Προσθήκη Λογαριασμού</p>
              <form onSubmit={handleAddUtil} className="space-y-3">
                <select
                  value={utilName}
                  onChange={(e) => setUtilName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none cursor-pointer"
                >
                  <option value="ΔΕΗ - Ρεύμα">ΔΕΗ (Ηλεκτρικό Ρεύμα)</option>
                  <option value="ΕΥΔΑΠ - Ύδρευση">ΕΥΔΑΠ (Νερό)</option>
                  <option value="ΟΣΤΕ - Τηλεφωνία">Τηλεφωνία & Internet</option>
                  <option value="Ενοίκιο Καταστήματος">Ενοίκιο</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ποσό (€)"
                    value={utilAmt}
                    onChange={(e) => setUtilAmt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500/50"
                  />
                  <input
                    type="date"
                    required
                    value={utilDate}
                    onChange={(e) => setUtilDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-500 text-slate-955 font-display font-black py-2.5 rounded-xl hover:bg-cyan-600 transition-all cursor-pointer text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Προσθήκη Λογαριασμού
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
