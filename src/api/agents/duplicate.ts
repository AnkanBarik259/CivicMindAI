import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";
import { ReportPayload } from "./supervisor";
import { db } from "../firebaseAdmin";

export const runDuplicateDetectionAgent = async (payload: ReportPayload) => {
  // Query for recent reports (simplified bounding box or just global recent for MVP)
  // For production, use geohashes, but here we'll just get the last 50 reports
  let nearbyReports: any[] = [];
  try {
    const snapshot = await db.collection("reports").orderBy("createdAt", "desc").limit(50).get();
    nearbyReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch nearby reports for duplicate detection:", error);
  }

  // Calculate distance roughly using Pythagorean theorem (for MVP only, haversine is better)
  const isClose = (r: any) => {
    if (!r.location) return false;
    const dLat = r.location.lat - payload.location.lat;
    const dLng = r.location.lng - payload.location.lng;
    return Math.sqrt(dLat*dLat + dLng*dLng) < 0.05; // ~5km roughly
  };

  const closeReports = nearbyReports.filter(isClose);

  const systemPrompt = `You are the Duplicate Detection Agent.
Compare the incoming report with nearby recent reports to determine if it is a duplicate.
Output must include isDuplicate (boolean), duplicateOfId (string or null), confidence (0.0 to 1.0), explanation, and reasoning.`;

  const contextReports = closeReports.map(r => `ID: ${r.id}, Title: ${r.title}, Desc: ${r.description}`).join('\n');

  const userPrompt = `New Report: ${payload.title} - ${payload.description} at (${payload.location.lat}, ${payload.location.lng})
Nearby Reports:
${contextReports || "None"}`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    isDuplicate: result.isDuplicate || false,
    duplicateOfId: result.duplicateOfId || null,
    decisionLog: createDecisionLog('DuplicateDetectionAgent', result)
  };
};
