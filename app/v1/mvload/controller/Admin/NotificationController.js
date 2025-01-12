const {
    serverError,
    success,
    validateFail,
    failed,
    response,
} = require("../../../../helper/response");
const {
    SYSTEM_FAILURE,
    ADMIN_CONSTANTS,
    USER_CONSTANTS,
} = require("../../../../helper/message");
const db = require("../../../../../models");
const sequelize = db.sequelize;
const User = db.mvUser;
const AdminNotification = db.mvAdminNotificatuon;
const NotificationType = db.mvNotificationType;
const Notification = db.mvnotification;
const NotifiableUser = db.mvNotifiableUser
const { Validator } = require("node-input-validator");
const { Op, where } = require("sequelize");
const NotificationHelper = require('../../../../helper/notification')
const moment = require('moment')
module.exports = {
    sendNotification: async (req, res) => {
        try {
            let request = req.body
            // Validate the request body
            const validate = new Validator(request, {
                notificationType: "required|in:normal,scheduled",
                title: "required",
                message: "required",
                userType: "required|in:User,Vendor,SubAdmin",
                scheduleDate: "requiredIf:notificationType,scheduled"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (request.notificationType == 'normal') {
                let created = await AdminNotification.create({
                    title: request.title,
                    message: request.message,
                    isScheduled: false,
                    userType: request.userType,
                    creatorId: req.decodedData.id
                })
                let notificationData = []
                let users = []
                if (request.userType == 'User') {
                    users = await User.findAll({
                        where: {
                            isUser: 1,
                            isActive: 1,
                            isBlocked: 0

                        }
                    })
                } else {
                    users = await User.findAll({
                        where: {
                            isVendor: 1,
                            isActive: 1,
                            isBlocked: 0

                        }
                    })
                }
                if (users.length) {
                    for (let i = 0; i < users.length; i++) {
                        notificationData.push({
                            title: request.title,
                            message: request.message,
                            senderId: req.decodedData.id,
                            receiverId: users[i].id,
                            userType: request.userType,
                            adminNotificationId: created.id
                        })
                    }
                }
                await Notification.bulkCreate(notificationData)
                await AdminNotification.update({ userCount: notificationData.length }, {
                    where: {
                        id: created.id
                    }
                })
                return success(res, 'Notification sent successfully')
            } else {
                const date = request.scheduleDate;
                const dateTime = moment(date, 'YYYY-MM-DD hh:mm A').format('YYYY-MM-DD HH:mm:ss');

                let created = await AdminNotification.create({
                    title: request.title,
                    message: request.message,
                    isScheduled: true,
                    userType: request.userType,
                    creatorId: req.decodedData.id,
                    scheduleDate: dateTime
                })
                let notificationData = []
                let users = []
                if (request.userType == 'User') {
                    users = await User.findAll({
                        where: {
                            isUser: 1,
                            isActive: 1,
                            isBlocked: 0

                        }
                    })
                } else {
                    users = await User.findAll({
                        where: {
                            isVendor: 1,
                            isActive: 1,
                            isBlocked: 0

                        }
                    })
                }
                if (users.length) {
                    for (let i = 0; i < users.length; i++) {
                        notificationData.push({
                            title: request.title,
                            message: request.message,
                            senderId: req.decodedData.id,
                            receiverId: users[i].id,
                            userType: request.userType,
                            adminNotificationId: created.id,
                            scheduleDate: dateTime
                        })
                    }
                }
                await Notification.bulkCreate(notificationData)
                await AdminNotification.update({ userCount: notificationData.length }, {
                    where: {
                        id: created.id
                    }
                })
                return success(res, 'Notification sent successfully')
            }
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    notificationList: async (req, res) => {
        try {
            let { search, days, page = 1, limit = 10, fromDate, toDate, notificationType = 'normal' } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            let whereClause = {
                isScheduled: notificationType == 'normal' ? 0 : 1,
                creatorId: req.decodedData.id
            };
            if (days) {
                const date = new Date();
                date.setDate(date.getDate() - parseInt(days));
                whereClause = Object.assign(whereClause, {
                    createdAt: { [Op.gte]: date }
                })
            }
            if (fromDate && fromDate != 'null' && toDate == 'null') {
                whereClause = Object.assign(whereClause, {
                    createdAt: {
                        [Op.gte]: fromDate + ' 00:00:00'
                    }
                })
            }
            if (toDate && toDate != 'null' && fromDate == 'null') {
                whereClause = Object.assign(whereClause, {
                    createdAt: {
                        [Op.lte]: toDate + ' 00:00:00'
                    }
                })
            }
            if ((fromDate && fromDate != 'null') && (toDate && toDate != 'null')) {
                whereClause = Object.assign(whereClause, {
                    [Op.and]: [{
                        createdAt: {
                            [Op.gte]: fromDate + ' 00:00:00'
                        }
                    },
                    {
                        createdAt: {
                            [Op.lte]: toDate + ' 23:59:00'
                        }
                    }
                    ]
                })
            }

            if (search) {
                // Add search conditions to an array
                whereClause = Object.assign(whereClause, {
                    [Op.or]: [
                        { title: { [Op.like]: `%${search}%` } },
                        { message: { [Op.like]: `%${search}%` } }
                    ]
                })
            }
            const offset = (page - 1) * limit;
            let list = await AdminNotification.findAll({
                where: whereClause,
                limit,
                offset
            })
            let count = await AdminNotification.count({ where: whereClause })
            let data = {
                list: list,
                count: count
            }
            return success(res, "Notification list", data)
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    deleteNotification: async (req, res) => {
        try {
            let request = req.body
            // Validate the request body
            const validate = new Validator(request, {
                notificationId: "required"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            await Notification.destroy({
                where: {
                    adminNotificationId: request.notificationId
                }
            })
            await AdminNotification.destroy({
                where: {
                    id: request.notificationId
                }
            })

            return success(res, 'Notification deleted successfuly')
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    getNotificationType: async (req, res) => {
        try {
            let list = await NotificationType.findAll()
            return success(res, 'Notification types', list)
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    changeNotificationTypeStatus: async (req, res) => {
        try {
            let request = req.body
            // Validate the request body
            const validate = new Validator(request, {
                notificationTypeId: "required",
                status: "required|in:0,1"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            await NotificationType.update({ status: request.status }, {
                where: {
                    id: request.notificationTypeId
                }
            })
            return success(res, 'Notification type status changed')
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    },
    getUserListForNotification: async (req, res) => {
        try {
            let request = req.query
            // Validate the request body
            const validate = new Validator(request, {
                userType: "required|in:User,Vendor,Admin"
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            let { search, page = 1, limit = 10, userType = 'User' } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const offset = (page - 1) * limit;
            let params = {
                isActive: true,
                isBlocked: false
            }
            if (search) {
                params = Object.assign(params, {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { email: { [Op.like]: `%${search}%` } },
                        { mobile: { [Op.like]: `%${search}%` } }

                    ]
                })
            }
            if (userType == 'User') {
                params.isUser = true
            }
            else if (userType == 'Vendor') {
                params.isVendor = true
            }
            else if (userType == 'Admin') {
                params = Object.assign(params, {
                    userType: 'Admin',
                    roleId: {
                        [Op.ne]: 0
                    }
                })

            } else {
                return success(res, "Notification list", [])
            }
            let list = await User.findAll({
                where: params,
                attributes: ['id', 'email', 'name', 'mobile'],
                include: [{
                    model: NotifiableUser,
                    as: 'notifiable',
                    attributes: ['id', 'userId', 'userType']
                }],
                limit,
                offset
            })
            let count = await User.count({ where: params })
            let data = {
                list: list,
                count: count
            }
            return success(res, "Notification list", data)

        } catch (error) {

        }
    },
    enableDisableNotification: async (req, res) => {
        try {
            let request = req.body
            request.users = request.users ? request.users : []
            const validate = new Validator(request, {
                notificationTypeId: "required",
                userType: "required|in:User,Vendor,Admin",
                users: "required|array",
                'users.*.userId': 'required',
                'users.*.status': 'required|in:0,1'
            });
            const matched = await validate.check();
            if (!matched) {
                return validateFail(res, validate);
            }
            if (!await NotificationType.findOne({ where: { id: request.notificationTypeId } }))
                return response(res, 422, 'Notification type not found')
            // Filter based on status and get only userId
            const enableUser = await Promise.all(
                request.users
                    .filter(user => user.status == 1)  // Filter users where status is 1
                    .map(async (user) => {
                        // Check if the NotifiableUser record exists
                        const notifiableUser = await NotifiableUser.findOne({
                            where: {
                                userId: user.userId,
                                notificationTypeId: request.notificationTypeId,
                                userType: request.userType
                            }
                        });

                        // If not found, return the new object
                        if (!notifiableUser) {
                            return {
                                userId: user.userId,
                                notificationTypeId: request.notificationTypeId,
                                userType: request.userType
                            };
                        }

                        // If found, return null
                        return null;
                    })
            );

            // Filter out any null values in the result (users that already exist in NotifiableUser)
            const filteredEnableUser = enableUser.filter(user => user !== null);


            const disableUser = request.users
                .filter(user => user.status == 0)
                .map(user => user.userId);

            await NotifiableUser.destroy({
                where: {
                    userId: {
                        [Op.in]: disableUser
                    },
                    userType: request.userType,
                    notificationTypeId: request.notificationTypeId
                }
            })
            await NotifiableUser.bulkCreate(filteredEnableUser)
            return success(res, 'Success')
        } catch (error) {
            console.log({ error });
            return serverError(res, SYSTEM_FAILURE);
        }
    }


}