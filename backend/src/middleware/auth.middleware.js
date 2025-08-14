import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async(req,res,next) => {
    try {
        // DEBUG: Log all cookies and headers
        console.log('=== MIDDLEWARE DEBUG ===');
        console.log('All cookies received:', req.cookies);
        console.log('JWT cookie specifically:', req.cookies.jwt);
        console.log('Cookie header:', req.headers.cookie);
        console.log('Origin:', req.headers.origin);
        console.log('User-Agent:', req.headers['user-agent']);
        console.log('========================');
        
        const token = req.cookies.jwt

        if(!token){
            console.log('❌ NO TOKEN FOUND - Cookies:', req.cookies);
            return res.status(401).json({ message: "Unauthorized - No Token Provided"});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(!decoded){
            console.log('❌ INVALID TOKEN:', token);
            return res.status(401).json({ message: "Unauthorized - Invalid Token"});
        }

        const user = await User.findById(decoded.userId).select("-password");

        if(!user) {
            console.log('❌ USER NOT FOUND for ID:', decoded.userId);
            return res.status(404).json({ message: "User not found"});
        }

        console.log('✅ TOKEN VALID - User:', user.email);
        req.user = user

        next()

    } catch (error) {
        console.log("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal server error"});
    }
};