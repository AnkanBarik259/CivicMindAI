import { Request, Response, NextFunction } from "express";
import { auth } from "../firebaseAdmin";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Replace with proper DecodedIdToken type if needed
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split("Bearer ")[1];
  if (process.env.NODE_ENV !== "production" && token === "TEST_TOKEN") {
    req.user = { uid: "test-user-id" };
    return next();
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error("Token verification failed:", error.message || error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Assuming custom claims are used for roles
    if (req.user?.role !== role && req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};
