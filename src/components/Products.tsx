import React, { useState } from "react";
import { InventoryItem, User } from "../types";
import { Package, Search, Plus, Trash2, Calendar, AlertTriangle, Eye, Layers, Sliders, ChevronDown, ChevronUp, TrendingUp, History, Award } from "lucide-react";

interface ProductsProps {
  inventory: InventoryItem[];
  currentUser: User;
  vendors: any[];
  categories: string[];
  onUpdateStock: (item: InventoryItem, deltaStock: number, deltaShelf: number) => void;
  onEditItem: (id: string, details: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddProduct: (item: Partial<InventoryItem>) => void;
  onReportWaste: (item: InventoryItem, qty: number, reason: string) => void;
}

export default function Products({
  inventory,
  currentUser,
  vendors,
  categories,
  onUpdateStock,
  onEditItem,
  onDeleteItem,
  onAddProduct,
  onReportWaste,
}: ProductsProps) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Όλα");
  const [selectedSupplier, setSelectedSupplier] = useState("Όλοι");

  // Form states for creating new item
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const [newItemName, setNewItemName] = useState("");
  const [newItemInvoiceName, setNewItemInvoiceName] = useState("");
  const [newItemVendor, setNewItemVendor] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemRetail, setNewItemRetail] = useState("");
  const [newItemCat, setNewItemCat] = useState("Γενικά");
  const [newItemLimit, setNewItemLimit] = useState("2");
  const [newItemExpiry, setNewItemExpiry] = useState("");
  const [newItemBarcode, setNewItemBarcode] = useState("");

  // Edit Product Modal states
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"details" | "history">("details");
  const [editName, setEditName] = useState("");
  const [editInvoiceName, setEditInvoiceName] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editLimit, setEditLimit] = useState(2);
  const [editPrice, setEditPrice] = useState(0);
  const [editRetail, setEditRetail] = useState(0);
  const [editBarcode, setEditBarcode] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editStock, setEditStock] = useState(0);
  const [editShelf, setEditShelf] = useState(0);

  // Waste states
  const [wasteItem, setWasteItem] = useState<InventoryItem | null>(null);
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteReason, setWasteReason] = useState("Έληξε");

  const isAdmin = currentUser.role === "admin";

  const startEditing = (item: InventoryItem) => {
    setActiveModalTab("details");
    setEditingItem(item);
    setEditName(item.name || "");
    setEditInvoiceName(item.invoiceName || "");
    setEditCat(item.category || "Γενικά");
    setEditVendor(item.vendor || "");
    setEditLimit(item.alertLimit !== undefined ? item.alertLimit : 2);
    setEditPrice(item.price || 0);
    setEditRetail(item.retailPrice || 0);
    setEditBarcode(item.barcode || "");
    setEditExpiry(item.expiryDate || "");
    setEditStock(item.stock || 0);
    setEditShelf(item.shelf || 0);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    onEditItem(editingItem.id, {
      name: editName,
      invoiceName: editInvoiceName,
      category: editCat,
      vendor: editVendor,
      alertLimit: Number(editLimit),
      price: Number(editPrice),
      retailPrice: Number(editRetail),
      barcode: editBarcode || "",
      expiryDate: editExpiry || "",
      stock: Number(editStock),
      shelf: Number(editShelf),
    });
    setEditingItem(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.includes(search));
    const matchesCat = selectedCat === "Όλα" || item.category === selectedCat;
    const matchesSupplier = selectedSupplier === "Όλοι" || item.vendor === selectedSupplier;
    return matchesSearch && matchesCat && matchesSupplier;
  });

  const getExpiryBadgeClass = (dateStr?: string) => {
    if (!dateStr) return "hidden";
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "bg-red-950/40 text-red-400 border-red-900/40 shadow-[0_0_8px_#ef4444]";
    if (diffDays <= 3) return "bg-amber-955 text-amber-500 border-amber-900/40 animate-pulse";
    return "bg-slate-900 text-slate-400 border-slate-800";
  };

  const getExpiryLabel = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "ΛΗΞΗ";
    if (diffDays <= 3) return `Λήγει σε ${diffDays}ημ (FIFO)`;
    return `Λήξη: ${date.toLocaleDateString("el-GR")}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemVendor) {
      alert("Παρακαλώ συμπληρώστε Όνομα και Προμηθευτή.");
      return;
    }
    const priceNum = parseFloat(newItemPrice) || 0;
    const retailNum = parseFloat(newItemRetail) || (priceNum * 2.5); // Default markup 150%

    onAddProduct({
      name: newItemName,
      invoiceName: newItemInvoiceName || newItemName,
      vendor: newItemVendor,
      price: priceNum,
      retailPrice: retailNum,
      category: newItemCat,
      stock: 0,
      shelf: 0,
      alertLimit: parseInt(newItemLimit) || 2,
      expiryDate: newItemExpiry || undefined,
      barcode: newItemBarcode || undefined,
      isOrdered: false,
    });

    // Reset form
    setNewItemName("");
    setNewItemInvoiceName("");
    setNewItemPrice("");
    setNewItemRetail("");
    setNewItemExpiry("");
    setNewItemBarcode("");
    setShowAddProduct(false);
  };

  const handleWasteSubmit = () => {
    if (!wasteItem) return;
    onReportWaste(wasteItem, wasteQty, wasteReason);
    setWasteItem(null);
    setWasteQty(1);
  };

  return (
    <div className="tab-enter space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow">
            Αποθήκη & Stock
          </h2>
          <p className="text-xs text-slate-400">
            {isAdmin ? "Πλήρης έλεγχος αποθέματος, κόστους, τιμών πώλησης και διαγραφών." : "Έλεγχος αποθεμάτων, ραφιών και καταγραφή φύρας."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowAddProduct((prev) => !prev);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95 ${
              showAddProduct
                ? "bg-slate-900 text-white border-white/20"
                : "bg-cyan-500 text-slate-955 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:bg-cyan-600 font-bold"
            }`}
          >
            {showAddProduct ? "Κλεισιμο" : "Νεο Προϊον"}
          </button>
        )}
      </div>

      {/* SEARCH & FILTERS */}
      <div className="glass-card p-4 rounded-3xl border border-brand-border/40 space-y-3.5 shadow-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Αναζήτηση με όνομα ή barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full min-w-0">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none cursor-pointer focus:border-cyan-500/40 shrink-0"
          >
            <option value="Όλοι">Όλοι οι Προμηθευτές</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
          </select>

          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar flex-1 min-w-0 scroll-smooth">
            {["Όλα", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCat === cat
                    ? "bg-cyan-500 text-slate-950 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] font-black"
                    : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ITEMS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {filteredItems.map((item) => {
          const isLowStock = item.stock <= item.alertLimit;
          const expiryClass = getExpiryBadgeClass(item.expiryDate);
          const isExpanded = !!expandedProductIds[item.id];

          return (
            <div
              key={item.id}
              className="glass-card p-4 rounded-3xl border border-brand-border/40 flex flex-col group relative overflow-hidden gap-3.5 hover:border-brand-border-hover/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)]"
            >
              {/* Highlight strip indicating alert level */}
              <div
                className={`absolute top-0 left-0 w-1.5 h-full ${
                  item.stock <= 0
                    ? "bg-red-500"
                    : isLowStock
                    ? "bg-amber-500 animate-pulse"
                    : "bg-green-500"
                }`}
              />

              {/* Main row: holds basic info and the stock counter */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pl-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="font-display font-black text-white text-sm sm:text-base leading-snug break-words">
                      {item.name}
                    </h4>
                    {isLowStock && (
                      <span className="bg-red-950/40 text-red-400 border border-red-900/40 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <AlertTriangle size={10} /> low stock
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[9px] bg-slate-950 border border-slate-900 text-slate-400 px-2 py-0.5 rounded font-bold shrink-0">
                      {item.category}
                    </span>
                    <span className="text-[9px] bg-slate-950 border border-slate-900 text-cyan-400/70 px-2 py-0.5 rounded font-bold shrink-0 uppercase tracking-widest truncate max-w-[120px]">
                      {item.vendor}
                    </span>
                  </div>
                </div>

                {/* STOCK QUANTITY ADJUSTMENT PANEL */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-white/5 pt-2.5 sm:pt-0">
                  {/* Shelf Vs Stock values */}
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-2xl border border-slate-900 shadow-inner">
                    {/* Stock in storage */}
                    <div className="text-center px-0.5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Αποθ.</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateStock(item, -1, 0)}
                          style={{ touchAction: 'manipulation' }}
                          className="w-7 h-7 bg-slate-900 text-slate-300 active:scale-90 select-none rounded-lg hover:bg-slate-800 text-sm font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-sm font-display font-black text-white w-7 block text-center">
                          {item.stock}
                        </span>
                        <button
                          onClick={() => onUpdateStock(item, 1, 0)}
                          style={{ touchAction: 'manipulation' }}
                          className="w-7 h-7 bg-slate-900 text-slate-300 active:scale-90 select-none rounded-lg hover:bg-slate-800 text-sm font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-slate-800" />

                    {/* Stock on active retail shelf */}
                    <div className="text-center px-0.5">
                      <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Ράφι</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateStock(item, 0, -1)}
                          style={{ touchAction: 'manipulation' }}
                          className="w-7 h-7 bg-slate-900 text-slate-300 active:scale-90 select-none rounded-lg hover:bg-slate-800 text-sm font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-sm font-display font-black text-white w-7 block text-center">
                          {item.shelf}
                        </span>
                        <button
                          onClick={() => onUpdateStock(item, 0, 1)}
                          style={{ touchAction: 'manipulation' }}
                          className="w-7 h-7 bg-slate-900 text-slate-300 active:scale-90 select-none rounded-lg hover:bg-slate-800 text-sm font-black flex items-center justify-center transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Options Menu Toggler */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    title="Λεπτομέρειες & Λειτουργίες"
                    style={{ touchAction: 'manipulation', minHeight: '44px', minWidth: '44px' }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center group shrink-0 ${
                      isExpanded
                        ? "bg-cyan-500 border-cyan-500 text-slate-955 shadow-[0_0_12px_rgba(6,182,212,0.30)] font-black"
                        : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sliders size={15} className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>
              </div>

              {/* EXPANDABLE DETAILS SUB-MENU */}
              {isExpanded && (
                <div className="border-t border-white/5 pt-3 pl-2 space-y-3.5 animate-in slide-in-from-top-1 duration-150">
                  {item.invoiceName && item.invoiceName !== item.name && (
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                      <p className="text-[8px] text-slate-500 font-bold uppercase select-none">Επίσημη Ονομασία Τιμολογίου</p>
                      <p className="text-[10px] font-bold text-slate-300 mt-0.5">{item.invoiceName}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-3">
                    <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                      <p className="text-[8px] text-slate-500 font-bold uppercase select-none">Λιανική</p>
                      <p className="text-xs font-black text-green-400 mt-0.5">{item.retailPrice.toFixed(2)}€</p>
                    </div>
                    {isAdmin && (
                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                        <p className="text-[8px] text-slate-500 font-bold uppercase select-none">Κόστος Αγοράς</p>
                        <p className="text-xs font-bold text-slate-200 mt-0.5">{item.price.toFixed(4)}€</p>
                      </div>
                    )}
                    {item.barcode && (
                      <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-900 col-span-2 min-[420px]:col-span-1">
                        <p className="text-[8px] text-slate-500 font-bold uppercase select-none">Barcode</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">{item.barcode}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1">
                      {item.expiryDate ? (
                        <span className={`text-[9px] px-2 py-0.5 border rounded font-bold ${expiryClass} flex items-center gap-0.5`}>
                          <Calendar size={10} /> {getExpiryLabel(item.expiryDate)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-500 italic">Χωρίς ημ. λήξης</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(item)}
                        title="Επεξεργασία"
                        className="p-1.5 px-3 bg-slate-950 border border-slate-850 rounded-xl hover:bg-slate-900 text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={12} /> Δες / Επεξ.
                      </button>
                      <button
                        onClick={() => {
                          setWasteItem(item);
                          setWasteReason("Έληξε");
                        }}
                        className="p-1.5 px-3 bg-red-950/20 border border-red-900/20 rounded-xl hover:bg-red-950/45 text-[10px] uppercase font-bold text-red-100 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Φύρα
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το προϊόν "${item.name}";`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-2 bg-slate-950 border border-slate-850 rounded-xl hover:border-red-900/40 text-gray-500 hover:text-red-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Διαγραφή Προϊόντος"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE NEW PRODUCT FORM (visible to Owner only) */}
      {isAdmin && showAddProduct && (
        <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-display font-black text-white text-base border-b border-slate-800/80 pb-3 flex items-center gap-2">
            <Plus className="text-cyan-400" size={20} /> Προσθήκη Νέου Προϊόντος / Αναλωσίμου
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Όνομα Προϊόντος</label>
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="π.χ. Φρέσκο Γάλα 1L"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Επίσημη Ονομασία (Τιμολόγιο)</label>
              <input
                type="text"
                value={newItemInvoiceName}
                onChange={(e) => setNewItemInvoiceName(e.target.value)}
                placeholder="π.χ. ΓΑΛΑ ΦΡΕΣΚΟ ΠΛΗΡΕΣ 1LT (ΚΙΒ 6)"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Προμηθευτής</label>
              <select
                value={newItemVendor}
                onChange={(e) => setNewItemVendor(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-slate-350 outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="">Επιλέξτε Προμηθευτή</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Κατηγορία</label>
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-slate-350 outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Τιμή Αγοράς (€)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Τιμή Πώλησης / Λιανική (€)</label>
              <input
                type="number"
                step="0.1"
                value={newItemRetail}
                onChange={(e) => setNewItemRetail(e.target.value)}
                placeholder="Προαιρετικό (αφήστε κενό για αυτόματη)"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Όριο Ειδοποίησης (Min Stock)</label>
              <input
                type="number"
                value={newItemLimit}
                onChange={(e) => setNewItemLimit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Ημερομηνία Λήξης</label>
              <input
                type="date"
                value={newItemExpiry}
                onChange={(e) => setNewItemExpiry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Κωδικός Barcode</label>
              <input
                type="text"
                value={newItemBarcode}
                onChange={(e) => setNewItemBarcode(e.target.value)}
                placeholder="Σκανάρισμα ή πληκτρολόγηση"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-cyan-500 text-slate-955 font-display font-black py-3.5 rounded-xl hover:bg-cyan-600 transition-all duration-200 mt-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] text-xs uppercase flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Προσθήκη Προϊόντος
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WASTE (ΦΥΡΑ) MODAL POPUP */}
      {wasteItem && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl w-full max-w-sm border border-brand-border/45 space-y-4">
            <h3 className="text-xl font-display font-black text-white">
              Καταγραφή Φύρας
            </h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Δηλώστε τυχόν ληγμένα, κατεστραμμένα ή χυμένα υλικά για ακριβή υπολογισμό απωλειών.
            </p>

            <div className="bg-red-950/20 p-3 rounded-2xl border border-red-900/30 text-xs font-semibold text-red-200">
              Προϊόν: <strong className="text-white text-sm">{wasteItem.name}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Αιτία Φύρας</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none cursor-pointer"
                >
                  <option value="Έληξε">Έληξε / Αλλοιώθηκε</option>
                  <option value="Καταστράφηκε / Έπεσε">Καταστράφηκε / Έπεσε</option>
                  <option value="Λάθος προετοιμασία">Λάθος προετοιμασία (Barista)</option>
                  <option value="Δοκιμή / Ποιοτικός έλεγχος">Δοκιμή / Ποιοτικός έλεγχος</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Ποσότητα Φύρας</label>
                <div className="flex items-center gap-4 mt-1.5 bg-slate-950/60 p-2 rounded-2xl border border-slate-850 w-max mx-auto">
                  <button
                    onClick={() => setWasteQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 bg-slate-900 border border-slate-800 text-white rounded-lg font-bold flex items-center justify-center hover:bg-slate-800 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xl font-display font-black text-white w-10 text-center">
                    {wasteQty}
                  </span>
                  <button
                    onClick={() => setWasteQty((q) => q + 1)}
                    className="w-8 h-8 bg-slate-900 border border-slate-800 text-white rounded-lg font-bold flex items-center justify-center hover:bg-slate-800 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setWasteItem(null)}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase"
              >
                Άκυρο
              </button>
              <button
                onClick={handleWasteSubmit}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-red-650 transition-all cursor-pointer text-xs uppercase"
              >
                Καταγραφή
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT DETAILED MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/85 z-55 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-white/10 zoom-in-95">
            {/* Header */}
            <div className="bg-slate-950 p-5 border-b border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Sliders className="text-brand-gold" size={22} />
                <div>
                  <h3 className="font-display font-black text-white text-base">Επεξεργασία Αναλώσιμου</h3>
                  <p className="text-[10px] text-brand-gold font-bold uppercase tracking-wider">{editingItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-bold uppercase bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5"
              >
                Κλείσιμο
              </button>
            </div>

            {/* Tab Bar */}
            <div className="bg-slate-950 px-5 flex border-b border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab("details")}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeModalTab === "details"
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Στοιχεία Προϊόντος
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("history")}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "history"
                    ? "border-cyan-500 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <History size={13} />
                Ιστορικό Τιμών
              </button>
            </div>

            {/* Content block */}
            <div className="p-5 overflow-y-auto grow custom-scrollbar text-xs">
              {activeModalTab === "details" ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Όνομα Αναλώσιμου (UI)</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 focus:border-cyan-500/30 p-2.5 rounded-xl text-xs font-bold text-white outline-none"
                      placeholder="π.χ. Πλαστικά Ποτήρια 400ml"
                    />
                  </div>

                  {/* Invoice Name (Official Name) */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Επίσημη Ονομασία Τιμολογίου</label>
                    <input
                      type="text"
                      value={editInvoiceName}
                      onChange={(e) => setEditInvoiceName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 focus:border-cyan-500/30 p-2.5 rounded-xl text-xs font-bold text-white outline-none"
                      placeholder="π.χ. ΠΟΤΗΡΙΑ ΠΛΑΣΤΙΚΑ 400ML (ΚΙΒ 50)"
                    />
                  </div>

                  {/* Category and Vendor */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Κατηγορία</label>
                      <select
                        value={editCat}
                        onChange={(e) => setEditCat(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                      >
                        {categories.filter(c => c !== "Όλα").map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Προμηθευτής</label>
                      <select
                        value={editVendor}
                        onChange={(e) => setEditVendor(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                      >
                        {vendors.map((v) => (
                          <option key={v.id || v.name} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock Controls (Shelf / Warehouse / Alert Limit) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-cyan-400 font-bold uppercase">Στο Ράφι</label>
                      <input
                        type="number"
                        value={editShelf}
                        onChange={(e) => setEditShelf(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-cyan-500/20 p-2.5 rounded-xl text-center font-mono font-bold text-cyan-400 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase">Στην Αποθήκη</label>
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-white/5 p-2.5 rounded-xl text-center font-mono font-bold text-slate-200 outline-none"
                      />
                    </div>

                    <div className="space-y-1 bg-amber-500/5 p-1 rounded-xl border border-amber-500/10">
                      <label className="block text-[8.5px] text-amber-500 font-black text-center uppercase tracking-tight leading-none pt-0.5">Ελάχ. Στοκ (Όριο)</label>
                      <input
                        type="number"
                        value={editLimit}
                        onChange={(e) => setEditLimit(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950/60 border border-amber-500/20 p-2 rounded-lg text-center font-mono font-black text-amber-500 outline-none mt-1"
                      />
                    </div>
                  </div>

                  {/* Price Details (Admins can view and edit purchase price, Baristas cannot see at all) */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {isAdmin ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-brand-gold font-bold uppercase">Τιμή Αγοράς (Κόστος)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.0001"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-brand-gold/30 p-2.5 rounded-xl text-xs font-bold text-brand-gold outline-none pl-6"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-gold/70 text-[10px] font-bold">€</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/5 flex items-center justify-center">
                        <p className="text-[10px] text-slate-500 font-medium italic text-center">Τιμές αγοράς: Πρόσβαση Ιδιοκτήτη μόνο</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] text-green-400 font-bold uppercase">Τιμή Πώλησης (Λιανική)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={editRetail}
                          onChange={(e) => setEditRetail(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-green-500/20 p-2.5 rounded-xl text-xs font-bold text-green-400 outline-none pl-6"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-green-400/70 text-[10px] font-bold">€</span>
                      </div>
                    </div>
                  </div>

                  {/* Barcode & Expiry Date */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Barcode</label>
                      <input
                        type="text"
                        value={editBarcode}
                        onChange={(e) => setEditBarcode(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-300 outline-none"
                        placeholder="π.χ. 5201234567890"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Ημερομηνία Λήξης</label>
                      <input
                        type="date"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Vendor Comparison Grid */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Award size={13} className="text-cyan-400" />
                      Σύγκριση Προμηθευτών
                    </h4>
                    {(() => {
                      const bestPrices = (() => {
                        if (!editingItem.priceHistory) return [];
                        const vendorMap: Record<string, { minPrice: number; latestDate: string; count: number }> = {};
                        editingItem.priceHistory.forEach((h) => {
                          const vName = h.vendor || "Γενικός Προμηθευτής";
                          if (!vendorMap[vName]) {
                            vendorMap[vName] = { minPrice: h.price, latestDate: h.date, count: 1 };
                          } else {
                            vendorMap[vName].count += 1;
                            if (h.price < vendorMap[vName].minPrice) {
                              vendorMap[vName].minPrice = h.price;
                            }
                            if (new Date(h.date) > new Date(vendorMap[vName].latestDate)) {
                              vendorMap[vName].latestDate = h.date;
                            }
                          }
                        });
                        return Object.entries(vendorMap).map(([vendor, data]) => ({
                          vendor,
                          minPrice: data.minPrice,
                          latestDate: data.latestDate,
                          count: data.count
                        })).sort((a, b) => a.minPrice - b.minPrice);
                      })();

                      if (bestPrices.length === 0) {
                        return (
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 text-center text-slate-500 font-medium italic">
                            Δεν υπάρχει καταγεγραμμένο ιστορικό αγορών.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {bestPrices.map((item, idx) => (
                            <div
                              key={item.vendor}
                              className={`p-3 rounded-2xl border transition-all relative overflow-hidden ${
                                idx === 0
                                  ? "bg-cyan-500/5 border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.06)]"
                                  : "bg-slate-950 border-white/5"
                              }`}
                            >
                              {idx === 0 && (
                                <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                                  Φθηνότερος
                                </div>
                              )}
                              <h5 className="font-bold text-white text-xs truncate max-w-[80%]">{item.vendor}</h5>
                              <div className="flex items-baseline gap-1.5 mt-2">
                                <span className="text-slate-400 text-[10px]">Καλύτερη Τιμή:</span>
                                <span className="font-mono font-black text-white text-sm">
                                  {item.minPrice.toFixed(4)}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5 text-[9px] text-slate-400 font-semibold">
                                <span>Αγορές: {item.count}</span>
                                <span>{new Date(item.latestDate).toLocaleDateString("el-GR")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Historical purchases list */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-cyan-400" />
                      Χρονολόγιο Αγορών
                    </h4>
                    {(() => {
                      const sortedHistory = [...(editingItem.priceHistory || [])].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                      );

                      if (sortedHistory.length === 0) return null;

                      return (
                        <div className="bg-slate-950 border border-white/5 rounded-2xl overflow-hidden shadow-inner max-h-52 overflow-y-auto custom-scrollbar">
                          <table className="w-full border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="bg-slate-900 text-slate-450 border-b border-white/5 font-bold uppercase tracking-wider">
                                <th className="p-2.5 pl-3.5">Ημερομηνία</th>
                                <th className="p-2.5">Προμηθευτής</th>
                                <th className="p-2.5 pr-3.5 text-right">Τιμή</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-semibold text-slate-200">
                              {sortedHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-white/3 transition-colors">
                                  <td className="p-2.5 pl-3.5 text-slate-400 font-mono">
                                    {new Date(h.date).toLocaleDateString("el-GR")}
                                  </td>
                                  <td className="p-2.5 truncate max-w-[120px]">{h.vendor || "Γενικός Προμηθευτής"}</td>
                                  <td className="p-2.5 pr-3.5 text-right font-mono text-cyan-400 font-bold">
                                    {h.price.toFixed(4)}€
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-950 border-t border-white/5 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 bg-slate-900 border border-white/5 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase"
              >
                Άκυρο
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 bg-brand-gold text-slate-950 font-display font-black py-3 rounded-xl shadow-lg hover:bg-brand-gold-dark active:scale-[0.98] transition-all text-xs uppercase cursor-pointer gold-shadow"
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
