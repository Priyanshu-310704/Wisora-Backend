const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createTopic,
  getTopics
} = require("../controllers/topicController");

router.post("/", protect, createTopic);
router.get("/", getTopics);

module.exports = router;
