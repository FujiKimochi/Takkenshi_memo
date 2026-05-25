import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Settings as SettingsIcon, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Save, 
  Database, 
  AlertTriangle, 
  Search, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  Info, 
  ArrowRight,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { supabase, isMock, getSavedCredentials, saveCredentials, clearCredentials } from './utils/supabase';
import { analyzeScreenshot } from './utils/gemini';
import { MarkdownRenderer } from './utils/markdownRenderer';

// Pre-written mock data for demo textbook page (fallback for offline/mock mode)
const DEMO_NOTE_CONTENT = `# 宅建業法核心：35條書面（重要事項說明書）

重要事項說明書（簡稱35條書面）是宅建業法中極為關鍵的法定文件，旨在保護交易相對人（買方或承租方），確保其在簽署契約前充分了解物業與交易條件的關鍵資訊。

---

## 1. 核心要旨
- **交付與說明時機**：必須在**契約締結前**（簽訂買賣或租賃合約前）進行。
- **說明者**：必須由**持牌之宅建士**親自說明，並在說明前**主動出示宅建士證**。
- **交付對象**：
  - 買賣或交換交易：交付給**買方（買受人）**。
  - 租賃交易：交付給**承租方（借受人）**。
- **簽名與蓋章**：書面必須有**宅建士的簽名與印章**（記名押印）。

---

## 2. 說明事項體系 (35條記載事項)

主要分為兩大類別：

### A. 關於物件的物理與法律狀態（物件に関する事項）
1. **登記簿記載的事項**：所有權人、抵押權登記等。
2. **法令上的限制**：都市計畫法、建築基準法等建蔽率、容積率限制。
3. **私道分擔費用**：私有道路的共同負擔與費用。
4. **基礎設施狀態**：飲用水、電氣、瓦斯、排水設施的整備狀況。

### B. 關於交易條件（取引條件に関する事項）
1. **代金或借賃以外的資金收受**：保證金、權利金的交付金額與目的。
2. **契約解除的條件**：解約手續、解約金規範。
3. **違約金與損害賠償額的預定**。
4. **瑕疵担保責任（契約不適合責任）**的履行擔保措施。

---

## 3. 交易流程圖 (說明之流程)

> [!IMPORTANT]
> **重要流程順序**：
> 1. 契約締結前：由宅建士主動出示證件，向相對人進行說明並交付 **35條書面**。
> 2. 相對人理解並同意交易條款。
> 3. 雙方正式簽署買賣或租賃契約（交付 **37條書面**）。`;

const STUDY_TIPS = [
  {
    title: '權利關係準備心法',
    content: '民法部分切忌死記硬背，務必理解「意思表示」、「善意第三人」以及「瑕疵擔保責任」背後的法律邏輯與判例背景。'
  },
  {
    title: '宅建業法取分關鍵',
    content: '業法佔了20題，是合格的基本盤！尤其是「35條重要事項說明」與「37條合約書面」的相異之處是每年必考題，必須滾瓜爛熟。'
  },
  {
    title: '法令上限制的圖像記憶',
    content: '開發許可、用途地域、建蔽率與容積率等數字繁多，建議搭配圖表和色塊筆記進行對照記憶，複習時多做考古題抓出高頻考點。'
  },
  {
    title: '稅法與其他科目的準備',
    content: '地方稅與國稅的稅率減免條件繁雜，通常著重在印花稅、登録免許稅、不動產取得稅。此區塊投報率高，掌握基本定義即可拿到分數。'
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('全部');

  // Selected Note for detail modal
  const [selectedNote, setSelectedNote] = useState(null);

  // Editor State
  const [editId, setEditId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('權利關係');
  const [noteContent, setNoteContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [isDemoImage, setIsDemoImage] = useState(false);

  // Actions states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: '' }

  // Settings Credentials
  const [credentials, setCredentials] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash'
  });

  const fileInputRef = useRef(null);

  // Load configuration and fetch notes on mount
  useEffect(() => {
    const creds = getSavedCredentials();
    setCredentials(creds);
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
      showNotification('error', `載入筆記失敗: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Image Upload handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageName(file.name);
      setIsDemoImage(false);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleLoadDemoImage = () => {
    setImageUrl('/demo_textbook.png');
    setImageName('demo_textbook.png');
    setImageFile(null);
    setIsDemoImage(true);
    showNotification('success', '已載入示範課本截圖 (宅建業法-35條書面)');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl('');
    setImageName('');
    setIsDemoImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run Gemini API Scanning
  const handleScanImage = async () => {
    if (!imageUrl) {
      showNotification('error', '請先上傳截圖或載入示範截圖！');
      return;
    }

    setIsScanning(true);
    setScanStep('正在讀取截圖資料...');

    try {
      // If no credentials configured and using demo image, run high-fidelity mockup scan
      const creds = getSavedCredentials();
      if (!creds.geminiKey && isDemoImage) {
        setScanStep('正在上傳至本地 Mock 引擎...');
        await new Promise(r => setTimeout(r, 1000));
        setScanStep('[Mock] Gemini 正在分析法條與關聯結構...');
        await new Promise(r => setTimeout(r, 1200));
        setScanStep('正在將日文教材重整為繁體中文筆記...');
        await new Promise(r => setTimeout(r, 800));

        setNoteTitle('宅建業法第35條：重要事項說明書（35條書面）');
        setNoteSubject('宅建業法');
        setNoteContent(DEMO_NOTE_CONTENT);
        showNotification('success', '模擬分析成功！已載入示範筆記內容。');
        setIsScanning(false);
        return;
      }

      // Real Gemini API Flow
      if (!creds.geminiKey) {
        throw new Error('未配置 Gemini API Key，請先前往「設定」進行設定！');
      }

      let fileToAnalyze = imageFile;
      
      // If we are using the demo image with a real Gemini key, fetch and convert it to a file
      if (isDemoImage && !imageFile) {
        setScanStep('正在自系統讀取示範圖片檔...');
        const res = await fetch('/demo_textbook.png');
        const blob = await res.blob();
        fileToAnalyze = new File([blob], 'demo_textbook.png', { type: 'image/png' });
      }

      if (!fileToAnalyze) {
        throw new Error('無法取得圖片檔案，請重新上傳。');
      }

      setScanStep(`使用 ${creds.geminiModel} 模型分析截圖中...`);
      const parsedData = await analyzeScreenshot(fileToAnalyze);

      setNoteTitle(parsedData.title || '已解析筆記');
      setNoteSubject(parsedData.subject || '權利關係');
      setNoteContent(parsedData.markdownContent || '');
      
      showNotification('success', 'Gemini AI 解析成功！');
    } catch (err) {
      console.error(err);
      showNotification('error', `AI 解析失敗: ${err.message || err}`);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Save Note to Supabase
  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      showNotification('error', '請輸入筆記標題！');
      return;
    }
    if (!noteContent.trim()) {
      showNotification('error', '請輸入筆記內容！');
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // If we have a new image file, upload it to Supabase Storage screenshots bucket
      if (imageFile && !isMock) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.warn('Storage upload error, trying to save as base64 instead:', uploadError);
          // If storage bucket upload fails (e.g. bucket doesn't exist), we will keep base64 imageUrl
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(filePath);
          finalImageUrl = publicUrl;
        }
      }

      const noteData = {
        title: noteTitle,
        subject: noteSubject,
        content: noteContent,
        image_url: finalImageUrl
      };

      if (editId) {
        // Update note
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', editId);
        
        if (error) throw error;
        showNotification('success', '筆記更新成功！');
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert([noteData]);
        
        if (error) throw error;
        showNotification('success', '筆記儲存成功！');
      }

      // Reset editor
      resetEditor();
      // Refresh list
      fetchNotes();
      // Redirect to library
      setActiveTab('library');
    } catch (err) {
      console.error(err);
      showNotification('error', `儲存失敗: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetEditor = () => {
    setEditId(null);
    setNoteTitle('');
    setNoteSubject('權利關係');
    setNoteContent('');
    setImageFile(null);
    setImageUrl('');
    setImageName('');
    setIsDemoImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditNote = (note) => {
    setEditId(note.id);
    setNoteTitle(note.title);
    setNoteSubject(note.subject);
    setNoteContent(note.content);
    setImageUrl(note.image_url || '');
    setImageName(note.image_url ? '已上傳之截圖' : '');
    setImageFile(null);
    setIsDemoImage(false);
    
    setSelectedNote(null); // close detail modal if open
    setActiveTab('editor'); // switch to editor tab
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('確定要刪除此筆記嗎？此操作無法還原。')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showNotification('success', '筆記刪除成功！');
      setSelectedNote(null);
      fetchNotes();
    } catch (err) {
      console.error(err);
      showNotification('error', `刪除失敗: ${err.message || err}`);
    }
  };

  // Settings Form submit
  const handleSaveCredentials = (e) => {
    e.preventDefault();
    saveCredentials(
      credentials.supabaseUrl,
      credentials.supabaseAnonKey,
      credentials.geminiKey,
      credentials.geminiModel
    );
    showNotification('success', '連線與 API 金鑰已更新並儲存！');
  };

  const handleClearCredentials = () => {
    if (window.confirm('確定要清除所有連線與金鑰資訊嗎？這會切換回本地暫存模式。')) {
      clearCredentials();
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === '全部' || note.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Calculate statistics per subject
  const getSubjectCount = (sub) => {
    return notes.filter(note => note.subject === sub).length;
  };

  return (
    <div className="app-container">
      
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontWeight: 600
        }}>
          {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>
          <span className="logo-text">宅建士學習星雲</span>
        </div>

        <nav className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>學習儀表板</span>
          </button>
          <button 
            className={`nav-link ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <PlusCircle size={18} />
            <span>截圖筆記工坊</span>
          </button>
          <button 
            className={`nav-link ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <BookOpen size={18} />
            <span>筆記知識庫</span>
          </button>
          <button 
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            <span>API 設定面板</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-badge">
            <div className={`connection-dot ${isMock ? 'offline' : 'online'}`}></div>
            <span style={{ fontWeight: 500 }}>
              {isMock ? '本地暫存模式' : 'Supabase 連線中'}
            </span>
          </div>
        </div>
      </aside>

      {/* Bottom Nav - Mobile */}
      <nav className="bottom-nav">
        <button 
          className={`bottom-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>儀表板</span>
        </button>
        <button 
          className={`bottom-nav-link ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <PlusCircle size={20} />
          <span>工坊</span>
        </button>
        <button 
          className={`bottom-nav-link ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <BookOpen size={20} />
          <span>知識庫</span>
        </button>
        <button 
          className={`bottom-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={20} />
          <span>設定</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">學習儀表板</h1>
              <p className="page-subtitle">回顧學習軌跡與各考科收錄進度</p>
            </header>

            {/* Subject grid stats */}
            <div className="dashboard-grid">
              <div 
                className="stat-card kenri" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubjectFilter('權利關係');
                  setActiveTab('library');
                }}
              >
                <span className="stat-subject">權利關係</span>
                <span className="stat-count">{getSubjectCount('權利關係')}</span>
                <span className="stat-label">篇筆記</span>
              </div>
              <div 
                className="stat-card gyouhou" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubjectFilter('宅建業法');
                  setActiveTab('library');
                }}
              >
                <span className="stat-subject">宅建業法</span>
                <span className="stat-count">{getSubjectCount('宅建業法')}</span>
                <span className="stat-label">篇筆記</span>
              </div>
              <div 
                className="stat-card seigen" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubjectFilter('法令上の制限');
                  setActiveTab('library');
                }}
              >
                <span className="stat-subject">法令上の制限</span>
                <span className="stat-count">{getSubjectCount('法令上の制限')}</span>
                <span className="stat-label">篇筆記</span>
              </div>
              <div 
                className="stat-card zei" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSubjectFilter('稅・その他');
                  setActiveTab('library');
                }}
              >
                <span className="stat-subject">稅・その他</span>
                <span className="stat-count">{getSubjectCount('稅・核心')}</span>
                <span className="stat-label">篇筆記</span>
              </div>
            </div>

            <div className="dashboard-sections">
              {/* Recent notes section */}
              <div className="section-card">
                <h2 className="section-title">
                  <BookOpen size={18} className="upload-icon" style={{ color: 'var(--primary)' }} />
                  最近新增筆記
                </h2>
                
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="empty-state">
                    <p>目前還沒有任何學習筆記。</p>
                    <button className="btn btn-primary" onClick={() => setActiveTab('editor')}>
                      <PlusCircle size={16} />
                      開始新增筆記
                    </button>
                  </div>
                ) : (
                  <div className="recent-notes-list">
                    {notes.slice(0, 5).map(note => (
                      <div 
                        key={note.id} 
                        className="note-item-row"
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="note-info">
                          <span className="note-title">{note.title}</span>
                          <div className="note-meta">
                            <span className={`subject-badge ${
                              note.subject === '權利關係' ? 'kenri' :
                              note.subject === '宅建業法' ? 'gyouhou' :
                              note.subject === '法令上の制限' ? 'seigen' : 'zei'
                            }`}>
                              {note.subject}
                            </span>
                            <span>•</span>
                            <span>{new Date(note.created_at).toLocaleDateString('zh-TW')}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                    {notes.length > 5 && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setActiveTab('library')}
                        style={{ marginTop: '0.5rem' }}
                      >
                        查看全部 {notes.length} 篇筆記
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Study Tips section */}
              <div className="section-card">
                <h2 className="section-title">
                  <Sparkles size={18} style={{ color: 'var(--color-seigen)' }} />
                  宅建士備考心法
                </h2>
                <div className="study-tips-list">
                  {STUDY_TIPS.map((tip, idx) => (
                    <div key={idx} className="tip-card">
                      <div className="tip-header">
                        <Info size={14} />
                        <span>{tip.title}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {tip.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <div>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="page-title">{editId ? '編輯筆記' : '截圖筆記工坊'}</h1>
                <p className="page-subtitle">{editId ? '修改既有筆記內容' : '上傳法規截圖，透過 Gemini API 解析出精美筆記'}</p>
              </div>
              {editId && (
                <button className="btn btn-secondary" onClick={resetEditor}>
                  取消編輯 / 新增筆記
                </button>
              )}
            </header>

            <div className="editor-layout">
              {/* Left pane: Image uploader */}
              <div className="workspace-pane">
                <h3 className="section-title">
                  <ImageIcon size={18} style={{ color: 'var(--primary)' }} />
                  第一步：上傳/截圖預覽
                </h3>

                {!imageUrl ? (
                  <div 
                    className="upload-container"
                    onClick={triggerFileInput}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        setImageFile(file);
                        setImageName(file.name);
                        setIsDemoImage(false);
                        const reader = new FileReader();
                        reader.onloadend = () => setImageUrl(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  >
                    <Upload size={40} className="upload-icon" />
                    <div>
                      <p className="upload-title">點擊上傳 或 拖曳截圖至此</p>
                      <p className="upload-subtitle">支援 PNG, JPG, JPEG 格式</p>
                    </div>
                    
                    <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <hr style={{ flexGrow: 1, borderColor: 'var(--border-color)' }} />
                        <span>或</span>
                        <hr style={{ flexGrow: 1, borderColor: 'var(--border-color)' }} />
                      </div>
                      
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadDemoImage();
                        }}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        載入內建日文課本截圖 (測試用)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                    <div className="image-preview-container">
                      <img src={imageUrl} alt="Uploaded textbook screenshot" className="image-preview" />
                      <button className="remove-image-btn" onClick={handleRemoveImage} title="移除圖片">
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        檔案：{imageName}
                      </span>
                      {isDemoImage && <span style={{ color: 'var(--color-gyouhou)', fontWeight: 600 }}>示範圖片已加載</span>}
                    </div>

                    <button 
                      className="btn btn-primary" 
                      onClick={handleScanImage} 
                      disabled={isScanning}
                      style={{ width: '100%', padding: '1rem' }}
                    >
                      <Sparkles size={18} />
                      <span>Gemini AI 辨識截圖與整理</span>
                    </button>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />

                {/* Scan Overlay loading screen */}
                {isScanning && (
                  <div className="scan-overlay">
                    <div className="scan-radar"></div>
                    <div className="scan-text">{scanStep}</div>
                    <div className="scan-subtext">正在使用 Gemini 2.5 Flash 生成高畫質考點筆記...</div>
                  </div>
                )}
              </div>

              {/* Right pane: Editor fields */}
              <div className="workspace-pane">
                <h3 className="section-title">
                  <Edit size={18} style={{ color: 'var(--color-gyouhou)' }} />
                  第二步：編輯與儲存筆記
                </h3>

                <div className="form-group">
                  <label className="form-label">筆記標題</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="請輸入或等待 AI 生成筆記標題" 
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">科目分類</label>
                  <select 
                    className="form-select"
                    value={noteSubject}
                    onChange={(e) => setNoteSubject(e.target.value)}
                  >
                    <option value="權利關係">權利關係 (民法/所有權等)</option>
                    <option value="宅建業法">宅建業法 (重要事項/合約等)</option>
                    <option value="法令上の制限">法令上の制限 (都市計畫/土地建蔽等)</option>
                    <option value="稅・その他">稅・その他 (印花稅/免稅等)</option>
                  </select>
                </div>

                <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label">筆記內容 (支援 Markdown)</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="輸入學習筆記內容，支援 Markdown 語法。您也可以透過 AI 自動解析帶入內容。"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                </div>

                <div className="editor-footer">
                  <button className="btn btn-secondary" onClick={resetEditor}>
                    清除欄位
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveNote}
                    disabled={isSaving}
                  >
                    <Save size={18} />
                    <span>{isSaving ? '儲存中...' : '儲存筆記 (同步至雲端)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">筆記知識庫</h1>
              <p className="page-subtitle">搜尋已整理的宅建法條筆記與對照截圖</p>
            </header>

            {/* Filter Hub */}
            <div className="library-filters">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="form-input search-input" 
                  placeholder="搜尋筆記標題或內容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-tags">
                {['全部', '權利關係', '宅建業法', '法令上の制限', '稅・その他'].map(sub => (
                  <button
                    key={sub}
                    className={`filter-tag ${subjectFilter === sub ? 'active' : ''}`}
                    onClick={() => setSubjectFilter(sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Grid */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <RefreshCw className="spin" size={32} style={{ margin: '0 auto 15px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>正在載入筆記知識庫...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={48} className="empty-icon" />
                <h3>找不到任何筆記</h3>
                <p>試著調整搜尋字詞或科目篩選，或是前往「截圖筆記工坊」新增一篇筆記。</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('editor')}>
                  <PlusCircle size={16} />
                  新增筆記
                </button>
              </div>
            ) : (
              <div className="notes-grid">
                {filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    className="note-card"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="note-card-header">
                      <span className={`subject-badge ${
                        note.subject === '權利關係' ? 'kenri' :
                        note.subject === '宅建業法' ? 'gyouhou' :
                        note.subject === '法令上の制限' ? 'seigen' : 'zei'
                      }`}>
                        {note.subject}
                      </span>
                    </div>
                    <h3 className="note-card-title">{note.title}</h3>
                    <p className="note-card-body">{note.content}</p>
                    
                    <div className="note-card-footer">
                      <span>{new Date(note.created_at).toLocaleDateString('zh-TW')}</span>
                      {note.image_url && (
                        <span className="note-card-image-indicator">
                          <ImageIcon size={14} />
                          <span>有截圖</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div>
            <header className="page-header">
              <h1 className="page-title">連線與 API 設定面板</h1>
              <p className="page-subtitle">配置您的 Supabase 資料庫與 Google Gemini API 金鑰</p>
            </header>

            <div className="settings-container">
              
              <div className="settings-card">
                <h3 className="settings-section-title" style={{ color: 'var(--color-kenri)' }}>
                  <Database size={18} />
                  Supabase 後端資料庫設定
                </h3>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  設定 Supabase 可啟用跨平台（手機/電腦）即時資料同步。若未設定，系統會自動使用本地 LocalStorage 進行資料儲存，供您立即體驗。
                </p>

                <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supabase URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="https://xxxxxx.supabase.co"
                      value={credentials.supabaseUrl}
                      onChange={(e) => setCredentials({ ...credentials, supabaseUrl: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supabase Anon Key</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={credentials.supabaseAnonKey}
                      onChange={(e) => setCredentials({ ...credentials, supabaseAnonKey: e.target.value })}
                    />
                  </div>

                  <h3 className="settings-section-title" style={{ color: '#8b5cf6', marginTop: '1rem' }}>
                    <Sparkles size={18} />
                    Gemini AI 辨識設定
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Gemini API Key</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="AIzaSy..."
                      value={credentials.geminiKey}
                      onChange={(e) => setCredentials({ ...credentials, geminiKey: e.target.value })}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      請前往 Google AI Studio 取得您的免費或付費 API 金鑰。
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gemini 模型</label>
                    <select 
                      className="form-select"
                      value={credentials.geminiModel}
                      onChange={(e) => setCredentials({ ...credentials, geminiModel: e.target.value })}
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (推薦 - 速度極快且穩定)</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash (最新推薦)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (推理能力極強)</option>
                      <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (輕量模型)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                      儲存設定
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={handleClearCredentials}
                    >
                      清除設定
                    </button>
                  </div>
                </form>
              </div>

              <div className="settings-card">
                <h3 className="settings-section-title" style={{ color: 'var(--text-secondary)' }}>
                  <Info size={18} />
                  隱私與安全說明
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  您的 API 金鑰和資料庫連線資訊<strong>完全儲存在您的瀏覽器本地 (LocalStorage)</strong>，本 App 不會收集您的個人資訊，亦不會將密鑰上傳到任何第三方伺服器，您可以完全放心使用。
                </p>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>本 App 執行環境：前端 Vite + React</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* NOTE DETAIL MODAL (Overlay) */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <div className="modal-title-area">
                <span className={`subject-badge ${
                  selectedNote.subject === '權利關係' ? 'kenri' :
                  selectedNote.subject === '宅建業法' ? 'gyouhou' :
                  selectedNote.subject === '法令上の制限' ? 'seigen' : 'zei'
                }`} style={{ width: 'fit-content' }}>
                  {selectedNote.subject}
                </span>
                <h2 className="modal-title">{selectedNote.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedNote(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={`modal-body ${!selectedNote.image_url ? 'no-image' : ''}`}>
              {/* Left Column: Markdown content */}
              <div className="modal-notes-section">
                <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '10px' }}>
                  <MarkdownRenderer content={selectedNote.content} />
                </div>
              </div>

              {/* Right Column: Screenshot image */}
              {selectedNote.image_url && (
                <div className="modal-image-section">
                  <img src={selectedNote.image_url} alt="Note textbook page" className="modal-image" />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                建立時間：{new Date(selectedNote.created_at).toLocaleString('zh-TW')}
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleEditNote(selectedNote)}
                >
                  <Edit size={16} />
                  <span>編輯筆記</span>
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteNote(selectedNote.id)}
                >
                  <Trash2 size={16} />
                  <span>刪除</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
