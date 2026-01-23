
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_ADVISOR, SYSTEM_INSTRUCTION_TRAINER, SYSTEM_INSTRUCTION_WEEKLY_TIP, SYSTEM_INSTRUCTION_NEWS, SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE } from "../constants";
import { ChatMessage, StoredReport, KnowledgeDocument, WeeklyTip } from "../types";

/**
 * World-class Gemini SDK implementation optimized for high-speed executive performance.
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Optimized Retry Utility with Jitter and Exponential Backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
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
      // Add random jitter to prevent simultaneous retry bursts
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
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
    const prompt = `LATEST NEWS: Strategic physical security trends, Nigerian NSCDC updates, and NIMASA maritime policy news for today ${today}.`;

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
 * Streaming Executive Advisor Interface with Enhanced Resilience
 */
export const generateAdvisorStream = async (
  history: ChatMessage[], 
  currentMessage: string,
  onChunk: (text: string) => void,
  onComplete: (sources?: Array<{ title: string; url: string }>) => void
) => {
  const conversationContext = history.slice(-5).map(h => `${h.role.toUpperCase()}: ${h.text}`).join('\n');
  
  const startStream = async (retries = 6, delay = 2000): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        const jitter = Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay + jitter));
        return startStream(retries - 1, delay * 2);
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
  const prompt = `Develop a non-repetitive security training brief on "${topic}" for ${role} (Week ${week}). Focused on Nigerian industrial sector risks.`;

  const startStream = async (retries = 6, delay = 2000): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        const jitter = Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay + jitter));
        return startStream(retries - 1, delay * 2);
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
  const finalTopic = topic && topic.trim() !== "" ? topic : "latest 2024-2025 global physical security manpower trends and ISO standards";
  const prompt = `CEO STRATEGIC INTELLIGENCE BRIEF: Analyze current shifts and standards for "${finalTopic}". Include impact on security manpower industry.`;

  const startStream = async (retries = 6, delay = 2500): Promise<void> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        const jitter = Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay + jitter));
        return startStream(retries - 1, delay * 2.5);
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
      contents: `Generate a new Weekly Strategic Focus. Do not repeat: ${previousTips.slice(0, 5).map(t => t.topic).join(', ')}.`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION_WEEKLY_TIP,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Maintain absolute perimeter integrity.";
  });
};

export const fetchTopicSuggestions = async (query: string): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Provide 6 specialized training topic suggestions for: "${query}". Format as JSON string array.`,
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
      contents: `Audit these patrol reports for efficiency and anomalies:\n\n${context}`,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "Patrol intelligence analysis complete.";
  });
};
