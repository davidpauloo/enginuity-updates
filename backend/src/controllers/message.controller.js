// src/controllers/message.controller.js
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";

import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, recieverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal Server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    console.log('📤 SEND MESSAGE DEBUG START:');
    console.log('📤 Request body:', req.body);
    console.log('📤 Sender ID:', req.user._id);
    console.log('📤 Receiver ID:', req.params.id);
    
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      console.log('📤 Processing image upload...');
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
      console.log('📤 Image uploaded:', imageUrl);
    }

    console.log('📤 Creating new message...');
    const newMessage = new Message({
      senderId,
      receiverId, // Make sure this matches your schema
      text,
      image: imageUrl,
    });

    await newMessage.save();
    console.log('✅ Message saved to database:', newMessage._id);

    // Debug the socket emission process
    console.log('🔍 Looking for receiver socket...');
    const receiverSocketId = getReceiverSocketId(receiverId);
    
    if (receiverSocketId) {
      console.log('📤 Found receiver socket, emitting message...');
      console.log('📤 Socket ID:', receiverSocketId);
      console.log('📤 Message being sent:', newMessage);
      
      io.to(receiverSocketId).emit("newMessage", newMessage);
      console.log('✅ Message emitted successfully via Socket.IO');
    } else {
      console.log('❌ Receiver not online - socket ID not found');
    }

    console.log('📤 SEND MESSAGE DEBUG END - Responding to client');
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.log("❌ Error in sendMessage controller:", error.message);
    console.log("❌ Full error stack:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
};