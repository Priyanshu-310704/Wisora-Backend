const Question = require("../models/Question");
const Answer = require("../models/Answer");
const Topic = require("../models/Topic");

exports.createQuestion = async (req, res, next) => {
  try {
    const { title, body, topics } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    // If topics are provided as names (strings), resolve them to ObjectIds
    let topicIds = [];
    if (topics && topics.length > 0) {
      for (const t of topics) {
        // Check if it's already an ObjectId-like string (24 hex chars)
        if (/^[0-9a-fA-F]{24}$/.test(t)) {
          topicIds.push(t);
        } else {
          // Find or create topic by name
          let topic = await Topic.findOne({ name: { $regex: new RegExp(`^${t}$`, "i") } });
          if (!topic) {
            topic = await Topic.create({ name: t });
          }
          topicIds.push(topic._id);
        }
      }
    }

    const question = await Question.create({
      title,
      body,
      topics: topicIds,
      user: req.user,
    });

    const populated = await Question.findById(question._id)
      .populate("user", "username")
      .populate("topics", "name");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.getQuestions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const questions = await Question.find()
      .populate("user", "username")
      .populate("topics", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Add answer count to each question
    const questionsWithCounts = await Promise.all(
      questions.map(async (q) => {
        const answerCount = await Answer.countDocuments({ question: q._id });
        return { ...q.toObject(), answerCount };
      })
    );

    const total = await Question.countDocuments();

    res.json({
      questions: questionsWithCounts,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    next(err);
  }
};

exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("user", "username")
      .populate("topics", "name");

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const answerCount = await Answer.countDocuments({ question: question._id });

    res.json({ ...question.toObject(), answerCount });
  } catch (err) {
    next(err);
  }
};

exports.searchQuestions = async (req, res, next) => {
  try {
    const { text, tag } = req.query;
    let filter = {};

    if (text && text.trim()) {
      filter.$text = { $search: text };
    }

    if (tag && tag.trim()) {
      // tag is a topic name — find the topic first
      const topic = await Topic.findOne({ name: { $regex: new RegExp(`^${tag}$`, "i") } });
      if (topic) {
        filter.topics = topic._id;
      } else {
        // No matching topic → return empty
        return res.json([]);
      }
    }

    const questions = await Question.find(filter)
      .populate("user", "username")
      .populate("topics", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    // Add answer count
    const questionsWithCounts = await Promise.all(
      questions.map(async (q) => {
        const answerCount = await Answer.countDocuments({ question: q._id });
        return { ...q.toObject(), answerCount };
      })
    );

    res.json(questionsWithCounts);
  } catch (err) {
    next(err);
  }
};

exports.getUserQuestions = async (req, res, next) => {
  try {
    const questions = await Question.find({ user: req.params.userId })
      .populate("user", "username")
      .populate("topics", "name")
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (err) {
    next(err);
  }
};
