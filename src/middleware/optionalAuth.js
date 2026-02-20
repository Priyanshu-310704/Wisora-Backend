const jwt = require("jsonwebtoken");

// Like protect middleware but doesn't fail if no token — just sets req.user if available
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
  } catch {
    req.user = null;
  }

  next();
};
