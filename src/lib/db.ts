/**
 * db.ts — Client-side Firestore data access layer.
 * Replaces all Express /api/* routes with direct Firestore SDK operations.
 */
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc as firestoreDeleteDoc,
  writeBatch,
  onSnapshot,
  query,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export const COLLECTIONS = [
  "users",
  "products",
  "vendors",
  "invoices",
  "wasteLogs",
  "utilityLogs",
  "zReports",
  "shifts",
  "activityLogs",
  "feedbackMessages",
  "announcements",
  "groupChat",
  "userNotes",
] as const;

export const COLLECTION_MAPPING: Record<string, string> = {
  users: "Users",
  products: "InventoryItems",
  vendors: "Vendors",
  invoices: "Invoices",
  wasteLogs: "WasteLogs",
  utilityLogs: "UtilityLogs",
  zReports: "ZReports",
  shifts: "Staff",
  activityLogs: "ActivityLogs",
  feedbackMessages: "FeedbackMessages",
  announcements: "Announcements",
  groupChat: "GroupChat",
  userNotes: "UserNotes",
};

const DEFAULT_USERS = [
  { id: "george_owner", name: "Γιώργος Αυγητίδης", email: "avgitas2@gmail.com", role: "admin", approved: true },
  { id: "billpaok_owner", name: "Βασίλης", email: "billpaok@gmail.com", role: "admin", approved: true },
  { id: "eleftheria_empl", name: "Ελευθερία", email: "eleftheria@enteka.gr", role: "employee", approved: true },
  { id: "olga_empl", name: "Όλγα", email: "olga@enteka.gr", role: "employee", approved: true },
  { id: "fani_empl", name: "Φανή", email: "fani@enteka.gr", role: "employee", approved: true },
  { id: "helper_empl", name: "Βοηθητικό", email: "helper@enteka.gr", role: "employee", approved: true },
];

// ─── Read all collections at once ────────────────────────────────────────────

export async function getDB(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};

  await Promise.all(
    COLLECTIONS.map(async (col) => {
      const dbCol = COLLECTION_MAPPING[col] || col;
      const snap = await getDocs(collection(db, dbCol));
      result[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    })
  );

  // Ensure all 6 default users exist
  const usersCol = COLLECTION_MAPPING["users"] || "users";
  for (const u of DEFAULT_USERS) {
    if (!result.users.some((existing: any) => existing.email?.toLowerCase() === u.email.toLowerCase())) {
      await setDoc(doc(db, usersCol, u.id), u);
      result.users.push(u);
    }
  }

  // Inject static recipes
  (result as any).recipes = {
    freddo_espresso: {
      ingredients: [
        { item_id: "item_espresso", qty_needed: 18 },
        { item_id: "item_cup_freddo", qty_needed: 1 },
        { item_id: "item_straw", qty_needed: 1 },
      ],
    },
  };

  return result;
}

// ─── Seed Firestore if blank ──────────────────────────────────────────────────

export async function seedIfEmpty(): Promise<void> {
  const productsCol = COLLECTION_MAPPING["products"] || "products";
  const productsSnap = await getDocs(collection(db, productsCol));
  if (!productsSnap.empty) return;

  console.log("Firestore is blank — seeding default users...");
  const usersCol = COLLECTION_MAPPING["users"] || "users";
  for (const u of DEFAULT_USERS) {
    await setDoc(doc(db, usersCol, u.id), u);
  }
  console.log("Firestore seeding complete.");
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function saveDoc(colName: string, docId: string, data: any): Promise<void> {
  const dbCol = COLLECTION_MAPPING[colName] || colName;
  await setDoc(doc(db, dbCol, docId), { ...data, id: docId });
}

export async function deleteDocument(colName: string, docId: string): Promise<void> {
  const dbCol = COLLECTION_MAPPING[colName] || colName;
  await firestoreDeleteDoc(doc(db, dbCol, docId));
}

// ─── Batch restore (replaces /api/db/restore) ────────────────────────────────

export async function restoreDB(backup: Record<string, any[]>): Promise<void> {
  const batch = writeBatch(db);
  for (const col of COLLECTIONS) {
    const dbCol = COLLECTION_MAPPING[col] || col;
    const items: any[] = Array.isArray(backup[col]) ? backup[col] : [];
    for (const item of items) {
      if (item.id) {
        batch.set(doc(db, dbCol, item.id), item);
      }
    }
  }
  await batch.commit();
}

// ─── Real-time listener across all collections ────────────────────────────────

export function subscribeToAll(
  onChange: (data: Record<string, any[]>) => void
): Unsubscribe {
  const state: Record<string, any[]> = {};
  const unsubscribers: Unsubscribe[] = [];
  let initialized = new Set<string>();

  const emit = () => {
    if (initialized.size === COLLECTIONS.length) {
      onChange({ ...state });
    }
  };

  for (const col of COLLECTIONS) {
    const dbCol = COLLECTION_MAPPING[col] || col;
    const q = query(collection(db, dbCol));
    const unsub = onSnapshot(q, (snap) => {
      state[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      initialized.add(col);
      emit();
    });
    unsubscribers.push(unsub);
  }

  return () => unsubscribers.forEach((u) => u());
}
