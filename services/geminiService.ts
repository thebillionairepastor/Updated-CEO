
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS, SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

/**
 * World-class Gemini SDK implementation optimized for high-speed executive performance.
 * Flash is used for high-concurrency/real-time tasks, Pro for deep auditing.
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Enhanced Retry Utility with Jitter and Exponential Backoff.
 * Aggressive retry logic to wait out transient "Intelligence Core" busy states (429/Quota).
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 8, delay = 3500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error).toUpperCase();
    const isQuotaError = 
      errorString.includes('RESOURCE_EXHAUSTED') || 
      errorString.includes('429') || 
      errorString.includes('QUOTA') ||
      errorString.includes('LIMIT') ||
      errorString.includes('HIGH LOAD');

    if (isQuotaError && retries > 0) {
      // Add random jitter (500-1500ms) to desynchronize simultaneous retries
      const jitter = Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return withRetry(fn, retries - 1, delay * 1.5); 
    }
    throw error;
  }
}

/**
 * Audit Log Intelligence Analysis (CEO level deep analysis)
 */
export const analyzeReport = async (reportText: string, reportType: 'PATROL' | 'INCIDENT' | 'SHIFT' = 'SHIFT'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `AUDIT TYPE: ${reportType} REPORT.\n\nCONTENT TO ANALYZE:\n${reportText}\n\nINSTRUCTIONS:\nAnalyze vulnerabilities, inconsistencies, and provide actionable CEO-level directives.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE,
        thinkingConfig: { thinkingBudget: 0 }
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
    const prompt = `URGENT CEO BRIEF: 10 Latest physical security manpower trends and regulatory updates for ${today}.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
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
 * Streaming Executive Advisor with Search-to-Standard Fallback.
 * If Google Search hits quota repeatedly, we fallback to standard Gemini intelligence.
 */
export const generateAdvisorStream = async (
  history: ChatMessage[], 
  currentMessage: string,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const conversationContext = history.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
  
  const startStream = async (retries = 8, delay = 3000, useSearch = true): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
        thinkingConfig: { thinkingBudget: 0 }
      };

      // Fallback logic: If we've hit quota multiple times, search is likely the bottleneck.
      // We disable it after 3 failures to ensure the user gets a model response.
      if (useSearch && retries > 5) {
        config.tools = [{ googleSearch: {} }];
      }

      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: `CONTEXT:\n${conversationContext}\n\nCEO QUERY: ${currentMessage}`,
        config
      });

      let fullText = "";
      let finalSources: Array<{ title: string; url: string }> | undefined = undefined;

      for await (const chunk of responseStream) {
        fullText += chunk.text || "";
        onChunk(fullText);

        const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.filter((c: any) => c.web?.uri)
          .map((c: any) => ({ title: c.web.title, url: c.web.uri }));

        if (sources && sources.length > 0) finalSources = sources;
      }
      onComplete(finalSources);
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toUpperCase();
      const isQuota = errorStr.includes('429') || errorStr.includes('QUOTA') || errorStr.includes('RESOURCE_EXHAUSTED');
      
      if (isQuota && retries > 0) {
        const jitter = Math.random() * 1500;
        await new Promise(r => setTimeout(r, delay + jitter));
        // Force fallback if retries are low
        return startStream(retries - 1, delay * 1.5, retries > 5);
      }
      throw error;
    }
  };

  return startStream();
};

/**
 * Streaming Global Trends / Best Practices (Max Resilience Strategy)
 */
export const fetchBestPracticesStream = async (
  topic: string | undefined,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const finalTopic = topic && topic.trim() !== "" ? topic : "latest 2024-2025 security manpower trends, ISO 18788 updates, and ASIS certifications";
  const prompt = `CEO STRATEGIC INTELLIGENCE: Analyze global physical security trends for "${finalTopic}". Focus on operational efficiency and manpower supply.`;

  const startStream = async (retries = 8, delay = 4000, useSearch = true): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {
        thinkingConfig: { thinkingBudget: 0 }
      };
      
      // Fallback: If search tool is causing 429s, we eventually try without it to deliver results.
      if (useSearch && retries > 4) {
        config.tools = [{ googleSearch: {} }];
      }

      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: prompt,
        config
      });

      let fullText = "";
      let finalSources: Array<{ title: string; url: string }> | undefined = undefined;

      for await (const chunk of responseStream) {
        fullText += chunk.text || "";
        onChunk(fullText);
        const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.filter((c: any) => c.web?.uri).map((c: any) => ({ title: c.web.title, url: c.web.uri }));
        if (sources && sources.length > 0) finalSources = sources;
      }
      onComplete(finalSources);
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toUpperCase();
      const isQuota = errorStr.includes('429') || errorStr.includes('QUOTA') || errorStr.includes('RESOURCE_EXHAUSTED');

      if (isQuota && retries > 0) {
        const jitter = Math.random() * 2000;
        await new Promise(r => setTimeout(r, delay + jitter));
        return startStream(retries - 1, delay * 1.3, retries > 4);
      }
      throw error;
    }
  };

  return startStream();
};

/**
 * Streaming Tactical Training Module Generator
 */
export const generateTrainingModuleStream = async (
  topic: string, 
  week: number = 1, 
  role: string = "All Roles",
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const prompt = `Detailed security training brief: "${topic}". Role: ${role}. Week: ${week}. Focused on non-repetitive industrial tactical insights.`;

  const startStream = async (retries = 6, delay = 3500): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        fullText += chunk.text || "";
        onChunk(fullText);
      }
      onComplete();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toUpperCase();
      if (retries > 0 && (errorStr.includes('429') || errorStr.includes('QUOTA'))) {
        await new Promise(r => setTimeout(r, delay + (Math.random() * 1000)));
        return startStream(retries - 1, delay * 1.8);
      }
      throw error;
    }
  };

  return startStream();
};

/**
 * Weekly Strategic Directive Generator
 */
export const generateWeeklyTip = async (previousTips: WeeklyTip[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Generate a unique Weekly Strategic Focus. Topic rotation is key.`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Remain alert and maintain perimeter integrity.";
  });
};

export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Suggest 6 security training topics for: "${query}". JSON Array format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    try { return JSON.parse(response.text || "[]"); } catch { return []; }
  });
};

export const analyzePatrolPatterns = async (reports: StoredReport[]): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = reports.map(r => r.content).slice(0, 5).join('\n---\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Identify patrol timing anomalies:\n\n${context}`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "Patrol intelligence scan complete.";
  });
};
