import { db } from "../firebaseAdmin";

export const PERSISTENT_CATEGORIES = [
  "pothole",
  "broken_road",
  "broken road",
  "street_light",
  "broken_streetlight",
  "broken streetlight",
  "water_leakage",
  "water leakage",
  "garbage",
  "trash",
  "damaged_footpath",
  "damaged footpath"
];

export const TEMPORARY_CATEGORIES = [
  "accident",
  "flooding",
  "fallen_tree",
  "fallen tree",
  "road_closure",
  "road closure",
  "public_event_obstruction",
  "public event obstruction"
];

export function isPersistentIssue(category: string): boolean {
  if (!category) return false;
  const cat = category.toLowerCase().replace(/_/g, " ");
  return PERSISTENT_CATEGORIES.some(item => cat.includes(item) || item.includes(cat));
}

export function isTemporaryIssue(category: string): boolean {
  if (!category) return false;
  const cat = category.toLowerCase().replace(/_/g, " ");
  return TEMPORARY_CATEGORIES.some(item => cat.includes(item) || item.includes(cat));
}

export function getExpiryDurationMs(): number {
  const envValue = process.env.TEMPORARY_ISSUE_EXPIRY_SECONDS;
  const seconds = envValue ? parseInt(envValue, 10) : 900; // default to 15 minutes (900 seconds)
  return seconds * 1000;
}

/**
 * Checks if a temporary report has expired, and if so, transitions its status to 'needs_reverification'.
 * Writes the update back to Firestore if needed and returns the updated data.
 */
export async function checkAndTransitionReport(reportId: string, data: any): Promise<any> {
  if (!data) return data;
  
  const category = data.aiDecision?.category || data.category || "";
  const status = data.status || "pending";
  
  // Active statuses
  const isActive = ["pending", "in_progress", "processing", "escalated", "reported", "assigned"].includes(status);
  
  if (isActive && isTemporaryIssue(category)) {
    const createdAtMs = new Date(data.createdAt).getTime();
    const nowMs = Date.now();
    const expiryMs = getExpiryDurationMs();
    
    if (nowMs - createdAtMs > expiryMs) {
      console.log(`[Lifecycle] Report ${reportId} (${category}) expired. Transitioning to 'needs_reverification'.`);
      const updatedFields = {
        status: "needs_reverification",
        updatedAt: new Date().toISOString()
      };
      
      try {
        await db.collection("reports").doc(reportId).update(updatedFields);
        return {
          ...data,
          ...updatedFields
        };
      } catch (err) {
        console.error(`[Lifecycle] Failed to update expired report ${reportId}:`, err);
      }
    }
  }
  return data;
}

/**
 * Processes an array of reports, running the transition check for each.
 */
export async function checkAndTransitionAllReports(reports: any[]): Promise<any[]> {
  const updatedReports = [];
  for (const r of reports) {
    if (r && r.id) {
      const updated = await checkAndTransitionReport(r.id, r);
      updatedReports.push(updated);
    } else {
      updatedReports.push(r);
    }
  }
  return updatedReports;
}
