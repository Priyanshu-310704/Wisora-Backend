const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getUser,
  updateUser,
  toggleFollow,
} = require("../controllers/userController");

router.get("/:id", getUser);
router.put("/:id", protect, updateUser);
router.post("/follow/:targetId", protect, toggleFollow);

module.exports = router;
