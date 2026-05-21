import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "db.json");

// Firebase SDK Configuration & Initialization
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

let memoryDB: any = null;

// Background Database Synchronization for extreme speed & safety
async function syncAndLoadDB() {
  try {
    const collections = [
      "users", "products", "vendors", "invoices", "wasteLogs", "utilityLogs", "zReports", "shifts", "activityLogs", "feedbackMessages"
    ];
    
    // Check if Firestore has existing collections populated
    const productsCol = collection(db, "products");
    const snapshot = await getDocs(productsCol);
    
    if (snapshot.empty) {
      console.log("Firestore is blank. Seeding initial records from local db.json file...");
      
      let seedData: any = {
        users: [
          { id: "george_owner", name: "Γιώργος Αυγητίδης", email: "avgitas2@gmail.com", role: "admin", approved: true },
          { id: "billpaok_owner", name: "Βασίλης", email: "billpaok@gmail.com", role: "admin", approved: true },
          { id: "eleftheria_empl", name: "Ελευθερία", email: "eleftheria@enteka.gr", role: "employee", approved: true },
          { id: "olga_empl", name: "Όλγα", email: "olga@enteka.gr", role: "employee", approved: true },
          { id: "fani_empl", name: "Φανή", email: "fani@enteka.gr", role: "employee", approved: true },
          { id: "helper_empl", name: "Βοηθητικό", email: "helper@enteka.gr", role: "employee", approved: true }
        ],
        products: [], vendors: [], invoices: [], wasteLogs: [], utilityLogs: [], zReports: [], shifts: [], activityLogs: [], feedbackMessages: []
      };

      if (fs.existsSync(dbPath)) {
        try {
          seedData = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        } catch {
          // ignore error
        }
      }
      
      for (const col of collections) {
        const items = seedData[col] || [];
        for (const item of items) {
          const docId = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const dataToSave = { ...item, id: docId };
          await setDoc(doc(db, col, docId), dataToSave);
        }
      }
      console.log("Firestore database seeded successfully.");
    }
    
    // Load physical collections from Firestore in parallel
    const dbObj: any = {};
    await Promise.all(collections.map(async (col) => {
      const colRef = collection(db, col);
      const snap = await getDocs(colRef);
      dbObj[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }));

    // Ensure all 6 standard users are always present in active Firestore & memory 'users'
    const defaultUsers = [
      { id: "george_owner", name: "Γιώργος Αυγητίδης", email: "avgitas2@gmail.com", role: "admin", approved: true },
      { id: "billpaok_owner", name: "Βασίλης", email: "billpaok@gmail.com", role: "admin", approved: true },
      { id: "eleftheria_empl", name: "Ελευθερία", email: "eleftheria@enteka.gr", role: "employee", approved: true },
      { id: "olga_empl", name: "Όλγα", email: "olga@enteka.gr", role: "employee", approved: true },
      { id: "fani_empl", name: "Φανή", email: "fani@enteka.gr", role: "employee", approved: true },
      { id: "helper_empl", name: "Βοηθητικό", email: "helper@enteka.gr", role: "employee", approved: true }
    ];
    for (const u of defaultUsers) {
      if (!dbObj.users.some((existing: any) => existing.email.toLowerCase() === u.email.toLowerCase())) {
        console.log(`Seeding missing user to Firestore or local DB: ${u.email}`);
        await setDoc(doc(db, "users", u.id), u);
        dbObj.users.push(u);
      }
    }
    
    // Inject recipes static data
    dbObj.recipes = {
      "freddo_espresso": { ingredients: [{ item_id: "item_espresso", qty_needed: 18 }, { item_id: "item_cup_freddo", qty_needed: 1 }, { item_id: "item_straw", qty_needed: 1 }] }
    };

    // Force-seed the user's scanned invoice inv_tp010687 into Firestore and active memory db
    if (!dbObj.invoices.some((inv: any) => inv.id === "inv_tp010687")) {
      console.log("Seeding invoice inv_tp010687 into Firestore & Memory DB...");
      const invoiceData = {
        id: "inv_tp010687",
        status: "pending",
        paymentStatus: "pending",
        dateScanned: "2026-05-21T01:05:00Z",
        total: 98.47,
        vendor: "ΑΝΘΟΠΟΥΛΟΣ ΔΗΜΗΤΡΙΟΣ",
        aiMessage: "Διαβάστηκαν επιτυχώς 7 προϊόντα από το τιμολόγιο ΤΠ-010687 μέσω AI OCR.",
        items: [
          { name: "ΝΕΡΟ EONIO 500ML (ΚΙΒ 24)", qty: 10, costPrice: 2.90, verified: false },
          { name: "ΒΕΡΓΙΝΑ ΜΠΥΡΑ 330 ΚΟΥΤΙ (5+1)", qty: 6, costPrice: 0.57, verified: false },
          { name: "LIPTON ΚΟΥΤΙ ΛΕΜΟΝΙ330CC", qty: 24, costPrice: 0.62, verified: false },
          { name: "RED BULL 250.CC", qty: 12, costPrice: 1.06, verified: false },
          { name: "ΣΟΥΕΠΣ ΜΟΧΙΤΟ 0.33ML", qty: 12, costPrice: 0.78, verified: false },
          { name: "LIPTON ΚΟΥΤΙ ΡΟΔΑ/ΝΟ330CC", qty: 24, costPrice: 0.62, verified: false },
          { name: "AQUA CARPATICA APPLE SPAR ΚΟΥΤΙ 0,33L", qty: 4, costPrice: 0.64, verified: false }
        ]
      };
      await setDoc(doc(db, "invoices", invoiceData.id), invoiceData);
      dbObj.invoices.push(invoiceData);
    }
    
    memoryDB = dbObj;
    console.log("Firestore memory cache synced successfully.");
  } catch (error) {
    console.error("Failed to load/seed database from active Firestore:", error);
    if (fs.existsSync(dbPath)) {
      try {
        memoryDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      } catch {
        // empty
      }
    }
    if (!memoryDB) {
      memoryDB = {
        users: [
          { id: "george_owner", name: "Γιώργος Αυγητίδης", email: "avgitas2@gmail.com", role: "admin", approved: true },
          { id: "billpaok_owner", name: "Βασίλης", email: "billpaok@gmail.com", role: "admin", approved: true },
          { id: "eleftheria_empl", name: "Ελευθερία", email: "eleftheria@enteka.gr", role: "employee", approved: true },
          { id: "olga_empl", name: "Όλγα", email: "olga@enteka.gr", role: "employee", approved: true },
          { id: "fani_empl", name: "Φανή", email: "fani@enteka.gr", role: "employee", approved: true },
          { id: "helper_empl", name: "Βοηθητικό", email: "helper@enteka.gr", role: "employee", approved: true }
        ],
        products: [], vendors: [], invoices: [], wasteLogs: [], utilityLogs: [], zReports: [], shifts: [], activityLogs: [], feedbackMessages: [], recipes: {}
      };
    }
  }
}

// Read database from cache state
function readDB() {
  if (!memoryDB) {
    if (fs.existsSync(dbPath)) {
      try {
        memoryDB = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      } catch {
        // ignore
      }
    }
    if (!memoryDB) {
      memoryDB = {
        users: [
          { id: "george_owner", name: "Γιώργος Αυγητίδης", email: "avgitas2@gmail.com", role: "admin", approved: true },
          { id: "billpaok_owner", name: "Βασίλης", email: "billpaok@gmail.com", role: "admin", approved: true },
          { id: "eleftheria_empl", name: "Ελευθερία", email: "eleftheria@enteka.gr", role: "employee", approved: true },
          { id: "olga_empl", name: "Όλγα", email: "olga@enteka.gr", role: "employee", approved: true },
          { id: "fani_empl", name: "Φανή", email: "fani@enteka.gr", role: "employee", approved: true },
          { id: "helper_empl", name: "Βοηθητικό", email: "helper@enteka.gr", role: "employee", approved: true }
        ],
        products: [], vendors: [], invoices: [], wasteLogs: [], utilityLogs: [], zReports: [], shifts: [], activityLogs: [], feedbackMessages: [], recipes: {}
      };
    }
  }
  return memoryDB;
}

// Write to memory & local backup db.json
function writeDB(data: any) {
  memoryDB = data;
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Local file database backup failed:", err);
  }
}

// Firestore async backing operations
async function saveToFirestore(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, { ...data, id: docId });
  } catch (err) {
    console.error(`Error saving document to Firestore: ${collectionName}/${docId}`, err);
  }
}

async function deleteFromFirestore(collectionName: string, docId: string) {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting document from Firestore: ${collectionName}/${docId}`, err);
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Populate dynamic database cache from cloud Firestore on app setup
  await syncAndLoadDB();

  // ==================== DATABASE ENDPOINTS ====================

  app.get("/api/db", (req, res) => {
    try {
      const db = readDB();
      res.json(db);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/db/reset", async (req, res) => {
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      const db = readDB();
      res.json({ status: "success", db });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/db/restore", async (req, res) => {
    try {
      const dbObj = req.body;
      if (!dbObj || typeof dbObj !== "object") {
        return res.status(400).json({ error: "Μη έγκυρη μορφή αρχείου αντιγράφου ασφαλείας." });
      }

      const collections = [
        "users", "products", "vendors", "invoices", "wasteLogs", "utilityLogs", "zReports", "shifts", "activityLogs", "feedbackMessages"
      ];

      // Verify that at least some core collections are present in backup
      const hasKeyArrays = collections.some(col => Array.isArray(dbObj[col]));
      if (!hasKeyArrays) {
        return res.status(400).json({ error: "Το αρχείο δεν αποτελεί έγκυρο αντίγραφο ασφαλείας της εφαρμογής ΕΝΤΕΚΑ." });
      }

      const restoredDB: any = {};
      
      // Overwrite each collection into local memory and Firestore doc-by-doc
      for (const col of collections) {
        const items = Array.isArray(dbObj[col]) ? dbObj[col] : [];
        restoredDB[col] = items;
        
        // Save to Firestore for sync
        for (const item of items) {
          const docId = item.id;
          if (docId) {
            await setDoc(doc(db, col, docId), item);
          }
        }
      }

      restoredDB.recipes = dbObj.recipes || memoryDB?.recipes || {
        "freddo_espresso": { ingredients: [{ item_id: "item_espresso", qty_needed: 18 }, { item_id: "item_cup_freddo", qty_needed: 1 }, { item_id: "item_straw", qty_needed: 1 }] }
      };

      writeDB(restoredDB);
      memoryDB = restoredDB;

      console.log("Database successfully restored from client-provided backup.");
      res.json({ status: "success", db: restoredDB });
    } catch (e: any) {
      console.error("Backup Restore API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Users update / registration
  app.post("/api/users", async (req, res) => {
    try {
      const db = readDB();
      const { id, name, role, email, approved } = req.body;
      const targetId = id || `user_${Date.now()}`;
      const idx = db.users.findIndex((u: any) => u.id === targetId || u.email === email);
      let targetUser;
      if (idx > -1) {
        db.users[idx] = { ...db.users[idx], ...(name && { name }), ...(role && { role }), ...(approved !== undefined && { approved }) };
        targetUser = db.users[idx];
      } else {
        targetUser = { id: targetId, name, email, role: role || "employee", approved: approved !== undefined ? approved : false };
        db.users.push(targetUser);
      }
      writeDB(db);
      await saveToFirestore("users", targetUser.id, targetUser);
      res.json({ status: "success", users: db.users });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Inventory logic
  app.post("/api/products", async (req, res) => {
    try {
      const db = readDB();
      const { action, item, id, details } = req.body;
      const activeItem = item || details || {};

      if (action === "create") {
        const costPrice = parseFloat(activeItem.price) || 0;
        const mainVendor = activeItem.vendor || "Γενικός Προμηθευτής";
        const newItem = {
          id: "item_" + Date.now(),
          name: activeItem.name,
          invoiceName: activeItem.invoiceName || "",
          vendor: mainVendor,
          price: costPrice,
          retailPrice: parseFloat(activeItem.retailPrice) || 0,
          category: activeItem.category || "Γενικά",
          stock: parseInt(activeItem.stock) || 0,
          shelf: parseInt(activeItem.shelf) || 0,
          alertLimit: parseInt(activeItem.alertLimit) || 2,
          isOrdered: false,
          expiryDate: activeItem.expiryDate || "",
          supplierName: activeItem.supplierName || "",
          barcode: activeItem.barcode || "",
          priceHistory: activeItem.priceHistory || [
            {
              date: new Date().toISOString(),
              vendor: mainVendor,
              price: costPrice
            }
          ]
        };
        db.products.push(newItem);
        writeDB(db);
        await saveToFirestore("products", newItem.id, newItem);
        res.json({ status: "success", item: newItem });
      } else if (action === "update") {
        const idx = db.products.findIndex((p: any) => p.id === id);
        if (idx > -1) {
          const oldPrice = db.products[idx].price;
          const oldVendor = db.products[idx].vendor;

          // Merge fields
          db.products[idx] = { ...db.products[idx], ...details };

          // Enforce data types
          if (details.stock !== undefined) db.products[idx].stock = parseInt(details.stock) || 0;
          if (details.shelf !== undefined) db.products[idx].shelf = parseInt(details.shelf) || 0;
          if (details.price !== undefined) db.products[idx].price = parseFloat(details.price) || 0;
          if (details.retailPrice !== undefined) db.products[idx].retailPrice = parseFloat(details.retailPrice) || 0;
          if (details.alertLimit !== undefined) db.products[idx].alertLimit = parseInt(details.alertLimit) || 0;

          // Handle Price History log if changed
          const newPrice = db.products[idx].price;
          const newVendor = db.products[idx].vendor || oldVendor;
          if (details.price !== undefined && newPrice !== oldPrice) {
            if (!db.products[idx].priceHistory) {
              db.products[idx].priceHistory = [];
            }
            // Add a new entry to priceHistory
            db.products[idx].priceHistory.push({
              date: new Date().toISOString(),
              vendor: newVendor,
              price: newPrice
            });
          }

          writeDB(db);
          await saveToFirestore("products", id, db.products[idx]);
          res.json({ status: "success", item: db.products[idx] });
        } else {
          res.status(404).json({ error: "Item not found" });
          return;
        }
      } else if (action === "bulk-mark-ordered") {
        const { ids, isOrdered } = req.body;
        if (Array.isArray(ids)) {
          for (const itemId of ids) {
            const idx = db.products.findIndex((p: any) => p.id === itemId);
            if (idx > -1) {
              db.products[idx].isOrdered = !!isOrdered;
              await saveToFirestore("products", itemId, db.products[idx]);
            }
          }
          writeDB(db);
          res.json({ status: "success" });
        } else {
          res.status(400).json({ error: "Invalid item IDs" });
        }
      } else if (action === "delete") {
        const idx = db.products.findIndex((p: any) => p.id === id);
        db.products = db.products.filter((p: any) => p.id !== id);
        writeDB(db);
        await deleteFromFirestore("products", id);
        res.json({ status: "success" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vendors
  app.post("/api/vendors", async (req, res) => {
    try {
      const db = readDB();
      const { action, id, vendor, details } = req.body;
      const activeVendor = vendor || details || {};
      if (action === "create") {
        const newVendor = {
          id: "vendor_" + Date.now(),
          name: activeVendor.name,
          phone: activeVendor.phone || "",
          consistencyRating: 5,
          leadTime: 1,
          unfulfilledOrders: 0,
          totalOrders: 0
        };
        db.vendors.push(newVendor);
        writeDB(db);
        await saveToFirestore("vendors", newVendor.id, newVendor);
        res.json({ status: "success", vendor: newVendor });
      } else if (action === "delete") {
        db.vendors = db.vendors.filter((v: any) => v.id !== id);
        writeDB(db);
        await deleteFromFirestore("vendors", id);
        res.json({ status: "success" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Invoices (Photo meta uploads, scanning updates)
  app.post("/api/invoices", async (req, res) => {
    try {
      const db = readDB();
      const { action, id, details, invoice } = req.body;
      if (action === "create" || invoice) {
        const inv = invoice || details;
        const newInv = {
          id: inv.id || "inv_" + Date.now(),
          vendor: inv.vendor || "Άγνωστος",
          total: parseFloat(inv.total) || 0,
          dateScanned: inv.dateScanned || new Date().toISOString(),
          status: inv.status || "pending",
          paymentStatus: inv.paymentStatus || "pending",
          items: inv.items || [],
          aiMessage: inv.aiMessage || "",
          imageBase64: inv.imageBase64 || "",
          mimeType: inv.mimeType || "image/jpeg"
        };
        db.invoices.push(newInv);
        writeDB(db);
        await saveToFirestore("invoices", newInv.id, newInv);
        res.json({ status: "success", invoice: newInv });
      } else if (action === "update") {
        const idx = db.invoices.findIndex((inv: any) => inv.id === id);
        if (idx > -1) {
          db.invoices[idx] = { ...db.invoices[idx], ...details };
          writeDB(db);
          await saveToFirestore("invoices", id, db.invoices[idx]);
          res.json({ status: "success", invoice: db.invoices[idx] });
        } else {
          res.status(404).json({ error: "Invoice not found" });
          return;
        }
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Waste logs
  app.post("/api/waste", async (req, res) => {
    try {
      const db = readDB();
      const { log } = req.body;
      const newLog = {
        id: "waste_" + Date.now(),
        itemId: log.itemId,
        itemName: log.itemName,
        category: log.category || "Γενικά",
        vendor: log.vendor || "Άγνωστος",
        qty: parseInt(log.qty) || 1,
        cost: parseFloat(log.cost) || 0,
        reason: log.reason || "Άγνωστος",
        user: log.user || "Unknown",
        date: new Date().toISOString()
      };
      db.wasteLogs.push(newLog);
      writeDB(db);
      await saveToFirestore("wasteLogs", newLog.id, newLog);
      res.json({ status: "success", log: newLog });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Utility Tracker logs
  app.post("/api/utilities", async (req, res) => {
    try {
      const db = readDB();
      const { action, id, utility } = req.body;
      if (action === "create") {
        const newUtil = {
          id: "util_" + Date.now(),
          name: utility.name,
          amount: parseFloat(utility.amount) || 0,
          dueDate: utility.dueDate || "",
          status: utility.status || "pending"
        };
        db.utilityLogs.push(newUtil);
        writeDB(db);
        await saveToFirestore("utilityLogs", newUtil.id, newUtil);
        res.json({ status: "success", utility: newUtil });
      } else if (action === "update") {
        const idx = db.utilityLogs.findIndex((u: any) => u.id === id);
        if (idx > -1) {
          db.utilityLogs[idx] = { ...db.utilityLogs[idx], ...utility };
          writeDB(db);
          await saveToFirestore("utilityLogs", id, db.utilityLogs[idx]);
          res.json({ status: "success", utility: db.utilityLogs[idx] });
        }
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Z-Reports
  app.post("/api/zreports", async (req, res) => {
    try {
      const db = readDB();
      const { zreport } = req.body;
      const newZ = {
        id: "z_" + Date.now(),
        date: zreport.date || new Date().toISOString().substring(0, 10),
        cash: parseFloat(zreport.cash) || 0,
        pos: parseFloat(zreport.pos) || 0,
        expenses: zreport.expenses || [],
        totalExpenses: parseFloat(zreport.totalExpenses) || 0,
        netCash: parseFloat(zreport.netCash) || 0,
        totalProfit: parseFloat(zreport.totalProfit) || 0,
        share40: parseFloat(zreport.share40) || 0,
        share60: parseFloat(zreport.share60) || 0
      };
      db.zReports.push(newZ);
      writeDB(db);
      await saveToFirestore("zReports", newZ.id, newZ);
      res.json({ status: "success", zreport: newZ });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ergani Employee Shifts
  app.post("/api/shifts", async (req, res) => {
    try {
      const db = readDB();
      const { action, id, userId, userName } = req.body;
      if (action === "clock-in") {
        const newShift = {
          id: "shift_" + Date.now(),
          userId,
          userName: userName || "Employee",
          clockIn: new Date().toISOString(),
          clockOut: null,
          status: "active" as const
        };
        db.shifts.push(newShift);
        writeDB(db);
        await saveToFirestore("shifts", newShift.id, newShift);
        res.json({ status: "success", shift: newShift });
      } else if (action === "clock-out") {
        const idx = db.shifts.findIndex((s: any) => s.id === id);
        if (idx > -1) {
          db.shifts[idx].clockOut = new Date().toISOString();
          db.shifts[idx].status = "completed";
          writeDB(db);
          await saveToFirestore("shifts", id, db.shifts[idx]);
          res.json({ status: "success", shift: db.shifts[idx] });
        }
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Activity audits
  app.post("/api/activity", async (req, res) => {
    try {
      const db = readDB();
      const { userName, action, details } = req.body;
      const newLog = {
        id: "log_" + Date.now(),
        userName: userName || "Unknown",
        action,
        details,
        timestamp: new Date().toISOString()
      };
      db.activityLogs.unshift(newLog);
      writeDB(db);
      await saveToFirestore("activityLogs", newLog.id, newLog);
      res.json({ status: "success", log: newLog });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Feedback Message Simulators for ENTEKA Online
  app.post("/api/feedback", async (req, res) => {
    try {
      const db = readDB();
      const { name, message } = req.body;
      const newFeedback = {
        id: "feed_" + Date.now(),
        name: name || "Πελάτης",
        message,
        timestamp: new Date().toISOString()
      };
      db.feedbackMessages.unshift(newFeedback);
      writeDB(db);
      await saveToFirestore("feedbackMessages", newFeedback.id, newFeedback);
      res.json({ status: "success", feedback: newFeedback });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== AI SECURE ENDPOINTS ====================

  /**
   * AI INVOICE OCR SCANNING
   * Uses Gemini to extract vendor, totals, and actual line items from photos (base64).
   * Also returns the unfulfilled list simulation and consistency calculation.
   */
  app.post("/api/ai/ocr", async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "Missing imageBase64 payload" });
      return;
    }

    try {
      const prompt = `
        Είσαι ένας έξυπνος βοηθός OCR για το κατάστημα καφέ/αναψυκτηρίου "ΕΝΤΕΚΑ" στην Ελλάδα.
        Σου στέλνω μια φωτογραφία από ένα τιμολόγιο ή δελτίο αποστολής προμηθευτή.
        Διάβασε προσεκτικά τα στοιχεία.
        ΠΡΟΣΟΧΗ: Η ονομασία "ΑΦΟΙ ΑΥΓΗΤΙΔΗ Ο.Ε." είναι ο αγοραστής (το δικό μας μαγαζί). Μην την βάλεις ποτέ ως "vendor"! 
        Ο "vendor" (προμηθευτής) είναι πάντα η άλλη εταιρεία που μας πουλάει τα αγαθά (π.χ. "Α. & Β. ΠΑΝΑΓΙΩΤΙΔΟΥ Ο.Ε.", "ΑΣΚΟ ΚΛΑΟΥΝΤΙΑ", "ΑΝΘΟΠΟΥΛΟΣ ΔΗΜΗΤΡΙΟΣ", "ΝΕΔΕΛΤΖΙΔΗΣ Α. AE", κτλ).
        
        Εξήγαγε:
        1. Το όνομα του προμηθευτή (vendor)
        2. Το συνολικό ποσό (total) ως αριθμό
        3. Τις γραμμές προϊόντων (items), όπου για κάθε προϊόν θα βρεις:
           - "name": το όνομα του προϊόντος (προσπάθησε να το αντιστοιχίσεις με τα ελληνικά ονόματα όπως "ΒΑΦΛΑ YOOHOO CARAMEL", "ΚΟΚΑ ΚΟΛΑ ZERO 0.33L", "ΠΑΓΑΚΙΑ", "LIPTON", "HELL", "DORITOS" κτλ.)
           - "qty": την ποσότητα (αριθμό)
           - "costPrice": την τιμή μονάδας αγοράς (αριθμό)
           - "verified": false (από προεπιλογή)
        
        Επίστρεψε ΑΥΣΤΗΡΑ ένα JSON αντικείμενο στη μορφή:
        {
          "vendor": "Όνομα Προμηθευτή",
          "total": 123.45,
          "items": [
            { "name": "...", "qty": 5, "costPrice": 1.20, "verified": false }
          ],
          "aiMessage": "Σύντομο σχόλιο ή προειδοποίηση αν λείπει κάτι."
        }
      `;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [prompt, imagePart],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (e: any) {
      console.error("Gemini OCR Error:", e);
      res.status(500).json({ error: "AI OCR failed: " + e.message });
    }
  });

  /**
   * SMART STOCK PREDICTION & PRODUCT TRENDS
   * Analyzes current stock, delivery lead times, and seasonal changes.
   * Reports potential shortfalls, product velocity, and alternative substitutions (e.g. chocolate in winter vs yogurt in summer).
   */
  app.post("/api/ai/forecast", async (req, res) => {
    try {
      const db = readDB();
      const prompt = `
        Είσαι ο έξυπνος AI Υπεύθυνος Αποθήκης & Στρατηγικής του καταστήματος "ΕΝΤΕΚΑ".
        Έχεις πρόσβαση στα εξής δεδομένα Αποθήκης:
        ${JSON.stringify(db.products, null, 2)}
        
        Και στους εξής Προμηθευτές με τους χρόνους παράδοσης (leadTime σε ημέρες) και τη συνέπειά τους:
        ${JSON.stringify(db.vendors, null, 2)}

        Και στο ιστορικό Φύρας (Waste Logs):
        ${JSON.stringify(db.wasteLogs, null, 2)}

        Και στο ιστορικό Τιμολογίων αγορών (Invoices) με τα αναλυτικά προϊόντα που restocked ανά ημερομηνία:
        ${JSON.stringify(db.invoices, null, 2)}

        Κάνε μια εξαιρετικά έξυπνη, αναλυτική και φιλική πρόβλεψη στα Ελληνικά για:
        1. Προϊόντα που κινδυνεύουν άμεσα να εξαντληθούν (κάτω από το alertLimit), λαμβάνοντας υπόψη τον χρόνο παράδοσης του προμηθευτή (Lead Time) και υπολογίζοντας Όριο Ασφαλείας + 1 ημέρα καθυστέρησης.
        2. Ανάλυση ροής πώλησης, κινητικότητας και εποχικότητας:
           - Μελέτησε τις ημερομηνίες και τα είδη στα Τιμολόγια για να καταλάβεις ποια προϊόντα restock-αρονται πιο συχνά (αυξημένη κινητικότητα).
           - Εντόπισε αν κάποια προϊόντα παρουσιάζουν πτώση στην κινητικότητά τους (π.χ. κάποια σοκολάτα που δεν παραγγέλθηκε/αγοράστηκε καθόλου πρόσφατα).
           - Δώσε έξυπνες προτάσεις αντικατάστασης ανάλογα με τον μήνα/εποχή (π.χ. "Λόγω ανόδου της θερμοκρασίας, η ζεστή σοκολάτα έχει πέσει σε κινητικότητα. Προτείνουμε να την αντικαταστήσετε στο ράφι με δροσερά γιαούρτια ή Amita Motion που παρουσιάζουν υψηλότερη ζήτηση!").
        3. Συνεπείς & Ασυνεπείς Προμηθευτές (Consistency Tracker):
           - Ανάλυσε τις καταγεγραμμένες ελλείψεις (unfulfilledOrders) των προμηθευτών. Προειδοποίησε μας για όσους έχουν χαμηλό ποσοστό συνέπειας ή πολλές ελλείψεις.
        
        Δώσε την απάντησή σου απευθείας σε όμορφη, καθαρή HTML μορφή (χρησιμοποίησε <strong>, <ul>, <li>, <p>, <br> κτλ) με ωραία αισθητική. Μην βάλεις backticks (\`\`\`html) στην απάντηση.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (e: any) {
      console.error("Gemini Forecast Error:", e);
      res.status(500).json({ error: "AI Forecast failed: " + e.message });
    }
  });

  /**
   * SOCIAL MEDIA CAMPAIGN GENERATOR
   * Generates catchy copy for FB / IG based on specified local topics.
   */
  app.post("/api/ai/social", async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
      res.status(400).json({ error: "Missing topic" });
      return;
    }

    try {
      const prompt = `
        Είσαι ο Social Media Manager της καφετέριας "ΕΝΤΕΚΑ Coffee & More" (με σήμα το 11).
        Δημιούργησε ένα διασκεδαστικό, μοντέρνο και ελκυστικό post για το Instagram και το Facebook με θέμα: "${topic}".
        ΠΡΕΠΕΙ να χρησιμοποιήσεις πιασάρικα emojis, hashtags κατάλληλα (#enteka, #coffee, #greece) και να προσκαλείς τους πελάτες στο κατάστημα.
        Μίλα σε ευγενικό αλλά νεανικό τόνο. Δώσε το κείμενο έτοιμο για αντιγραφή.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (e: any) {
      console.error("Gemini Social Post Error:", e);
      res.status(500).json({ error: "AI Social failed: " + e.message });
    }
  });

  /**
   * VOICE COMMAND TO STATE PROCESSOR
   * Translates Greek voice transcripts into stock changes.
   */
  app.post("/api/ai/voice", async (req, res) => {
    const { transcript, inventory } = req.body;
    if (!transcript) {
      res.status(400).json({ error: "Missing transcript" });
      return;
    }

    try {
      const prompt = `
        Ο χρήστης μίλησε στο σύστημα φωνητικά και είπε: "${transcript}".
        Έχεις πρόσβαση στα εξής προϊόντα αποθήκης:
        ${JSON.stringify(inventory, null, 2)}
        
        Πρέπει να αναλύσεις αν θέλει να αλλάξει το στοκ (ποσότητα) κάποιου προϊόντος.
        Οι επιτρεπτές ενέργειες είναι:
        - "update_stock" αν θέλει να προσθέσει, να αφαιρέσει ή να ορίσει νέο στοκ (π.χ. "βάλε 5 γάλατα", "πρόσθεσε 2 καφέδες", "αφαίρεσε 1 Coca Cola").
        - "unknown" αν δεν είναι σαφές.

        Επέστρεψε ΑΥΣΤΗΡΑ ένα JSON object στη μορφή:
        {
          "action": "update_stock" | "unknown",
          "itemId": "Το ID του προϊόντος που θέλει να αλλάξει",
          "itemName": "Το όνομα του προϊόντος",
          "delta": Αριθμός (θετικός ή αρνητικός, αν πρόκειται για σχετική αλλαγή. Αν πρόκειται για ορισμό νέας τιμής, βάλε null),
          "newStock": Αριθμός (αν ορίζει συγκεκριμένο νούμερο, π.χ. "βάλε το στο 10". Διαφορετικά null),
          "aiMessage": "Ένα φιλικό απαντητικό μήνυμα επιβεβαίωσης στα Ελληνικά."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (e: any) {
      console.error("Gemini Voice Command Error:", e);
      res.status(500).json({ error: "Voice processing failed: " + e.message });
    }
  });


  // ==================== VITE MIDDLEWARE SETUP ====================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start server", e);
});
