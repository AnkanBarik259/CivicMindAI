import { getAiClient } from './aiClient';
import { runVisionAgent } from './vision';
import { runDuplicateDetectionAgent } from './duplicate';
import { runSeverityAgent } from './severity';
import { runDepartmentRoutingAgent } from './department';
import { runLocationAgent } from './location';
import { v4 as uuidv4 } from 'uuid';

export interface ReportPayload {
  title: string;
  description: string;
  location: { 
    lat: number; 
    lng: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  imageUrls: string[];
  userId: string;
}

export interface AgentDecision {
  decisionId: string;
  confidence: number;
  explanation: string;
  reasoning: string;
  timestamp: string;
  agentName: string;
  executionTimeMs: number;
}

export interface SupervisorDecision {
  requestId: string;
  status: 'accepted' | 'rejected' | 'needs_human_review';
  category: string;
  severity: string;
  department: string;
  isDuplicate: boolean;
  duplicateOfId?: string;
  locationConfidence?: number;
  confidenceScore: number;
  agentDecisions: AgentDecision[];
  totalExecutionTimeMs: number;
  timestamp: string;
}

const withExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T, timeMs: number }> => {
  const start = Date.now();
  const result = await fn();
  const timeMs = Date.now() - start;
  return { result, timeMs };
};

export const runSupervisorAgent = async (payload: ReportPayload): Promise<SupervisorDecision> => {
  const agentDecisions: AgentDecision[] = [];
  const requestId = uuidv4();
  const totalStartTime = Date.now();

  try {
    // 1. Parallel Execution of Independent Agents with individual try-catch blocks to prevent total pipeline collapse
    const [visionOutcome, duplicateOutcome, severityOutcome, locationOutcome] = await Promise.all([
      withExecutionTime(() => runVisionAgent(payload.imageUrls, payload.description)).catch(err => {
        console.error(`[VisionAgent Error]:`, err);
        return {
          result: {
            category: 'other',
            observations: [],
            decisionLog: {
              confidence: 0,
              explanation: `Vision Agent failed: ${err.message || err}`,
              reasoning: err.stack || String(err),
              timestamp: new Date().toISOString(),
              agentName: 'VisionAgent'
            }
          },
          timeMs: 0
        };
      }),
      withExecutionTime(() => runDuplicateDetectionAgent(payload)).catch(err => {
        console.error(`[DuplicateDetectionAgent Error]:`, err);
        return {
          result: {
            isDuplicate: false,
            duplicateOfId: null,
            decisionLog: {
              confidence: 0,
              explanation: `Duplicate Detection Agent failed: ${err.message || err}`,
              reasoning: err.stack || String(err),
              timestamp: new Date().toISOString(),
              agentName: 'DuplicateDetectionAgent'
            }
          },
          timeMs: 0
        };
      }),
      withExecutionTime(() => runSeverityAgent(payload)).catch(err => {
        console.error(`[SeverityAgent Error]:`, err);
        return {
          result: {
            level: 'medium',
            riskFactors: [],
            decisionLog: {
              confidence: 0,
              explanation: `Severity Agent failed: ${err.message || err}`,
              reasoning: err.stack || String(err),
              timestamp: new Date().toISOString(),
              agentName: 'SeverityAgent'
            }
          },
          timeMs: 0
        };
      }),
      withExecutionTime(() => runLocationAgent(payload)).catch(err => {
        console.error(`[LocationAgent Error]:`, err);
        return {
          result: {
            confidence: 0.5,
            isPlausible: true,
            decisionLog: {
              confidence: 0.5,
              explanation: `Location Agent failed: ${err.message || err}`,
              reasoning: err.stack || String(err),
              timestamp: new Date().toISOString(),
              agentName: 'Location Agent'
            }
          },
          timeMs: 0
        };
      })
    ]);

    const visionResult = visionOutcome.result;
    const duplicateResult = duplicateOutcome.result;
    const severityResult = severityOutcome.result;
    const locationResult = locationOutcome.result;

    agentDecisions.push({ ...visionResult.decisionLog, executionTimeMs: visionOutcome.timeMs, decisionId: uuidv4() });
    agentDecisions.push({ ...duplicateResult.decisionLog, executionTimeMs: duplicateOutcome.timeMs, decisionId: uuidv4() });
    agentDecisions.push({ ...severityResult.decisionLog, executionTimeMs: severityOutcome.timeMs, decisionId: uuidv4() });
    agentDecisions.push({ ...locationResult.decisionLog, executionTimeMs: locationOutcome.timeMs, decisionId: uuidv4() });

    // 2. Sequential Execution for Dependent Agents (Department Routing needs Category and Severity)
    let deptOutcome;
    try {
      deptOutcome = await withExecutionTime(() => runDepartmentRoutingAgent(payload, visionResult, severityResult));
    } catch (err: any) {
      console.error(`[DepartmentRoutingAgent Error]:`, err);
      deptOutcome = {
        result: {
          department: 'Public Works',
          recommendation: '',
          decisionLog: {
            confidence: 0,
            explanation: `Department Routing Agent failed: ${err.message || err}`,
            reasoning: err.stack || String(err),
            timestamp: new Date().toISOString(),
            agentName: 'DepartmentRoutingAgent'
          }
        },
        timeMs: 0
      };
    }
    const deptResult = deptOutcome.result;
    agentDecisions.push({ ...deptResult.decisionLog, executionTimeMs: deptOutcome.timeMs, decisionId: uuidv4() });

    // Calculate final confidence score (ignoring failed agents with 0 confidence to prevent bringing down overall score artificially)
    const validDecisions = agentDecisions.filter(d => d.confidence > 0);
    const avgConfidence = validDecisions.length > 0 
      ? validDecisions.reduce((acc, curr) => acc + curr.confidence, 0) / validDecisions.length
      : 0.5;

    let finalStatus: 'accepted' | 'rejected' | 'needs_human_review' = 'accepted';
    if (avgConfidence < 0.6 || !locationResult.isPlausible) {
      finalStatus = 'needs_human_review';
    }

    const totalExecutionTimeMs = Date.now() - totalStartTime;

    return {
      requestId,
      status: finalStatus,
      category: visionResult.category,
      severity: severityResult.level,
      department: deptResult.department,
      isDuplicate: duplicateResult.isDuplicate,
      duplicateOfId: duplicateResult.duplicateOfId,
      locationConfidence: locationResult.confidence,
      confidenceScore: avgConfidence,
      agentDecisions,
      totalExecutionTimeMs,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error(`Supervisor Agent Failed [Request ID: ${requestId}]:`, error);
    // Don't silently use fallbacks without storing the actual error in the decisions array
    return {
      requestId,
      status: 'needs_human_review',
      category: 'Other',
      severity: 'Medium',
      department: 'General Services',
      isDuplicate: false,
      confidenceScore: 0,
      agentDecisions: [
        {
          decisionId: uuidv4(),
          confidence: 0,
          explanation: `Critical failure in supervisor coordinator: ${error.message || error}`,
          reasoning: error.stack || String(error),
          timestamp: new Date().toISOString(),
          agentName: 'SupervisorAgent',
          executionTimeMs: Date.now() - totalStartTime
        }
      ],
      totalExecutionTimeMs: Date.now() - totalStartTime,
      timestamp: new Date().toISOString()
    };
  }
};
