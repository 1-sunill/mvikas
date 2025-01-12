const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const Customer = db.CrmAllCustomer;
const Payment = db.CrmPaymentTerm;
const Transport = db.CrmTransport;
const Driver = db.CrmDriver;
const User = db.crmuser;
const CrmNotifiables = db.CrmNotifiables;
const NotificationType = db.CrmNotificationType;
const ActivityLog = db.CrmActivityLogs;
const { USER_CONSTANTS, SYSTEM_FAILURE } = require("../../../helper/message");
const { Op } = require("sequelize");

module.exports = {
  /*
   * Payment Term Start
   */
  addPayementTerm: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        name: "required|string",
        type: "required|string",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const { name, type, workspaceId } = req.body;
      const checkPayment = await Payment.findOne({
        where: { name: name, type: type, workspace_id: workspaceId },
      });
      if (checkPayment) {
        return failed(res, "Data already exist.");
      }
      const reqData = {
        name,
        type,
        workspace_id: workspaceId,
      };
      await Payment.create(reqData);
      return success(res, "Data added sucessfully.", reqData);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updatePaymentTerm: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { id, name, type, workspaceId } = req.body;

      // Check if the payment term exists
      const checkPayment = await Payment.findOne({ where: { id: id } });
      if (!checkPayment) {
        return failed(res, "Data not found.");
      }
      const duplicatePaymentTerm = await Payment.findOne({
        where: {
          name,
          type,
          workspace_id: workspaceId,
          id: { [Op.ne]: id },
        },
      });

      if (duplicatePaymentTerm) {
        return failed(
          res,
          "Payment term with the same name and type already exists in the workspace."
        );
      }
      const reqData = { name, type, workspace_id: workspaceId };

      const [updatedRows] = await Payment.update(reqData, {
        where: { id: id },
      });

      if (updatedRows === 0) {
        return failed(res, "No changes made or data not found.");
      }

      // Return success response
      return success(res, "Data updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  listPaymentTerm: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;

      const validate = new Validator(request, {
        type: "required|in:1,2",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      const userType = request.userType ? request.userType : "customer";

      let params = {
        ...whereCondition,
        workspace_id: request.workspaceId,
        status: 1,
      };

      if (search) {
        params = {
          ...params,
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }
      let list;
      if (req.query.type == 1) {
        //without pagination
        if (request.workspaceId > 1) {
          list = await Payment.findAll({
            where: {
              status: 1,
              type: userType,
              workspace_id: request.workspaceId,
            },
            order: [["id", "DESC"]],
          });
        } else {
          list = await Payment.findAll({
            where: params,
            order: [["id", "DESC"]],
          });
        }
      } else {
        list = await Payment.findAll({
          where: params,
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      }

      const totalCount = await Payment.findAll({
        where: params,
      });
      const finalData = {
        list,
        count: totalCount.length,
      };
      return success(res, "Success", finalData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateStatusPaymentTerm: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const payment = await Payment.findByPk(req.body.id);

      if (!payment) {
        return failed(res, "payment term not found.");
      }

      payment.status = payment.status === 0 ? 1 : 0;
      await payment.save();

      return success(res, "Status updated successfully.", payment);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  /*
   * Payment Term End
   */

  /*********** next module start **************/
  /*
   * Customer Module start
   */
  //Add customer and vendor
  addCustomer: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        name: "required|string",
        email: "required|email",
        mobile: "required",
        // companyName: "required",
        // legelName: "required",
        customerAddress: "required",
        gstIn: "required",
        paymentTermId: "required|integer",
        type: "required|in:1,2",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const {
        name,
        email,
        mobile,
        companyName,
        legelName,
        customerAddress,
        gstIn,
        paymentTermId,
        type,
        pickupLocation,
        contactName,
        workspaceId,
        creditLimit,
        msmeRegistered,
        cinNumber,
      } = req.body;
      const checkPayment = await Customer.findOne({
        where: { email: email, workspaceId: workspaceId },
      });
      if (checkPayment) {
        return failed(res, "Data already exist.");
      }
      const user = await User.findOne({ id: req.decodedData.id });
      const reqData = {
        name,
        email,
        mobile,
        companyName,
        legelName,
        customerAddress,
        gstIn,
        paymentTermId,
        type,
        pickupLocation,
        contactName,
        workspaceId,
        creditLimit,
        msmeRegistered,
        cinNumber,
      };
      const customer = await Customer.create(reqData);

      let afterData = {
        ...reqData,
        updatedBy: user.name,
        createdAt: new Date(),
        oldAmount: 0,
        newAmount: parseInt(creditLimit),
      };

      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: customer.id,
        entity_type: "CrmCustomerUpdate",
        operation_type: "CUSTOMER CREATED",
        performed_by_id: req.decodedData.id,
        changes: {
          before: [],
          after: afterData,
        },
      });

      // Add in notifables
      const notificationTypes = await NotificationType.findAll();

      if (notificationTypes.length > 0) {
        // Prepare bulk insert data
        const notifiableData = notificationTypes.map((element) => ({
          workspace_id: workspaceId,
          notification_type_id: element.id,
          notifiable_type: "customer",
          notifiable_id: customer.id,
        }));

        // Bulk insert the data
        await CrmNotifiables.bulkCreate(notifiableData);
      }
      return success(res, "Data added sucessfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Update Customer and vendor
  updateCustomer: async (req, res) => {
    try {
      // Validate the request body to ensure 'id' is provided
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Destructure the relevant fields from the request body
      const {
        id,
        name,
        email,
        mobile,
        companyName,
        legalName, // Corrected 'legelName' to 'legalName'
        customerAddress,
        gstIn,
        paymentTermId,
        type,
        pickupLocation,
        contactName,
        workspaceId,
        creditLimit,
        msmeRegistered,
        cinNumber,
      } = req.body;

      // Check if the customer exists in the database
      const checkCustomer = await Customer.findOne({ where: { id: id } });
      if (!checkCustomer) {
        return failed(res, "Customer not found.");
      }
      const originalData = checkCustomer.toJSON();

      // Prepare the data to be updated
      let reqData = {
        name,
        email,
        mobile,
        companyName,
        legalName,
        customerAddress,
        gstIn,
        paymentTermId,
        type,
        pickupLocation,
        contactName,
        workspaceId,
        msmeRegistered,
        cinNumber,
      };
      let user = await User.findOne({ where: { id: req.decodedData.id } });
      let afterData = {};
      // Handle creditLimit changes with a status update
      if (creditLimit && checkCustomer.creditLimit !== parseInt(creditLimit)) {
        reqData.creditLimit = parseInt(creditLimit);
        reqData.creditLimitstatus = "pending";
        afterData = {
          ...reqData,
          updatedBy: user.name,
          createdAt: new Date(),
          oldAmount: checkCustomer.creditLimit,
          newAmount: parseInt(creditLimit),
        };

        // Log the update activity, including both the original and updated data
        await ActivityLog.create({
          entity_id: id,
          entity_type: "CrmCustomerUpdate",
          operation_type: "CUSTOMER CREDIT LIMIT UPDATED",
          performed_by_id: req.decodedData.id,
          changes: {
            before: originalData,
            after: afterData,
          },
        });
      } else {
        afterData = {
          ...reqData,
          updatedBy: user.name,
          createdAt: new Date(),
          oldAmount: checkCustomer.creditLimit,
          newAmount: parseInt(creditLimit),
        };

        await ActivityLog.create({
          entity_id: id,
          entity_type: "CrmCustomerUpdate",
          operation_type: "CUSTOMER UPDATED",
          performed_by_id: req.decodedData.id,
          changes: {
            before: originalData,
            after: afterData,
          },
        });
      }

      // Update the customer data in the database
      await Customer.update(reqData, { where: { id: id } });

      return success(res, "Data updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //List customer and vendor
  listCustomer: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const validate = new Validator(request, {
        workspaceId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      const type = parseInt(request.type) ? parseInt(request.type) : 1;
      const user = await User.findOne({ id: req.decodedData.id });

      // let params = { type: type, workspaceId: request.workspaceId };

      let params;
      if (user.userType === 0) {
        params = { type: type }; //Customer and vendor list on type 1=>Customer,2=>vendor

        if (request.workspaceId > 1) {
          params = {
            ...params,
            [Op.and]: [
              // { id: { [Op.ne]: user.id } },
              {
                // type: type,
                workspaceId: request.workspaceId,
                ...whereCondition,
              },
            ],
          };
        }

      console.log({ params });

      } else {
        params = {
          type: type,
          workspaceId: request.workspaceId,
          ...whereCondition,
        };
      }

      if (search) {
        params = {
          ...params,
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      let list;
      if (request.isPagination == 0) {
        //without pagination
        if (request.workspaceId > 1) {
          list = await Customer.findAll({
            where: { type: type, workspaceId: request.workspaceId, status: 1 },
          });
        } else {
          list = await Customer.findAll({
            where: { type: type, status: 1 },
          });
        }
      } else {
        list = await Customer.findAll({
          where: params,
          include: [
            { model: Payment, as: "paymentData", attributes: ["name"] },
            {
              model: ActivityLog,
              as: "customerStatusActivityLog",
              required: false,
              where: { entity_type: "CrmCustomerStatus" },
            },
            {
              model: ActivityLog,
              as: "customerHistoryActivityLog",
              required: false,
              where: { entity_type: "CrmCustomerUpdate" },
            },
          ],
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });

        // console.log({ list });
      }

      const totalCount = await Customer.findAll({
        where: params,
      });
      const finalData = {
        list,
        count: totalCount.length,
      };
      return success(res, "Success", finalData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Status Customer and vendor
  customerStatus: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const customer = await Customer.findByPk(req.body.id);

      if (!customer) {
        return failed(res, "customer term not found.");
      }

      customer.status = customer.status === 0 ? 1 : 0;
      await customer.save();

      return success(res, "Status updated successfully.", customer);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  customerCreditLimitStatus: async (req, res) => {
    try {
      // Validate the request body
      const validate = new Validator(req.body, {
        id: "required|integer",
        status: "required|string",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Find the customer by ID
      const customer = await Customer.findByPk(req.body.id);

      if (!customer) {
        return failed(res, "Customer not found.");
      }

      // Update the credit limit status
      customer.creditLimitstatus = req.body.status;
      const updated = await customer.save();
      const originalData = customer.toJSON();

      // Ensure `user` exists and retrieve the user's name
      let user = await User.findOne({ where: { id: req.decodedData.id } });
      if (!user) {
        throw new Error("User not found."); // Add error handling for missing user
      }

      // Construct `reqData` with the relevant fields
      const reqData = {
        id: req.body.id,
        updatedBy: user.name,
        createdAt: customer.createdAt,
        creditLimit: customer.creditLimit,
        creditLimitstatus: req.body.status,
      };

      // Directly assign `reqData` to `afterData`
      let afterData = { ...reqData };

      // Log the update activity, including both the original and updated data
      await ActivityLog.create({
        entity_id: req.body.id,
        entity_type: "CrmCustomerStatus",
        operation_type: "CUSTOMER CREDIT LIMIT STATUS UPDATED",
        performed_by_id: req.decodedData.id,
        comment: req.body.comment,
        changes: {
          before: originalData,
          after: afterData,
        },
      });

      return success(res, "Status updated successfully.", {
        id: customer.id,
        creditLimitstatus: customer.creditLimitstatus,
      });
    } catch (error) {
      console.error("Error in customerCreditLimitStatus:", error);
      return serverError(res, SYSTEM_FAILURE);
    }
  },

  /*
   * Customer Module end
   */

  /*********** next module start **************/
  /*
   * Transport Module start
   */

  //Add Transport
  addTransport: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        name: "required|string",
        email: "required|email",
        mobile: "required",
        address: "required",
        gstIn: "required",
        paymentTermId: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const {
        name,
        email,
        mobile,
        address,
        gstIn,
        paymentTermId,
        workspaceId,
      } = req.body;
      const checkPayment = await Transport.findOne({
        where: { email: email, workspaceId: workspaceId },
      });
      if (checkPayment) {
        return failed(res, "Transport already exist.");
      }
      const user = await User.findOne({ id: req.decodedData.id });

      const reqData = {
        name,
        email,
        mobile,
        address,
        gstIn,
        paymentTermId,
        workspaceId: workspaceId,
      };
      await Transport.create(reqData);
      return success(res, "Data added sucessfully.", reqData);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Update Transport
  updateTransport: async (req, res) => {
    try {
      // Validate the request body to ensure 'id' is provided
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Destructure the relevant fields from the request body
      const {
        id,
        name,
        email,
        mobile,
        address,
        gstIn,
        paymentTermId,
        status,
        workspaceId,
      } = req.body;

      // Check if the Transport exists in the database
      const checkTransport = await Transport.findOne({ where: { id: id } });
      if (!checkTransport) {
        return failed(res, "Transport not found.");
      }

      // Prepare the data to be updated
      const reqData = {
        name,
        email,
        mobile,
        address,
        gstIn,
        paymentTermId,
        status,
        workspaceId,
      };

      // Update the Transport data in the database
      await Transport.update(reqData, { where: { id: id } });

      return success(res, "Data updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //List Transport
  listTransport: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const validate = new Validator(request, {
        workspaceId: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      const user = await User.findOne({ id: req.decodedData.id });

      let params;
      if (user.userType === 0) {
        params = {};
        if (request.workspaceId > 1) {
          // console.log({ user });

          params = {
            ...params,
            [Op.and]: [
              { id: { [Op.ne]: user.id } },
              {
                // status: 1,
                workspaceId: request.workspaceId,
                ...whereCondition,
              },
            ],
          };
        }
      } else {
        params = { workspace_id: request.workspaceId, ...whereCondition };
      }
      if (search) {
        params = {
          ...params,
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }
      // console.log({ params });
      let list;
      if (request.isPagination == 0) {
        list = await Transport.findAll({
          where: { ...params, status: 1 },
          order: [["id", "DESC"]],
        });
      } else {
        list = await Transport.findAll({
          where: params,
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      }

      const totalCount = await Transport.findAll({
        where: params,
      });
      const finalData = {
        list,
        count: totalCount.length,
      };
      return success(res, "Success", finalData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  //Status Transport
  transportStatus: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const transport = await Transport.findByPk(req.body.id);

      if (!transport) {
        return failed(res, "transport term not found.");
      }

      transport.status = transport.status === 0 ? 1 : 0;
      await transport.save();

      return success(res, "Status updated successfully.", transport);
    } catch (error) {
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  addDriver: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        transportId: "required|integer",
        name: "required|string",
        mobile: "required",
        vehicleNo: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const { transportId, name, mobile, vehicleNo } = req.body;
      const checkDriver = await Driver.findOne({
        where: { vehicleNumber: vehicleNo },
      });
      // if (checkDriver) {
      //   return failed(res, "Vehicle already exist.");
      // }
      const reqData = {
        transportId,
        name,
        contactNumber: mobile,
        vehicleNumber: vehicleNo,
      };
      await Driver.create(reqData);
      return success(res, "Data added sucessfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  updateDriver: async (req, res) => {
    try {
      // Validate the request body to ensure 'id' is provided
      const validate = new Validator(req.body, {
        id: "required",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      // Destructure the relevant fields from the request body
      const { id, name, mobile, vehicleNo, status } = req.body;

      // Prepare the data to be updated
      const reqData = {
        name,
        contactNumber: mobile,
        vehicleNumber: vehicleNo,
        status,
      };

      // Update the Driver data in the database
      await Driver.update(reqData, { where: { id: id } });

      return success(res, "Data updated successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  listDriver: async (req, res) => {
    try {
      const request = req.query;
      const validate = new Validator(request, {
        transportId: "required|integer",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      let params = { transportId: request.transportId };

      if (search) {
        params = {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }
      let list;
      if (req.query.type == 1) {
        //without pagination
        list = await Driver.findAll({
          order: [["id", "DESC"]],
        });
      } else {
        list = await Driver.findAll({
          where: params,
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      }
      const totalCount = await Driver.findAll({
        where: params,
      });
      const transporterDetails = await Transport.findOne({
        where: { id: request.transportId },
      });
      const finalData = {
        transporterDetails,
        list,
        count: totalCount.length,
      };
      return success(res, "Success", finalData);
    } catch (error) {
      console.log({ error });
      return serverError(res, SYSTEM_FAILURE);
    }
  },
  /*
   * Transport Module end
   */
};
