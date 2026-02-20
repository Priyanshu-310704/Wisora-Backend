const Like = require("../models/Like");

exports.toggleLike = async (req, res, next) => {
  try {
    const { targetId, targetType } = req.body;

    if (!targetId || !targetType) {
      return res.status(400).json({ message: "targetId and targetType are required" });
    }

    if (!["Question", "Answer", "Comment"].includes(targetType)) {
      return res.status(400).json({ message: "Invalid targetType" });
    }

    const existing = await Like.findOne({
      user: req.user,
      targetId,
      targetType,
    });

    if (existing) {
      await existing.deleteOne();
      const count = await Like.countDocuments({ targetId, targetType });
      return res.json({ liked: false, count });
    }

    await Like.create({ user: req.user, targetId, targetType });
    const count = await Like.countDocuments({ targetId, targetType });

    res.status(201).json({ liked: true, count });
  } catch (err) {
    next(err);
  }
};

exports.getLikeInfo = async (req, res, next) => {
  try {
    const { targetId } = req.params;
    const { targetType } = req.query;

    if (!targetType) {
      return res.status(400).json({ message: "targetType query param is required" });
    }

    const count = await Like.countDocuments({ targetId, targetType });

    let liked = false;
    // Check if user is authenticated (optional — public routes can still get count)
    if (req.user) {
      const existing = await Like.findOne({ user: req.user, targetId, targetType });
      liked = !!existing;
    }

    res.json({ liked, count });
  } catch (err) {
    next(err);
  }
};
