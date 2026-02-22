const User = require("../models/User");
const Question = require("../models/Question");
const Answer = require("../models/Answer");
const Notification = require("../models/Notification");
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
    const userToFollow = await User.findById(req.params.targetId);

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user === req.params.targetId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userToFollow._id.toString()
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
      await currentUser.save();
      await userToFollow.save();
      res.json({ following: false, message: "User unfollowed" });
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      
      await currentUser.save();
      await userToFollow.save();

      // Create notification
      await Notification.create({
        recipient: userToFollow._id,
        sender: req.user,
        type: "follow",
      });

      res.json({ following: true, message: "User followed" });
    }
  } catch (err) {
    next(err);
  }
};

exports.getSuggestedUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user);
    
    // Get 5 users that the current user doesn't follow and aren't themselves
    const suggested = await User.find({
      _id: { $nin: [...currentUser.following, currentUser._id] }
    })
    .select("username profilePicture bio")
    .limit(5);

    res.json(suggested);
  } catch (err) {
    next(err);
  }
};

exports.getCommunityUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = { _id: { $ne: req.user } };
    
    if (search) {
      query.username = { $regex: search, $options: "i" };
    }

    const users = await User.find(query)
      .select("username profilePicture bio followers following")
      .limit(50);

    res.json(users);
  } catch (err) {
    next(err);
  }
};
