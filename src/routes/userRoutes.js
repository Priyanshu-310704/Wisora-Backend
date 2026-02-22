const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getUser,
  updateUser,
  toggleFollow,
  getSuggestedUsers,
  getCommunityUsers,
} = require("../controllers/userController");

router.get("/suggested", protect, getSuggestedUsers);
router.get("/community", protect, getCommunityUsers);
router.get("/:id", getUser);
router.put("/:id", protect, updateUser);
router.post("/follow/:targetId", protect, toggleFollow);

module.exports = router;
