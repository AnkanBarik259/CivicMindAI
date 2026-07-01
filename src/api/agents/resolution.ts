import { callAgentWithStructuredOutput, createDecisionLog } from "./aiClient";

export const runResolutionVerificationAgent = async (beforeImageUrls: string[], afterImageUrls: string[]) => {
  const systemPrompt = `You are the Resolution Verification Agent.
Compare the before and after images of a reported issue.
Determine if the issue has been successfully resolved and evaluate the repair quality.
Output must include isResolved (boolean), repairQuality (poor/acceptable/excellent), confidence (0.0 to 1.0), explanation, and reasoning.`;

  const userPrompt = `Before Images: ${beforeImageUrls.length}
After Images: ${afterImageUrls.length}`;

  const result = await callAgentWithStructuredOutput(systemPrompt, userPrompt, null);

  return {
    isResolved: result.isResolved || false,
    repairQuality: result.repairQuality || 'unknown',
    decisionLog: createDecisionLog('ResolutionVerificationAgent', result)
  };
};
