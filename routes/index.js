const admin = require("./api/v1/mvload/admin");
const application = require("./api/v1/mvload/app");
const applicationUser = require("./api/v1/mvload/user");
const authCrm = require("../routes/api/v1/crm/api");
const crm = require("../routes/api/v1/crm/others");
module.exports = function (app) {
  app.use("/api", application);
  app.use("/api/user", applicationUser);
  app.use("/admin", admin);
  app.use("/auth-crm", authCrm);
  app.use("/crm", crm);
};
