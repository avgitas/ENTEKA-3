import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(firebaseApp);

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const provider = new GoogleAuthProvider();
// Request full Google Drive and Picker workspace access
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/picker");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGUser: any | null = null;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Αποτυχία λήψης Google access token.");
    }

    cachedAccessToken = credential.accessToken;
    cachedGUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Σφάλμα σύνδεσης Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedGUser = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Google Drive v3 APIs

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

// 1. List files in Google Drive
export const listDriveFiles = async (token: string): Promise<DriveFile[]> => {
  try {
    // We only fetch files matching our app backups or general json/text/csv files for clear scope
    const query = encodeURIComponent("name contains 'enteka_' or mimeType = 'application/json' or mimeType = 'text/plain' or mimeType = 'text/csv'");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=40&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime%20desc`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Σφάλμα Drive: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    console.error("Σφάλμα κατά την ανάγνωση αρχείων Drive:", error);
    throw error;
  }
};

// 2. Upload file to Google Drive using multipart upload
export const uploadBackupFile = async (
  token: string,
  fileName: string,
  fileContent: string,
  mimeType: string = "application/json"
): Promise<DriveFile> => {
  try {
    const boundary = "enteka_boundary_999";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: mimeType,
      description: "Αντίγραφο ασφαλείας / εξαγωγή δεδομένων από το ΕΝΤΕΚΑ Control Room",
    };

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      fileContent +
      close_delim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Αποτυχία μεταφόρτωσης: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Σφάλμα κατά το upload στο Drive:", error);
    throw error;
  }
};

// 3. Delete Drive file
export const deleteDriveFile = async (token: string, fileId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Αποτυχία διαγραφής αρχείου: ${response.status} - ${errorText}`);
    }

    return true;
  } catch (error: any) {
    console.error("Σφάλμα κατά τη διαγραφή αρχείου Drive:", error);
    throw error;
  }
};

// 4. Download / View JSON file content
export const downloadDriveFileContent = async (token: string, fileId: string): Promise<string> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Αποτυχία λήψης αρχείου: ${response.status} - ${errorText}`);
    }

    return await response.text();
  } catch (error: any) {
    console.error("Σφάλμα κατά τη λήψη περιεχομένου αρχείου Drive:", error);
    throw error;
  }
};

// 5. Dynamic script loader for Google APIs (gapi) and Google Identity Services (gis)
export const loadGooglePickerScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.google?.picker) {
      resolve();
      return;
    }

    // First load gapi
    if (!window.gapi) {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = (err) => reject(new Error("Failed to load Google API Loader (gapi) script."));
      document.body.appendChild(script);
    } else {
      resolve();
    }
  });
};

// 6. Launch GAPI and open GAPI Picker
export const openGooglePicker = async (
  token: string,
  apiKey: string,
  appId: string,
  onSelectCallback: (file: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string }) => void
): Promise<void> => {
  await loadGooglePickerScript();
  
  return new Promise((resolve, reject) => {
    window.gapi.load("picker", {
      callback: () => {
        try {
          if (!window.google?.picker) {
            throw new Error("Google Picker workspace is not loaded properly.");
          }
          
          const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
          view.setParent("root"); // Allows showing directories and all files
          
          const picker = new window.google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            .setDeveloperKey(apiKey)
            .setAppId(appId)
            .setCallback((data: any) => {
              if (data.action === window.google.picker.Action.PICKED) {
                const doc = data.docs[0];
                onSelectCallback({
                  id: doc.id || doc[window.google.picker.Document.ID],
                  name: doc.name || doc[window.google.picker.Document.NAME],
                  mimeType: doc.mimeType || doc[window.google.picker.Document.MIME_TYPE],
                  webViewLink: doc.url || doc[window.google.picker.Document.URL],
                  size: doc.sizeBytes || doc[window.google.picker.Document.SIZE_BYTES],
                });
              }
            })
            .build();
            
          picker.setVisible(true);
          resolve();
        } catch (err) {
          console.error("Error building Google Picker:", err);
          reject(err);
        }
      },
      onerror: (err: any) => {
        console.error("Error loading picker package via gapi.load:", err);
        reject(new Error("Αποτυχία φόρτωσης του Google Picker SDK."));
      }
    });
  });
};
