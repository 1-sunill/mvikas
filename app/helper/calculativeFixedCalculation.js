const moment = require('moment')
const {
    success,
    failed,
    serverError,
    validateFail,
    response
} = require("../helper/response");

const {
    USER_CONSTANTS,
    EMAIL_CONSTANTS,
    AUTH_CONSTANTS,
    SYSTEM_FAILURE,
    PINCODE_CONSTANTS,
    SERVICE_CONSTANTS,
    ORDER_CONSTANTS
} = require('../helper/message');
const db = require("../../models");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const StateByPincode = db.mvPincode;
const User = db.mvUser;
const StateCharge = db.mvStateCharge
const {
    Validator
} = require("node-input-validator");
const {
    fn,
    col,
    Op,
    where,
    literal
} = require("sequelize")
module.exports = {
    calculateCharge: async (
        charges,
        finalShipmentWeight,
        oda,
        BaseFreight,
        shipmentWeight,
        shipmentAmount,
        items
    ) => {
        try {
            let itemLength = items.length
            // Validate input parameters
            if (!charges) {
                throw new Error('Charges object is required');
            }

            // Helper function to safely evaluate mathematical expressions
            const safeEval = (expression) => {
                try {
                    // Remove any potential harmful code, only allow numbers and basic operators
                    const sanitizedExpression = expression.replace(/[^0-9\+\-\*\/\.\s]/g, '');
                    return new Function(`return ${sanitizedExpression}`)();
                } catch (error) {
                    console.error('Error evaluating expression:', expression);
                    return 0;
                }
            };

            // Helper function to get slab amount with validation
            const getSlabAmount = (slabCharges, weight, unit) => {
                try {
                    if (!slabCharges?.length || !weight) return 0;

                    let slabBasedAmount = 0;

                    let slab = slabCharges
                    let minSlabCharge = slab.minValue ? parseFloat(slab.minValue).toFixed(2) : 0
                    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                        let boxes = items[itemIndex].boxes
                        if (unit == "gm") {
                            let shipWeight = items[itemIndex].boxWeight * 1000;
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight * 1000) * result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn
                            }

                        } else if (unit == "kg") {
                            let shipWeight = items[itemIndex].boxWeight
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight) * result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                            }

                        } else {
                            let shipWeight = items[itemIndex].boxes
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat(result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                            }
                        }

                    }
                    return slabBasedAmount;

                } catch (error) {
                    console.error('Error calculating slab amount:', error);
                    return 0;
                }

            };

            // Helper function to calculate base charge amount with proper validation
            const calculateBaseCharge = (charge, operator, value) => {
                try {
                    if (!charge?.labelText) return 0;

                    const baseValues = {
                        'basefreight': BaseFreight,
                        'chargeableweight': finalShipmentWeight,
                        'shipmentweight': shipmentWeight,
                        'oda': oda,
                        'shipmentamount': shipmentAmount,
                        'shipmentvalue': shipmentAmount
                    };
                    const key = charge.labelText.toLowerCase().replace(/\s+/g, '');
                    var baseValue = baseValues[key];
                    // console.log({ baseValue, key, }, charge);
                    if (baseValue == null) return 0;
                    if (operator === '%' && value) {
                        // console.log(baseValue, baseValue * (1 + Number(value) / 100));
                        baseValue = baseValue * Number(value) / 100;
                    } else if (operator && value) {
                        baseValue = safeEval(`${baseValue} ${operator} ${value}`);
                    }
                    baseValue = baseValue > charges.minValue ? baseValue : charges.minValue
                    return baseValue ? baseValue : 0;
                } catch (error) {
                    console.error('Error calculating base charge:', error);
                    return 0;
                }
            };

            // Helper function to calculate fixed charge amount with validation
            const calculateFixedCharge = (charge, operator, value) => {
                try {
                    if (!charge) return 0;

                    let baseAmount = 0;
                    if (charge.amount != null) {
                        switch (charge.unitType?.toLowerCase()) {
                            case 'gm':
                                baseAmount = finalShipmentWeight * 1000 * charge.amount;
                                break;
                            case 'kg':
                                baseAmount = finalShipmentWeight * charge.amount;
                                break;
                            default:
                                baseAmount = itemLength * charge.amount;
                        }
                    }

                    if (baseAmount === 0 && charge.minValue != null) {
                        baseAmount = charge.minValue * itemLength;
                    }
                    if (operator === '%' && value) {
                        baseAmount = baseAmount * (1 + Number(value) / 100);
                    } else if (operator && value) {
                        baseAmount = safeEval(`${baseAmount} ${operator} ${value}`);
                    }
                    baseAmount = baseAmount > charge.amount ? baseAmount : charge.amount
                    return baseAmount;
                } catch (error) {
                    console.error('Error calculating fixed charge:', error);
                    return 0;
                }
            };

            // Helper function to calculate slab charge amount with validation
            const calculateSlabCharge = (charge, operator, value) => {
                try {
                    if (!charge) return 0;

                    const slabAmount = getSlabAmount(
                        charge.mvSlabCharges,
                        finalShipmentWeight,
                        charge.mvSlabCharges?.[0]?.unit
                    );
                    if (slabAmount === 0 && charge.minValue != null) {
                        return safeEval(`${charge.minValue * itemLength} ${operator} ${value}`);
                    }
                    if (operator === '%' && value) {
                        return slabAmount * (1 + Number(value) / 100);
                    } else if (operator && value) {
                        return safeEval(`${slabAmount} ${operator} ${value}`);
                    }
                    return slabAmount;
                } catch (error) {
                    console.error('Error calculating slab charge:', error);
                    return 0;
                }
            };

            // Main recursive function to calculate charges with proper error handling
            const calculateChargeRecursive = async (charge) => {
                try {
                    if (!charge?.hasDepedancyData?.length) return 0;
                    let totalAmount = 0;
                    for (let i = 0; i < charge.hasDepedancyData.length; i++) {
                        const dependency = charge.hasDepedancyData[i];
                        if (!dependency?.hasAdditionalCharge) continue;

                        let leftAmount = 0;
                        const additionalCharge = dependency.hasAdditionalCharge || dependency.hasAdditionalCharge1;

                        // Calculate left side amount
                        switch (additionalCharge.chargesType) {
                            case 0:
                                leftAmount = calculateBaseCharge(
                                    additionalCharge,
                                    dependency.operator,
                                    dependency.calculativeCharges1Value
                                );
                                break;
                            case 1:
                                leftAmount = calculateFixedCharge(
                                    additionalCharge,
                                    dependency.operator,
                                    dependency.calculativeCharges1Value
                                );

                                break;
                            case 2:
                                leftAmount = calculateSlabCharge(
                                    additionalCharge,
                                    dependency.operator,
                                    dependency.calculativeCharges1Value
                                );
                                break;
                            case 3:
                                leftAmount = await calculateChargeRecursive(additionalCharge);
                                if (dependency.operator && dependency.calculativeCharges1Value) {
                                    if (dependency.operator === '%') {

                                        leftAmount *= (1 + Number(dependency.calculativeCharges1Value) / 100);
                                    } else {
                                        leftAmount = safeEval(`${leftAmount} ${dependency.operator} ${dependency.calculativeCharges1Value}`);
                                    }
                                }
                                break;
                        }

                        // Handle end operator and right side calculation
                        if (dependency.endOperator && i < charge.hasDepedancyData.length - 1) {
                            const nextDependency = charge.hasDepedancyData[i + 1];
                            let rightAmount = 0;

                            // Calculate right side amount
                            switch (nextDependency.hasAdditionalCharge.chargesType) {
                                case 0:
                                    rightAmount = calculateBaseCharge(
                                        nextDependency.hasAdditionalCharge,
                                        nextDependency.operator,
                                        nextDependency.calculativeCharges1Value
                                    );
                                    break;
                                case 1:
                                    rightAmount = calculateFixedCharge(
                                        nextDependency.hasAdditionalCharge,
                                        nextDependency.operator,
                                        nextDependency.calculativeCharges1Value
                                    );
                                    break;
                                case 2:
                                    rightAmount = calculateSlabCharge(
                                        nextDependency.hasAdditionalCharge1 || nextDependency.hasAdditionalCharge,
                                        nextDependency.operator,
                                        nextDependency.calculativeCharges1Value
                                    );
                                    break;
                                case 3:
                                    rightAmount = await calculateChargeRecursive(nextDependency.hasAdditionalCharge1 || nextDependency.hasAdditionalCharge);
                                    if (nextDependency.operator && nextDependency.calculativeCharges1Value) {
                                        if (nextDependency.operator === '%') {
                                            rightAmount *= (1 + Number(nextDependency.calculativeCharges1Value) / 100);
                                        } else {
                                            rightAmount = safeEval(`${rightAmount} ${nextDependency.operator} ${nextDependency.calculativeCharges1Value}`);
                                        }
                                    }
                                    break;
                            }
                            totalAmount += safeEval(`${leftAmount} ${dependency.endOperator} ${rightAmount}`);
                            i++; // Skip the next dependency since we've already processed it
                        } else {
                            totalAmount += leftAmount;

                        }
                    }
                    return totalAmount;
                } catch (error) {
                    console.error('Error in recursive calculation:', error);
                    return 0;
                }
            };

            try {
                const result = await calculateChargeRecursive(charges);
                return parseFloat(result).toFixed(2);
            } catch (error) {
                console.error('Error calculating charges:', error);
                return '0.00';
            }
        } catch (error) {
            console.log(error.message);
        }
    },
    calulateUnitBased: async (additionalCharge, finalShipmentWeight, items) => {
        try {
            let boxes = items.reduce((sum, item) => sum + item.boxes, 0)
            let unitBasedAmount = 0
            let minSlabCharge = additionalCharge.minValue ? parseFloat(additionalCharge.minValue).toFixed(2) : 0

            if (additionalCharge.unitType == "gm") {
                let unitBasedAmountIn = parseFloat((finalShipmentWeight * 1000) * additionalCharge.amount).toFixed(2)
                unitBasedAmountIn = Number(minSlabCharge) > Number(unitBasedAmountIn) ? minSlabCharge : unitBasedAmountIn

                unitBasedAmount = unitBasedAmount + unitBasedAmountIn

            } else if (additionalCharge.unitType == "kg") {
                let unitBasedAmountIn = parseFloat((finalShipmentWeight) * additionalCharge.amount).toFixed(2)
                unitBasedAmountIn = Number(minSlabCharge) > Number(unitBasedAmountIn) ? minSlabCharge : unitBasedAmountIn
                unitBasedAmount = unitBasedAmount + unitBasedAmountIn

            } else {
                let unitBasedAmountIn = parseFloat((boxes) * additionalCharge.amount).toFixed(2)
                unitBasedAmountIn = Number(minSlabCharge) > Number(unitBasedAmountIn) ? minSlabCharge : unitBasedAmountIn

                unitBasedAmount = Number(unitBasedAmount) + Number(unitBasedAmountIn)
            }
            console.log(unitBasedAmount);
            return unitBasedAmount
        } catch (error) {
            console.log(error.message, "unit based helper");
        }
    },
    calulateSlabBased: async (additionalCharge, finalShipmentWeight, items) => {
        try {
            let slab = additionalCharge.mvSlabCharges ? JSON.parse(additionalCharge.mvSlabCharges) : []
            let slabBasedAmount = 0
            if (slab && slab.length) {
                let unit = slab[0].unit
                let minSlabCharge = additionalCharge.minValue ? parseFloat(additionalCharge.minValue).toFixed(2) : 0
                for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                    let boxes = items[itemIndex].boxes
                    if (unit == "gm") {
                        let shipWeight = items[itemIndex].boxWeight * 1000;
                        const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                        if (result) {
                            let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight * 1000) * result.amount).toFixed(2)
                            slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                            slabBasedAmount = slabBasedAmount + slabBasedAmountIn
                        }

                    } else if (unit == "kg") {
                        let shipWeight = items[itemIndex].boxWeight
                        const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                        if (result) {
                            let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight) * result.amount).toFixed(2)
                            slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                            slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                        }

                    } else {
                        let shipWeight = items[itemIndex].boxes
                        const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                        if (result) {
                            let slabBasedAmountIn = parseFloat(result.amount).toFixed(2)
                            slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * shipWeight ? minSlabCharge : slabBasedAmountIn * shipWeight
                            slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                        }
                    }

                }
            }
            return slabBasedAmount
        } catch (error) {
            console.log(error, "slab based helper");
        }
    },
    checkCargoRateDateValidation: async (dateFrom, dateTo) => {
        try {
            const From = moment(dateFrom, "DD-MM-YYYY");
            const To = moment(dateTo, "DD-MM-YYYY");
            const currentDate = moment();
            const isWithinRange = currentDate.isBetween(From, To, "day", "[]");
            return isWithinRange
        } catch (error) {
            console.log(error.message);
        }
    },
    // Helper function to safely evaluate mathematical expressions
    safeEval: async (expression) => {
        try {
            // Remove any potential harmful code, only allow numbers and basic operators
            const sanitizedExpression = expression.replace(/[^0-9\+\-\*\/\.\s]/g, '');
            return new Function(`return ${sanitizedExpression}`)();
        } catch (error) {
            console.error('Error evaluating expression:', expression);
            return 0;
        }
    },
    calculateChargeNew: async (
        charges,
        finalShipmentWeight,
        oda,
        BaseFreight,
        shipmentWeight,
        shipmentAmount,
        items
    ) => {
        // console.log(charges);
        try {
            let itemLength = items.length
            // Validate input parameters
            if (!charges) {
                throw new Error('Charges object is required');
            }

            // Helper function to safely evaluate mathematical expressions
            const safeEval = (expression) => {
                try {
                    // Remove any potential harmful code, only allow numbers and basic operators
                    const sanitizedExpression = expression.replace(/[^0-9\+\-\*\/\.\s]/g, '');
                    return new Function(`return ${sanitizedExpression}`)();
                } catch (error) {
                    console.error('Error evaluating expression:', expression);
                    return 0;
                }
            };

            // Helper function to get slab amount with validation
            const getSlabAmount = (slabCharges, weight, unit) => {
                try {
                    if (!slabCharges?.length || !weight) return 0;

                    let slabBasedAmount = 0;

                    let slab = slabCharges
                    let minSlabCharge = slab.minValue ? parseFloat(slab.minValue).toFixed(2) : 0
                    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                        let boxes = items[itemIndex].boxes
                        if (unit == "gm") {
                            let shipWeight = items[itemIndex].boxWeight * 1000;
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight * 1000) * result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn
                            }

                        } else if (unit == "kg") {
                            let shipWeight = items[itemIndex].boxWeight
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat((items[itemIndex].boxWeight) * result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                            }

                        } else {
                            let shipWeight = items[itemIndex].boxes
                            const result = slab.find(item => shipWeight >= item.from && shipWeight <= item.to);
                            if (result) {
                                let slabBasedAmountIn = parseFloat(result.amount).toFixed(2)
                                slabBasedAmountIn = minSlabCharge > slabBasedAmountIn * boxes ? minSlabCharge : slabBasedAmountIn * boxes
                                slabBasedAmount = slabBasedAmount + slabBasedAmountIn


                            }
                        }

                    }
                    return slabBasedAmount;

                } catch (error) {
                    console.error('Error calculating slab amount:', error);
                    return 0;
                }

            };

            // Helper function to calculate base charge amount with proper validation
            const calculateBaseCharge = (charge, operator, value) => {
                try {
                    if (!charge?.labelText) return 0;

                    const baseValues = {
                        'basefreight': BaseFreight,
                        'chargeableweight': finalShipmentWeight,
                        'shipmentweight': shipmentWeight,
                        'oda': oda,
                        'shipmentamount': shipmentAmount,
                        'shipmentvalue': shipmentAmount
                    };
                    const key = charge.labelText.toLowerCase().replace(/\s+/g, '');
                    var baseValue = baseValues[key];
                    if (baseValue == null) return 0;
                    if (operator === '%' && value) {
                        // console.log(baseValue, baseValue * (1 + Number(value) / 100));
                        baseValue = baseValue * Number(value) / 100;
                    } else if (operator && value) {
                        baseValue = safeEval(`${baseValue} ${operator} ${value}`);
                    }
                    baseValue = baseValue > charges.minValue ? baseValue : charges.minValue
                    return baseValue ? baseValue : 0;
                } catch (error) {
                    console.error('Error calculating base charge:', error);
                    return 0;
                }
            };

            // Helper function to calculate fixed charge amount with validation
            const calculateFixedCharge = (charge, operator, value) => {
                try {
                    if (!charge) return 0;

                    let baseAmount = 0;
                    if (charge.amount != null) {
                        switch (charge.unitType?.toLowerCase()) {
                            case 'gm':
                                baseAmount = finalShipmentWeight * 1000 * charge.amount;
                                break;
                            case 'kg':
                                baseAmount = finalShipmentWeight * charge.amount;
                                break;
                            default:
                                baseAmount = itemLength * charge.amount;
                        }
                    }

                    if (baseAmount === 0 && charge.minValue != null) {
                        baseAmount = charge.minValue * itemLength;
                    }
                    if (operator === '%' && value) {
                        return baseAmount * (1 + Number(value) / 100);
                    } else if (operator && value) {
                        return safeEval(`${baseAmount} ${operator} ${value}`);
                    }
                    return baseAmount;
                } catch (error) {
                    console.error('Error calculating fixed charge:', error);
                    return 0;
                }
            };

            // Helper function to calculate slab charge amount with validation
            const calculateSlabCharge = (charge, operator, value) => {
                try {
                    if (!charge) return 0;

                    const slabAmount = getSlabAmount(
                        charge.mvSlabCharges,
                        finalShipmentWeight,
                        charge.mvSlabCharges?.[0]?.unit
                    );
                    if (slabAmount === 0 && charge.minValue != null) {
                        return safeEval(`${charge.minValue * itemLength} ${operator} ${value}`);
                    }
                    if (operator === '%' && value) {
                        return slabAmount * (1 + Number(value) / 100);
                    } else if (operator && value) {
                        return safeEval(`${slabAmount} ${operator} ${value}`);
                    }
                    return slabAmount;
                } catch (error) {
                    console.error('Error calculating slab charge:', error);
                    return 0;
                }
            };

            // Main recursive function to calculate charges with proper error handling
            const calculateChargeRecursive = async (charge) => {
                try {
                    if (!charge?.hasDepedancyData?.length) {
                        if (charge.chargesType == 0) {
                            let x = calculateBaseCharge(
                                charge,
                                charge.operator,
                                charge.calculativeCharges1Value
                            );
                            return x
                        }
                        if (charge.chargesType == 2) {
                            let x = calculateSlabCharge(
                                charge,
                                charge.operator,
                                charge.calculativeCharges1Value
                            );
                            return x
                        }
                    } else {
                        if (!charge?.hasDepedancyData?.length) return 0;
                        let totalAmount = 0;
                        for (let i = 0; i < charge.hasDepedancyData.length; i++) {
                            const dependency = charge.hasDepedancyData[i];
                            if (!dependency?.hasAdditionalCharge) continue;

                            let leftAmount = 0;
                            const additionalCharge = dependency.hasAdditionalCharge || dependency.hasAdditionalCharge1;
                            // Calculate left side amount
                            switch (additionalCharge.chargesType) {
                                case 0:
                                    leftAmount = calculateBaseCharge(
                                        additionalCharge,
                                        dependency.operator,
                                        dependency.calculativeCharges1Value
                                    );
                                    break;
                                case 1:
                                    leftAmount = calculateFixedCharge(
                                        additionalCharge,
                                        dependency.operator,
                                        dependency.calculativeCharges1Value
                                    );

                                    break;
                                case 2:
                                    leftAmount = calculateSlabCharge(
                                        additionalCharge,
                                        dependency.operator,
                                        dependency.calculativeCharges1Value
                                    );
                                    break;
                                case 3:
                                    leftAmount = await calculateChargeRecursive(additionalCharge);
                                    if (dependency.operator && dependency.calculativeCharges1Value) {
                                        if (dependency.operator === '%') {

                                            leftAmount *= (1 + Number(dependency.calculativeCharges1Value) / 100);
                                        } else {
                                            leftAmount = safeEval(`${leftAmount} ${dependency.operator} ${dependency.calculativeCharges1Value}`);
                                        }
                                    }
                                    break;
                            }

                            // Handle end operator and right side calculation
                            if (dependency.endOperator && i < charge.hasDepedancyData.length - 1) {
                                const nextDependency = charge.hasDepedancyData[i + 1];
                                let rightAmount = 0;

                                // Calculate right side amount
                                switch (nextDependency.hasAdditionalCharge.chargesType) {
                                    case 0:
                                        rightAmount = calculateBaseCharge(
                                            nextDependency.hasAdditionalCharge,
                                            nextDependency.operator,
                                            nextDependency.calculativeCharges1Value
                                        );
                                        break;
                                    case 1:
                                        rightAmount = calculateFixedCharge(
                                            nextDependency.hasAdditionalCharge,
                                            nextDependency.operator,
                                            nextDependency.calculativeCharges1Value
                                        );
                                        break;
                                    case 2:
                                        rightAmount = calculateSlabCharge(
                                            nextDependency.hasAdditionalCharge1 || nextDependency.hasAdditionalCharge,
                                            nextDependency.operator,
                                            nextDependency.calculativeCharges1Value
                                        );
                                        break;
                                    case 3:
                                        rightAmount = await calculateChargeRecursive(nextDependency.hasAdditionalCharge1 || nextDependency.hasAdditionalCharge);
                                        if (nextDependency.operator && nextDependency.calculativeCharges1Value) {
                                            if (nextDependency.operator === '%') {
                                                rightAmount *= (1 + Number(nextDependency.calculativeCharges1Value) / 100);
                                            } else {
                                                rightAmount = safeEval(`${rightAmount} ${nextDependency.operator} ${nextDependency.calculativeCharges1Value}`);
                                            }
                                        }
                                        break;
                                }
                                totalAmount += safeEval(`${leftAmount} ${dependency.endOperator} ${rightAmount}`);
                                i++; // Skip the next dependency since we've already processed it
                            } else {
                                totalAmount += leftAmount;

                            }
                        }
                        return totalAmount;
                    }
                } catch (error) {
                    console.error('Error in recursive calculation:', error);
                    return 0;
                }
            };

            try {
                const result = await calculateChargeRecursive(charges);
                return parseFloat(result).toFixed(2);
            } catch (error) {
                console.error('Error calculating charges:', error);
                return '0.00';
            }
        } catch (error) {
            console.log(error.message);
        }
    },
    evaluateLeftToRight: async (expression) => {
        const parts = expression.match(/(\d+(\.\d+)?|[+\-*%])/g);
        let result = parseFloat(parts[0]);
        let log = `${result}`;

        for (let i = 1; i < parts.length; i += 2) {
            const operator = parts[i];
            const nextNumber = parseFloat(parts[i + 1]);

            if (operator === '+') {
                result += nextNumber;
                log += ` + ${nextNumber} = ${result}`;
            } else if (operator === '-') {
                result -= nextNumber;
                log += ` - ${nextNumber} = ${result}`;
            } else if (operator === '*') {
                result *= nextNumber;
                log += ` * ${nextNumber} = ${result}`;
            } else if (operator === '%') {
                result = (result * nextNumber) / 100;
                log += ` % ${nextNumber} = ${result}`;
            }

            console.log(log);
            log = `${result}`;  // Reset log for the next calculation step
        }

        return result;
    },
    getStateWiseCharge: async (vendorId, sourceState, destinationState) => {
        try {

            let bothStateSame = sourceState == destinationState ? true : false
            let stateChargeObject = {}

            let stateCharges = await StateCharge.findAll({
                where: {
                    vendorId: vendorId,
                    [Op.or]: [{
                        stateName: sourceState
                    }, {
                        stateName: destinationState
                    }]

                }
            })
            
            for (const charge of stateCharges) {
                
                if (charge.type == 'Both') {
                    console.log(sourceState,destinationState,"Uttar Pradesh");
                    let inboundAmount = 0
                    let outboundAmount = 0
                    if (charge.stateName == sourceState) {
                        inboundAmount = charge.amount
                    }
                    if (charge.stateName == destinationState) {
                        outboundAmount = charge.amount
                    }
                    let final = parseFloat(parseFloat(inboundAmount) + parseFloat(outboundAmount)).toFixed(2)                    
                    if (final)
                        stateChargeObject[charge.chargeName] = final
                }
                if (charge.type == 'Inbound') {
                    let inboundAmount = 0
                    if (charge.stateName == sourceState) {
                        inboundAmount = charge.amount
                    }
                    // if (charge.stateName == destinationState) {
                    //     inboundAmount += charge.amount
                    // }
                    if (inboundAmount)
                        stateChargeObject[charge.chargeName] = parseFloat(inboundAmount).toFixed(2)
                }
                if (charge.type == 'Outbound') {
                    let outboundAmount = 0
                    // if (charge.stateName == sourceState) {
                    //     outboundAmount += charge.amount
                    // }
                    if (charge.stateName == destinationState) {
                        outboundAmount = charge.amount
                    }
                    if (outboundAmount)
                        stateChargeObject[charge.chargeName] = parseFloat(outboundAmount).toFixed(2)
                }
            }
            return stateChargeObject
        } catch (error) {
            console.log(error);
        }
    }



}