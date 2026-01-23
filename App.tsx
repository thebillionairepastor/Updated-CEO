
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Send, Plus, Search, RefreshCw, Download, FileText, ChevronRight, ShieldAlert, BookOpen, Globe, Briefcase, Calendar, ChevronLeft, Save, Trash2, Check, Lightbulb, Printer, Settings as SettingsIcon, MessageCircle, Mail, X, Bell, Database, Upload, Pin, PinOff, BarChart2, Sparkles, Copy, Lock, ShieldCheck, Fingerprint, Eye, Paperclip, XCircle, Bookmark, BookmarkCheck, LayoutGrid, ListFilter, Wand2, Map, ExternalLink, ImageIcon, Target, User, Phone, FileUp, Key, AlertTriangle, EyeIcon, CloudDownload, WifiOff, Newspaper, Zap, Activity } from 'lucide-react';
import Navigation from './components/Navigation.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import ShareButton from './components/ShareButton.tsx';
import IncidentChart from './components/IncidentChart.tsx';
import { View, ChatMessage, Template, SecurityRole, StoredReport, WeeklyTip, UserProfile, KnowledgeDocument, SavedTrend, StoredTrainingModule, NewsItem } from './types.ts';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants.ts';
import { generateTrainingModuleStream, analyzeReport, fetchBestPracticesStream, generateWeeklyTip, fetchTopicSuggestions, fetchSecurityNews, analyzePatrolPatterns, generateAdvisorStream } from './services/geminiService.ts';

// --- Offline Storage Service (IndexedDB) ---
const DB_NAME = 'AntiRiskOfflineVault';
const STORE_NAME = 'offline_training';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const AntiRiskLogo = ({ className = "w-24 h-24", light = false }: { className?: string; light?: boolean }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L95 85 L5 85 Z" fill={light ? "#1e293b" : "#000000"} />
    <path d="M50 15 L85 80 L15 80 Z" fill={light ? "#334155" : "#000000"} />
    <circle cx="50" cy="55" r="30" fill="white" />
    <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="bold" fill="black" textAnchor="middle">AR</text>
    <rect x="0" y="85" width="100" height="15" fill="#000" />
    <text x="50" y="96" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">ANTI-RISK SECURITY</text>
  </svg>
);

function App() {
  const [appState, setAppState] = useState<'SPLASH' | 'PIN_ENTRY' | 'PIN_SETUP' | 'READY'>('SPLASH');
  const [pinInput, setPinInput] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [tempPin, setTempPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [storedPin, setStoredPin] = useState<string | null>(() => localStorage.getItem('security_app_vault_pin'));
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTipAlert, setShowNewTipAlert] = useState<WeeklyTip | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('security_app_profile');
    return saved ? JSON.parse(saved) : { name: 'Executive Director', phoneNumber: '', email: '', preferredChannel: 'WhatsApp' };
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('security_app_chat');
    return saved ? JSON.parse(saved) : [{
      id: 'welcome',
      role: 'model',
      text: `Hello CEO ${userProfile.name ? userProfile.name : ''}. AntiRisk Intelligence Vault is active. How can I assist with your strategic security operations today?`,
      timestamp: Date.now()
    }];
  });

  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => {
    const saved = localStorage.getItem('security_app_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [weeklyTips, setWeeklyTips] = useState<WeeklyTip[]>(() => {
    const saved = localStorage.getItem('security_app_weekly_tips');
    return saved ? JSON.parse(saved) : [];
  });

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeDocument[]>(() => {
    const saved = localStorage.getItem('security_app_kb');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedTraining, setSavedTraining] = useState<StoredTrainingModule[]>(() => {
    const saved = localStorage.getItem('security_app_training');
    return saved ? JSON.parse(saved) : [];
  });

  const [customSops, setCustomSops] = useState<Template[]>(() => {
    const saved = localStorage.getItem('security_app_custom_sops');
    return saved ? JSON.parse(saved) : [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  const [advisorViewMode, setAdvisorViewMode] = useState<'CHAT' | 'PINNED'>('CHAT');
  const [showKbModal, setShowKbModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [showSopModal, setShowSopModal] = useState(false);
  const [newSopTitle, setNewSopTitle] = useState('');
  const [newSopDesc, setNewSopDesc] = useState('');
  const [newSopContent, setNewSopContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditFileInputRef = useRef<HTMLInputElement>(null);

  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [trainingRole, setTrainingRole] = useState<SecurityRole>(SecurityRole.GUARD);
  const [trainingContent, setTrainingContent] = useState('');
  const [trainingSources, setTrainingSources] = useState<Array<{ title: string; url: string }> | undefined>(undefined);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showTrainingSuggestions, setShowTrainingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [toolkitTab, setToolkitTab] = useState<'TEMPLATES' | 'AUDIT'>('TEMPLATES');

  const localSuggestions = useMemo(() => {
    if (trainingTopic.trim().length < 2) return [];
    const lower = trainingTopic.toLowerCase();
    const matches: string[] = [];
    Object.keys(SECURITY_TRAINING_DB).forEach(cat => {
      if (cat.toLowerCase().includes(lower)) matches.push(cat);
    });
    Object.values(SECURITY_TRAINING_DB).flat().forEach(topic => {
      if (topic.toLowerCase().includes(lower)) matches.push(topic);
    });
    return [...new Set(matches)].slice(0, 5);
  }, [trainingTopic]);

  useEffect(() => {
    if (trainingTopic.trim().length < 3 || isOfflineMode || !showTrainingSuggestions) {
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const suggestions = await fetchTopicSuggestions(trainingTopic);
        setAiSuggestions(suggestions.filter(s => !localSuggestions.includes(s)));
      } catch (err) {
        console.error("AI fetch failed", err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [trainingTopic, isOfflineMode, showTrainingSuggestions, localSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowTrainingSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerTab, setAnalyzerTab] = useState<'DAILY' | 'PATROL' | 'INCIDENT'>('DAILY');
  const [bpTopic, setBpTopic] = useState('');
  const [bpContent, setBpContent] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);
  const [isTipLoading, setIsTipLoading] = useState(false);

  const [toolkitSearch, setToolkitSearch] = useState('');

  const [newsBlog, setNewsBlog] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('security_app_chat', JSON.stringify(messages)); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_kb', JSON.stringify(knowledgeBase)); }, [knowledgeBase]);
  useEffect(() => { localStorage.setItem('security_app_training', JSON.stringify(savedTraining)); }, [savedTraining]);
  useEffect(() => { localStorage.setItem('security_app_custom_sops', JSON.stringify(customSops)); }, [customSops]);

  useEffect(() => {
    if (appState === 'READY' && !isOfflineMode) {
      const checkAutomation = async () => {
        const lastAutoCheck = localStorage.getItem('security_app_last_auto_tip');
        const today = new Date().toLocaleDateString();
        if (lastAutoCheck === today) return; 
        const mostRecentTip = weeklyTips[0];
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        if (!mostRecentTip || (Date.now() - mostRecentTip.timestamp > sevenDaysInMs)) {
           handleGenerateWeeklyTip();
        }
        localStorage.setItem('security_app_last_auto_tip', today);
      };
      checkAutomation();
    }
  }, [appState, isOfflineMode, weeklyTips]);

  useEffect(() => {
    if (appState === 'SPLASH') {
      const startTime = Date.now();
      const duration = 2000;
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setSplashProgress(progress);
        if (progress >= 100) {
          clearInterval(timer);
          setTimeout(() => setAppState(storedPin ? 'PIN_ENTRY' : 'PIN_SETUP'), 300);
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [appState, storedPin]);

  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newPin = pinInput + digit;
    setPinInput(newPin);
    setIsPinError(false);
    if (newPin.length === 4) {
      if (appState === 'PIN_ENTRY') {
        if (newPin === storedPin) setAppState('READY');
        else { setIsPinError(true); setTimeout(() => setPinInput(''), 500); }
      } else {
        if (setupStep === 1) { setTempPin(newPin); setSetupStep(2); setPinInput(''); }
        else {
          if (newPin === tempPin) { 
            localStorage.setItem('security_app_vault_pin', newPin); 
            setStoredPin(newPin); 
            setAppState('READY');
          } else { setIsPinError(true); setSetupStep(1); setPinInput(''); }
        }
      }
    }
  };

  const handleError = (error: any) => {
    const errorStr = JSON.stringify(error).toUpperCase();
    const isQuota = errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('429') || errorStr.includes('QUOTA') || errorStr.includes('LIMIT');
    if (isQuota) {
      setApiError("Intelligence Core is experiencing peak demand. Security protocols are retrying connection. Please maintain standby.");
    } else {
      setApiError(`Communication Breach: ${error?.message || "Internal network instability."}`);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isOfflineMode) return;
    setApiError(null);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage, timestamp: Date.now() };
    const tempId = Date.now().toString() + 'ai';
    const initialAiMsg: ChatMessage = { id: tempId, role: 'model', text: '', timestamp: Date.now(), isPinned: false };
    
    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsAdvisorThinking(true);

    try {
      await generateAdvisorStream(
        messages, 
        currentInput,
        (streamedText) => {
          setIsAdvisorThinking(false);
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: streamedText } : msg));
        },
        (sources) => {
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, sources } : msg));
        }
      );
    } catch (err: any) { 
      handleError(err);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally { 
      setIsAdvisorThinking(false); 
    }
  };

  const togglePinMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg));
  };

  const handleAnalyzeReport = async () => {
    if (!reportText || isOfflineMode) return;
    setApiError(null); setIsAnalyzing(true);
    try {
      const auditType = analyzerTab === 'INCIDENT' ? 'INCIDENT' : (analyzerTab === 'PATROL' ? 'PATROL' : 'SHIFT');
      const result = await analyzeReport(reportText, auditType);
      setAnalysisResult(result);
      setStoredReports(prev => [{ id: Date.now().toString(), timestamp: Date.now(), dateStr: new Date().toLocaleDateString(), content: reportText, analysis: result }, ...prev]);
    } catch (err: any) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleAnalyzePatrols = async () => {
    if (storedReports.length === 0 || isOfflineMode) return;
    setApiError(null); setIsAnalyzing(true);
    try {
      const result = await analyzePatrolPatterns(storedReports);
      setAnalysisResult(result);
    } catch (err: any) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setApiError(null); 
    setIsTrainingLoading(true); 
    setTrainingContent('');
    setTrainingSources(undefined);
    setShowTrainingSuggestions(false);
    
    try {
      await generateTrainingModuleStream(
        trainingTopic, 
        trainingWeek, 
        trainingRole,
        (text) => setTrainingContent(text),
        (sources) => setTrainingSources(sources)
      );
    } catch (err: any) { handleError(err); } finally { setIsTrainingLoading(false); }
  };

  const handleFetchBP = async () => {
    if (isOfflineMode) return;
    setApiError(null); 
    setIsBpLoading(true);
    setBpContent({ text: '', sources: undefined });

    try {
      await fetchBestPracticesStream(
        bpTopic,
        (text) => setBpContent(prev => ({ ...prev!, text })),
        (sources) => setBpContent(prev => ({ ...prev!, sources }))
      );
    } catch (err: any) { handleError(err); } finally { setIsBpLoading(false); }
  };

  const handleGenerateWeeklyTip = async () => {
    if (isOfflineMode) return;
    setApiError(null); setIsTipLoading(true);
    try {
      const content = await generateWeeklyTip(weeklyTips);
      const newTip: WeeklyTip = { 
        id: Date.now().toString(), 
        weekDate: new Date().toLocaleDateString(), 
        topic: "Weekly Strategic Focus", 
        content, 
        isAutoGenerated: true, 
        timestamp: Date.now() 
      };
      setWeeklyTips(prev => [newTip, ...prev]);
      setShowNewTipAlert(newTip);
    } catch (err: any) { handleError(err); } finally { setIsTipLoading(false); }
  };

  const handleLoadNews = async () => {
    setIsNewsLoading(true); setApiError(null);
    try {
      const news = await fetchSecurityNews();
      setNewsBlog(news);
    } catch (err: any) { handleError(err); } finally { setIsNewsLoading(false); }
  };

  const handleAddKbDocument = () => {
    if (!newDocTitle || !newDocContent) return;
    const newDoc: KnowledgeDocument = { id: Date.now().toString(), title: newDocTitle, content: newDocContent, dateAdded: new Date().toLocaleDateString() };
    setKnowledgeBase(prev => [...prev, newDoc]);
    setNewDocTitle(''); setNewDocContent(''); setShowKbModal(false);
  };

  const handleAddCustomSop = () => {
    if (!newSopTitle || !newSopContent) return;
    const newSop: Template = { id: Date.now().toString(), title: newSopTitle, description: newSopDesc || 'Custom Protocol', content: newSopContent };
    setCustomSops(prev => [newSop, ...prev]);
    setNewSopTitle(''); setNewSopDesc(''); setNewSopContent(''); setShowSopModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setNewSopContent(content);
      if (!newSopTitle) setNewSopTitle(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsText(file);
  };

  const handleAuditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setReportText(content);
    };
    reader.readAsText(file);
  };

  // --- Views ---

  const renderDashboard = () => {
    const menuItems = [
      { id: View.ADVISOR, label: 'AI Advisor', desc: 'Strategic consultation.', icon: ShieldAlert, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { id: View.NEWS_BLOG, label: 'News Blog', desc: 'Daily briefings.', icon: Newspaper, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      { id: View.TRAINING, label: 'Training Builder', desc: '10M+ Database.', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { id: View.WEEKLY_TIPS, label: 'Directives', desc: 'Tactical briefings.', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { id: View.TOOLKIT, label: 'Ops Vault', desc: 'Tactical SOPs.', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-400/10', subTab: 'TEMPLATES' },
      { id: View.TOOLKIT, label: 'Audit & Risk', desc: 'Vulnerabilities scan.', icon: Fingerprint, color: 'text-red-400', bg: 'bg-red-400/10', subTab: 'AUDIT' },
      { id: View.BEST_PRACTICES, label: 'Global Trends', desc: 'ISO & Market shifts.', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
      { id: 'CEO_PROFILE', label: 'CEO Profile', desc: 'Manage identity.', icon: User, color: 'text-slate-400', bg: 'bg-slate-400/10' }
    ];

    return (
      <div className="space-y-6 sm:space-y-10 max-w-6xl mx-auto pb-20 animate-in fade-in duration-700">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#122b6a] via-[#1a3a8a] to-[#0a1222] border border-blue-500/20 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-16 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/10 blur-[100px] sm:blur-[120px] -mr-32 -mt-32 rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10">
            <div className="space-y-4 sm:space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-300 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                <Activity size={10} className="animate-pulse" /> Operational Command Active
              </div>
              <h2 className="text-3xl sm:text-6xl font-black tracking-tighter leading-tight">Executive Control <br className="hidden xs:block"/><span className="text-blue-400">Hub</span></h2>
              <p className="text-blue-100/70 text-sm sm:text-xl font-medium leading-relaxed">Secure access to 10M training vibrations and tactical intelligence.</p>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 w-full md:w-auto">
              <button onClick={() => setCurrentView(View.ADVISOR)} className="w-full md:px-10 py-4 sm:py-5 bg-white text-blue-900 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <Sparkles size={18} /> Strategic Consult
              </button>
              <div className="flex gap-3">
                <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                  <p className="text-[8px] sm:text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Audit</p>
                  <p className="text-sm sm:text-lg font-bold">LOCKED</p>
                </div>
                <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-xl sm:rounded-2xl">
                  <p className="text-[8px] sm:text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Threat</p>
                  <p className="text-sm sm:text-lg font-bold">STABLE</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Menu</h3>
            <span className="h-px flex-1 mx-4 sm:mx-6 bg-slate-800/60"></span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.id === 'CEO_PROFILE') setShowSettings(true);
                  else {
                    setCurrentView(item.id as View);
                    if (item.subTab) setToolkitTab(item.subTab as 'TEMPLATES' | 'AUDIT');
                  }
                }}
                className="group relative bg-[#1b2537] p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/40 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 text-left flex flex-col h-full shadow-lg active:scale-95"
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 ${item.bg} ${item.color} rounded-lg sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon size={20} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-sm sm:text-xl font-black text-white mb-1 tracking-tight group-hover:text-blue-400 transition-colors truncate">{item.label}</h3>
                <p className="text-slate-400 text-[10px] sm:text-sm font-medium leading-relaxed flex-1 line-clamp-2">{item.desc}</p>
                <div className="hidden sm:flex mt-6 items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Access Vault <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Global Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Bank Sync</span>
            </div>
          </div>
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-600">AntiRisk v1.0.4.5</p>
        </div>
      </div>
    );
  };

  const renderTrainingView = () => (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-full max-w-7xl mx-auto">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-[#1b2537] p-6 sm:p-8 rounded-[2rem] border border-slate-700/50 shadow-lg relative">
          <div className="absolute -top-3 -right-3 bg-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg z-10 border border-blue-400/30 animate-pulse uppercase tracking-widest">10M+ Bank</div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-3"><BookOpen size={24} className="text-emerald-400" /> Training Builder</h2>
          <div className="space-y-4">
            <div className="space-y-1 relative" ref={suggestionsRef}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Topic Intelligence</label>
              <div className="relative">
                <input 
                  value={trainingTopic} 
                  onChange={(e) => {
                    setTrainingTopic(e.target.value);
                    setShowTrainingSuggestions(true);
                  }} 
                  onFocus={() => setShowTrainingSuggestions(true)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-3 text-white outline-none focus:border-blue-500 transition-all text-sm sm:text-base pr-10" 
                  placeholder="Query Core Database..." 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isFetchingSuggestions ? (
                    <RefreshCw size={14} className="text-blue-500 animate-spin" />
                  ) : (
                    <Zap size={14} className={`${trainingTopic.length > 2 ? 'text-blue-400' : 'text-slate-600'}`} />
                  )}
                </div>
              </div>
              
              {showTrainingSuggestions && (localSuggestions.length > 0 || aiSuggestions.length > 0) && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0a1222]/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-blue-500/20">
                  {localSuggestions.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database size={10} /> Local Hits
                      </div>
                      {localSuggestions.map((suggestion, idx) => (
                        <button key={`local-${idx}`} onClick={() => { setTrainingTopic(suggestion); setShowTrainingSuggestions(false); }} className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-3">
                          <Check size={14} className="shrink-0 text-emerald-500 opacity-60" />
                          <span className="truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {aiSuggestions.length > 0 && (
                    <div className="py-2 border-t border-slate-800">
                      <div className="px-4 py-1 text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={10} /> AI Variants
                      </div>
                      {aiSuggestions.map((suggestion, idx) => (
                        <button key={`ai-${idx}`} onClick={() => { setTrainingTopic(suggestion); setShowTrainingSuggestions(false); }} className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-3">
                          <Wand2 size={14} className="shrink-0 text-blue-400 opacity-60" />
                          <span className="truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
                <select value={trainingRole} onChange={(e) => setTrainingRole(e.target.value as SecurityRole)} className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
                  <option value={SecurityRole.GUARD}>Guard</option>
                  <option value={SecurityRole.SUPERVISOR}>Supervisor</option>
                  <option value={SecurityRole.GEN_SUPERVISOR}>Director</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Week</label>
                <select value={trainingWeek} onChange={(e) => setTrainingWeek(parseInt(e.target.value))} className="w-full bg-slate-900/40 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
                  <option value={1}>Week 1</option>
                  <option value={2}>Week 2</option>
                  <option value={3}>Week 3</option>
                  <option value={4}>Week 4</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerateTraining} 
              disabled={isTrainingLoading || !trainingTopic} 
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all ${trainingTopic ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              {isTrainingLoading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Generate Brief
            </button>
          </div>
        </div>
        <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-inner hidden lg:flex">
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/40 text-xs font-black text-slate-400 uppercase tracking-widest">Categories</div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-2">
            {Object.keys(SECURITY_TRAINING_DB).map(cat => (
              <button key={cat} onClick={() => { setTrainingTopic(cat); setShowTrainingSuggestions(false); }} className={`w-full text-left p-3 rounded-xl text-sm font-bold transition-all border ${trainingTopic === cat ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/20 text-slate-300 hover:bg-slate-800 border-slate-700/30'}`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="lg:col-span-8 flex flex-col gap-6 min-h-[300px]">
        <div className="bg-[#1b2537] rounded-[2rem] border border-slate-700/50 overflow-hidden flex flex-col flex-1 shadow-2xl">
          <div className="p-5 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center"><h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-3"><ShieldCheck className="text-blue-400" /> Operational Brief</h3>{trainingContent && <ShareButton content={trainingContent} title={`${trainingTopic} - Week ${trainingWeek}`} />}</div>
          <div className="flex-1 p-5 sm:p-8 overflow-y-auto bg-slate-900/10 scrollbar-hide">
            {trainingContent ? <MarkdownRenderer content={trainingContent} /> : <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-center gap-4 py-12"><Target size={60} /><p className="text-sm sm:text-lg">Audit the 10M+ Database to generate briefings.</p></div>}
            {isTrainingLoading && !trainingContent && (
               <div className="flex flex-col items-center justify-center h-full py-12 gap-4 animate-pulse">
                 <RefreshCw className="text-blue-500 animate-spin" size={32} />
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Engaging Vault Core...</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBestPractices = () => (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in">
      <div className="bg-[#1b2537] p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h2 className="text-xl sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-4"><Globe className="text-blue-400" size={28} /> Global Trends</h2>
          <p className="text-slate-400 text-sm sm:text-lg font-medium">Deep intelligence on ISO and standards.</p>
        </div>
        <div className="w-full md:w-72 relative">
          <input value={bpTopic} onChange={(e) => setBpTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFetchBP()} placeholder="Search trends..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl sm:rounded-2xl px-5 py-3 text-white outline-none focus:border-blue-500 text-sm" />
          <button onClick={handleFetchBP} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><Search size={18} /></button>
        </div>
      </div>
      <div className="bg-[#1b2537] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[300px] flex flex-col">
        {isBpLoading && !bpContent?.text ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 opacity-50"><RefreshCw className="text-blue-400 animate-spin" size={36} /><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Querying Vault...</p></div>
        ) : bpContent?.text ? (
          <div className="p-6 sm:p-10">
            <div className="flex justify-end mb-4"><ShareButton content={bpContent.text} title="Global Trend Brief" /></div>
            <MarkdownRenderer content={bpContent.text} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20 p-10 text-center gap-4"><Globe size={80} /><p className="text-lg font-bold">Search for strategic global updates.</p></div>
        )}
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-800/50 rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-xl">
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-900/40 flex flex-col gap-4 sm:gap-6">
        <div className="flex justify-between items-center"><h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-3"><ShieldAlert className="text-blue-400" size={20} /> AI Advisor</h2><button onClick={() => setShowKbModal(true)} className="text-[8px] font-black text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-400/20">Archive</button></div>
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Direct Consult</button>
          <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-2 ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Briefs {messages.filter(m => m.isPinned).length > 0 && <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px]">{messages.filter(m => m.isPinned).length}</span>}</button>
        </div>
      </div>
      {advisorViewMode === 'CHAT' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-hide">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative max-w-[90%] sm:max-w-[85%] p-4 sm:p-5 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'}`}>
                  {msg.role === 'model' && msg.text && <button onClick={() => togglePinMessage(msg.id)} className={`absolute -right-7 sm:-right-8 top-0 p-2 transition-all ${msg.isPinned ? 'text-yellow-400' : 'text-slate-600 sm:opacity-0 sm:group-hover:opacity-100'}`}>{msg.isPinned ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}</button>}
                  {msg.role === 'model' && !msg.text ? (
                     <div className="flex gap-1.5 py-2">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                     </div>
                  ) : (
                    <MarkdownRenderer content={msg.text} />
                  )}
                </div>
              </div>
            ))}
            {isAdvisorThinking && <div className="flex gap-1.5 p-3 bg-slate-800 rounded-xl w-fit animate-pulse border border-slate-700/50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 sm:p-6 border-t border-slate-700/50 flex gap-2 sm:gap-3 bg-slate-900/20">
            <input disabled={isOfflineMode} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Advisor sync..." className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:border-blue-500 text-sm" />
            <button onClick={handleSendMessage} disabled={!inputMessage.trim() || isAdvisorThinking || isOfflineMode} className="bg-blue-600 hover:bg-blue-700 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg active:scale-95 transition-all"><Send size={20} /></button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-6 sm:space-y-8 scrollbar-hide">
          {messages.filter(m => m.isPinned).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4 py-20"><PinOff size={48}/><p className="text-sm font-bold">No pinned executive briefs.</p></div>
          ) : (
            messages.filter(m => m.isPinned).map(msg => (
              <div key={msg.id} className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg p-5 sm:p-8">
                <div className="flex justify-between items-center mb-4 sm:mb-6"><h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2"><Pin size={14} className="text-yellow-400" /> Strategic Brief</h3><ShareButton content={msg.text} title="Executive Brief" /></div>
                <MarkdownRenderer content={msg.text} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // --- Main Render ---

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-8 z-[100]"><AntiRiskLogo className="w-24 h-24 sm:w-32 sm:h-32 mb-8 sm:mb-12 animate-pulse" light={true} /><div className="w-full max-w-xs space-y-4 sm:space-y-6 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 shadow-[0_0_15px_#2563eb] transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[8px] sm:text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase">Syncing Vault...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-16 h-16 sm:w-20 sm:h-20 mb-6 sm:mb-8" /><h2 className="text-xl sm:text-2xl font-bold text-white mb-4 tracking-tight">{appState === 'PIN_SETUP' ? 'Setup Vault PIN' : 'Access Vault'}</h2><div className="flex gap-4 sm:gap-5 mb-6 sm:mb-8">{[...Array(4)].map((_, i) => <div key={i} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500 shadow-[0_0_10px_#3b82f6]') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-3 sm:gap-5 w-full max-w-[280px] sm:max-w-xs mb-8 sm:mb-10">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-bold text-white active:scale-90 transition-all shadow-inner hover:bg-slate-800/60 flex items-center justify-center">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl sm:rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={20} /></button></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-100 overflow-hidden">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <div className="lg:hidden p-4 border-b border-slate-800/40 flex justify-between items-center bg-[#0a0f1a]/95 backdrop-blur-md z-20 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-3" onClick={() => setCurrentView(View.DASHBOARD)}><AntiRiskLogo className="w-8 h-8" /><h1 className="font-bold text-lg sm:text-xl text-white">AntiRisk</h1></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-slate-800/50 rounded-lg"><Menu size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide pb-24 lg:pb-12">
          {apiError && <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-top"><div className="flex items-center gap-3"><ShieldAlert className="text-red-500 shrink-0" size={20} /><p className="text-red-200 font-bold text-xs">{apiError}</p></div><button onClick={() => setApiError(null)} className="text-slate-500 hover:text-white"><X size={18}/></button></div>}
          
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.TRAINING && renderTrainingView()}
          {currentView === View.ADVISOR && renderAdvisor()}
          {currentView === View.BEST_PRACTICES && renderBestPractices()}
          
          {currentView === View.NEWS_BLOG && (
            <div className="flex flex-col max-w-5xl mx-auto w-full space-y-6 sm:space-y-8 animate-in fade-in">
              <div className="bg-[#1b2537] p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <h2 className="text-xl sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-4"><Newspaper className="text-blue-400" size={28} /> News Blog</h2>
                  <p className="text-slate-400 text-sm sm:text-lg font-medium">Daily briefings from NSCDC & NIMASA.</p>
                </div>
                <button onClick={handleLoadNews} disabled={isNewsLoading} className="w-full md:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl">
                  {isNewsLoading ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />} Sync Intel
                </button>
              </div>
              <div className="bg-[#1b2537] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[300px]">
                {newsBlog ? <div className="p-6 sm:p-10"><MarkdownRenderer content={newsBlog.text} /></div> : <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20"><Target size={80} /><p className="text-lg font-bold">Brief inactive. Sync to start.</p></div>}
              </div>
            </div>
          )}
          
          {currentView === View.WEEKLY_TIPS && (
             <div className="max-w-4xl mx-auto space-y-6 h-full flex flex-col">
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/40 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-700/50 shadow-xl gap-6">
                 <div className="text-center sm:text-left"><h2 className="text-xl sm:text-3xl font-black text-white mb-1">Directives</h2><p className="text-slate-400 text-xs sm:text-sm font-medium">Strategic briefings.</p></div>
                 <button onClick={handleGenerateWeeklyTip} disabled={isTipLoading} className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all"><Plus size={18}/> New Directive</button>
               </div>
               <div className="flex-1 overflow-y-auto bg-slate-800/40 rounded-[2rem] sm:rounded-[3rem] border border-slate-700/50 shadow-inner scrollbar-hide flex flex-col">
                 {weeklyTips[0] ? (
                    <div className="flex-1 flex flex-col">
                      <div className="p-4 sm:p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-3"><Lightbulb className="text-yellow-400" /> Strategic Focus</h3>
                        <ShareButton 
                          content={weeklyTips[0].content} 
                          title={weeklyTips[0].topic} 
                          view={View.WEEKLY_TIPS} 
                          id={weeklyTips[0].id} 
                        />
                      </div>
                      <div className="p-6 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <MarkdownRenderer content={weeklyTips[0].content} />
                      </div>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-6 py-24">
                      <Lightbulb size={100} />
                      <p className="text-lg font-bold">No directives in vault.</p>
                    </div>
                 )}
               </div>
             </div>
          )}
          
          {currentView === View.TOOLKIT && (
            <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 bg-[#1b2537] p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 shadow-lg">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Briefcase size={28} className="text-blue-400 sm:size-36" />
                  <div>
                    <h2 className="text-xl sm:text-3xl font-black text-white">Ops Vault</h2>
                    <p className="text-slate-400 text-xs sm:text-sm font-medium">Tactical Risk & Audit.</p>
                  </div>
                </div>
                <div className="flex gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-800 w-full sm:w-auto">
                  <button onClick={() => setToolkitTab('TEMPLATES')} className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${toolkitTab === 'TEMPLATES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Templates</button>
                  <button onClick={() => setToolkitTab('AUDIT')} className={`flex-1 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 ${toolkitTab === 'AUDIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Audit & Risk</button>
                </div>
              </div>

              {toolkitTab === 'TEMPLATES' ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1b2537]/50 p-4 rounded-2xl border border-slate-800/50">
                    <div className="relative flex-1 w-full sm:w-64">
                      <input value={toolkitSearch} onChange={(e) => setToolkitSearch(e.target.value)} placeholder="Filter..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-blue-500" />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    </div>
                    <button onClick={() => setShowSopModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"><Plus size={16} /> New SOP</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-20">
                    {[...STATIC_TEMPLATES, ...customSops].filter(s => s.title.toLowerCase().includes(toolkitSearch.toLowerCase())).map(sop => (
                      <div key={sop.id} className="bg-[#1b2537] rounded-2xl sm:rounded-3xl border border-slate-700/40 p-5 sm:p-6 flex flex-col gap-3 shadow-md group hover:border-blue-500/30 transition-all">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-400"><FileText size={20} /></div>
                        <div><h3 className="text-base sm:text-xl font-bold text-white mb-1 truncate">{sop.title}</h3><p className="text-[10px] sm:text-sm text-slate-400 line-clamp-2">{sop.description}</p></div>
                        <button onClick={() => { navigator.clipboard.writeText(sop.content); alert('Copied.'); }} className="mt-2 w-full bg-slate-800/60 py-2.5 rounded-lg font-bold text-[10px] sm:text-xs text-slate-300 border border-slate-700 hover:bg-slate-800">Copy Text</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-6">
                  <div className="flex overflow-x-auto gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-full md:w-fit mx-auto scrollbar-hide">
                    <button onClick={() => setAnalyzerTab('DAILY')} className={`flex-none px-4 py-2 rounded-lg font-bold transition-all text-[10px] sm:text-xs whitespace-nowrap ${analyzerTab === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Briefs</button>
                    <button onClick={() => setAnalyzerTab('PATROL')} className={`flex-none px-4 py-2 rounded-lg font-bold transition-all text-[10px] sm:text-xs whitespace-nowrap ${analyzerTab === 'PATROL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Patrol Audit</button>
                    <button onClick={() => setAnalyzerTab('INCIDENT')} className={`flex-none px-4 py-2 rounded-lg font-bold transition-all text-[10px] sm:text-xs whitespace-nowrap ${analyzerTab === 'INCIDENT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>5Ws Audit</button>
                  </div>
                  <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0">
                    <div className="bg-[#1b2537] p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 flex flex-col shadow-xl">
                      <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="text-blue-400" size={18} /> Intake</h3>
                        <div className="flex gap-1.5">
                           <button onClick={() => auditFileInputRef.current?.click()} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-slate-700"><Upload size={16} /></button>
                           <input ref={auditFileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleAuditFileUpload} />
                           <button onClick={() => setReportText('')} className="p-2 bg-slate-800 rounded-lg text-red-400 hover:bg-slate-700"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="relative flex-1 min-h-[250px] sm:min-h-[300px]">
                        <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} className="w-full h-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white focus:outline-none resize-none shadow-inner text-xs font-mono scrollbar-hide" placeholder="Paste data here..." />
                      </div>
                      <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="mt-4 sm:mt-6 bg-blue-600 hover:bg-blue-700 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all text-sm sm:text-lg flex items-center justify-center gap-2">
                        {isAnalyzing ? <><RefreshCw className="animate-spin" size={18}/> Auditing...</> : <><Fingerprint size={18}/> Risk Analysis</>}
                      </button>
                    </div>

                    <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl min-h-[300px]">
                      <div className="p-4 sm:p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2"><Sparkles className="text-emerald-400" size={16} /> Advice</h3>
                        {analysisResult && <ShareButton content={analysisResult} title="Security Brief" />}
                      </div>
                      <div className="flex-1 p-5 sm:p-8 overflow-y-auto scrollbar-hide">
                        {analysisResult ? <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><MarkdownRenderer content={analysisResult} /></div> : <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-4 py-12"><ShieldCheck size={64} /><p className="text-xs sm:text-sm font-bold italic max-w-[200px] mx-auto">Upload reports to get prescriptive CEO advice.</p></div>}
                      </div>
                    </div>
                  </div>
                  
                  {storedReports.length > 0 && (
                    <div className="bg-[#1b2537] p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 mt-4 sm:mt-6 animate-in fade-in">
                       <h4 className="text-[8px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-4 sm:mb-6">Frequency Trend</h4>
                       <IncidentChart reports={storedReports} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Modals --- */}
        {showKbModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-3xl border border-slate-700/50 p-6 sm:p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"><div className="flex justify-between items-center mb-6 sm:mb-10"><h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3"><Database size={24} className="text-blue-400" /> Archive</h2><button onClick={() => setShowKbModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button></div><div className="space-y-4 sm:space-y-6"><input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Directive Title..." className="w-full bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl outline-none text-white focus:border-blue-500 text-base sm:text-lg font-bold" /><textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} placeholder="Content..." className="w-full bg-slate-900/50 border border-slate-700/50 p-4 sm:p-6 rounded-xl h-48 sm:h-64 outline-none resize-none text-white focus:border-blue-500 text-sm sm:text-lg" /><button onClick={handleAddKbDocument} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl active:scale-95 transition-all text-white">Ingest to Vault</button></div></div></div>}
        {showSopModal && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-3xl border border-slate-700/50 p-6 sm:p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-6 sm:mb-8"><h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3"><Briefcase size={24} className="text-blue-400" /> SOP Ingest</h2><button onClick={() => setShowSopModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={24}/></button></div><div className="space-y-4 sm:space-y-6"><button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/40 hover:border-blue-500/50 text-slate-400"><FileUp size={32} /><span className="text-[10px] font-bold uppercase tracking-widest">Select Schema</span><input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} /></button><div className="space-y-4"><input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} placeholder="Title..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 text-sm font-bold" /><textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} placeholder="Full content..." className="w-full bg-slate-900/50 border border-slate-700 p-4 rounded-xl h-40 outline-none resize-none text-white focus:border-blue-500 text-sm" /></div><button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="w-full bg-blue-600 py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl shadow-xl text-white">Secure to Vault</button></div></div></div>}
        {showSettings && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-3xl border border-slate-700/50 p-6 sm:p-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[95vh]"><div className="flex justify-between items-center mb-6 sm:mb-8"><h2 className="text-xl font-black text-white flex items-center gap-3"><User size={24} className="text-blue-400" /> CEO Profile</h2><button onClick={() => setShowSettings(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button></div><div className="space-y-4 sm:space-y-6"><div className="space-y-1"><label className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label><input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 font-bold text-sm" /></div><div className="space-y-1"><label className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label><input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} placeholder="+234..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 font-bold text-sm" /></div><div className="space-y-1"><label className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label><input value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 font-bold text-sm" /></div><button onClick={() => { setShowSettings(false); alert('Updated.'); }} className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 rounded-xl font-bold text-base shadow-xl text-white mt-4">Sync Profile</button></div></div></div>}
        {showNewTipAlert && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in"><div className="bg-[#1b2537] rounded-[2rem] sm:rounded-[3.5rem] border border-yellow-500/30 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"><div className="p-5 sm:p-8 border-b border-slate-800/60 bg-slate-900/40 flex justify-between items-center rounded-t-[2rem] sm:rounded-t-[3.5rem]"><div className="flex items-center gap-3 sm:gap-4"><div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center shadow-lg"><Bell className="text-yellow-400 animate-pulse w-5 h-5 sm:w-6 sm:h-6" /></div><div><h2 className="text-sm sm:text-2xl font-black text-white tracking-tight">Direct Brief</h2><p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Engaged</p></div></div><button onClick={() => setShowNewTipAlert(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button></div><div className="flex-1 overflow-y-auto p-5 sm:p-10 scrollbar-hide bg-slate-900/10"><MarkdownRenderer content={showNewTipAlert.content} /></div><div className="p-5 sm:p-8 border-t border-slate-800/60 bg-slate-900/40 flex flex-col sm:flex-row gap-2 sm:gap-3 rounded-b-[2rem] sm:rounded-b-[3.5rem]"><button onClick={() => { setShowNewTipAlert(null); setCurrentView(View.WEEKLY_TIPS); }} className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-lg sm:rounded-xl font-bold text-slate-200 transition-all border border-slate-700 text-xs sm:text-base">Archive</button><div className="w-full sm:flex-1"><ShareButton content={showNewTipAlert.content} title={showNewTipAlert.topic} view={View.WEEKLY_TIPS} id={showNewTipAlert.id} triggerClassName="w-full flex items-center justify-center gap-2 sm:gap-3 bg-[#2563eb] hover:bg-blue-600 text-white py-3 rounded-lg sm:rounded-xl transition-all font-bold text-xs sm:text-lg shadow-lg" /></div></div></div></div>}
      </main>
    </div>
  );
}

export default App;
