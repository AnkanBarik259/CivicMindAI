import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";
import { db } from "../firebaseAdmin";

export const runEscalationAgent = async () => {
  const systemPrompt = `You are the Escalation Agent for CivicMind AI.
Review the list of unresolved pending reports provided.
Determine if any need to be escalated due to severity or time delayed.
Output must include escalated_report_ids (array of strings), confidence (0.0 to 1.0), explanation, and reasoning.`;

  let pendingReports: any[] = [];
  try {
    const snapshot = await db.collection("reports").where("status", "==", "pending").get();
    pendingReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to fetch pending reports for escalation", error);
  }

  const reportsSummary = pendingReports.map(r => `ID: ${r.id}, Created: ${r.createdAt}, Severity: ${r.aiDecision?.severity || 'unknown'}`).join('\n');

  const userPrompt = `Pending Reports:\n${reportsSummary || "No pending reports."}`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    escalatedIds: result.escalated_report_ids || [],
    decisionLog: createDecisionLog('EscalationAgent', result)
  };
};
