const Answer = require("../models/Answer");

exports.createAnswer = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Answer text is required" });
    }

    const answer = await Answer.create({
      text: text.trim(),
      question: req.params.questionId,
      user: req.user,
    });

    const populated = await Answer.findById(answer._id).populate("user", "username");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.getAnswersByQuestion = async (req, res, next) => {
  try {
    const answers = await Answer.find({ question: req.params.questionId })
      .populate("user", "username")
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

    const populated = await Answer.findById(answer._id).populate("user", "username");

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
