const jwt = require("jsonwebtoken");
let { success, failed,unauthorized, failedValidation } = require('../helper/response');


///////////////Authenticating admin /////////////////
module.exports = async (req, res, next) =>{
  try {
    const token = (req.headers.authorization ? req.headers.authorization.split(" ")[1] : "") || (req.body && req.body.access_token) || req.body.token || req.query.token || req.headers["x-access-token"];
        
    if (!token) return response.failed(res, "Access denied, no token found");

    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); 
   
    // let _id =  decoded.userId;
    // console.log({_id});
    // const admin = await Admin.findOne({
    //   where: { id: _id },
    // });
    // if (!_id) {
    //   return failed(res, "Account is blocked by admin.");
    // }
    req.decodedData = decoded; 
    next();
  
  } catch (error) {
    return unauthorized(res, "Session Expired.");
  }
};