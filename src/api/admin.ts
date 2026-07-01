import { Router } from "express";

const router = Router();

router.get("/users", (req, res) => {
  res.json({ status: "ok", message: "List users endpoint placeholder" });
});

router.get("/departments", (req, res) => {
  res.json({ status: "ok", message: "List departments endpoint placeholder" });
});

export default router;
