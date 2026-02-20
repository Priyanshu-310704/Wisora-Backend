const Topic = require("../models/Topic");

exports.createTopic = async (req, res, next) => {
  try {
    const topic = await Topic.create({ name: req.body.name });
    res.status(201).json(topic);
  } catch (err) {
    next(err);
  }
};

exports.getTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find();
    res.json(topics);
  } catch (err) {
    next(err);
  }
};
