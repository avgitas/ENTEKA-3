import React from "react";
import { User, ActivityAudit } from "../types";
import { ShieldAlert, Check, X, UserX, UserCheck, ScrollText } from "lucide-react";

interface ActivityHistoryProps {
  currentUser: User;
  allUsers: User[];
  activities: ActivityAudit[];
  onApproveUser: (id: string, approve: boolean) => void;
}

export default function ActivityHistory({
  currentUser,
  allUsers,
  activities,
  onApproveUser,
}: ActivityHistoryProps) {
  const isAdmin = currentUser.role === "admin";

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
          Διαχείριση Χρηστών & Ιστορικό
        </h2>
        <p className="text-xs text-slate-400">
          Έγκριση νέων Baristas και πλήρες ιστορικό όλων των ενεργειών που πραγματοποιήθηκαν στην αποθήκη.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* USERS APPROVAL SECTION */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
            <UserCheck className="text-cyan-400" size={20} /> Έγκριση Υπαλλήλων (Baristas)
          </h3>

          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {allUsers.length === 0 ? (
              <p className="text-xs text-gray-500 font-semibold pl-1">Δεν υπάρχουν άλλοι χρήστες στο σύστημα.</p>
            ) : (
              allUsers.map((usr) => {
                const isApproved = usr.approved || usr.role === "admin";

                return (
                  <div
                    key={usr.id}
                    className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-850 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-sm">{usr.name}</span>
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          {usr.role === "admin" ? "ΙΔΙΟΚΤΗΤΗΣ" : "BARISTA"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">{usr.email}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isApproved ? (
                        <span className="text-[10px] bg-green-950/40 text-green-400 border border-green-900/40 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                          ΕΝΕΡΓΟΣ
                        </span>
                      ) : (
                        <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-900/45 px-2.5 py-1 rounded-full font-black uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                          ΕΚΚΡΕΜΕΙ
                        </span>
                      )}

                      {isAdmin && usr.role !== "admin" && (
                        <div className="flex gap-1 border-l border-slate-800 pl-2">
                          {!usr.approved ? (
                            <button
                              onClick={() => onApproveUser(usr.id, true)}
                              className="p-1.5 bg-green-950/60 border border-green-900/40 text-green-400 rounded-lg hover:bg-green-500 hover:text-white cursor-pointer transition-all"
                              title="Έγκριση"
                            >
                              <Check size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => onApproveUser(usr.id, false)}
                              className="p-1.5 bg-red-955 text-red-400 rounded-lg hover:bg-red-550 hover:text-white cursor-pointer transition-all"
                              title="Ανάκληση έγκρισης"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* LOGS AUDIT TRAIL */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
            <ScrollText className="text-cyan-400" size={20} /> Ιστορικό Ενεργειών (Audit Trail)
          </h3>

          <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold">Κανένα συμβάν στη βάση ακόμα.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850 text-[11px] leading-relaxed space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span className="font-bold text-slate-400">{act.userName}</span>
                    <span className="font-semibold">{act.timestamp.substring(11, 16)} • {act.timestamp.substring(0, 10)}</span>
                  </div>
                  <p className="text-slate-200 font-semibold">{act.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
