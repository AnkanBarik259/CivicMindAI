import { Router } from "express";
import { requireAuth } from "./middleware/auth";
import { upload } from "./middleware/upload";
import { runSupervisorAgent, ReportPayload } from "./agents/supervisor";
import { db } from "./firebaseAdmin";
import { uploadBufferToCloudinary } from "./cloudinary";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { checkAndTransitionAllReports, checkAndTransitionReport, isPersistentIssue } from "./agents/lifecycle";


const router = Router();

const ReportSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  lat: z.coerce.number().min(-90).max(90).optional().default(0),
  lng: z.coerce.number().min(-180).max(180).optional().default(0),
  address: z.string().optional().default(""),
});

// Use express.json() for this route, or rely on the global body parser
router.post("/", requireAuth, upload.array("images", 5), async (req, res) => {
  try {
    // 1. Validation
    const parsed = ReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }

    const { title, description, lat, lng, address } = parsed.data;
    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];

    // Pre-allocate a Firestore Document Reference to obtain the reportId
    const docRef = db.collection("reports").doc();
    const reportId = docRef.id;
    const userId = req.user.uid;

    // Validate file types and sizes before starting any uploads
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

    if (files && files.length > 0) {
      for (const file of files) {
        // Size validation
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: `File too large: ${file.originalname}. Maximum allowed size is 5MB.`,
          });
        }
        // MimeType validation
        if (!allowedMimeTypes.includes(file.mimetype) && !file.mimetype.startsWith("image/")) {
          return res.status(400).json({
            error: `Invalid file type: ${file.originalname}. Only image files are allowed.`,
          });
        }
      }

      // 2. Upload to Cloudinary, organizing folders by userId and reportId
      try {
        const folder = `reports/${userId}/${reportId}`;
        for (const [index, file] of files.entries()) {
          const fileName = `img_${index}_${uuidv4()}`;
          const secureUrl = await uploadBufferToCloudinary(file.buffer, folder, fileName);
          imageUrls.push(secureUrl);
        }
      } catch (cloudinaryError: any) {
         console.error("Cloudinary upload error:", cloudinaryError);
         return res.status(500).json({
           error: "Failed to upload images to Cloudinary",
           details: cloudinaryError.message,
         });
      }
    }

    const payload: ReportPayload = {
      title,
      description,
      location: { 
        lat, 
        lng,
        latitude: lat,
        longitude: lng,
        address: address || ""
      },
      imageUrls,
      userId,
    };

    // 3. Initial Save to Firestore
    const reportData = {
      ...payload,
      imageUrl: imageUrls[0] || null, // Ensure backwards compatibility for layouts looking for a single imageUrl
      status: 'processing', // AI Analysis in Progress
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(reportData);

    // 4. Return immediately to unblock the user
    res.status(201).json({ status: "ok", id: reportId, message: "AI Analysis in Progress" });

    // 5. Run Supervisor Agent Asynchronously
    Promise.resolve().then(async () => {
      try {
        const aiDecision = await runSupervisorAgent(payload);
        
        await docRef.update({
          aiDecision,
          status: aiDecision.status === 'rejected' ? 'rejected' : 'pending',
          updatedAt: new Date().toISOString()
        });
      } catch (agentError) {
        console.error(`Supervisor Agent Error for report ${reportId}:`, agentError);
        await docRef.update({
          status: 'pending', // Fallback to pending if AI fails
          updatedAt: new Date().toISOString()
        });
      }
    });
  } catch (error: any) {
    console.error("Report Creation Error:", error);
    res.status(500).json({ error: "Failed to create report", details: error.message, stack: error.stack });
  }
});

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("reports")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
      
    const rawReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Process lifecycle transitions automatically on fetch
    const reports = await checkAndTransitionAllReports(rawReports);
    res.json({ status: "ok", reports });
  } catch (error) {
    console.error("Fetch Reports Error:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("reports").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }
    const rawReport = { id: doc.id, ...doc.data() };
    const report = await checkAndTransitionReport(doc.id, rawReport);
    res.json({ status: "ok", report });
  } catch (error) {
    console.error("Get Report Error:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// Community Reverification
router.post("/:id/reverify", requireAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { vote } = req.body; // 'still_exists' or 'cleared'
    const userId = req.user.uid;
    const userName = req.user.name || req.user.email?.split("@")[0] || "Citizen";

    if (vote !== "still_exists" && vote !== "cleared") {
      return res.status(400).json({ error: "Invalid vote option. Must be 'still_exists' or 'cleared'." });
    }

    const reportRef = db.collection("reports").doc(reportId);
    const doc = await reportRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = doc.data() || {};
    const category = report.aiDecision?.category || report.category || "";
    const isPersistent = isPersistentIssue(category);

    // Initialize/retrieve reverification object
    const reverification = report.reverification || { stillExistsUsers: [], clearedUsers: [] };
    if (!reverification.stillExistsUsers) reverification.stillExistsUsers = [];
    if (!reverification.clearedUsers) reverification.clearedUsers = [];

    // Apply vote changes
    if (vote === "still_exists") {
      if (!reverification.stillExistsUsers.includes(userId)) {
        reverification.stillExistsUsers.push(userId);
      }
      reverification.clearedUsers = reverification.clearedUsers.filter((id: string) => id !== userId);
    } else {
      if (!reverification.clearedUsers.includes(userId)) {
        reverification.clearedUsers.push(userId);
      }
      reverification.stillExistsUsers = reverification.stillExistsUsers.filter((id: string) => id !== userId);
    }

    let nextStatus = report.status || "pending";
    let statusChanged = false;
    let commentText = "";

    if (vote === "still_exists") {
      // "If users confirm 'Still Exists', reset the report to Active."
      nextStatus = "pending";
      statusChanged = true;
      commentText = `Community verification: ${userName} confirmed the issue still exists. Status is reset to Active.`;
      
      // Clear votes for a fresh lifecycle start
      reverification.stillExistsUsers = [];
      reverification.clearedUsers = [];
    } else {
      // vote is 'cleared'
      // If it is persistent and currently waiting for verification:
      if (isPersistent && report.status === "awaiting_verification") {
        nextStatus = "resolved";
        statusChanged = true;
        commentText = `Community verification: ${userName} confirmed the repair is complete. Persistent issue has been verified and marked as Resolved.`;
        
        reverification.stillExistsUsers = [];
        reverification.clearedUsers = [];
      } else {
        // "If multiple users confirm 'Cleared', automatically mark the report as Resolved."
        const totalCleared = reverification.clearedUsers.length;
        if (totalCleared >= 2) {
          nextStatus = "resolved";
          statusChanged = true;
          commentText = `Community verification: Multiple users (${totalCleared}/2) confirmed the issue is cleared. Marked automatically as Resolved.`;
          
          reverification.stillExistsUsers = [];
          reverification.clearedUsers = [];
        } else {
          commentText = `Community verification: ${userName} voted that the issue is cleared. (${totalCleared}/2 confirmations received).`;
        }
      }
    }

    const updatedData: any = {
      reverification,
      updatedAt: new Date().toISOString()
    };
    if (statusChanged) {
      updatedData.status = nextStatus;
    }

    await reportRef.update(updatedData);

    // Add a system-generated comment for transparency
    const systemComment = {
      userId: "system",
      userName: "CivicMind System",
      text: commentText,
      createdAt: new Date().toISOString()
    };
    await reportRef.collection("comments").add(systemComment);

    res.json({
      status: "ok",
      report: { id: reportId, ...report, ...updatedData },
      comment: systemComment
    });
  } catch (error: any) {
    console.error("Reverification Error:", error);
    res.status(500).json({ error: "Failed to record reverification vote", details: error.message });
  }
});

// Authority Resolve Endpoint
router.post("/:id/resolve", requireAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.uid;

    // Verify user role
    const userDoc = await db.collection("users").doc(userId).get();
    const userRole = userDoc.data()?.role || "citizen";
    if (userRole !== "authority" && userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only authorities can mark issues resolved." });
    }

    const reportRef = db.collection("reports").doc(reportId);
    const doc = await reportRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = doc.data() || {};
    const category = report.aiDecision?.category || report.category || "";
    const isPersistent = isPersistentIssue(category);

    let nextStatus = "resolved";
    let commentText = "";

    if (isPersistent) {
      // "Persistent Issues remain ACTIVE until an authority marks them resolved and the AI or community verifies the repair."
      nextStatus = "awaiting_verification";
      commentText = `Designated authority has marked this persistent issue as resolved. Awaiting community verification to finalize repair status.`;
    } else {
      nextStatus = "resolved";
      commentText = `Designated authority has successfully resolved this issue.`;
    }

    const updatedFields = {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      resolvedAt: nextStatus === "resolved" ? new Date().toISOString() : null
    };

    await reportRef.update(updatedFields);

    // Add a system comment recording the authority action
    const systemComment = {
      userId: userId,
      userName: userDoc.data()?.name || "Designated Authority",
      text: commentText,
      createdAt: new Date().toISOString()
    };
    await reportRef.collection("comments").add(systemComment);

    res.json({
      status: "ok",
      report: { id: reportId, ...report, ...updatedFields },
      comment: systemComment
    });
  } catch (error: any) {
    console.error("Authority Resolution Error:", error);
    res.status(500).json({ error: "Failed to update resolution status", details: error.message });
  }
});

// Post a comment to a report
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }
    const commentData = {
      userId: req.user.uid,
      userName: req.user.name || req.user.email.split('@')[0],
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    const commentRef = await db.collection("reports").doc(reportId).collection("comments").add(commentData);
    res.json({ status: "ok", comment: { id: commentRef.id, ...commentData } });
  } catch (error: any) {
    console.error("Add Comment Error:", error);
    res.status(500).json({ error: "Failed to add comment", details: error.message });
  }
});

// Fetch comments for a report
router.get("/:id/comments", async (req, res) => {
  try {
    const reportId = req.params.id;
    const snapshot = await db.collection("reports").doc(reportId).collection("comments").orderBy("createdAt", "asc").get();
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ status: "ok", comments });
  } catch (error) {
    console.error("Fetch Comments Error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

export default router;
