
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS, SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

/**
 * World-class Gemini SDK implementation optimized for high-speed executive performance.
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Robust Retry Utility with Optimized Backoff for Speed (Standard Requests)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
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
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); 
    }
    throw error;
  }
}

/**
 * Audit Log Intelligence Analysis
 */
export const analyzeReport = async (reportText: string, reportType: 'PATROL' | 'INCIDENT' | 'SHIFT' = 'SHIFT'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `AUDIT TYPE: ${reportType} REPORT.\n\nCONTENT TO ANALYZE:\n${reportText}\n\nINSTRUCTIONS:\n1. Identify critical vulnerabilities and tactical gaps.\n2. Detect temporal or narrative inconsistencies.\n3. Advise exactly WHAT should be done and HOW to do it.\n4. Format as a CEO Executive Brief.`;

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
    const prompt = `LATEST NEWS: Global security trends and Nigerian security updates for ${today}. Focused on manpower and manpower technology.`;

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
 * Streaming Executive Advisor Interface with Built-in Quota Resilience
 */
export const generateAdvisorStream = async (
  history: ChatMessage[], 
  currentMessage: string,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const conversationContext = history.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
  
  const startStream = async (retries = 2): Promise<void> => {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: `CONTEXT:\n${conversationContext}\n\nCEO QUERY: ${currentMessage}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_ADVISOR,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      let fullText = "";
      let finalSources: Array<{ title: string; url: string }> | undefined = undefined;

      for await (const chunk of responseStream) {
        const chunkText = chunk.text || "";
        fullText += chunkText;
        onChunk(fullText);

        const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.filter((c: any) => c.web?.uri)
          .map((c: any) => ({
            title: c.web.title,
            url: c.web.uri
          }));

        if (sources && sources.length > 0) finalSources = sources;
      }
      onComplete(finalSources);
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toUpperCase();
      if (retries > 0 && (errorStr.includes('429') || errorStr.includes('QUOTA') || errorStr.includes('LIMIT'))) {
        await new Promise(r => setTimeout(r, 2000));
        return startStream(retries - 1);
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Detailed security training brief for: "${topic}". Context: Nigeria/Global Industrial Security. Role: ${role}. Week: ${week}.`;

  const startStream = async (retries = 2): Promise<void> => {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_TRAINER,
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
      const errorStr = JSON.stringify(error).toUpperCase();
      if (retries > 0 && (errorStr.includes('429') || errorStr.includes('QUOTA'))) {
        await new Promise(r => setTimeout(r, 2000));
        return startStream(retries - 1);
      }
      throw error;
    }
  };

  return startStream();
};

/**
 * Streaming Global Trends / Best Practices Interface
 */
export const fetchBestPracticesStream = async (
  topic: string | undefined,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const finalTopic = topic && topic.trim() !== "" ? topic : "latest physical security global best practices 2024 2025";
  const prompt = `CEO Strategic Intel: "${finalTopic}". Include ISO 18788 and Nigerian NSCDC standards.`;

  const startStream = async (retries = 2): Promise<void> => {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
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
      const errorStr = JSON.stringify(error).toUpperCase();
      if (retries > 0 && (errorStr.includes('429') || errorStr.includes('QUOTA'))) {
        await new Promise(r => setTimeout(r, 2000));
        return startStream(retries - 1);
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
      contents: `Generate a unique Weekly Strategic Focus. Do not repeat topics like ${previousTips.slice(0, 3).map(t => t.topic).join(', ')}.`,
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
      contents: `Generate 6 variations of professional training topics for: "${query}". Return as JSON string array.`,
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
    const context = reports.map(r => r.content).slice(0, 10).join('\n---\n');
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Analyze patrol logs for timing anomalies and route optimization:\n\n${context}`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "Patrol engine recalibrating.";
  });
};
