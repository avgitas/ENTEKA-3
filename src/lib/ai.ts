/**
 * ai.ts — Client-side Gemini AI helpers.
 * Replaces all Express /api/ai/* endpoints by calling Gemini directly from the browser.
 * The API key is bundled via VITE_GEMINI_API_KEY (internal tool — acceptable risk).
 */
import { GoogleGenAI, Type } from "@google/genai";

function getAI() {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY as string;
  return new GoogleGenAI({ apiKey });
}

// ─── Social Media Post Generator ─────────────────────────────────────────────

export async function generateSocialPost(topic: string): Promise<string> {
  const ai = getAI();
  const prompt = `Είσαι ο Social Media Manager της καφετέριας "ΕΝΤΕΚΑ Coffee & More" (με σήμα το 11).
Δημιούργησε ένα διασκεδαστικό, μοντέρνο και ελκυστικό post για το Instagram και το Facebook με θέμα: "${topic}".
ΠΡΕΠΕΙ να χρησιμοποιήσεις πιασάρικα emojis, hashtags κατάλληλα (#enteka, #coffee, #greece) και να προσκαλείς τους πελάτες στο κατάστημα.
Μίλα σε ευγενικό αλλά νεανικό τόνο. Δώσε το κείμενο έτοιμο για αντιγραφή.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}

// ─── Smart Stock Forecast ─────────────────────────────────────────────────────

export async function generateForecast(dbData: Record<string, any[]>): Promise<string> {
  const ai = getAI();
  const prompt = `Είσαι ο έξυπνος AI Υπεύθυνος Αποθήκης & Στρατηγικής του καταστήματος "ΕΝΤΕΚΑ".
Έχεις πρόσβαση στα εξής δεδομένα Αποθήκης:
${JSON.stringify(dbData.products, null, 2)}

Και στους εξής Προμηθευτές με τους χρόνους παράδοσης (leadTime σε ημέρες) και τη συνέπειά τους:
${JSON.stringify(dbData.vendors, null, 2)}

Και στο ιστορικό Φύρας (Waste Logs):
${JSON.stringify(dbData.wasteLogs, null, 2)}

Και στο ιστορικό Τιμολογίων αγορών (Invoices):
${JSON.stringify(dbData.invoices, null, 2)}

Κάνε μια εξαιρετικά έξυπνη, αναλυτική και φιλική πρόβλεψη στα Ελληνικά για:
1. Προϊόντα που κινδυνεύουν άμεσα να εξαντληθούν (κάτω από το alertLimit), λαμβάνοντας υπόψη τον χρόνο παράδοσης του προμηθευτή.
2. Ανάλυση ροής πώλησης, κινητικότητας και εποχικότητας.
3. Συνεπείς & Ασυνεπείς Προμηθευτές (Consistency Tracker).

Δώσε την απάντησή σου απευθείας σε όμορφη, καθαρή HTML μορφή (χρησιμοποίησε <strong>, <ul>, <li>, <p>, <br> κτλ). Μην βάλεις backticks (\`\`\`html) στην απάντηση.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}

// ─── Voice Command to Stock Action ───────────────────────────────────────────

export async function processVoiceCommand(
  transcript: string,
  inventory: any[]
): Promise<{
  action: "update_stock" | "unknown";
  itemId: string | null;
  itemName: string | null;
  delta: number | null;
  newStock: number | null;
  aiMessage: string;
}> {
  const ai = getAI();
  const prompt = `Ο χρήστης μίλησε στο σύστημα φωνητικά και είπε: "${transcript}".
Έχεις πρόσβαση στα εξής προϊόντα αποθήκης:
${JSON.stringify(inventory, null, 2)}

Πρέπει να αναλύσεις αν θέλει να αλλάξει το στοκ (ποσότητα) κάποιου προϊόντος.
Οι επιτρεπτές ενέργειες είναι:
- "update_stock" αν θέλει να προσθέσει, να αφαιρέσει ή να ορίσει νέο στοκ.
- "unknown" αν δεν είναι σαφές.

Επέστρεψε ΑΥΣΤΗΡΑ ένα JSON object στη μορφή:
{
  "action": "update_stock" | "unknown",
  "itemId": "Το ID του προϊόντος",
  "itemName": "Το όνομα του προϊόντος",
  "delta": Αριθμός (θετικός ή αρνητικός) ή null,
  "newStock": Αριθμός ή null,
  "aiMessage": "Ένα φιλικό απαντητικό μήνυμα επιβεβαίωσης στα Ελληνικά."
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = (response.text ?? "{}").replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}

// ─── Invoice OCR Scanner ──────────────────────────────────────────────────────

export async function scanInvoiceOCR(
  imageBase64: string,
  mimeType: string
): Promise<{
  vendor: string;
  total: number;
  items: { name: string; qty: number; costPrice: number; verified: boolean }[];
  aiMessage: string;
}> {
  const ai = getAI();
  const prompt = `Είσαι ένας έξυπνος βοηθός OCR για το κατάστημα καφέ/αναψυκτηρίου "ΕΝΤΕΚΑ" στην Ελλάδα.
Σου στέλνω μια φωτογραφία από ένα τιμολόγιο ή δελτίο αποστολής προμηθευτή.
ΠΡΟΣΟΧΗ: Η ονομασία "ΑΦΟΙ ΑΥΓΗΤΙΔΗ Ο.Ε." είναι ο αγοραστής (το δικό μας μαγαζί). Μην την βάλεις ποτέ ως "vendor"!
Ο "vendor" (προμηθευτής) είναι πάντα η άλλη εταιρεία που μας πουλάει τα αγαθά.

Εξήγαγε:
1. Το όνομα του προμηθευτή (vendor)
2. Το συνολικό ποσό (total) ως αριθμό
3. Τις γραμμές προϊόντων (items), όπου για κάθε προϊόν:
   - "name": το όνομα
   - "qty": την ποσότητα (αριθμό)
   - "costPrice": την τιμή μονάδας αγοράς (αριθμό)
   - "verified": false

Επίστρεψε ΑΥΣΤΗΡΑ ένα JSON αντικείμενο στη μορφή:
{
  "vendor": "Όνομα Προμηθευτή",
  "total": 123.45,
  "items": [{ "name": "...", "qty": 5, "costPrice": 1.20, "verified": false }],
  "aiMessage": "Σύντομο σχόλιο ή προειδοποίηση αν λείπει κάτι."
}`;

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      prompt,
      { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } },
    ],
    config: { responseMimeType: "application/json" },
  });

  const text = (response.text ?? "{}").replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(text);
}
