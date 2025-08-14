import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    console.log('🔑 GENERATE TOKEN called for userId:', userId);
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🔑 NODE_ENV:', process.env.NODE_ENV);
    
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
      expiresIn:"7d"
    });
    
    console.log('🔑 Token created:', token ? 'SUCCESS' : 'FAILED');
    console.log('🔑 Token length:', token.length);
    
    const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true, // prevents XSS attacks cross-site scripting attacks
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: process.env.NODE_ENV !== "development",
        path: '/' // Ensure cookie is available site-wide
    };
    
    console.log('🍪 Cookie options:', cookieOptions);
    console.log('🍪 Setting cookie with name: jwt');
    
    res.cookie("jwt", token, cookieOptions);
    
    console.log('🍪 Cookie set successfully');
    
    return token;
};