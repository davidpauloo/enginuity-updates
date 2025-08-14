import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";



// SIGNUP
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save(); // Moved save before token for cleaner logic

    generateToken(newUser._id, res);
    console.log("✅ JWT cookie set:", res.getHeaders()["set-cookie"]);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.error("❌ Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('🔐 LOGIN ATTEMPT for email:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      console.log('❌ Invalid password for user:', email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log('✅ Password correct, generating token for user:', user._id);
    
    // Generate token and log the result
    const token = generateToken(user._id, res);
    console.log('🍪 Token generated:', token ? 'SUCCESS' : 'FAILED');
    console.log('🍪 Token length:', token ? token.length : 'N/A');
    
    // Log response headers being set
    console.log('📤 Response headers about to be sent');
    console.log('📤 Set-Cookie header will be added by generateToken function');

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
    
    console.log('✅ Login response sent successfully for user:', email);
    
  } catch (error) {
    console.error("❌ Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// LOGOUT
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// UPDATE PROFILE PIC
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// CHECK AUTH
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("❌ Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
