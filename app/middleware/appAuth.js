const jwt = require("jsonwebtoken");
const response = require("../helper/response");
const db = require("../../models");
const User = db.mvUser;

/*********************** Check user auth token  **************************/
module.exports = async function (req, res, next) {
  try {
    const token =
      (req.headers.authorization
        ? req.headers.authorization.split(" ")[1]
        : "") ||
      (req.body && req.body.access_token) ||
      req.body.token ||
      req.query.token ||
      req.headers["x-access-token"];
    if (!token) return response.failed(res, "Access denied, no token found");

    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    let _id = decoded.id;
    const user = await User.findByPk(_id);
    if (user == null) {
      return response.response(res, 204, "Account deleted.")
    }
    if (user.isActive === false) {
      return response.response(res, 402, "Your number is inactive, please contact to admin.")

    }
    if (user.isBlocked === true) {
      return response.response(res, 402, "You are blocked, please contact to admin.")
    }

    req.decodedData = decoded;
    next();
  } catch (error) {
    console.log(error);
    return response.failed(res, error);
  }
};
