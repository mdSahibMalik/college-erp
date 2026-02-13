

const sendToken = (user , statusCode, res) => {
    const token = user.jwtGenerateToken();

    // options for cookie
    const options = {
        expires : new Date(
            Date.now() + 7*24*60*60*1000 // 7 days
        ),
        httpOnly : true,
        secure : process.env.NODE_ENV === "production" ? true : false,
        sameSite : process.env.NODE_ENV === "production" ? "none" : "lax",
    };

   return res.status(statusCode).cookie('token', token, options).json({
        success : true,
        user,
        token,
        message : "Login successful"
    });
};

export default sendToken;