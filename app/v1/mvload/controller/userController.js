const {
    success,
    failed,
    serverError,
    validateFail,
    response,
} = require("../../../helper/response");
const {
    USER_CONSTANTS,
    EMAIL_CONSTANTS,
    ADDRESS_CONSTANTS,
    AUTH_CONSTANTS,
    SYSTEM_FAILURE,
    BANK_CONSTANTS,
    KYC_SUCCESS,
    VALIDATION_FAILED,
    KYC_CONSTANTS
} = require('../../../helper/message');
const db = require("../../../../models/");
const {
    sendEmailOtp,
    sendEmailforgetPassword
} = require("../../../helper/nodeMailler");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const _ = require("lodash");
const User = db.mvUser; //Ensure this matches your model definition
const Account = db.mvAccountDetails;
const Bank = db.mvBankDetails;
const Kyc = db.mvKycVerifcation;
const Otp = db.mvOtp;
const Address = db.mvAddress;
const moment = require('moment')
const {
    Validator
} = require("node-input-validator");
const jwt = require("jsonwebtoken");
const {
    fn,
    col,
    Op,
    where,
    literal
} = require("sequelize");
const {
    aws
} = require('../../../helper/aws');
const sendMobileOTP = require('../../../helper/sendSms');
const NotificationHelper = require('../../../helper/notification');
const { request } = require("http");

//send otp create and updatez
exports.sendOtp = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            email: "required",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        // Check if user already exists
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        });
        if (user)
            return failed(res, USER_CONSTANTS.USERNAME_ALREADY_EXISTS);

        const otp = await crypto.randomInt(1000, 10000).toString();

        // await sendMobileOTP.sendMobileOTPMVLOAD(req.body.email, otp).then(async (isSent) => {

        //if (isSent) {
                // await sendMobileOTP.sendMobileOTP(req.body.email, otp)
                //     .then(() => {
                //         return success(res, AUTH_CONSTANTS.SEND_OTP);
                //     })
                //     .catch((err) => {
                //         console.error(SYSTEM_FAILURE, err);
                //         return failed(res, AUTH_CONSTANTS.SEND_OTP_FAILED);
                //     });
                // Send OTP via email
                try {
                    const emailInfo = await sendEmailOtp(req.body.email, req.body.name, otp);
                    console.info('Email sent:', emailInfo);
                } catch (error) {
                    return failed(res, EMAIL_CONSTANTS.EMAIL_FAILURE);
                }

                const otpExist = await Otp.findOne({
                    where: {
                        email: req.body.email
                    }
                });
                if (otpExist) {
                    const updateOtp = await otpExist.update({
                        otp
                    });
                    const addedData = _.pick(updateOtp, ['id', 'email', 'createdAt']);
                    return success(res, AUTH_CONSTANTS.SEND_OTP, addedData);
                }
                let otpdata = await Otp.create({
                    email: req.body.email,
                    otp
                });

                const addedData = _.pick(otpdata, ['id', 'email', 'createdAt']);

                return success(res, AUTH_CONSTANTS.SEND_OTP, addedData);
            // } else {
            //     return response(res, 500, 'Something went wrong')
            // }
        // });
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};
exports.otpVerifyCreate = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            id: "required",
            otp: "required|regex:^[0-9]{4}$",
            mobile: "required",
            email: "required|email",
            password: "required",
            name: "required",
            role: "required|in:user,vendor"
        });

        const matched = await validate.check();
        if (!matched)
            return validateFail(res, validate);

        const {
            email
        } = req.body;

        const otp = await Otp.findOne({
            where: {
                id: req.body.id,
                email: req.body.email
            }
        });

        if (!otp) return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        if (req.body.otp !== otp.otp) return failed(res, AUTH_CONSTANTS.INVALID_OTP);

        const userData = await User.findOne({
            where: {
                [Op.or]: [{
                    email
                },
                // {
                //     mobile: req.body.mobile
                // }
                ]
            }
        });

        if (userData)
            return failed(res, USER_CONSTANTS.USERNAME_ALREADY_EXISTS);

        const isUser = req.body.role === "user";
        const isVendor = req.body.role === "vendor";

        const hashedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        if (req.body.role === "vendor") {
            var isDummy = false
        }


        const newUser = await User.create({
            mobile: req.body.mobile,
            email,
            password: hashedPassword,
            name: req.body.name,
            isUser: isUser,
            isVendor: isVendor,
            isActive: true,
            isDummy: isDummy
        });

        const AccountData = await Account.create({
            billingType: 'prepaid',
            userId: newUser.id,
            markup: 0
        });

        const token = jwt.sign({
            id: newUser.id,
            email: newUser.email,
            isUser: newUser.isUser,
            isVendor: newUser.isVendor
        }, process.env.JWT_SECRET_KEY);


        res.setHeader('Authorization', `Bearer ${token}`);
        const user = _.pick(newUser, ['id', 'name', 'email', 'image', 'mobile', 'isUser', 'isVendor', 'isActive', 'createdAt', 'updatedAt', 'rateType']);
        await NotificationHelper.createOnboardNotification(newUser.email, "", [req.body.name], [`91${req.body.mobile}`])
        return success(res, USER_CONSTANTS.REGISTERED_SUCCESSFULLY, {
            user,
            token
        });
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.userDetails = async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                id: req.decodedData.id
            },
            attributes: ['id', 'name', 'email', 'mobile', 'isActive', 'secondEmail', 'GSTNo', 'panNo', 'dealItem', 'avgShipmentWeight',
                'companyAddressLine1', 'companyAddressLine2', 'companyAddressPincode',
                'companyAddressState', 'companyAddressCity', 'companyAddressCountry',
                'companyDescription', 'billingAddressLine1', 'billingAddressLine2',
                'billingAddressPincode', 'billingAddressCity', 'billingAddressState', 'billingAddressCountry', 'image', 'createdAt', 'updatedAt', 'noOfShipment'
            ]
        });
        if (!user)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        return success(res, USER_CONSTANTS.USER_FOUND, user);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.login = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            type: 'required|in:mobile,username',
            username: 'required',
            // password: 'required_if:type,username',
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const username = req.body.username;
        const userData = await User.findOne({
            where: {
                userType: null,
                [Op.or]: [{
                    email: username
                },
                {
                    mobile: username
                }
                ]
            },
            attributes: ['id', 'email', 'image', 'name', 'mobile', 'isUser', 'isVendor', 'isActive', "password", 'isBlocked', 'createdAt', 'updatedAt', 'lastLoginAt', 'rateType']
        });

        if (!userData) {
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        }

        if (userData.isActive === false || userData.isBlocked === true) {
            return failed(res, USER_CONSTANTS.USER_BLOCK_INACTIVE);
        }

        if (req.body.type === 'mobile') {
            // Generate and send OTP
            const otp = crypto.randomInt(1000, 10000).toString();

            const checkOtp = await Otp.findOne({
                where: {
                    email: username
                }
            });
            if (checkOtp) {
                await checkOtp.update({
                    otp
                });
            } else {
                await Otp.create({
                    otp,
                    email: username
                });
            }

            await sendMobileOTP.sendMobileOTP(username, otp)
                .then(() => {
                    return success(res, AUTH_CONSTANTS.SEND_OTP);
                })
                .catch((err) => {
                    console.error(SYSTEM_FAILURE, err);
                    return failed(res, AUTH_CONSTANTS.SEND_OTP_FAILED);
                });

        } else {
            // Validate password for username login
            const isPasswordValid = await bcrypt.compare(req.body.password, userData.password);

            if (!isPasswordValid) {
                return failed(res, USER_CONSTANTS.INVALID_CREDENTIALS);
            }
            await userData.update({
                lastLoginAt: new Date()
            });

            const token = jwt.sign({
                id: userData.id,
                email: userData.email,
                isUser: userData.isUser,
                isVendor: userData.isVendor
            }, process.env.JWT_SECRET_KEY, {
                expiresIn: '365d'
            });

            let user = _.pick(userData, ['id', 'email', 'image', 'name', 'mobile', 'isUser', 'isVendor', 'isActive', 'isBlocked', 'createdAt', 'updatedAt', 'lastLoginAt', 'rateType'])
            return success(res, USER_CONSTANTS.LOGGED_IN, {
                user,
                token
            });

        }
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.mobileLogin = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            otp: "required|regex:^[0-9]{4}$",
            mobile: 'required|phoneNumber',
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const mobile = req.body.mobile;

        // Check if user already exists
        const user = await User.findOne({
            where: {
                mobile
            },
            attributes: ['id', 'email', 'name', 'mobile', 'isUser', 'isVendor', 'isBlocked', 'isActive', 'rateType']
        });

        if (!user)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        if (user.isActive === false || user.isBlocked === true)
            return failed(res, USER_CONSTANTS.USER_BLOCK_INACTIVE)

        const otp = await Otp.findOne({
            where: {
                email: mobile
            }
        });

        if (req.body.otp != otp.otp)
            return failed(res, AUTH_CONSTANTS.INVALID_OTP);


        const token = jwt.sign({
            id: user.id,
            email: user.email
        }, process.env.JWT_SECRET_KEY);

        return success(res, USER_CONSTANTS.LOGGED_IN, {
            user,
            token
        });
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//forget Password
exports.forgetPassword = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            email: "required|email",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const token = crypto.randomBytes(32).toString('hex');

        // Check if user already exists
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        })

        if (!user)
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        const currentDateTime = new Date();
        const expirationTime = new Date(currentDateTime.getTime() + 10 * 60000); // 10 minutes ahead

        //date convertion and add time
        // const formattedCurrentDateTime = currentDateTime.toISOString().slice(0, 19).replace('T', ' ');
        // const formattedExpirationTime = expirationTime.toISOString().slice(0, 19).replace('T', ' ');

        try {
            const emailInfo = await sendEmailforgetPassword(user.email, user.name, token);
            console.info('Email sent:', emailInfo);
        } catch (error) {
            return failed(res, EMAIL_CONSTANTS.EMAIL_FAILURE);
        }

        const affectedRows = await user.update({
            resetPasswordToken: token,
            resetPasswordExpires: expirationTime,
            updatedAt: new Date()
        });

        // Return success response
        return success(res, AUTH_CONSTANTS.CHANGE_PASSWORD_REQUEST_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.resetPassword = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            password: "required",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const password = req.body.password;
        const token = req.query.token;

        if (!token)
            return failed(res, USER_CONSTANTS.TOKEN_NOT_PRESET);

        let tokenExist = await User.findOne({
            where: {
                resetPasswordToken: token
            }
        })
        if (!tokenExist)
            return response(res, 422, USER_CONSTANTS.TOKEN_EXPIRE)
        let tokenExpirationTime = moment(tokenExist.resetPasswordExpires);
        if (moment().isAfter(tokenExpirationTime)) {
            return response(res, 422, USER_CONSTANTS.TOKEN_EXPIRE)
        }

        const hashedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        await User.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }, {
            where: {
                resetPasswordToken: token
            }
        });

        // Return success response
        return success(res, AUTH_CONSTANTS.PASSWORD_CHANGE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//changePassword
exports.changePassword = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            oldPassword: 'required',
            password: 'required|different:oldPassword',
            confirmPassword: 'required|same:password'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        // Check if user already exists
        const user = await User.findOne({
            where: {
                id: req.decodedData.id
            }
        })

        const validPassword = await bcrypt.compare(req.body.oldPassword, user.password);

        if (!validPassword)
            return failed(res, USER_CONSTANTS.INVALID_CURRENT_PASSWORD);

        const updatedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPTSALT, 10));

        await user.update({
            password: updatedPassword
        });

        // Return success response
        return success(res, AUTH_CONSTANTS.PASSWORD_CHANGE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.editProfile = async (req, res) => {
    try {
        let isVendor = req.decodedData.isVendor;
        const allowedFields = [
            'secondEmail', 'name', 'GSTNo', 'panNo', 'dealItem', 'avgShipmentWeight',
            'companyAddressLine1', 'companyAddressLine2', 'companyAddressPincode',
            'companyAddressState', 'companyAddressCity', 'companyAddressCountry',
            'companyDescription', 'billingAddressLine1', 'billingAddressLine2',
            'billingAddressPincode', 'billingAddressCity', 'billingAddressState', 'billingAddressCountry', 'noOfShipment', 'image'
        ];

        const validate = new Validator(req.body, {
            secondEmail: 'sometimes|email',
            name: 'sometimes|string',
            GSTNo: 'sometimes|string',
            panNo: 'sometimes|string',
            dealItem: 'sometimes|string',
            noOfShipment: 'sometimes|integer',
            avgShipmentWeight: 'sometimes|numeric',
            companyAddressLine1: 'sometimes|string|maxLength:254',
            // companyAddressLine2: 'sometimes|string|maxLength:254',
            companyAddressPincode: 'sometimes',
            companyAddressState: 'sometimes|string',
            companyAddressCity: 'sometimes|string',
            companyAddressCountry: 'sometimes|string',
            companyDescription: 'sometimes|string|maxLength:1800',
            billingAddressLine1: 'sometimes|string',
            // billingAddressLine2: 'sometimes|string',
            billingAddressPincode: 'sometimes',
            billingAddressCity: 'sometimes|string',
            billingAddressState: 'sometimes|string',
            billingAddressCountry: 'sometimes|string'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));

        if (extraFields.length > 0) {
            return res.status(400).json({
                error: `The following fields are not allowed: ${extraFields.join(', ')}`
            });
        }
        // if (isVendor) {
        //     if (!req.files || !req.files.image) {
        //         return response(res, 422, "The image is mandatory");
        //     }
        // }

        let updatedData = {
            ...req.body
        };

        if (req.files) {
            if (req.files.image) {
                const image = await aws(req.files.image, 'document');
                updatedData.image = image.Location;
            }
        }

        const [updatedCount] = await User.update(updatedData, {
            where: {
                id: req.decodedData.id
            }
        });

        if (updatedCount === 0) return failed(res, USER_CONSTANTS.USER_NOT_FOUND);

        return success(res, USER_CONSTANTS.USER_UPDATED);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//Bank
exports.addBankDetails = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            IFSCCode: 'required|string',
            bankName: 'required|string',
            accountNumber: 'required|integer|maxLength:18,minLength:9',
            beneficiaryName: 'required|string'
        });

        const matched = await validate.check();
        if (!matched) {
            return failed(res, validate.errors);
        }
        const {
            IFSCCode,
            bankName,
            accountNumber,
            beneficiaryName
        } = req.body;

        const userId = req.decodedData.id;

        const bank = await Bank.findOne({
            where: {
                userId: userId,
                accountNumber: accountNumber
            }
        });
        let isDefault = false
        if (bank)
            return failed(res, BANK_CONSTANTS.BANK_ALREADY_EXIST)
        let defaultExist = await Bank.count({ where: { userId: userId, isDefault: true } });
        if (defaultExist === 0) {
            isDefault = true;
        }
        const resData = {
            userId,
            IFSCCode,
            bankName,
            accountNumber,
            beneficiaryName,
            isDefault: isDefault
        }
        const bankCreateData = await Bank.create(resData)

        const data = _.pick(bankCreateData, ['id', 'userId', 'IFSCCode', 'bankName', 'accountNumber', 'beneficiaryName', 'createdAt', 'updatedAt'])

        return success(res, BANK_CONSTANTS.BANK_ADD_SUCCESS, data);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.fetchBankDetails = async (req, res) => {
    try {

        const userId = req.decodedData.id;

        const bank = await Bank.findAll({
            where: {
                userId: userId
            },
            attributes: ['id', 'isDefault', 'accountNumber', 'IFSCCode', 'bankName', 'beneficiaryName']
        });

        if (!bank)
            return failed(res, BANK_CONSTANTS.BANK_NOT_FOUND)

        return success(res, BANK_CONSTANTS.BANK_FETCH_SUCCESS, bank);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateBankDetails = async (req, res) => {
    try {

        const validate = new Validator(req.body, {
            id: "required|integer",
            IFSCCode: 'required|string',
            bankName: 'required|string',
            accountNumber: 'required|integer|maxLength:18,minLength:9',
            beneficiaryName: 'required|string'
        });


        const matched = await validate.check();
        if (!matched)
            return failed(res, validate.errors);

        const {
            id,
            IFSCCode,
            bankName,
            accountNumber,
            beneficiaryName
        } = req.body;

        const bank = await Bank.findOne({
            where: {
                id
            },
            attributes: ['id', 'isDefault', 'accountNumber', 'IFSCCode', 'bankName', 'beneficiaryName']
        });

        if (!bank)
            return failed(res, BANK_CONSTANTS.BANK_NOT_FOUND)

        bank.update({
            IFSCCode,
            bankName,
            accountNumber,
            beneficiaryName
        });

        return success(res, BANK_CONSTANTS.BANK_UPDATE_SUCCESS, bank);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.enableBankDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.decodedData.id;

        await Bank.update({
            isDefault: false
        }, {
            where: {
                userId: userId
            }
        });

        await Bank.update({
            isDefault: true
        }, {
            where: {
                id: id,
                userId: userId
            }
        });

        const updatedBankRecords = await Bank.findAll({
            where: {
                userId: userId
            },
            attributes: ['isDefault', 'accountNumber', 'IFSCCode', 'bankName', 'beneficiaryName']
        });

        return success(res, BANK_CONSTANTS.BANK_UPDATE_SUCCESS, updatedBankRecords);


    } catch (error) {
        console.error({
            error
        });

        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteBankDetails = async (req, res) => {
    try {

        const id = req.params.id;
        const userId = req.decodedData.id;

        const bank = await Bank.findOne({
            where: {
                userId: userId,
                id
            }
        });

        if (!bank)
            return failed(res, BANK_CONSTANTS.BANK_NOT_FOUND)

        await bank.destroy();

        return success(res, BANK_CONSTANTS.BANK_DELETE_SUCCESS);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//addresses
exports.createAddress = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            name: 'required|string',
            fullAddress: 'required|string',
            state: 'required|string',
            city: 'required|string',
            pincode: 'required|integer',
            mobile: 'required|phoneNumber',
            country: 'required|string',
        });

        const matched = await validate.check();
        if (!matched) {
            return failed(res, validate.errors);
        }
        const userId = req.decodedData.id;


        const resData = {
            userId,
            name: req.body.name,
            fullAddress: req.body.fullAddress,
            state: req.body.state,
            city: req.body.city,
            pincode: req.body.pincode,
            mobile: req.body.mobile,
            country: req.body.country,
        }
        const data = await Address.create(resData)
        resData.id = data.id

        return success(res, ADDRESS_CONSTANTS.ADDRESS_CREATE, resData);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getAddress = async (req, res) => {
    try {

        const userId = req.decodedData.id;

        const address = await Address.findAll({
            where: {
                userId: userId
            },
            attributes: ['id', 'name', 'fullAddress', 'state', 'city', 'pincode', 'mobile', 'country']
        });

        if (!address)
            return failed(res, ADDRESS_CONSTANTS.ADDRESS_NOT_FOUND)

        return success(res, ADDRESS_CONSTANTS.ADDRESS_FETCH, address);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateAddress = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            id: 'required|integer',
            name: 'required|string',
            fullAddress: 'required|string',
            state: 'required|string',
            city: 'required|string',
            pincode: 'required|integer',
            mobile: 'required|phoneNumber',
            country: 'required|string',
        });

        const matched = await validate.check();
        if (!matched) {
            return failed(res, validate.errors);
        }

        const id = req.body.id;

        const address = await Address.findOne({
            where: {
                id,
                userId: req.decodedData.id
            }
        });
        if (!address)
            return failed(ADDRESS_CONSTANTS.ADDRESS_NOT_FOUND)

        const resData = {
            name: req.body.name,
            fullAddress: req.body.fullAddress,
            state: req.body.state,
            city: req.body.city,
            pincode: req.body.pincode,
            mobile: req.body.mobile,
            country: req.body.country,
        }

        resData.id = id

        await Address.update(resData, {
            where: {
                id
            }
        }, {
            attributes: ['id', 'name', 'state', 'city', 'pincode', 'mobile', 'country']
        })

        return success(res, ADDRESS_CONSTANTS.ADDRESS_UPDATE, resData);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteAddress = async (req, res) => {
    try {

        const id = req.params.id;
        const userId = req.decodedData.id;

        const address = await Address.findOne({
            where: {
                userId: userId,
                id
            }
        });

        if (!address)
            return failed(res, BANK_CONSTANTS.BANK_NOT_FOUND)

        await Address.destroy({
            where: {
                id
            }
        });

        return success(res, ADDRESS_CONSTANTS.ADDRESS_DELETED);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.kycCreate = async (req, res) => {
    try {
        let validate;
        if (req.body.businessType === "company") {
            validate = new Validator(req.body, {
                businessType: 'required|in:individual,company',
                companyType: 'required|in:Partnership,Limited Liability Partnership,Public Limited Company,Private Limited Company,Sole proprietorship',
                document1Type: 'required|string',
                GSTNo: 'required|string',
                tanNo: 'required|string',
                customerName: 'required|string'
            });
        } else {
            validate = new Validator(req.body, {
                businessType: 'required|in:individual,company',
                document1Type: 'required|string'
            });
        }

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const request = req.body;
        const id = req.decodedData.id;
        const businessType = req.body.businessType;

        const kycData = await Kyc.findOne({
            where: {
                userId: id
            }
        });

        if (kycData) return failed(res, KYC_CONSTANTS.KYC_ALRADY_EXIST);

        let fileValidationRules = {
            document1FrontSide: 'required',
            document2FrontSide: 'required'
        };

        if (businessType === 'company') {
            fileValidationRules.document2BackSide = 'required';
        } else {
            fileValidationRules.document1BackSide = 'sometimes';
            fileValidationRules.document2BackSide = 'sometimes';
        }

        const validate1 = new Validator(req.files, fileValidationRules);
        const matched1 = await validate1.check();
        if (!matched1) return validateFail(res, validate1);

        let reqData = {};
        if (businessType === 'company') {
            reqData = {
                businessType: request.businessType,
                companyType: request.companyType,
                document1Type: request.document1Type,
                document2Type: request.document2Type,
                userId: id,
                customerName: request.customerName,
                GSTNo: request.GSTNo,
                tanNo: request.tanNo,
                isApproved: 1
            };
        } else if (businessType === 'individual') {
            reqData = {
                businessType: request.businessType,
                document1Type: request.document1Type,
                document2Type: request.document2Type,
                userId: id,
                isApproved: 1
            };
        }

        let uploadedFiles = {};
        if (req.files) {
            if (req.files.document1FrontSide) {
                uploadedFiles.document1FrontSide = await aws(req.files.document1FrontSide, 'document');
            }
            if (req.files.document2FrontSide) {
                uploadedFiles.document2FrontSide = await aws(req.files.document2FrontSide, 'document');
            }
            if (req.files.document1BackSide && businessType === 'individual') {
                uploadedFiles.document1BackSide = await aws(req.files.document1BackSide, 'document');
            }
            if (req.files.document2BackSide) {
                uploadedFiles.document2BackSide = await aws(req.files.document2BackSide, 'document');
            }
        }

        reqData = {
            ...reqData,
            document1FrontSide: uploadedFiles.document1FrontSide?.Location || null,
            document2FrontSide: uploadedFiles.document2FrontSide?.Location || null,
            document1BackSide: uploadedFiles.document1BackSide?.Location || null,
            document2BackSide: uploadedFiles.document2BackSide?.Location || null,
        };

        const createKYC = await Kyc.create(reqData);

        const data = _.pick(createKYC, ['id', 'businessType', 'companyType', 'document1Type', 'document1FrontSide', 'document2FrontSide', 'document1BackSide', 'document2BackSide', 'customerName', 'GSTNo', 'tanNo', 'isApproved', 'createdAt', 'updatedAt']);

        return success(res, KYC_SUCCESS, data);
    } catch (error) {
        console.error({
            error
        });
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.kycUpdate = async (req, res) => {
    try {
        const id = req.decodedData.id;
        const existingKyc = await Kyc.findOne({
            where: {
                userId: id
            }
        });
        if (!existingKyc) return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        if (!existingKyc === 2) return failed(res, KYC_CONSTANTS.KYC_APPROVED_ALREADY);

        let validate;
        if (req.body.businessType === "company") {
            validate = new Validator(req.body, {
                businessType: 'required|in:individual,company',
                companyType: 'required|in:Partnership,Limited Liability Partnership,Public Limited Company,Private Limited Company,Sole proprietorship',
                document1Type: 'required|string',
                GSTNo: 'required|string',
                tanNo: 'required|string',
                customerName: 'required|string'
            });
        } else {
            validate = new Validator(req.body, {
                businessType: 'required|in:individual,company',
                document1Type: 'required|string'
            });
        }

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        let fileValidationRules = {
            document1FrontSide: 'sometimes|required',
            document2FrontSide: 'sometimes|required'
        };

        if (req.body.businessType === 'company') {
            fileValidationRules.document2BackSide = 'sometimes|required';
        } else {
            fileValidationRules.document1BackSide = 'sometimes';
            fileValidationRules.document2BackSide = 'sometimes';
        }

        const validate1 = new Validator(req.files, fileValidationRules);
        const matched1 = await validate1.check();
        if (!matched1) return validateFail(res, validate1);

        let reqData = {};
        if (req.body.businessType === 'company') {
            reqData = {
                businessType: req.body.businessType,
                companyType: req.body.companyType,
                document1Type: req.body.document1Type,
                document2Type: req.body.document2Type,
                customerName: req.body.customerName,
                GSTNo: req.body.GSTNo,
                tanNo: req.body.tanNo
            };
        } else if (req.body.businessType === 'individual') {
            reqData = {
                businessType: req.body.businessType,
                document1Type: req.body.document1Type,
                document2Type: req.body.document2Type
            };
        }

        let uploadedFiles = {};
        if (req.files) {
            if (req.files.document1FrontSide) {
                uploadedFiles.document1FrontSide = await aws(req.files.document1FrontSide, 'document');
            }
            if (req.files.document2FrontSide) {
                uploadedFiles.document2FrontSide = await aws(req.files.document2FrontSide, 'document');
            }
            if (req.files.document1BackSide && req.body.businessType === 'individual') {
                uploadedFiles.document1BackSide = await aws(req.files.document1BackSide, 'document');
            }
            if (req.files.document2BackSide) {
                uploadedFiles.document2BackSide = await aws(req.files.document2BackSide, 'document');
            }
        }

        reqData = {
            ...reqData,
            document1FrontSide: uploadedFiles.document1FrontSide?.Location || existingKyc.document1FrontSide,
            document2FrontSide: uploadedFiles.document2FrontSide?.Location || existingKyc.document2FrontSide,
            document1BackSide: uploadedFiles.document1BackSide?.Location || existingKyc.document1BackSide,
            document2BackSide: uploadedFiles.document2BackSide?.Location || existingKyc.document2BackSide,
            isApproved: 1
        };

        await Kyc.update(reqData, {
            where: {
                userId: id
            }
        });

        const updatedKyc = await Kyc.findOne({
            where: {
                userId: id
            }
        });

        const data = _.pick(updatedKyc, ['id', 'businessType', 'companyType', 'document1Type', 'document1FrontSide', 'document2FrontSide', 'document1BackSide', 'document2BackSide', 'customerName', 'GSTNo', 'tanNo', 'isApproved', 'createdAt', 'updatedAt']);

        return success(res, KYC_CONSTANTS.KYC_UPDATE_SUCCESS, data);
    } catch (error) {
        console.error({
            error
        });
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getKyc = async (req, res) => {
    try {

        const id = req.decodedData.id;

        const kycData = await Kyc.findOne({
            where: {
                userId: id
            }
        }, {
            attributes: ['id', 'businessType', 'document1Type', 'document2Type', 'document1FrontSide', 'document2FrontSide', 'document1BackSide', 'document2BackSide', 'customerName', 'GSTNo', 'tanNo', 'isApproved', 'createdAt', 'updatedAt']
        });

        if (!kycData)
            return success(res, KYC_CONSTANTS.USER_NOT_FOUND);

        return success(res, KYC_SUCCESS, kycData);
    } catch (error) {
        console.error({
            error
        });
        return failed(res, SYSTEM_FAILURE);
    }
};

//get mvikas
exports.getMvikasAccount = async (req, res) => {
    try {

        const id = req.decodedData.id;

        const data = await Account.findOne({
            where: {
                userId: id
            },
            attributes: [
                'id',
                'billingType',
                'creditLimit',
                'billingCycle',
                'paymentCycle',
                'availableAmount',
                'createdAt',
                'updatedAt'
            ]
        });

        return success(res, USER_CONSTANTS.ACCOUNT_FETCH_SUCCESS, data);
    } catch (error) {
        console.error({
            error
        });
        return failed(res, SYSTEM_FAILURE);
    }
};
exports.switchUser = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            userType: 'required|in:user,vendor'
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const userData = await User.findOne({
            where: {
                id: req.decodedData.id
            },
            attributes: ['id', 'email', 'name', 'mobile', 'isUser', 'isVendor', 'isActive', "password", 'isBlocked', 'createdAt', 'updatedAt', 'lastLoginAt']
        });

        if (!userData) {
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        }

        if (userData.isActive === false || userData.isBlocked === true) {
            return failed(res, USER_CONSTANTS.USER_BLOCK_INACTIVE);
        }
        const isUser = req.body.userType === "user" ? 1 : 0;
        const isVendor = req.body.userType === "vendor" ? 1 : 0;
        await userData.update({
            lastLoginAt: new Date(),
            isUser: isUser,
            isVendor: isVendor,

        });

        const token = jwt.sign({
            id: userData.id,
            email: userData.email,
            isUser: userData.isUser,
            isVendor: userData.isVendor
        }, process.env.JWT_SECRET_KEY, {
            expiresIn: '365d'
        });

        let user = _.pick(userData, ['id', 'email', 'name', 'image', 'mobile', 'isUser', 'isVendor', 'isActive', 'isBlocked', 'createdAt', 'updatedAt', 'lastLoginAt'])
        return success(res, USER_CONSTANTS.LOGGED_IN, {
            user,
            token
        });
    } catch (error) {
        return failed(res, SYSTEM_FAILURE);

    }
}
exports.getRateType = async (req, res) => {
    try {
        const userData = await User.findOne({
            where: {
                id: req.decodedData.id
            },
            attributes: ['id', 'email', 'rateType']
        });

        if (!userData) {
            return failed(res, USER_CONSTANTS.USER_NOT_FOUND);
        }
        let data = {
            rateType: userData.rateType ? (userData.rateType == 1 ? 'perkg' : (userData.rateType == 2 ? 'perbox' : 'both')) : 'perkg'
        }
        return success(res, "Rate type", data)
    } catch (error) {
        return failed(res, SYSTEM_FAILURE);
    }
}
