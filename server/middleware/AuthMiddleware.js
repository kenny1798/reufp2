const {verify} = require('jsonwebtoken');
require('dotenv').config();

const validateToken = (req, res, next) => {
    const accessToken = req.header("accessToken");
    
    if(!accessToken){
        return res.json({error:"User Not Logged In"});
    }else{
        try{
            const validToken = verify(accessToken, process.env.JWT_SECRET);
            req.user = validToken;
                if(validToken){
                    return next();
                }

        }catch(err){
            return res.json({error: err})
        }
    }
}

module.exports = {validateToken};