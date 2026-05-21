import React, { useState } from "react";
import { Vendor, InventoryItem, User, Invoice } from "../types";
import { Truck, AlertTriangle, CheckSquare, Square, Send, Phone, Star, Plus, Trash2, Settings, ChevronDown, ChevronUp, Search, Filter, Calendar, X } from "lucide-react";
import { getDB, saveDoc } from "../lib/db";

interface SuppliersProps {
  vendors: Vendor[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  currentUser: User;
  onUpdateItem: (id: string, details: Partial<InventoryItem>) => void;
  onBulkUpdateItemsOrdered?: (ids: string[], isOrdered: boolean) => Promise<void> | void;
  onComposeOrder: (vendorName: string, itemsList: InventoryItem[]) => void;
  onAddVendor: (vendor: Partial<Vendor>) => void;
  onDeleteVendor: (id: string) => void;
}

export default function Suppliers({
  vendors,
  inventory,
  invoices,
  currentUser,
  onUpdateItem,
  onBulkUpdateItemsOrdered,
  onComposeOrder,
  onAddVendor,
  onDeleteVendor,
}: SuppliersProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showManageVendors, setShowManageVendors] = useState(false);
  const isAdmin = currentUser.role === "admin";

  // Search & History Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Form states
  const [vName, setVName] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vLead, setVLead] = useState("1");

  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Compute shortages
  const lowStockItems = inventory.filter((item) => item.stock <= item.alertLimit);
  const pendingLowStockItems = lowStockItems.filter((item) => !item.isOrdered);
  const orderedItems = inventory.filter((item) => item.isOrdered);

  const handleMarkAllOrdered = async () => {
    if (pendingLowStockItems.length === 0) return;
    setIsBulkLoading(true);
    const ids = pendingLowStockItems.map((item) => item.id);
    try {
      if (onBulkUpdateItemsOrdered) {
        await onBulkUpdateItemsOrdered(ids, true);
      } else {
        for (const id of ids) {
          await onUpdateItem(id, { isOrdered: true });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleClearAllOrdered = async () => {
    if (orderedItems.length === 0) return;
    setIsBulkLoading(true);
    const ids = orderedItems.map((item) => item.id);
    try {
      if (onBulkUpdateItemsOrdered) {
        await onBulkUpdateItemsOrdered(ids, false);
      } else {
        for (const id of ids) {
          await onUpdateItem(id, { isOrdered: false });
        }
      }
      setShowConfirmReset(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleMarkVendorOrdered = async (vendorItems: InventoryItem[]) => {
    const pendingItems = vendorItems.filter((it) => it.stock <= it.alertLimit && !it.isOrdered);
    if (pendingItems.length === 0) return;
    setIsBulkLoading(true);
    const ids = pendingItems.map((it) => it.id);
    try {
      if (onBulkUpdateItemsOrdered) {
        await onBulkUpdateItemsOrdered(ids, true);
      } else {
        for (const id of ids) {
          await onUpdateItem(id, { isOrdered: true });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Filter items that are below the alertLimit, or already flagged as ordered, or manually checked
  const shortagesGroupedByVendor = inventory.reduce((acc, item) => {
    const isBelowLimit = item.stock <= item.alertLimit;
    if (isBelowLimit || item.isOrdered) {
      if (!acc[item.vendor]) acc[item.vendor] = [];
      acc[item.vendor].push(item);
    }
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Filter invoices for order history
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Filter by vendor
    if (selectedVendorFilter && selectedVendorFilter !== "all" && inv.vendor !== selectedVendorFilter) {
      return false;
    }
    
    // 2. Filter by date/timestamp
    if (selectedDateFilter) {
      const invDateStr = inv.dateScanned ? inv.dateScanned.split("T")[0] : "";
      if (invDateStr !== selectedDateFilter) {
        return false;
      }
    }
    
    // 3. Filter by status
    if (selectedStatusFilter && selectedStatusFilter !== "all" && inv.status !== selectedStatusFilter) {
      return false;
    }
    
    // 4. Search query (matches invoice ID, item name, or vendor)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesId = inv.id ? inv.id.toLowerCase().includes(q) : false;
      const matchesVendor = inv.vendor ? inv.vendor.toLowerCase().includes(q) : false;
      const matchesItem = inv.items ? inv.items.some((item) => item.name && item.name.toLowerCase().includes(q)) : false;
      if (!matchesId && !matchesVendor && !matchesItem) {
        return false;
      }
    }
    
    return true;
  });

  const [expandedOthers, setExpandedOthers] = useState<Record<string, boolean>>({});
  const [loggingInconsistencyVendorId, setLoggingInconsistencyVendorId] = useState<string | null>(null);
  const [missingItemName, setMissingItemName] = useState("");

  const handleToggleSelect = async (itemId: string) => {
    const item = inventory.find((p) => p.id === itemId);
    if (!item) return;
    const nextVal = !item.isOrdered;
    try {
      await onUpdateItem(itemId, { isOrdered: nextVal });
      setSelectedItems((prev) =>
        nextVal ? [...prev, itemId] : prev.filter((id) => id !== itemId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkOrder = async (vendorName: string, items: InventoryItem[]) => {
    // Collect selected items or default to all within that vendor's section
    const itemsToOrder = items.filter((it) => selectedItems.includes(it.id) || it.isOrdered);
    if (itemsToOrder.length === 0) {
      alert("Επιλέξτε τουλάχιστον ένα προϊόν με το Checkbox.");
      return;
    }

    try {
      // Mark all as ordered in local state
      for (const item of itemsToOrder) {
        await onUpdateItem(item.id, { isOrdered: true });
      }
      onComposeOrder(vendorName, itemsToOrder);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRating = async (vendorId: string, diff: number) => {
    if (!isAdmin) return;
    try {
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor) {
        const newRating = Math.max(1, Math.min(5, vendor.consistencyRating + diff));
        const db = await getDB();
        const vIdx = db.vendors.findIndex((v: any) => v.id === vendorId);
        if (vIdx > -1) {
          const updatedVendor = db.vendors[vIdx];
          updatedVendor.consistencyRating = newRating;
          if (diff < 0) {
            updatedVendor.unfulfilledOrders += 1;
          }
          updatedVendor.totalOrders += 1;
          await saveDoc("vendors", vendorId, updatedVendor);
          window.location.reload();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogNonDelivery = async (vendorId: string, itemName: string) => {
    if (!itemName) return;
    try {
      const db = await getDB();
      const vIdx = db.vendors.findIndex((v: any) => v.id === vendorId);
      if (vIdx > -1) {
        const vObj = db.vendors[vIdx];
        vObj.unfulfilledOrders = (vObj.unfulfilledOrders || 0) + 1;
        vObj.totalOrders = (vObj.totalOrders || 0) + 1;
        vObj.consistencyRating = Math.max(1, Math.min(5, Math.round(((vObj.totalOrders - vObj.unfulfilledOrders) / vObj.totalOrders) * 5)));
        
        await saveDoc("vendors", vendorId, vObj);

        // Add activity log
        await saveDoc("activityLogs", "act_" + Date.now(), {
          date: new Date().toISOString(),
          userName: currentUser.name,
          action: "VENDOR_UNFULFILLED",
          details: `Ο προμηθευτής "${vObj.name}" δεν παρέδωσε το προϊόν "${itemName}"! (Συνέπεια: ${vObj.consistencyRating}/5)`,
        });

        alert(`Η ασυνέπεια καταγράφηκε! Η συνέπεια του προμηθευτή "${vObj.name}" ενημερώθηκε σε ${vObj.consistencyRating}/5.`);
        setLoggingInconsistencyVendorId(null);
        setMissingItemName("");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;
    onAddVendor({
      name: vName,
      phone: vPhone,
      leadTime: parseInt(vLead) || 1,
      consistencyRating: 5,
      unfulfilledOrders: 0,
      totalOrders: 0,
    });
    setVName("");
    setVPhone("");
    setVLead("1");
    setShowManageVendors(false);
  };

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
          Παραγγελίες & Συνέπεια Προμηθευτών
        </h2>
        <p className="text-xs text-slate-400">
          Δείτε τις ελλείψεις ανά προμηθευτή, επιλέξτε προϊόντα με ένα άγγιγμα (Checkbox) και στείλτε έτοιμα μηνύματα παραγγελίας.
        </p>
      </div>

      {/* SHORTAGES & ORDER CHECKLISTS BY VENDOR */}
      <div className="space-y-5">
        <h3 className="font-display font-black text-slate-350 text-sm uppercase tracking-wider pl-1 flex items-center gap-2">
          <CheckSquare size={16} /> Καρτέλα Παραγγελιών
        </h3>

        {/* Bulk Action dashboard panel */}
        {lowStockItems.length > 0 && (
          <div className="bg-slate-950/45 p-4 rounded-3xl border border-cyan-500/20 space-y-3 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full filter blur-2xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1 px-2.5 text-[10px] uppercase font-black bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 rounded-xl">
                    {lowStockItems.length} Ελλείψεις
                  </span>
                  {pendingLowStockItems.length > 0 ? (
                    <span className="p-1 px-2.5 text-[10px] uppercase font-black bg-amber-950/60 border border-amber-500/20 text-amber-400 rounded-xl animate-pulse">
                      {pendingLowStockItems.length} Εκκρεμούν
                    </span>
                  ) : (
                    <span className="p-1 px-2.5 text-[10px] uppercase font-black bg-green-950/60 border border-green-550/30 text-green-400 rounded-xl">
                      Όλες Παραγγέλθηκαν!
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-350 font-medium pt-1">
                  Μαζικές ενέργειες αποθήκης για γρήγορη σήμανση όλων των ελλείψεων με ένα κλικ.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {pendingLowStockItems.length > 0 && (
                  <button
                    onClick={handleMarkAllOrdered}
                    disabled={isBulkLoading}
                    className="flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-600 border border-cyan-400/20 text-slate-950 font-display font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <CheckSquare size={13} />
                    {isBulkLoading ? "Ενημέρωση..." : "Μαρκάρισμα Όλων ως Παραγγελθέντα"}
                  </button>
                )}

                {orderedItems.length > 0 && (
                  <>
                    {!showConfirmReset ? (
                      <button
                        onClick={() => setShowConfirmReset(true)}
                        disabled={isBulkLoading}
                        className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-850 text-slate-300 border border-white/10 font-display font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        Επαναφορά ({orderedItems.length})
                      </button>
                    ) : (
                      <div className="flex items-center bg-slate-900/90 border border-red-500/30 rounded-xl p-1 gap-1 w-full md:w-auto">
                        <span className="text-[10px] text-red-400 font-bold px-2">Σίγουρα;</span>
                        <button
                          onClick={handleClearAllOrdered}
                          className="bg-red-950/85 hover:bg-red-900 text-red-400 border border-red-500/20 font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                        >
                          Ναι
                        </button>
                        <button
                          onClick={() => setShowConfirmReset(false)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                        >
                          Όχι
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {vendors.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-3xl border border-dashed border-brand-border/30">
            <p className="text-slate-400 text-sm font-semibold mb-1">Δεν υπάρχουν καταχωρημένοι προμηθευτές</p>
            <p className="text-gray-500 text-xs font-medium">Μεταβείτε στη διαχείριση για να προσθέσετε.</p>
          </div>
        ) : (
          vendors.map((vendorObj) => {
            const vendorName = vendorObj.name;
            const vendorItems = inventory.filter((item) => item.vendor === vendorName);
            const shortages = vendorItems.filter((item) => item.stock <= item.alertLimit);
            const others = vendorItems.filter((item) => item.stock > item.alertLimit);
            const showOthers = expandedOthers[vendorObj.id] || false;

            return (
              <div
                key={vendorObj.id}
                className="glass-card p-5 rounded-3xl border border-white/5 space-y-4 shadow-lg focus-within:border-cyan-500/30 relative overflow-hidden"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="font-display font-black text-white text-base flex items-center gap-2">
                       <Truck className="text-cyan-400 animate-pulse-slow" size={18} /> {vendorName}
                    </h4>
                    {vendorObj.phone && (
                      <p className="text-xs text-cyan-400/60 font-semibold mt-1 flex items-center gap-1">
                        <Phone size={11} /> {vendorObj.phone}
                      </p>
                    )}
                  </div>

                  {/* Consistency Rating */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-950/65 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Συνέπεια:</span>
                    <div className="flex items-center text-cyan-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill={i < (vendorObj.consistencyRating || 5) ? "#22d3ee" : "none"}
                          className={i < (vendorObj.consistencyRating || 5) ? "text-cyan-400" : "text-gray-650"}
                        />
                      ))}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-1 border-l border-slate-800 pl-1.5">
                        <button
                          onClick={() => handleUpdateRating(vendorObj.id, -1)}
                          className="w-4 h-4 bg-red-950/40 border border-red-900/40 text-red-400 rounded hover:bg-red-500 hover:text-white text-[10px] font-bold flex items-center justify-center cursor-pointer"
                          title="Αναφορά Ασυνέπειας (Έλλειψη/Καθυστέρηση)"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleUpdateRating(vendorObj.id, 1)}
                          className="w-4 h-4 bg-green-950/40 border border-green-900/40 text-green-400 rounded hover:bg-green-500 hover:text-white text-[10px] font-bold flex items-center justify-center cursor-pointer"
                          title="Αύξηση Συνέπειας"
                        >
                          +
                        </button>
                      </div>
                    )}
                    {vendorObj.unfulfilledOrders > 0 && (
                      <span className="text-[9px] font-black text-red-400 bg-red-950/50 border border-red-900/30 px-2 py-0.5 rounded">
                        {vendorObj.unfulfilledOrders} ελλείψεις ({vendorObj.totalOrders > 0 ? Math.round(((vendorObj.totalOrders - vendorObj.unfulfilledOrders) / vendorObj.totalOrders) * 100) : 100}%)
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (loggingInconsistencyVendorId === vendorObj.id) {
                          setLoggingInconsistencyVendorId(null);
                        } else {
                          setLoggingInconsistencyVendorId(vendorObj.id);
                          setMissingItemName("");
                        }
                      }}
                      className="text-[9px] font-black text-amber-400 bg-amber-950/30 hover:bg-amber-950/70 border border-amber-500/20 px-2 py-0.5 rounded ml-2"
                    >
                      ⚠️ Καταγραφή Ασυνέπειας
                    </button>
                  </div>
                </div>

                {/* INLINE LOG MISSED ITEM FORM */}
                {loggingInconsistencyVendorId === vendorObj.id && (
                  <div className="bg-red-950/10 p-3.5 rounded-2xl border border-red-900/20 space-y-2 animate-in slide-in-from-top-1.5 duration-150">
                    <p className="text-[10px] font-bold text-red-300">Προϊόν που ΔΕΝ παραδόθηκε από τον {vendorName}:</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={missingItemName}
                        onChange={(e) => setMissingItemName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/5 p-2 rounded-xl text-xs text-white outline-none cursor-pointer font-bold"
                      >
                        <option value="">-- Επιλέξτε Αναλώσιμο --</option>
                        {vendorItems.map((item) => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleLogNonDelivery(vendorObj.id, missingItemName)}
                        disabled={!missingItemName}
                        className="bg-red-500 hover:bg-red-600 font-display font-black text-slate-950 px-4 py-2 rounded-xl text-xxs uppercase disabled:opacity-40 transition-all cursor-pointer"
                      >
                        Καταγραφή
                      </button>
                    </div>
                  </div>
                )}

                {/* Items checklists */}
                <div className="space-y-2.5">
                  {/* SHORTAGES (Always expanded) */}
                  {shortages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-amber-500/80 uppercase tracking-wider pl-1 font-sans">
                        🔥 Ελλείψεις προς Παραγγελία (Κάτω από το όριο)
                      </p>
                      {shortages.map((item) => {
                        const isChecked = item.isOrdered;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleSelect(item.id)}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                              isChecked
                                ? "bg-cyan-500/10 border-cyan-500/30 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)] animate-in fade-in"
                                : "bg-white/5 border-white/5 text-slate-350 hover:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isChecked ? (
                                <CheckSquare className="text-cyan-400 shrink-0" size={18} />
                              ) : (
                                <Square className="text-gray-600 shrink-0" size={18} />
                              )}
                              <div>
                                <span className="font-semibold text-sm">{item.name}</span>
                                <span className="text-[10px] text-amber-400 font-bold ml-2">
                                  (Απόθεμα: {item.stock} / Ελάχιστο: {item.alertLimit})
                                </span>
                              </div>
                            </div>
                            {item.isOrdered && (
                              <span className="bg-green-950/45 text-green-400 border border-green-900/40 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                Στάλθηκε
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* OTHER PRODUCTS (Collapsible) */}
                  {others.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => setExpandedOthers(prev => ({ ...prev, [vendorObj.id]: !showOthers }))}
                        className="w-full text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {showOthers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        Υπόλοιπα Προϊόντα ({others.length})
                      </button>

                      {showOthers && (
                        <div className="space-y-2.5 pl-1.5 border-l border-white/5 ml-1 animate-in slide-in-from-top-1 duration-150">
                          {others.map((item) => {
                            const isChecked = item.isOrdered;
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleToggleSelect(item.id)}
                                className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                                  isChecked
                                    ? "bg-cyan-500/10 border-cyan-500/30 text-white"
                                    : "bg-white/5 border-white/5 text-slate-350 hover:bg-slate-900"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {isChecked ? (
                                    <CheckSquare className="text-cyan-400 shrink-0" size={16} />
                                  ) : (
                                    <Square className="text-gray-600 shrink-0" size={16} />
                                  )}
                                  <div>
                                    <span className="font-bold text-xs">{item.name}</span>
                                    <span className="text-[10px] text-slate-500 font-medium ml-2">
                                      (Απόθεμα: {item.stock})
                                    </span>
                                  </div>
                                </div>
                                {item.isOrdered && (
                                  <span className="bg-green-950/45 text-green-400 border border-green-900/40 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                                    Στάλθηκε
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {vendorItems.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-950/20 rounded-2xl border border-dashed border-white/5">
                      Δεν υπάρχουν ακόμη προϊόντα συνδεδεμένα με αυτόν τον προμηθευτή.
                    </p>
                  )}
                </div>

                {/* Submit button for this vendor */}
                {vendorItems.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleBulkOrder(vendorName, vendorItems)}
                      className="w-full bg-cyan-550 text-slate-950 bg-cyan-500 font-display font-black py-3 rounded-xl hover:bg-cyan-600 active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(6,182,212,0.15)] text-xs uppercase"
                    >
                      <Send size={15} /> ΑΠΟΣΤΟΛΗ ΠΑΡΑΓΓΕΛΙΑΣ ({vendorItems.filter(p => p.isOrdered).length} ΕΙΔΗ)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SEARCH & ORDER HISTORY PER SUPPLIER */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-3">
          <div>
            <h3 className="font-display font-black text-white text-base flex items-center gap-2">
              <Search className="text-cyan-400" size={20} /> Αναζήτηση & Ιστορικό Παραγγελιών
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Αναζητήστε προηγούμενες παραλαβές, τιμολόγια και παραγγελίες ανά προμηθευτή.
            </p>
          </div>
          <span className="text-[10px] bg-cyan-950/40 border border-cyan-900/40 text-cyan-400 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
            Βρεθηκαν: {filteredInvoices.length} {filteredInvoices.length === 1 ? "καταχωρηση" : "καταχωρησεις"}
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 pl-1">
              <Search size={10} className="text-cyan-400" /> Αναζήτηση
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID, Προϊόν, Προμηθευτής..."
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 transition-all font-semibold placeholder:text-slate-605"
            />
          </div>

          {/* Supplier Dropdown Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-405 uppercase flex items-center gap-1 pl-1">
              <Truck size={10} className="text-cyan-400" /> Προμηθευτής
            </label>
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none cursor-pointer font-semibold"
            >
              <option value="all">Όλοι οι Προμηθευτές</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-404 uppercase flex items-center gap-1 pl-1">
              <Calendar size={10} className="text-cyan-400" /> Ημερομηνία
            </label>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer font-semibold [color-scheme:dark]"
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-404 uppercase flex items-center gap-1 pl-1">
              <Filter size={10} className="text-cyan-400" /> Κατάσταση
            </label>
            <div className="flex gap-2">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none cursor-pointer font-semibold"
              >
                <option value="all">Όλες</option>
                <option value="completed">Ολοκληρωμένες</option>
                <option value="pending">Σε εκκρεμότητα</option>
              </select>
              {(searchQuery || selectedVendorFilter !== "all" || selectedDateFilter || selectedStatusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedVendorFilter("all");
                    setSelectedDateFilter("");
                    setSelectedStatusFilter("all");
                  }}
                  className="px-3 bg-slate-900 hover:bg-slate-850 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Καθαρισμός Φίλτρων"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-semibold bg-slate-950/20 rounded-2xl border border-white/5 border-dashed">
              Δεν βρέθηκαν καταχωρημένες παραγγελίες ή τιμολόγια με αυτά τα κριτήρια.
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isExpanded = expandedInvoiceId === inv.id;
              const dateObj = new Date(inv.dateScanned);
              const formattedDate = dateObj.toLocaleDateString("el-GR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const isCompleted = inv.status === "completed";

              return (
                <div
                  key={inv.id}
                  className="bg-slate-950/60 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-cyan-500/20"
                >
                  {/* Row summary */}
                  <div
                    onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                    className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 shrink-0 flex items-center justify-center">
                        <Truck className={isCompleted ? "text-cyan-400" : "text-yellow-400"} size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-black text-sm text-white">
                            {inv.vendor}
                          </span>
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/30 rounded px-2 py-0.5 border border-cyan-900/35">
                            {inv.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-404 font-bold uppercase tracking-wider">
                          Ημ. Παραγγελίας: {formattedDate} • Προϊόντα: {inv.items?.length || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
                      <div className="text-left sm:text-right space-y-1">
                        <p className="font-display font-black text-white text-base">
                          {inv.total.toFixed(2)} €
                        </p>
                        <div className="flex gap-1.5 justify-start sm:justify-end">
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                              isCompleted
                                ? "bg-emerald-950/50 text-emerald-405 border-emerald-900/30"
                                : "bg-yellow-950/50 text-yellow-500 border-yellow-900/30"
                            }`}
                          >
                            {isCompleted ? "ΟΛΟΚΛΗΡΩΘΗΚΕ" : "ΣΕ ΕΚΚΡΕΜΟΤΗΤΑ"}
                          </span>
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                              inv.paymentStatus === "paid"
                                ? "bg-emerald-950/50 text-emerald-405 border-emerald-900/30"
                                : "bg-red-955 text-red-500 border-red-900/30"
                            }`}
                          >
                            {inv.paymentStatus === "paid" ? "ΠΛΗΡΩΘΗΚΕ" : "ΑΠΛΗΡΩΤΟ"}
                          </span>
                        </div>
                      </div>
                      
                      <button className="text-slate-500 hover:text-white transition-colors p-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items view */}
                  {isExpanded && inv.items && inv.items.length > 0 && (
                    <div className="border-t border-white/5 bg-slate-950/90 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 border-b border-white/5 pb-1.5">
                        Αναλυτική Λίστα Προϊόντων
                      </div>
                      <div className="overflow-x-auto -mx-1 px-1 custom-scrollbar">
                        <div className="min-w-[460px] space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider border-b border-white/5 pb-2 px-1">
                            <div className="col-span-6 min-w-0">Προϊόν</div>
                            <div className="col-span-2 text-center">Ποσότητα</div>
                            <div className="col-span-2 text-right">Τιμή Μον.</div>
                            <div className="col-span-2 text-right">Σύνολο</div>
                          </div>
                          <div className="space-y-2">
                            {inv.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="grid grid-cols-12 gap-2 text-xs font-mono text-slate-300 hover:bg-white/5 p-1 rounded-lg transition-colors items-center"
                              >
                                <div className="col-span-6 font-semibold text-slate-200 truncate flex items-center gap-1.5">
                                  <span className="text-cyan-500 font-sans">•</span> {item.name}
                                </div>
                                <div className="col-span-2 text-center font-bold text-slate-400">
                                  {item.qty}
                                </div>
                                <div className="col-span-2 text-right text-slate-400">
                                  {item.costPrice.toFixed(2)} €
                                </div>
                                <div className="col-span-2 text-right font-black text-cyan-400">
                                  {(item.qty * item.costPrice).toFixed(2)} €
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MANAGE VENDORS (visible to Admin/Owner only) */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-3xl border border-white/5">
            <div>
              <h4 className="font-display font-black text-white text-sm">Διαχείριση & Προσθήκη Προμηθευτών</h4>
              <p className="text-[10px] text-slate-450">Προσθήκη νέων συνεργατών ή διαγραφή υπαρχόντων.</p>
            </div>
            <button
              onClick={() => setShowManageVendors((v) => !v)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                showManageVendors
                  ? "bg-slate-900 text-white border border-white/10"
                  : "bg-cyan-500 text-slate-955 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold"
              }`}
            >
              <Settings size={14} className={showManageVendors ? "rotate-45 duration-200" : "duration-200"} />
              {showManageVendors ? "Κλεισιμο" : "Διαχειριση"}
            </button>
          </div>

          {showManageVendors && (
            <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="font-display font-black text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <Plus className="text-cyan-400" size={20} /> Προσθήκη Νέου Προμηθευτή
              </h3>
              <form onSubmit={handleAddVendorSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Όνομα Εταιρείας</label>
                  <input
                    type="text"
                    required
                    value={vName}
                    onChange={(e) => setVName(e.target.value)}
                    placeholder="π.χ. COFFEE SPECIALISTS"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Τηλέφωνο / Viber</label>
                  <input
                    type="text"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="π.χ. 6900000000"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Χρόνος Παράδοσης (Ημέρες)</label>
                  <input
                    type="number"
                    min="1"
                    value={vLead}
                    onChange={(e) => setVLead(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-cyan-500 text-slate-955 font-display font-black px-8 py-3 rounded-xl hover:bg-cyan-600 transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs uppercase"
                  >
                    Δημιουργία Προμηθευτή
                  </button>
                </div>
              </form>

              {vendors.length > 0 && (
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Συνεργαζόμενοι Προμηθευτές ({vendors.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {vendors.map((v) => (
                      <div key={v.id} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-200 text-sm">{v.name}</p>
                          <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Lead Time: {v.leadTime} ημ. • Orders: {v.totalOrders}</p>
                        </div>
                        {v.id !== "vendor_1" && v.id !== "vendor_2" && v.id !== "vendor_3" && v.id !== "vendor_4" && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τον προμηθευτή "${v.name}";`)) {
                                onDeleteVendor(v.id);
                              }
                            }}
                            className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors p-1"
                            title="Διαγραφή Προμηθευτή"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
