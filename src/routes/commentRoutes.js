const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createCommentOnAnswer,
  createCommentOnComment,
  getCommentsByParent,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

router.post("/answer/:answerId", protect, createCommentOnAnswer);
router.post("/comment/:commentId", protect, createCommentOnComment);
router.get("/:parentId", getCommentsByParent);
router.put("/:id", protect, updateComment);
router.delete("/:id", protect, deleteComment);

module.exports = router;
