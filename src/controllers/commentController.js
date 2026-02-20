const Comment = require("../models/Comment");

exports.createCommentOnAnswer = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.create({
      text: text.trim(),
      parentId: req.params.answerId,
      parentType: "Answer",
      user: req.user,
    });

    const populated = await Comment.findById(comment._id).populate("user", "username");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.createCommentOnComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const comment = await Comment.create({
      text: text.trim(),
      parentId: req.params.commentId,
      parentType: "Comment",
      user: req.user,
    });

    const populated = await Comment.findById(comment._id).populate("user", "username");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.getCommentsByParent = async (req, res, next) => {
  try {
    const { parentId } = req.params;

    // Get direct children comments
    const comments = await Comment.find({ parentId })
      .populate("user", "username")
      .sort({ createdAt: 1 });

    // For each comment, recursively fetch its replies
    const buildThread = async (parentComments) => {
      const result = [];
      for (const comment of parentComments) {
        const replies = await Comment.find({ parentId: comment._id, parentType: "Comment" })
          .populate("user", "username")
          .sort({ createdAt: 1 });

        const nestedReplies = replies.length > 0 ? await buildThread(replies) : [];

        result.push({
          ...comment.toObject(),
          replies: nestedReplies,
        });
      }
      return result;
    };

    const threaded = await buildThread(comments);

    res.json(threaded);
  } catch (err) {
    next(err);
  }
};
