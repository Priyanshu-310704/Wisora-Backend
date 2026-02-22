const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  images: [{ type: String }],
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null }
}, { timestamps: true });

questionSchema.index({ title: "text", body: "text" });

module.exports = mongoose.model("Question", questionSchema);
