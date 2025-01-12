"use strict";
const { Model } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
module.exports = (sequelize, DataTypes) => {
  class crmuser extends Model {
    async generateToken() {
      const token = jwt.sign(
        { id: this.id, email: this.email },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d", // Token expiration time
        }
      );
      return token;
    }
    //Make hash password
    static async hashPassword(password) {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      crmuser.belongsTo(models.Role, {
        foreignKey: "roleId",
        as: "role",
      });
      crmuser.belongsTo(models.crmworkspace, {
        foreignKey: "workspaceId",
        as: "workspaceData",
      });
    }
  }
  crmuser.init(
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      contact_number: DataTypes.STRING,
      password: DataTypes.STRING,
      workspace: DataTypes.STRING,
      roleName: DataTypes.STRING,
      status: DataTypes.INTEGER,
      workspaceId: DataTypes.INTEGER,
      roleId: DataTypes.INTEGER,
      profileImage: DataTypes.STRING,
      signature: DataTypes.STRING,
      createdBy: DataTypes.INTEGER,
      userType: DataTypes.INTEGER,
      socialId: DataTypes.INTEGER,
      department: {
        type: DataTypes.ENUM("scm", "sale", "finance"),
        allowNull: false,
        defaultValue: "scm",
      },
    },
    {
      sequelize,
      modelName: "crmuser",
      hooks: {
        beforeCreate: async (user) => {
          user.password = await crmuser.hashPassword(user.password);
        },
      },
    }
  );

  return crmuser;
};
