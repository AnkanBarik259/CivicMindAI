import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";
import { db } from "../firebaseAdmin";

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  category?: string;
}

export const runAnalyticsAgent = async (filters: AnalyticsFilter = {}) => {
  const systemPrompt = `You are the Analytics Agent for CivicMind AI.
Generate a city summary based on the recent reports data provided.
Identify hotspots and performance insights.
Output must include summary, hotspots (array of strings), predictions (array of strings), departmentPerformance (string), confidence (0.0 to 1.0), explanation, and reasoning.`;

  // Fetch recent data from Firestore based on filters
  let query: FirebaseFirestore.Query = db.collection("reports");
  
  if (filters.startDate) {
    query = query.where("createdAt", ">=", filters.startDate);
  }
  if (filters.endDate) {
    query = query.where("createdAt", "<=", filters.endDate);
  }
  if (filters.department) {
    query = query.where("aiDecision.department", "==", filters.department);
  }
  if (filters.category) {
    query = query.where("aiDecision.category", "==", filters.category);
  }

  let reports: any[] = [];
  try {
    const snapshot = await query.orderBy("createdAt", "desc").limit(200).get();
    reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch reports for analytics", error);
  }

  const reportsSummary = reports.map(r => `[${r.aiDecision?.department || 'unknown'}] [${r.aiDecision?.category || 'unknown'}] ${r.title} (Status: ${r.status})`).join('\n');

  const userPrompt = `Recent Reports Context:\n${reportsSummary || "No reports matched the criteria."}\n\nAnalyze the data and provide comprehensive insights.`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    summary: result.summary || "No summary generated",
    hotspots: result.hotspots || [],
    predictions: result.predictions || [],
    departmentPerformance: result.departmentPerformance || "N/A",
    decisionLog: createDecisionLog('AnalyticsAgent', result)
  };
};
