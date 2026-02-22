const Comment = require("../models/Comment");
const Answer = require("../models/Answer");
const Notification = require("../models/Notification");
const Like = require("../models/Like");

exports.createCommentOnAnswer = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { answerId } = req.params;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const answer = await Answer.findById(answerId);
    if (!answer) return res.status(404).json({ message: "Answer not found" });

    const comment = await Comment.create({
      text: text.trim(),
      parentId: answerId,
      parentType: "Answer",
      user: req.user,
    });

    // Notify answer owner
    if (answer.user.toString() !== req.user) {
      await Notification.create({
        recipient: answer.user,
        sender: req.user,
        type: "comment",
        question: answer.question, // Reference the question for easier lookup
      });
    }

    const populated = await Comment.findById(comment._id).populate("user", "username profilePicture");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.createCommentOnComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { commentId } = req.params;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) return res.status(404).json({ message: "Comment not found" });

    const comment = await Comment.create({
      text: text.trim(),
      parentId: commentId,
      parentType: "Comment",
      user: req.user,
    });

    // Notify parent comment owner
    if (parentComment.user.toString() !== req.user) {
      // Find the question ID from the chain (Simplified: we need to pass it or look it up)
      // For now, let's keep it simple or look it up if possible
      let questionId = null;
      if (parentComment.parentType === "Answer") {
        const ans = await Answer.findById(parentComment.parentId);
        questionId = ans?.question;
      }
      
      await Notification.create({
        recipient: parentComment.user,
        sender: req.user,
        type: "comment",
        question: questionId
      });
    }

    const populated = await Comment.findById(comment._id).populate("user", "username profilePicture");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.getCommentsByParent = async (req, res, next) => {
  try {
    const { parentId } = req.params;

    // Fetch ALL comments for this answer (parentId can be the answer or a comment in the chain)
    // To properly optimize, we'd need to fetch the entire subtree. 
    // Given the small scale, we'll fetch direct children and their replies.
    
    // 1. Get direct children
    const comments = await Comment.find({ parentId })
      .populate("user", "username profilePicture")
      .sort({ createdAt: 1 });

    // 2. Fetch all replies for these comments in one query
    const commentIds = comments.map(c => c._id);
    const allReplies = await Comment.find({ 
      parentId: { $in: commentIds }, 
      parentType: "Comment" 
    })
    .populate("user", "username profilePicture")
    .sort({ createdAt: 1 });

    // 3. Assemble (2 levels deep for now is standard for this kind of UI)
    const threaded = comments.map(c => {
      const replies = allReplies.filter(r => r.parentId.toString() === c._id.toString());
      return {
        ...c.toObject(),
        replies: replies.map(r => r.toObject())
      };
    });

    res.json(threaded);
  } catch (err) {
    next(err);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    comment.text = req.body.text.trim();
    await comment.save();

    const populated = await Comment.findById(comment._id).populate("user", "username profilePicture");
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete children comments if any
    await Comment.deleteMany({ parentId: comment._id, parentType: "Comment" });
    
    // Cleanup likes
    await Like.deleteMany({ targetId: comment._id, targetType: "Comment" });

    await comment.deleteOne();

    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
};
