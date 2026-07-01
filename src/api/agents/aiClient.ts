import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let aiClient: GoogleGenAI | null = null;

export const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

// Common interface for agent structured outputs
export const BaseAgentResponseSchema = z.object({
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  reasoning: z.string()
});

export const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
    cleaned = cleaned.replace(/\n?```$/, "");
  }
  return cleaned.trim();
};

export const callAgentWithStructuredOutput = async (
  systemPrompt: string,
  userPrompt: string,
  schema: any, // Zod schema or JSON schema definition
  model: string = "gemini-3.5-flash"
) => {
  const ai = getAiClient();

  const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userPrompt}\n\nIMPORTANT: You must return a valid JSON object matching the requested schema.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
      // If using zod-to-json-schema, we could pass responseSchema here in a real implementation
      // For now, rely on responseMimeType and prompt engineering
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");

  try {
    const cleanedText = cleanJsonString(text);
    const parsed = JSON.parse(cleanedText);
    return parsed;
  } catch (e: any) {
    console.error("Failed to parse AI output:", text, e);
    throw new Error(`AI returned invalid JSON: ${e.message || e}. Raw output: ${text}`);
  }
};

export const createDecisionLog = (agentName: string, result: any) => {
  return {
    confidence: result.confidence || 0,
    explanation: result.explanation || "No explanation provided",
    reasoning: result.reasoning || "No reasoning provided",
    timestamp: new Date().toISOString(),
    agentName
  };
};
