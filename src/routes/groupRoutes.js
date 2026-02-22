const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createGroup,
  getMyGroups,
  getPublicGroups,
  getGroupDetails,
  joinGroup,
  addMember,
  removeMember
} = require("../controllers/groupController");

router.post("/", protect, createGroup);
router.get("/me", protect, getMyGroups);
router.get("/public", protect, getPublicGroups);
router.get("/:id", protect, getGroupDetails);
router.post("/:id/join", protect, joinGroup);
router.post("/:groupId/members/:userId", protect, addMember);
router.delete("/:groupId/members/:userId", protect, removeMember);

module.exports = router;
