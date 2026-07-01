import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";
import { ReportPayload } from "./supervisor";

export const runSeverityAgent = async (payload: ReportPayload) => {
  const systemPrompt = `You are the Severity Agent.
Determine the severity (low, medium, high, critical) of the reported civic issue.
Consider potential impact on traffic, population, nearby schools, hospitals, and public safety.
Output must include level (low/medium/high/critical), risk_factors, confidence (0.0 to 1.0), explanation, and reasoning.`;

  const userPrompt = `Title: ${payload.title}
Description: ${payload.description}`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    level: result.level || 'low',
    riskFactors: result.risk_factors || [],
    decisionLog: createDecisionLog('SeverityAgent', result)
  };
};
