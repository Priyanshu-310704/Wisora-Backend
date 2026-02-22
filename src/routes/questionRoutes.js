const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  searchQuestions,
  getUserQuestions,
  deleteQuestion,
} = require("../controllers/questionController");
const optionalProtect = require("../middleware/optionalAuthMiddleware");

router.post("/", protect, createQuestion);
router.get("/", getQuestions);
router.get("/search", searchQuestions);
router.get("/user/:userId", getUserQuestions);
router.get("/:id", optionalProtect, getQuestionById);
router.delete("/:id", protect, deleteQuestion);

module.exports = router;
