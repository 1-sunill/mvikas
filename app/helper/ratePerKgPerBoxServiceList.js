const db = require("../../models");
const _ = require("lodash");
const Service = db.mvService;
const User = db.mvUser;
const UserAccountDetails = db.mvAccountDetails;
const VendorSetting = db.mvVendorSetting;
const Pincode = db.mvPincode;
const ZonePinMap = db.mvZonePinMap;
const ZoneServiceMap = db.mvZoneServiceMap;
const VendorRate = db.mvRates;
const Order = db.mvorder;
const OrderItemDimension = db.mvOrderDimension;
const OrderItem = db.mvOrderItem;
const OrderedItemsStatus = db.mvOrderedItemStatus;
const OrderStatusType = db.mvOrderStatusType;
const AssociateVendors = db.mvAssociateVendors;
const Zone = db.mvZone;
const OdaTat = db.mvOdaTat;
const CargoRate = db.mvCargoRates;
const OrderReview = db.mvorderReview;
const OrderReviewType = db.mvreviewType;
const Payment = db.mvpayment;
const Address = db.mvAddress;
const OrderItemStatusRemark = db.mvOrderStatusRemark;
const OrderWeightReconcilation = db.mvOrderWeightReconcilation;
const CalculativeHelper = require("./calculativeFixedCalculation");
const moment = require("moment");
const { success } = require("./response");
module.exports = {
  getRatePerKgServiceList: async (
    vendorRate,
    cargoRate,
    items,
    shipmentWeight,
    ODA1,
    ODA2,
    ODA3,
    ODA11,
    ODA22,
    ODA33,
    shipmentAmount,
    getServiceList,
    user,
    markup,
    getSourcePincodeId,
    getDestinationPincodeId,
    TAT,
    order = null
  ) => {
    let volumatricShipingWeight = 0;
    let CFT = cargoRate.rateFormula;
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      let itemUnit = items[itemIndex].unit;
      if (itemUnit == "FEET") {
        volumatricShipingWeight +=
          (items[itemIndex].L *
            items[itemIndex].B *
            items[itemIndex].H *
            items[itemIndex].boxes *
            30.4 *
            CFT) /
          cargoRate.dividend;
      } else if (itemUnit == "INCH") {
        volumatricShipingWeight +=
          (items[itemIndex].L *
            items[itemIndex].B *
            items[itemIndex].H *
            items[itemIndex].boxes *
            2.54 *
            CFT) /
          cargoRate.dividend;
      } else {
        volumatricShipingWeight +=
          (items[itemIndex].L *
            items[itemIndex].B *
            items[itemIndex].H *
            items[itemIndex].boxes *
            CFT) /
          cargoRate.dividend;
      }
    }
    let finalShipmentWeight =
      shipmentWeight > volumatricShipingWeight
        ? shipmentWeight
        : volumatricShipingWeight;

    if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
      finalShipmentWeight =
        parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight)
          ? parseFloat(cargoRate.cwMin)
          : parseFloat(finalShipmentWeight);
      let rateWithMarkup =
        parseFloat(vendorRate.rates) +
        (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100;
      let baseFreight = finalShipmentWeight * rateWithMarkup;
      baseFreight =
        parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup
          ? parseFloat(cargoRate.minFreight) +
          parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100)
          : finalShipmentWeight * rateWithMarkup;
      // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
      let odaMin = 0;
      let odaperkg = 0;
      let odaAmount = 0;
      if (ODA1) {
        odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0;
        odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      if (ODA2) {
        odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0;
        odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      if (ODA3) {
        odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0;
        odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      if (ODA11) {
        odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0;
        odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      if (ODA22) {
        odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0;
        odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      if (ODA33) {
        odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0;
        odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0;
        odaAmount +=
          finalShipmentWeight * odaperkg > odaMin
            ? finalShipmentWeight * odaperkg
            : odaMin;
      }
      let additionalCharge = cargoRate.additionalCharge
        ? JSON.parse(cargoRate.additionalCharge)
        : [];
      additionalCharge.forEach((item) => {
        // Check if the item has `amount` and `hasDependency`
        if (
          item.hasOwnProperty("amount") &&
          item.hasOwnProperty("hasDependency")
        ) {
          // If found, update matching blank amount in other objects that reference this id
          additionalCharge.forEach((parent) => {
            // Check `hasDepedancyData` array in parent items
            if (parent.hasDepedancyData) {
              parent.hasDepedancyData.forEach((dep) => {
                // Match based on id and update amount if it is blank (null or undefined)
                if (
                  dep.hasAdditionalCharge1?.id === item.id &&
                  dep.hasAdditionalCharge1.amount == null
                ) {
                  dep.hasAdditionalCharge1.amount = item.amount;
                }
              });
            }
          });
        }
      });
      // return success(res,"data",additionalCharge)
      let calculatedadditionalCharge = {};
      if (additionalCharge.length) {
        //chargeType 1-per-unit, 2-slabBased, 3-calculative
        for (let j = 0; j < additionalCharge.length; j++) {
          if (additionalCharge[j] && additionalCharge[j].chargesType) {
            if (additionalCharge[j].chargesType == 1) {
              let unitBasedAmount = await CalculativeHelper.calulateUnitBased(
                additionalCharge[j],
                finalShipmentWeight,
                items
              );
              if (unitBasedAmount) {
                calculatedadditionalCharge[additionalCharge[j].labelText] =
                  unitBasedAmount ? unitBasedAmount : 0;
              }
            } else if (additionalCharge[j].chargesType == 2) {
              let slabBasedAmount = await CalculativeHelper.calulateSlabBased(
                additionalCharge[j],
                finalShipmentWeight,
                items
              );

              if (slabBasedAmount) {
                calculatedadditionalCharge[additionalCharge[j].labelText] =
                  parseFloat(slabBasedAmount).toFixed(2);
              }
            } else if (
              additionalCharge[j].chargesType == 3 &&
              !additionalCharge[j].minValue &&
              !additionalCharge[j]?.hasDepedancyData?.length
            ) {
              calculatedadditionalCharge[additionalCharge[j].labelText] =
                parseFloat(
                  additionalCharge[j].amount ? additionalCharge[j].amount : 0
                ).toFixed(2);
            } else {
              let calculativeCharges = additionalCharge[j];
              let amount = 0;
              let additionalAmount = 0;
              let endOperator = "";
              if (calculativeCharges.hasDepedancyData.length > 1) {
              } else {
                amount = await CalculativeHelper.calculateCharge(
                  calculativeCharges,
                  finalShipmentWeight,
                  odaAmount,
                  baseFreight,
                  shipmentWeight,
                  shipmentAmount,
                  items
                );
              }
              calculatedadditionalCharge[additionalCharge[j].labelText] =
                parseFloat(amount).toFixed(2);
            }
          }
        }
      }
      const baseValues = {
        "Base Freight": baseFreight,
        "Chargeable weight": finalShipmentWeight,
        "Shipment weight": shipmentWeight,
        ODA: odaAmount,
        "Shipment Value": shipmentAmount,
      };
      if (additionalCharge.length) {
        for (let j = 0; j < additionalCharge.length; j++) {
          if (additionalCharge[j] && additionalCharge[j].chargesType) {
            if (
              additionalCharge[j].chargesType == 3 &&
              additionalCharge[j]?.hasDepedancyData?.length
            ) {
              let charge = additionalCharge[j];
              let finalString = charge.finalString;
              console.log(finalString);
              // Regular expression to match each key and operator
              const regex =
                /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;

              let finalFormula = "";
              let match;
              const result = [];

              while ((match = regex.exec(finalString)) !== null) {
                if (match[1]) {
                  // If it matches the key
                  const key = match[1].trim();
                  // Filter out unwanted "null" or empty values
                  if (
                    key &&
                    key !== null &&
                    key !== "null" &&
                    key !== "nullnull"
                  ) {
                    result.push({
                      type: "key",
                      value: key.replace("nullnull" || "null", ""),
                    });
                  }
                } else if (match[2]) {
                  // If it matches the operator
                  result.push({ type: "operator", value: match[2] });
                }
              }
              for (let i = 0; i < result.length; i++) {
                if (result[i].type == "key") {
                  let key = result[i].value;
                  let value = "";
                  if (baseValues[key]) {
                    value = baseValues[key];
                  } else if (calculatedadditionalCharge[key]) {
                    value = calculatedadditionalCharge[key];
                  } else if (Number(key)) {
                    value = Number(key);
                  } else {
                    value = 0;
                  }
                  finalFormula += value;
                } else {
                  finalFormula += result[i].value;
                }
              }
              let amount = await CalculativeHelper.evaluateLeftToRight(
                finalFormula
              );
              amount =
                charge.minValue && Number(charge.minValue) > Number(amount)
                  ? Number(charge.minValue)
                  : Number(amount);
              if (
                calculatedadditionalCharge.hasOwnProperty(
                  additionalCharge[j].labelText
                )
              ) {
                calculatedadditionalCharge[additionalCharge[j].labelText] =
                  parseFloat(amount).toFixed(2);
              }
            }
          }
        }
      }
      // console.log("Service list",getServiceList)
      let stateCharge = await CalculativeHelper.getStateWiseCharge(
        getServiceList.Vendor?.id,
        getSourcePincodeId.state,
        getDestinationPincodeId.state
      );
      if (stateCharge) {
        calculatedadditionalCharge = Object.assign(
          calculatedadditionalCharge,
          stateCharge
        );
      }
      let totalAdditionalAmount = Object.values(
        calculatedadditionalCharge
      ).reduce((sum, value) => {
        const numValue = parseFloat(value); // Parse the value as a float
        if (isNaN(numValue)) {
          console.error(`Invalid number encountered: ${value}`);
          return sum; // Skip invalid numbers
        }
        return sum + numValue; // Keep it as a number for addition
      }, 0);
      let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount;
      let gst = (totalTaxableAmount * cargoRate.GST) / 100;
      let finalAmount = totalTaxableAmount + gst;
      let breakups = {
        Rate: parseFloat(
          parseFloat(vendorRate.rates) +
          (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100
        ).toFixed(2),
        "Chargeable Weight": finalShipmentWeight.toFixed(2),
        ODA: parseFloat(odaAmount).toFixed(2),
        "Base Freight": baseFreight.toFixed(2),
      };
      breakups = Object.assign(breakups, calculatedadditionalCharge);
      breakups = Object.assign(breakups, {
        "Taxable Amount": parseFloat(totalTaxableAmount).toFixed(2),
        "GST Amount": parseFloat(gst).toFixed(2),
        "Total Amount": parseFloat(finalAmount).toFixed(2),
      });
      let vendorRules = await VendorSetting.findAll({
        where: {
          userId: getServiceList.Vendor?.id,
          name: "rule",
          isActive: true,
        },
        attributes: ["id", "value"],
      });
      let deliverySlot = await VendorSetting.findAll({
        where: {
          userId: getServiceList.userId,
          name: "deliverySlot",
          isActive: true,
        },
        attributes: ["id", "value"],
      });
      let pickupSlot = await VendorSetting.findAll({
        where: {
          userId: getServiceList.userId,
          name: "picupSlot",
          isActive: true,
        },
        attributes: ["id", "value"],
      });
      //article
      // for (let orders of order) {
      if (order) {
        order.dataValues.articles = await OrderItem.count({
          where: { Orderid: order.Order_id },
        });
      }
      // }
      //   console.log("Order data values", order.dataValues.articles );
      //   return 1;
      let data = {
        vendorName: getServiceList.Vendor?.name,
        serviceName: getServiceList.name,
        servicetype: getServiceList.serviceType,
        Serviceid: getServiceList.id,
        rate: parseFloat(
          parseFloat(vendorRate.rates) +
          (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100
        ).toFixed(2), //zone to zone rate(per kg)
        VRate: parseFloat(vendorRate.rates).toFixed(2),
        minWt: parseFloat(cargoRate.cwMin).toFixed(2), //cargo min weight
        minFreight: parseFloat(cargoRate.minFreight).toFixed(2), //min freight
        minODA: parseFloat(odaMin).toFixed(2),
        odaPerKG: parseFloat(odaperkg).toFixed(2),
        oda_amount: parseFloat(odaAmount).toFixed(2),
        handlingCharge: 0,
        gst: parseFloat(cargoRate.GST).toFixed(2),
        gst_Amount: parseFloat(gst).toFixed(2),
        V_gst_Amount: parseFloat(gst).toFixed(2),
        totalAdditionalAmount: parseFloat(totalAdditionalAmount).toFixed(2),
        codAmount: 0,
        totalAmount: parseFloat(finalAmount).toFixed(2),
        V_totalAmount: parseFloat(finalAmount).toFixed(2),
        chargeableWt: parseFloat(finalShipmentWeight).toFixed(2),
        chargable_weight: parseFloat(finalShipmentWeight).toFixed(2),
        Shipment_weight: parseFloat(shipmentWeight).toFixed(2),
        baseAmount: parseFloat(baseFreight).toFixed(2),
        baseAmountV: parseFloat(baseFreight).toFixed(2),
        taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
        V_taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
        VMinChargableWeight: parseFloat(cargoRate.cwMin).toFixed(2),
        VMinFreight: parseFloat(cargoRate.minFreight).toFixed(2),
        VMinODA: parseFloat(odaMin).toFixed(2),
        VOdaPerKG: parseFloat(odaperkg).toFixed(2),
        VOdaAmount: parseFloat(odaAmount).toFixed(2),
        VGst: parseFloat(cargoRate.GST).toFixed(2),
        rateV: parseFloat(vendorRate.rates).toFixed(2),
        vendorId: getServiceList.Vendor?.id,
        Cft: parseFloat(CFT).toFixed(2),
        Shipment_value: parseFloat(shipmentAmount).toFixed(2),
        Divisor: parseFloat(cargoRate.dividend).toFixed(2),
        ExpectedDelivery: moment().add(TAT, "days").format("ddd MMM DD, YYYY"),
        tat: TAT,
        descriptionV:
          "Safexpress offers a wide range of innovative supply chain services including\nExpress Distribution, 3PL and Consulting. The firm provides value-added logistics services for 9 different\nbusiness verticals ranging from Apparel &amp; Lifestyle, E-commerce, Healthcare, Hi-Tech, Publishing to \nAutomotive, Engineering &amp; Electrical Hardware, FMCG &amp; Consumer Electronics and Institutional.",
        imagePath: getServiceList.Vendor?.image,
        v_GSTin: "SAFEGST",
        isTopay: null,
        toPayAmount: parseFloat(finalAmount).toFixed(2),
        isDummy: getServiceList.Vendor?.isDummy,
        avgRating: 0,
        totalReview: 0,
        rateRequestId: 21107,
        additionalCharges: calculatedadditionalCharge,
        breakups: breakups,
        base_Freight: parseFloat(baseFreight).toFixed(2),
        isKYCApproved: 0,
        isb2c: false,
        appointmentCharge: null,
        rating: getServiceList.Vendor?.rating,
        rules: vendorRules,
        userType: user && user.account ? user.account.billingType : "prepaid",
        rateType: cargoRate.rateType,
        deliverySlot: deliverySlot,
        pickupSlot: pickupSlot,
        orderId: order && order.id ? order.id : null,
        articles: order && order.dataValues.articles ? order.dataValues.articles : null,
        salesPrice:
          order && order.totalAmount
            ? parseFloat(order.totalAmount).toFixed(2)
            : 0,
        cargoId: cargoRate.id,
        floorCharge: cargoRate.floorCharge ? cargoRate.floorCharge : null,
        mallCharge: cargoRate.mallCharge ? cargoRate.mallCharge : null,
        sundayCharge: cargoRate.appointmentMin
          ? cargoRate.appointmentMin
          : null,
        csdCharge: cargoRate.csdCharge ? cargoRate.csdCharge : null,
        appointmentMin: cargoRate.appointmentMin
          ? cargoRate.appointmentMin
          : null,
        appointmentPerKg: cargoRate.appointmentPerKg
          ? cargoRate.appointmentPerKg
          : null,
      };

      return data;
    }
  },
  getRatePerboxServiceList: async (vendorRate, cargoRate, items, shipmentWeight, ODA1, ODA2, ODA3, ODA11, ODA22, ODA33, shipmentAmount, getServiceList, user, markup, getSourcePincodeId, getDestinationPincodeId, TAT, order = null) => {
    let numberOfBoxes = items.reduce((sum, item) => parseInt(sum) + parseInt(item.boxes), 0)
    let CFT = cargoRate.rateFormula
    let finalShipmentWeight = 0
    let finalNumberOfBox = numberOfBoxes
    if (parseFloat(finalNumberOfBox) <= parseFloat(cargoRate.cwMax)) {
      finalNumberOfBox = parseFloat(cargoRate.cwMin) > parseFloat(finalNumberOfBox) ? parseFloat(cargoRate.cwMin) : parseFloat(finalNumberOfBox)
      let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
      let baseFreight = finalNumberOfBox * rateWithMarkup
      baseFreight = parseFloat(cargoRate.minFreight) > finalNumberOfBox * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalNumberOfBox * rateWithMarkup
      // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
      let odaMin = 0
      let odaperkg = 0
      let odaAmount = 0
      if (ODA1) {
        odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
        odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      if (ODA2) {
        odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
        odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      if (ODA3) {
        odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
        odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      if (ODA11) {
        odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
        odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      if (ODA22) {
        odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
        odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      if (ODA33) {
        odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
        odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
        odaAmount += finalNumberOfBox * odaperkg > odaMin ? finalNumberOfBox * odaperkg : odaMin
      }
      let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
      additionalCharge.forEach(item => {
        // Check if the item has `amount` and `hasDependency`
        if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
          // If found, update matching blank amount in other objects that reference this id
          additionalCharge.forEach(parent => {
            // Check `hasDepedancyData` array in parent items
            if (parent.hasDepedancyData) {
              parent.hasDepedancyData.forEach(dep => {
                // Match based on id and update amount if it is blank (null or undefined)
                if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
                  dep.hasAdditionalCharge1.amount = item.amount;
                }
              });
            }
          });
        }
      });
      // return success(res,"data",additionalCharge)
      let calculatedadditionalCharge = {}
      if (additionalCharge.length) {
        //chargeType 1-per-unit, 2-slabBased, 3-calculative	
        for (let j = 0; j < additionalCharge.length; j++) {
          if (additionalCharge[j] && additionalCharge[j].chargesType) {
            if (additionalCharge[j].chargesType == 1) {
              let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, items)
              if (unitBasedAmount) {
                calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
              }
            }
            else if (additionalCharge[j].chargesType == 2) {
              let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, items)


              if (slabBasedAmount) {
                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
              }


            } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
              calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
            }
            else {
              let calculativeCharges = additionalCharge[j]
              let amount = 0
              let additionalAmount = 0
              let endOperator = ""
              if (calculativeCharges.hasDepedancyData.length > 1) {
              } else {
                amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, shipmentWeight, shipmentAmount, items)
              }
              calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
            }
          }


        }

      }
      const baseValues = {
        'Base Freight': baseFreight,
        'Chargeable weight': finalShipmentWeight,
        'Shipment weight': shipmentWeight,
        'ODA': odaAmount,
        'Shipment Value': shipmentAmount
      };
      if (additionalCharge.length) {
        for (let j = 0; j < additionalCharge.length; j++) {
          if (additionalCharge[j] && additionalCharge[j].chargesType) {
            if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
              let charge = additionalCharge[j]
              let finalString = charge.finalString
              console.log(finalString);
              // Regular expression to match each key and operator
              const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;


              let finalFormula = ''
              let match;
              const result = [];

              while ((match = regex.exec(finalString)) !== null) {
                if (match[1]) {
                  // If it matches the key
                  const key = match[1].trim();
                  // Filter out unwanted "null" or empty values
                  if (key && key !== null && key !== "null" && key !== "nullnull") {
                    result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
                  }
                } else if (match[2]) {
                  // If it matches the operator
                  result.push({ type: 'operator', value: match[2] });
                }
              }
              for (let i = 0; i < result.length; i++) {
                if (result[i].type == 'key') {
                  let key = result[i].value
                  let value = ""
                  if (baseValues[key]) {
                    value = baseValues[key]
                  } else if (calculatedadditionalCharge[key]) {
                    value = calculatedadditionalCharge[key]

                  } else if ((Number(key))) {
                    value = Number(key)

                  } else {
                    value = 0
                  }
                  finalFormula += value
                } else {
                  finalFormula += result[i].value

                }
              }
              let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
              amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
              if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
                calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
              }



            }
          }
        }

      }
      let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList.Vendor?.id, getSourcePincodeId.state, getDestinationPincodeId.state)
      if (stateCharge) {
        calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
      }
      let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {

        const numValue = parseFloat(value); // Parse the value as a float
        if (isNaN(numValue)) {
          console.error(`Invalid number encountered: ${value}`);
          return sum; // Skip invalid numbers
        }
        return sum + numValue; // Keep it as a number for addition
      }, 0);
      let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
      let gst = (totalTaxableAmount * cargoRate.GST) / 100
      let finalAmount = totalTaxableAmount + gst
      let breakups = {
        Rate: parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),
        // ChargeableWeight: finalShipmentWeight ? finalShipmentWeight.toFixed(2) : finalNumberOfBox,
        "Chargeable Box": finalShipmentWeight ? finalShipmentWeight.toFixed(2) : finalNumberOfBox,
        ODA: parseFloat(odaAmount).toFixed(2),
        "Base Freight": baseFreight.toFixed(2)
      }
      breakups = Object.assign(breakups, calculatedadditionalCharge)
      breakups = Object.assign(breakups, {
        "Taxable Amount": parseFloat(totalTaxableAmount).toFixed(2),
        "GST Amount": parseFloat(gst).toFixed(2),
        "Total Amount": parseFloat(finalAmount).toFixed(2)
      })
      let vendorRules = await VendorSetting.findAll({
        where: {
          userId: getServiceList.Vendor?.id,
          name: "rule",
          isActive: true
        },
        attributes: ['id', 'value']
      })
      let deliverySlot = await VendorSetting.findAll({
        where: {
          userId: getServiceList.userId,
          name: "deliverySlot",
          isActive: true
        },
        attributes: ['id', 'value']
      })
      let pickupSlot = await VendorSetting.findAll({
        where: {
          userId: getServiceList.userId,
          name: "picupSlot",
          isActive: true
        },
        attributes: ['id', 'value']
      })


      let data = {
        "vendorName": getServiceList.Vendor?.name,
        "serviceName": getServiceList.name,
        "servicetype": getServiceList.serviceType,
        "Serviceid": getServiceList.id,
        "rate": parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100),//zone to zone rate(per kg)
        "VRate": parseFloat(vendorRate.rates).toFixed(2),
        "minWt": parseFloat(cargoRate.cwMin).toFixed(2), //cargo min weight
        "minFreight": parseFloat(cargoRate.minFreight).toFixed(2),//min freight                                    
        "minODA": parseFloat(odaMin).toFixed(2),
        "odaPerKG": parseFloat(odaperkg).toFixed(2),
        "oda_amount": parseFloat(odaAmount).toFixed(2),
        "handlingCharge": 0,
        "gst": parseFloat(cargoRate.GST).toFixed(2),
        "gst_Amount": parseFloat(gst).toFixed(2),
        "V_gst_Amount": parseFloat(gst).toFixed(2),
        "totalAdditionalAmount": parseFloat(totalAdditionalAmount).toFixed(2),
        "codAmount": 0,
        "totalAmount": parseFloat(finalAmount).toFixed(2),
        "V_totalAmount": parseFloat(finalAmount).toFixed(2),
        "chargeableWt": finalShipmentWeight ? parseFloat(finalShipmentWeight).toFixed(2) : finalNumberOfBox,
        "chargable_weight": finalShipmentWeight ? parseFloat(finalShipmentWeight).toFixed(2) : finalNumberOfBox,
        "Shipment_weight": parseFloat(shipmentWeight).toFixed(2),
        "baseAmount": parseFloat(baseFreight).toFixed(2),
        "baseAmountV": parseFloat(baseFreight).toFixed(2),
        "taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
        "V_taxableAmount": parseFloat(totalTaxableAmount).toFixed(2),
        "VMinChargableWeight": parseFloat(cargoRate.cwMin).toFixed(2),
        "VMinFreight": parseFloat(cargoRate.minFreight).toFixed(2),
        "VMinODA": parseFloat(odaMin).toFixed(2),
        "VOdaPerKG": parseFloat(odaperkg).toFixed(2),
        "VOdaAmount": parseFloat(odaAmount).toFixed(2),
        "VGst": parseFloat(cargoRate.GST).toFixed(2),
        "rateV": parseFloat(vendorRate.rates).toFixed(2),
        "vendorId": getServiceList.Vendor?.id,
        "Cft": CFT ? parseFloat(CFT).toFixed(2) : 0,
        "Shipment_value": parseFloat(shipmentAmount).toFixed(2),
        "Divisor": cargoRate.dividend ? parseFloat(cargoRate.dividend).toFixed(2) : 0,
        "ExpectedDelivery": moment().add(TAT, 'days').format('ddd MMM DD, YYYY'),
        "tat": TAT,
        "descriptionV": "Safexpress offers a wide range of innovative supply chain services including\nExpress Distribution, 3PL and Consulting. The firm provides value-added logistics services for 9 different\nbusiness verticals ranging from Apparel &amp; Lifestyle, E-commerce, Healthcare, Hi-Tech, Publishing to \nAutomotive, Engineering &amp; Electrical Hardware, FMCG &amp; Consumer Electronics and Institutional.",
        "imagePath": getServiceList.Vendor?.image,
        "v_GSTin": "SAFEGST",
        "isTopay": null,
        "toPayAmount": parseFloat(finalAmount).toFixed(2),
        "isDummy": getServiceList.Vendor?.isDummy,
        "avgRating": 0,
        "totalReview": 0,
        "rateRequestId": 21107,
        "additionalCharges": calculatedadditionalCharge,
        "breakups": breakups,
        "base_Freight": parseFloat(baseFreight).toFixed(2),
        "isKYCApproved": 0,
        "isb2c": false,
        "appointmentCharge": null,
        "rating": getServiceList.Vendor?.rating,
        "rules": vendorRules,
        "userType": user && user.account ? user.account.billingType : 'prepaid',
        "rateType": cargoRate.rateType,
        deliverySlot: deliverySlot,
        pickupSlot: pickupSlot,
        orderId: order && order.id ? order.id : null,
        salesPrice: order && order.totalAmount ? parseFloat(order.totalAmount).toFixed(2) : 0,
        cargoId: cargoRate.id,
        floorCharge: cargoRate.floorCharge ? cargoRate.floorCharge : null,
        mallCharge: cargoRate.mallCharge ? cargoRate.mallCharge : null,
        sundayCharge: cargoRate.sundayCharge ? cargoRate.sundayCharge : null,
        csdCharge: cargoRate.csdCharge ? cargoRate.csdCharge : null,
        appointmentMin: cargoRate.appointmentMin ? cargoRate.appointmentMin : null,
        appointmentPerKg: cargoRate.appointmentPerKg ? cargoRate.appointmentPerKg : null
      }
      return data
    }

  },
  acceptRejectWeightReconcilation: async (
    req,
    data,
    order,
    weightReconcilation
  ) => {
    try {
      if (data.type == "Accept") {
        let remarks = JSON.parse(weightReconcilation.remark);
        if (weightReconcilation.rateType == 1) {
          await Order.update(
            {
              totalAmount: weightReconcilation.new_amount,
              V_totalAmount: weightReconcilation.new_amount,
              chargable_weight: weightReconcilation.new_weight,
              Vchargable_weight: weightReconcilation.new_weight,
              masterDocketURL: null,
              docketURL: null,
            },
            {
              where: {
                id: weightReconcilation.orderId,
              },
            }
          );
        } else {
          await Order.update(
            {
              Shipment_weight: weightReconcilation.Shipment_weight,
              chargable_weight: weightReconcilation.chargable_weight,
              Shipment_value: weightReconcilation.Shipment_value,
              Cft: weightReconcilation.Cft,
              Divisor: weightReconcilation.Divisor,
              rate: weightReconcilation.rate,
              totalAdditionalAmount: weightReconcilation.totalAdditionalAmount,
              VtotalAdditionalAmount:
                weightReconcilation.VtotalAdditionalAmount,
              additionalCharges: weightReconcilation.additionalCharges,
              min_Chargable_weight: weightReconcilation.min_Chargable_weight,
              minFreight: weightReconcilation.minFreight,
              minODA: weightReconcilation.minODA,
              odaPerKG: weightReconcilation.odaPerKG,
              oda_amount: weightReconcilation.oda_amount,
              taxableAmount: weightReconcilation.taxableAmount,
              V_taxableAmount: weightReconcilation.V_taxableAmount,
              gst: weightReconcilation.gst,
              gst_Amount: weightReconcilation.gst_Amount,
              V_gst_Amount: weightReconcilation.V_gst_Amount,
              totalAmount: weightReconcilation.taxableAmount,
              V_totalAmount: weightReconcilation.V_totalAmount,
              servicetype: weightReconcilation.servicetype,
              ExpectedDelivery: weightReconcilation.ExpectedDelivery,
              VGst: weightReconcilation.VGst,
              VMinChargableWeight: weightReconcilation.VMinChargableWeight,
              VMinFreight: weightReconcilation.VMinFreight,
              VMinODA: weightReconcilation.VMinODA,
              VOdaAmount: weightReconcilation.VOdaAmount,
              VOdaPerKG: weightReconcilation.VOdaPerKG,
              VDocketCharge: weightReconcilation.VDocketCharge,
              VRate: weightReconcilation.VRate,
              latestStatus: 1,
              VadditionalCharges: weightReconcilation.VadditionalCharges,
              Vchargable_weight: weightReconcilation.Vchargable_weight,
              specialCharge: weightReconcilation.specialCharge,
              VspecialCharge: weightReconcilation.VspecialCharge,
              masterDocketURL: null,
              docketURL: null,
            },
            {
              where: {
                id: weightReconcilation.orderId,
              },
            }
          );
        }
        remarks.push({
          userId: req.decodedData.id,
          userType: data.userType,
          remark: data.remark,
        });

        await OrderWeightReconcilation.update(
          {
            status: data.userType == "admin" ? 4 : 5,
            remark: JSON.stringify(remarks),
          },
          {
            where: {
              id: weightReconcilation.id,
            },
          }
        );
      } else {
        remarks.push({
          userId: req.decodedData.id,
          userType: data.userType,
          remark: data.remark,
        });
        await OrderWeightReconcilation.update(
          {
            status: data.userType == "admin" ? 2 : 3,
            remark: JSON.stringify(remarks),
          },
          {
            where: {
              id: weightReconcilation.id,
            },
          }
        );
      }
      return true;
    } catch (error) {
      console.log(error);
    }
  },
  calculateOrderAdditinalServiceAmount: async (
    orderId
  ) => {
    try {
      let order = await Order.findOne({
        where: {
          id: orderId
        },
        attributes: [
          'pickupmallCharge',
          'pickupsundayCharge',
          'pickupcsdCharge',
          'pickupfloorCharge',
          'pickupvmallCharge',
          'pickupvsundayCharge',
          'pickupvcsdCharge',
          'pickupappointmentCharge',
          'pickupvappointmentCharge',
          'pickupvfloorCharge',
          'deliverymallCharge',
          'deliverysundayCharge',
          'deliverycsdCharge',
          'deliveryfloorCharge',
          'deliveryvmallCharge',
          'deliveryvsundayCharge',
          'deliveryappointmentCharge',
        ]
      })


      const total = Object.values(order.dataValues)
        .map(value => parseFloat(value)) // Convert each value to a number
        .reduce((sum, num) => sum + num, 0); // Sum up all numbers

      return total ? total : 0

    } catch (error) {
      console.log(error);
    }
  },

};
