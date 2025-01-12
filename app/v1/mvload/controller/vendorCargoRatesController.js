const {
    success,
    failed,
    serverError,
    validateFail,
    response,
} = require("../../../helper/response");
const { CHARGES_CONSTANT, EMAIL_CONSTANTS, ADDRESS_CONSTANTS, AUTH_CONSTANTS, SYSTEM_FAILURE, BANK_CONSTANTS, KYC_SUCCESS, VALIDATION_FAILED } = require('../../../helper/message');
const db = require("../../../../models/");
const _ = require("lodash");
const ZoneService = db.mvZoneServiceMap;
const Zone = db.mvZone;
const Cargo = db.mvCargoRates;
const Rates = db.mvRates;
const AdditionalCharges = db.mvAdditionalCharges;
const Formula = db.mvCalculativeFormulation;
const Slab = db.mvSlabCharge;
const ExcelJS = require('exceljs');
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");
const Sequelize = require("sequelize");
const { DataRedundancy } = require("@aws-sdk/client-s3");
const NodeCache = require("node-cache");
const myCache = new NodeCache();

exports.createAdditionalCharges = async (req, res) => {
    try {
        const validate = new Validator(req.body, {
            type: "required",
            chargesType: "required",
            isMin: "sometimes",
            minPlaceholder: "sometimes",
            minUnit: "sometimes|in:$N",
            minValue: "sometimes",
            labelText: "required",
            unitType: "sometimes|in:kg,gm,$N",
            placeholder: "sometimes",
            amount: "sometimes",
            hasDependency: "sometimes|boolean",
            calculative: "sometimes|array",
            slab: "sometimes|array"
        });
        if (req.body.hasDepedancy === true && req.body.calculative.length === 0)
            return res.status(422).json({ code: 422, message: CHARGES_CONSTANT.CALCULATIVE_REQUIRED });

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const { chargesType, labelText, calculative, slab, hasDependency } = req.body;

        delete req.body.calculative;
        delete req.body.slab;

        const vendorId = req.decodedData.id;

        req.body.vendorId = vendorId;

        let charge = await AdditionalCharges.findOne({ where: { chargesType, labelText, vendorId } })

        if (charge) return failed(res, CHARGES_CONSTANT.CHARGE_ALREADY_EXIST);

        var data;
        myCache.del(`additionalChargeList${vendorId}`);

        if (chargesType === 2) {
            data = await AdditionalCharges.create(req.body);
            // let slabData = slab.map(item => ({
            //     ...item,
            //     addtionalChargesId: data.id,

            // }));
            let slabData = slab.filter(item => item.to && item.from && item.unit && item.amount) // Filter out blank rows
                .map(item => ({
                    ...item,
                    addtionalChargesId: data.id,
                }));

            await Slab.bulkCreate(slabData);
            return success(res, CHARGES_CONSTANT.CHARGE_CREATED, data);

        }

        if (chargesType === 3 && hasDependency === true) {
            data = await AdditionalCharges.create(req.body);

            let calcultiveData = calculative.map(item => ({
                ...item,
                addtionalChargesId: data.id,

            }))

            await Formula.bulkCreate(calcultiveData);

            return success(res, CHARGES_CONSTANT.CHARGE_CREATED);

        }
        data = await AdditionalCharges.create(req.body);
        return success(res, CHARGES_CONSTANT.CHARGE_CREATED, data);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getAdditionalCharges = async (req, res) => {
    try {
        const { id } = req.query;

        const vendorId = req.decodedData.id;
        let finalData = []
        const cachedValue = myCache.get(`additionalChargeList${vendorId}`);
        if (cachedValue === undefined) {
            let Additionaldata = await AdditionalCharges.findAll({
                attribute: ['id', 'type', 'labelText', 'unitType', 'placeholder', 'amount'],
                where: {
                    [Op.or]: [{
                        vendorId: vendorId
                    }, {
                        type: 0
                    }]
                },
                include: [{ model: Slab }]
            });
            for (const additionalCharge of Additionaldata) {
                if (additionalCharge.chargesType == 3) {
                    finalData.push(await fetchRelatedData(additionalCharge));
                } else {
                    finalData.push(additionalCharge)
                }
            }
            // for (let i = 0; i < Additionaldata.length; i++) {
            //     let id = Additionaldata[i].id
            //     if (Additionaldata[i].chargesType == 3) {
            //         // let data = await AdditionalCharges.findOne({
            //         //     attribute: ['id', 'type', 'labelText', 'unitType', 'placeholder', 'amount'], where: { id },
            //         //     include: [
            //         //         {
            //         //             model: Formula,
            //         //             as: "formulaData",
            //         //             attributes: ["id", "addtionalChargesId", "calculativeChargesId", "calculativeChargesValue", "operator", "calculativeCharges1Id", "calculativeCharges1Value", "endOperator"],
            //         //             include: [
            //         //                 {
            //         //                     model: AdditionalCharges,
            //         //                     as: "calculativeChargesIdData",
            //         //                     attributes: ["id", "labelText", "placeholder", "amount"],
            //         //                 },
            //         //                 {
            //         //                     model: AdditionalCharges,
            //         //                     as: "calculativeCharges1IdData",
            //         //                     attributes: ["id", "labelText", "placeholder", "amount"],
            //         //                 },
            //         //             ]
            //         //         },
            //         //     ],
            //         // });
            //         // let values = data.formulaData;
            //         // let finalString = '';
            //         // let hasDependencyData = []
            //         // for (const value of values) {
            //         //     let hasDepedancyObject = {}
            //         //     const calculatedValue1 = value.calculativeChargesId
            //         //         ? value.calculativeChargesIdData.labelText
            //         //         : value.calculativeChargesValue;
            //         //     if (value.calculativeChargesId) {
            //         //         let hasAdditionalCharge = await AdditionalCharges.findOne({
            //         //             where: {
            //         //                 id: value.calculativeChargesId
            //         //             },
            //         //             include: [{ model: Slab }]
            //         //         })
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             hasAdditionalCharge: hasAdditionalCharge
            //         //         })
            //         //     } else if (value.calculativeChargesIdData && value.calculativeChargesIdData.labelText) {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             labelText: value.calculativeChargesIdData.labelText
            //         //         })
            //         //     } else if (value.calculativeChargesValue) {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             calculativeChargesValue: value.calculativeChargesValue
            //         //         })
            //         //     }
            //         //     const operator = value.operator;
            //         //     if (operator) {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             operator: operator
            //         //         })
            //         //     }
            //         //     const calculatedValue2 = value.calculativeCharges1Id
            //         //         ? value.calculativeCharges1IdData.labelText
            //         //         : value.calculativeCharges1Value;

            //         //     if (value.calculativeCharges1Id) {
            //         //         let hasAdditionalCharge = await AdditionalCharges.findOne({
            //         //             where: {
            //         //                 id: value.calculativeCharges1Id
            //         //             },
            //         //             include: [{ model: Slab }]
            //         //         })
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             hasAdditionalCharge: hasAdditionalCharge
            //         //         })
            //         //     } else if (value.calculativeCharges1IdData && value.calculativeCharges1IdData.labelText) {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             labelText: value.calculativeCharges1IdData.labelText
            //         //         })
            //         //     } else if (value.calculativeCharges1Value) {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             calculativeChargesValue: value.calculativeCharges1Value
            //         //         })
            //         //     }

            //         //     const endOperator = value.endOperator || '';

            //         //     if (calculatedValue1 !== 'null' && calculatedValue2 !== 'null') {
            //         //         finalString += `${calculatedValue1}${operator}${calculatedValue2}`;
            //         //     } else if (calculatedValue1 !== 'null') {
            //         //         finalString += `${calculatedValue1}${operator}`;
            //         //     } else if (calculatedValue2 !== 'null') {
            //         //         finalString += `${calculatedValue2}`;
            //         //     }

            //         //     if (endOperator !== 'null') {
            //         //         hasDepedancyObject = Object.assign(hasDepedancyObject, {
            //         //             endOperator: endOperator
            //         //         })
            //         //         finalString += endOperator;
            //         //     }
            //         //     hasDependencyData.push(hasDepedancyObject)
            //         // };
            //         // Additionaldata[i].dataValues.finalString = finalString
            //         // Additionaldata[i].dataValues.hasDepedancyData = hasDependencyData
            //         // finalData.push(Additionaldata[i])                
            //         // finalData.push(await fetchRelatedData(Additionaldata[i]));                
            //     } else {
            //         finalData.push(Additionaldata[i])
            //     }
            // }

            myCache.set(`additionalChargeList${vendorId}`, JSON.stringify(finalData), 86400)
        } else {
            finalData = JSON.parse(cachedValue)
        }

        if (id) {
            let data = await AdditionalCharges.findOne({
                attribute: ['id', 'type', 'labelText', 'unitType', 'placeholder', 'amount'], where: { id },

                include: [
                    { model: Slab },
                    {
                        model: Formula,
                        as: "formulaData",
                        attributes: ["id", "addtionalChargesId", "calculativeChargesId", "calculativeChargesValue", "operator", "calculativeCharges1Id", "calculativeCharges1Value", "endOperator"],
                        include: [
                            {
                                model: AdditionalCharges,
                                as: "calculativeChargesIdData",
                                attributes: ["id", "labelText", "placeholder", "amount"],
                            },
                            {
                                model: AdditionalCharges,
                                as: "calculativeCharges1IdData",
                                attributes: ["id", "labelText", "placeholder", "amount"],
                            },
                        ]
                    },
                ],
            });

            let values = data.formulaData;
            let finalString = '';

            values.forEach((value) => {
                const calculatedValue1 = value.calculativeChargesId
                    ? value.calculativeChargesIdData.labelText
                    : value.calculativeChargesValue;

                const operator = value.operator;

                const calculatedValue2 = value.calculativeCharges1Id
                    ? value.calculativeCharges1IdData.labelText
                    : value.calculativeCharges1Value;

                const endOperator = value.endOperator || '';

                if (calculatedValue1 !== 'null' && calculatedValue2 !== 'null') {
                    finalString += `${calculatedValue1}${operator}${calculatedValue2}`;
                } else if (calculatedValue1 !== 'null') {
                    finalString += `${calculatedValue1}${operator}`;
                } else if (calculatedValue2 !== 'null') {
                    finalString += `${calculatedValue2}`;
                }

                if (endOperator !== 'null') {
                    finalString += endOperator;
                }
            });

            // data.finalString =finalString


            return success(res, CHARGES_CONSTANT.CHARGE_FETCH, { data, finalString });
        }
        return success(res, CHARGES_CONSTANT.CHARGE_FETCH, finalData);
    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.updateAdditionalCharges = async (req, res) => {
    try {
        const allowedFields = [
            "id",
            "isMin",
            "minPlaceholder",
            "minUnit",
            "minValue",
            "labelText",
            "unitType",
            "placeholder",
            "amount",
            "hasDepedancy",
            "calculative",
            "slab"
        ];

        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));

        if (extraFields.length > 0) {
            return res.status(400).json({
                code: 400,
                message: `Invalid fields: ${extraFields.join(", ")}`,
            });
        }

        const validate = new Validator(req.body, {
            id: "required",
            isMin: "sometimes",
            minPlaceholder: "sometimes",
            minUnit: "sometimes|in:$N",
            minValue: "sometimes",
            labelText: "sometimes",
            unitType: "sometimes|in:kg,gm,$N",
            placeholder: "sometimes",
            amount: "sometimes",
            hasDepedancy: "sometimes|boolean",
            calculative: "sometimes|array",
            slab: "sometimes|array"
        });

        if (req.body.hasDepedancy === true && req.body.calculative.length === 0) {
            return res.status(422).json({ code: 422, message: CHARGES_CONSTANT.CALCULATIVE_REQUIRED });
        }

        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }

        const { id, labelText, calculative, slab, hasDepedancy } = req.body;

        delete req.body.calculative;
        delete req.body.slab;

        const vendorId = req.decodedData.id;
        req.body.vendorId = vendorId;

        let charge = await AdditionalCharges.findOne({ where: { id, vendorId } });

        if (!charge) return failed(res, CHARGES_CONSTANT.CHARGE_NOT_EXIST);

        let chargesType = charge.chargesType;
        let data;
        myCache.del(`additionalChargeList${vendorId}`);

        if (chargesType === 2) {
            let dbSlabs = await Slab.findAll({ where: { addtionalChargesId: id } });

            let dbSlabMap = dbSlabs.reduce((map, slab) => {
                map[slab.id] = slab;
                return map;
            }, {});

            let idsToKeep = [];
            let newSlabs = [];

            if (Array.isArray(slab)) {
                slab.forEach(item => {
                    if (item.id && dbSlabMap[item.id]) {
                        idsToKeep.push(item.id);
                        dbSlabMap[item.id].update(item);
                    } else {
                        newSlabs.push({
                            ...item,
                            addtionalChargesId: id,
                        });
                    }
                });
            }

            let idsToDelete = dbSlabs
                .filter(dbSlab => !idsToKeep.includes(dbSlab.id))
                .map(dbSlab => dbSlab.id);

            await Slab.destroy({ where: { id: idsToDelete } });

            if (newSlabs.length > 0) {
                await Slab.bulkCreate(newSlabs);
            }

            data = await charge.update(req.body);

            return success(res, CHARGES_CONSTANT.CHARGE_UPDATED);
        }


        if (chargesType === 3 && hasDepedancy === true) {
            let dbFormulas = await Formula.findAll({ where: { addtionalChargesId: id } });

            let dbFormulaMap = dbFormulas.reduce((map, formula) => {
                map[formula.id] = formula;
                return map;
            }, {});

            let idsToKeep = [];

            if (Array.isArray(calculative)) {
                for (let item of calculative) {
                    if (item && item.id && dbFormulaMap[item.id]) {
                        // Update existing Formula records
                        idsToKeep.push(item.id);
                        await dbFormulaMap[item.id].update(item);
                    } else if (item && !item.id) {
                        // Create new Formula records
                        await Formula.create({
                            ...item,
                            addtionalChargesId: id,
                        });
                    }
                }
            }

            // Delete Formula records that are not in the incoming data
            let idsToDelete = dbFormulas
                .filter(dbFormula => !idsToKeep.includes(dbFormula.id))
                .map(dbFormula => dbFormula.id);

            await Formula.destroy({ where: { id: idsToDelete } });

            // Now, update the existing AdditionalCharges record
            await AdditionalCharges.update(req.body, { where: { id } });

            return success(res, CHARGES_CONSTANT.CHARGE_UPDATED);
        }


        data = await charge.update(req.body);
        return success(res, CHARGES_CONSTANT.CHARGE_UPDATED, data);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

//cargoRates
exports.createCargoRate = async (req, res) => {
    try {
        // Validate request body
        const validate = new Validator(req.body, {
            // rateType: "required|in:1,2", //1=>per kg,2=>per box
            serviceId: 'required|integer',
            rateFormula: 'requiredIf:rateType,1',
            dividend: 'requiredIf:rateType,1',
            cwMax: 'required',
            cwMin: 'required',
            GST: 'required|min:0',
            minFreight: 'required',
            // mallCharge: 'required',
            // sundayCharge: 'required',
            // csdCharge: 'required',
            // appointmentMin: 'required',
            // appointmentPerKg: 'required',
            // floorCharge: 'required',
            ODA1MinRate: 'required',
            ODA1PerKg: 'required',
            ODA2MinRate: 'required',
            ODA2PerKg: 'required',
            ODA3MinRate: 'required',
            ODA3PerKg: 'required',
            dateFrom: 'required',
            dateTo: 'required',
            additionalCharge: 'nullable'
        });
        const matched = await validate.check();
        if (!matched) {
            return validateFail(res, validate);
        }
        if (!req.files)
            return response(res, 422, "Excel sheet required")
        if (!req.files.excelSheet)
            return response(res, 422, "Excel sheet required")
        const excelSheet = req.files.excelSheet;
        const vendorId = req.decodedData.id;
        req.body.rateType = req.body.rateType ? req.body.rateType : 1
        req.body.serviceId = parseInt(req.body.serviceId);
        req.body.vendorId = vendorId;
        if (req.body.rateType == 2) {
            req.body.rateFormula = null
            req.body.dividend = null
        }

        const cargofinder = await Cargo.findOne({ where: { serviceId: req.body.serviceId, vendorId: vendorId, rateType: req.body.rateType } });

        if (cargofinder) {
            await Cargo.destroy({
                where: {
                    id: cargofinder.id,
                    rateType: req.body.rateType
                }
            })
            await Rates.destroy({
                where: {
                    cargoId: cargofinder.id,
                    rateType: req.body.rateType
                }
            });
        }

        // let additionalChargeData = req.body.additionalCharge ? JSON.parse(req.body.additionalCharge) : []
        // let finalData = []
        // if (additionalChargeData.length) {
        //     let additionalChargeIds = additionalChargeData.map(charge => charge.id)
        //     let additionalCharges = await AdditionalCharges.findAll({
        //         where: {
        //             id: {
        //                 [Op.in]: additionalChargeIds
        //             },
        //             chargesType: 3
        //         },
        //         include: [{ model: Slab }]
        //     })
        //     for (const additionalCharge of additionalCharges) {
        //         if (additionalCharge.chargesType == 3) {
        //             finalData.push(await fetchRelatedData(additionalCharge));
        //         } else {
        //             finalData.push(additionalCharge)
        //         }
        //     }
        // }

        // return success(res, 'data', finalData)
        // Create Cargo entry
        const cargoData = await Cargo.create(req.body);

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
            return zone ? zone.id : null;
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

        const rateEntries = [];
        for (let i = 1; i < findIdData.length; i++) {
            for (let j = 1; j < findIdData[i].length; j++) {
                const rate = findIdData[i][j];
                if (rate) {
                    const zoneIdFrom = findIdData[i][0];
                    const zoneIdTo = findIdData[0][j];
                    const dataEntry = {
                        zoneIdFrom,
                        zoneIdTo,
                        rates: rate,
                        cargoId: cargoData.id,
                        vendorId,
                        rateType: req.body.rateType ? req.body.rateType : 1
                    };

                    rateEntries.push(dataEntry);
                }
            }
        }

        await Rates.bulkCreate(rateEntries);

        return success(res, CHARGES_CONSTANT.CARGO_CREATED);
    } catch (error) {
        console.error('System failure:', error);
        return failed(res, 'System failure.');
    }
};

exports.rateSheetDownload = async (req, res) => {
    try {

        const serviceId = req.params.id;
        const vendorId = req.decodedData.id;
        let zoneService = await ZoneService.findAll({
            where: { serviceId, vendorId, isActive: true }
        })
        let zoneData = await Zone.findAll({
            where: {
                isActive: true,
                id: {
                    [Op.in]: zoneService.map(zone => zone.zoneId)
                }
            }
        })


        const zoneNames = [...new Set(zoneData.map(item => item.name))];
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Zone Matrix');

        worksheet.addRow(['From/To', ...zoneNames]);
        zoneNames.forEach(zone => worksheet.addRow([zone, ...new Array(zoneNames.length).fill('')]));
        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=zone_matrix.xlsx');

        await workbook.xlsx.write(res);
        return res.end();

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};

exports.getCargoRates = async (req, res) => {
    try {
        const vendorId = req.decodedData.id;
        let serviceId;

        if (req.params.id) {
            serviceId = req.params.id;
        }

        const data = await Cargo.findAll({
            where: { vendorId },
            attributes: ['id', 'serviceId', 'rateFormula', 'dividend', 'cwMax', 'cwMin', 'GST', 'minFreight', 'ODA1MinRate', 'ODA1PerKg', 'ODA2MinRate', 'ODA2PerKg', 'ODA3MinRate', 'ODA3PerKg', 'dateFrom', 'dateTo', 'additionalCharge', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: Rates,
                    as: 'rateData',
                    attributes: ['id', 'vendorId', 'zoneIdTo', 'zoneIdFrom', 'rates', 'createdAt', 'updatedAt'],
                    include: [{
                        model: Zone,
                        as: "zoneFrom",
                        attributes: ['id', 'name']
                    },
                    {
                        model: Zone,
                        as: "zoneTo",
                        attributes: ['id', 'name']

                    }]
                }
            ]
        });

        if (serviceId) {
            const data = await Cargo.findOne({
                where: { serviceId },
                attributes: ['id', 'serviceId', 'rateFormula', 'dividend', 'cwMax', 'cwMin', 'GST', 'minFreight', 'ODA1MinRate', 'ODA1PerKg', 'ODA2MinRate', 'ODA2PerKg', 'ODA3MinRate', 'ODA3PerKg', 'dateFrom', 'dateTo', 'additionalCharge', 'createdAt', 'updatedAt'],
                include: [
                    {
                        model: Rates,
                        as: 'rateData',
                        attributes: ['id', 'vendorId', 'zoneIdTo', 'zoneIdFrom', 'rates', 'createdAt', 'updatedAt'],
                        include: [{
                            model: Zone,
                            as: "zoneFrom",
                            attributes: ['id', 'name']
                        },
                        {
                            model: Zone,
                            as: "zoneTo",
                            attributes: ['id', 'name']

                        }]
                    }
                ]
            });
            return success(res, CHARGES_CONSTANT.CARGO_FETCHED, data);
        }

        return success(res, CHARGES_CONSTANT.CARGO_FETCHED, data);

    } catch (error) {
        console.error(SYSTEM_FAILURE, error);
        return failed(res, SYSTEM_FAILURE);
    }
};


const fetchRelatedData = async (charge, depth = 0, maxDepth = 5) => {
    if (depth >= maxDepth) return charge; // Stop recursion at max depth

    // Fetch Formula related to the current AdditionalCharges
    const formulaData = await Formula.findAll({
        where: { addtionalChargesId: charge.id },
        attributes: [
            "id", "addtionalChargesId", "calculativeChargesId", "calculativeChargesValue",
            "operator", "calculativeCharges1Id", "calculativeCharges1Value", "endOperator"
        ],
        include: [
            {
                model: AdditionalCharges,
                as: "calculativeChargesIdData",
                attributes: ["id", "labelText", "placeholder", "amount"],
                include: [{ model: Slab }]
            },
            {
                model: AdditionalCharges,
                as: "calculativeCharges1IdData",
                attributes: ["id", "labelText", "placeholder", "amount"],
                include: [{ model: Slab }]
            }
        ]
    });

    let finalString = '';
    let hasDependencyData = [];

    // Loop through each formula and handle the relationships recursively
    for (const formula of formulaData) {
        let hasDepedancyObject = {};

        // Recursively fetch related AdditionalCharges for both calculativeChargesId and calculativeCharges1Id
        if (formula.calculativeChargesId) {
            let relatedCharge = await AdditionalCharges.findOne({
                where: { id: formula.calculativeChargesId },
                include: [{ model: Slab }]
            });
            relatedCharge = await fetchRelatedData(relatedCharge, depth + 1, maxDepth); // Recurse
            hasDepedancyObject.hasAdditionalCharge = relatedCharge;
        }

        if (formula.calculativeChargesValue) {
            hasDepedancyObject.calculativeChargesValue = formula.calculativeChargesValue;
        }
        if (formula.operator) {
            hasDepedancyObject.operator = formula.operator;
        }

        if (formula.calculativeCharges1Id) {
            let relatedCharge = await AdditionalCharges.findOne({
                where: { id: formula.calculativeCharges1Id },
                include: [{ model: Slab }]
            });
            relatedCharge = await fetchRelatedData(relatedCharge, depth + 1, maxDepth); // Recurse
            hasDepedancyObject.hasAdditionalCharge1 = relatedCharge;
        }
        if (formula.calculativeCharges1Value) {
            hasDepedancyObject.calculativeCharges1Value = formula.calculativeCharges1Value;
        }

        const calculatedValue1 = formula.calculativeChargesId
            ? formula.calculativeChargesIdData.labelText
            : formula.calculativeChargesValue;

        const calculatedValue2 = formula.calculativeCharges1Id
            ? formula.calculativeCharges1IdData.labelText
            : formula.calculativeCharges1Value;

        const operator = formula.operator;
        const endOperator = formula.endOperator || '';

        if (calculatedValue1 !== 'null' && calculatedValue2 !== 'null') {
            finalString += `${calculatedValue1}${operator}${calculatedValue2}`;
        } else if (calculatedValue1 !== 'null') {
            finalString += `${calculatedValue1}${operator}`;
        } else if (calculatedValue2 !== 'null') {
            finalString += `${calculatedValue2}`;
        }

        if (endOperator !== 'null') {
            hasDepedancyObject.endOperator = endOperator;
            finalString += endOperator;
        }

        hasDependencyData.push(hasDepedancyObject);
    }

    charge.dataValues.finalString = finalString;
    charge.dataValues.hasDepedancyData = hasDependencyData;

    return charge;
};

const createFinalData = async (data) => {
    let result = [];
    let hasDepedancyObject = {};
    if (data.dataValues.hasDepedancyData && data.dataValues.hasDepedancyData.length) {
        for (const d of data.dataValues.hasDepedancyData) {
            if (d.hasAdditionalCharge && d.hasAdditionalCharge.dataValues.hasDepedancyData && d.hasAdditionalCharge.dataValues.hasDepedancyData.length) {
                createFinalData(d.hasAdditionalCharge)
            } else {
                hasDepedancyObject = {
                    formula: data.finalString,
                    name: d.hasAdditionalCharge.labelText,
                    type: d.hasAdditionalCharge.type,
                    chargesType: d.hasAdditionalCharge.chargesType,
                    isMin: d.hasAdditionalCharge.isMin,
                    minUnit: d.hasAdditionalCharge.minUnit,
                    minValue: d.hasAdditionalCharge.minValue,
                    slab: d.hasAdditionalCharge.mvSlabCharges,
                    operator: d.operator,
                    calculativeCharges1Value: d.calculativeCharges1Value ? d.calculativeCharges1Value : d.calculativeChargesValue,
                    endOperator: d.endOperator
                }
                result.push(hasDepedancyObject)
            }
        }
    } else {
        console.log("outer");
        hasDepedancyObject[data.labelText] = data
        result.push(hasDepedancyObject)
    }
    return { result }
}



