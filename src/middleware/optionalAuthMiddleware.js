const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    // If token is invalid, we still proceed but without req.user
    next();
  }
};
