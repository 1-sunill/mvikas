const jwt = require("jsonwebtoken");
let {
  success,
  failed,
  unauthorized,
  failedValidation,
  inActiveUser
} = require("../helper/response");
const db = require("../../models");
const User = db.crmuser;
const Workspace = db.crmworkspace;
///////////////Authenticating admin /////////////////
module.exports = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization
        ? req.headers.authorization.split(" ")[1]
        : "") ||
      (req.body && req.body.access_token) ||
      req.body.token ||
      req.query.token ||
      req.headers["x-access-token"];

    if (!token) return failed(res, "Access denied, no token found");

    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    let _id = decoded.id;
    // console.log({decoded});
    const workspace = await Workspace.findOne({
      where: { userId: _id },
    });
    // console.log("_id++++++++", workspace);

    // console.log("_id++++++++", _id);
    if (workspace) {
      if (workspace.status == 0) {
        return inActiveUser(res, "Account is blocked by admin.");
      }
    }
    const user = await User.findOne({
      where: { id: _id },
    });
    // console.log("_id++++++++", _id);
    if (user) {
      if (user.status == 0) {
        return inActiveUser(res, "Account is blocked by admin.");
      }
    }

    if (!_id) {
      return inActiveUser(res, "Account is blocked by admin.");
    }
    req.decodedData = decoded;
    next();
  } catch (error) {
    console.log({ error });
    return unauthorized(res, "Session Expired.");
  }
};
