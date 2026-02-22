const Group = require("../models/Group");
const Question = require("../models/Question");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, profilePicture, coverImage, isPrivate } = req.body;
    
    const group = new Group({
      name,
      description,
      owner: req.user,
      members: [req.user],
      isPrivate: isPrivate !== undefined ? isPrivate : true
    });

    if (profilePicture && profilePicture.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(profilePicture, {
        folder: "wisora/groups/profiles",
      });
      group.profilePicture = uploadRes.secure_url;
    }

    if (coverImage && coverImage.startsWith("data:image")) {
      const uploadRes = await cloudinary.uploader.upload(coverImage, {
        folder: "wisora/groups/covers",
      });
      group.coverImage = uploadRes.secure_url;
    }

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

exports.getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user })
      .populate("owner", "username profilePicture")
      .sort("-createdAt");
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

exports.getPublicGroups = async (req, res, next) => {
  try {
    // Return all public groups that the user is NOT already a member of
    const groups = await Group.find({
      isPrivate: false,
      members: { $ne: req.user }
    })
    .populate("owner", "username profilePicture")
    .sort("-createdAt")
    .limit(20);
    
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

exports.joinGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.isPrivate) {
      return res.status(403).json({ message: "Cannot self-join private groups. Invite required." });
    }

    if (group.members.some(id => id.toString() === req.user)) {
      return res.status(400).json({ message: "Already a member" });
    }

    group.members.push(req.user);
    await group.save();

    res.json({ message: "Successfully joined the group", group });
  } catch (err) {
    next(err);
  }
};

exports.getGroupDetails = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("owner", "username profilePicture")
      .populate("members", "username profilePicture bio");

    if (!group) return res.status(404).json({ message: "Group not found" });

    // Verify privacy
    if (group.isPrivate && !group.members.some(m => m._id.toString() === req.user)) {
      return res.status(403).json({ message: "Access denied. Private group." });
    }

    // Get group questions
    const questions = await Question.find({ group: group._id })
      .populate("user", "username profilePicture")
      .sort("-createdAt");

    res.json({ group, questions });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Only owner can add members
    if (group.owner.toString() !== req.user) {
      return res.status(403).json({ message: "Not authorized to manage members" });
    }

    const userToAdd = await User.findById(req.params.userId);
    if (!userToAdd) return res.status(404).json({ message: "User not found" });

    if (group.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    group.members.push(userToAdd._id);
    await group.save();

    res.json({ message: "Member added successfully" });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.owner.toString() !== req.user && req.params.userId !== req.user) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (group.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: "Owner cannot leave the group" });
    }

    group.members = group.members.filter(m => m.toString() !== req.params.userId);
    await group.save();

    res.json({ message: "Member removed successfully" });
  } catch (err) {
    next(err);
  }
};
