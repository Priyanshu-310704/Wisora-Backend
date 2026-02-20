const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  searchQuestions,
  getUserQuestions,
} = require("../controllers/questionController");

router.post("/", protect, createQuestion);
router.get("/", getQuestions);
router.get("/search", searchQuestions);
router.get("/user/:userId", getUserQuestions);
router.get("/:id", getQuestionById);

module.exports = router;
