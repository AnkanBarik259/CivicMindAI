import { Router } from "express";
import { requireAuth } from "./middleware/auth";
import { db } from "./firebaseAdmin";

const router = Router();

router.post("/login", requireAuth, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Check if user exists in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    let role = req.body.role || 'citizen';
    if (!userDoc.exists) {
      // Create user doc
      await userRef.set({
        email: req.user?.email || req.body.email || '',
        name: req.body.name || req.user?.name || '',
        role: role,
        createdAt: new Date().toISOString()
      });
    } else {
      role = userDoc.data()?.role || role;
    }
    
    res.json({ status: "ok", user: { id: uid, role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

router.post("/register", (req, res) => {
  res.json({ status: "ok", message: "Register endpoint placeholder" });
});

router.post("/logout", (req, res) => {
  res.json({ status: "ok", message: "Logout endpoint placeholder" });
});

router.get("/profile", requireAuth, (req, res) => {
  res.json({ status: "ok", user: req.user });
});

export default router;
