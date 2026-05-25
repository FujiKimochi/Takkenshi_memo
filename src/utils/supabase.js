import { createClient } from '@supabase/supabase-js';

// Get credentials from localStorage
export const getSavedCredentials = () => {
  return {
    supabaseUrl: localStorage.getItem('takken_supabase_url') || '',
    supabaseAnonKey: localStorage.getItem('takken_supabase_anon_key') || '',
    geminiKey: localStorage.getItem('takken_gemini_key') || '',
    geminiModel: localStorage.getItem('takken_gemini_model') || 'gemini-2.5-flash',
  };
};

export const saveCredentials = (url, anonKey, geminiKey, geminiModel = 'gemini-2.5-flash') => {
  localStorage.setItem('takken_supabase_url', url || '');
  localStorage.setItem('takken_supabase_anon_key', anonKey || '');
  localStorage.setItem('takken_gemini_key', geminiKey || '');
  localStorage.setItem('takken_gemini_model', geminiModel || 'gemini-2.5-flash');
  
  // Reload page to reinitialize Supabase client
  window.location.reload();
};

export const clearCredentials = () => {
  localStorage.removeItem('takken_supabase_url');
  localStorage.removeItem('takken_supabase_anon_key');
  localStorage.removeItem('takken_gemini_key');
  localStorage.removeItem('takken_gemini_model');
  window.location.reload();
};

const credentials = getSavedCredentials();
export const hasCredentials = !!(credentials.supabaseUrl && credentials.supabaseAnonKey);

let supabaseInstance = null;

// Mock database using LocalStorage
class MockSupabase {
  constructor() {
    this.notesKey = 'takken_mock_notes';
    if (!localStorage.getItem(this.notesKey)) {
      localStorage.setItem(this.notesKey, JSON.stringify([
        {
          id: 'mock-1',
          title: '瑕疵担保責任與契約解除',
          subject: '權利關係',
          content: `### 權利關係重點：瑕疵担保責任

根據日本民法改正，買受人（買方）在發現目的物有瑕疵（契約不適合）時，可行使以下權利：
1. **追完請求權**：要求修補、交付代替物或不足部分。
2. **代金減額請求權**：若賣方未在合理期限內追完，買方可按比例請求減少價金。
3. **契約解除權**：若是不適合程度重大且無法達到契約目的，買方可解除契約。
4. **損害賠償請求權**：可與解除或減價併行要求。

> **注意時效**：買受人自**知悉**不適合之時起**一年內**，必須通知出賣人。`,
          image_url: '',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'mock-2',
          title: '重要事項說明（35條書面）重要交付時機',
          subject: '宅建業法',
          content: `### 宅建業法核心：35條書面交付

宅建士在交易過程中必須說明的最重要文件。

*   **交付時機**：在**契約成立前**（也就是買賣契約簽署前）。
*   **說明者**：必須由**持牌之宅建士**說明，並出示宅建士證。
*   **交付對象**：
    *   買賣/交換契約：交付給**買受人**或**交換當事人**。
    *   租賃契約：交付給**借受人**（承租方）。
*   **簽名蓋章**：書面上必須有宅建士的簽名。`,
          image_url: '',
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ]));
    }
  }

  getNotes() {
    return JSON.parse(localStorage.getItem(this.notesKey));
  }

  saveNotes(notes) {
    localStorage.setItem(this.notesKey, JSON.stringify(notes));
  }

  from(table) {
    if (table !== 'notes') {
      throw new Error(`Mock database only supports 'notes' table`);
    }

    const notes = this.getNotes();

    return {
      select: () => {
        return {
          order: (column, { ascending = true } = {}) => {
            const sorted = [...notes].sort((a, b) => {
              const valA = new Date(a[column]);
              const valB = new Date(b[column]);
              return ascending ? valA - valB : valB - valA;
            });
            return Promise.resolve({ data: sorted, error: null });
          }
        };
      },
      insert: (newNotes) => {
        const fullNotes = newNotes.map(n => ({
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          image_url: n.image_url || '',
          ...n
        }));
        const current = this.getNotes();
        this.saveNotes([...fullNotes, ...current]);
        return Promise.resolve({ data: fullNotes, error: null });
      },
      update: (updateFields) => {
        return {
          eq: (field, value) => {
            if (field !== 'id') throw new Error('Mock only supports eq filter on id');
            const current = this.getNotes();
            let updated = null;
            const next = current.map(note => {
              if (note.id === value) {
                updated = { ...note, ...updateFields };
                return updated;
              }
              return note;
            });
            this.saveNotes(next);
            return Promise.resolve({ data: updated ? [updated] : [], error: null });
          }
        };
      },
      delete: () => {
        return {
          eq: (field, value) => {
            if (field !== 'id') throw new Error('Mock only supports eq filter on id');
            const current = this.getNotes();
            const filtered = current.filter(note => note.id !== value);
            this.saveNotes(filtered);
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  }

  get storage() {
    return {
      from: (bucket) => {
        return {
          upload: async (path, file) => {
            // Convert file to base64 to store in local memory for the mock
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result;
                const storageKey = `mock_storage_${bucket}_${path}`;
                localStorage.setItem(storageKey, base64data);
                resolve({ data: { path }, error: null });
              };
              reader.readAsDataURL(file);
            });
          },
          getPublicUrl: (path) => {
            const storageKey = `mock_storage_${bucket}_${path}`;
            const dataUrl = localStorage.getItem(storageKey) || '';
            return { data: { publicUrl: dataUrl } };
          },
          remove: async (paths) => {
            paths.forEach(path => {
              localStorage.removeItem(`mock_storage_${bucket}_${path}`);
            });
            return { data: null, error: null };
          }
        };
      }
    };
  }
}

if (hasCredentials) {
  try {
    supabaseInstance = createClient(credentials.supabaseUrl, credentials.supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabaseInstance = new MockSupabase();
  }
} else {
  // Use mock client if no credentials set
  supabaseInstance = new MockSupabase();
}

export const supabase = supabaseInstance;
export const isMock = !hasCredentials;
