import React, { useState, useMemo } from "react";
import { InventoryItem, ActivityAudit, Vendor, Invoice } from "../types";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Truck,
  Info,
  Sliders,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Zap,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface StockTimelineProps {
  activities: ActivityAudit[];
  inventory: InventoryItem[];
  vendors: Vendor[];
  invoices: Invoice[];
  onNavigate?: (tab: string) => void;
}

// Typical consumption rates (units per day) for smart stock forecasting
const DEFAULT_DEPLETIONS: Record<string, number> = {
  "Αναψυκτικά": 4,
  "Γάλατα": 8,
  "Καφέδες": 6,
  "Ποτήρια": 15,
  "Σιρόπια": 2,
  "Γλυκά": 5,
  "default": 3,
};

export default function StockTimeline({
  activities,
  inventory,
  vendors,
  invoices,
  onNavigate,
}: StockTimelineProps) {
  // Navigation for Calendar View
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 4, 1)); // Default to May 2026 (0-indexed 4 is May)
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: Array<{
      type: "movement" | "invoice" | "arrival" | "depletion";
      title: string;
      desc: string;
      meta?: string;
    }>;
  } | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Όλα");
  const [timelineOrderOnly, setTimelineOrderOnly] = useState(false);
  const [salesMultiplier, setSalesMultiplier] = useState(1.0); // Interactive forecast speed slider

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((item) => item.category));
    return ["Όλα", ...Array.from(cats)];
  }, [inventory]);

  // Handle month click navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // 1. COMPUTE FUTURE PROJECTIONS FOR EACH ITEM
  const itemProjections = useMemo(() => {
    return inventory.map((item) => {
      const rate = (DEFAULT_DEPLETIONS[item.category] || DEFAULT_DEPLETIONS.default) * salesMultiplier;
      
      // Stock remaining duration estimation
      const daysRemaining = rate > 0 ? Math.max(0, item.stock / rate) : 365;
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + Math.ceil(daysRemaining));

      // Vendor lead time lookup
      const vendorNode = vendors.find((v) => v.name === item.vendor);
      const leadTime = vendorNode ? vendorNode.leadTime : 2;

      // Projected delivery arrival date if it is currently marked as 'isOrdered'
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() + leadTime);

      return {
        ...item,
        dailyRate: rate,
        daysRemaining: Math.ceil(daysRemaining),
        depletionDateStr: depletionDate.toISOString().split("T")[0],
        arrivalDateStr: item.isOrdered ? arrivalDate.toISOString().split("T")[0] : null,
        leadTime,
      };
    });
  }, [inventory, vendors, salesMultiplier]);

  // 2. COMPILE ALL EVENTS BY DATE YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      Array<{
        type: "movement" | "invoice" | "arrival" | "depletion";
        title: string;
        desc: string;
        meta?: string;
      }>
    > = {};

    // Helper to push safely
    const addEvent = (dateKey: string, evt: any) => {
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(evt);
    };

    // A. Parse historical activity movements (STOCK_UPDATE)
    activities.forEach((act) => {
      if (act.action === "STOCK_UPDATE" || act.action === "STOCK_ADJUST" || act.action === "PRODUCT_CREATE") {
        const dateKey = act.timestamp.split("T")[0];
        addEvent(dateKey, {
          type: "movement",
          title: `Μεταβολή: ${act.userName}`,
          desc: act.details,
          meta: act.timestamp.split("T")[1]?.slice(0, 5) || "",
        });
      }
    });

    // B. Parse invoices (Delivery arrivals)
    invoices.forEach((inv) => {
      if (inv.dateScanned) {
        const dateKey = inv.dateScanned.split("T")[0];
        addEvent(dateKey, {
          type: "invoice",
          title: `Παραλαβή Τιμολογίου`,
          desc: `Προμηθευτής: ${inv.vendor} • Ποσό: ${inv.total.toFixed(2)}€ (${inv.items.length} είδη)`,
          meta: inv.status === "completed" ? "Verified" : "Pending",
        });
      }
    });

    // C. Future Order Arrivals Projection
    itemProjections.forEach((proj) => {
      if (proj.arrivalDateStr) {
        addEvent(proj.arrivalDateStr, {
          type: "arrival",
          title: `🚚 Αναμενόμενη Παράδοση`,
          desc: `${proj.name} από ${proj.vendor}`,
          meta: `Lead-time: ${proj.leadTime} ημέρες`,
        });
      }
    });

    // D. Future Stock Depletions Warning (only if stock is low)
    itemProjections.forEach((proj) => {
      if (proj.daysRemaining <= 10 && proj.stock > 0) {
        addEvent(proj.depletionDateStr, {
          type: "depletion",
          title: `⚠️ Πρόβλεψη Εξάντλησης`,
          desc: `${proj.name} (Απόθεμα: ${proj.stock} τεμ • Κατανάλωση: ~${proj.dailyRate.toFixed(1)}/ημ)`,
          meta: `${proj.daysRemaining} ημέρες απομένουν`,
        });
      }
    });

    return map;
  }, [activities, invoices, itemProjections]);

  // 3. GENERATE CALENDAR GRID ARRAY
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Day index of first day of month (0 = Sunday, 1 = Monday ...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Adjust Sunday to be 6th offset (assuming Monday is start of the week)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Prior month padding cells
    for (let i = offset - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i;
      const prevMonthObj = new Date(year, month - 1, prevDay);
      const dateKey = prevMonthObj.toISOString().split("T")[0];
      cells.push({
        day: prevDay,
        isCurrentMonth: false,
        date: prevMonthObj,
        dateKey,
        events: eventsByDate[dateKey] || [],
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateKey = dateObj.toISOString().split("T")[0];
      cells.push({
        day,
        isCurrentMonth: true,
        date: dateObj,
        dateKey,
        events: eventsByDate[dateKey] || [],
      });
    }

    // Post month padding cells to round grid to multiples of 7
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const paddingNeeded = totalCells - cells.length;
    for (let i = 1; i <= paddingNeeded; i++) {
      const nextMonthObj = new Date(year, month + 1, i);
      const dateKey = nextMonthObj.toISOString().split("T")[0];
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: nextMonthObj,
        dateKey,
        events: eventsByDate[dateKey] || [],
      });
    }

    return cells;
  }, [currentMonth, eventsByDate]);

  // Filter products for the forecasting sidebar panel
  const filteredProjections = useMemo(() => {
    return itemProjections.filter((proj) => {
      const matchesSearch = proj.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === "Όλα" || proj.category === categoryFilter;
      const matchesOrdered = !timelineOrderOnly || proj.isOrdered;
      return matchesSearch && matchesCat && matchesOrdered;
    });
  }, [itemProjections, searchQuery, categoryFilter, timelineOrderOnly]);

  return (
    <div className="tab-enter space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="p-1 px-2.5 text-[9px] uppercase font-black bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 rounded-xl">
            Προγνωστικα & Ροη
          </span>
          <h2 className="text-2xl font-display font-black text-white mt-1.5 drop-shadow-sm gold-text-glow">
            Χρονοδιάγραμμα & Προβολή Αποθεμάτων
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Έξυπνη πρόβλεψη εξάντλησης stock, ημερολόγιο παραλαβών και λεπτομερής καταγραφή ιστορικού ροής.
          </p>
        </div>

        {/* Live speed simulation toggle slider */}
        <div className="glass-card p-3 rounded-2xl border border-white/5 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Sliders size={16} />
            <span className="font-extrabold uppercase text-[10px]">Πρωσομοιωτής Ζήτησης:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold">1x (Κανονική)</span>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.5"
              value={salesMultiplier}
              onChange={(e) => setSalesMultiplier(parseFloat(e.target.value))}
              className="w-24 md:w-32 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono font-bold bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
              {salesMultiplier.toFixed(1)}x
            </span>
          </div>
          {salesMultiplier !== 1.0 && (
            <button
              onClick={() => setSalesMultiplier(1.0)}
              title="Επαναφορά"
              className="p-1 text-gray-500 hover:text-white rounded border border-white/5 hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* CORE TIMELINE GRID (CALENDAR & SIDEBARS) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT & CENTER PANEL: THE GORGEOUS INTERACTIVE CALENDAR BOARD */}
        <div className="xl:col-span-2 space-y-4">
          <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
            
            {/* Calendar header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarIcon className="text-cyan-400" size={20} />
                <h3 className="font-display font-black text-white text-base uppercase tracking-wider">
                  {currentMonth.toLocaleDateString("el-GR", { month: "long", year: "numeric" })}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-2 bg-slate-950/60 text-slate-400 hover:text-white border border-slate-850 hover:border-cyan-500/20 rounded-xl cursor-pointer transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(2026, 4, 1))}
                  className="px-3 py-1.5 bg-slate-950/60 text-[10px] uppercase text-slate-400 hover:text-cyan-400 border border-slate-850 hover:border-cyan-500/20 rounded-xl cursor-pointer transition-all font-bold"
                >
                  Σήμερα
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-slate-950/60 text-slate-400 hover:text-white border border-slate-850 hover:border-cyan-500/20 rounded-xl cursor-pointer transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Micro Legenda Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-gray-400 border-t border-b border-white/5 py-2.5">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full inline-block"></span> Ιστορικό Κινήσεων</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block"></span> Τιμολόγια / Παραλαβές</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span> Αναμενόμενες Παραδόσεις</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span> Πρόβλεψη Εξάντλησης (Depletion)</span>
            </div>

            {/* CALENDAR DAYS MATRIX */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {/* Day Labels */}
              {["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"].map((d) => (
                <div key={d} className="text-center text-[10px] font-black text-gray-500 py-1 uppercase tracking-wider">
                  {d}
                </div>
              ))}

              {/* Grid cell nodes */}
              {calendarDays.map((cell) => {
                const isSelected = selectedDayEvents?.dateStr === cell.dateKey;
                const hasArrivals = cell.events.some((e) => e.type === "arrival");
                const hasDepletions = cell.events.some((e) => e.type === "depletion");
                const hasMovements = cell.events.some((e) => e.type === "movement");
                const hasInvoices = cell.events.some((e) => e.type === "invoice");

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => {
                      if (cell.events.length > 0) {
                        setSelectedDayEvents({ dateStr: cell.dateKey, events: cell.events });
                      } else {
                        setSelectedDayEvents({ dateStr: cell.dateKey, events: [] });
                      }
                    }}
                    className={`min-h-[64px] md:min-h-[80px] p-2 bg-slate-950/30 hover:bg-slate-950/70 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      cell.isCurrentMonth ? "border-white/5 text-slate-200" : "border-transparent text-gray-650 opacity-40"
                    } ${
                      isSelected ? "ring-2 ring-cyan-400 bg-slate-900/40 border-cyan-400/40 scale-[1.01]" : ""
                    } ${
                      cell.events.length > 0 ? "hover:scale-[1.01]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-mono font-bold ${
                        cell.isCurrentMonth && cell.dateKey === new Date().toISOString().split("T")[0]
                          ? "bg-cyan-500 text-slate-950 w-5 h-5 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                          : ""
                      }`}>
                        {cell.day}
                      </span>

                      {/* Micro Badge dots indicator */}
                      <div className="flex items-center gap-0.5">
                        {hasDepletions && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                        {hasArrivals && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                        {hasInvoices && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                        {hasMovements && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                      </div>
                    </div>

                    {/* Rendering textual events list inside calendar cells on larger screens */}
                    <div className="hidden md:block space-y-0.5 mt-1.5">
                      {cell.events.slice(0, 2).map((evt, idx) => {
                        let colorClasses = "bg-slate-900 text-slate-400 border-white/5";
                        if (evt.type === "depletion") colorClasses = "bg-red-950/40 text-red-400 border-red-900/30";
                        if (evt.type === "arrival") colorClasses = "bg-green-950/40 text-green-400 border-green-900/30";
                        if (evt.type === "invoice") colorClasses = "bg-indigo-950/40 text-indigo-400 border-indigo-900/30";

                        return (
                          <div
                            key={idx}
                            className={`text-[8.5px] leading-3 font-bold px-1.5 py-0.5 rounded-md border truncate ${colorClasses}`}
                            title={evt.desc}
                          >
                            {evt.type === "depletion" && "⚠️ "}
                            {evt.type === "arrival" && "🚚 "}
                            {evt.title.split(":").pop()?.trim() || evt.title}
                          </div>
                        );
                      })}
                      {cell.events.length > 2 && (
                        <div className="text-[7.5px] text-slate-500 font-extrabold text-right pr-1">
                          +{cell.events.length - 2} περισσότερα
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EVENTS EXPAND PANEL UNDER CALENDAR */}
          {selectedDayEvents && (
            <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-3.5 animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-display font-black text-white text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400 animate-float" />
                  Συμβάντα & Προβλέψεις: {new Date(selectedDayEvents.dateStr).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                </h4>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="text-xs text-gray-500 hover:text-white cursor-pointer font-bold"
                >
                  Κλείσιμο
                </button>
              </div>

              {selectedDayEvents.events.length === 0 ? (
                <p className="text-xs text-gray-500 font-semibold italic">Δεν υπάρχουν καταγεγραμμένες κινήσεις ή προβλέψεις για αυτή την ημερομηνία.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar">
                  {selectedDayEvents.events.map((evt, idx) => {
                    let sideColor = "border-l-cyan-500";
                    let iconBg = "bg-cyan-950/50 text-cyan-400 border-cyan-500/20";
                    if (evt.type === "depletion") {
                      sideColor = "border-l-red-500";
                      iconBg = "bg-red-950/50 text-red-400 border-red-500/20";
                    } else if (evt.type === "arrival") {
                      sideColor = "border-l-green-500";
                      iconBg = "bg-green-950/50 text-green-400 border-green-500/20";
                    } else if (evt.type === "invoice") {
                      sideColor = "border-l-indigo-500";
                      iconBg = "bg-indigo-950/50 text-indigo-400 border-indigo-500/20";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3 bg-slate-950/40 rounded-xl border border-l-4 ${sideColor} border-white/5 flex items-start gap-3 transition-colors hover:bg-slate-950/70`}
                      >
                        <div className={`p-1.5 h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                          {evt.type === "arrival" ? (
                            <Truck size={12} />
                          ) : evt.type === "depletion" ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-201 block uppercase tracking-wide text-[10px]">{evt.title}</span>
                            {evt.meta && (
                              <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 text-slate-400 rounded font-mono font-bold">
                                {evt.meta}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-350 font-medium">{evt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: INTELLIGENT RUNTIME MOTION SIMULATOR & DEPLETION ALERT PANEL */}
        <div className="space-y-4">
          
          {/* DEPLETION DECK PROJECTIONS */}
          <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-display font-black text-white text-sm flex items-center gap-2">
                  <Zap size={16} className="text-amber-400" /> Προβλεπόμενες Ελλείψεις
                </h3>
                <span className="bg-amber-950/65 text-amber-405 border border-amber-500/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Forecast
                </span>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Αναζήτηση στην αποθήκη..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-950/70 text-white placeholder-slate-500 border border-slate-850 focus:border-cyan-500 rounded-xl py-2.5 pl-9 pr-4 transition-all"
                  />
                </div>

                <div className="flex gap-1.5">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="flex-1 text-xs font-semibold bg-slate-950/70 text-slate-300 border border-slate-850 rounded-xl p-2 cursor-pointer transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setTimelineOrderOnly(!timelineOrderOnly)}
                    title={timelineOrderOnly ? "Προβολή όλων" : "Μόνο σε παραγγελία"}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      timelineOrderOnly
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                        : "bg-slate-950/70 text-slate-400 border-slate-850"
                    }`}
                  >
                    <Filter size={14} />
                  </button>
                </div>
              </div>

              {/* FORECAST LISTING */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {filteredProjections.length === 0 ? (
                  <p className="text-xs text-gray-500 font-semibold italic text-center py-8">
                    Δεν βρέθηκαν είδη με αυτά τα φίλτρα.
                  </p>
                ) : (
                  filteredProjections.map((proj) => {
                    const isUrgent = proj.daysRemaining <= 5 && !proj.isOrdered;
                    const depDate = new Date(proj.depletionDateStr);
                    const formattedDate = depDate.toLocaleDateString("el-GR", { day: "numeric", month: "short" });

                    return (
                      <div
                        key={proj.id}
                        className={`p-3 rounded-2xl border transition-all bg-slate-950/45 ${
                          isUrgent
                            ? "border-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.05)] bg-[#1c0c10]/20"
                            : "border-white/5"
                        } hover:border-cyan-500/20`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-100 text-xs line-clamp-1">{proj.name}</span>
                            <span className="text-[9px] text-gray-500 font-semibold uppercase block">
                              {proj.category} • {proj.vendor}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono block ${
                              proj.stock <= proj.alertLimit ? "bg-red-500/10 text-red-400" : "bg-cyan-500/10 text-cyan-400"
                            }`}>
                              {proj.stock} τεμ
                            </span>
                          </div>
                        </div>

                        {/* Projection alerts metrics */}
                        <div className="flex items-center justify-between mt-3 text-[10px] font-extrabold border-t border-white/5 pt-2.5">
                          {proj.isOrdered ? (
                            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/20 py-0.5 px-1.5 rounded-lg border border-emerald-900/40">
                              <Truck size={10} />
                              <span>Projected arrival: {formattedDate}</span>
                            </div>
                          ) : proj.stock <= 0 ? (
                            <div className="flex items-center gap-1 text-red-400">
                              <AlertTriangle size={10} />
                              <span>ΕΞΑΝΤΛΗΘΗΚΕ</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-500">
                              <Clock size={10} />
                              <span>Εξάντληση: ~{proj.daysRemaining} ημ ({formattedDate})</span>
                            </div>
                          )}

                          <span className="text-[9px] text-gray-500">
                            ~{(proj.dailyRate).toFixed(1)}/ημ
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick action recomending a smart order */}
            {inventory.some((it) => it.stock <= it.alertLimit && !it.isOrdered) && onNavigate && (
              <div className="pt-2">
                <button
                  onClick={() => onNavigate("παραγγελίες")}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 font-display font-black text-slate-950 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Building2 size={13} />
                  Διαμόρφωση Παραγγελίας Ελλείψεων
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* LINEAR STOCK EVENTS TIMELINE */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
          <Clock className="text-cyan-400 animate-float" size={18} />
          Ιστορικό & Κινήσεις Αποθέματος (Linear Timeline)
        </h3>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {activities.filter(a => a.action === "STOCK_UPDATE" || a.action === "STOCK_ADJUST" || a.action === "PRODUCT_CREATE").length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold italic pl-2">Δεν βρέθηκαν πρόσφατες κλασικές κινήσεις αποθεμάτων στο ιστορικό.</p>
          ) : (
            activities
              .filter(a => a.action === "STOCK_UPDATE" || a.action === "STOCK_ADJUST" || a.action === "PRODUCT_CREATE")
              .map((act) => {
                const isReduce = act.details.includes("μείωση") || act.details.includes("ελάττωση") || act.details.includes("φύρα");
                const isCreation = act.action === "PRODUCT_CREATE";

                return (
                  <div key={act.id} className="relative group text-xs">
                    {/* Timeline Node Point indicator */}
                    <div className={`absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      isCreation
                        ? "bg-purple-950/80 border-purple-550 shadow-[0_0_8px_rgba(168,85,247,0.3)] text-purple-400"
                        : isReduce
                          ? "bg-red-950/80 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)] text-red-400"
                          : "bg-cyan-950/80 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] text-cyan-400"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>

                    <div className="p-3 bg-slate-950/20 rounded-2xl border border-white/5 group-hover:bg-slate-950/50 group-hover:border-cyan-500/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-300">{act.userName}</span>
                          <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 border rounded ${
                            isCreation
                              ? "bg-purple-950/50 border-purple-500/20 text-purple-400"
                              : isReduce
                                ? "bg-red-950/50 border-red-500/20 text-red-400"
                                : "bg-cyan-950/50 border-cyan-500/20 text-cyan-400"
                          }`}>
                            {isCreation ? "PRODUCT CR" : isReduce ? "STOCK OUT (REDUCE)" : "STOCK UPDATE"}
                          </span>
                        </div>
                        <p className="text-slate-205 font-medium">{act.details}</p>
                      </div>

                      <div className="shrink-0 text-right sm:self-start md:self-center font-mono text-[10px] text-gray-500">
                        <p className="font-bold">{act.timestamp.substring(0, 10)}</p>
                        <p className="font-medium text-slate-450">{act.timestamp.substring(11, 19)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
