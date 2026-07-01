import { Router } from "express";

const router = Router();

router.get("/dashboard", (req, res) => {
  res.json({ status: "ok", message: "Dashboard stats endpoint placeholder" });
});

router.get("/heatmap", (req, res) => {
  res.json({ status: "ok", message: "Heatmap data endpoint placeholder" });
});

export default router;
