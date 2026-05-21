import React, { useState, useEffect } from "react";
import { User, ActivityAudit } from "../types";
import {
  googleSignIn,
  logout,
  initAuth,
  listDriveFiles,
  uploadBackupFile,
  deleteDriveFile,
  downloadDriveFileContent,
  DriveFile,
  openGooglePicker,
} from "../lib/googleDrive";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  HardDrive,
  CloudUpload,
  Database,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  ArrowUpRight,
  LogOut,
  X,
  FileText,
  FolderOpen
} from "lucide-react";
import { getDB, restoreDB } from "../lib/db";

interface GoogleDriveBackupsProps {
  dbData: any;
  currentUser: User;
  onRefreshData: () => Promise<void>;
  onLogActivity: (action: string, details: string) => void;
}

export default function GoogleDriveBackups({
  dbData,
  currentUser,
  onRefreshData,
  onLogActivity,
}: GoogleDriveBackupsProps) {
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [gToken, setGToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [notification, setNotification] = useState("");

  // Modal / Preview state
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");

  // Check login state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGToken(token);
        setIsAuthChecking(false);
        loadDriveFiles(token);
      },
      () => {
        setGoogleUser(null);
        setGToken(null);
        setIsAuthChecking(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch file list from Drive
  const loadDriveFiles = async (token: string) => {
    setIsFilesLoading(true);
    setErrorMsg("");
    try {
      const driveFiles = await listDriveFiles(token);
      setFiles(driveFiles);
    } catch (err: any) {
      setErrorMsg("Αποτυχία φόρτωσης αρχείων από το Google Drive.");
    } finally {
      setIsFilesLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setErrorMsg("");
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGToken(res.accessToken);
        setNotification("Συνδεθήκατε επιτυχώς στο Google Drive!");
        loadDriveFiles(res.accessToken);
      }
    } catch (err: any) {
      setErrorMsg("Η σύνδεση με το Google Drive ακυρώθηκε ή απέτυχε.");
    }
  };

  // Google Disconnect
  const handleGoogleLogout = async () => {
    const confirmed = window.confirm("Αποσύνδεση από το Google Drive;");
    if (!confirmed) return;

    try {
      await logout();
      setGoogleUser(null);
      setGToken(null);
      setFiles([]);
      setNotification("Αποσυνδεθήκατε από το λογαριασμό Google.");
    } catch (err: any) {
      setErrorMsg("Σφάλμα κατά την αποσύνδεση.");
    }
  };

  // GOOGLE DRIVE PICKER FUNCTIONALITY
  const handleOpenGooglePicker = async () => {
    if (!gToken) return;
    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");
    try {
      const apiKey = firebaseConfig.apiKey;
      const appId = firebaseConfig.messagingSenderId || "";
      
      await openGooglePicker(gToken, apiKey, appId, async (pickedFile) => {
        setNotification(`Επιλέχθηκε αρχείο μέσω Google Picker: ${pickedFile.name}`);
        
        // Show file instantly inside preview modal!
        try {
          const content = await downloadDriveFileContent(gToken, pickedFile.id);
          setPreviewFileName(pickedFile.name);
          setPreviewContent(content);
        } catch {
          setErrorMsg("Το αρχείο που επιλέχθηκε δεν υποστηρίζει άμεση προεπισκόπηση κειμένου.");
        }
        
        // Add to files list in state so that it is easily interactable by user
        setFiles((prev) => {
          if (prev.some((f) => f.id === pickedFile.id)) return prev;
          const driveFileObj: DriveFile = {
            id: pickedFile.id,
            name: pickedFile.name,
            mimeType: pickedFile.mimeType,
            createdTime: new Date().toISOString(),
            size: pickedFile.size || "0",
            webViewLink: pickedFile.webViewLink,
          };
          return [driveFileObj, ...prev];
        });
        
        onLogActivity(
          "DRIVE_PICKER_SELECT",
          `Επιλέχθηκε αρχείο μέσω Google Picker: ${pickedFile.name}`
        );
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Αποτυχία ανοίγματος του Google Picker.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 1. CREATE CUSTOM FULL APP DB BACKUP (JSON)
  const handleCreateFullBackup = async () => {
    if (!gToken) return;
    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");

    try {
      // 1. Fetch freshest state from Firestore directly
      const currentDB = await getDB();

      // 2. Format content of file
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      const fileName = `enteka_full_backup_${dateStr}_${timeStr}.json`;
      const fileContent = JSON.stringify(currentDB, null, 2);

      // 3. Upload file
      const uploaded = await uploadBackupFile(gToken, fileName, fileContent, "application/json");
      
      onLogActivity(
        "DRIVE_BACKUP_CREATE",
        `Δημιουργία πλήρους αντιγράφου ασφαλείας στο Google Drive: ${fileName}`
      );

      setNotification(`Το αντίγραφο ασφαλείας δημιουργήθηκε με επιτυχία: ${uploaded.name}`);
      loadDriveFiles(gToken);
    } catch (err: any) {
      setErrorMsg(err.message || "Αποτυχία δημιουργίας αντιγράφου ασφαλείας στο Drive.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 2. EXPORT PRODUCTS STOCK LIST (CSV)
  const handleExportProductsCSV = async () => {
    if (!gToken) return;
    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");

    try {
      const products = dbData?.products || [];
      if (products.length === 0) {
        throw new Error("Δεν υπάρχουν προϊόντα στην αποθήκη για εξαγωγή.");
      }

      // Convert Products to CSV
      const headers = ["ID", "Όνομα", "Κατηγορία", "Απόθεμα", "Τιμή Αγοράς (Cost)", "Λιανική Τιμή (Retail)", "Όριο Ειδοποίησης", "Προμηθευτής"];
      const rows = products.map((p: any) => [
        p.id,
        p.name,
        p.category,
        p.stock,
        p.price,
        p.retailPrice,
        p.alertLimit,
        p.vendor || ""
      ]);

      // Simple CSV joining
      const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `enteka_products_stock_${dateStr}.csv`;

      const uploaded = await uploadBackupFile(gToken, fileName, csvContent, "text/csv");
      
      onLogActivity(
        "DRIVE_EXPORT_PRODUCTS",
        `Εξαγωγή αποθεμάτων σε αρχείο CSV στο Google Drive: ${fileName}`
      );

      setNotification(`Ο κατάλογος αποθήκης εξήχθη επιτυχώς: ${uploaded.name}`);
      loadDriveFiles(gToken);
    } catch (err: any) {
      setErrorMsg(err.message || "Αποτυχία εξαγωγής προϊόντων στο Drive.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 3. EXPORT Z-REPORTS (CASH CLOSURES) LIST (CSV)
  const handleExportZReportsCSV = async () => {
    if (!gToken) return;
    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");

    try {
      const zReports = dbData?.zReports || [];
      if (zReports.length === 0) {
        throw new Error("Δεν υπάρχουν αναφορές Ζ στο ταμείο για εξαγωγή.");
      }

      // Convert ZReports to CSV
      const headers = ["ID", "Ημερομηνία", "Μετρητά", "POS", "Έξοδα", "Καθαρά Μετρητά", "Συνολικό Κέρδος", "Μερίδιο Α (40%)", "Μερίδιο Β (60%)"];
      const rows = zReports.map((z: any) => [
        z.id,
        z.date,
        z.cash,
        z.pos,
        z.totalExpenses,
        z.netCash,
        z.totalProfit,
        z.share40,
        z.share60
      ]);

      const csvContent = "\ufeff" + [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `enteka_zreports_tax_${dateStr}.csv`;

      const uploaded = await uploadBackupFile(gToken, fileName, csvContent, "text/csv");
      
      onLogActivity(
        "DRIVE_EXPORT_ZREPORTS",
        `Εξαγωγή αναφορών Ζ σε αρχείο CSV στο Google Drive: ${fileName}`
      );

      setNotification(`Οι αναφορές Ζ εξήχθησαν επιτυχώς: ${uploaded.name}`);
      loadDriveFiles(gToken);
    } catch (err: any) {
      setErrorMsg(err.message || "Αποτυχία εξαγωγής αναφορών Ζ στο Drive.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // DOWNLOAD DRIVE FILE TO CLIENT COMPUTER
  const handleDownloadFileToPC = async (file: DriveFile) => {
    if (!gToken) return;
    setErrorMsg("");
    try {
      const content = await downloadDriveFileContent(gToken, file.id);
      
      // Trigger instant browser download using virtual blob anchor
      const blob = new Blob([content], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg("Αποτυχία τοπικής λήψης του αρχείου.");
    }
  };

  // IMPORT & FULL DATABASE RESTORE FROM BACKUP (JSON)
  const handleRestoreBackup = async (file: DriveFile) => {
    if (!gToken) return;
    if (!file.name.endsWith(".json")) {
      alert("Μόνο αρχεία αντιγράφων ασφαλείας μορφής .json μπορούν να εισαχθούν ως δεδομένα.");
      return;
    }

    const doubleCheck1 = window.confirm(
      `ΠΡΟΣΟΧΗ! Είστε σίγουροι ότι θέλετε να κάνετε επαναφορά από το αρχείο "${file.name}";\n\nΌλα τα τρέχοντα δεδομένα της αποθήκης, των τιμολογίων, των βαρδιών και του ταμείου θα ΑΝΤΙΚΑΤΑΣΤΑΘΟΥΝ πλήρως!`
    );
    if (!doubleCheck1) return;

    const doubleCheck2 = window.confirm(
      "Επιβεβαιώστε τη διαδικασία επαναφοράς. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί και θα συγχρονιστεί άμεσα στο Cloud Firestore και στη βάση δεδομένων!"
    );
    if (!doubleCheck2) return;

    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");

    try {
      // 1. Fetch file content from Drive
      const rawContent = await downloadDriveFileContent(gToken, file.id);
      const backupObj = JSON.parse(rawContent);

      // 2. Restore database directly to Firestore
      await restoreDB(backupObj);

      // 3. Trigger parent workspace reload
      await onRefreshData();

      onLogActivity(
        "DRIVE_BACKUP_RESTORE",
        `Πραγματοποιήθηκε πλήρης επαναφορά βάσης δεδομένων από το Google Drive αρχείο: ${file.name}`
      );

      setNotification("Η επαναφορά της βάσης δεδομένων και του Cloud Firestore ολοκληρώθηκε επιτυχώς!");
    } catch (err: any) {
      setErrorMsg(err.message || "Σφάλμα κατά την επαναφορά των δεδομένων.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // DELETE DRIVE FILE WITH USER CONFIRMATION
  const handleDeleteFile = async (file: DriveFile) => {
    if (!gToken) return;
    
    // Explicit user confirmation before destructive operations (MANDATORY guideline)
    const confirmed = window.confirm(
      `Θέλετε σίγουρα να διαγράψετε οριστικά το αρχείο "${file.name}" από το Google Drive σας;`
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    setErrorMsg("");
    setNotification("");

    try {
      await deleteDriveFile(gToken, file.id);
      
      onLogActivity(
        "DRIVE_FILE_DELETE",
        `Διαγραφή αρχείου στο Google Drive: ${file.name}`
      );

      setNotification(`Το αρχείο διαγράφηκε με επιτυχία: ${file.name}`);
      loadDriveFiles(gToken);
    } catch (err: any) {
      setErrorMsg("Αποτυχία διαγραφής του αρχείου από το Google Drive.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // VIEW/PREVIEW PLAIN FILE RECD
  const handlePreviewFile = async (file: DriveFile) => {
    if (!gToken) return;
    setErrorMsg("");
    try {
      const content = await downloadDriveFileContent(gToken, file.id);
      setPreviewFileName(file.name);
      setPreviewContent(content);
    } catch (errValue) {
      setErrorMsg("Αποτυχία ανάγνωσης αρχείου για προεπισκόπηση.");
    }
  };

  // Helper size formatter
  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return "-";
    const bytes = parseInt(bytesStr);
    if (isNaN(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (isAuthChecking) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <RefreshCw className="text-cyan-400 animate-spin mb-4" size={32} />
        <p className="text-sm font-semibold text-slate-400">Έλεγχος σύνδεσης Google Workspace...</p>
      </div>
    );
  }

  // If Not Authenticated with Google Workspace, Render beautiful Google style login wrapper
  if (!gToken) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/50 rounded-3xl border border-white/10 shadow-2xl space-y-6 max-w-xl mx-auto my-10 relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full filter blur-[30px] pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-cyan-950/40 text-cyan-400 rounded-3xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <HardDrive size={38} className="animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider">
              GOOGLE DRIVE BACKUPS <span className="text-cyan-500">&</span> SYNC
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Ασφαλίστε τα δεδομένα του καταστήματος **ΕΝΤΕΚΑ** απευθείας στο Google Drive σας. 
              Εξάγετε αποθέματα, τιμολόγια και αναφορές κλεισίματος ταμείου (Ζ) σε μορφή CSV/JSON και κάντε πλήρη επαναφορά με ένα μόνο κλικ.
            </p>
          </div>

          <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl w-full flex items-start gap-3.5 text-left text-[11px] text-amber-300">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <p className="font-semibold leading-relaxed">
              Για την ενεργοποίηση της μεταφόρτωσης και λήψης αρχείων, απαιτούνται δικαιώματα διαχείρισης Drive. Η εφαρμογή αποθηκεύει και εμφανίζει αποκλειστικά τα δικά της αρχεία.
            </p>
          </div>

          {/* Styled GSI button complying perfectly with the rules */}
          <button
            onClick={handleGoogleLogin}
            className="flex items-center gap-4 bg-white hover:bg-slate-100 text-slate-800 border border-transparent font-sans font-bold text-sm px-6 py-3.5 rounded-full shadow-lg active:scale-95 transition-all cursor-pointer select-none"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span className="font-semibold select-none">Σύνδεση με Google Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  // If Google Workspace Auth is active, render active hub
  return (
    <div className="space-y-6">
      
      {/* Alert Notifications Banner */}
      {errorMsg && (
        <div className="bg-red-950/40 text-red-400 text-xs p-4 rounded-2xl border border-red-900/40 flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="shrink-0 text-red-400" size={16} />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {notification && (
        <div className="bg-emerald-950/40 text-emerald-400 text-xs p-4 rounded-2xl border border-emerald-900/40 flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle className="shrink-0 text-emerald-400" size={16} />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Profile summary header of authenticated workspace */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/5 rounded-full filter blur-[40px] pointer-events-none"></div>
        
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/30"
              />
            ) : (
              <div className="w-12 h-12 bg-cyan-950/50 text-cyan-400 rounded-xl flex items-center justify-center font-bold text-sm border border-cyan-500/20">
                {googleUser?.displayName?.charAt(0) || "G"}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 p-0.5 rounded-full border border-slate-905">
              <UserCheck size={10} />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-display font-black text-white text-base">
              {googleUser?.displayName || "Χρήστης Google"}
            </h3>
            <p className="text-[10px] font-mono text-cyan-400 font-bold">
              Συνδεδεμένο email: {googleUser?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          <button
            onClick={handleOpenGooglePicker}
            disabled={isActionLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0c1e2f]/70 text-cyan-400 border border-cyan-500/30 hover:bg-[#122e47] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:scale-[1.02] active:scale-95 duration-150"
          >
            <FolderOpen className="shrink-0 text-cyan-400" size={14} />
            Google Picker
          </button>
          <button
            onClick={() => loadDriveFiles(gToken)}
            disabled={isFilesLoading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`shrink-0 ${isFilesLoading ? "animate-spin" : ""}`} size={14} />
            Ανανέωση Drive
          </button>
          <button
            onClick={handleGoogleLogout}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-955 text-red-500 border border-red-900/30 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-red-950/20 transition-all cursor-pointer uppercase tracking-wider"
          >
            <LogOut size={13} />
            Αποσυνδεση
          </button>
        </div>
      </div>

      {/* QUICK OPERATIONS DASHBOARD */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
        <div>
          <h3 className="font-display font-black text-white text-base flex items-center gap-2 uppercase tracking-wider">
            <CloudUpload className="text-cyan-400" size={18} /> Εργαλεία Δημιουργίας Αντιγράφων & Εξαγωγών
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Πατήστε ένα από τα παρακάτω κουμπιά για να δημιουργήσετε ένα άμεσο αντίγραφο ή εξαγωγή αρχείου στο Google Drive σας.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Action 1: Full Backup JSON */}
          <div className="bg-slate-950/45 p-4 rounded-2xl border border-white/5 space-y-3.5 flex flex-col justify-between hover:border-cyan-500/20 transition-all">
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="p-2 bg-cyan-950/50 text-cyan-400 rounded-xl border border-cyan-900/40">
                  <Database size={18} />
                </span>
                <span className="text-[9px] bg-cyan-950/35 border border-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Συνιστάται
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide pt-1">
                Πλήρες Αντίγραφο (JSON)
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Αποθηκεύει ολόκληρη τη βάση δεδομένων (προϊόντα, τιμολόγια, βάρδιες, ταμείο Ζ, activity audit trail, feedback) σε ένα ενιαίο αρχείο JSON για απόλυτη επαναφορά.
              </p>
            </div>
            <button
              onClick={handleCreateFullBackup}
              disabled={isActionLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-display uppercase tracking-wide"
            >
              <Database size={14} />
              {isActionLoading ? "Δημιουργια..." : "Backup Δεδομενων"}
            </button>
          </div>

          {/* Action 2: Products Export CSV */}
          <div className="bg-slate-950/45 p-4 rounded-2xl border border-white/5 space-y-3.5 flex flex-col justify-between hover:border-cyan-500/20 transition-all">
            <div className="space-y-1">
              <span className="p-2 inline-block bg-emerald-950/50 text-emerald-450 rounded-xl border border-emerald-900/40">
                <FileSpreadsheet size={18} className="text-emerald-400" />
              </span>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide pt-1">
                Εξαγωγή Προϊόντων (CSV)
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Δημιουργεί ένα αρχείο λογιστικού φύλλου CSV που περιλαμβάνει αναλυτικά όλα τα προϊόντα της αποθήκης, τις τιμές κόστους/λιανικής, τα αποθέματα και τους καταγεγραμμένους προμηθευτές.
              </p>
            </div>
            <button
              onClick={handleExportProductsCSV}
              disabled={isActionLoading}
              className="w-full bg-slate-900 hover:bg-slate-805 disabled:bg-slate-850 border border-emerald-500/20 text-emerald-400 disabled:text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wider font-display uppercase"
            >
              <FileSpreadsheet size={14} />
              {isActionLoading ? "Εξαγωγη..." : "Εξαγωγη CSV"}
            </button>
          </div>

          {/* Action 3: Z-Reports Export CSV */}
          <div className="bg-slate-950/45 p-4 rounded-2xl border border-white/5 space-y-3.5 flex flex-col justify-between hover:border-cyan-500/20 transition-all">
            <div className="space-y-1">
              <span className="p-2 inline-block bg-emerald-950/50 text-emerald-450 rounded-xl border border-emerald-900/40">
                <FileSpreadsheet size={18} className="text-emerald-400" />
              </span>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide pt-1">
                Εξαγωγή Ταμείου Z (CSV)
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Δημιουργεί ένα αρχείο CSV με το ιστορικό ημερήσιων closures (Ζ), μετρητά, POS, αναλυτικά έξοδα, καθαρό ταμείο και τον αυτόματο διαμοιρασμό μεριδίων των ιδιοκτητών (40%-60%).
              </p>
            </div>
            <button
              onClick={handleExportZReportsCSV}
              disabled={isActionLoading}
              className="w-full bg-slate-900 hover:bg-slate-805 disabled:bg-slate-850 border border-emerald-500/20 text-emerald-400 disabled:text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wider font-display uppercase"
            >
              <FileSpreadsheet size={14} />
              {isActionLoading ? "Εξαγωγη..." : "Εξαγωγη CSV"}
            </button>
          </div>

          {/* Action 4: Google Picker Search */}
          <div className="bg-slate-950/45 p-4 rounded-2xl border border-cyan-500/10 space-y-3.5 flex flex-col justify-between hover:border-cyan-500/30 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.03)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full filter blur-[15px] pointer-events-none"></div>
            <div className="space-y-1">
              <span className="p-2 inline-block bg-cyan-950/50 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                <FolderOpen size={18} className="text-cyan-400" />
              </span>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide pt-1">
                Google Picker
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Ανοίγει το οπτικό Google Picker για πλοήγηση σε ολόκληρο το Drive σας, επιτρέποντας την επιλογή, την προεπισκόπηση και την ανάκτηση οποιουδήποτε αρχείου.
              </p>
            </div>
            <button
              onClick={handleOpenGooglePicker}
              disabled={isActionLoading}
              className="w-full bg-slate-900 hover:bg-[#0f1f30] disabled:bg-slate-850 border border-cyan-500/30 text-cyan-400 disabled:text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer tracking-wider font-display uppercase hover:scale-[1.02] active:scale-95 duration-100"
            >
              <FolderOpen size={14} />
              {isActionLoading ? "Φορτωση..." : "Ανοιγμα Picker"}
            </button>
          </div>

        </div>
      </div>

      {/* BACKUP FILES LIST FROM DRIVE */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <h3 className="font-display font-black text-white text-base flex items-center gap-2 uppercase tracking-wider">
              <HardDrive className="text-cyan-400" size={18} /> Αντίγραφα στο Google Drive σας
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Αρχεία αντιγράφων ασφαλείας και εξαγωγών που βρέθηκαν στο Drive σας.
            </p>
          </div>
          <span className="text-[10px] bg-cyan-950/40 border border-cyan-900/40 text-cyan-400 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider">
            Συνολο: {files.length}
          </span>
        </div>

        {isFilesLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <RefreshCw className="text-cyan-400 animate-spin" size={24} />
            <p className="text-xs text-slate-400 font-medium">Ανάγνωση αρχείων από την Google...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-slate-950/20 rounded-2xl border border-white/5 border-dashed">
            Δεν βρέθηκαν αρχεία αντιγράφων ασφαλείας <span className="text-cyan-400 font-bold">("enteka_")</span> στο Google Drive σας. Δημιουργήστε ένα νέο αντίγραφο παραπάνω.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">
            {files.map((file) => {
              const isJSON = file.mimeType === "application/json";
              const isCSV = file.mimeType === "text/csv" || file.name.endsWith(".csv");
              
              return (
                <div
                  key={file.id}
                  className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-white/5 px-2.5 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-900 rounded-xl border border-white/5 shrink-0">
                      {isJSON ? (
                        <FileJson className="text-cyan-400" size={18} />
                      ) : isCSV ? (
                        <FileSpreadsheet className="text-emerald-400" size={18} />
                      ) : (
                        <FileText className="text-slate-400" size={18} />
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-xs text-slate-100 truncate max-w-[280px] sm:max-w-[420px]" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(file.createdTime).toLocaleString("el-GR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        <span className="text-white/20 text-[9px]">•</span>
                        <span className="text-[9px] text-cyan-400 font-mono font-bold">
                          {formatSize(file.size)}
                        </span>
                        <span className="text-white/20 text-[9px]">•</span>
                        <span className="text-[8px] px-1.5 py-0.2 rounded border uppercase font-black text-slate-400 bg-slate-950/40 border-slate-850">
                          {isJSON ? "DATABASE BACKUP" : "SPREADSHEET EXPORT"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar of row */}
                  <div className="flex items-center sm:justify-end gap-2 border-t sm:border-t-0 border-white/5 pt-3.5 sm:pt-0 shrink-0">
                    
                    {/* View/Preview */}
                    <button
                      onClick={() => handlePreviewFile(file)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                      title="Προεπισκόπηση"
                    >
                      Προβολή
                    </button>

                    {/* Download button */}
                    <button
                      onClick={() => handleDownloadFileToPC(file)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
                      title="Τοπική Λήψη στο PC"
                    >
                      <Download size={14} />
                    </button>

                    {/* Restore DB button (Only clickable for json database copies) */}
                    {isJSON && file.name.includes("backup") && (
                      <button
                        onClick={() => handleRestoreBackup(file)}
                        className="px-3 py-2 bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 font-bold rounded-xl text-[10px] tracking-wider transition-all uppercase flex items-center gap-1 cursor-pointer"
                        title="Επαναφορά βάσης δεδομένων & Firestore"
                      >
                        <RefreshCw size={11} /> Επαναφορα
                      </button>
                    )}

                    {/* Drop Link direct */}
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer referrer"
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center"
                        title="Άνοιγμα στο Google Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {/* Delete File (Comply with strict destructive check) */}
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="p-2 bg-red-950/40 hover:bg-red-500 hover:text-slate-950 border border-red-900/30 text-red-400 rounded-xl transition-all cursor-pointer"
                      title="Διαγραφή από το Google Drive"
                    >
                      <Trash2 size={14} />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILE PREVIEW MODAL */}
      {previewContent && (
        <div className="fixed inset-0 z-50 bg-[#000]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b0e14] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
              <div className="space-y-1">
                <h4 className="font-display font-black text-white text-sm uppercase tracking-wide">
                  Προεπισκόπηση Αρχείου Drive
                </h4>
                <p className="text-[10px] text-cyan-400 font-mono truncate max-w-[280px] sm:max-w-md">
                  {previewFileName}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewContent(null);
                  setPreviewFileName("");
                }}
                className="p-1 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white border border-white/5 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Κλείσιμο
              </button>
            </div>

            {/* Content view box */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-[11px] text-slate-300 leading-relaxed custom-scrollbar">
              <pre className="whitespace-pre-wrap word-break-all select-text selection:bg-cyan-500 selection:text-slate-950 bg-slate-950">
                {previewContent}
              </pre>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/50 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setPreviewContent(null);
                  setPreviewFileName("");
                }}
                className="px-5 py-2.5 bg-cyan-500 font-bold hover:bg-cyan-600 rounded-xl text-slate-950 text-xs transition-all cursor-pointer font-display uppercase tracking-wide"
              >
                Κλείσιμο (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
