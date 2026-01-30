
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, Send, Plus, Search, RefreshCw, ShieldAlert, BookOpen, Globe, 
  Briefcase, Save, Trash2, ShieldCheck, Bookmark, Sparkles, Copy, 
  X, Newspaper, Zap, Activity, Edit, History, Lightbulb, Target,
  Calendar, Bell, ChevronRight, AlertTriangle, ArrowLeft, Clock,
  ExternalLink, TrendingUp, Info, Pin, PinOff
} from 'lucide-react';
import Navigation from './components/Navigation';
import MarkdownRenderer from './components/MarkdownRenderer';
import ShareButton from './components/ShareButton';
import IncidentChart from './components/IncidentChart';
import { 
  View, ChatMessage, Template, SecurityRole, StoredReport, 
  WeeklyTip, UserProfile, StoredTrainingModule 
} from './types';
import { STATIC_TEMPLATES, SECURITY_TRAINING_DB } from './constants';
import { 
  generateTrainingModuleStream, analyzeReportParallel, 
  fetchBestPracticesStream, generateWeeklyTip, 
  fetchSecurityNews, generateAdvisorStream 
} from './services/geminiService';

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

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key}`, e);
    return fallback;
  }
};

const formatTime = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
};

const formatDateHeader = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [isSyncingBackground, setIsSyncingBackground] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => 
    safeParse('security_app_profile', { name: '', phoneNumber: '', email: '', preferredChannel: 'WhatsApp' })
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => 
    safeParse('security_app_chat', [{
      id: 'welcome',
      role: 'model',
      text: `Hello CEO ${userProfile.name || 'Executive'}. AntiRisk Intelligence Vault is active.`,
      timestamp: Date.now(),
      isPinned: false
    }])
  );

  const [storedReports, setStoredReports] = useState<StoredReport[]>(() => 
    safeParse('security_app_reports', [])
  );

  const [weeklyTips, setWeeklyTips] = useState<WeeklyTip[]>(() => 
    safeParse('security_app_weekly_tips', [])
  );

  const [savedTraining, setSavedTraining] = useState<StoredTrainingModule[]>(() => 
    safeParse('security_app_training', [])
  );

  const [customSops, setCustomSops] = useState<Template[]>(() => 
    safeParse('security_app_custom_sops', [])
  );

  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [trainingRole, setTrainingRole] = useState<SecurityRole>(SecurityRole.GUARD);
  const [trainingContent, setTrainingContent] = useState('');
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [isEditingTraining, setIsEditingTraining] = useState(false);
  const [activeTrainingId, setActiveTrainingId] = useState<string | null>(null);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  const [advisorViewMode, setAdvisorViewMode] = useState<'CHAT' | 'PINNED'>('CHAT');

  const [toolkitTab, setToolkitTab] = useState<'TEMPLATES' | 'AUDIT'>('TEMPLATES');
  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [newSopTitle, setNewSopTitle] = useState('');
  const [newSopContent, setNewSopContent] = useState('');
  
  const [bpTopic, setBpTopic] = useState('');
  const [bpContent, setBpContent] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);

  const [newsBlog, setNewsBlog] = useState<{ text: string; sources?: Array<{ title: string; url: string }> } | null>(null);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const [isTipLoading, setIsTipLoading] = useState(false);
  const [weeklyTopicInput, setWeeklyTopicInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('security_app_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('security_app_chat', JSON.stringify(messages)); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('security_app_reports', JSON.stringify(storedReports)); }, [storedReports]);
  useEffect(() => { localStorage.setItem('security_app_weekly_tips', JSON.stringify(weeklyTips)); }, [weeklyTips]);
  useEffect(() => { localStorage.setItem('security_app_training', JSON.stringify(savedTraining)); }, [savedTraining]);
  useEffect(() => { localStorage.setItem('security_app_custom_sops', JSON.stringify(customSops)); }, [customSops]);

  const memoizedKbContext = useMemo(() => {
    return customSops.map(s => `${s.title}: ${s.description}`).join('; ');
  }, [customSops]);

  const isProfileIncomplete = !userProfile.name || !userProfile.phoneNumber;

  useEffect(() => {
    if (appState === 'READY' && !isOfflineMode) {
      const syncIntelligence = async () => {
        setIsSyncingBackground(true);
        const lastSync = localStorage.getItem('security_app_last_sync');
        const now = Date.now();
        if (!lastSync || now - parseInt(lastSync) > 1000 * 60 * 60 * 4) {
          try {
            await Promise.allSettled([
              handleLoadNews()
            ]);
            localStorage.setItem('security_app_last_sync', now.toString());
          } catch (e) {
            console.error("Background sync failed", e);
          }
        }
        setIsSyncingBackground(false);
      };
      syncIntelligence();
    }
  }, [appState, isOfflineMode]);

  useEffect(() => {
    if (appState === 'SPLASH') {
      const startTime = Date.now();
      const duration = 1500;
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
    const isQuota = errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('429');
    setApiError(isQuota ? "Intelligence Core busy. Automatic retry active." : `System Alert: ${error?.message || "Internal network error."}`);
    setTimeout(() => setApiError(null), 8000);
  };

  const handleClearAdvisorHistory = () => {
    if (window.confirm("Permanently wipe AI Advisor history?")) {
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: `Hello CEO ${userProfile.name || 'Executive'}. AntiRisk Intelligence Vault reset.`,
        timestamp: Date.now(),
        isPinned: false
      }]);
    }
  };

  const handleTogglePin = (id: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isPinned: !msg.isPinned } : msg));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isOfflineMode) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputMessage, timestamp: Date.now(), isPinned: false };
    const tempId = Date.now().toString() + 'ai';
    const initialAiMsg: ChatMessage = { id: tempId, role: 'model', text: '', timestamp: Date.now(), isPinned: false };
    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    
    const currentInput = inputMessage;
    setInputMessage('');
    setIsAdvisorThinking(true);
    try {
      await generateAdvisorStream(messages, currentInput,
        (streamedText) => { setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: streamedText } : msg)); },
        (sources, cached) => { 
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, sources, text: cached ? `⚡ (Instant Intelligence)\n\n${msg.text}` : msg.text } : msg)); 
        },
        memoizedKbContext
      );
    } catch (err) { handleError(err); setMessages(prev => prev.filter(msg => msg.id !== tempId)); } finally { setIsAdvisorThinking(false); }
  };

  const handleGenerateTraining = async () => {
    if (!trainingTopic || isOfflineMode) return;
    setIsTrainingLoading(true); setTrainingContent(''); setActiveTrainingId(null); setIsEditingTraining(false);
    try {
      await generateTrainingModuleStream(trainingTopic, trainingWeek, trainingRole,
        (text) => setTrainingContent(text),
        () => {}
      );
    } catch (err) { handleError(err); } finally { setIsTrainingLoading(false); }
  };

  const handleSaveTrainingDraft = () => {
    if (!trainingContent) return;
    if (activeTrainingId) {
      setSavedTraining(prev => prev.map(t => t.id === activeTrainingId ? { ...t, content: trainingContent, timestamp: Date.now() } : t));
    } else {
      const newModule: StoredTrainingModule = {
        id: Date.now().toString(), topic: trainingTopic || "Untitled Module", targetAudience: trainingRole,
        content: trainingContent, generatedDate: new Date().toLocaleDateString(), timestamp: Date.now()
      };
      setSavedTraining(prev => [newModule, ...prev]);
      setActiveTrainingId(newModule.id);
    }
    setIsEditingTraining(false);
  };

  const handleSelectSavedTraining = (module: StoredTrainingModule) => {
    setTrainingTopic(module.topic); setTrainingRole(module.targetAudience as SecurityRole);
    setTrainingContent(module.content); setActiveTrainingId(module.id); setIsEditingTraining(false);
  };

  const handleAnalyzeReport = async () => {
    if (!reportText || isOfflineMode) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeReportParallel(reportText);
      setAnalysisResult(result);
      setStoredReports(prev => [{ id: Date.now().toString(), timestamp: Date.now(), dateStr: new Date().toLocaleDateString(), content: reportText, analysis: result }, ...prev]);
    } catch (err) { handleError(err); } finally { setIsAnalyzing(false); }
  };

  const handleFetchBP = async () => {
    if (isOfflineMode) return;
    setIsBpLoading(true); setBpContent({ text: '', sources: undefined });
    try {
      await fetchBestPracticesStream(bpTopic,
        (text) => setBpContent(prev => ({ ...prev!, text })),
        (sources) => setBpContent(prev => ({ ...prev!, sources }))
      );
    } catch (err) { handleError(err); } finally { setIsBpLoading(false); }
  };

  const handleGenerateWeeklyTip = async () => {
    if (isOfflineMode) return;
    setIsTipLoading(true);
    try {
      const content = await generateWeeklyTip();
      const newTip: WeeklyTip = { 
        id: Date.now().toString(), weekDate: new Date().toLocaleDateString(), 
        topic: weeklyTopicInput || "Weekly Strategic Focus", content, isAutoGenerated: true, timestamp: Date.now() 
      };
      setWeeklyTips(prev => [newTip, ...prev]);
      setWeeklyTopicInput('');
    } catch (err) { handleError(err); } finally { setIsTipLoading(false); }
  };

  const handleLoadNews = async () => {
    setIsNewsLoading(true);
    try { const news = await fetchSecurityNews(); setNewsBlog(news); } catch (err) { handleError(err); } finally { setIsNewsLoading(false); }
  };

  const handleAddCustomSop = () => {
    if (!newSopTitle || !newSopContent) return;
    const newSop: Template = { id: Date.now().toString(), title: newSopTitle, description: 'Custom Protocol', content: newSopContent };
    setCustomSops(prev => [newSop, ...prev]);
    setNewSopTitle(''); setNewSopContent(''); setShowSopModal(false);
  };

  const renderDashboard = () => (
    <div className="space-y-4 sm:space-y-10 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#122b6a] via-[#1a3a8a] to-[#0a1222] border border-blue-500/20 rounded-2xl sm:rounded-[3rem] p-5 sm:p-16 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/10 blur-[80px] sm:blur-[120px] -mr-32 -mt-32 rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-10">
          <div className="space-y-2 sm:space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30 text-blue-300 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
              <Activity size={10} className="animate-pulse" /> Command Active
            </div>
            <h2 className="text-xl sm:text-6xl font-black tracking-tighter leading-tight">Executive <span className="text-blue-400">Vault</span></h2>
            <p className="text-blue-100/70 text-[10px] sm:text-xl font-medium leading-relaxed">Intelligence-led security operations control.</p>
            {isSyncingBackground && (
              <div className="flex items-center gap-2 text-[7px] sm:text-xs text-blue-400 font-bold bg-blue-400/10 w-fit px-3 py-1 rounded-full border border-blue-400/20">
                <RefreshCw size={10} className="animate-spin" /> High-Speed Sync...
              </div>
            )}
          </div>
          <button onClick={() => setCurrentView(View.ADVISOR)} className="w-full md:w-auto md:px-10 py-3 sm:py-5 bg-white text-blue-900 rounded-xl sm:rounded-2xl font-black text-xs sm:text-lg hover:bg-blue-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2.5">
            <Sparkles size={16} /> Strategic Consult
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[
          { id: View.ADVISOR, label: 'AI Advisor', desc: 'Strategy Sync.', icon: ShieldAlert, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { id: View.NEWS_BLOG, label: 'Security News', desc: 'Daily Brief.', icon: Newspaper, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { id: View.WEEKLY_TIPS, label: 'Training Tips', desc: 'Automated Curriculum.', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { id: View.TOOLKIT, label: 'Ops Vault', desc: 'Audit & SOPs.', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' }
        ].map((item) => (
          <button key={item.label} onClick={() => setView(item.id)} className="group bg-[#1b2537] p-3 sm:p-8 rounded-xl sm:rounded-[2.5rem] border border-slate-700/40 hover:border-blue-500/50 transition-all text-left flex flex-col h-full shadow-lg active:scale-[0.98]">
            <div className={`w-8 h-8 sm:w-14 sm:h-14 ${item.bg} ${item.color} rounded-lg sm:rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <item.icon size={16} className="sm:size-28" />
            </div>
            <h3 className="text-[10px] sm:text-xl font-black text-white mb-0.5 tracking-tight truncate">{item.label}</h3>
            <p className="text-slate-400 text-[8px] sm:text-sm font-medium leading-relaxed flex-1 line-clamp-2">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderWeeklyTipsView = () => (
    <div className="max-w-xl mx-auto space-y-4 pb-20 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Lightbulb className="text-amber-500 fill-amber-500/20" size={24} /> 
            Weekly Training Tips
          </h2>
          <p className="text-slate-400 text-[11px]">
            Automated weekly curriculum for guards and supervisors.
          </p>
        </div>
        <button 
          onClick={() => setCurrentView(View.DASHBOARD)}
          className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3">
        <input 
          value={weeklyTopicInput} 
          onChange={(e) => setWeeklyTopicInput(e.target.value)}
          placeholder="Specific Topic (Optional)"
          className="w-full bg-[#1b2537] border border-slate-800 rounded-lg px-4 py-3 text-slate-300 text-xs focus:outline-none focus:border-amber-500/50"
        />
        <div className="flex gap-2">
          <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-xs font-bold transition-all">
            Create Custom
          </button>
          <button 
            onClick={handleGenerateWeeklyTip}
            disabled={isTipLoading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20"
          >
            {isTipLoading ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={16} />}
            Generate New Week
          </button>
        </div>
      </div>

      {isProfileIncomplete && (
        <div 
          onClick={() => setShowSettings(true)}
          className="bg-red-900/20 border border-red-900/40 rounded-xl p-4 flex items-center gap-4 cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="p-2 bg-red-900/30 rounded-lg text-red-500">
            <Bell size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-red-200/90 leading-tight">
              CEO Alert Profile Incomplete. Configure settings to receive automatic push notifications.
            </p>
          </div>
          <ChevronRight size={18} className="text-red-500/50 group-hover:text-red-500 transition-colors" />
        </div>
      )}

      <div className="bg-[#1b2537] rounded-3xl border border-slate-800/50 p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] relative overflow-hidden">
        {weeklyTips.length > 0 ? (
          <div className="w-full text-left space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-lg">{weeklyTips[0].topic}</h3>
              <ShareButton title={weeklyTips[0].topic} content={weeklyTips[0].content} view={View.WEEKLY_TIPS} />
            </div>
            <div className="max-h-[350px] overflow-y-auto scrollbar-hide">
              <MarkdownRenderer content={weeklyTips[0].content} />
            </div>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-slate-800/30 rounded-full flex items-center justify-center mb-4">
              <Lightbulb size={40} className="text-slate-600/50" />
            </div>
            <div className="space-y-3 relative z-10">
              <h3 className="text-white font-bold text-xl">No Training Tips Generated Yet</h3>
              <p className="text-slate-400 text-[12px] leading-relaxed max-w-[280px] mx-auto">
                Start by generating this week's security focus. The AI will use global standards to create a complete briefing.
              </p>
            </div>
            <button 
              onClick={handleGenerateWeeklyTip}
              className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded-xl text-sm font-bold shadow-xl shadow-amber-900/30 transition-all active:scale-95"
            >
              Start Automation
            </button>
          </>
        )}
      </div>

      <div className="bg-[#1b2537] rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
          <Calendar size={18} className="text-slate-500" />
          <h4 className="text-sm font-bold text-white">Training Archive</h4>
        </div>
        <div className="p-8">
          {weeklyTips.length > 1 ? (
            <div className="space-y-2">
              {weeklyTips.slice(1).map(tip => (
                <button key={tip.id} className="w-full text-left p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs font-bold text-slate-400 truncate">
                  {tip.weekDate}: {tip.topic}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-[12px] italic text-center">
              Past trainings will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-[#1b2537]/50 rounded-xl sm:rounded-[1.5rem] border border-slate-700/50 overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-3 sm:p-6 border-b border-slate-700/50 bg-[#0a1222]/40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Exit Advisor"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xs sm:text-base font-bold text-white flex items-center gap-2.5">
            <ShieldAlert className="text-blue-400" size={16} /> AI Advisor
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex gap-1 p-1 bg-slate-900/60 rounded-lg border border-slate-800">
            <button onClick={() => setAdvisorViewMode('CHAT')} className={`px-2 sm:px-3 py-1.5 rounded-md font-bold text-[9px] sm:text-xs transition-all ${advisorViewMode === 'CHAT' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Chat</button>
            <button onClick={() => setAdvisorViewMode('PINNED')} className={`px-2 sm:px-3 py-1.5 rounded-md font-bold text-[9px] sm:text-xs transition-all ${advisorViewMode === 'PINNED' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Pinned</button>
          </div>
          <button 
            onClick={handleClearAdvisorHistory}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Clear Chat History"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 scrollbar-hide">
        {advisorViewMode === 'CHAT' ? (
          messages.length > 0 ? (
            messages.map((msg, index) => {
              const showDateHeader = index === 0 || 
                new Date(messages[index-1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
              
              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 rounded-full bg-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700/50">
                        {formatDateHeader(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`group relative max-w-[92%] sm:max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg' 
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 shadow-sm'
                    }`}>
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => handleTogglePin(msg.id)}
                          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                            msg.isPinned ? 'text-blue-400 bg-blue-400/10 opacity-100' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-400/10'
                          }`}
                          title={msg.isPinned ? "Unpin Intelligence" : "Pin Intelligence"}
                        >
                          <Bookmark size={14} fill={msg.isPinned ? "currentColor" : "none"} />
                        </button>
                      )}

                      {msg.role === 'model' && !msg.text ? (
                        <div className="flex gap-1.5 py-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                      ) : (
                        <MarkdownRenderer content={msg.text} />
                      )}
                      
                      <div className={`mt-2 flex items-center gap-1.5 text-[9px] font-medium ${
                        msg.role === 'user' ? 'text-blue-100/60 justify-end' : 'text-slate-500 justify-start'
                      }`}>
                        <Clock size={10} />
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : null
        ) : (
          messages.filter(m => m.isPinned).length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                <Bookmark size={14} fill="currentColor" /> Pinned Strategic Intelligence
              </div>
              {messages.filter(m => m.isPinned).map(msg => (
                <div key={msg.id} className="group relative bg-[#1b2537] p-5 rounded-2xl border border-slate-700/50 shadow-lg animate-in fade-in duration-300">
                  <button 
                    onClick={() => handleTogglePin(msg.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-blue-400 bg-blue-400/10 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove from Pinned"
                  >
                    <PinOff size={14} />
                  </button>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                      <Calendar size={10} />
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <MarkdownRenderer content={msg.text} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center">
              <Bookmark size={40} className="mx-auto mb-4" />
              <div className="space-y-1">
                <p className="text-sm font-bold">No pinned intelligence briefing.</p>
                <p className="text-[10px] max-w-[200px] mx-auto">Hover over an AI Advisor message and click the bookmark icon to pin it here.</p>
              </div>
            </div>
          )
        )}
        <div ref={chatEndRef} />
      </div>

      {advisorViewMode === 'CHAT' && (
        <div className="p-3 border-t border-slate-700/50 flex gap-2 bg-[#0a1222]/40 backdrop-blur-md">
          <input 
            value={inputMessage} 
            onChange={(e) => setInputMessage(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
            placeholder="Executive briefing request..." 
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm h-11" 
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isAdvisorThinking} 
            className="bg-blue-600 hover:bg-blue-700 text-white w-11 h-11 rounded-xl shadow-lg active:scale-90 transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:active:scale-100"
          >
            {isAdvisorThinking ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      )}
    </div>
  );

  const renderBestPracticesView = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="relative overflow-hidden bg-[#1b2537] border border-slate-700/50 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <div className="space-y-1.5 text-center sm:text-left z-10">
          <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
             <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
             <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Regulatory Intelligence Hub</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Globe className="text-blue-500" size={28} /> Global Security Trends
          </h2>
          <p className="text-slate-400 text-xs font-medium">Real-time NSCDC, NIMASA, ISO & ASIS Updates.</p>
        </div>
        <div className="flex flex-col w-full sm:w-auto gap-3 z-10">
          <div className="flex gap-2">
            <button 
              onClick={handleFetchBP} 
              disabled={isBpLoading} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ring-2 ring-blue-500/20"
            >
              {isBpLoading ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />} 
              Sync Bulletins
            </button>
            <button 
              onClick={() => setCurrentView(View.DASHBOARD)}
              className="p-3.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl active:scale-90 transition-all border border-slate-700/50"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1b2537] rounded-3xl border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {isBpLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-6">
            <div className="relative">
               <Zap className="text-blue-500 animate-pulse" size={64} />
               <div className="absolute inset-0 flex items-center justify-center -mb-16">
                 <RefreshCw className="text-blue-400/50 animate-spin" size={24} />
               </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-black text-xl uppercase tracking-tighter">Fast-Sync Active</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-black">NSCDC • NIMASA • ISO 18788 • ASIS</p>
            </div>
          </div>
        ) : bpContent?.text ? (
          <div className="flex-1 flex flex-col">
            <div className="p-6 sm:p-10 space-y-8">
               <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 pb-4">
                 <ShieldCheck size={14} className="text-emerald-500" /> Authenticated Intelligence Briefing
               </div>
               
               <div className="space-y-10">
                  <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
                    <MarkdownRenderer content={bpContent.text} />
                  </div>
                  
                  {bpContent.sources && bpContent.sources.length > 0 && (
                    <div className="space-y-4 pt-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        <Info size={14} /> Intelligence Sources (Verify Authority)
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {bpContent.sources.slice(0, 4).map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400 text-xs font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">{idx + 1}</div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[280px] group-hover:text-white">{source.title}</span>
                                <span className="text-[9px] text-slate-500 font-medium truncate max-w-[200px]">{new URL(source.url).hostname}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest bg-blue-400/10 px-3 py-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                              Read Policy <ExternalLink size={12} />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-24 px-10 text-center space-y-6 opacity-30 group">
            <div className="relative">
              <Globe size={100} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-700" />
              <Zap className="absolute -top-2 -right-2 text-blue-500 group-hover:animate-bounce" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Regulatory Intelligence Standby</h3>
              <p className="text-slate-400 text-sm max-w-sm">Tap 'Sync' to pull latest physical security company regulatory standards from NSCDC, NIMASA, and ISO.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const setView = (view: View) => {
    setCurrentView(view);
  };

  if (appState === 'SPLASH') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-16 h-16 mb-8 animate-pulse" light={true} /><div className="w-full max-w-[200px] space-y-4 text-center"><div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb] transition-all" style={{ width: `${splashProgress}%` }}></div></div><p className="text-[6px] font-black text-blue-400 tracking-[0.4em] uppercase">Syncing AntiRisk Vault...</p></div></div>;
  if (appState === 'PIN_ENTRY' || appState === 'PIN_SETUP') return <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col items-center justify-center p-6 z-[100]"><AntiRiskLogo className="w-12 h-12 mb-8" /><h2 className="text-base sm:text-2xl font-bold text-white mb-6 uppercase tracking-widest">{appState === 'PIN_SETUP' ? 'Setup Vault' : 'Secure Entry'}</h2><div className="flex gap-4 mb-10">{[...Array(4)].map((_, i) => <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${pinInput.length > i ? (isPinError ? 'bg-red-500 border-red-500' : 'bg-blue-500 border-blue-500 shadow-[0_0_10px_#3b82f6]') : 'border-slate-800'}`} />)}</div><div className="grid grid-cols-3 gap-4 w-full max-w-[250px]">{[1,2,3,4,5,6,7,8,9,0].map(num => <button key={num} onClick={() => handlePinDigit(num.toString())} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl text-lg font-bold text-white active:scale-90 transition-all flex items-center justify-center shadow-inner">{num}</button>)}<button onClick={() => setPinInput('')} className="aspect-square bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-center justify-center text-red-500 active:scale-90"><Trash2 size={20} /></button></div></div>;

  return (
    <div className="flex h-[100dvh] bg-[#0a0f1a] text-slate-100 overflow-hidden relative">
      <Navigation currentView={currentView} setView={setView} isMobileMenuOpen={isMobileMenuOpen} closeMobileMenu={() => setIsMobileMenuOpen(false)} onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full">
        <div className="lg:hidden h-14 border-b border-slate-800/40 flex justify-between items-center px-4 bg-[#0a1222]/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2.5" onClick={() => setView(View.DASHBOARD)}>
            <AntiRiskLogo className="w-7 h-7" />
            <h1 className="font-bold text-sm text-white uppercase tracking-widest">AntiRisk</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 text-white bg-slate-800/50 rounded-lg active:scale-90"><Menu size={18} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 scrollbar-hide pb-20 lg:pb-12">
          {apiError && <div className="max-w-4xl mx-auto mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between"><div className="flex items-center gap-2"><ShieldAlert className="text-red-500" size={14} /><p className="text-red-200 font-bold text-[9px] sm:text-xs">{apiError}</p></div><button onClick={() => setApiError(null)} className="p-1"><X size={14}/></button></div>}
          
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.WEEKLY_TIPS && renderWeeklyTipsView()}
          {currentView === View.ADVISOR && renderAdvisor()}
          {currentView === View.BEST_PRACTICES && renderBestPracticesView()}
          {currentView === View.TRAINING && (
            <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen size={24} className="text-blue-400" />
                    <h2 className="text-xl font-bold">Training Builder</h2>
                  </div>
                  <button onClick={() => setView(View.DASHBOARD)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><X size={20} /></button>
               </div>
               <div className="grid lg:grid-cols-12 gap-5 h-full">
                  <div className="lg:col-span-4 space-y-4">
                      <div className="bg-[#1b2537] p-5 rounded-xl border border-slate-700/50 shadow-lg">
                        <h3 className="text-sm font-bold text-white mb-4">Briefing Config</h3>
                        <input value={trainingTopic} onChange={(e) => setTrainingTopic(e.target.value)} placeholder="Topic Search..." className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs mb-3 text-white outline-none focus:border-blue-500" />
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <select value={trainingRole} onChange={(e) => setTrainingRole(e.target.value as SecurityRole)} className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] p-2 text-slate-300">
                            {Object.values(SecurityRole).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <select value={trainingWeek} onChange={(e) => setTrainingWeek(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] p-2 text-slate-300">
                            {[1,2,3,4].map(w => <option key={w} value={w}>Week {w}</option>)}
                          </select>
                        </div>
                        <button onClick={handleGenerateTraining} disabled={isTrainingLoading || !trainingTopic} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                          {isTrainingLoading ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />} Generate Briefing
                        </button>
                      </div>
                      <div className="bg-[#1b2537] rounded-xl border border-slate-700/50 overflow-hidden hidden lg:flex flex-col h-64">
                        <div className="bg-slate-900 p-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">Archive</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {savedTraining.map(t => (
                            <button key={t.id} onClick={() => handleSelectSavedTraining(t)} className={`w-full text-left p-2 rounded-lg text-[10px] border ${activeTrainingId === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:bg-slate-800'}`}>{t.topic}</button>
                          ))}
                        </div>
                      </div>
                  </div>
                  <div className="lg:col-span-8 bg-[#1b2537] rounded-xl border border-slate-700/50 p-5 shadow-2xl min-h-[400px]">
                      {trainingContent ? (
                        <div className="space-y-4">
                           <div className="flex justify-end">
                              <ShareButton title={trainingTopic} content={trainingContent} view={View.TRAINING} />
                           </div>
                           <MarkdownRenderer content={trainingContent} />
                        </div>
                      ) : <div className="h-full flex flex-col items-center justify-center opacity-20"><Target size={40} /><p className="text-sm mt-2">Generate briefing above.</p></div>}
                  </div>
               </div>
            </div>
          )}
          {currentView === View.TOOLKIT && (
            <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <Briefcase size={24} className="text-blue-400" />
                    <h2 className="text-xl font-bold">Operations Toolkit</h2>
                  </div>
                  <button onClick={() => setView(View.DASHBOARD)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><X size={20} /></button>
               </div>
               <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit mx-auto sm:mx-0">
                  <button onClick={() => setToolkitTab('TEMPLATES')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${toolkitTab === 'TEMPLATES' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>SOP Templates</button>
                  <button onClick={() => setToolkitTab('AUDIT')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${toolkitTab === 'AUDIT' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>AI Audit</button>
               </div>
               {toolkitTab === 'TEMPLATES' ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...STATIC_TEMPLATES, ...customSops].map(t => (
                      <div key={t.id} className="bg-[#1b2537] p-4 rounded-xl border border-slate-700/50 flex flex-col h-full group">
                        <h4 className="text-[11px] font-bold text-white mb-2 truncate">{t.title}</h4>
                        <p className="text-[10px] text-slate-500 mb-4 flex-1 line-clamp-2">{t.description}</p>
                        <button onClick={() => navigator.clipboard.writeText(t.content)} className="w-full bg-slate-900 p-2 rounded-lg text-[10px] font-bold text-slate-400 group-hover:text-blue-400 border border-slate-800 flex items-center justify-center gap-1.5"><Copy size={12} /> COPY SOP</button>
                      </div>
                    ))}
                    <button onClick={() => setShowSopModal(true)} className="bg-slate-900/30 border border-dashed border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity min-h-[120px]"><Plus size={20}/><span className="text-[10px] mt-1 font-bold">New Custom SOP</span></button>
                 </div>
               ) : (
                 <div className="grid lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 bg-[#1b2537] p-5 rounded-xl border border-slate-700/50 shadow-lg space-y-4">
                      <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Paste daily report logs here..." className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500 resize-none" />
                      <button onClick={handleAnalyzeReport} disabled={isAnalyzing || !reportText} className="w-full bg-blue-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3">
                        {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Run Liability Audit
                      </button>
                      {analysisResult && <div className="mt-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800"><MarkdownRenderer content={analysisResult} /></div>}
                    </div>
                    <div className="lg:col-span-4 space-y-4">
                       <div className="bg-[#1b2537] p-5 rounded-xl border border-slate-700/50 shadow-xl">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Risk Trends</h4>
                          <IncidentChart reports={storedReports} />
                       </div>
                       <div className="bg-[#1b2537] rounded-xl border border-slate-700/50 overflow-hidden h-48">
                          <div className="bg-slate-900 p-2 text-[10px] font-black uppercase text-slate-600">Audit History</div>
                          <div className="p-2 space-y-1 overflow-y-auto h-36">
                             {storedReports.map(r => <button key={r.id} onClick={() => {setReportText(r.content); setAnalysisResult(r.analysis);}} className="w-full text-left p-2 rounded bg-slate-800/50 text-[9px] text-slate-400 truncate border border-slate-800">{r.dateStr}: {r.content}</button>)}
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          )}
          
          {currentView === View.NEWS_BLOG && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300">
              <div className="bg-[#1b2537] p-5 rounded-xl border border-slate-700/50 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Newspaper size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Security Briefing</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Industry Pulse</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleLoadNews} disabled={isNewsLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95">
                    {isNewsLoading ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />} Refresh
                  </button>
                  <button onClick={() => setView(View.DASHBOARD)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"><X size={20} /></button>
                </div>
              </div>
              <div className="bg-[#1b2537] p-6 rounded-xl border border-slate-700/50 shadow-xl min-h-[300px]">
                 {newsBlog ? <MarkdownRenderer content={newsBlog.text} /> : <div className="h-full py-20 text-center opacity-20"><Newspaper size={40} className="mx-auto" /></div>}
              </div>
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0a1222] w-full max-w-md rounded-2xl border border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="font-black text-white text-sm flex justify-between uppercase tracking-widest">CEO Profile <button onClick={() => setShowSettings(false)} className="text-slate-600 hover:text-white"><X size={20}/></button></h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase">Executive Name</label>
                <input value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase">WhatsApp Number</label>
                <input value={userProfile.phoneNumber} onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})} placeholder="+234..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500" />
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-xs">Sync Identity</button>
            </div>
          </div>
        </div>
      )}

      {showSopModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0a1222] w-full max-w-md rounded-2xl border border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="font-black text-white text-sm flex justify-between uppercase tracking-widest">New Custom Protocol <button onClick={() => setShowSopModal(false)} className="text-slate-600 hover:text-white"><X size={20}/></button></h3>
            <input value={newSopTitle} onChange={(e) => setNewSopTitle(e.target.value)} placeholder="Protocol Title..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-xs" />
            <textarea value={newSopContent} onChange={(e) => setNewSopContent(e.target.value)} placeholder="Full procedure details..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none resize-none text-xs" />
            <button onClick={handleAddCustomSop} disabled={!newSopTitle || !newSopContent} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-xs">Register SOP</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
