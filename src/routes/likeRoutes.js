const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");
const { toggleLike, getLikeInfo } = require("../controllers/likeController");

router.post("/toggle", protect, toggleLike);
router.get("/:targetId", optionalAuth, getLikeInfo);

module.exports = router;
