const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createAnswer,
  getAnswersByQuestion,
  updateAnswer,
  deleteAnswer,
  getUserAnswers,
} = require("../controllers/answerController");

router.post("/:questionId", protect, createAnswer);
router.get("/question/:questionId", getAnswersByQuestion);
router.get("/user/:userId", getUserAnswers);
router.put("/:id", protect, updateAnswer);
router.delete("/:id", protect, deleteAnswer);

module.exports = router;
