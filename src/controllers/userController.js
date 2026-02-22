const User = require("../models/User");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const cloudinary = require("../config/cloudinary");

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username")
      .populate("following", "username");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get stats
    const questionsCount = await Question.countDocuments({ user: user._id });
    const answersCount = await Answer.countDocuments({ user: user._id });

    res.json({
      ...user.toObject(),
      questionsCount,
      answersCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { username, bio, profilePicture, coverImage } = req.body;

    // Only allow updating own profile
    if (req.params.id !== req.user) {
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;

    if (profilePicture && profilePicture.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(profilePicture, {
        folder: "wisora/profiles",
      });
      user.profilePicture = uploadRes.secure_url;
    }

    if (coverImage && coverImage.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(coverImage, {
        folder: "wisora/covers",
      });
      user.coverImage = uploadRes.secure_url;
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      coverImage: user.coverImage,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleFollow = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user);
    const targetUser = await User.findById(req.params.targetId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user === req.params.targetId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetUser._id.toString()
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
      await currentUser.save();
      await targetUser.save();
      return res.json({ following: false, message: "User unfollowed" });
    }

    // Follow
    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);
    await currentUser.save();
    await targetUser.save();

    res.json({ following: true, message: "User followed" });
  } catch (err) {
    next(err);
  }
};
