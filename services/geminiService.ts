
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS, SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

/**
 * World-class Gemini SDK implementation optimized for high-speed executive performance.
 * Model Selection: 'gemini-3-flash-preview' is the definitive choice for speed.
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Robust Retry Utility with Exponential Backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error).toUpperCase();
    const isQuotaError = 
      errorString.includes('RESOURCE_EXHAUSTED') || 
      errorString.includes('429') || 
      errorString.includes('QUOTA') ||
      errorString.includes('LIMIT');

    if (isQuotaError && retries > 0) {
      console.warn(`[AntiRisk Vault] Intelligence link saturated. Re-establishing link in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5); 
    }
    
    console.error("[AntiRisk Vault] Fatal Intelligence Failure:", error);
    throw error;
  }
}

/**
 * Audit Log Intelligence Analysis
 * Enhanced to handle Daily Patrols and 5Ws Incident Reports with prescriptive advice.
 */
export const analyzeReport = async (reportText: string, reportType: 'PATROL' | 'INCIDENT' | 'SHIFT' = 'SHIFT'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `AUDIT TYPE: ${reportType} REPORT.\n\nCONTENT TO ANALYZE:\n${reportText}\n\nINSTRUCTIONS:\n1. Identify critical vulnerabilities and tactical gaps.\n2. Detect temporal or narrative inconsistencies (Pencil-whipping detection).\n3. IMPORTANT: Advise exactly WHAT should be done and HOW to do it using best practical acceptable practices (ISO 18788/ASIS).\n4. Format as a CEO Executive Brief.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRO_MODEL, // Use PRO for deeper reasoning and inconsistency detection
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE
      }
    });
    return response.text || "Analysis engine recalibrating.";
  });
};

/**
 * Real-time Security News Blog Service
 */
export const fetchSecurityNews = async (): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const prompt = `Generate the absolute Latest CEO Security News Blog for today, ${today}.
    Exactly 10 items. Focus on NSCDC, NIMASA, and ISO regulatory impacts.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Intelligence stream temporarily offline.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Topic Suggestion Engine
 */
export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate 6 professional, specific security training topic variants for an industrial CEO vault based on: "${query}". 
    Focus on risk mitigation, liability reduction, and tactical guard deployment.
    Return ONLY a JSON array of strings.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
  });
};

/**
 * Tactical Training Module Generator
 */
export const generateTrainingModule = async (topic: string, week: number = 1, role: string = "All Roles"): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const weekFocus = {
      1: "FUNDAMENTALS: Core principles and basic observation.",
      2: "OPERATIONAL: Practical application and routine checks.",
      3: "TACTICAL: Emergency response and decision making.",
      4: "MASTERY: Leadership and pattern detection."
    }[week] || "GENERAL REFRESHER";

    const prompt = `Generate a high-fidelity training "vibration" for: "${topic}". Week ${week} focus: ${weekFocus}. Role: ${role}. Include mandatory CEO/MD signature.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Tactical brief generation failed.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Weekly Strategic Directive Generator
 */
export const generateWeeklyTip = async (previousTips: WeeklyTip[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate a new "Weekly Strategic Focus" directive based on current high-level risks.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP
      }
    });
    return response.text || "Remain alert and maintain perimeter integrity.";
  });
};

/**
 * Executive Advisor Interface
 */
export const generateAdvisorResponse = async (
  history: ChatMessage[], 
  currentMessage: string,
  knowledgeBase: KnowledgeDocument[] = []
): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const conversationContext = history.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `CONTEXT:\n${conversationContext}\n\nCEO QUERY: ${currentMessage}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Vault link recalibrating.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Best Practices Retrieval
 */
export const fetchBestPractices = async (topic?: string): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const finalTopic = topic && topic.trim() !== "" ? topic : "latest physical security best practices as of " + today;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Audit Intelligence: "${finalTopic}". Focus on May 2025 updates.`,
      config: { 
        tools: [{ googleSearch: {} }]
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title,
        url: chunk.web.uri
      })) || [];

    return { 
      text: response.text || "Intelligence stream saturated.",
      sources: sources.length > 0 ? sources : undefined
    };
  });
};

/**
 * Patrol Route Optimization Analysis
 */
export const analyzePatrolPatterns = async (reports: StoredReport[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = reports.map(r => r.content).slice(0, 10).join('\n---\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Analyze these reports and suggest optimized routes:\n\n${context}`
    });
    return response.text || "Patrol engine recalibrating.";
  });
};

/**
 * Automated Training Suggestions from Data
 */
export const getTrainingSuggestions = async (recentReports: StoredReport[]): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = recentReports.map(r => `- ${r.content}`).join('\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Suggest 3 training topics based on these incidents, separated by |||:\n${context}`
    });
    return (response.text || "").split('|||').map(t => t.trim());
  });
};
