const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const questionRoutes = require("./routes/questionRoutes");
const answerRoutes = require("./routes/answerRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicRoutes = require("./routes/topicRoutes");
const likeRoutes = require("./routes/likeRoutes");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(helmet());
app.use(morgan("dev"));
const allowedOrigins = JSON.parse(process.env.CLIENT_URL);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/likes", likeRoutes);

app.use(errorHandler);

module.exports = app;
