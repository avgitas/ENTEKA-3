import React, { useState, useEffect } from "react";
import { User, InventoryItem, Vendor, Invoice, ZReport, UtilityLog, Shift, ActivityAudit } from "./types";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Invoices from "./components/Invoices";
import Suppliers from "./components/Suppliers";
import Finance from "./components/Finance";
import ShiftPlanner from "./components/ShiftPlanner";
import AIServices from "./components/AIServices";
import ActivityHistory from "./components/ActivityHistory";
import GoogleDriveBackups from "./components/GoogleDriveBackups";
import StockTimeline from "./components/StockTimeline";
import Communication from "./components/Communication";
import { LayoutDashboard, Package, FileText, Truck, Percent, Calendar, Sparkles, History, LogOut, Clock, Layers, HardDrive, Bell, AlertTriangle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subscribeToAll, saveDoc, deleteDocument, getDB } from "./lib/db";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>((() => {
    try {
      const stored = localStorage.getItem("enteka_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })());

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [dbData, setDbData] = useState<{
    users: User[];
    products: InventoryItem[];
    vendors: Vendor[];
    invoices: Invoice[];
    zReports: ZReport[];
    utilities: UtilityLog[];
    shifts: Shift[];
    activities: ActivityAudit[];
    announcements: any[];
    groupChat: any[];
    userNotes: any[];
    feedbackMessages: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Real-time notifications and Toast states
  const [showNotificationTray, setShowNotificationTray] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [previousProducts, setPreviousProducts] = useState<InventoryItem[]>([]);
  const [toasts, setToasts] = useState<{ id: string; item: InventoryItem; originalStock: number }[]>([]);

  // Viber/WhatsApp preview modal state
  const [composedOrder, setComposedOrder] = useState<{ vendor: string; text: string } | null>(null);

  useEffect(() => {
    // Current live time ticker
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [prevStockMap, setPrevStockMap] = useState<Record<string, number>>({});
  const fetchDatabase = async () => {
    setIsLoading(true);
    try {
      const data = await getDB();
      setDbData({
        users: data.users || [],
        products: data.products || [],
        vendors: data.vendors || [],
        invoices: data.invoices || [],
        zReports: data.zReports || [],
        utilities: data.utilityLogs || [],
        shifts: data.shifts || [],
        activities: (data.activityLogs || []).map((act: any) => ({
          ...act,
          timestamp: act.timestamp || act.date || new Date().toISOString(),
          date: act.date || act.timestamp || new Date().toISOString(),
        })),
        announcements: data.announcements || [],
        groupChat: data.groupChat || [],
        userNotes: data.userNotes || [],
        feedbackMessages: data.feedbackMessages || [],
      });
      setErrorStatus("");
    } catch (e: any) {
      console.error(e);
      setErrorStatus("Σφάλμα κατά τη φόρτωση δεδομένων");
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Firestore subscription
  useEffect(() => {
    if (!currentUser) return;
    
    setIsLoading(true);
    const unsub = subscribeToAll((freshData: any) => {
      setDbData({
        users: freshData.users || [],
        products: freshData.products || [],
        vendors: freshData.vendors || [],
        invoices: freshData.invoices || [],
        zReports: freshData.zReports || [],
        utilities: freshData.utilityLogs || [],
        shifts: freshData.shifts || [],
        activities: (freshData.activityLogs || []).map((act: any) => ({
          ...act,
          timestamp: act.timestamp || act.date || new Date().toISOString(),
          date: act.date || act.timestamp || new Date().toISOString(),
        })),
        announcements: freshData.announcements || [],
        groupChat: freshData.groupChat || [],
        userNotes: freshData.userNotes || [],
        feedbackMessages: freshData.feedbackMessages || [],
      });
      setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Compare previous state stocks to trigger live warning notifications
  useEffect(() => {
    if (dbData && dbData.products) {
      const currentStockMap: Record<string, number> = {};
      dbData.products.forEach(p => {
        currentStockMap[p.id] = p.stock;
      });

      const hasPrevHistory = Object.keys(prevStockMap).length > 0;
      if (hasPrevHistory) {
        const newlyLow: InventoryItem[] = [];
        dbData.products.forEach(item => {
          const prevStock = prevStockMap[item.id];
          if (prevStock !== undefined) {
            const wasAbove = prevStock > item.alertLimit;
            const isNowLow = item.stock <= item.alertLimit;
            if (wasAbove && isNowLow) {
              newlyLow.push(item);
            }
          }
        });

        if (newlyLow.length > 0) {
          newlyLow.forEach(item => {
            const toastId = `toast_${Date.now()}_${item.id}`;
            setToasts(prev => [
              ...prev,
              { id: toastId, item, originalStock: item.stock }
            ]);

            // Auto dismiss toast after 8 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 8000);

            // Re-enable in tray view lists
            setDismissedAlertIds(prev => prev.filter(id => id !== item.id));
          });
        }
      }

      // Check if changes exist before setting state to avoid cycles
      let changed = false;
      dbData.products.forEach(p => {
        if (prevStockMap[p.id] !== p.stock) {
          changed = true;
        }
      });
      if (changed || !hasPrevHistory) {
        setPrevStockMap(currentStockMap);
      }
    }
  }, [dbData?.products, prevStockMap]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("enteka_user", JSON.stringify(user));
    // Log user login activity
    logActivity(user.name, "USER_LOGIN", `Είσοδος στο σύστημα ως ${user.role === "admin" ? "Ιδιοκτήτης" : "Barista"}`);
  };

  const handleLogout = () => {
    if (currentUser) {
      logActivity(currentUser.name, "USER_LOGOUT", "Έξοδος από το σύστημα");
    }
    setCurrentUser(null);
    localStorage.removeItem("enteka_user");
  };

  // Generic logger helper
  const logActivity = async (userName: string, action: string, details: string) => {
    try {
      await saveDoc("activityLogs", "act_" + Date.now() + Math.random().toString(36).substring(7), {
        date: new Date().toISOString(),
        userName,
        action,
        details,
      });
      // Silent reload happens automatically via subscribeToAll
    } catch (e) {
      console.error(e);
    }
  };

  // Stock Quantity adjust handler
  const handleUpdateStock = async (item: InventoryItem, deltaStock: number, deltaShelf: number) => {
    if (!dbData || !currentUser) return;
    const nextStock = Math.max(0, item.stock + deltaStock);
    const nextShelf = Math.max(0, item.shelf + deltaShelf);

    // If shelf increases, decrease storage stock as well (moving stock from storage to shelf!)
    let stockAdjust = deltaStock;
    if (deltaShelf > 0) {
      // Barista moves item onto shelves
      stockAdjust = -deltaShelf;
    }

    const finalStock = Math.max(0, item.stock + stockAdjust);

    try {
      await saveDoc("products", item.id, {
        ...item,
        stock: finalStock,
        shelf: nextShelf,
        isOrdered: nextStock > item.alertLimit ? false : item.isOrdered
      });

      let actMsg = `Ενημέρωση αποθέματος του είδους ${item.name}. (Storage: ${finalStock}, Ράφι: ${nextShelf})`;
      if (deltaShelf > 0) {
        actMsg = `Μεταφορά ${deltaShelf} τεμ. "${item.name}" από την αποθήκη στο ράφι. (Ράφι: ${nextShelf}, Αποθήκη: ${finalStock})`;
      } else if (deltaShelf < 0) {
        actMsg = `Αφαίρεση ${Math.abs(deltaShelf)} τεμ. "${item.name}" από το ράφι. (Νέο Ράφι: ${nextShelf})`;
      } else if (deltaStock > 0) {
        actMsg = `Αγορά/Αύξηση αποθεμάτων αποθήκης κατά ${deltaStock} τεμ. για "${item.name}". (Νέα Αποθήκη: ${finalStock})`;
      } else if (deltaStock < 0) {
        actMsg = `Μείωση αποθεμάτων αποθήκης κατά ${Math.abs(deltaStock)} τεμ. για "${item.name}". (Νέα Αποθήκη: ${finalStock})`;
      }
      logActivity(currentUser.name, "STOCK_UPDATE", actMsg);
    } catch (e) {
      console.error(e);
    }
  };

  // Product actions
  const handleAddProduct = async (prod: Partial<InventoryItem>) => {
    if (!currentUser) return;
    try {
      const newId = "prod_" + Date.now();
      await saveDoc("products", newId, prod);
      logActivity(currentUser.name, "PRODUCT_CREATE", `Προσθήκη νέου προϊόντος: ${prod.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!currentUser) return;
    const item = dbData?.products.find((p) => p.id === id);
    if (!item) return;
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αναλώσιμο "${item.name}";`)) return;

    try {
      await deleteDocument("products", id);
      logActivity(currentUser.name, "PRODUCT_DELETE", `Διαγραφή προϊόντος: ${item.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Report Waste Handler
  const handleReportWaste = async (item: InventoryItem, qty: number, reason: string) => {
    if (!currentUser) return;
    try {
      const finalStock = Math.max(0, item.stock - qty);
      await saveDoc("products", item.id, { ...item, stock: finalStock });

      const wasteId = "waste_" + Date.now();
      await saveDoc("wasteLogs", wasteId, {
        date: new Date().toISOString(),
        productName: item.name,
        quantity: qty,
        reportedBy: currentUser.name,
        reason,
        costLoss: qty * item.price,
      });

      logActivity(currentUser.name, "WASTE_REPORT", `Καταγραφή φύρας ${qty} τεμ. ${item.name} (${reason})`);
      alert("Η φύρα καταγράφηκε με επιτυχία!");
    } catch (e) {
      console.error(e);
    }
  };

  // Vendor actions
  const handleAddVendor = async (v: Partial<Vendor>) => {
    if (!currentUser) return;
    try {
      const newId = "vendor_" + Date.now();
      await saveDoc("vendors", newId, v);
      logActivity(currentUser.name, "VENDOR_CREATE", `Προσθήκη προμηθευτή: ${v.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!currentUser) return;
    const vendor = dbData?.vendors.find((v) => v.id === id);
    try {
      await deleteDocument("vendors", id);
      logActivity(currentUser.name, "VENDOR_DELETE", `Διαγραφή προμηθευτή: ${vendor?.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Update item details directly
  const handleUpdateItem = async (id: string, details: Partial<InventoryItem>) => {
    try {
      const item = dbData?.products.find((p) => p.id === id);
      if (item) {
        await saveDoc("products", id, { ...item, ...details });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk update items ordered status
  const handleBulkUpdateItemsOrdered = async (ids: string[], isOrdered: boolean) => {
    try {
      if (dbData?.products) {
        for (const id of ids) {
          const item = dbData.products.find(p => p.id === id);
          if (item) {
            await saveDoc("products", id, { ...item, isOrdered });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approving & onboarding a new employee/Barista
  const handleApproveUser = async (id: string, approve: boolean) => {
    if (!currentUser) return;
    try {
      const u = dbData?.users.find((user) => user.id === id);
      if (u) {
        await saveDoc("users", id, { ...u, approved: approve });
        logActivity(
          currentUser.name,
          "USER_APPROVE",
          `${approve ? "Έγκριση" : "Ανάκληση έγκρισης"} του χρήστη ${u.name}`
        );
      }
    } catch (e) {
      console.error(e);
    }
  };
  // Financial actions
  const handleAddZReport = async (data: Partial<ZReport>) => {
    if (!currentUser) return;
    try {
      const newId = "z_" + Date.now();
      await saveDoc("zReports", newId, {
        ...data,
        date: new Date().toISOString(),
      });
      logActivity(currentUser.name, "CASHIER_Z_REPORT", `Καταχώρηση Ζ: Καθαρά μετρητά €${data.netCash?.toFixed(2)}`);
    } catch (e) {
      console.error(e);
    }
  };
  const handleAddUtility = async (data: Partial<UtilityLog>) => {
    if (!currentUser) return;
    try {
      const newId = "util_" + Date.now();
      await saveDoc("utilityLogs", newId, data);
      logActivity(currentUser.name, "UTILITY_ADD", `Προσθήκη λογαριασμού: ${data.name} (€${data.amount})`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUtility = async (id: string, details: Partial<UtilityLog>) => {
    if (!currentUser) return;
    try {
      const u = dbData?.utilities.find((item) => item.id === id);
      if (u) {
        await saveDoc("utilityLogs", id, { ...u, ...details });
        logActivity(currentUser.name, "UTILITY_PAY", `Εξόφληση λογαριασμού: ${u.name}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Recipe subtraction from inventory
  const deductRecipeIngredients = async (recipeName: string, multiplier: number): Promise<boolean> => {
    if (!dbData || !currentUser) return false;

    // Define quantities
    const ingredients: Record<string, { name: string; qtyPerDrink: number }[]> = {
      freddo_espresso: [
        { name: "Κόκκοι Καφέ (g)", qtyPerDrink: 18 },
        { name: "Ποτήρια (τεμ)", qtyPerDrink: 1 },
        { name: "Καλαμάκια (τεμ)", qtyPerDrink: 1 },
      ],
      freddo_cappuccino: [
        { name: "Κόκκοι Καφέ (g)", qtyPerDrink: 18 },
        { name: "Φρέσκο Γάλα (ml)", qtyPerDrink: 150 },
        { name: "Ποτήρια (τεμ)", qtyPerDrink: 1 },
        { name: "Καλαμάκια (τεμ)", qtyPerDrink: 1 },
      ],
      freddo_cappuccino_vegan: [
        { name: "Κόκκοι Καφέ (g)", qtyPerDrink: 18 },
        { name: "Γάλα Αμυγδάλου (ml)", qtyPerDrink: 150 },
        { name: "Ποτήρια (τεμ)", qtyPerDrink: 1 },
      ],
    };

    const recipe = ingredients[recipeName];
    if (!recipe) return false;

    // Try finding each in stock and decrementing
    for (const ing of recipe) {
      const targetQty = ing.qtyPerDrink * multiplier;
      const found = dbData.products.find((p) => p.name.toLowerCase() === ing.name.toLowerCase());
      if (found) {
        const nextStock = Math.max(0, found.stock - targetQty);
        await saveDoc("products", found.id, { ...found, stock: nextStock });
      }
    }

    logActivity(
      currentUser.name,
      "RECIPE_DECREMENT",
      `Έκπτωση υλικών ${multiplier}x ${recipeName} από την απογραφή`
    );
    return true;
  };

  // Compose order viber templates
  const handleComposeOrder = (vName: string, items: InventoryItem[]) => {
    let text = `☕️ *ΠΑΡΑΓΓΕΛΙΑ ΕΝΤΕΚΑ*\n\nΠαρακαλώ στείλτε μας τα παρακάτω:\n`;
    items.forEach((item) => {
      text += `• ${item.name}\n`;
    });
    text += `\n📍 ΕΝΤΕΚΑ Control Room`;
    setComposedOrder({ vendor: vName, text });
  };

  // Scan Invoice image handler (Camera support)
  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const cleanBase64 = base64String.split(",")[1];

      try {
        // Create an empty pending invoice in system
        const newId = "inv_" + Date.now();
        await saveDoc("invoices", newId, {
          dateScanned: new Date().toISOString(),
          vendor: "ΑΝΑΛΥΣΗ AI ΣΕ ΕΞΕΛΙΞΗ...",
          total: 0.0,
          paymentStatus: "pending",
          status: "pending",
          imageBase64: cleanBase64,
          mimeType: file.type,
          items: [],
        });

        logActivity(currentUser.name, "INVOICE_SCAN", `Σκανάρισμα νέας απόδειξης/τιμολογίου (${file.name})`);
        alert("Η εικόνα ανέβηκε! Το τιμολόγιο βρίσκεται στη λίστα για ανάλυση AI.");
        setActiveTab("τιμολόγια");
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddShift = async (data: Partial<Shift>) => {
    if (!currentUser) return;
    try {
      const newId = "shift_" + Date.now();
      await saveDoc("shifts", newId, data);
      logActivity(currentUser.name, "SHIFT_SCHEDULE", `Προγραμματισμός βάρδιας για ${data.userName} στις ${data.date}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAnnouncement = async (text: string) => {
    if (!currentUser) return;
    try {
      const newId = "ann_" + Date.now();
      await saveDoc("announcements", newId, {
        text,
        date: new Date().toISOString(),
        author: currentUser.name,
      });
      logActivity(currentUser.name, "ANNOUNCEMENT_CREATE", `Νέα ανακοίνωση: ${text.substring(0, 30)}...`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDocument("announcements", id);
      logActivity(currentUser.name, "ANNOUNCEMENT_DELETE", `Διαγραφή ανακοίνωσης`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChatMessage = async (text: string) => {
    if (!currentUser) return;
    try {
      const newId = "msg_" + Date.now();
      await saveDoc("groupChat", newId, {
        text,
        date: new Date().toISOString(),
        userName: currentUser.name,
        userId: currentUser.id,
        role: currentUser.role,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (text: string) => {
    if (!currentUser) return;
    try {
      const newId = "note_" + Date.now();
      await saveDoc("userNotes", newId, {
        text,
        date: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        completed: false,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleNote = async (id: string, completed: boolean) => {
    if (!currentUser) return;
    try {
      const note = dbData?.userNotes?.find(n => n.id === id);
      if (note) {
        await saveDoc("userNotes", id, {
          ...note,
          completed,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDocument("userNotes", id);
    } catch (e) {
      console.error(e);
    }
  };

  if (!currentUser) {
    return (
      <Auth
        onLoginSuccess={handleLoginSuccess}
        allUsers={dbData?.users || []}
        apiError={errorStatus}
      />
    );
  }

  const vendors = dbData?.vendors || [];
  const inventory = dbData?.products || [];
  const invoices = dbData?.invoices || [];
  const zReports = dbData?.zReports || [];
  const utilities = dbData?.utilities || [];
  const shifts = dbData?.shifts || [];
  const activities = dbData?.activities || [];
  const announcements = dbData?.announcements || [];
  const groupChat = dbData?.groupChat || [];
  const userNotes = dbData?.userNotes || [];
  const feedbackMessages = dbData?.feedbackMessages || [];
  const categories = ["Coffee", "Milk", "Cups", "Syrups", "Consumables", "Snacks", "Gen"];

  return (
    <div className="min-h-screen bg-[#0a0c10] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/15 via-transparent to-transparent text-slate-100 flex flex-col md:flex-row font-sans relative">
      {/* BACKGROUND GRAPHICS */}
      <div className="fixed top-0 left-0 w-80 h-80 bg-cyan-500/4 rounded-full filter blur-[100px] pointer-events-none animate-pulse-slow"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-500/4 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: "-4s" }}></div>

      {/* SIDE NAVIGATION BAR (Desktop Only) */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 p-5 shrink-0 z-10">
        <div className="space-y-8">
          {/* Logo Brand info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center font-display font-black text-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              11
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-white leading-tight uppercase tracking-tight">
                ΕΝΤΕΚΑ<span className="text-cyan-400">.</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                Control Room
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
              { id: "αποθήκη", label: "Απογραφές", Icon: Package },
              { id: "τιμολόγια", label: "Τιμολόγια (OCR)", Icon: FileText },
              { id: "παραγγελίες", label: "Παραγγελίες", Icon: Truck },
              { id: "timeline", label: "Χρονοδιάγραμμα & Ροή", Icon: Clock },
              { id: "ταμείο", label: "Ταμείο (Z)", Icon: Percent },
              { id: "βάρδιες", label: "Βάρδιες", Icon: Calendar },
              { id: "επικοινωνία", label: "Επικοινωνία & Feedback", Icon: MessageSquare },
              { id: "ai", label: "AI Assistant", Icon: Sparkles },
              { id: "drive", label: "Google Drive", Icon: HardDrive },
              { id: "ιστορικό", label: "Χρήστες & Audit", Icon: History },
            ].map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer text-left relative ${
                    isActive
                      ? "bg-white/10 text-cyan-400 border-l-4 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.12)] nav-active-glow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {isActive && <span className="nav-pill-indicator" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card info */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center font-bold text-xs text-cyan-400 border border-cyan-500/20">
              {currentUser.name.substring(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-200 text-xs truncate max-w-[120px]">{currentUser.name}</p>
              <p className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest">{currentUser.role === "admin" ? "Owner" : "Barista"}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-white/5 border border-white/10 text-xs font-bold py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:border-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <LogOut size={13} /> Έξοδος
          </button>
        </div>
      </aside>

      {/* TOP HEADER STATUS BAR (Both Mobile & Desktop) */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0 overflow-x-hidden">
        <header className="bg-slate-900/90 border-b border-white/10 px-3 md:px-8 py-3.5 backdrop-blur-md z-10 sticky top-0 flex items-center justify-between gap-2.5 md:gap-4 w-full">
          <div className="flex items-center gap-2 md:hidden shrink-0">
            <div className="w-7 h-7 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center font-display font-black text-cyan-400 text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              11
            </div>
            <h1 className="text-sm font-display font-black text-white tracking-widest uppercase">ΕΝΤΕΚΑ</h1>
          </div>

          <div className="flex items-center gap-3.5 ml-auto">
            {/* Real-time stock alerts Bell icon */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationTray(!showNotificationTray)}
                className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center justify-center relative ${
                  inventory.filter(p => p.stock <= p.alertLimit && !dismissedAlertIds.includes(p.id)).length > 0
                    ? "bg-red-500/15 border-red-500/35 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title="Ειδοποιήσεις Αποθεμάτων"
              >
                <Bell size={15} className={inventory.filter(p => p.stock <= p.alertLimit && !dismissedAlertIds.includes(p.id)).length > 0 ? "animate-wiggle" : ""} />
                {inventory.filter(p => p.stock <= p.alertLimit && !dismissedAlertIds.includes(p.id)).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black font-sans text-[8.5px] rounded-full w-4 h-4 flex items-center justify-center border border-slate-900 shadow-sm animate-pulse">
                    {inventory.filter(p => p.stock <= p.alertLimit && !dismissedAlertIds.includes(p.id)).length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Tray */}
              <AnimatePresence>
                {showNotificationTray && (
                  <>
                    {/* Click outside backdrop invisible blocker */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotificationTray(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } }}
                      className="absolute right-0 mt-2.5 w-[min(320px,_calc(100vw_-_16px))] bg-slate-900/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-3 text-left"
                    >
                      <div className="px-4 pb-2 border-b border-white/5 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            Ειδοποιήσεις Αποθεμάτων
                          </h4>
                          <p className="text-[9px] text-slate-400 font-bold">
                            {inventory.filter(p => p.stock <= p.alertLimit).length === 0
                              ? "Όλα τα είδη είναι επαρκή"
                              : `${inventory.filter(p => p.stock <= p.alertLimit).length} είδη κάτω από το όριο`}
                          </p>
                        </div>
                        {inventory.filter(p => p.stock <= p.alertLimit).length > 0 && (
                          <button
                            onClick={() => {
                              setDismissedAlertIds(inventory.filter(p => p.stock <= p.alertLimit).map(p => p.id));
                              setShowNotificationTray(false);
                            }}
                            className="text-[9px] font-black text-cyan-405 hover:underline cursor-pointer uppercase tracking-wider"
                          >
                            Έγκριση Όλων
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-white/5 mt-1 select-none">
                        {inventory.filter(p => p.stock <= p.alertLimit).length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-500 text-xs font-semibold">
                            Δεν υπάρχουν ελλείψεις αυτή τη στιγμή! ✨
                          </div>
                        ) : (
                          inventory.filter(p => p.stock <= p.alertLimit).map((prod) => {
                            const isDismissed = dismissedAlertIds.includes(prod.id);
                            return (
                              <div
                                key={prod.id}
                                className={`px-4 py-2.5 flex flex-col gap-1.5 transition-colors ${
                                  isDismissed ? "bg-transparent opacity-50" : "bg-red-500/5 hover:bg-red-500/10"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <AlertTriangle size={12} className={isDismissed ? "text-slate-500" : "text-amber-500 shrink-0"} />
                                    <span className={`text-[11px] font-black leading-tight ${isDismissed ? "text-slate-400" : "text-white"}`}>
                                      {prod.name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 shrink-0 font-bold">
                                    {prod.category}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Απόθεμα: <strong className={prod.stock === 0 ? "text-red-500" : "text-amber-400"}>{prod.stock}</strong> / Όριο: <strong>{prod.alertLimit}</strong>
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setActiveTab("παραγγελίες");
                                        setShowNotificationTray(false);
                                      }}
                                      className="text-[9px] font-black bg-cyan-500 text-slate-950 px-2.5 py-1 rounded transition-colors hover:bg-cyan-405 cursor-pointer uppercase"
                                    >
                                      Παραγγελία
                                    </button>
                                    {!isDismissed && (
                                      <button
                                        onClick={() => {
                                          setDismissedAlertIds(prev => [...prev, prod.id]);
                                        }}
                                        className="text-[9px] font-bold text-slate-400 hover:text-white px-1.5 py-1 cursor-pointer bg-white/5 border border-white/5 rounded"
                                        title="Παράβλεψη για τώρα"
                                      >
                                        ΟΚ
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 pt-2.5 mt-1 border-t border-white/5 text-center shrink-0">
                        <button
                          onClick={() => {
                            setActiveTab("παραγγελίες");
                            setShowNotificationTray(false);
                          }}
                          className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest cursor-pointer inline-block"
                        >
                          Προβολή Όλων στις Παραγγελίες
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-400 bg-white/5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-white/10 shrink-0 select-none">
              <Clock size={12} className="text-cyan-400 animate-float shrink-0" />
              <span className="font-mono text-slate-100 font-bold shrink-0 hidden min-[360px]:inline sm:hidden">
                {currentTime.slice(0, 5)}
              </span>
              <span className="font-mono text-slate-100 font-bold shrink-0 inline min-[360px]:hidden sm:inline">
                {currentTime}
              </span>
              <span className="text-white/20 select-none">|</span>
              <span className="bg-emerald-950/80 text-emerald-400 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider shrink-0">LIVE</span>
            </div>
          </div>

          {/* Quick Mobile Logout Icon */}
          <button
            onClick={handleLogout}
            title="Έξοδος"
            className="md:hidden p-2 bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 rounded-xl cursor-pointer active:scale-95 transition-transform shrink-0 flex items-center justify-center"
          >
            <LogOut size={14} />
          </button>
        </header>

        {/* CONTAINER CONTENT VIEW PORT */}
        <main className="flex-1 p-3 md:p-8 max-w-7xl w-full mx-auto pb-28 md:pb-8 min-w-0">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 skeleton w-full"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-44 skeleton"></div>
                <div className="h-44 skeleton"></div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <Dashboard
                  inventory={inventory}
                  reports={zReports}
                  utilities={utilities}
                  currentUser={currentUser}
                  onNavigate={(tab) => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {activeTab === "αποθήκη" && (
                <Products
                  inventory={inventory}
                  currentUser={currentUser}
                  vendors={vendors}
                  categories={categories}
                  onUpdateStock={handleUpdateStock}
                  onEditItem={handleUpdateItem}
                  onDeleteItem={handleDeleteProduct}
                  onAddProduct={handleAddProduct}
                  onReportWaste={handleReportWaste}
                />
              )}

              {activeTab === "τιμολόγια" && (
                <Invoices
                  invoices={invoices}
                  inventory={inventory}
                  currentUser={currentUser}
                  onScanInvoice={handleScanInvoice}
                  onUpdateInvoiceStatus={()=>{}}
                  apiError={false}
                />
              )}

              {activeTab === "παραγγελίες" && (
                <Suppliers
                  vendors={vendors}
                  inventory={inventory}
                  invoices={invoices}
                  currentUser={currentUser}
                  onUpdateItem={handleUpdateItem}
                  onBulkUpdateItemsOrdered={handleBulkUpdateItemsOrdered}
                  onComposeOrder={handleComposeOrder}
                  onAddVendor={handleAddVendor}
                  onDeleteVendor={handleDeleteVendor}
                />
              )}

              {activeTab === "ταμείο" && (
                <Finance
                  reports={zReports}
                  utilities={utilities}
                  currentUser={currentUser}
                  onAddZReport={handleAddZReport}
                  onAddUtility={handleAddUtility}
                  onToggleUtility={handleToggleUtility}
                  deductRecipeIngredients={deductRecipeIngredients}
                />
              )}

              {activeTab === "βάρδιες" && (
                <ShiftPlanner
                  shifts={shifts}
                  currentUser={currentUser}
                  allUsers={dbData?.users || []}
                  onAddShift={handleAddShift}
                />
              )}

              {activeTab === "ai" && (
                <AIServices
                  inventory={inventory}
                  currentUser={currentUser}
                  onRefreshAllData={fetchDatabase}
                />
              )}

              {activeTab === "drive" && (
                <GoogleDriveBackups
                  dbData={dbData}
                  currentUser={currentUser}
                  onRefreshData={fetchDatabase}
                  onLogActivity={(action, details) => logActivity(currentUser.name, action, details)}
                />
              )}

              {activeTab === "timeline" && (
                <StockTimeline
                  activities={activities}
                  inventory={inventory}
                  vendors={vendors}
                  invoices={invoices}
                  onNavigate={(tab) => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}

              {activeTab === "ιστορικό" && (
                <ActivityHistory
                  currentUser={currentUser}
                  allUsers={dbData?.users || []}
                  activities={activities}
                  onApproveUser={handleApproveUser}
                />
              )}

              {activeTab === "επικοινωνία" && (
                <Communication
                  announcements={announcements}
                  groupChat={groupChat}
                  userNotes={userNotes}
                  feedbackMessages={feedbackMessages}
                  currentUser={currentUser}
                  onAddAnnouncement={handleAddAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onSendChatMessage={handleSendChatMessage}
                  onAddNote={handleAddNote}
                  onToggleNote={handleToggleNote}
                  onDeleteNote={handleDeleteNote}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[rgba(10,12,16,0.96)] border-t border-white/10 flex justify-around items-center z-50 backdrop-blur-xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)', paddingTop: '6px' }}>
        {[
          { id: "dashboard", label: "Home", Icon: LayoutDashboard },
          { id: "αποθήκη", label: "Stock", Icon: Package },
          { id: "τιμολόγια", label: "OCR", Icon: FileText },
          { id: "παραγγελίες", label: "Orders", Icon: Truck },
          { id: "ταμείο", label: "Ταμείο", Icon: Percent },
          { id: "βάρδιες", label: "Βάρδιες", Icon: Calendar },
          { id: "επικοινωνία", label: "Chat", Icon: MessageSquare },
          { id: "ai", label: "AI", Icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.Icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ minHeight: '44px', minWidth: '0' }}
              className={`flex-1 flex flex-col items-center justify-center px-0.5 py-1 rounded-xl cursor-pointer transition-all active:scale-90 ${
                isActive ? "text-cyan-400 font-bold" : "text-gray-500"
              }`}
            >
              <Icon size={isActive ? 18 : 16} className="shrink-0" />
              <span className="text-[8px] min-[380px]:text-[9px] mt-0.5 font-bold leading-none truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* VIBER / WHATSAPP TEMPLATE PREVIEW MODAL */}
      {composedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-950/90 backdrop-blur-xl rounded-3xl p-5 border border-white/10 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-display font-black text-white flex items-center gap-2">
              <Truck size={20} className="text-cyan-400 animate-float" /> Προσχέδιο Viber / WhatsApp
            </h3>
            <p className="text-xs text-slate-450 font-semibold leading-relaxed">
              Αντιγράψτε το έτοιμο κείμενο για άμεση επικόλληση στην εφαρμογή μηνυμάτων:
            </p>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-xs whitespace-pre-wrap leading-relaxed select-all text-slate-200">
              {composedOrder.text}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setComposedOrder(null)}
                className="flex-1 bg-white/5 border border-white/10 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                ΚΛΕΙΣΙΜΟ
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(composedOrder.text);
                  alert("Αντιγράφηκε με επιτυχία!");
                  setComposedOrder(null);
                  fetchDatabase();
                }}
                className="flex-1 bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl hover:bg-cyan-650 transition-all cursor-pointer text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                ΑΝΤΙΓΡΑΦΗ ΚΕΙΜΕΝΟΥ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Toast Alerts Overlay container */}
      <div className="fixed bottom-24 md:bottom-6 right-3 left-3 md:left-auto z-[9999] md:max-w-sm md:w-full space-y-2.5 pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, y: 35 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-slate-900/98 backdrop-blur-xl border-l-4 border-red-500 border border-white/10 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-start gap-3 w-full"
            >
              <div className="bg-red-500/10 p-2 rounded-xl text-red-400 shrink-0">
                <AlertTriangle size={16} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">
                  ΧΑΜΗΛΟ ΑΠΟΘΕΜΑ!
                </h5>
                <p className="text-xs text-slate-100 font-bold mt-1.5 leading-snug">
                  Το είδος <span className="text-cyan-400">"{toast.item.name}"</span> έπεσε κάτω από το όριο!
                </p>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <span className="text-[10px] text-slate-400">
                    Απόθεμα: <strong className="text-red-400">{toast.item.stock}</strong> (Όριο: {toast.item.alertLimit})
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab("παραγγελίες");
                        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                      }}
                      className="bg-cyan-500 text-slate-950 text-[9px] font-black px-2.5 py-1 rounded-lg hover:bg-cyan-405 uppercase cursor-pointer"
                    >
                      Παραγγελία
                    </button>
                    <button
                      onClick={() => {
                        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                      }}
                      className="text-[9px] font-bold text-slate-400 hover:text-white px-1.5 py-1 cursor-pointer bg-white/5 rounded-lg border border-white/5"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
