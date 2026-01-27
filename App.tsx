
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, Send, Plus, Search, RefreshCw, Download, FileText, ChevronRight, ShieldAlert, BookOpen, Globe, Briefcase, Calendar, ChevronLeft, Save, Trash2, Check, Lightbulb, Printer, Settings as SettingsIcon, MessageCircle, Mail, X, Bell, Database, Upload, Pin, PinOff, BarChart2, Sparkles, Copy, Lock, ShieldCheck, Fingerprint, Eye, Paperclip, XCircle, Bookmark, BookmarkCheck, LayoutGrid, ListFilter, Wand2, Map, ExternalLink, ImageIcon, Target, User, Phone, FileUp, Key, AlertTriangle, EyeIcon, CloudDownload, WifiOff, Newspaper, Zap, Activity, Edit, History } from 'lucide-react';
import Navigation from './components/Navigation.tsx';
import MarkdownRenderer from './components/MarkdownRenderer.tsx';
import ShareButton from './components/ShareButton.tsx';
import IncidentChart from './components/IncidentChart.tsx';
import { View, ChatMessage, Template, SecurityRole, StoredReport, WeeklyTip, UserProfile, KnowledgeDocument, SavedTrend, StoredTrainingModule, NewsItem } from './types.ts';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants.ts';
import { generateTrainingModuleStream, analyzeReport, fetchBestPracticesStream, generateWeeklyTip, fetchTopicSuggestions, fetchSecurityNews, analyzePatrolPatterns, generateAdvisorStream } from './services/geminiService.ts';

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
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [activeTrainingId, setActiveTrainingId] = useState<string | null>(null);
  const [trainingSidebarTab, setTrainingSidebarTab] = useState<'CATEGORIES' | 'DRAFTS'>('CATEGORIES');
  
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
      setApiError("Intelligence Core under maximum load. Stabilization link active. If search fails, AI will fallback to internal core knowledge shortly.");
    } else {
      setApiError(`Communication Breach: ${error?.message || "Internal network instability."}`);
    }
    setTimeout(() => setApiError(null), 10000);
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

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setApiError(null); 
    setIsTrainingLoading(true); 
    setTrainingContent('');
    setTrainingSources(undefined);
    setShowTrainingSuggestions(false);
    setActiveTrainingId(null);
    setIsEditingTraining(false);
    
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

  const handleSaveTrainingDraft = () => {
    if (!trainingContent) return;
    
    if (activeTrainingId) {
      setSavedTraining(prev => prev.map(t => t.id === activeTrainingId ? { ...t, content: trainingContent, timestamp: Date.now() } : t));
    } else {
      const newModule: StoredTrainingModule = {
        id: Date.now().toString(),
        topic: trainingTopic || "Untitled Module",
        targetAudience: trainingRole,
        content: trainingContent,
        generatedDate: new Date().toLocaleDateString(),
        timestamp: Date.now()
      };
      setSavedTraining(prev => [newModule, ...prev]);
      setActiveTrainingId(newModule.id);
    }
    setIsEditingTraining(false);
  };

  const handleSelectSavedTraining = (module: StoredTrainingModule) => {
    setTrainingTopic(module.topic);
    setTrainingRole(module.targetAudience as SecurityRole);
    setTrainingContent(module.content);
    setActiveTrainingId(module.id);
    setIsEditingTraining(false);
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
        <div className="relative overflow-hidden bg-gradient-to-br from-[#122b6a] via-[#1a3a8a] to-[#0a1222] border border-blue-500/20 rounded-[1.5rem] sm:rounded-[3rem] p-5 sm:p-16 text-white shadow-2xl group">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/10 blur-[80px] sm:blur-[120px] -mr-32 -mt-32 rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10">
            <div className="space-y-3 sm:space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-300 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                <Activity size={10} className="animate-pulse" /> Operational Command Active
              </div>
              <h2 className="text-2xl sm:text-6xl font-black tracking-tighter leading-tight">Executive Control <br className="hidden xs:block"/><span className="text-blue-400">Hub</span></h2>
              <p className="text-blue-100/70 text-xs sm:text-xl font-medium leading-relaxed">Secure access to 10M training vibrations and tactical intelligence.</p>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 w-full md:w-auto">
              <button onClick={() => setCurrentView(View.ADVISOR)} className="w-full md:px-10 py-4 sm:py-5 bg-white text-blue-900 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                <Sparkles size={18} /> Strategic Consult
              </button>
              <div className="flex gap-2 sm:gap-3">
                <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                  <p className="text-[7px] sm:text-[10px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Audit</p>
                  <p className="text-xs sm:text-lg font-bold">LOCKED</p>
                </div>
                <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                  <p className="text-[7px] sm:text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Threat</p>
                  <p className="text-xs sm:text-lg font-bold">STABLE</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Menu</h3>
            <span className="h-px flex-1 mx-3 sm:mx-6 bg-slate-800/60"></span>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
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
                className="group relative bg-[#1b2537] p-3.5 sm:p-8 rounded-[1.2rem] sm:rounded-[2.5rem] border border-slate-700/40 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 text-left flex flex-col h-full shadow-lg active:scale-[0.98]"
              >
                <div className={`w-9 h-9 sm:w-14 sm:h-14 ${item.bg} ${item.color} rounded-lg sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-6 group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon size={18} className="sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-xs sm:text-xl font-black text-white mb-0.5 sm:mb-1 tracking-tight group-hover:text-blue-400 transition-colors truncate">{item.label}</h3>
                <p className="text-slate-400 text-[9px] sm:text-sm font-medium leading-relaxed flex-1 line-clamp-2">{item.desc}</p>
                <div className="hidden sm:flex mt-6 items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Access Vault <ChevronRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Global Verified</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></span>
              <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Bank Sync</span>
            </div>
          </div>
          <p className="text-[7px] sm:text-[10px] font-bold text-slate-600">AntiRisk v1.0.4.5</p>
        </div>
      </div>
    );
  };

  const renderAdvisor = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-[#1b2537]/50 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-xl">
      <div className="p-3.5 sm:p-6 border-b border-slate-700/50 bg-[#0a1222]/40 flex flex-col gap-3 sm:gap-6">
        <div className="flex justify-between items-center"><h2 className="text-xs sm:text-base font-bold text-white flex items-center gap-2.5 sm:gap-3"><ShieldAlert className="text-blue-400" size={18} /> AI Advisor</h2><button onClick={() => setShowKbModal(true)} className="text-[7px] sm:text-[8px] font-black text-blue-400 bg-blue-400/10 px-2.5 py-1.5 rounded-lg uppercase tracking-widest border border-blue-400/20">Archive</button></div>
        <div className="flex gap-1.5 p-1 bg-slate-900/60 rounded-xl border border-slate-800 w-fit">
          <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-4 sm:px-6 py-1.5 rounded-lg font-bold text-[9px] sm:text-xs transition-all ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Direct Consult</button>
          <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-4 sm:px-6 py-1.5 rounded-lg font-bold text-[9px] sm:text-xs flex items-center gap-1.5 sm:gap-2 transition-all ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Briefs {messages.filter(m => m.isPinned).length > 0 && <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px]">{messages.filter(m => m.isPinned).length}</span>}</button>
        </div>
      </div>
      {advisorViewMode === 'CHAT' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-hide">
            {messages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative max-w-[92%] sm:max-w-[85%] p-3.5 sm:p-5 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'}`}>
                  {msg.role === 'model' && msg.text && <button onClick={() => togglePinMessage(msg.id)} className={`absolute -right-6 sm:-right-8 top-0 p-1.5 transition-all ${msg.isPinned ? 'text-yellow-400' : 'text-slate-600 sm:opacity-0 sm:group-hover:opacity-100'}`}>{msg.isPinned ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}</button>}
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
          <div className="p-3 sm:p-6 border-t border-slate-700/50 flex gap-2 sm:gap-3 bg-[#0a1222]/40 backdrop-blur-md">
            <input 
              disabled={isOfflineMode} 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
              placeholder="Advisor sync..." 
              className="flex-1 bg-slate-900/50 border border-slate-700 rounded-[0.8rem] sm:rounded-2xl px-4 sm:px-6 py-2.5 sm:py-4 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isAdvisorThinking || isOfflineMode} 
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:p-4 rounded-[0.8rem] sm:rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              <Send size={18} className="sm:size-20" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-6 sm:space-y-8 scrollbar-hide">
          {messages.filter(m => m.isPinned).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4 py-20"><PinOff size={48}/><p className="text-xs sm:text-sm font-bold">No pinned executive briefs.</p></div>
          ) : (
            messages.filter(m => m.isPinned).map(msg => (
              <div key={msg.id} className="bg-[#1b2537] rounded-[1.2rem] sm:rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-lg p-4 sm:p-8">
                <div className="flex justify-between items-center mb-3 sm:mb-6"><h3 className="text-[10px] sm:text-sm font-bold text-white flex items-center gap-2"><Pin size={14} className="text-yellow-400" /> Strategic Brief</h3><ShareButton content={msg.text} title="Executive Brief" /></div>
                <MarkdownRenderer content={msg.text} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderTrainingView = () => (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 h-full max-w-7xl mx-auto">
      <div className="lg:col-span-4 flex flex-col gap-5">
        <div className="bg-[#1b2537] p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 shadow-lg relative">
          <div className="absolute -top-2.5 -right-2 bg-blue-600 text-[8px] sm:text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg z-10 border border-blue-400/30 animate-pulse uppercase tracking-widest">10M+ Bank</div>
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-3"><BookOpen size={20} className="text-emerald-400 sm:size-24" /> Training Builder</h2>
          <div className="space-y-3.5 sm:space-y-4">
            <div className="space-y-1 relative" ref={suggestionsRef}>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Topic Intelligence</label>
              <div className="relative">
                <input 
                  value={trainingTopic} 
                  onChange={(e) => {
                    setTrainingTopic(e.target.value);
                    setShowTrainingSuggestions(true);
                  }} 
                  onFocus={() => setShowTrainingSuggestions(true)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-white outline-none focus:border-blue-500 transition-all text-xs sm:text-base pr-9" 
                  placeholder="Query Core Database..." 
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {isFetchingSuggestions ? (
                    <RefreshCw size={14} className="text-blue-500 animate-spin" />
                  ) : (
                    <Zap size={14} className={`${trainingTopic.length > 2 ? 'text-blue-400' : 'text-slate-600'}`} />
                  )}
                </div>
              </div>
              
              {showTrainingSuggestions && (localSuggestions.length > 0 || aiSuggestions.length > 0) && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0a1222]/95 backdrop-blur-xl border border-slate-700 rounded-xl sm:rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-blue-500/20">
                  {localSuggestions.length > 0 && (
                    <div className="py-1.5">
                      <div className="px-3.5 py-1 text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Database size={9} /> Local Hits
                      </div>
                      {localSuggestions.map((suggestion, idx) => (
                        <button key={`local-${idx}`} onClick={() => { setTrainingTopic(suggestion); setShowTrainingSuggestions(false); }} className="w-full text-left px-3.5 py-2 text-[10px] sm:text-sm font-bold text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-2.5">
                          <Check size={12} className="shrink-0 text-emerald-500 opacity-60" />
                          <span className="truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {aiSuggestions.length > 0 && (
                    <div className="py-1.5 border-t border-slate-800">
                      <div className="px-3.5 py-1 text-[7px] sm:text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={9} /> AI Variants
                      </div>
                      {aiSuggestions.map((suggestion, idx) => (
                        <button key={`ai-${idx}`} onClick={() => { setTrainingTopic(suggestion); setShowTrainingSuggestions(false); }} className="w-full text-left px-3.5 py-2 text-[10px] sm:text-sm font-bold text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 transition-colors flex items-center gap-2.5">
                          <Wand2 size={12} className="shrink-0 text-blue-400 opacity-60" />
                          <span className="truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
                <select value={trainingRole} onChange={(e) => setTrainingRole(e.target.value as SecurityRole)} className="w-full bg-slate-900/40 border border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
                  <option value={SecurityRole.GUARD}>Guard</option>
                  <option value={SecurityRole.SUPERVISOR}>Supervisor</option>
                  <option value={SecurityRole.GEN_SUPERVISOR}>Director</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Week</label>
                <select value={trainingWeek} onChange={(e) => setTrainingWeek(parseInt(e.target.value))} className="w-full bg-slate-900/40 border border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 text-[10px] sm:text-xs font-bold text-slate-300 focus:border-blue-500 outline-none">
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
              className={`w-full py-3.5 sm:py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2.5 transition-all ${trainingTopic ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed text-xs'}`}
            >
              {isTrainingLoading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Generate Brief
            </button>
          </div>
        </div>
        <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2rem] border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-inner hidden lg:flex">
          <div className="flex bg-slate-900/60 border-b border-slate-700/50">
            <button 
              onClick={() => setTrainingSidebarTab('CATEGORIES')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${trainingSidebarTab === 'CATEGORIES' ? 'text-blue-400 bg-blue-400/5 shadow-[inset_0_-2px_0_#3b82f6]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Categories
            </button>
            <button 
              onClick={() => setTrainingSidebarTab('DRAFTS')}
              className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${trainingSidebarTab === 'DRAFTS' ? 'text-blue-400 bg-blue-400/5 shadow-[inset_0_-2px_0_#3b82f6]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Drafts {savedTraining.length > 0 && <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full text-[8px] font-black">{savedTraining.length}</span>}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-hide">
            {trainingSidebarTab === 'CATEGORIES' ? (
              <div className="space-y-1.5">
                {Object.keys(SECURITY_TRAINING_DB).map(cat => (
                  <button key={cat} onClick={() => { setTrainingTopic(cat); setShowTrainingSuggestions(false); }} className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all border ${trainingTopic === cat ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg' : 'bg-slate-800/20 text-slate-300 hover:bg-slate-800 border-slate-700/30'}`}>{cat}</button>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedTraining.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center gap-3 opacity-20">
                    <History size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Vault History Empty</p>
                  </div>
                ) : (
                  savedTraining.map(item => (
                    <div key={item.id} className="group relative">
                      <button 
                        onClick={() => handleSelectSavedTraining(item)}
                        className={`w-full text-left p-3.5 rounded-2xl text-[11px] font-bold transition-all border ${activeTrainingId === item.id ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg' : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800 border-slate-700/30'}`}
                      >
                        <div className="truncate mb-1.5 text-slate-200">{item.topic}</div>
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter opacity-60">
                          <span className="flex items-center gap-1"><Calendar size={10} /> {item.generatedDate}</span>
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{item.targetAudience.split(' ')[0]}</span>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSavedTraining(prev => prev.filter(t => t.id !== item.id)); if(activeTrainingId === item.id) setActiveTrainingId(null); }}
                        className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                        title="Delete Draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="lg:col-span-8 flex flex-col gap-5 min-h-[280px]">
        <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden flex flex-col flex-1 shadow-2xl">
          <div className="p-4 sm:p-5 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center">
            <h3 className="text-xs sm:text-base font-bold text-white flex items-center gap-2.5">
              <ShieldCheck className="text-blue-400" size={18} /> 
              {activeTrainingId ? 'Operational Brief (Modified)' : 'Operational Brief'}
            </h3>
            <div className="flex items-center gap-2 sm:gap-3">
              {trainingContent && (
                <>
                  <button 
                    onClick={() => setIsEditingTraining(!isEditingTraining)}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isEditingTraining ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    title={isEditingTraining ? "View Result" : "Edit Module"}
                  >
                    <Edit size={16} />
                    <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">{isEditingTraining ? 'Preview' : 'Edit'}</span>
                  </button>
                  <button 
                    onClick={handleSaveTrainingDraft}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95 border border-emerald-500/30"
                    title="Save to Drafts"
                  >
                    <Save size={14} /> 
                    <span className="hidden sm:inline uppercase tracking-wider">{activeTrainingId ? 'Update' : 'Save Draft'}</span>
                  </button>
                  <div className="w-px h-6 bg-slate-700/50 mx-1 hidden sm:block"></div>
                  <ShareButton content={trainingContent} title={`${trainingTopic} - Week ${trainingWeek}`} />
                </>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-900/10 scrollbar-hide">
            {isEditingTraining ? (
              <textarea 
                value={trainingContent}
                onChange={(e) => setTrainingContent(e.target.value)}
                className="w-full h-full min-h-[500px] bg-[#0a1222]/50 border border-slate-700/50 rounded-2xl p-6 text-slate-300 font-mono text-xs sm:text-sm focus:border-blue-500 outline-none resize-none shadow-inner"
                placeholder="Edit module content..."
              />
            ) : (
              trainingContent ? (
                <MarkdownRenderer content={trainingContent} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-center gap-3 py-10 sm:py-12">
                  <Target size={50} className="sm:size-60" />
                  <p className="text-xs sm:text-lg px-6">Audit the 10M+ Database to generate briefings.</p>
                </div>
              )
            )}
            {isTrainingLoading && !trainingContent && (
               <div className="flex flex-col items-center justify-center h-full py-10 sm:py-12 gap-3.5 animate-pulse">
                 <RefreshCw className="text-blue-500 animate-spin" size={28} sm:size={32} />
                 <p className="text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Engaging Vault Core...</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBestPractices = () => (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-5 sm:space-y-8 animate-in fade-in">
      <div className="bg-[#1b2537] p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-5 sm:gap-6">
        <div className="flex-1 space-y-1.5 sm:space-y-2 text-center md:text-left">
          <h2 className="text-lg sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3.5"><Globe className="text-cyan-400" size={24} sm:size={28} /> Global Trends</h2>
          <p className="text-slate-400 text-xs sm:text-lg font-medium">Strategic intelligence on ISO 18788, ASIS, and industrial security shifts.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <input 
            value={bpTopic} 
            onChange={(e) => setBpTopic(e.target.value)} 
            placeholder="Trend topic..." 
            className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all text-xs sm:text-sm"
          />
          <button 
            onClick={handleFetchBP} 
            disabled={isBpLoading} 
            className="w-full md:w-auto flex items-center justify-center gap-2.5 bg-cyan-600 hover:bg-cyan-700 px-6 py-3.5 sm:px-8 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all"
          >
            {isBpLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />} Sync Global Data
          </button>
        </div>
      </div>

      <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[300px] flex-1">
        {bpContent && bpContent.text ? (
          <div className="p-5 sm:p-10">
            <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-slate-800 pb-4 sm:pb-6">
               <h3 className="text-xs sm:text-xl font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={20} /> Tactical Intelligence</h3>
               <ShareButton content={bpContent.text} title="Global Security Trends" />
            </div>
            <MarkdownRenderer content={bpContent.text} />
            {bpContent.sources && bpContent.sources.length > 0 && (
              <div className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-slate-800">
                <h4 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-4 sm:mb-6 flex items-center gap-2"><Database size={14} /> Verified Intel Sources</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bpContent.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 bg-slate-900/50 hover:bg-slate-800 px-4 py-3 rounded-xl border border-slate-800 text-[10px] sm:text-xs font-bold text-blue-400 transition-all group">
                      <span className="truncate flex-1">{s.title || 'Intelligence Document'}</span>
                      <ExternalLink size={14} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-24 opacity-20 gap-4 sm:gap-6 text-center px-10">
            {isBpLoading ? (
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="animate-spin text-cyan-500" size={50} />
                <p className="text-xs sm:text-lg font-bold animate-pulse">Scanning Global Intelligence Vault...</p>
              </div>
            ) : (
              <>
                <Globe size={60} sm:size={100} />
                <p className="text-xs sm:text-lg font-bold max-w-md">Global Intelligence Vault is on standby. Search for specific trends or sync for a broad industry scan.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderToolkit = () => {
    const allTemplates = [...STATIC_TEMPLATES, ...customSops];
    const filteredTemplates = allTemplates.filter(t => 
      t.title.toLowerCase().includes(toolkitSearch.toLowerCase()) || 
      t.description.toLowerCase().includes(toolkitSearch.toLowerCase())
    );

    return (
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in pb-20">
        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-800/40 p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[3rem] border border-slate-700/50 gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-4xl font-black text-white mb-2 tracking-tight">Ops Vault & Intelligence</h2>
            <p className="text-slate-400 text-xs sm:text-lg">Tactical protocols and AI-driven audit logs.</p>
          </div>
          <div className="flex p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button onClick={() => setToolkitTab('TEMPLATES')} className={`flex-1 sm:px-8 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${toolkitTab === 'TEMPLATES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Templates</button>
            <button onClick={() => setToolkitTab('AUDIT')} className={`flex-1 sm:px-8 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${toolkitTab === 'AUDIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Audit & Risk</button>
          </div>
        </div>

        {toolkitTab === 'TEMPLATES' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input value={toolkitSearch} onChange={(e) => setToolkitSearch(e.target.value)} placeholder="Search protocol bank..." className="w-full bg-slate-800/40 border border-slate-700 rounded-xl py-3.5 pl-12 pr-6 text-white outline-none focus:border-blue-500 transition-all text-xs sm:text-sm" />
              </div>
              <button onClick={() => setShowSopModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-xs sm:text-sm"><Plus size={18} /> Add Custom SOP</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(t => (
                <div key={t.id} className="bg-[#1b2537] p-6 sm:p-8 rounded-[1.5rem] border border-slate-700/40 flex flex-col hover:border-blue-500/50 transition-all group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-4 sm:mb-6"><Briefcase size={20} /></div>
                  <h3 className="text-sm sm:text-lg font-black text-white mb-2 group-hover:text-blue-400 transition-colors">{t.title}</h3>
                  <p className="text-slate-400 text-[10px] sm:text-sm mb-6 flex-1 leading-relaxed line-clamp-2">{t.description}</p>
                  <div className="flex gap-2">
                    <ShareButton content={t.content} title={t.title} triggerClassName="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all" />
                    <button onClick={() => { navigator.clipboard.writeText(t.content); }} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"><Copy size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 sm:p-6 bg-slate-900/60 border-b border-slate-700/50 flex justify-between items-center">
                  <div className="flex gap-1">
                    {['DAILY', 'PATROL', 'INCIDENT'].map(tab => (
                      <button key={tab} onClick={() => setAnalyzerTab(tab as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${analyzerTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tab}</button>
                    ))}
                  </div>
                  <button onClick={() => auditFileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white transition-all"><FileUp size={18} /></button>
                  <input type="file" ref={auditFileInputRef} className="hidden" accept=".txt,.pdf" onChange={handleAuditFileUpload} />
                </div>
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Report Narrative</label>
                    <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Paste daily log or incident details..." className="w-full h-48 sm:h-64 bg-slate-900/40 border border-slate-700 rounded-2xl p-4 sm:p-6 text-slate-300 outline-none focus:border-blue-500 transition-all text-xs sm:text-sm resize-none" />
                  </div>
                  <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                    {isAnalyzing ? <RefreshCw size={20} className="animate-spin" /> : <ShieldCheck size={20} />} Run AI Audit
                  </button>
                </div>
                {analysisResult && (
                  <div className="p-6 sm:p-10 border-t border-slate-700/50 bg-slate-900/20 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex justify-between items-center mb-6"><h4 className="text-xs sm:text-lg font-bold text-white flex items-center gap-2.5"><Activity className="text-red-500" size={18} /> Vulnerability Intelligence</h4><ShareButton content={analysisResult} title="AI Audit Brief" /></div>
                    <MarkdownRenderer content={analysisResult} />
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#1b2537] p-6 sm:p-8 rounded-[1.5rem] border border-slate-700/50 shadow-xl">
                <h4 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><BarChart2 size={14} /> Intelligence Overview</h4>
                <IncidentChart reports={storedReports} />
                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-xl border border-slate-800/60"><span className="text-[10px] font-bold text-slate-400">Total Scans</span><span className="text-xs font-black text-white">{storedReports.length}</span></div>
                  <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-xl border border-slate-800/60"><span className="text-[10px] font-bold text-slate-400">Anomalies Detected</span><span className="text-xs font-black text-red-400">LOCKED</span></div>
                </div>
              </div>
              <div className="bg-[#1b2537] rounded-[1.5rem] border border-slate-700/50 shadow-xl flex flex-col overflow-hidden flex-1">
                <div className="p-4 bg-slate-900/60 border-b border-slate-700/50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><History size={14} /> History Bank</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide max-h-[400px]">
                  {storedReports.length === 0 ? (
                    <div className="py-10 text-center opacity-20 italic text-[10px]">No archives found.</div>
                  ) : (
                    storedReports.map(report => (
                      <button key={report.id} onClick={() => { setReportText(report.content); setAnalysisResult(report.analysis); }} className="w-full text-left p-4 rounded-xl border border-slate-800 hover:border-blue-500/50 bg-slate-900/20 transition-all group">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between"><span>{report.dateStr}</span> <Eye size={10} className="opacity-0 group-hover:opacity-100" /></div>
                        <div className="text-[10px] font-bold text-slate-300 truncate">{report.content}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOP Modal */}
        {showSopModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a1222] w-full max-w-2xl rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                <h3 className="font-bold text-white text-lg flex items-center gap-3"><Plus className="text-blue-500" /> Custom Intelligence Protocol</h3>
                <button onClick={() => setShowSopModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 sm:p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                  <input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-xs sm:text-sm" placeholder="e.g. Server Room Access SOP" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Brief Description</label>
                  <input value={newSopDesc} onChange={(e) => setNewSopDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-xs sm:text-sm" placeholder="Purpose of this protocol..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Protocol Content</label>
                  <textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-blue-500 outline-none text-xs sm:text-sm resize-none" placeholder="Step-by-step instructions..." />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"><Upload size={16} /> Import Text</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileUpload} />
                  <button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"><Check size={18} /> Register Protocol</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Main Render ---

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-20 h-20 sm:w-32 sm:h-32 mb-8 sm:mb-12 animate-pulse" light={true} /><div className="w-full max-w-[240px] sm:max-w-xs space-y-4 sm:space-y-6 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 shadow-[0_0_15px_#2563eb] transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[7px] sm:text-[10px] font-black text-blue-400 tracking-[0.4em] uppercase">Syncing Vault...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-5 z-[100]"><AntiRiskLogo className="w-14 h-14 sm:w-20 sm:h-20 mb-6 sm:mb-8" /><h2 className="text-lg sm:text-2xl font-bold text-white mb-4 tracking-tight">{appState === 'PIN_SETUP' ? 'Setup Vault PIN' : 'Access Vault'}</h2><div className="flex gap-3.5 sm:gap-5 mb-6 sm:mb-8">{[...Array(4)].map((_, i) => <div key={i} className={`w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500 shadow-[0_0_10px_#3b82f6]') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-2.5 sm:gap-5 w-full max-w-[250px] sm:max-w-xs mb-8 sm:mb-10">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-2xl text-lg sm:text-2xl font-bold text-white active:scale-90 transition-all shadow-inner hover:bg-slate-800/60 flex items-center justify-center">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={18} className="sm:size-20" /></button></div></div>;

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-100 overflow-hidden">
      <Navigation currentView={currentView} setView={setCurrentView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <div className="lg:hidden p-3.5 border-b border-slate-800/40 flex justify-between items-center bg-[#0a0f1a]/95 backdrop-blur-md z-20 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-3" onClick={() => setCurrentView(View.DASHBOARD)}><AntiRiskLogo className="w-7 h-7 sm:w-8 sm:h-8" /><h1 className="font-bold text-base sm:text-xl text-white">AntiRisk</h1></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white bg-slate-800/50 rounded-lg active:scale-95 transition-transform"><Menu size={20} className="sm:size-24" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide pb-28 lg:pb-12">
          {apiError && <div className="max-w-4xl mx-auto mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300"><div className="flex items-center gap-2.5"><ShieldAlert className="text-red-500 shrink-0" size={18} /><p className="text-red-200 font-bold text-[10px] sm:text-xs">{apiError}</p></div><button onClick={() => setApiError(null)} className="text-slate-500 hover:text-white transition-colors"><X size={16}/></button></div>}
          
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.TRAINING && renderTrainingView()}
          {currentView === View.ADVISOR && renderAdvisor()}
          {currentView === View.BEST_PRACTICES && renderBestPractices()}
          {currentView === View.TOOLKIT && renderToolkit()}
          
          {currentView === View.NEWS_BLOG && (
            <div className="flex flex-col max-w-5xl mx-auto w-full space-y-5 sm:space-y-8 animate-in fade-in">
              <div className="bg-[#1b2537] p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 shadow-lg flex flex-col md:flex-row justify-between items-center gap-5 sm:gap-6">
                <div className="flex-1 space-y-1.5 sm:space-y-2 text-center md:text-left">
                  <h2 className="text-lg sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3.5"><Newspaper className="text-blue-400" size={24} sm:size={28} /> News Blog</h2>
                  <p className="text-slate-400 text-xs sm:text-lg font-medium">Daily briefings from NSCDC & NIMASA.</p>
                </div>
                <button onClick={handleLoadNews} disabled={isNewsLoading} className="w-full md:w-auto flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 px-5 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all">
                  {isNewsLoading ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />} Sync Intel
                </button>
              </div>
              <div className="bg-[#1b2537] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-700/50 overflow-hidden shadow-xl min-h-[250px] sm:min-h-[300px]">
                {newsBlog ? <div className="p-5 sm:p-10"><MarkdownRenderer content={newsBlog.text} /></div> : <div className="flex-1 flex flex-col items-center justify-center py-16 sm:py-20 opacity-20 gap-3"><Target size={60} sm:size={80} /><p className="text-xs sm:text-lg font-bold">Brief inactive. Sync to start.</p></div>}
              </div>
            </div>
          )}
          
          {currentView === View.WEEKLY_TIPS && (
             <div className="max-w-4xl mx-auto space-y-5 h-full flex flex-col">
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/40 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[3rem] border border-slate-700/50 shadow-xl gap-5">
                 <div className="text-center sm:text-left"><h2 className="text-lg sm:text-3xl font-black text-white mb-0.5 sm:mb-1">Directives</h2><p className="text-slate-400 text-[10px] sm:text-sm font-medium">Strategic briefings.</p></div>
                 <button onClick={handleGenerateWeeklyTip} disabled={isTipLoading} className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 px-5 py-3 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2.5 transition-all active:scale-95"><Plus size={18}/> New Directive</button>
               </div>
               <div className="flex-1 overflow-y-auto bg-slate-800/40 rounded-[1.5rem] sm:rounded-[3rem] border border-slate-700/50 shadow-inner scrollbar-hide flex flex-col min-h-[300px]">
                 {weeklyTips[0] ? (
                    <div className="flex-1 flex flex-col">
                      <div className="p-3.5 sm:p-6 bg-slate-900/40 border-b border-slate-700/50 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="text-xs sm:text-base font-bold text-white flex items-center gap-2.5"><Lightbulb className="text-yellow-400" size={18} /> Strategic Focus</h3>
                        <ShareButton 
                          content={weeklyTips[0].content} 
                          title={weeklyTips[0].topic} 
                          view={View.WEEKLY_TIPS} 
                          id={weeklyTips[0].id} 
                        />
                      </div>
                      <div className="p-5 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <MarkdownRenderer content={weeklyTips[0].content} />
                      </div>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20 text-center gap-4 sm:gap-6 py-20 sm:py-24">
                      <Lightbulb size={80} sm:size={100} />
                      <p className="text-sm sm:text-lg font-bold">No directives in vault.</p>
                    </div>
                 )}
               </div>
             </div>
          )}
        </div>
      </main>
      
      {/* CEO Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0a1222] w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
                <h3 className="font-black text-white text-xl flex items-center gap-3"><User className="text-blue-500" /> Executive Profile</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
             </div>
             <div className="p-8 sm:p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</label>
                  <input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-sm" placeholder="+234..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Communication Channel</label>
                  <div className="flex gap-2">
                    {['WhatsApp', 'Email'].map(channel => (
                      <button key={channel} onClick={() => setUserProfile({...userProfile, preferredChannel: channel as any})} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${userProfile.preferredChannel === channel ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>{channel}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg transition-all active:scale-95">Update Identity</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
