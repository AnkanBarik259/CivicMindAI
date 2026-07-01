import { getAiClient, createDecisionLog, cleanJsonString } from "./aiClient";

// Helper function to download and encode image to base64
const downloadImageAsBase64 = async (url: string): Promise<{ mimeType: string; data: string }> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status} from server`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return {
      mimeType,
      data: buffer.toString("base64"),
    };
  } catch (error: any) {
    console.error(`Failed to download image from URL (${url}):`, error);
    throw new Error(`Failed to download image: ${error.message || error}`);
  }
};

export const runVisionAgent = async (imageUrls: string[], description: string) => {
  const ai = getAiClient();
  
  const systemPrompt = `You are the Vision Agent for CivicMind AI.
Your job is to analyze descriptions and image context to determine the category of the civic issue.
Categories include: 'pothole', 'graffiti', 'street_light', 'trash', 'other'.
Output must include category, extracted_observations (as a string list), confidence (0.0 to 1.0), explanation, and reasoning.
Return your response as a valid JSON object matching this schema:
{
  "category": "pothole" | "graffiti" | "street_light" | "trash" | "other",
  "extracted_observations": ["list of visual observations"],
  "confidence": 0.95,
  "explanation": "why this category",
  "reasoning": "technical explanation of category selection"
}`;

  const userPrompt = `Description: ${description}\nImages provided: ${imageUrls.length}`;

  const parts: any[] = [{ text: `${systemPrompt}\n\nUser Input:\n${userPrompt}\n\nIMPORTANT: You must return a valid JSON object matching the requested schema.` }];

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      const imgData = await downloadImageAsBase64(url);
      parts.push({
        inlineData: {
          mimeType: imgData.mimeType,
          data: imgData.data
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");

  let result: any;
  try {
    const cleanedText = cleanJsonString(text);
    result = JSON.parse(cleanedText);
  } catch (e: any) {
    console.error("Failed to parse Vision AI output:", text, e);
    result = {
      category: 'other',
      extracted_observations: [],
      confidence: 0.5,
      explanation: `Could not analyze image due to JSON parse error: ${e.message || e}`,
      reasoning: `JSON parsing failed on Gemini response. Raw output: ${text}`
    };
  }

  return {
    category: result.category || 'other',
    observations: result.extracted_observations || [],
    decisionLog: createDecisionLog('VisionAgent', result)
  };
};
