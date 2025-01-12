const {
    success,
    failed,
    serverError,
    validateFail,
    response,
} = require("../../../helper/response");

const { ZONE_CONSTANTS, SYSTEM_FAILURE, PINCODE_CONSTANTS, PICUPSLOT_CONSTANTS } = require('../../../helper/message');
const db = require("../../../../models");
const { v4: uuidv4 } = require('uuid');
const _ = require("lodash");
const Pincode = db.mvPincode;
const Zone = db.mvZone;
const Tat = db.mvOdaTat;
const ZoneMap = db.mvZonePinMap;
const ZoneService = db.mvZoneServiceMap;
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");
const ExcelJS = require('exceljs');

// fetch pincodes
exports.getPincode = async (req, res) => {
    try {
        const {
            column = 'city',
            operator = 'equals',
            value,
            status,
            search,
            startDate,
            endDate,
            page = 1,
            limit = process.env.PAGE_LIMIT
        } = req.query;

        const pageSize = parseInt(limit);
        const offset = (parseInt(page) - 1) * pageSize;

        const vendorId = req.decodedData.id;

        const statusMap = {
            serviceable: 'serviceable',
            ODA1: 'ODA1',
            ODA2: 'ODA2',
            ODA3: 'ODA3'
        };

        let searchCondition = {};
        let dateConditions = {};

        if (status) {
            searchCondition['$pinServiceData.isODA$'] = statusMap[status] || status;
        }

        if (search) {
            searchCondition[Op.or] = [
                { city: { [Op.like]: `%${search}%` } },
                { state: { [Op.like]: `%${search}%` } },
                { pincode: { [Op.like]: `%${search}%` } },
                { country: { [Op.like]: `%${search}%` } }
            ];
        }

        if (value) {
            switch (operator) {
                case 'contains':
                    searchCondition[column] = { [Op.like]: `%${value}%` };
                    break;
                case 'equals':
                    searchCondition[column] = { [Op.eq]: value };
                    break;
                case 'starts with':
                    searchCondition[column] = { [Op.like]: `${value}%` };
                    break;
                case 'ends with':
                    searchCondition[column] = { [Op.like]: `%${value}` };
                    break;
                case 'is empty':
                    searchCondition[column] = { [Op.eq]: null };
                    break;
                case 'is not empty':
                    searchCondition[column] = { [Op.ne]: null };
                    break;
                case 'is any of':
                    searchCondition[column] = { [Op.in]: value.split(',') };
                    break;
                default:
                    searchCondition[column] = { [Op.eq]: value };
            }
        }

        if (startDate && endDate) {
            const startDateParsed = new Date(startDate);
            const endDateParsed = new Date(endDate);
            dateConditions = {
                [Op.between]: [startDateParsed, endDateParsed]
            };
            searchCondition['$pinServiceData.createdAt$'] = dateConditions;
        } else if (startDate) {
            const startDateParsed = new Date(startDate);
            dateConditions = {
                [Op.gte]: startDateParsed
            };
            searchCondition['$pinServiceData.createdAt$'] = dateConditions;
        } else if (endDate) {
            const endDateParsed = new Date(endDate);
            dateConditions = {
                [Op.lte]: endDateParsed
            };
            searchCondition['$pinServiceData.createdAt$'] = dateConditions;
        }
        let zoneService = await ZoneService.findAll({
            where: {
                vendorId: req.decodedData.id,
                isActive: true
            }
        })
        if (zoneService.length) {
            searchCondition = Object.assign(searchCondition, {
                id: {
                    [Op.in]: zoneService.map(service => service.zonePinId)
                }
            })
        }
        const pincodes = await Pincode.findAll({
            include: [
                {
                    model: ZoneService,
                    as: 'pinServiceData',
                    attributes: ["id", "zoneId", "zonePinId", "isODA", "createdAt", "isActive"],
                    where: {
                        isActive: true,
                        vendorId,
                        ...(startDate || endDate ? { createdAt: dateConditions } : {})
                    },
                    required: false, 
                    include: [
                        {
                            model: Zone,
                            as: "zoneData",
                            required: false, 
                        }
                    ]
                },
                {
                    model: ZoneMap,
                    as: "pincodeData",
                    attributes: ["id", "zoneId", "vendorId", "isActive"],
                    where: {
                        isActive: true,
                        vendorId: req.decodedData.id,
                    },
                    required: false,
                }
            ],
            attributes: ['id', 'pincode', 'city', 'state', 'country'],
            where: searchCondition,
            order: [["id", "DESC"]],
            limit: pageSize,
            offset: offset
        });
    //    return success(res,pincodes)
  
    const formattedPincodes = pincodes
    .map(pincode => {
        const pinData = pincode.toJSON();
        if (pinData.pincodeData?.length > 0) {
            return {
                id: pinData.id,
                pincode: pinData.pincode,
                city: pinData.city,
                state: pinData.state,
                country: pinData.country,
                zone: pinData.zoneData,
                pinServiceData: {
                    id: pinData.pinServiceData.id,
                    zonePinId: pinData.pinServiceData.zonePinId,
                    isODA: pinData.pinServiceData.isODA,
                    createdAt: pinData.pinServiceData.createdAt,
                    zoneName: pinData.pinServiceData.zoneData?.name || ""
                }
            };
        }
        return null; // Return null if condition is not met
    })
    .filter(Boolean); // Filter out null values


        const totalCount = await Pincode.count({
            where: searchCondition,
            include: [
                {
                    model: ZoneService,
                    as: 'pinServiceData',
                    where: {
                        isODA: { [Op.ne]: null },
                        vendorId,
                        ...(startDate || endDate ? { createdAt: dateConditions } : {})
                    },
                    attributes: []
                },
                {
                    
                    model: ZoneMap,
                    as: "pincodeData",
                    where: { isActive: true,vendorId: req.decodedData.id },
                    required:false
                
            }
            ]
        });

        const finalData = {
            pincodes: formattedPincodes,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / pageSize)
        };

        return success(res, PINCODE_CONSTANTS.PINCODE_FETCH_SUCCESS, finalData);
    } catch (error) {
        console.error('SYSTEM_FAILURE', error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getState = async (req, res) => {
    try {
        const { country } = req.query;

        if (!country)
            return failed(res, PINCODE_CONSTANTS.QUERY_NOT_FOUND);

        const states = await Pincode.findAll({
            attributes: [
                'state',
                [fn('COUNT', col('state')), 'count']
            ],
            where: { country },
            group: ['state'],
            order: [[col('state'), 'ASC']]
        });

        return success(res, PINCODE_CONSTANTS.STATE_FETCH_SUCCESS, states);
    } catch (error) {
        console.error('System Failure:', error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getCity = async (req, res) => {
    try {
        const { state } = req.query;

        if (!state)
            return failed(res, PINCODE_CONSTANTS.QUERY_NOT_FOUND);

        const cities = await Pincode.findAll({
            attributes: [
                'city',
                [fn('COUNT', col('city')), 'count']
            ],
            where: { state },
            group: ['city'],
            order: [[col('city'), 'ASC']]
        });

        return success(res, PINCODE_CONSTANTS.CITY_FETCH_SUCCESS, cities);
    } catch (error) {
        console.error('System Failure:', error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getPincodesbyCityandState = async (req, res) => {
    try {
        const { state, city } = req.query;
        const vendorId = req.decodedData.id;
        const cities = city.split(",");
        if (!state && !city.length) {
            return failed(res, PINCODE_CONSTANTS.INVALID_CITY_STATE);
        }
        let mapped = await ZoneMap.findAll({
            where: {
                vendorId: vendorId,
                isActive: true
            }, include: [{
                model: Pincode,
                as: "pincode"
            }]
        })


        // return success(res, PINCODE_CONSTANTS.PINCODE_FETCH_SUCCESS, mapped);
        const pincodes = await Pincode.findAll({
            attributes: ['pincode', 'id', 'city', 'state'],
            where: {
                state: state,
                city: {
                    [Op.in]: cities
                },
                pincode: {
                    [Op.notIn]: mapped.map(pin => pin?.pincode?.pincode).filter(pincode => pincode !== null && pincode !== undefined)
                }
            },
            order: [['pincode', 'ASC']]
        });


        return success(res, PINCODE_CONSTANTS.PINCODE_FETCH_SUCCESS, pincodes);
    } catch (error) {
        console.error('System Failure:', error); // Provide more context
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.downloadExcelPincode = async (req, res) => {
    try {
        const { city, state, pincode, country, page = 1, limit = process.env.PAGE_LIMIT } = req.query;

        const pageSize = parseInt(limit);
        const offset = (parseInt(page) - 1) * pageSize;

        let params = {};
        if (city || state || pincode || country) {
            params = {
                [Op.or]: [
                    city ? { city: { [Op.like]: `%${city}%` } } : null,
                    state ? { state: { [Op.like]: `%${state}%` } } : null,
                    pincode ? { pincode: { [Op.like]: `%${pincode}%` } } : null,
                    country ? { country: { [Op.like]: `%${country}%` } } : null,
                ].filter(Boolean)
            };
        }

        const pincodes = await Pincode.findAll({
            where: params,
            include: [
                {
                    model: ZoneService,
                    as: 'pinServiceData',
                    attributes: ["id", "zonePinId", "isODA", "createdAt"],
                    where: { isODA: { [Op.ne]: null } },
                }
            ],
            attributes: ['id', 'pincode', 'city', 'state', 'country'],
            order: [["id", "DESC"]],
            limit: pageSize,
            offset: offset,
        });

        const totalCount = await Pincode.count({
            where: params,
            include: [
                {
                    model: ZoneService,
                    as: 'pinServiceData',
                    where: { isODA: { [Op.ne]: null } },
                    attributes: [],
                }
            ],
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pincode Data');

        worksheet.columns = [

            { header: 'Pincode', key: 'pincode', width: 15 },
            { header: 'City', key: 'city', width: 20 },
            { header: 'State', key: 'state', width: 20 },
            { header: 'status', key: 'isODA', width: 10 },
            { header: 'Created At', key: 'createdAt', width: 25 }
        ];

        pincodes.forEach((data) => {
            worksheet.addRow({
                id: data.id,
                pincode: data.pincode,
                city: data.city,
                state: data.state,
                country: data.country,
                zonePinId: data.pinServiceData?.zonePinId,
                isODA: data.pinServiceData?.isODA,
                createdAt: data.pinServiceData?.createdAt,
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="pincode_data.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//zone apis
exports.createZone = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            name: "required",
            pincodeId: "required|array"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const vendorId = req.decodedData.id;
        const { name, pincodeId } = req.body;

        const zone = await Zone.findOne({ where: { vendorId, name } });

        if (zone)
            return failed(res, ZONE_CONSTANTS.ALRADY_EXIST_ZONE);

        let specificId = uuidv4();

        let createZone = await Zone.create({ name, vendorId, uniqueId: specificId, isActive: true });

        if (!createZone)
            return failed(res, ZONE_CONSTANTS.ZONE_ERROR)

        let zoneId = createZone.id;
        let isActive = true
        const zoneRecords = pincodeId.map(pincode => ({
            zoneId,
            vendorId,
            pincodeId: pincode,
            isActive
        }));

        const createdRecords = await ZoneMap.bulkCreate(zoneRecords);
        if (!createdRecords)
            return failed(res, ZONE_CONSTANTS.ZONE_ERROR);

        return success(res, ZONE_CONSTANTS.ZONE_ADD_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getZoneByName = async (req, res) => {
    try {
        const name = req.body.name;
        const vendorId = req.decodedData.id;

        const data = await Zone.findAll({
            where: { vendorId, name, isActive: true },
            include: [
                {
                    model: ZoneMap,
                    as: "zoneMapData",
                    where: { isActive: true },
                    include: [
                        {
                            model: Pincode,
                            as: "pincodeData",
                            attributes: ["id", "pincode", "state", "country", "city"]
                        },
                    ],
                    attributes: ['id', 'zoneId', 'pincodeId', 'vendorId', 'isActive']
                }
            ],
            attributes: ['id', 'name', 'vendorId', 'uniqueId', 'isActive']
        });

        // if (!data || data.length === 0)
        //     return failed(res, ZONE_CONSTANTS.No_DATA_FOUND);

        return success(res, PINCODE_CONSTANTS.PINCODE_FETCH_SUCCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getZone = async (req, res) => {
    try {
        const vendorId = req.decodedData.id;
        let serviceId = req.query.serviceId
        let params = {
            vendorId: vendorId
        }
        if (serviceId) {
            let mappedZone = await ZoneService.findAll({
                where: {
                    serviceId: serviceId,
                    vendorId: vendorId
                }
            })
            params = Object.assign(params, {
                id: {
                    [Op.notIn]: mappedZone.map(id => id.zoneId)
                }
            })
        }

        const data = await Zone.findAll({
            where: params,
            attributes: ['id', 'name', 'uniqueId', 'isActive']
        });

        // if (!data || data.length === 0)
        //     return failed(res, ZONE_CONSTANTS.No_DATA_FOUND);

        return success(res, PINCODE_CONSTANTS.PINCODE_FETCH_SUCCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateZone = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            id: "required|integer",
            name: "required|string",
            pincodeId: "sometimes|array"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const vendorId = req.decodedData.id;
        const { id, name, pincodeId } = req.body;

        const zone = await Zone.findOne({
            where: {
                vendorId: vendorId,
                name: name,
                id: {
                    [Op.ne]: id
                }
            }
        });

        if (zone)
            return failed(res, ZONE_CONSTANTS.ALRADY_EXIST_ZONE);

        let data = await Zone.findOne({ where: { id, vendorId, isActive: true } });
        if (!data)
            return failed(res, ZONE_CONSTANTS.No_DATA_FOUND);

        if (name)
            await data.update({ name });


        if (pincodeId) {
            const existingPincodes = await ZoneMap.findAll({
                attributes: ['id'],
                where: {
                    zoneId: data.id,
                    vendorId,
                    isActive: true
                }
            });

            const existingPincodeIds = existingPincodes.map(pincode => pincode.id);
            const pincodeIdsToDeactivate = existingPincodeIds.filter(id => !pincodeId.includes(id));
            const pincodeIdsToAdd = pincodeId.filter(id => !existingPincodeIds.includes(id));

            if (pincodeIdsToDeactivate.length > 0) {
                await ZoneMap.update(
                    { isActive: false },
                    { where: { id: pincodeIdsToDeactivate } }
                );
            }

            const newPincodeRecords = pincodeIdsToAdd.map(pincode => ({
                zoneId: data.id,
                vendorId,
                pincodeId: pincode,
                isActive: true
            }));

            if (newPincodeRecords.length > 0) {
                await ZoneMap.bulkCreate(newPincodeRecords);
            }
        }

        return success(res, ZONE_CONSTANTS.ZONE_UPDATE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteZone = async (req, res) => {
    try {
        const validate = new Validator(req.params, {
            id: "required|integer",
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const vendorId = req.decodedData.id;
        let id = req.params.id;

        let data = await Zone.destroy(
            {
                individualHooks: true, // Use individual hooks for the destroy operation
                hooks: true, // Enable global hooks
                returning: false, // Do not return the deleted retailer object
                where: { id, vendorId, isActive: true }, // Additional where clause to ensure specific user deletion
            }
        );

        if (!data)
            return failed(res, ZONE_CONSTANTS.No_DATA_FOUND)

        return success(res, ZONE_CONSTANTS.ZONE_DELETED_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//zone service map

exports.createZoneMap = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            serviceId: "required|integer",
            'zoneData.*.zoneId': "required|integer",
            'zoneData.*.zonePinId': "required|array"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const vendorId = req.decodedData.id;
        const { zoneData, serviceId } = req.body;
        let zoneIdForFrontEnd = ""
        for (const zone of zoneData) {
            const { zoneId, zonePinId } = zone;
            zoneIdForFrontEnd = zoneId
            const existingZone = await ZoneService.findOne({
                where: { vendorId, serviceId, zoneId }
            });

            if (existingZone) {
                await ZoneService.destroy({
                    where: { vendorId, serviceId, zoneId }
                });
            }

            const newZonePincode = zonePinId.map(pincode => ({
                zoneId,
                vendorId,
                serviceId,
                zonePinId: pincode,
                isActive: true
            }));

            if (newZonePincode.length > 0) {
                var serviceMapData = await ZoneService.bulkCreate(newZonePincode);
            }
        }

        if (!serviceMapData) {
            return failed(res, ZONE_CONSTANTS.ZONE_SERVICE_ERROR);
        }
        let data = {
            serviceId: serviceId,
            zoneId: zoneIdForFrontEnd
        }
        return success(res, ZONE_CONSTANTS.ZONE_ADD_SUCCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getZoneByService = async (req, res) => {
    try {
        const vendorId = req.decodedData.id;
        const serviceId = JSON.parse(req.query.serviceId);

        // const data = await ZoneService.findAll({
        //     where: { vendorId, serviceId },
        //     attributes: [
        //         'id',
        //         'zoneId',
        //         'serviceId',
        //         [literal('`zoneData`.`name`'), 'zoneName']
        //     ],
        //     include: [
        //         {
        //             model: Zone,
        //             as: 'zoneData',
        //             attributes: ['id', 'name'],
        //             where: { isActive: true }
        //         }
        //     ],
        //     group: ['zoneData.name']
        // });

        const data = await ZoneService.findAll({
            where: { vendorId, serviceId },
            attributes: [
                'id',
                'zoneId',
                'serviceId',
                [literal('`zoneData`.`name`'), 'zoneName']
            ],
            include: [
                {
                    model: Zone,
                    as: 'zoneData',
                    attributes: ['id', 'name'],
                    where: { isActive: true }
                }
            ],
            order: [['createdAt', 'DESC']],
            group: ['zoneId', 'serviceId']

        });
        // const uniqueData = data.filter((value, index, self) =>
        //     index === self.findIndex((t) => (
        //         t.serviceId === value.serviceId && t.zoneId === value.zoneId
        //     ))
        // );


        // const limit = 1000;  // Define batch size
        // let offset = 0;
        // let hasMoreData = true;
        // let allData = [];

        // while (hasMoreData) {
        //     const dataBatch = await ZoneService.findAll({
        //         where: { vendorId, serviceId },
        //         attributes: [
        //             'id',
        //             'zoneId',
        //             'serviceId',
        //             [literal('`zoneData`.`name`'), 'zoneName']
        //         ],
        //         include: [
        //             {
        //                 model: Zone,
        //                 as: 'zoneData',
        //                 attributes: ['id', 'name'],
        //                 where: { isActive: true }
        //             }
        //         ],
        //         order: [['createdAt', 'DESC']],
        //         group: ['zoneId', 'serviceId'],
        //         limit,
        //         offset,
        //     });

        //     allData = allData.concat(dataBatch);
        //     offset += limit;
        //     hasMoreData = dataBatch.length === limit;  // Continue if batch is full
        // }


        return success(res, ZONE_CONSTANTS.ZONE_SERVICE_GET_SUCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getPincodeByService = async (req, res) => {
    try {
        const vendorId = req.decodedData.id;
        const zoneId = JSON.parse(req.query.zoneId);
        const serviceId = JSON.parse(req.query.serviceId);

        const data = await ZoneService.findAll({
            where: { vendorId, zoneId, serviceId, isActive: true },
            attributes: ['id', 'zoneId', 'serviceId', 'zonePinId'],
            include: [
                {
                    // where: { isActive: true },
                    model: Pincode,
                    as: "PinData",
                    attributes: ['id', 'pincode', 'city', 'state']
                }
            ]
        });


        if (!data || data.length === 0)
            return failed(res, ZONE_CONSTANTS.No_DATA_FOUND);

        return success(res, PINCODE_CONSTANTS.ZONE_SERVICE_PINCODE_GET_SUCESS, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.editZoneMap = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            serviceId: "required|integer",
            'ZoneData.*.zoneId': "required|integer",
            'ZoneData.*.zonePinId': "required|array"
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        const vendorId = req.decodedData.id;
        const { zoneId, zonePinId, serviceId } = req.body;

        const zone = await ZoneService.findOne({ where: { vendorId, serviceId, zoneId } });
        if (!zone) return failed(res, ZONE_CONSTANTS.ZONE_SERVICE_NOT_EXIST);

        const existingPincodes = await ZoneService.findAll({
            where: { zoneId, vendorId, serviceId },
            attributes: ['zonePinId']
        });

        const existingPincodeIds = existingPincodes.map(pincode => pincode.zonePinId);
        const pincodeIdsToDeactivate = existingPincodeIds.filter(id => !zonePinId.includes(id));
        const pincodeIdsToAdd = zonePinId.filter(id => !existingPincodeIds.includes(id));

        if (pincodeIdsToDeactivate.length > 0) {
            await ZoneService.update(
                { isActive: false },
                { where: { zonePinId: pincodeIdsToDeactivate } }
            );
        }

        const newPincodeRecords = pincodeIdsToAdd.map(pincode => ({
            zoneId,
            vendorId,
            serviceId,
            zonePinId: pincode,
            isActive: true
        }));

        if (newPincodeRecords.length > 0) {
            await ZoneService.bulkCreate(newPincodeRecords);
        }

        return success(res, ZONE_CONSTANTS.ZONE_SERVICE_UPDATE_SUCCESS);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.deleteZoneMap = async (req, res) => {
    try {

        const vendorId = req.decodedData.id;
        const serviceId = JSON.parse(req.params.serviceId);


        if (!serviceId)
            return failed(res, ZONE_CONSTANTS.ZONE_SERVICE_REQUIRED);

        await ZoneService.destroy({ where: { vendorId, serviceId } });

        return success(res, ZONE_CONSTANTS.ZONE_DELETED_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//oda
exports.uploadOda = async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.ODAExcel;

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.data);
        const worksheet = workbook.getWorksheet(1);

        const updates = [];
        const invalidRows = [];
        const allowedValues = ['serviceable', 'ODA1', 'ODA2', 'ODA3', null, 'non-serviceable'];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const id = row.getCell(1).value;
            let isODA = row.getCell(3).value;

            isODA = isODA || null;

            if (!allowedValues.includes(isODA)) {
                invalidRows.push(rowNumber);
                return;
            }

            updates.push({ id, isODA });
        });

        if (invalidRows.length > 0) {
            // return response(res, 422, `Invalid isODA values at rows ${invalidRows}`)
            return response(res, 422, `Invalid File.`)
            // return failed(res, {
            //     message: ZONE_CONSTANTS.INVALID_DATA_FORMAT,
            //     invalidRows,
            // });
        }

        // Sort updates by ID for consistent processing
        updates.sort((a, b) => a.id - b.id);

        // Step 1: Nullify all existing isODA values for the given vendor and service
        await ZoneService.update(
            { isODA: null },
            {
                where: {
                    vendorId: req.decodedData.id,
                    serviceId: req.body.serviceId,
                }
            }
        );

        // Step 2: Apply new updates
        for (const update of updates) {
            console.log(`Updating zonePinId: ${update.id} with isODA: ${update.isODA}`); // Debug log

            await ZoneService.update(
                { isODA: update.isODA },
                {
                    where: {
                        vendorId: req.decodedData.id,
                        serviceId: req.body.serviceId,
                        zonePinId: update.id
                    }
                }
            );
        }

        return success(res, ZONE_CONSTANTS.ODA_UPDATE_SUCCESS);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        if (error.code === 'ER_LOCK_DEADLOCK') {
            return failed(res, { message: 'Deadlock detected. Please try again.' });
        }
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.dowloadODA = async (req, res) => {
    try {
        const vendorId = req.decodedData.id;
        const serviceId = JSON.parse(req.query.serviceId);
        // const zoneId = JSON.parse(req.query.zoneId);

        const serviceMapData = await ZoneService.findAll({
            where: { vendorId, serviceId, isActive: true },
            attributes: ['zonePinId', 'isODA']
        });

        const pincodeData = await Promise.all(serviceMapData.map(async item => {
            const pin = await Pincode.findOne({ where: { id: item.zonePinId } });
            return { id: pin.id, pincode: pin.pincode, isODA: item.isODA };
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('pincode');

        worksheet.columns = [
            { header: 'id', key: 'id' },
            { header: 'pincode', key: 'pincode' },
            { header: 'isODA', key: 'isODA' },
        ];

        pincodeData.forEach(data => {
            worksheet.addRow(data);
        });

        // Set response headers to indicate file download
        res.setHeader('Content-Disposition', 'attachment; filename=pincode.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const buffer = await workbook.xlsx.writeBuffer();
        res.end(buffer);

        console.info('File sent successfully');
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//tat
exports.dowloadTAT = async (req, res) => {
    try {
        const validate = new Validator(req.query, {
            serviceId: 'required|integer',
            type: 'required|in:standard,ODA',
        });

        if (!(await validate.check())) return validateFail(res, validate);

        const { serviceId, type } = req.query;
        const vendorId = req.decodedData.id;
        const keyToSelect = type === 'standard' ? 'STDTAT' : 'ODATAT';

        const tatData = await Tat.findAll({
            where: {
                vendorId,
                serviceId,
                [keyToSelect]: { [Op.not]: null },
            },
            include: [
                { model: Zone, as: 'fromZone', attributes: ['id', 'name'] },
                { model: Zone, as: 'toZone', attributes: ['id', 'name'] },
            ],
            attributes: ['zoneIdFrom', 'zoneIdTo', keyToSelect],
        });

        if (tatData.length === 0) {
            // const zoneIds = await ZoneService.findAll({
            //     where: { serviceId, vendorId, isActive: true },
            //     attributes: ['id'],
            //     include: [{ model: Zone, as: 'zoneData', attributes: ['id', 'name'], where: { isActive: true } }],
            //     group: ['zoneData.id', 'zoneData.name'],
            // });
            const zoneIds = await ZoneService.findAll({
                where: { serviceId, vendorId, isActive: true },
                attributes: ['id'], // Selecting mvZoneServiceMap.id
                include: [{
                    model: Zone,
                    as: 'zoneData',
                    attributes: ['id', 'name'],
                    where: { isActive: true }
                }],
                group: ['mvZoneServiceMap.id', 'zoneData.id', 'zoneData.name']
            });

            const zoneNames = [...new Set(zoneIds.map(item => item.zoneData.name))];
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Zone Matrix');

            worksheet.addRow(['From/To', ...zoneNames]);
            zoneNames.forEach(zone => worksheet.addRow([zone, ...new Array(zoneNames.length).fill('')]));

            worksheet.getRow(1).font = { bold: true };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=zone_matrix.xlsx');

            await workbook.xlsx.write(res);
            return res.end();
        }

        const zones = tatData.reduce((acc, { zoneIdFrom, zoneIdTo, [keyToSelect]: days, fromZone }) => {
            acc[zoneIdFrom] ??= { name: fromZone.name, days: {} };
            acc[zoneIdFrom].days[zoneIdTo] = days;
            return acc;
        }, {});
        const zoneIds1 = await ZoneService.findAll({
            where: { serviceId, vendorId, isActive: true },
            attributes: ['id'], // Selecting mvZoneServiceMap.id
            include: [{
                model: Zone,
                as: 'zoneData',
                attributes: ['id', 'name'],
                where: { isActive: true }
            }],
            group: ['mvZoneServiceMap.id', 'zoneData.id', 'zoneData.name']
        });
        // Initialize an empty object to store the result

        const result = {};

        // Loop through the input data
        zoneIds1.forEach(item => {
            const zoneId = item.zoneData.id;
            const zoneName = item.zoneData.name;

            // If the zone is not already in the result, add it
            if (!result[zoneId]) {
                result[zoneId] = {
                    name: zoneName,
                    days: {}
                };
            }

            // Add a dummy value for "days" (you can calculate this based on your needs)
            result[zoneId].days[zoneId] = "";  // Use actual logic to calculate this value
        });

        Object.keys(zones).forEach(key => {
            if (result[key]) {
                // Replace the "days" and "name" values from zones into result
                result[key].days = zones[key].days;
                result[key].name = zones[key].name;
            }
        });

        const zoneIds = Object.keys(result);
        const zoneNames = zoneIds.map(zoneId => result[zoneId].name);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('TAT Data');

        worksheet.addRow(['From/To', ...zoneNames]);
        zoneIds.forEach(zoneId => {
            worksheet.addRow([result[zoneId].name, ...zoneIds.map(toZoneId => result[zoneId].days[toZoneId] || '')]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=TATData.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.uploadTAT = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            serviceId: 'required|integer',
            type: 'required|in:standard,ODA',
        });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        if (!req.files)
            return response(res, 422, "Excel file required")
        if (!req.files && !req.files.excelSheet)
            return response(res, 422, "Excel file required")
        const excelSheet = req.files.excelSheet;
        const vendorId = req.decodedData.id;
        const serviceId = req.body.serviceId;
        const type = req.body.type;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(excelSheet.data);

        const worksheet = workbook.getWorksheet(1);


        const sheetData = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            const rowData = row.values.slice(1);
            sheetData.push(rowData);
        });
        const getZoneIdByName = async (zoneName) => {
            const zone = await Zone.findOne({
                where: { name: zoneName, vendorId },
                attributes: ['id'],
            });
            return zone ? zone.id : zoneName;
        };

        const transformData = async (data) => {
            const headerRow = data[0];
            const zoneNames = headerRow.slice(1);

            const zoneIds = await Promise.all(
                zoneNames.map(async (zoneName) => await getZoneIdByName(zoneName))
            );

            const transformedData = [['From/To', ...zoneIds]];

            for (let i = 1; i < data.length; i++) {
                const row = data[i].map((cell, index) => {
                    if (index === 0) {
                        const zoneIndex = zoneNames.indexOf(cell);
                        return zoneIndex >= 0 ? zoneIds[zoneIndex] : cell;
                    }
                    return cell;
                });
                transformedData.push(row);
            }

            return transformedData;
        };

        const findIdData = await transformData(sheetData);
        const daysBetweenZones = [];
        for (let i = 1; i < findIdData.length; i++) {
            if (findIdData[i].length <= 1) {
                return response(res, 422, 'Invalid tat value')
            }
            for (let j = 1; j < findIdData[i].length; j++) {
                let days = findIdData[i][j];
                days = days ? parseInt(days) : ""
                if (days && !Number.isInteger(days)) {
                    return response(res, 422, 'Invalid tat value')

                }
                if (days) {
                    const zoneIdFrom = findIdData[i][0];
                    const zoneIdTo = findIdData[0][j];
                    const dataEntry = {
                        zoneIdFrom,
                        zoneIdTo,
                        serviceId,
                        vendorId,
                    };
                    if (type === 'standard') {
                        dataEntry.STDTAT = days;
                    } else if (type === 'ODA') {
                        dataEntry.ODATAT = days;
                    }

                    daysBetweenZones.push(dataEntry);
                }
            }
        }
        const keyToDelete = type === 'standard' ? 'STDTAT' : 'ODATAT';
        await Tat.destroy({
            where: {
                vendorId,
                serviceId,
                [keyToDelete]: {
                    [Op.not]: null,
                },
            },
            individualHooks: true,
            hooks: true,
            returning: false,
        });

        // Create new records
        await Tat.bulkCreate(daysBetweenZones);

        return success(res, ZONE_CONSTANTS.TAT_UPDATE_SUCCESS);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


