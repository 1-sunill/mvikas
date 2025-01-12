const db = require("../../models");
const User = db.mvUser
const Admin = db.mvUser
const Role = db.mvRole;
const AssingUser = db.mvCustomerAssign;
module.exports = {
    getAdminRole: async (id) => {
        const userData = await Admin.findOne({
            where: {
                id: id
            },
            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["id", "name", "slug"],

                }
            ]
        });
        let assignedUser = await AssingUser.findAll({
            where: {
                assignTo: id
            }
        })
        return {
            role: userData.role && userData.role.slug ? userData.role.slug : "",
            users: assignedUser.map(user => user.userId)
        }
    }
}