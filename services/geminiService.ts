
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { 
  SYSTEM_INSTRUCTION_ADVISOR, 
  SYSTEM_INSTRUCTION_TRAINER, 
  SYSTEM_INSTRUCTION_WEEKLY_TIP, 
  SYSTEM_INSTRUCTION_NEWS, 
  SYSTEM_INSTRUCTION_AUDIT_TACTICAL,
  SYSTEM_INSTRUCTION_AUDIT_LIABILITY 
} from "../constants";
import { ChatMessage, WeeklyTip } from "../types";

const PRIMARY_MODEL = 'gemini-3-flash-preview';

// --- Caching Layer ---
const CACHE_KEY = 'antirisk_advisor_cache';
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  response: string;
  timestamp: number;
  sources?: Array<{ title: string; url: string }>;
}

const getCache = (): Record<string, CacheEntry> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Record<string, CacheEntry>) => {
  try {
    const entries = Object.entries(cache);
    // Prune if too large
    if (entries.length > MAX_CACHE_SIZE) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp).slice(0, MAX_CACHE_SIZE);
      cache = Object.fromEntries(sorted);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache save failed", e);
  }
};

const generateCacheKey = (query: string, context: string): string => {
  return btoa(query.trim().toLowerCase() + context.trim().toLowerCase()).slice(0, 64);
};

// --- API Helpers ---

const isQuotaError = (error: any): boolean => {
  const errorString = JSON.stringify(error).toUpperCase();
  return (
    errorString.includes('RESOURCE_EXHAUSTED') || 
    errorString.includes('429') || 
    errorString.includes('QUOTA')
  );
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  const execute = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      if (isQuotaError(error) && attempt < maxRetries) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return execute();
      }
      throw error;
    }
  };
  return execute();
}

export const analyzeReportParallel = async (reportText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const tacticalPromise = withRetry(async () => {
    const resp = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: reportText,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_AUDIT_TACTICAL,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return resp.text;
  });

  const liabilityPromise = withRetry(async () => {
    const resp = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: reportText,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_AUDIT_LIABILITY,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return resp.text;
  });

  const [tactical, liability] = await Promise.all([tacticalPromise, liabilityPromise]);

  return `# Executive Audit Summary\n\n## 🛡️ Tactical Review\n${tactical}\n\n## ⚖️ Liability & Compliance\n${liability}`;
};

export const fetchSecurityNews = async (): Promise<{ text: string; sources?: Array<{ title: string; url: string }> }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Latest Nigerian & International security news as of ${new Date().toLocaleDateString()}. Focus on NSCDC, NIMASA, and ISO standards.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_NEWS,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({ title: chunk.web.title, url: chunk.web.uri })) || [];

    return { text: response.text || "Intelligence stream temporarily unavailable.", sources };
  });
};

export const generateAdvisorStream = async (
  history: ChatMessage[], 
  currentMessage: string,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>, cached?: boolean) => void,
  kbContext?: string
) => {
  const conversationContext = history.slice(-2).map(h => `${h.role}: ${h.text}`).join('\n');
  const cacheKey = generateCacheKey(currentMessage, kbContext || '');
  const cache = getCache();

  if (cache[cacheKey]) {
    onChunk(cache[cacheKey].response);
    onComplete(cache[cacheKey].sources, true);
    return;
  }

  const startStream = async (retriesUsed = 0): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: `KNOWLEDGE_BASE: ${kbContext || 'Standard Protocols'}\nCONTEXT: ${conversationContext}\n\nQUERY: ${currentMessage}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 0 }
        }
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

      const newCache = getCache();
      newCache[cacheKey] = {
        response: fullText,
        timestamp: Date.now(),
        sources: finalSources
      };
      saveCache(newCache);

      onComplete(finalSources, false);
    } catch (error: any) {
      if (isQuotaError(error) && retriesUsed < 2) {
        await new Promise(r => setTimeout(r, 1000));
        return startStream(retriesUsed + 1);
      }
      throw error;
    }
  };
  return startStream();
};

export const fetchBestPracticesStream = async (
  topic: string | undefined,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const dateStr = new Date().toLocaleDateString();
  const query = `Latest 2024-2025 regulatory updates, physical security policies, and industrial standards from NSCDC (Nigeria), NIMASA, ISO 18788, and ASIS. 
  Focus: ${topic || 'Physical Security Company Standards'}. 
  Format as 3-4 High-Speed Bulletins.`;

  const startStream = async (retriesUsed = 0): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: query,
        config: { 
          systemInstruction: "You are a Real-Time Regulatory Intelligence Officer. Provide the latest physical security standards and news from Nigeria (NSCDC, NIMASA) and International bodies (ISO, ASIS). Output MUST be ultra-fast, concise markdown bullets with technical precision. Do not use conversational filler.",
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 0 }
        }
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
      if (isQuotaError(error) && retriesUsed < 2) {
        await new Promise(r => setTimeout(r, 1000));
        return startStream(retriesUsed + 1);
      }
      throw error;
    }
  };
  return startStream();
};

export const generateTrainingModuleStream = async (
  topic: string, 
  week: number = 1, 
  role: string = "Security Guard",
  onChunk: (text: string) => void,
  onComplete: () => void
) => {
  const startStream = async (retriesUsed = 0): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: `Training: ${topic}. Target Role: ${role}. Schedule: Week ${week}.`,
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
      if (isQuotaError(error) && retriesUsed < 2) {
        await new Promise(r => setTimeout(r, 1000));
        return startStream(retriesUsed + 1);
      }
      throw error;
    }
  };
  return startStream();
};

export const generateWeeklyTip = async (): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Generate a Weekly Strategic Directive. Current Date: ${new Date().toLocaleDateString()}.`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Ensure operational readiness and site integrity.";
  });
};

export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Suggest 5 advanced training topics for security guards focusing on: "${query}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    try { 
      return JSON.parse(response.text || "[]"); 
    } catch { 
      return []; 
    }
  });
};
