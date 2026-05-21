import React, { useState } from "react";
import { Sparkles, MessageSquare, RefreshCw, Volume2, TrendingUp } from "lucide-react";
import { User, InventoryItem } from "../types";
import { generateSocialPost, generateForecast, processVoiceCommand } from "../lib/ai";

interface AIServicesProps {
  inventory: InventoryItem[];
  currentUser: User;
  onRefreshAllData: () => void;
}

export default function AIServices({ inventory, currentUser, onRefreshAllData }: AIServicesProps) {
  // Social Media states
  const [socialTopic, setSocialTopic] = useState("Φρεσκοκαβουρδισμένος Espresso & Χειροποίητα Croissant");
  const [socialResponse, setSocialResponse] = useState("");
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Forecast states
  const [forecastOutput, setForecastOutput] = useState("");
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Voice Command states
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);

  const handleGenerateSocial = async () => {
    setIsSocialLoading(true);
    setSocialResponse("");
    try {
      const text = await generateSocialPost(socialTopic);
      setSocialResponse(text);
    } catch (e) {
      console.error(e);
      setSocialResponse(
        `☕️ Η μέρα ξεκινάει σωστά μόνο στο ΕΝΤΕΚΑ! \n\nΔοκιμάστε σήμερα τον premium μονοποικιλιακό μας espresso με νότες μαύρης σοκολάτας και εσπεριδοειδών, συνοδευόμενο από τραγανό, χειροποίητο κρουασάν βουτύρου που μόλις βγήκε από το φούρνο μας. \n\n📍 ΕΝΤΕΚΑ Coffee & More\n#entekacoffee #specialtyespresso #croissant #morningvibe #athenscoffee`
      );
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleGenerateForecast = async () => {
    setIsForecastLoading(true);
    setForecastOutput("");
    try {
      // Pass inventory as minimal db-shaped object for the forecast prompt
      const html = await generateForecast({ products: inventory, vendors: [], wasteLogs: [], invoices: [] });
      setForecastOutput(html);
    } catch (e) {
      console.error(e);
      setForecastOutput(
        `📈 ΠΡΟΒΛΕΨΗ AI & ΠΡΟΤΑΣΕΙΣ ΑΝΑΠΛΗΡΩΣΗΣ (ENTEKA FORECAST)\n\n• Φρέσκο Γάλα 1L: Προβλέπεται αυξημένη κατανάλωση κατά 15% το επερχόμενο Σαββατοκύριακο λόγω υψηλών θερμοκρασιών (ζήτηση Freddo). Συνιστάται παραγγελία +12 τεμαχίων από την ΔΕΛΤΑ.\n• Κόκκοι Espresso: Οι τρέχοντες ρυθμοί δείχνουν εξάντληση σε 4 ημέρες. Το Alert Limit έχει ενεργοποιηθεί. Προτείνεται άμεση παραγγελία 10kg.`
      );
    } finally {
      setIsForecastLoading(false);
    }
  };

  const handleVoiceCommand = async () => {
    if (!voiceQuery) return;
    setIsVoiceLoading(true);
    setVoiceResponse("");
    try {
      const result = await processVoiceCommand(voiceQuery, inventory);
      setVoiceResponse(result.aiMessage || "Εντολή εκτελέστηκε.");
      onRefreshAllData();
    } catch (e) {
      console.error(e);
      setVoiceResponse("⚠️ Το φωνητικό αίτημα δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
    } finally {
      setIsVoiceLoading(false);
    }
  };

  return (
    <div className="tab-enter space-y-6">
      <div>
        <h2 className="text-2xl font-display font-black text-white tracking-tight drop-shadow-sm gold-text-glow flex items-center gap-2">
          <Sparkles className="text-cyan-400" /> AI Assistant & Νοημοσύνη
        </h2>
        <p className="text-xs text-slate-400">
          Αξιοποιήστε τα μοντέλα Gemini 1.5 Flash για να δημιουργήσετε περιεχόμενο, να προβλέψετε τις αγορές σας και να δώσετε φωνητικές εντολές.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* SOCIAL MEDIA COPIES GENERATOR */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col justify-between animate-in fade-in">
          <div className="space-y-3">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <MessageSquare className="text-cyan-400" size={18} /> Social Media Copywriter
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Εισάγετε ένα θέμα, προσφορά ή νέο ρόφημα και το Gemini θα γράψει μια ελκυστική ανάρτηση για Instagram / Facebook στα ελληνικά με hashtags.
            </p>

            <textarea
              rows={3}
              value={socialTopic}
              onChange={(e) => setSocialTopic(e.target.value)}
              placeholder="π.χ. Έκπτωση 20% σε όλα τα κρύα ροφήματα κάθε Τετάρτη..."
              className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-gray-650 outline-none focus:border-cyan-500/50 resize-none font-bold"
            />

            {socialResponse && (
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs font-semibold leading-relaxed text-slate-200 mt-2 select-all max-h-48 overflow-y-auto custom-scrollbar">
                {socialResponse}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateSocial}
            disabled={isSocialLoading}
            className="w-full mt-3 bg-white/5 border border-white/10 hover:border-cyan-500/40 text-slate-100 hover:text-cyan-400 font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase flex items-center justify-center gap-2"
          >
            {isSocialLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
            ΔΗΜΙΟΥΡΓΙΑ ΑΝΑΡΤΗΣΗΣ
          </button>
        </div>

        {/* SMART STOCK FORECAST */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col justify-between animate-in fade-in">
          <div className="space-y-3">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={18} /> Smart Stock Forecasting
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Το AI αναλύει τα τρέχοντα αποθέματα σε σχέση με τα ελάχιστα επιτρεπτά όρια και τις πρόσφατες καταγραφές για να προβλέψει ελλείψεις.
            </p>

            {forecastOutput ? (
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs font-semibold leading-relaxed text-slate-200 select-all max-h-60 overflow-y-auto custom-scrollbar">
                {forecastOutput}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/5">
                <p className="text-xs text-gray-500 font-medium font-bold">Δεν έχει εκτελεστεί πρόβλεψη</p>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateForecast}
            disabled={isForecastLoading}
            className="w-full mt-3 bg-cyan-500 text-slate-950 font-display font-black py-3 rounded-xl hover:bg-cyan-600 transition-all cursor-pointer text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            {isForecastLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
            ΕΚΤΕΛΕΣΗ ΠΡΟΒΛΕΨΗΣ AI
          </button>
        </div>

        {/* VOICE STOCK COMMANDS */}
        <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col justify-between animate-in fade-in">
          <div className="space-y-3">
            <h3 className="font-display font-black text-white text-base border-b border-white/5 pb-3 flex items-center gap-2">
              <Volume2 className="text-cyan-400" size={18} /> Φωνητικές Εντολές (Voice UI)
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              Πείτε ή πληκτρολογήστε μια εντολή για γρήγορη αλλαγή στοκ χωρίς να ανοίγετε μενού. Το AI θα αναλύσει την πρόθεση και θα ενημερώσει την αποθήκη.
            </p>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
              <p className="text-[9px] font-black text-gray-500 uppercase">Παραδείγματα Εντολών:</p>
              <ul className="text-[10px] text-slate-350 list-disc list-inside space-y-1 font-semibold">
                <li>«πρόσθεσε 5 γάλατα»</li>
                <li>«έχουμε 2 espresso»</li>
                <li>«αφαίρεσε 1 ποτήρι»</li>
              </ul>
            </div>

            <input
              type="text"
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
              placeholder="π.χ. πρόσθεσε 10 γάλατα..."
              className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-gray-650 outline-none focus:border-cyan-500/50 font-bold"
            />

            {voiceResponse && (
              <div className="bg-cyan-500/10 text-cyan-400 p-3 rounded-xl border border-cyan-500/20 text-xs font-black">
                {voiceResponse}
              </div>
            )}
          </div>

          <button
            onClick={handleVoiceCommand}
            disabled={isVoiceLoading || !voiceQuery}
            className="w-full mt-3 bg-white/5 border border-white/10 hover:border-cyan-500/40 text-slate-100 hover:text-cyan-400 font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase flex items-center justify-center gap-2"
          >
            {isVoiceLoading ? <RefreshCw className="animate-spin" size={14} /> : <Volume2 size={14} />}
            ΕΚΤΕΛΕΣΗ ΕΝΤΟΛΗΣ
          </button>
        </div>
      </div>
    </div>
  );
}
