const {
  success,
  failed,
  serverError,
  validateFail,
  response,
} = require("../../../../helper/response");

const {
  USER_CONSTANTS,
  EMAIL_CONSTANTS,
  AUTH_CONSTANTS,
  SYSTEM_FAILURE,
  PINCODE_CONSTANTS,
  SERVICE_CONSTANTS,
  ORDER_CONSTANTS,
} = require("../../../../helper/message");
const db = require("../../../../../models");
const _ = require("lodash");
const { aws } = require("../../../../helper/aws");
const bcrypt = require("bcryptjs");
const Account = db.mvAccountDetails;
const Service = db.mvService;
const User = db.mvUser;
const UserAccountDetails = db.mvAccountDetails;
const Pincode = db.mvPincode;
const ZonePinMap = db.mvZonePinMap;
const ZoneServiceMap = db.mvZoneServiceMap;
// const VendorRate = db.mvVendorRates
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
const PaymentService = require("../../Service/PaymentService");
const OrderReview = db.mvorderReview;
const OrderReviewType = db.mvreviewType;
const Payment = db.mvpayment;
const Address = db.mvAddress;
const OrderItemStatusRemark = db.mvOrderStatusRemark;
const crypto = require("crypto");
const numberToword = require("../../../../helper/numberToWord");
const NotificationHelper = require("../../../../helper/notification");
const { Validator } = require("node-input-validator");
const { fn, col, Op, where, literal } = require("sequelize");
const moment = require("moment/moment");
const XLSXDownloader = require("../../Service/XLSXDownloader");
const Razorpay = require("razorpay");
const fs = require("fs");
const pdf = require("html-pdf-node");
const ejs = require("ejs");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const xlsx = require("xlsx");
const CalculativeHelper = require("../../../../helper/calculativeFixedCalculation");
const RateCalculatorService = require("../../../../helper/ratePerKgPerBoxServiceList");
const sequelize = require("sequelize");
module.exports = {
  getBulkOrderSampleFile: async (req, res) => {
    try {
      // Define header as a simple array of strings
      let headers = [
        "Lpid",
        "ServiceId",
        "RateType",
        "UserEmail",
        "Frompincode",
        "OrderNo",
        "InvoiceNo",
        "Topincode",
        "IsCod",
        "EwayNo",
        "ItemName",
        "DeliveryAddressName",
        "DeliveryAddressLine",
        "DeliveryCity",
        "DeliveryState",
        "DeliveryPincode",
        "DeliveryPersonName",
        "DeliveryPersonContact",
        "PickupPersonName",
        "PickupPersonContact",
        "PickupAddressName",
        "PickupAddressLine",
        "PickupCity",
        "PickupState",
        "PickupPincode",
        "ReturnAddressName",
        "ReturnCity",
        "ReturnState",
        "ReturnPincode",
        "ItemInvoice",
        "ItemType",
        "ItemSubcategory",
        "ItemCategory",
        "PackagingRequired",
        "Length",
        "Height",
        "Breadth",
        "NoOfBoxes",
        "Unit",
        "Volume_weight",
        "WeightUnit_KG_Or_Gram",
        "Shipvalue",
        "LSPDocket",
        "OtherInfo",
        "TransporterName"
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('bulkordersample');
      // Add headers to the worksheet
      worksheet.columns = headers.map(header => ({ header, key: header }));

      // Add data rows

      worksheet.addRow({
        "Lpid": "",
        "ServiceId": "",
        "RateType": "",
        "UserEmail": "",
        "Frompincode": "",
        "OrderNo": "",
        "InvoiceNo": "",
        "Topincode": "",
        "IsCod": "",
        "EwayNo": "",
        "ItemName": "",
        "DeliveryAddressLine1": "",
        "DeliveryAddressLine2": "",
        "DeliveryCity": "",
        "DeliveryState": "",
        "DeliveryPincode": "",
        "DeliveryPersonName": "",
        "DeliveryPersonContact": "",
        "PickupPersonName": "",
        "PickupPersonContact": "",
        "PickupAddressLine1": "",
        "PickupAddressLine2": "",
        "PickupCity": "",
        "PickupState": "",
        "PickupPincode": "",
        "ReturnCity": "",
        "ReturnState": "",
        "ReturnPincode": "",
        "ItemInvoice": "",
        "ItemType": "",
        "ItemSubcategory": "",
        "ItemCategory": "",
        "PackagingRequired": "",
        "Length": "",
        "Height": "",
        "Breadth": "",
        "NoOfBoxes": "",
        "Unit": "",
        "Volume_weight": "",
        "WeightUnit_KG_Or_Gram": "",
        "Shipvalue": "",
        "LSPDocket": "",
        "OtherInfo": "",
        "TransporterName": ""
      });

      const coloredHeaders = [
        "Lpid", "ServiceId", "RateType", "UserEmail", "Frompincode", "Topincode", "ItemName", "PickupAddressName",
        "DeliveryAddressName", "DeliveryAddressLine", , "DeliveryCity", "DeliveryState", "DeliveryPincode",
        "DeliveryPersonName", "DeliveryPersonContact", "PickupPersonName",
        "PickupPersonContact", "PickupAddressLine", "PickupCity", "PickupState",
        "PickupPincode", "ReturnCity", "ReturnState", "ReturnPincode",
        "ItemType", "ItemSubcategory", "ItemCategory", "Length",
        "Height", "Breadth", "NoOfBoxes", "Unit", "Volume_weight", "WeightUnit_KG_Or_Gram", "Shipvalue"
      ];
      // Style specific headers with color
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        if (coloredHeaders.includes(cell.value)) {
          cell.font = { color: { argb: 'F36C50' }, bold: true };  // Apply red color and bold
        }
      });

      // Write the workbook to the response
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + 'bulkordersample.xlsx'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  createBulkOrder: async (req, res) => {
    // const t = await sequelize.transaction(); // Start a transaction
    try {
      const v = new Validator(req.files, {
        excelSheet: 'required|mime:xls,xlsx'

      });
      const matched = await v.check();

      if (!matched) {
        return validateFail(res, v);
      }
      if (!req.files)
        return response(res, 422, "Excel file required")
      if (!req.files && !req.files.excelSheet)
        return response(res, 422, "Excel file required")

      // let readDataFile = xlsx.read(req.files.excelSheet.data, {
      //     type: "buffer"
      // });
      // const wsname = readDataFile.SheetNames[0];
      // const ws = readDataFile.Sheets[wsname];
      // const excelArray = xlsx.utils.sheet_to_json(ws); // convert into array of object  
      // Reading buffer directly
      // let excelArray = [];
      let headers = [];
      let excelArray = [];
      await workbook.xlsx.load(req.files.excelSheet.data);
      const worksheet = workbook.getWorksheet(1); // Assuming you want the first sheet          

      // Extract headers from the first row
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers.push(cell.value);
      });

      // Process each subsequent row to build the data array
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip the header row
          let rowData = {};
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber - 1]; // Match the cell with the corresponding header

            // Handle hyperlinks and rich text objects
            if (typeof cell.value === 'object' && cell.value !== null && cell.value.text) {
              rowData[header] = cell.value.text; // Extract the plain text from hyperlink or rich text
            } else if (cell.formula) {
              // Handle formulas, return the evaluated result
              rowData[header] = cell.result !== undefined ? cell.result : null;
            } else {
              rowData[header] = cell.value;
            }
          });
          excelArray.push(rowData);
        }
      });
      if (excelArray.length == 0)
        return response(res, 422, "Please fill the data");
      if (excelArray[0].Lpid == undefined)
        return response(res, 422, "Lpid header missing");
      if (excelArray[0].ServiceId == undefined)
        return response(res, 422, "ServiceId header missing");
      if (excelArray[0].RateType == undefined)
        return response(res, 422, "RateType header missing");
      if (excelArray[0].UserEmail == undefined)
        return response(res, 422, "UserEmail header missing");
      if (excelArray[0].Frompincode == undefined)
        return response(res, 422, "Frompincode header missing");
      // if (excelArray[0].OrderNo == undefined)
      //     return response(res, 422, "OrderNo header missing");
      // if (excelArray[0].InvoiceNo == undefined)
      //     return response(res, 422, "InvoiceNo header missing");
      if (excelArray[0].Topincode == undefined)
        return response(res, 422, "Topincode header missing");
      if (excelArray[0].IsCod == undefined)
        return response(res, 422, "IsCod header missing");
      if (excelArray[0].EwayNo == undefined)
        return response(res, 422, "EwayNo header missing");
      if (excelArray[0].ItemName == undefined)
        return response(res, 422, "ItemName header missing");
      if (excelArray[0].DeliveryAddressName === undefined)
        return response(res, 422, "DeliveryAddressName header missing");

      if (excelArray[0].DeliveryAddressLine === undefined)
        return response(res, 422, "DeliveryAddressLine header missing");

      if (excelArray[0].DeliveryCity === undefined)
        return response(res, 422, "DeliveryCity header missing");

      if (excelArray[0].DeliveryState === undefined)
        return response(res, 422, "DeliveryState header missing");

      if (excelArray[0].DeliveryPincode === undefined)
        return response(res, 422, "DeliveryPincode header missing");

      if (excelArray[0].DeliveryPersonName === undefined)
        return response(res, 422, "DeliveryPersonName header missing");

      if (excelArray[0].DeliveryPersonContact === undefined)
        return response(res, 422, "DeliveryPersonContact header missing");

      if (excelArray[0].PickupPersonName === undefined)
        return response(res, 422, "PickupPersonName header missing");

      if (excelArray[0].PickupPersonContact === undefined)
        return response(res, 422, "PickupPersonContact header missing");

      if (excelArray[0].PickupAddressName === undefined)
        return response(res, 422, "PickupAddressName header missing");

      if (excelArray[0].PickupAddressLine === undefined)
        return response(res, 422, "PickupAddressLine header missing");

      if (excelArray[0].PickupCity === undefined)
        return response(res, 422, "PickupCity header missing");

      if (excelArray[0].PickupState === undefined)
        return response(res, 422, "PickupState header missing");

      if (excelArray[0].PickupPincode === undefined)
        return response(res, 422, "PickupPincode header missing");

      if (excelArray[0].ReturnAddressName === undefined)
        return response(res, 422, "ReturnAddressName header missing");

      if (excelArray[0].ReturnCity === undefined)
        return response(res, 422, "ReturnCity header missing");

      if (excelArray[0].ReturnState === undefined)
        return response(res, 422, "ReturnState header missing");

      if (excelArray[0].ReturnPincode === undefined)
        return response(res, 422, "ReturnPincode header missing");

      if (excelArray[0].ItemInvoice === undefined)
        return response(res, 422, "ItemInvoice header missing");

      if (excelArray[0].ItemType === undefined)
        return response(res, 422, "ItemType header missing");

      if (excelArray[0].ItemSubcategory === undefined)
        return response(res, 422, "ItemSubcategory header missing");

      if (excelArray[0].ItemCategory === undefined)
        return response(res, 422, "ItemCategory header missing");

      if (excelArray[0].PackagingRequired === undefined)
        return response(res, 422, "PackagingRequired header missing");

      if (excelArray[0].Length === undefined)
        return response(res, 422, "Length header missing");

      if (excelArray[0].Height === undefined)
        return response(res, 422, "Height header missing");

      if (excelArray[0].Breadth === undefined)
        return response(res, 422, "Breadth header missing");

      if (excelArray[0].NoOfBoxes === undefined)
        return response(res, 422, "NoOfBoxes header missing");

      if (excelArray[0].Unit === undefined)
        return response(res, 422, "Unit header missing");

      if (excelArray[0].Volume_weight === undefined)
        return response(res, 422, "Volume_weight header missing");

      if (excelArray[0].WeightUnit_KG_Or_Gram === undefined)
        return response(res, 422, "WeightUnit_KG_Or_Gram header missing");

      if (excelArray[0].Shipvalue === undefined)
        return response(res, 422, "Shipvalue header missing");

      if (excelArray[0].LSPDocket === undefined)
        return response(res, 422, "LSPDocket header missing");

      if (excelArray[0].OtherInfo === undefined)
        return response(res, 422, "OtherInfo header missing");

      if (excelArray[0].TransporterName === undefined)
        return response(res, 422, "TransporterName header missing");


      let finalData = []

      
      let rateType = ""
      let vendorId = ""
      let userEmail = ""
      let serviceId = ""
      let ratetype = [1, 2]
      for (let i = 0; i < excelArray.length; i++) {
        let wrongData = i + 2;
        if (excelArray[i].Lpid === "" || excelArray[i].Lpid === undefined) {
          return response(res, 422, `Invalid Lpid at line number ${wrongData}`);
        }
        if (excelArray[i].ServiceId === "" || excelArray[i].ServiceId === undefined) {
          return response(res, 422, `Invalid ServiceId at line number ${wrongData}`);
        }
        if (excelArray[i].RateType === "" || excelArray[i].RateType === undefined) {
          return response(res, 422, `Invalid RateType at line number ${wrongData}`);
        }

        if (!ratetype.includes(excelArray[i].RateType)) {
          return response(res, 422, `Invalid RateType at line number ${wrongData}`);
        }
        if (excelArray[i].UserEmail === "" || excelArray[i].UserEmail === undefined) {
          return response(res, 422, `Invalid UserEmail at line number ${wrongData}`);
        }
        if (excelArray[i].Frompincode === "" || excelArray[i].Frompincode === undefined) {
          return response(res, 422, `Invalid Frompincode at line number ${wrongData}`);
        }
        // if (excelArray[i].OrderNo === "" || excelArray[i].OrderNo === undefined) {
        //     return response(res, 422, `Invalid OrderNo at line number ${wrongData}`);
        // }
        // if (excelArray[i].InvoiceNo === "" || excelArray[i].InvoiceNo === undefined) {
        //     return response(res, 422, `Invalid InvoiceNo at line number ${wrongData}`);
        // }
        if (excelArray[i].Topincode === "" || excelArray[i].Topincode === undefined) {
          return response(res, 422, `Invalid Topincode at line number ${wrongData}`);
        }
        if (excelArray[i].IsCod === "" || excelArray[i].IsCod === undefined) {
          return response(res, 422, `Invalid IsCod at line number ${wrongData}`);
        }
        // if (excelArray[i].EwayNo === "" || excelArray[i].EwayNo === undefined) {
        //     return response(res, 422, `Invalid EwayNo at line number ${wrongData}`);
        // }
        if (excelArray[i].ItemName === "" || excelArray[i].ItemName === undefined) {
          return response(res, 422, `Invalid ItemName at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryAddressName === "" || excelArray[i].DeliveryAddressName === undefined) {
          return response(res, 422, `Invalid DeliveryAddressName at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryAddressLine === "" || excelArray[i].DeliveryAddressLine === undefined) {
          return response(res, 422, `Invalid DeliveryAddressLine at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryCity === "" || excelArray[i].DeliveryCity === undefined) {
          return response(res, 422, `Invalid DeliveryCity at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryState === "" || excelArray[i].DeliveryState === undefined) {
          return response(res, 422, `Invalid DeliveryState at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryPincode === "" || excelArray[i].DeliveryPincode === undefined) {
          return response(res, 422, `Invalid DeliveryPincode at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryPersonName === "" || excelArray[i].DeliveryPersonName === undefined) {
          return response(res, 422, `Invalid DeliveryPersonName at line number ${wrongData}`);
        }
        if (excelArray[i].DeliveryPersonContact === "" || excelArray[i].DeliveryPersonContact === undefined) {
          return response(res, 422, `Invalid DeliveryPersonContact at line number ${wrongData}`);
        }
        if (excelArray[i].PickupPersonName === "" || excelArray[i].PickupPersonName === undefined) {
          return response(res, 422, `Invalid PickupPersonName at line number ${wrongData}`);
        }
        if (excelArray[i].PickupPersonContact === "" || excelArray[i].PickupPersonContact === undefined) {
          return response(res, 422, `Invalid PickupPersonContact at line number ${wrongData}`);
        }
        if (excelArray[i].PickupAddressName === "" || excelArray[i].PickupAddressName === undefined) {
          return response(res, 422, `Invalid PickupAddressName at line number ${wrongData}`);
        }
        if (excelArray[i].PickupAddressLine === "" || excelArray[i].PickupAddressLine === undefined) {
          return response(res, 422, `Invalid PickupAddressLine at line number ${wrongData}`);
        }
        if (excelArray[i].PickupCity === "" || excelArray[i].PickupCity === undefined) {
          return response(res, 422, `Invalid PickupCity at line number ${wrongData}`);
        }
        if (excelArray[i].PickupState === "" || excelArray[i].PickupState === undefined) {
          return response(res, 422, `Invalid PickupState at line number ${wrongData}`);
        }
        if (excelArray[i].PickupPincode === "" || excelArray[i].PickupPincode === undefined) {
          return response(res, 422, `Invalid PickupPincode at line number ${wrongData}`);
        }
        if (excelArray[i].ReturnAddressName === "" || excelArray[i].ReturnAddressName === undefined) {
          return response(res, 422, `Invalid ReturnAddressName at line number ${wrongData}`);
        }
        if (excelArray[i].ReturnCity === "" || excelArray[i].ReturnCity === undefined) {
          return response(res, 422, `Invalid ReturnCity at line number ${wrongData}`);
        }
        if (excelArray[i].ReturnState === "" || excelArray[i].ReturnState === undefined) {
          return response(res, 422, `Invalid ReturnState at line number ${wrongData}`);
        }
        if (excelArray[i].ReturnPincode === "" || excelArray[i].ReturnPincode === undefined) {
          return response(res, 422, `Invalid ReturnPincode at line number ${wrongData}`);
        }
        if (excelArray[i].ItemInvoice === "" || excelArray[i].ItemInvoice === undefined) {
          return response(res, 422, `Invalid ItemInvoice at line number ${wrongData}`);
        }
        if (excelArray[i].ItemType === "" || excelArray[i].ItemType === undefined) {
          return response(res, 422, `Invalid ItemType at line number ${wrongData}`);
        }
        if (excelArray[i].ItemSubcategory === "" || excelArray[i].ItemSubcategory === undefined) {
          return response(res, 422, `Invalid ItemSubcategory at line number ${wrongData}`);
        }
        if (excelArray[i].ItemCategory === "" || excelArray[i].ItemCategory === undefined) {
          return response(res, 422, `Invalid ItemCategory at line number ${wrongData}`);
        }
        if (excelArray[i].PackagingRequired === "" || excelArray[i].PackagingRequired === undefined) {
          return response(res, 422, `Invalid PackagingRequired at line number ${wrongData}`);
        }
        if (excelArray[i].Length === "" || excelArray[i].Length === undefined) {
          return response(res, 422, `Invalid Length at line number ${wrongData}`);
        }
        if (excelArray[i].Height === "" || excelArray[i].Height === undefined) {
          return response(res, 422, `Invalid Height at line number ${wrongData}`);
        }
        if (excelArray[i].Breadth === "" || excelArray[i].Breadth === undefined) {
          return response(res, 422, `Invalid Breadth at line number ${wrongData}`);
        }
        if (excelArray[i].NoOfBoxes === "" || excelArray[i].NoOfBoxes === undefined) {
          return response(res, 422, `Invalid NoOfBoxes at line number ${wrongData}`);
        }
        if (excelArray[i].Unit === "" || excelArray[i].Unit === undefined) {
          return response(res, 422, `Invalid Unit at line number ${wrongData}`);
        }
        if (excelArray[i].Volume_weight === "" || excelArray[i].Volume_weight === undefined) {
          return response(res, 422, `Invalid Volume_weight at line number ${wrongData}`);
        }
        if (excelArray[i].WeightUnit_KG_Or_Gram === "" || excelArray[i].WeightUnit_KG_Or_Gram === undefined) {
          return response(res, 422, `Invalid WeightUnit_KG_Or_Gram at line number ${wrongData}`);
        }
        if (excelArray[i].Shipvalue === "" || excelArray[i].Shipvalue === undefined) {
          return response(res, 422, `Invalid Shipvalue at line number ${wrongData}`);
        }
        if (excelArray[i].LSPDocket === "" || excelArray[i].LSPDocket === undefined) {
          return response(res, 422, `Invalid LSPDocket at line number ${wrongData}`);
        }
        if (excelArray[i].OtherInfo === "" || excelArray[i].OtherInfo === undefined) {
          return response(res, 422, `Invalid OtherInfo at line number ${wrongData}`);
        }
        if (excelArray[i].TransporterName === "" || excelArray[i].TransporterName === undefined) {
          return response(res, 422, `Invalid TransporterName at line number ${wrongData}`);
        }
        if (!await User.findOne({
          where: {
            email: excelArray[i].UserEmail,
            isUser: true,
            isBlocked: false
          }
        }))
          return response(res, 422, `At Line number ${wrongData}  user   not found `)
        if (!await User.findOne({
          where: {
            id: excelArray[i].Lpid,
            isBlocked: false
          }
        }))
          return response(res, 422, `At Line number ${wrongData}  vendor   not found `)
        if (!await Service.findOne({
          where: {
            id: excelArray[i].ServiceId,
            userId: excelArray[i].Lpid


          }
        }))
          return response(res, 422, `At Line number ${wrongData}  service   not found `)

        if (i == 0) {
          vendorId = excelArray[i].Lpid
          userEmail = excelArray[i].UserEmail
          serviceId = excelArray[i].ServiceId
          rateType = excelArray[i].RateType
        } else {
          if (vendorId != excelArray[i].Lpid)
            return response(res, 422, `At Line number ${wrongData} different lp id found `)
          if (userEmail != excelArray[i].UserEmail)
            return response(res, 422, `At Line number ${wrongData} different user email found `)
          if (serviceId != excelArray[i].ServiceId)
            return response(res, 422, `At Line number ${wrongData} different service found `)
          if (rateType != excelArray[i].RateType)
            return response(res, 422, `At Line number ${wrongData} different rate type found `)
        }

        finalData.push(excelArray[i])

      }
      let user = await User.findOne({
        where: {
          email: excelArray[0].UserEmail,
          isUser: true,
          isBlocked: false
        },
        include: [{
          model: UserAccountDetails,
          as: "account"
        }]
      })

      const groupByOrderNoOrReturnSingle = async (data) => {
        const grouped = data.reduce((acc, item) => {
          const orderNo = item.OrderNo;

          // Check if the orderNo is defined
          if (orderNo !== undefined) {
            // Check if the orderNo group already exists
            if (!acc[orderNo]) {
              acc[orderNo] = []; // Create a new array for this orderNo
            }
            acc[orderNo].push(item); // Add the item to the group
          } else {
            // If there is no OrderNo, just add the item as a single object in its own array
            acc.push([item]);
          }
          return acc;
        }, []);

        // Convert the grouped object into an array of groups
        const finalOutput = Object.values(grouped);

        return finalOutput;
      };

      // Usage
      const groupedOrSingleData = await groupByOrderNoOrReturnSingle(finalData);
      // return response(res, 422, 'data', groupedOrSingleData)
      var orderAmount = 0
      for (const exceldata of groupedOrSingleData) {

        let data = null

        if (exceldata[0].RateType == 1) {
          data = await validateAndCalculate(exceldata)
        } else {
          data = await validateAndCalculatePerBox(exceldata)
        }
        if (data.status == 1) {
          orderAmount += parseFloat(data.amount) || 0;
        } else if (data.status == 2) {
          return response(res, 422, 'Pincode not found')
        } else if (data.status == 3) {
          return response(res, 422, 'Vendor service not found')
        } else if (data.status == 4) {
          return response(res, 422, 'Pincode not mapped with vendor service')
        } else if (data.status == 5) {
          return response(res, 422, 'Vendor service not found')
        } else if (data.status == 6) {
          return response(res, 422, 'Vendor service not found')
        }
        else if (data.status == 7) {
          return response(res, 422, `Vendor not accept shipment ${exceldata[0].RateType == 1 ? 'weight' : 'box'}`)
        }
        else if (data.status == 8) {
          return response(res, 422, 'Vendor service not found')
        }
        else if (data.status == 9) {
          return response(res, 422, 'Vendor service not found')
        }
        else if (data.status == 10) {
          return response(res, 422, 'Vendor service not found')
        }
        else if (data.status == 11) {
          return response(res, 422, 'Pincode not mapped with zone')
        }
        else if (data.status == 12) {
          return response(res, 422, 'Selected vendor is dummy')
        }
        else {
          return response(res, 422, 'wrong data')

        }
      }
      console.log(orderAmount, "order amount");

      if (user && user.account) {
        //if postpaid check available credit balance
        if (user.account.billingType == 'postpaid') {
          if (orderAmount > user.account.availableAmount)
            return response(res, 422, 'User credit balance is low')
        } else {
          //if postpaid check available wallet balance
          let walletBalance = atob(user.account.availableWalletAmount)
          if (orderAmount > walletBalance)
            return response(res, 422, 'User wallet balance is low')

        }
      } else {
        return response(res, 422, 'User account not setup')
      }

      for (let i = 0; i < groupedOrSingleData.length; i++) {
        let data = groupedOrSingleData[i]
        if (data[0].RateType == 1) {
      
          // return success(res,groupedOrSingleData)
          await calculateFinalPriceAndCreateOrder(groupedOrSingleData[i])
        } else {
          await calculateFinalPriceAndCreateOrderPerBox(groupedOrSingleData[i])
        }
      }
      // await t.commit();
      return success(res, 'Order placed')
    } catch (error) {
      // await t.rollback();
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  uploadUserDataByExcel: async (req, res) => {
    try {
      const v = new Validator(req.files, {
        excelSheet: 'required|mime:xls,xlsx'

      });
      const matched = await v.check();

      if (!matched) {
        return validateFail(res, v);
      }
      if (!req.files)
        return response(res, 422, "Excel file required")
      if (!req.files && !req.files.excelSheet)
        return response(res, 422, "Excel file required")
      // return success(res, "data")

      let headers = [];
      let excelArray = [];
      await workbook.xlsx.load(req.files.excelSheet.data);
      const worksheet = workbook.getWorksheet(1); // Assuming you want the first sheet          

      // Extract headers from the first row
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers.push(cell.value);
      });

      // Process each subsequent row to build the data array
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip the header row
          let rowData = {};
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber - 1]; // Match the cell with the corresponding header

            // Handle hyperlinks and rich text objects
            if (typeof cell.value === 'object' && cell.value !== null && cell.value.text) {
              rowData[header] = cell.value.text; // Extract the plain text from hyperlink or rich text
            } else if (cell.formula) {
              // Handle formulas, return the evaluated result
              rowData[header] = cell.result !== undefined ? cell.result : null;
            } else {
              rowData[header] = cell.value;
            }
          });
          excelArray.push(rowData);
        }
      });

      const hashedPassword = await bcrypt.hash("Mvikash@123", parseInt(process.env.BCRYPTSALT, 10));



      for (const user of excelArray) {
        if (user.User_Type != 'Admin') {
          const newUser = await User.create({
            mobile: user.PhoneNumber,
            email: user.UserName,
            password: hashedPassword,
            name: user.Name,
            isUser: user.User_Type == "Customer" ? 1 : 0,
            isVendor: user.User_Type == "Vendor" ? 1 : 0,
            isActive: true,
            isBlocked: 0,
            isDummy: user.IsDummy ? 1 : 0,
            createdAt: user.Inserttime,
            updatedAt: user.Inserttime
          });
          await Account.create({
            billingType: 'prepaid',
            userId: newUser.id,
            markup: 0
          });
        }

      }

      // const newUser = await User.create({
      //     mobile: req.body.mobile,
      //     email,
      //     password: hashedPassword,
      //     name: req.body.name,
      //     isUser: isUser,
      //     isVendor: isVendor,
      //     isActive: true,
      //     isDummy: isDummy
      // });

      // const AccountData = await Account.create({
      //     billingType: 'prepaid',
      //     userId: newUser.id,
      //     markup: '35'
      // });

      return success(res, "data")
    } catch (error) {

    }
  },
  getOrderForBulkStatusUpdate: async (req, res) => {
    try {
      const v1 = new Validator(req.query, {
        from: 'required',
        to: 'required',

      });
      const matched1 = await v1.check();

      if (!matched1) {
        return validateFail(res, v1);
      }
      // Define header as a simple array of strings
      let headers = [
        "orderId",
        "order_id",
        "status",
        "remark",
        "DelayReason",
        "status option 1=>Booked,2=>PickedUp,3=>InTransit,4=>Delivered,5=>Cancelled,6=>RTO"
      ];

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('orderfileforstatusupdate');
      // Add headers to the worksheet
      worksheet.columns = headers.map(header => ({ header, key: header }));
      let params = {
        paymentStatus: {
          [Op.ne]: "Initiated"
        },
        // latestStatus: {
        //     [Op.in]: [1, 2, 3, 6]
        // },
        [Op.and]: [{
          id: {
            [Op.gte]: req.query.from
          }
        },
        {
          id: {
            [Op.lte]: req.query.to
          }
        }]

      }
      // Add data rows
      let orders = await Order.findAll({
        where: params
      })
      for (let i = 0; i < orders.length; i++) {
        const lastestStatus = await OrderedItemsStatus.findOne({
          where: {
            OrderId: orders[i].dataValues.Order_id
          },
          order: [['StatusType', 'DESC']]

        });
        worksheet.addRow({
          "orderId": orders[i].id,
          "order_id": orders[i].Order_id,
          "status": orders[i].latestStatus,
          "remark": lastestStatus && lastestStatus.ExcelRemarks ? lastestStatus.ExcelRemarks : "",
          "DelayReason": lastestStatus && lastestStatus.DelayReason ? lastestStatus.DelayReason : ""
        });
      }
      // Write the workbook to the response
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + 'orderfileforstatusupdate.xlsx'
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  updateBulkOrderStatus: async (req, res) => {
    try {
      if (!req.files)
        return response(res, 422, "Excel file required")
      if (!req.files && !req.files.excelSheet)
        return response(res, 422, "Excel file required")
      const v = new Validator(req.files, {
        excelSheet: 'required|mime:xls,xlsx'

      });
      const matched = await v.check();

      if (!matched) {
        return validateFail(res, v);
      }
      let headers = [];
      let excelArray = [];
      await workbook.xlsx.load(req.files.excelSheet.data);
      const worksheet = workbook.getWorksheet(1); // Assuming you want the first sheet          

      // Extract headers from the first row
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers.push(cell.value);
      });
      // Process each subsequent row to build the data array
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip the header row
          let rowData = {};
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber - 1]; // Match the cell with the corresponding header

            // Handle hyperlinks and rich text objects
            if (typeof cell.value === 'object' && cell.value !== null && cell.value.text) {
              rowData[header] = cell.value.text; // Extract the plain text from hyperlink or rich text
            } else if (cell.formula) {
              // Handle formulas, return the evaluated result
              rowData[header] = cell.result !== undefined ? cell.result : null;
            } else {
              rowData[header] = cell.value;
            }
          });
          excelArray.push(rowData);
        }
      });
      if (excelArray.length == 0)
        return response(res, 422, "Please fill the data");
      if (excelArray[0].orderId == undefined)
        return response(res, 422, "Order id header missing");
      if (excelArray[0].status == undefined)
        return response(res, 422, "status header missing");
      for (let i = 0; i < excelArray.length; i++) {
        let wrongData = i + 2;
        if (excelArray[i].orderId === "" || excelArray[i].orderId === undefined) {
          return response(res, 422, `Invalid order id at line number ${wrongData}`);
        }
        if (excelArray[i].status === "" || excelArray[i].status === undefined) {
          return response(res, 422, `Invalid status  at line number ${wrongData}`);
        }
        let order = await Order.findOne({
          where: {
            id: excelArray[i].orderId
          }
        })
        if (!order)
          return response(res, 422, `Invalid order id at line number ${wrongData}`);
        // if (excelArray[i].status < order.latestStatus)
        //     return response(res, 422, `You can't revert back the status at ${wrongData}`);

        let status = await OrderStatusType.findOne({
          where: {
            id: excelArray[i].status
          }
        })
        if (!status)
          return response(res, 422, `Invalid status  at line number ${wrongData}`);


        // if (order.latestStatus == 4 || order.latestStatus == 5)
        //     return response(res, 422, `Status already updated for this order  at line number ${wrongData}`)
      }

      for (let i = 0; i < excelArray.length; i++) {
        let orderStatusType = await OrderStatusType.findOne({
          where: {
            id: excelArray[i].status
          }
        })
        let order = await Order.findOne({
          where: {
            id: excelArray[i].orderId
          }
        })
        let items = await OrderItem.findAll({
          where: {
            Orderid: order.Order_id
          }
        })
        for (let j = 0; j < items.length; j++) {
          let exist = await OrderedItemsStatus.findOne({
            where: {
              ItemId: items[j].Itemid,
              OrderId: order.Order_id,
              userId: order.userId,
              StatusType: excelArray[i].status,
            }
          })
          if (exist) {
            await OrderedItemsStatus.update({
              ExcelRemarks: excelArray[i].remark ? excelArray[i].remark : orderStatusType.name,
              DelayReason: excelArray[i].DelayReason ? excelArray[i].DelayReason : "",
              DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null,
              StatusType: excelArray[i].status,

            }, {
              where: {
                id: exist.id
              }
            })
            await OrderItemStatusRemark.create({
              orderItemStatusId: exist.id,
              remark: excelArray[i].remark ? excelArray[i].remark : orderStatusType.name,
              delayReason: excelArray[i].DelayReason ? excelArray[i].DelayReason : "",
              createdAt: new Date(),
              updatedAt: new Date()
            })
          } else {
            let created = await OrderedItemsStatus.create({
              ItemId: items[j].Itemid,
              OrderId: order.Order_id,
              userId: order.userId,
              StatusType: excelArray[i].status,
              status: 1,
              ExcelRemarks: excelArray[i].remark ? excelArray[i].remark : orderStatusType.name,
              DelayReason: excelArray[i].DelayReason ? excelArray[i].DelayReason : "",
              DeliveredAt: orderStatusType.name == "Delivered" ? new Date() : null

            })
            await OrderItemStatusRemark.create({
              orderItemStatusId: created.id,
              remark: excelArray[i].remark ? excelArray[i].remark : orderStatusType.name,
              delayReason: excelArray[i].DelayReason ? excelArray[i].DelayReason : "",
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }

        await OrderItem.update({
          ItemStatus: excelArray[i].status,
          status: orderStatusType.name
        }, {
          where: {
            Orderid: order.Order_id
          }
        })
        await Order.update({ updatedAt: new Date(), latestStatus: excelArray[i].status }, {
          where: {
            Order_id: order.Order_id,
            vendorId: order.vendorId,
            userId: order.userId
          }
        })
        let itemCount = await OrderItem.count({
          where: {
            Orderid: order.Order_id
          }
        })
        let user = await User.findOne({
          where:
          {
            id: order.userId
          },
          attributes: ['id', 'mobile', 'email']
        })
        let bodyValues = [order.Order_id, orderStatusType.name, moment(order.createdAt).format('DD MM YYYY'), itemCount, order.deliveryaddress, '', moment(order.ExpectedDelivery).format('DD MM YYYY'), order.MvikasDocketNo, order.invoiceNumber, order.deliverypersonname]
        await NotificationHelper.createOrderUpdateNotification(user.email, order.Order_id, order.vendorId, order.userId, excelArray[i].status, bodyValues, `91${user.mobile}`, [process.env.MSG91_BUTTON_URL])



      }
      return success(res, ORDER_CONSTANTS.STATUS_CHANGED)
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  },
  deleteBulkOrder: async (req, res) => {
    try {
      const requests = req.body;
      const v = new Validator(req.body, {
        orderIds: "required|array",
      });
      const matched = await v.check();

      if (!matched) {
        return validateFail(res, v);
      }
      const orders = await Order.findAll({
        where: {
          Order_id: requests.orderIds,
        },
        attributes: ["PaymentId"],
      });
      //   return success(res,orders)
      const paymentIds = orders.map((order) => order.PaymentId).filter(Boolean);

      // Soft delete associated payments
      if (paymentIds.length > 0) {
        await Payment.destroy({
          where: { id: paymentIds },
        });
      }

      // Soft delete orders
      const deletedCount = await Order.destroy({
        where: { Order_id: requests.orderIds },
      });
      if (deletedCount === 0) {
        return failed(res, "No matching orders found to delete.");
      }
      return success(res, "Order deleted successfully.");
    } catch (error) {
      console.error(SYSTEM_FAILURE, error);
      return failed(res, SYSTEM_FAILURE);
    }
  }

}

async function validateAndCalculate(orderData) {
  let data = "";
  data = orderData[0];
  data.items = orderData.map((item) => ({
    L: item.Length,
    B: item.Breadth,
    H: item.Height,
    boxes: item.NoOfBoxes,
    unit: item.Unit,
    boxWeight: item.Volume_weight,
  }));
  data.shipmentAmount = orderData.reduce(
    (sum, item) => sum + item.Shipvalue,
    0
  );
  data.shipmentWeight = orderData.reduce(
    (sum, item) => sum + item.Volume_weight,
    0
  );
  data.boxes = orderData.reduce((sum, item) => sum + item.NoOfBoxes, 0);
  data.shipmentWeight =
    parseFloat(data.shipmentWeight) * parseFloat(data.boxes);
  let user = await User.findOne({
    where: {
      email: data.UserEmail,
    },
    include: [
      {
        model: UserAccountDetails,
        as: "account",
      },
    ],
  });

  let markup = 0;
  let getServiceList = await Service.findOne({
    where: {
      userId: data.Lpid,
      isActive: true,
      id: data.ServiceId,
    },
    include: [
      {
        model: User,
        as: "Vendor",
      },
    ],
  });
  if (!getServiceList) {
    return { status: 3, amount: 0 };
  }
  //get source pincode id
  let getSourcePincodeId = await Pincode.findOne({
    where: {
      pincode: data.Frompincode,
    },
  });

  if (!getSourcePincodeId) return { status: 2, amount: 0 };
  //get destination pincode id
  let getDestinationPincodeId = await Pincode.findOne({
    where: {
      pincode: data.Topincode,
    },
  });
  if (!getDestinationPincodeId) return { status: 2, amount: 0 };

  if (user.account && user.account.markup) {
    markup = parseFloat(user.account.markup);
  } else {
    let vendorAccount = await UserAccountDetails.findOne({
      where: {
        userId: getServiceList.userId,
      },
    });
    markup =
      vendorAccount && vendorAccount.markup
        ? parseFloat(vendorAccount.markup)
        : 0;
  }
  if (!markup) {
    markup = 35;
  }
  if (getServiceList.Vendor?.isDummy) markup = 0;
  let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
    where: {
      pincodeId: getSourcePincodeId.id,
      vendorId: getServiceList.userId,
      isActive: true,
    },
  });
  let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
    where: {
      pincodeId: getDestinationPincodeId.id,
      vendorId: getServiceList.userId,
      isActive: true,
    },
  });
  if (!checkSourcePincodeMapWithZone && !checkDestinationPincodeMapWithZone)
    return { status: 4, amount: 0 };
  if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
    let getSourceService = await ZoneServiceMap.findOne({
      where: {
        zoneId: checkSourcePincodeMapWithZone.zoneId,
        zonePinId: checkSourcePincodeMapWithZone.pincodeId,
        vendorId: checkSourcePincodeMapWithZone.vendorId,
        serviceId: getServiceList.id,
        isActive: true,
        isODA: {
          [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
        },
      },
    });

    let getDestinationService = await ZoneServiceMap.findOne({
      where: {
        zoneId: checkDestinationPincodeMapWithZone.zoneId,
        zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
        vendorId: checkDestinationPincodeMapWithZone.vendorId,
        serviceId: getServiceList.id,
        isActive: true,
        isODA: {
          [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
        },
      },
    });

    if (!getSourceService && !getDestinationService)
      return { status: 5, amount: 0 };
    if (getSourceService && getDestinationService) {
      let zoneInODA = false;
      let odaType = ["ODA1", "ODA2", "ODA3"];
      let ODA1 = false;
      let ODA2 = false;
      let ODA3 = false;
      let ODA11 = false;
      let ODA22 = false;
      let ODA33 = false;
      if (
        odaType.includes(getSourceService.isODA) ||
        odaType.includes(getDestinationService.isODA)
      )
        zoneInODA = true;
      if (getSourceService.isODA == "ODA1") ODA1 = true;
      if (getSourceService.isODA == "ODA2") ODA2 = true;
      if (getSourceService.isODA == "ODA3") ODA3 = true;
      if (getDestinationService.isODA == "ODA1") ODA11 = true;
      if (getDestinationService.isODA == "ODA2") ODA22 = true;
      if (getDestinationService.isODA == "ODA3") ODA33 = true;
      let tatParams = {
        zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
        zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
        vendorId: getServiceList.userId,
        serviceId: getServiceList.id,
      };
      if (zoneInODA) {
        tatParams = Object.assign(tatParams, {
          ODATAT: {
            [Op.ne]: null,
          },
        });
      } else {
        tatParams = Object.assign(tatParams, {
          STDTAT: {
            [Op.ne]: null,
          },
        });
      }
      // console.log(tatParams);
      let tat = await OdaTat.findOne({
        where: tatParams,
      });
      if (!tat) return { status: 6, amount: 0 };
      if (tat) {
        let cargoRate = await CargoRate.findOne({
          where: {
            serviceId: getServiceList.id,
            vendorId: getServiceList.userId,
            rateType: data.RateType,
          },
        });
        if (!cargoRate) return { status: 7, amount: 0 };
        if (cargoRate) {
          let vendorRate = await VendorRate.findOne({
            where: {
              cargoId: cargoRate.id,
              zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
              zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
              rateType: data.RateType,
            },
          });

          if (vendorRate) {
            let handlingCharge =
              await RateCalculatorService.getRatePerKgServiceList(
                vendorRate,
                cargoRate,
                data.items,
                data.shipmentWeight,
                ODA1,
                ODA2,
                ODA3,
                ODA11,
                ODA22,
                ODA33,
                data.shipmentAmount,
                getServiceList,
                user,
                markup,
                getSourcePincodeId,
                getDestinationPincodeId,
                tat,
                null
              );
            if (!handlingCharge) {
              return { status: 7, amount: 0 };
            }
            return {
              status: 1,
              amount: parseFloat(handlingCharge.totalAmount).toFixed(2),
            };
          }
        }
        return { status: 8, amount: 0 };
      }
      return { status: 9, amount: 0 };
    }
    return { status: 10, amount: 0 };
  }
  return { status: 11, amount: 0 };

  // }
  // return { status: 12, amount: 0 }
}
async function validateAndCalculatePerBox(orderData) {
  let data = "";
  data = orderData[0];
  data.items = orderData.map((item) => ({
    L: item.Length,
    B: item.Breadth,
    H: item.Height,
    boxes: item.NoOfBoxes,
    unit: item.Unit,
    boxWeight: item.Volume_weight,
  }));
  let items = data.items;
  data.shipmentAmount = orderData.reduce(
    (sum, item) => sum + item.Shipvalue,
    0
  );
  data.shipmentWeight = orderData.reduce(
    (sum, item) => sum + item.Volume_weight,
    0
  );
  data.boxes = orderData.reduce((sum, item) => sum + item.NoOfBoxes, 0);
  data.shipmentWeight =
    parseFloat(data.shipmentWeight) * parseFloat(data.boxes);
  let numberOfBoxes = items.reduce(
    (sum, item) => parseInt(sum) + parseInt(item.boxes),
    0
  );
  let shipmentAmount = data.shipmentAmount;
  let shipmentWeight = data.shipmentWeight;
  let finalShipmentWeight = 0;
  let finalNumberOfBox = numberOfBoxes;
  let user = await User.findOne({
    where: {
      email: data.UserEmail,
    },
    include: [
      {
        model: UserAccountDetails,
        as: "account",
      },
    ],
  });

  let markup = 0;
  let getServiceList = await Service.findOne({
    where: {
      userId: data.Lpid,
      isActive: true,
      id: data.ServiceId,
    },
    include: [
      {
        model: User,
        as: "Vendor",
      },
    ],
  });
  if (!getServiceList) {
    return { status: 3, amount: 0 };
  }
  //get source pincode id
  let getSourcePincodeId = await Pincode.findOne({
    where: {
      pincode: data.Frompincode,
    },
  });

  if (!getSourcePincodeId) return { status: 2, amount: 0 };
  //get destination pincode id
  let getDestinationPincodeId = await Pincode.findOne({
    where: {
      pincode: data.Topincode,
    },
  });
  if (!getDestinationPincodeId) return { status: 2, amount: 0 };

  if (user.account && user.account.markup) {
    markup = parseFloat(user.account.markup);
  } else {
    let vendorAccount = await UserAccountDetails.findOne({
      where: {
        userId: getServiceList.userId,
      },
    });
    markup =
      vendorAccount && vendorAccount.markup
        ? parseFloat(vendorAccount.markup)
        : 0;
  }
  if (!markup) {
    markup = 35;
  }
  if (getServiceList.Vendor?.isDummy) markup = 0;
  let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
    where: {
      pincodeId: getSourcePincodeId.id,
      vendorId: getServiceList.userId,
      isActive: true,
    },
  });
  let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
    where: {
      pincodeId: getDestinationPincodeId.id,
      vendorId: getServiceList.userId,
      isActive: true,
    },
  });
  if (!checkSourcePincodeMapWithZone && !checkDestinationPincodeMapWithZone)
    return { status: 4, amount: 0 };
  if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
    let getSourceService = await ZoneServiceMap.findOne({
      where: {
        zoneId: checkSourcePincodeMapWithZone.zoneId,
        zonePinId: checkSourcePincodeMapWithZone.pincodeId,
        vendorId: checkSourcePincodeMapWithZone.vendorId,
        serviceId: getServiceList.id,
        isActive: true,
        isODA: {
          [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
        },
      },
    });

    let getDestinationService = await ZoneServiceMap.findOne({
      where: {
        zoneId: checkDestinationPincodeMapWithZone.zoneId,
        zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
        vendorId: checkDestinationPincodeMapWithZone.vendorId,
        serviceId: getServiceList.id,
        isActive: true,
        isODA: {
          [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
        },
      },
    });

    if (!getSourceService && !getDestinationService)
      return { status: 5, amount: 0 };
    if (getSourceService && getDestinationService) {
      let zoneInODA = false;
      let odaType = ["ODA1", "ODA2", "ODA3"];
      let ODA1 = false;
      let ODA2 = false;
      let ODA3 = false;
      let ODA11 = false;
      let ODA22 = false;
      let ODA33 = false;
      if (
        odaType.includes(getSourceService.isODA) ||
        odaType.includes(getDestinationService.isODA)
      )
        zoneInODA = true;
      if (getSourceService.isODA == "ODA1") ODA1 = true;
      if (getSourceService.isODA == "ODA2") ODA2 = true;
      if (getSourceService.isODA == "ODA3") ODA3 = true;
      if (getDestinationService.isODA == "ODA1") ODA11 = true;
      if (getDestinationService.isODA == "ODA2") ODA22 = true;
      if (getDestinationService.isODA == "ODA3") ODA33 = true;
      let tatParams = {
        zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
        zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
        vendorId: getServiceList.userId,
        serviceId: getServiceList.id,
      };
      if (zoneInODA) {
        tatParams = Object.assign(tatParams, {
          ODATAT: {
            [Op.ne]: null,
          },
        });
      } else {
        tatParams = Object.assign(tatParams, {
          STDTAT: {
            [Op.ne]: null,
          },
        });
      }
      // console.log(tatParams);
      let tat = await OdaTat.findOne({
        where: tatParams,
      });
      if (!tat) return { status: 6, amount: 0 };
      if (tat) {
        let cargoRate = await CargoRate.findOne({
          where: {
            serviceId: getServiceList.id,
            vendorId: getServiceList.userId,
            rateType: data.RateType,
          },
        });
        if (!cargoRate) return { status: 7, amount: 0 };
        if (cargoRate) {
          let vendorRate = await VendorRate.findOne({
            where: {
              cargoId: cargoRate.id,
              zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
              zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
              rateType: data.RateType,
            },
          });
          if (!vendorRate) return { status: 7, amount: 0 };
          // if (parseFloat(finalNumberOfBox) <= parseFloat(cargoRate.cwMax)) {
          //   finalNumberOfBox =
          //     parseFloat(cargoRate.cwMin) > parseFloat(finalNumberOfBox)
          //       ? parseFloat(cargoRate.cwMin)
          //       : parseFloat(finalNumberOfBox);
          //   let rateWithMarkup =
          //     parseFloat(vendorRate.rates) +
          //     (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100;
          //   let baseFreight = finalNumberOfBox * rateWithMarkup;
          //   baseFreight =
          //     parseFloat(cargoRate.minFreight) >
          //     finalNumberOfBox * rateWithMarkup
          //       ? parseFloat(cargoRate.minFreight) +
          //         parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100)
          //       : finalNumberOfBox * rateWithMarkup;
          //   // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
          //   let odaMin = 0;
          //   let odaperkg = 0;
          //   let odaAmount = 0;
          //   if (ODA1) {
          //     odaMin = cargoRate.ODA1MinRate
          //       ? parseFloat(cargoRate.ODA1MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA1PerKg
          //       ? parseFloat(cargoRate.ODA1PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   if (ODA2) {
          //     odaMin = cargoRate.ODA2MinRate
          //       ? parseFloat(cargoRate.ODA2MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA2PerKg
          //       ? parseFloat(cargoRate.ODA2PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   if (ODA3) {
          //     odaMin = cargoRate.ODA3MinRate
          //       ? parseFloat(cargoRate.ODA3MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA3PerKg
          //       ? parseFloat(cargoRate.ODA3PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   if (ODA11) {
          //     odaMin = cargoRate.ODA1MinRate
          //       ? parseFloat(cargoRate.ODA1MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA1PerKg
          //       ? parseFloat(cargoRate.ODA1PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   if (ODA22) {
          //     odaMin = cargoRate.ODA2MinRate
          //       ? parseFloat(cargoRate.ODA2MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA2PerKg
          //       ? parseFloat(cargoRate.ODA2PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   if (ODA33) {
          //     odaMin = cargoRate.ODA3MinRate
          //       ? parseFloat(cargoRate.ODA3MinRate)
          //       : 0;
          //     odaperkg = cargoRate.ODA3PerKg
          //       ? parseFloat(cargoRate.ODA3PerKg)
          //       : 0;
          //     odaAmount +=
          //       finalNumberOfBox * odaperkg > odaMin
          //         ? finalNumberOfBox * odaperkg
          //         : odaMin;
          //   }
          //   let additionalCharge = cargoRate.additionalCharge
          //     ? JSON.parse(cargoRate.additionalCharge)
          //     : [];
          //   additionalCharge.forEach((item) => {
          //     // Check if the item has `amount` and `hasDependency`
          //     if (
          //       item.hasOwnProperty("amount") &&
          //       item.hasOwnProperty("hasDependency")
          //     ) {
          //       // If found, update matching blank amount in other objects that reference this id
          //       additionalCharge.forEach((parent) => {
          //         // Check `hasDepedancyData` array in parent items
          //         if (parent.hasDepedancyData) {
          //           parent.hasDepedancyData.forEach((dep) => {
          //             // Match based on id and update amount if it is blank (null or undefined)
          //             if (
          //               dep.hasAdditionalCharge1?.id === item.id &&
          //               dep.hasAdditionalCharge1.amount == null
          //             ) {
          //               dep.hasAdditionalCharge1.amount = item.amount;
          //             }
          //           });
          //         }
          //       });
          //     }
          //   });
          //   // return success(res,"data",additionalCharge)
          //   let calculatedadditionalCharge = {};
          //   if (additionalCharge.length) {
          //     //chargeType 1-per-unit, 2-slabBased, 3-calculative
          //     for (let j = 0; j < additionalCharge.length; j++) {
          //       if (additionalCharge[j] && additionalCharge[j].chargesType) {
          //         if (additionalCharge[j].chargesType == 1) {
          //           let unitBasedAmount =
          //             await CalculativeHelper.calulateUnitBased(
          //               additionalCharge[j],
          //               finalShipmentWeight,
          //               items
          //             );
          //           if (unitBasedAmount) {
          //             calculatedadditionalCharge[
          //               additionalCharge[j].labelText
          //             ] = unitBasedAmount ? unitBasedAmount : 0;
          //           }
          //         } else if (additionalCharge[j].chargesType == 2) {
          //           let slabBasedAmount =
          //             await CalculativeHelper.calulateSlabBased(
          //               additionalCharge[j],
          //               finalShipmentWeight,
          //               items
          //             );

          //           if (slabBasedAmount) {
          //             calculatedadditionalCharge[
          //               additionalCharge[j].labelText
          //             ] = parseFloat(slabBasedAmount).toFixed(2);
          //           }
          //         } else if (
          //           additionalCharge[j].chargesType == 3 &&
          //           !additionalCharge[j].minValue &&
          //           !additionalCharge[j]?.hasDepedancyData?.length
          //         ) {
          //           calculatedadditionalCharge[additionalCharge[j].labelText] =
          //             parseFloat(
          //               additionalCharge[j].amount
          //                 ? additionalCharge[j].amount
          //                 : 0
          //             ).toFixed(2);
          //         } else {
          //           let calculativeCharges = additionalCharge[j];
          //           let amount = 0;
          //           let additionalAmount = 0;
          //           let endOperator = "";
          //           if (calculativeCharges.hasDepedancyData.length > 1) {
          //           } else {
          //             amount = await CalculativeHelper.calculateCharge(
          //               calculativeCharges,
          //               finalShipmentWeight,
          //               odaAmount,
          //               baseFreight,
          //               shipmentWeight,
          //               shipmentAmount,
          //               items
          //             );
          //           }
          //           calculatedadditionalCharge[additionalCharge[j].labelText] =
          //             parseFloat(amount).toFixed(2);
          //         }
          //       }
          //     }
          //   }
          //   const baseValues = {
          //     "Base Freight": baseFreight,
          //     "Chargeable weight": finalShipmentWeight,
          //     "Shipment weight": shipmentWeight,
          //     ODA: odaAmount,
          //     "Shipment Value": shipmentAmount,
          //   };
          //   if (additionalCharge.length) {
          //     for (let j = 0; j < additionalCharge.length; j++) {
          //       if (additionalCharge[j] && additionalCharge[j].chargesType) {
          //         if (
          //           additionalCharge[j].chargesType == 3 &&
          //           additionalCharge[j]?.hasDepedancyData?.length > 1
          //         ) {
          //           let charge = additionalCharge[j];
          //           let finalString = charge.finalString;
          //           console.log(finalString);
          //           // Regular expression to match each key and operator
          //           const regex =
          //             /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;

          //           let finalFormula = "";
          //           let match;
          //           const result = [];

          //           while ((match = regex.exec(finalString)) !== null) {
          //             if (match[1]) {
          //               // If it matches the key
          //               const key = match[1].trim();
          //               // Filter out unwanted "null" or empty values
          //               if (
          //                 key &&
          //                 key !== null &&
          //                 key !== "null" &&
          //                 key !== "nullnull"
          //               ) {
          //                 result.push({
          //                   type: "key",
          //                   value: key.replace("nullnull" || "null", ""),
          //                 });
          //               }
          //             } else if (match[2]) {
          //               // If it matches the operator
          //               result.push({ type: "operator", value: match[2] });
          //             }
          //           }
          //           for (let i = 0; i < result.length; i++) {
          //             if (result[i].type == "key") {
          //               let key = result[i].value;
          //               let value = "";
          //               if (baseValues[key]) {
          //                 value = baseValues[key];
          //               } else if (calculatedadditionalCharge[key]) {
          //                 value = calculatedadditionalCharge[key];
          //               } else if (Number(key)) {
          //                 value = Number(key);
          //               } else {
          //                 value = 0;
          //               }
          //               finalFormula += value;
          //             } else {
          //               finalFormula += result[i].value;
          //             }
          //           }
          //           let amount = await CalculativeHelper.evaluateLeftToRight(
          //             finalFormula
          //           );
          //           amount =
          //             charge.minValue &&
          //             Number(charge.minValue) > Number(amount)
          //               ? Number(charge.minValue)
          //               : Number(amount);
          //           if (
          //             calculatedadditionalCharge.hasOwnProperty(
          //               additionalCharge[j].labelText
          //             )
          //           ) {
          //             calculatedadditionalCharge[
          //               additionalCharge[j].labelText
          //             ] = parseFloat(amount).toFixed(2);
          //           }
          //         }
          //       }
          //     }
          //   }
          //   let stateCharge = await CalculativeHelper.getStateWiseCharge(
          //     getServiceList.Vendor?.id,
          //     getSourcePincodeId.state,
          //     getDestinationPincodeId.state
          //   );
          //   if (stateCharge) {
          //     calculatedadditionalCharge = Object.assign(
          //       calculatedadditionalCharge,
          //       stateCharge
          //     );
          //   }
          //   let totalAdditionalAmount = Object.values(
          //     calculatedadditionalCharge
          //   ).reduce((sum, value) => {
          //     const numValue = parseFloat(value); // Parse the value as a float
          //     if (isNaN(numValue)) {
          //       console.error(`Invalid number encountered: ${value}`);
          //       return sum; // Skip invalid numbers
          //     }
          //     return sum + numValue; // Keep it as a number for addition
          //   }, 0);
          //   let totalTaxableAmount =
          //     baseFreight + totalAdditionalAmount + odaAmount;
          //   let gst = (totalTaxableAmount * cargoRate.GST) / 100;
          //   let finalAmount = totalTaxableAmount + gst;
          //   // console.log(rateWithMarkup, finalNumberOfBox, baseFreight, totalAdditionalAmount, totalTaxableAmount, gst, finalAmount);

          //   return { status: 1, amount: parseFloat(finalAmount).toFixed(2) };
          // }
          // if (parseFloat(finalShipmentWeight) <= parseFloat(cargoRate.cwMax)) {
          //     finalShipmentWeight = parseFloat(cargoRate.cwMin) > parseFloat(finalShipmentWeight) ? parseFloat(cargoRate.cwMin) : parseFloat(finalShipmentWeight)
          //     let rateWithMarkup = parseFloat(vendorRate.rates) + ((parseFloat(vendorRate.rates) * parseFloat(markup)) / 100)
          //     let baseFreight = finalShipmentWeight * rateWithMarkup
          //     baseFreight = parseFloat(cargoRate.minFreight) > finalShipmentWeight * rateWithMarkup ? parseFloat(cargoRate.minFreight) + parseFloat((parseFloat(cargoRate.minFreight) * markup) / 100) : finalShipmentWeight * rateWithMarkup

          //     // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
          //     let odaMin = 0
          //     let odaperkg = 0
          //     let odaAmount = 0
          //     if (ODA1) {
          //         odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
          //         odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     if (ODA2) {
          //         odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
          //         odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     if (ODA3) {
          //         odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
          //         odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     if (ODA11) {
          //         odaMin = cargoRate.ODA1MinRate ? parseFloat(cargoRate.ODA1MinRate) : 0
          //         odaperkg = cargoRate.ODA1PerKg ? parseFloat(cargoRate.ODA1PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     if (ODA22) {
          //         odaMin = cargoRate.ODA2MinRate ? parseFloat(cargoRate.ODA2MinRate) : 0
          //         odaperkg = cargoRate.ODA2PerKg ? parseFloat(cargoRate.ODA2PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     if (ODA33) {
          //         odaMin = cargoRate.ODA3MinRate ? parseFloat(cargoRate.ODA3MinRate) : 0
          //         odaperkg = cargoRate.ODA3PerKg ? parseFloat(cargoRate.ODA3PerKg) : 0
          //         odaAmount += finalShipmentWeight * odaperkg > odaMin ? finalShipmentWeight * odaperkg : odaMin
          //     }
          //     let additionalCharge = cargoRate.additionalCharge ? JSON.parse(cargoRate.additionalCharge) : []
          //     additionalCharge.forEach(item => {
          //         // Check if the item has `amount` and `hasDependency`
          //         if (item.hasOwnProperty('amount') && item.hasOwnProperty('hasDependency')) {
          //             // If found, update matching blank amount in other objects that reference this id
          //             additionalCharge.forEach(parent => {
          //                 // Check `hasDepedancyData` array in parent items
          //                 if (parent.hasDepedancyData) {
          //                     parent.hasDepedancyData.forEach(dep => {
          //                         // Match based on id and update amount if it is blank (null or undefined)
          //                         if (dep.hasAdditionalCharge1?.id === item.id && dep.hasAdditionalCharge1.amount == null) {
          //                             dep.hasAdditionalCharge1.amount = item.amount;
          //                         }
          //                     });
          //                 }
          //             });
          //         }
          //     });
          //     // return success(res,"data",additionalCharge)
          //     let calculatedadditionalCharge = {}
          //     if (additionalCharge.length) {
          //         //chargeType 1-per-unit, 2-slabBased, 3-calculative
          //         for (let j = 0; j < additionalCharge.length; j++) {
          //             if (additionalCharge[j] && additionalCharge[j].chargesType) {
          //                 if (additionalCharge[j].chargesType == 1) {
          //                     let unitBasedAmount = await CalculativeHelper.calulateUnitBased(additionalCharge[j], finalShipmentWeight, data.items)
          //                     if (unitBasedAmount) {
          //                         calculatedadditionalCharge[additionalCharge[j].labelText] = unitBasedAmount ? unitBasedAmount : 0
          //                     }
          //                 }
          //                 else if (additionalCharge[j].chargesType == 2) {
          //                     let slabBasedAmount = await CalculativeHelper.calulateSlabBased(additionalCharge[j], finalShipmentWeight, data.items)

          //                     if (slabBasedAmount) {
          //                         calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(slabBasedAmount).toFixed(2)
          //                     }

          //                 } else if (additionalCharge[j].chargesType == 3 && !additionalCharge[j].minValue && !additionalCharge[j]?.hasDepedancyData?.length) {
          //                     calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(additionalCharge[j].amount ? additionalCharge[j].amount : 0).toFixed(2)
          //                 }
          //                 else {
          //                     let calculativeCharges = additionalCharge[j]
          //                     let amount = 0
          //                     let additionalAmount = 0
          //                     let endOperator = ""
          //                     if (calculativeCharges.hasDepedancyData.length > 1) {
          //                     } else {
          //                         amount = await CalculativeHelper.calculateCharge(calculativeCharges, finalShipmentWeight, odaAmount, baseFreight, data.shipmentWeight, data.shipmentAmount, data.items)
          //                     }
          //                     calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2)
          //                 }
          //             }

          //         }

          //     }
          //     const baseValues = {
          //         'Base Freight': baseFreight,
          //         'Chargeable weight': finalShipmentWeight,
          //         'Shipment weight': data.shipmentWeight,
          //         'ODA': odaAmount,
          //         'Shipment Value': data.shipmentAmount
          //     };
          //     if (additionalCharge.length) {
          //         for (let j = 0; j < additionalCharge.length; j++) {
          //             if (additionalCharge[j] && additionalCharge[j].chargesType) {
          //                 if (additionalCharge[j].chargesType == 3 && additionalCharge[j]?.hasDepedancyData?.length > 1) {
          //                     let charge = additionalCharge[j]
          //                     let finalString = charge.finalString
          //                     console.log(finalString);
          //                     // Regular expression to match each key and operator
          //                     const regex = /([A-Za-z0-9\s]+)|([\+\-%\!@#\$&\*\(\)_\-\+=\{\}\[\]\\|:;'"<>,.\/?^~`]+)/g;

          //                     let finalFormula = ''
          //                     let match;
          //                     const result = [];

          //                     while ((match = regex.exec(finalString)) !== null) {
          //                         if (match[1]) {
          //                             // If it matches the key
          //                             const key = match[1].trim();
          //                             // Filter out unwanted "null" or empty values
          //                             if (key && key !== null && key !== "null" && key !== "nullnull") {
          //                                 result.push({ type: 'key', value: key.replace("nullnull" || "null", "") });
          //                             }
          //                         } else if (match[2]) {
          //                             // If it matches the operator
          //                             result.push({ type: 'operator', value: match[2] });
          //                         }
          //                     }
          //                     for (let i = 0; i < result.length; i++) {
          //                         if (result[i].type == 'key') {
          //                             let key = result[i].value
          //                             let value = ""
          //                             if (baseValues[key]) {
          //                                 value = baseValues[key]
          //                             } else if (calculatedadditionalCharge[key]) {
          //                                 value = calculatedadditionalCharge[key]

          //                             } else if ((Number(key))) {
          //                                 value = Number(key)

          //                             } else {
          //                                 value = 0
          //                             }
          //                             finalFormula += value
          //                         } else {
          //                             finalFormula += result[i].value

          //                         }
          //                     }
          //                     let amount = await CalculativeHelper.evaluateLeftToRight(finalFormula)
          //                     amount = charge.minValue && Number(charge.minValue) > Number(amount) ? Number(charge.minValue) : Number(amount)
          //                     if (calculatedadditionalCharge.hasOwnProperty(additionalCharge[j].labelText)) {
          //                         calculatedadditionalCharge[additionalCharge[j].labelText] = parseFloat(amount).toFixed(2);
          //                     }

          //                 }
          //             }
          //         }

          //     }
          //     let stateCharge = await CalculativeHelper.getStateWiseCharge(getServiceList.userId, getSourcePincodeId.state, getDestinationPincodeId.state)
          //     if (stateCharge) {
          //         calculatedadditionalCharge = Object.assign(calculatedadditionalCharge, stateCharge)
          //     }

          //     let totalAdditionalAmount = Object.values(calculatedadditionalCharge).reduce((sum, value) => {

          //         const numValue = parseFloat(value); // Parse the value as a float
          //         if (isNaN(numValue)) {
          //             console.error(`Invalid number encountered: ${value}`);
          //             return sum; // Skip invalid numbers
          //         }
          //         return sum + numValue; // Keep it as a number for addition
          //     }, 0);
          //     let totalTaxableAmount = baseFreight + totalAdditionalAmount + odaAmount
          //     let gst = (totalTaxableAmount * cargoRate.GST) / 100
          //     let finalAmount = totalTaxableAmount + gst

          //     return { status: 1, amount: parseFloat(finalAmount).toFixed(2) }
          // }
          if (vendorRate) {
            let handlingCharge =
              await RateCalculatorService.getRatePerboxServiceList(
                vendorRate,
                cargoRate,
                data.items,
                data.shipmentWeight,
                ODA1,
                ODA2,
                ODA3,
                ODA11,
                ODA22,
                ODA33,
                data.shipmentAmount,
                getServiceList,
                user,
                markup,
                getSourcePincodeId,
                getDestinationPincodeId,
                tat,
                null
              );
            console.log({ handlingCharge });
            // return 1
            if (!handlingCharge) {
              return { status: 7, amount: 0 };
            }
            return {
              status: 1,
              amount: parseFloat(handlingCharge.totalAmount).toFixed(2),
            };
          }
          return { status: 7, amount: 0 };
        }
        return { status: 8, amount: 0 };
      }
      return { status: 9, amount: 0 };
    }
    return { status: 10, amount: 0 };
  }
  return { status: 11, amount: 0 };

  // }
  // return { status: 12, amount: 0 }
}

async function calculateFinalPriceAndCreateOrder(orderData) {
  try {
    let data = "";
    let finalShipmentWeight = 0;
    data = orderData[0];
    data.items = orderData.map((item) => ({
      L: item.Length,
      B: item.Breadth,
      H: item.Height,
      boxes: item.NoOfBoxes,
      unit: item.Unit,
      boxWeight: item.Volume_weight,
    }));
    data.shipmentAmount = orderData.reduce(
      (sum, item) => sum + item.Shipvalue,
      0
    );
    data.shipmentWeight = orderData.reduce(
      (sum, item) => sum + item.Volume_weight,
      0
    );
    data.boxes = orderData.reduce((sum, item) => sum + item.NoOfBoxes, 0);
    data.shipmentWeight =
      parseFloat(data.shipmentWeight) * parseFloat(data.boxes);
    let user = await User.findOne({
      where: {
        email: data.UserEmail,
      },
      include: [
        {
          model: UserAccountDetails,
          as: "account",
        },
      ],
    });
    let markup = 0;
    let getServiceList = await Service.findOne({
      where: {
        userId: data.Lpid,
        isActive: true,
        id: data.ServiceId,
      },
      include: [
        {
          model: User,
          as: "Vendor",
        },
      ],
    });
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
      where: {
        pincode: data.Frompincode,
      },
    });
    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
      where: {
        pincode: data.Topincode,
      },
    });

    if (user.account && user.account.markup) {
      markup = parseFloat(user.account.markup);
    } else {
      let vendorAccount = await UserAccountDetails.findOne({
        where: {
          userId: getServiceList.userId,
        },
      });
      markup =
        vendorAccount && vendorAccount.markup
          ? parseFloat(vendorAccount.markup)
          : 0;
    }
    if (!markup) {
      markup = 35;
    }
    if (getServiceList.Vendor?.isDummy) {
      markup = 0;
    }
    let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
      where: {
        pincodeId: getSourcePincodeId.id,
        vendorId: getServiceList.userId,
        isActive: true,
      },
    });
    let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
      where: {
        pincodeId: getDestinationPincodeId.id,
        vendorId: getServiceList.userId,
        isActive: true,
      },
    });
    if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
      let getSourceService = await ZoneServiceMap.findOne({
        where: {
          zoneId: checkSourcePincodeMapWithZone.zoneId,
          zonePinId: checkSourcePincodeMapWithZone.pincodeId,
          vendorId: checkSourcePincodeMapWithZone.vendorId,
          serviceId: getServiceList.id,
          isActive: true,
          isODA: {
            [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
          },
        },
      });
      let getDestinationService = await ZoneServiceMap.findOne({
        where: {
          zoneId: checkDestinationPincodeMapWithZone.zoneId,
          zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
          vendorId: checkDestinationPincodeMapWithZone.vendorId,
          serviceId: getServiceList.id,
          isActive: true,
          isODA: {
            [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
          },
        },
      });
      if (getSourceService && getDestinationService) {
        let zoneInODA = false;
        let odaType = ["ODA1", "ODA2", "ODA3"];
        let ODA1 = false;
        let ODA2 = false;
        let ODA3 = false;
        let ODA11 = false;
        let ODA22 = false;
        let ODA33 = false;
        if (
          odaType.includes(getSourceService.isODA) ||
          odaType.includes(getDestinationService.isODA)
        )
          zoneInODA = true;
        if (getSourceService.isODA == "ODA1") ODA1 = true;
        if (getSourceService.isODA == "ODA2") ODA2 = true;
        if (getSourceService.isODA == "ODA3") ODA3 = true;
        if (getDestinationService.isODA == "ODA1") ODA11 = true;
        if (getDestinationService.isODA == "ODA2") ODA22 = true;
        if (getDestinationService.isODA == "ODA3") ODA33 = true;
        let tatParams = {
          zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
          zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
          vendorId: getServiceList.userId,
          serviceId: getServiceList.id,
        };
        if (zoneInODA) {
          tatParams = Object.assign(tatParams, {
            ODATAT: {
              [Op.ne]: null,
            },
          });
        } else {
          tatParams = Object.assign(tatParams, {
            STDTAT: {
              [Op.ne]: null,
            },
          });
        }
        // console.log(tatParams);
        let tat = await OdaTat.findOne({
          where: tatParams,
        });
        if (tat) {
          let TAT =
            zoneInODA && tat.ODATAT
              ? parseInt(tat.ODATAT)
              : parseInt(tat.STDTAT);
          let cargoRate = await CargoRate.findOne({
            where: {
              serviceId: getServiceList.id,
              vendorId: getServiceList.userId,
            },
          });

          if (cargoRate) {
            let vendorRate = await VendorRate.findOne({
              where: {
                cargoId: cargoRate.id,
                zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
              },
            });
            if (vendorRate) {
              let handlingCharge =
                await RateCalculatorService.getRatePerKgServiceList(
                  vendorRate,
                  cargoRate,
                  data.items,
                  data.shipmentWeight,
                  ODA1,
                  ODA2,
                  ODA3,
                  ODA11,
                  ODA22,
                  ODA33,
                  data.shipmentAmount,
                  getServiceList,
                  user,
                  markup,
                  getSourcePincodeId,
                  getDestinationPincodeId,
                  tat,
                  null
                );

              if (!handlingCharge) {
                return { status: 7, amount: 0 };
              }
              // console.log({handlingCharge})
              let paymentCreated = await Payment.create({
                userId: user.id,
                vendorId: data.Lpid,
                vendorOldId: data.Lpid,
                paymentType:
                  user.account.billingType == "postpaid"
                    ? "Paylater"
                    : "Wallet",
                billingType: user.account.billingType,
                creditLimit: user.account.creditLimit,
                availableLimit: user.account.availableAmount,
                utilizedLimit:
                  user.account.billingType == "postpaid" &&
                    user.account.creditLimit &&
                    user.account.availableAmount
                    ? parseFloat(user.account.availableAmount) -
                    parseFloat(handlingCharge.toPayAmount)
                    : 0.0,
                transactionId: "",
                totalAmount: parseFloat(handlingCharge.toPayAmount).toFixed(2),
                taxableAmount: parseFloat(handlingCharge.taxableAmount).toFixed(
                  2
                ),
                orderId: "",
                status: "Completed",
              });
              let lastInserted = await Order.findOne({
                attributes: [[fn("max", col("MvikasDocketNo")), "mvdockcet"]],
                raw: true,
              });
              let orderCreated = await Order.create({
                vendorId: data.Lpid,
                vendorOldId: data.Lpid,
                PaymentId: paymentCreated.id,
                paymentStatus: "Completed",
                paymentMode:
                  user.account.billingType == "postpaid"
                    ? "Paylater"
                    : "Wallet",
                isPayLater: user.account.billingType == "postpaid" ? 1 : 0,
                Serviceid: getServiceList.id,
                Frompincode: data.Frompincode,
                Topincode: data.Topincode,
                Shipment_weight: parseFloat(data.shipmentWeight).toFixed(2),
                chargable_weight: handlingCharge.Shipment_weight,
                Shipment_value: data.shipmentAmount,
                Cft: parseFloat(handlingCharge.Cft).toFixed(2),
                Divisor: parseFloat(cargoRate.dividend).toFixed(2),
                IsCod: 0,
                rate:
                  parseFloat(vendorRate.rates) +
                  (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100,
                totalAdditionalAmount: parseFloat(
                  handlingCharge.totalAdditionalAmount
                ).toFixed(2),
                additionalCharges: JSON.stringify(
                  handlingCharge.additionalCharges
                ),
                VadditionalCharges: JSON.stringify(
                  handlingCharge.additionalCharges
                ),
                minFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                minODA: parseFloat(handlingCharge.minODA).toFixed(2),
                odaPerKG: parseFloat(handlingCharge.odaPerKG).toFixed(2),
                oda_amount: parseFloat(handlingCharge.oda_amount).toFixed(2),
                taxableAmount: parseFloat(handlingCharge.taxableAmount).toFixed(
                  2
                ),
                V_taxableAmount: parseFloat(
                  handlingCharge.taxableAmount
                ).toFixed(2),
                gst_Amount: parseFloat(handlingCharge.gst_Amount).toFixed(2),
                gst: parseFloat(cargoRate.GST).toFixed(2),
                V_gst_Amount: parseFloat(handlingCharge.V_gst_Amount).toFixed(
                  2
                ),
                totalAmount: parseFloat(handlingCharge.totalAmount).toFixed(2),
                V_totalAmount: parseFloat(handlingCharge.V_totalAmount).toFixed(
                  2
                ),
                isActive: 1,
                userId: user.id,
                Customername: user.name,
                OrderStatus: 1,
                iteminvoice: data.ItemInvoice ? data.ItemInvoice : "",
                Itemname: data.ItemName,
                LSPDocketNo: data.LSPDocket,
                ExpectedDelivery: moment()
                  .add(TAT, "days")
                  .format("ddd MMM DD, YYYY"),
                deliveryaddress: `${data.DeliveryAddressName}, ${data.DeliveryAddressLine}, ${data.DeliveryCity},${data.DeliveryState},${data.DeliveryPincode}`,
                deliverypersonname: data.DeliveryPersonName,
                deliverypersonmobile: data.DeliveryPersonContact,
                deliveryslot: "2:30 AM - 5:15 AM",
                pickuptime: "2:30 AM - 5:15 AM",
                Vdeliveryslot: "2:30 AM - 5:15 AM",
                Vpickuptime: "2:30 AM - 5:15 AM",
                Pickuppersonname: data.PickupPersonName,
                Pickuppersonmobile: data.PickupPersonContact,
                Pickupaddress: `${data.PickupAddressName}, ${data.PickupAddressLine}, ${data.PickupCity},${data.PickupState},${data.PickupPincode}`,
                returnaddress: `${data.ReturnAddressName}, ${data.ReturnAddressLine}, ${data.ReturnCity},${data.ReturnState},${data.ReturnPincode}`,
                MvikasDocketNo: `${lastInserted.mvdockcet.slice(0, 3)}${parseInt(
                  lastInserted.mvdockcet.slice(
                    3,
                    lastInserted.mvdockcet.length
                  )
                ) + 1
                  }`,
                EWayBillNo: data.EwayNo,
                ItemCategory: data.ItemCategory,
                ItemType: data.ItemType,
                OtherInfromation: data.OtherInfo,
                VMinChargableWeight: parseFloat(cargoRate.cwMin).toFixed(2),
                VMinFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                VMinODA: parseFloat(handlingCharge.VMinODA).toFixed(2),
                VOdaPerKG: parseFloat(handlingCharge.VOdaPerKG).toFixed(2),
                VOdaAmount: parseFloat(handlingCharge.VOdaAmount).toFixed(2),
                VGst: parseFloat(cargoRate.GST).toFixed(2),
                VRate: parseFloat(vendorRate.rates).toFixed(2),
                IsBulkUpload: true,
                VtotalAdditionalAmount: parseFloat(
                  handlingCharge.totalAdditionalAmount
                ).toFixed(2),
                invoiceNumber: new Date().getTime(),
                Vchargable_weight: finalShipmentWeight.toFixed(2),
              });
             console.log({orderCreated})
              let Order_id = "MV-B2B/" + orderCreated.id;
              await Order.update(
                {
                  Order_id: Order_id,
                  invoiceNumber: `B2B/${moment().format("YYYY")}/${orderCreated.id
                    }`,
                },
                {
                  where: {
                    id: orderCreated.id,
                  },
                }
              );
              let j = 1;
              for (let index = 0; index < data.items.length; index++) {
                let itemDimension = await OrderItemDimension.create({
                  Orderid: Order_id,
                  Length: data.items[index].L,
                  Height: data.items[index].H,
                  Breadth: data.items[index].B,
                  Volume_weight:
                    data.items[index].L *
                    data.items[index].B *
                    data.items[index].H *
                    data.items[index].boxes,
                  boxes: data.items[index].boxes,
                  Unit: data.items[index].unit,
                  Actual_Weight: data.items[index].boxWeight,
                });
                let orderItems = [];
                let orderItemStatus = [];
                for (let i = 0; i < data.items[index].boxes; i++) {
                  let item = {
                    Itemid: Order_id + "-" + j,
                    OrderdimId: itemDimension.id,
                    ItemStatus: 1,
                    Orderid: Order_id,
                    Length: data.items[index].L,
                    Height: data.items[index].H,
                    Breadth: data.items[index].B,
                    BarCode: null,
                    status: "Booked",
                  };
                  orderItems.push(item);
                  orderItemStatus.push({
                    ItemId: Order_id + "-" + j,
                    OrderId: Order_id,
                    userId: user.id,
                    StatusType: 1, //booked
                    status: 1,
                    ExcelRemarks: "Booked",
                  });
                  j = j + 1;
                }
                await OrderedItemsStatus.bulkCreate(orderItemStatus);
                await OrderItem.bulkCreate(orderItems);
              }
              if (user.account.billingType == "postpaid") {
                await UserAccountDetails.update(
                  {
                    availableAmount:
                      parseFloat(user.account.availableAmount) -
                      parseFloat(handlingCharge.totalAmount).toFixed(2),
                  },
                  {
                    where: {
                      userId: user.id,
                    },
                  }
                );
              }
              if (user.account.billingType == "prepaid") {
                let availableWalletAmount = user.account.availableWalletAmount
                  ? atob(user.account.availableWalletAmount)
                  : 0;
                await UserAccountDetails.update(
                  {
                    availableWalletAmount: btoa(
                      parseFloat(availableWalletAmount) -
                      parseFloat(finalAmount).toFixed(2)
                    ),
                  },
                  {
                    where: {
                      userId: user.id,
                    },
                  }
                );
              }
            }
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.log(error);
  }
}
async function calculateFinalPriceAndCreateOrderPerBox(orderData) {
  try {
    let data = "";
    data = orderData[0];
    data.items = orderData.map((item) => ({
      L: item.Length,
      B: item.Breadth,
      H: item.Height,
      boxes: item.NoOfBoxes,
      unit: item.Unit,
      boxWeight: item.Volume_weight,
    }));
    let items = data.items;
    data.shipmentAmount = orderData.reduce(
      (sum, item) => sum + item.Shipvalue,
      0
    );
    data.shipmentWeight = orderData.reduce(
      (sum, item) => sum + item.Volume_weight,
      0
    );
    data.boxes = orderData.reduce((sum, item) => sum + item.NoOfBoxes, 0);
    data.shipmentWeight =
      parseFloat(data.shipmentWeight) * parseFloat(data.boxes);
    let numberOfBoxes = items.reduce(
      (sum, item) => parseInt(sum) + parseInt(item.boxes),
      0
    );
    let shipmentAmount = data.shipmentAmount;
    let shipmentWeight = data.shipmentWeight;
    let finalShipmentWeight = 0;
    let finalNumberOfBox = numberOfBoxes;
    let user = await User.findOne({
      where: {
        email: data.UserEmail,
      },
      include: [
        {
          model: UserAccountDetails,
          as: "account",
        },
      ],
    });
    let markup = 0;
    let getServiceList = await Service.findOne({
      where: {
        userId: data.Lpid,
        isActive: true,
        id: data.ServiceId,
      },
      include: [
        {
          model: User,
          as: "Vendor",
        },
      ],
    });
    //get source pincode id
    let getSourcePincodeId = await Pincode.findOne({
      where: {
        pincode: data.Frompincode,
      },
    });
    //get destination pincode id
    let getDestinationPincodeId = await Pincode.findOne({
      where: {
        pincode: data.Topincode,
      },
    });

    if (user.account && user.account.markup) {
      markup = parseFloat(user.account.markup);
    } else {
      let vendorAccount = await UserAccountDetails.findOne({
        where: {
          userId: getServiceList.userId,
        },
      });
      markup =
        vendorAccount && vendorAccount.markup
          ? parseFloat(vendorAccount.markup)
          : 0;
    }
    if (!markup) {
      markup = 35;
    }
    if (getServiceList.Vendor?.isDummy) {
      markup = 0;
    }
    let checkSourcePincodeMapWithZone = await ZonePinMap.findOne({
      where: {
        pincodeId: getSourcePincodeId.id,
        vendorId: getServiceList.userId,
        isActive: true,
      },
    });
    let checkDestinationPincodeMapWithZone = await ZonePinMap.findOne({
      where: {
        pincodeId: getDestinationPincodeId.id,
        vendorId: getServiceList.userId,
        isActive: true,
      },
    });
    if (checkSourcePincodeMapWithZone && checkDestinationPincodeMapWithZone) {
      let getSourceService = await ZoneServiceMap.findOne({
        where: {
          zoneId: checkSourcePincodeMapWithZone.zoneId,
          zonePinId: checkSourcePincodeMapWithZone.pincodeId,
          vendorId: checkSourcePincodeMapWithZone.vendorId,
          serviceId: getServiceList.id,
          isActive: true,
          isODA: {
            [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
          },
        },
      });
      let getDestinationService = await ZoneServiceMap.findOne({
        where: {
          zoneId: checkDestinationPincodeMapWithZone.zoneId,
          zonePinId: checkDestinationPincodeMapWithZone.pincodeId,
          vendorId: checkDestinationPincodeMapWithZone.vendorId,
          serviceId: getServiceList.id,
          isActive: true,
          isODA: {
            [Op.in]: ["serviceable", "ODA1", "ODA2", "ODA3"],
          },
        },
      });
      if (getSourceService && getDestinationService) {
        let zoneInODA = false;
        let odaType = ["ODA1", "ODA2", "ODA3"];
        let ODA1 = false;
        let ODA2 = false;
        let ODA3 = false;
        let ODA11 = false;
        let ODA22 = false;
        let ODA33 = false;
        if (
          odaType.includes(getSourceService.isODA) ||
          odaType.includes(getDestinationService.isODA)
        )
          zoneInODA = true;
        if (getSourceService.isODA == "ODA1") ODA1 = true;
        if (getSourceService.isODA == "ODA2") ODA2 = true;
        if (getSourceService.isODA == "ODA3") ODA3 = true;
        if (getDestinationService.isODA == "ODA1") ODA11 = true;
        if (getDestinationService.isODA == "ODA2") ODA22 = true;
        if (getDestinationService.isODA == "ODA3") ODA33 = true;
        let tatParams = {
          zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
          zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
          vendorId: getServiceList.userId,
          serviceId: getServiceList.id,
        };
        if (zoneInODA) {
          tatParams = Object.assign(tatParams, {
            ODATAT: {
              [Op.ne]: null,
            },
          });
        } else {
          tatParams = Object.assign(tatParams, {
            STDTAT: {
              [Op.ne]: null,
            },
          });
        }
        // console.log(tatParams);
        let tat = await OdaTat.findOne({
          where: tatParams,
        });
        if (tat) {
          let TAT =
            zoneInODA && tat.ODATAT
              ? parseInt(tat.ODATAT)
              : parseInt(tat.STDTAT);
          let cargoRate = await CargoRate.findOne({
            where: {
              serviceId: getServiceList.id,
              vendorId: getServiceList.userId,
              rateType: 2,
            },
          });

          if (cargoRate) {
            let vendorRate = await VendorRate.findOne({
              where: {
                cargoId: cargoRate.id,
                zoneIdFrom: checkSourcePincodeMapWithZone.zoneId,
                zoneIdTo: checkDestinationPincodeMapWithZone.zoneId,
                rateType: 2,
              },
            });
            if (parseFloat(finalNumberOfBox) <= parseFloat(cargoRate.cwMax)) {
              finalNumberOfBox =
                parseFloat(cargoRate.cwMin) > parseFloat(finalNumberOfBox)
                  ? parseFloat(cargoRate.cwMin)
                  : parseFloat(finalNumberOfBox);
              let rateWithMarkup =
                parseFloat(vendorRate.rates) +
                (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100;
              let baseFreight = finalNumberOfBox * rateWithMarkup;
              baseFreight =
                parseFloat(cargoRate.minFreight) >
                  finalNumberOfBox * rateWithMarkup
                  ? parseFloat(cargoRate.minFreight) +
                  parseFloat(
                    (parseFloat(cargoRate.minFreight) * markup) / 100
                  )
                  : finalNumberOfBox * rateWithMarkup;
              // let amountWithMarkup = baseFreight + ((baseFreight * markup) / 100)
              let odaMin = 0;
              let odaperkg = 0;
              let odaAmount = 0;
              if (ODA1) {
                odaMin = cargoRate.ODA1MinRate
                  ? parseFloat(cargoRate.ODA1MinRate)
                  : 0;
                odaperkg = cargoRate.ODA1PerKg
                  ? parseFloat(cargoRate.ODA1PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
                    : odaMin;
              }
              if (ODA2) {
                odaMin = cargoRate.ODA2MinRate
                  ? parseFloat(cargoRate.ODA2MinRate)
                  : 0;
                odaperkg = cargoRate.ODA2PerKg
                  ? parseFloat(cargoRate.ODA2PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
                    : odaMin;
              }
              if (ODA3) {
                odaMin = cargoRate.ODA3MinRate
                  ? parseFloat(cargoRate.ODA3MinRate)
                  : 0;
                odaperkg = cargoRate.ODA3PerKg
                  ? parseFloat(cargoRate.ODA3PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
                    : odaMin;
              }
              if (ODA11) {
                odaMin = cargoRate.ODA1MinRate
                  ? parseFloat(cargoRate.ODA1MinRate)
                  : 0;
                odaperkg = cargoRate.ODA1PerKg
                  ? parseFloat(cargoRate.ODA1PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
                    : odaMin;
              }
              if (ODA22) {
                odaMin = cargoRate.ODA2MinRate
                  ? parseFloat(cargoRate.ODA2MinRate)
                  : 0;
                odaperkg = cargoRate.ODA2PerKg
                  ? parseFloat(cargoRate.ODA2PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
                    : odaMin;
              }
              if (ODA33) {
                odaMin = cargoRate.ODA3MinRate
                  ? parseFloat(cargoRate.ODA3MinRate)
                  : 0;
                odaperkg = cargoRate.ODA3PerKg
                  ? parseFloat(cargoRate.ODA3PerKg)
                  : 0;
                odaAmount +=
                  finalNumberOfBox * odaperkg > odaMin
                    ? finalNumberOfBox * odaperkg
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
                      let unitBasedAmount =
                        await CalculativeHelper.calulateUnitBased(
                          additionalCharge[j],
                          finalShipmentWeight,
                          items
                        );
                      if (unitBasedAmount) {
                        calculatedadditionalCharge[
                          additionalCharge[j].labelText
                        ] = unitBasedAmount ? unitBasedAmount : 0;
                      }
                    } else if (additionalCharge[j].chargesType == 2) {
                      let slabBasedAmount =
                        await CalculativeHelper.calulateSlabBased(
                          additionalCharge[j],
                          finalShipmentWeight,
                          items
                        );

                      if (slabBasedAmount) {
                        calculatedadditionalCharge[
                          additionalCharge[j].labelText
                        ] = parseFloat(slabBasedAmount).toFixed(2);
                      }
                    } else if (
                      additionalCharge[j].chargesType == 3 &&
                      !additionalCharge[j].minValue &&
                      !additionalCharge[j]?.hasDepedancyData?.length
                    ) {
                      calculatedadditionalCharge[
                        additionalCharge[j].labelText
                      ] = parseFloat(
                        additionalCharge[j].amount
                          ? additionalCharge[j].amount
                          : 0
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
                      calculatedadditionalCharge[
                        additionalCharge[j].labelText
                      ] = parseFloat(amount).toFixed(2);
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
                      additionalCharge[j]?.hasDepedancyData?.length > 1
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
                        charge.minValue &&
                          Number(charge.minValue) > Number(amount)
                          ? Number(charge.minValue)
                          : Number(amount);
                      if (
                        calculatedadditionalCharge.hasOwnProperty(
                          additionalCharge[j].labelText
                        )
                      ) {
                        calculatedadditionalCharge[
                          additionalCharge[j].labelText
                        ] = parseFloat(amount).toFixed(2);
                      }
                    }
                  }
                }
              }
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
              let totalTaxableAmount =
                baseFreight + totalAdditionalAmount + odaAmount;
              let gst = (totalTaxableAmount * cargoRate.GST) / 100;
              let finalAmount = totalTaxableAmount + gst;
              let paymentCreated = await Payment.create({
                userId: user.id,
                vendorId: data.Lpid,
                vendorOldId: data.Lpid,
                paymentType:
                  user.account.billingType == "postpaid"
                    ? "Paylater"
                    : "Wallet",
                billingType: user.account.billingType,
                creditLimit: user.account.creditLimit,
                availableLimit: user.account.availableAmount,
                utilizedLimit:
                  user.account.billingType == "postpaid" &&
                    user.account.creditLimit &&
                    user.account.availableAmount
                    ? parseFloat(user.account.availableAmount) -
                    parseFloat(finalAmount)
                    : 0.0,
                transactionId: "",
                totalAmount: parseFloat(finalAmount).toFixed(2),
                taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                orderId: "",
                status: "Completed",
              });
              let lastInserted = await Order.findOne({
                attributes: [[fn("max", col("MvikasDocketNo")), "mvdockcet"]],
                raw: true,
              });
              let orderCreated = await Order.create({
                vendorId: data.Lpid,
                vendorOldId: data.Lpid,
                PaymentId: paymentCreated.id,
                paymentStatus: "Completed",
                paymentMode:
                  user.account.billingType == "postpaid"
                    ? "Paylater"
                    : "Wallet",
                isPayLater: user.account.billingType == "postpaid" ? 1 : 0,
                Serviceid: getServiceList.id,
                Frompincode: data.Frompincode,
                Topincode: data.Topincode,
                Shipment_weight: parseFloat(data.shipmentWeight).toFixed(2),
                chargable_weight: finalShipmentWeight
                  ? parseFloat(finalShipmentWeight).toFixed(2)
                  : finalNumberOfBox,
                Shipment_value: data.shipmentAmount,
                Cft: 0,
                Divisor: 0,
                IsCod: 0,
                rate:
                  parseFloat(vendorRate.rates) +
                  (parseFloat(vendorRate.rates) * parseFloat(markup)) / 100,
                totalAdditionalAmount: parseFloat(
                  totalAdditionalAmount
                ).toFixed(2),
                additionalCharges: JSON.stringify(calculatedadditionalCharge),
                VadditionalCharges: JSON.stringify(calculatedadditionalCharge),
                minFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                minODA: parseFloat(odaMin).toFixed(2),
                odaPerKG: parseFloat(odaperkg).toFixed(2),
                oda_amount: parseFloat(odaAmount).toFixed(2),
                taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                V_taxableAmount: parseFloat(totalTaxableAmount).toFixed(2),
                gst_Amount: parseFloat(gst).toFixed(2),
                gst: parseFloat(cargoRate.GST).toFixed(2),
                V_gst_Amount: parseFloat(gst).toFixed(2),
                totalAmount: parseFloat(finalAmount).toFixed(2),
                V_totalAmount: parseFloat(finalAmount).toFixed(2),
                isActive: 1,
                userId: user.id,
                Customername: user.name,
                OrderStatus: 1,
                iteminvoice: data.ItemInvoice ? data.ItemInvoice : "",
                Itemname: data.ItemName,
                LSPDocketNo: data.LSPDocket,
                ExpectedDelivery: moment()
                  .add(TAT, "days")
                  .format("ddd MMM DD, YYYY"),
                deliveryaddress: `${data.DeliveryAddressName}, ${data.DeliveryAddressLine}, ${data.DeliveryCity},${data.DeliveryState},${data.DeliveryPincode}`,
                deliverypersonname: data.DeliveryPersonName,
                deliverypersonmobile: data.DeliveryPersonContact,
                deliveryslot: "2:30 AM - 5:15 AM",
                pickuptime: "2:30 AM - 5:15 AM",
                Vdeliveryslot: "2:30 AM - 5:15 AM",
                Vpickuptime: "2:30 AM - 5:15 AM",
                Pickuppersonname: data.PickupPersonName,
                Pickuppersonmobile: data.PickupPersonContact,
                Pickupaddress: `${data.PickupAddressName}, ${data.PickupAddressLine}, ${data.PickupCity},${data.PickupState},${data.PickupPincode}`,
                returnaddress: `${data.ReturnAddressName}, ${data.ReturnAddressLine}, ${data.ReturnCity},${data.ReturnState},${data.ReturnPincode}`,
                MvikasDocketNo: `${lastInserted.mvdockcet.slice(0, 3)}${parseInt(
                  lastInserted.mvdockcet.slice(
                    3,
                    lastInserted.mvdockcet.length
                  )
                ) + 1
                  }`,
                EWayBillNo: data.EwayNo,
                ItemCategory: data.ItemCategory,
                ItemType: data.ItemType,
                OtherInfromation: data.OtherInfo,
                VMinChargableWeight: parseFloat(cargoRate.cwMin).toFixed(2),
                VMinFreight: parseFloat(cargoRate.minFreight).toFixed(2),
                VMinODA: parseFloat(odaMin).toFixed(2),
                VOdaPerKG: parseFloat(odaperkg).toFixed(2),
                VOdaAmount: parseFloat(odaAmount).toFixed(2),
                VGst: parseFloat(cargoRate.GST).toFixed(2),
                VRate: parseFloat(vendorRate.rates).toFixed(2),
                IsBulkUpload: true,
                VtotalAdditionalAmount: parseFloat(
                  totalAdditionalAmount
                ).toFixed(2),
                invoiceNumber: new Date().getTime(),
                Vchargable_weight: finalShipmentWeight
                  ? parseFloat(finalShipmentWeight).toFixed(2)
                  : finalNumberOfBox,
                rateType: 2,
              });

              let Order_id = "MV-B2B/" + orderCreated.id;
              await Order.update(
                {
                  Order_id: Order_id,
                  invoiceNumber: `B2B/${moment().format("YYYY")}/${orderCreated.id
                    }`,
                },
                {
                  where: {
                    id: orderCreated.id,
                  },
                }
              );
              let j = 1;
              for (let index = 0; index < data.items.length; index++) {
                let itemDimension = await OrderItemDimension.create({
                  Orderid: Order_id,
                  Length: data.items[index].L,
                  Height: data.items[index].H,
                  Breadth: data.items[index].B,
                  Volume_weight:
                    data.items[index].L *
                    data.items[index].B *
                    data.items[index].H *
                    data.items[index].boxes,
                  boxes: data.items[index].boxes,
                  Unit: data.items[index].unit,
                  Actual_Weight: data.items[index].boxWeight,
                });
                let orderItems = [];
                let orderItemStatus = [];
                for (let i = 0; i < data.items[index].boxes; i++) {
                  let item = {
                    Itemid: Order_id + "-" + j,
                    OrderdimId: itemDimension.id,
                    ItemStatus: 1,
                    Orderid: Order_id,
                    Length: data.items[index].L,
                    Height: data.items[index].H,
                    Breadth: data.items[index].B,
                    BarCode: null,
                    status: "Booked",
                  };
                  orderItems.push(item);
                  orderItemStatus.push({
                    ItemId: Order_id + "-" + j,
                    OrderId: Order_id,
                    userId: user.id,
                    StatusType: 1, //booked
                    status: 1,
                    ExcelRemarks: "Booked",
                  });
                  j = j + 1;
                }
                await OrderedItemsStatus.bulkCreate(orderItemStatus);
                await OrderItem.bulkCreate(orderItems);
              }
              if (user.account.billingType == "postpaid") {
                await UserAccountDetails.update(
                  {
                    availableAmount:
                      parseFloat(user.account.availableAmount) -
                      parseFloat(finalAmount).toFixed(2),
                  },
                  {
                    where: {
                      userId: user.id,
                    },
                  }
                );
              }
              if (user.account.billingType == "prepaid") {
                let availableWalletAmount = user.account.availableWalletAmount
                  ? atob(user.account.availableWalletAmount)
                  : 0;
                await UserAccountDetails.update(
                  {
                    availableWalletAmount: btoa(
                      parseFloat(availableWalletAmount) -
                      parseFloat(finalAmount).toFixed(2)
                    ),
                  },
                  {
                    where: {
                      userId: user.id,
                    },
                  }
                );
              }
            }
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.log(error);
  }
}
