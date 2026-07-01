import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";
import { ReportPayload } from "./supervisor";

export const runDepartmentRoutingAgent = async (payload: ReportPayload, visionResult: any, severityResult: any) => {
  const systemPrompt = `You are the Department Routing Agent.
Determine the responsible city department for the civic issue.
Possible departments: Public Works, Sanitation, Transportation, Parks & Rec, Water & Sewer, Police (non-emergency).
Output must include department, assignment_recommendation, confidence (0.0 to 1.0), explanation, and reasoning.`;

  const userPrompt = `Category: ${visionResult.category}
Severity: ${severityResult.level}
Description: ${payload.description}`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    department: result.department || 'Public Works',
    recommendation: result.assignment_recommendation || '',
    decisionLog: createDecisionLog('DepartmentRoutingAgent', result)
  };
};
