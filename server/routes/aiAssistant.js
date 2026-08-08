const express = require("express");
const {
  getHealth,
  chat,
} = require("../controllers/aiAssistantController");

const router = express.Router();

router.get("/health", getHealth);
router.post("/chat", chat);

module.exports = router;