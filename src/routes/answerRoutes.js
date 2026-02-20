const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createAnswer,
  getAnswersByQuestion,
  updateAnswer,
  deleteAnswer,
} = require("../controllers/answerController");

router.post("/:questionId", protect, createAnswer);
router.get("/question/:questionId", getAnswersByQuestion);
router.put("/:id", protect, updateAnswer);
router.delete("/:id", protect, deleteAnswer);

module.exports = router;
