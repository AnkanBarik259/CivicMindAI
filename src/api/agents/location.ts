import { getAiClient } from './aiClient';
import { ReportPayload, AgentDecision } from './supervisor';

export interface LocationResult {
  confidence: number;
  isPlausible: boolean;
  decisionLog: Omit<AgentDecision, 'decisionId' | 'executionTimeMs'>;
}

export const runLocationAgent = async (payload: ReportPayload): Promise<LocationResult> => {
  const timestamp = new Date().toISOString();
  try {
    const ai = getAiClient();
    
    // In a real scenario, we would query nearby reports from Firestore and image EXIF metadata
    // For this prototype, we ask the AI to validate plausibility based on provided context
    
    const prompt = `You are a Civic Location Validation Agent.
Analyze this civic issue report location.
Title: ${payload.title}
Description: ${payload.description}
Reported Location Coordinates: Lat ${payload.location.lat}, Lng ${payload.location.lng}

Determine if this location is plausible for the reported issue.
Return a JSON object:
{
  "confidence": <number between 0 and 1>,
  "isPlausible": <boolean>,
  "explanation": "A short, user-friendly explanation of the location validation",
  "reasoning": "Internal reasoning for why this location score was given"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    return {
      confidence: result.confidence || 0.8,
      isPlausible: result.isPlausible ?? true,
      decisionLog: {
        agentName: "Location Agent",
        confidence: result.confidence || 0.8,
        explanation: result.explanation || "Location appears plausible.",
        reasoning: result.reasoning || "Location coordinates match standard expectations.",
        timestamp
      }
    };
  } catch (error) {
    return {
      confidence: 0.5,
      isPlausible: true,
      decisionLog: {
        agentName: "Location Agent",
        confidence: 0.5,
        explanation: "Could not perform deep location validation at this time.",
        reasoning: "AI service error",
        timestamp
      }
    };
  }
};
