import React, { useState } from "react";
import { Shift, User } from "../types";
import { Calendar, User as UserIcon, Plus } from "lucide-react";

interface ShiftPlannerProps {
  shifts: Shift[];
  currentUser: User;
  allUsers: User[];
  onAddShift: (data: Partial<Shift>) => void;
}

export default function ShiftPlanner({
  shifts,
  currentUser,
  allUsers,
  onAddShift,
}: ShiftPlannerProps) {
  // Shift form states
  const [shiftUser, setShiftUser] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [shiftHours, setShiftHours] = useState("Πρωί (07:00 - 15:00)");

  const isAdmin = currentUser.role === "admin";

  const handleShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftUser || !shiftDate) return;
    onAddShift({
      userName: shiftUser,
      date: shiftDate,
      hours: shiftHours,
      status: "scheduled",
    });
    setShiftDate("");
  };

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
          Βάρδιες Προσωπικού
        </h2>
        <p className="text-xs text-slate-400">
          Προγραμματισμός και διαχείριση υπηρεσιών των υπαλλήλων του καταστήματος.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SHIFT PLANNER & ROSTER */}
        <div className={`glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4 ${isAdmin ? "md:col-span-2" : "md:col-span-3"}`}>
          <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
            <Calendar className="text-cyan-400" size={20} /> Πρόγραμμα Βαρδιών
          </h3>

          <div className="space-y-3.5 max-h-96 overflow-y-auto custom-scrollbar">
            {shifts.length === 0 ? (
              <p className="text-xs text-gray-500 font-semibold pl-1">Δεν έχουν προγραμματιστεί βάρδιες.</p>
            ) : (
              shifts.map((sh) => (
                <div key={sh.id} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center border border-cyan-500/15">
                      <UserIcon size={14} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{sh.userName}</p>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase">Ώρες: {sh.hours}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-slate-350">{sh.date}</p>
                    <span className="text-[8px] bg-green-950/40 text-green-400 border border-green-900/30 px-1.5 py-0.5 rounded font-black mt-1 inline-block uppercase tracking-wider">
                      {sh.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Shift form (Admins only) */}
        {isAdmin && (
          <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <Plus className="text-cyan-400" size={18} /> Νέα Βάρδια
            </h3>
            <form onSubmit={handleShiftSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Υπάλληλος</label>
                <select
                  value={shiftUser}
                  onChange={(e) => setShiftUser(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none cursor-pointer"
                >
                  <option value="">Επιλογή Υπαλλήλου</option>
                  {allUsers.filter((u) => u.approved).map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ημερομηνία</label>
                <input
                  type="date"
                  required
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ωράριο</label>
                <select
                  value={shiftHours}
                  onChange={(e) => setShiftHours(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none cursor-pointer"
                >
                  <option value="Πρωί (07:00 - 15:00)">Πρωί (07:00 - 15:00)</option>
                  <option value="Απόγευμα (15:00 - 23:00)">Απόγευμα (15:00 - 23:00)</option>
                  <option value="Εκπαιδευτική (10:00 - 16:00)">Εκπαιδευτική (10:00 - 16:05)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 text-slate-955 font-display font-black py-3 rounded-xl hover:bg-cyan-600 transition-all cursor-pointer text-xs uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Καταχώρηση Βάρδιας
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
