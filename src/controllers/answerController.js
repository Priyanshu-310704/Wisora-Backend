const Answer = require("../models/Answer");
const Question = require("../models/Question");
const Notification = require("../models/Notification");
const Like = require("../models/Like");
const Group = require("../models/Group");

exports.createAnswer = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Answer text is required" });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    // Verify group membership if question is in a group
    if (question.group) {
      const group = await Group.findById(question.group);
      if (group && !group.members.includes(req.user)) {
        return res.status(403).json({ message: "Not authorized to reply in this group" });
      }
    }

    const answer = await Answer.create({
      text: text.trim(),
      question: req.params.questionId,
      user: req.user,
    });

    // Create notification for question owner if not responding to self
    if (question.user.toString() !== req.user) {
      await Notification.create({
        recipient: question.user,
        sender: req.user,
        type: "answer",
        question: question._id,
      });
    }

    const populated = await Answer.findById(answer._id).populate("user", "username profilePicture");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.getAnswersByQuestion = async (req, res, next) => {
  try {
    const answers = await Answer.find({ question: req.params.questionId })
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.json(answers);
  } catch (err) {
    next(err);
  }
};

exports.updateAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    if (answer.user.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    answer.text = req.body.text;
    await answer.save();

    const populated = await Answer.findById(answer._id).populate("user", "username profilePicture");

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.deleteAnswer = async (req, res, next) => {
  try {
    const answer = await Answer.findById(req.params.id);

    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    if (answer.user.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Cleanup likes
    await Like.deleteMany({ targetId: answer._id, targetType: "Answer" });

    await answer.deleteOne();

    res.json({ message: "Answer deleted" });
  } catch (err) {
    next(err);
  }
};

exports.getUserAnswers = async (req, res, next) => {
  try {
    const answers = await Answer.find({ user: req.params.userId })
      .populate("question", "title")
      .sort({ createdAt: -1 });

    res.json(answers);
  } catch (err) {
    next(err);
  }
};
