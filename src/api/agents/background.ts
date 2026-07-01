import { runEscalationAgent } from "./escalation";
import { runAnalyticsAgent } from "./analytics";
import { db } from "../firebaseAdmin";
import { v4 as uuidv4 } from "uuid";
import { checkAndTransitionAllReports } from "./lifecycle";

export const startBackgroundSupervisor = () => {
  console.log("Starting Background Supervisor Tasks...");

  // Run lifecycle check for temporary issues every 2 minutes
  setInterval(async () => {
    try {
      console.log("Running periodic report lifecycle check...");
      const snapshot = await db.collection("reports").get();
      const rawReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      await checkAndTransitionAllReports(rawReports);
    } catch (error) {
      console.error("Background Lifecycle Task Failed:", error);
    }
  }, 2 * 60 * 1000);

  // Run every 10 minutes
  setInterval(async () => {
    try {
      console.log("Running periodic Escalation Agent check...");
      const escalationResult = await runEscalationAgent();
      
      if (escalationResult.escalatedIds.length > 0) {
        console.log(`Escalating ${escalationResult.escalatedIds.length} reports.`);
        const batch = db.batch();
        for (const id of escalationResult.escalatedIds) {
          const ref = db.collection("reports").doc(id);
          batch.update(ref, {
            "status": "escalated",
            "escalatedAt": new Date().toISOString(),
            "escalationReason": escalationResult.decisionLog.reasoning
          });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error("Background Escalation Task Failed:", error);
    }
  }, 10 * 60 * 1000);

  // Run analytics daily (simulated for every 12 hours)
  setInterval(async () => {
    try {
      console.log("Running periodic Analytics Agent generation...");
      const analyticsResult = await runAnalyticsAgent();
      
      await db.collection("analytics").add({
        ...analyticsResult,
        createdAt: new Date().toISOString()
      });
      console.log("Saved new analytics report.");
    } catch (error) {
      console.error("Background Analytics Task Failed:", error);
    }
  }, 12 * 60 * 60 * 1000);
};

