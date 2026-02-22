const Question = require("../models/Question");
const Answer = require("../models/Answer");
const Topic = require("../models/Topic");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Like = require("../models/Like");
const Group = require("../models/Group");
const cloudinary = require("../config/cloudinary");

exports.createQuestion = async (req, res, next) => {
  try {
    const { title, body, topics, images, groupId } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    // Verify group membership if part of a group
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(req.user)) {
        return res.status(403).json({ message: "Not authorized to post in this group" });
      }
    }

    // Upload images to Cloudinary if provided
    let imageUrls = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const uploadRes = await cloudinary.uploader.upload(image, {
          folder: "wisora/questions",
        });
        imageUrls.push(uploadRes.secure_url);
      }
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
      images: imageUrls,
      topics: topicIds,
      user: req.user,
      group: groupId || null
    });

    // Notify followers of the poster
    const user = await User.findById(req.user).select("followers");
    if (user && user.followers.length > 0) {
      const notifications = user.followers.map(followerId => ({
        recipient: followerId,
        sender: req.user,
        type: "question",
        question: question._id
      }));
      await Notification.insertMany(notifications);
    }

    const populated = await Question.findById(question._id)
      .populate("user", "username profilePicture")
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

    // Only show public questions (no group)
    const query = { group: null };

    const questions = await Question.find(query)
      .populate("user", "username profilePicture")
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

    const total = await Question.countDocuments(query);

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
      .populate("user", "username profilePicture")
      .populate("topics", "name")
      .populate("group", "name isPrivate members");

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Verify group privacy if part of a group
    if (question.group && question.group.isPrivate) {
      if (!req.user || !question.group.members.some(id => id.toString() === req.user.toString())) {
        return res.status(403).json({ message: "Access denied. Private group question." });
      }
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
    let filter = { group: null };

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
      .populate("user", "username profilePicture")
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
      .populate("user", "username profilePicture")
      .populate("topics", "name")
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (err) {
    next(err);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.user.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Capture answers before deleting question
    const answers = await Answer.find({ question: question._id });
    const answerIds = answers.map(a => a._id);

    // 1. Delete all answers
    await Answer.deleteMany({ question: question._id });

    // 2. Delete all likes for this question and its answers
    await Like.deleteMany({ 
      $or: [
        { targetId: question._id, targetType: "Question" },
        { targetId: { $in: answerIds }, targetType: "Answer" }
      ]
    });

    // 3. Delete all notifications related to this question
    await Notification.deleteMany({ question: question._id });

    // 4. Delete the question itself
    await question.deleteOne();

    res.json({ message: "Question and all associated data deleted" });
  } catch (err) {
    next(err);
  }
};
