import { Router } from "express";
import { requireAuth, requireRole } from "./middleware/auth";
import { getAiClient } from "./agents/aiClient";
import { z } from "zod";

const router = Router();

const ChatPromptSchema = z.object({
  prompt: z.string().min(1).max(500),
});

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const parsed = ChatPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid prompt", details: parsed.error.issues });
    }

    const { prompt } = parsed.data;

    // Server-side guardrails
    const systemPrompt = "You are a helpful civic assistant. Refuse any queries not related to city services, civic reports, or general municipal help.";
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    const ai = getAiClient();
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
    });

    res.json({ status: "ok", text: response.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error.message || error);
    res.status(500).json({ error: "Failed to process AI request" });
  }
});

router.post("/vision", requireAuth, async (req, res) => {
  // This endpoint might be used standalone, but for reports, Supervisor handles vision.
  res.json({ status: "ok", message: "AI vision analysis endpoint placeholder" });
});

router.post("/escalation", requireAuth, requireRole("admin"), async (req, res) => {
  // Placeholder for manual escalation trigger
  res.json({ status: "ok", message: "AI escalation agent endpoint placeholder" });
});

router.post("/analyze-route", requireAuth, async (req, res) => {
  try {
    const { primaryRoute, alternativeRoutes } = req.body;
    
    const systemPrompt = `You are a Route Analysis Agent. 
    Analyze the provided primary route data and hazards.
    If the primary route has a low road health score (e.g., < 60), evaluate the alternative routes provided and recommend the safest one.
    Estimate additional travel delay caused by reported hazards based on their type:
    - Pothole -> Small delay (~1 min)
    - Broken Road -> Medium delay (~3 mins)
    - Flooded Road -> Large delay (~10 mins)
    - Road Closure / Construction -> Very large delay (~20 mins)
    
    Return a JSON object with:
    - totalHazards (number, for primary route)
    - roadHealthScore (number 1-100, for primary route, 100 is excellent, 0 is poor)
    - hazardTypes (array of strings, for primary route)
    - estimatedDelaySeconds (number, total estimated delay in seconds)
    - summary (string, a natural-language summary of the route, e.g. "Your route contains two potholes and one flooded road. Travel carefully.")
    - hasSaferAlternative (boolean)
    - saferAlternative (object, optional, with properties: routeIndex (number, index in alternativeRoutes array), extraDistance (string, e.g. "2 km"), extraTime (string, e.g. "10 mins"), reason (string), riskReduction (string, e.g. "Avoids 2 flooded roads"))
    `;

    const userPrompt = `
    Primary Route:
    - Distance: ${primaryRoute.distance} meters
    - Duration: ${primaryRoute.duration} seconds
    - Hazards: ${JSON.stringify(primaryRoute.hazards)}

    Alternative Routes:
    ${alternativeRoutes.map((r: any, i: number) => `
    [Index: ${i}]
    - Distance: ${r.distance} meters
    - Duration: ${r.duration} seconds
    - Hazards: ${JSON.stringify(r.hazards)}
    `).join("\n")}
    `;

    const ai = getAiClient();
    
    const fullPrompt = `${systemPrompt}\n\nUser Input:\n${userPrompt}\n\nIMPORTANT: You must return a valid JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const parsed = JSON.parse(text);
    res.json({ status: "ok", data: parsed });
  } catch (error: any) {
    console.error("AI Route Analysis Error:", error.message || error);
    res.status(500).json({ error: "Failed to analyze route" });
  }
});

export default router;
