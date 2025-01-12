const db = require("../../models");
const { failed, response } = require("./response");
const OrderItemVendor = db.CrmOrderItemVendor;
const Vendor = db.CrmVendor;
const CrmAllCustomer = db.CrmAllCustomer;
const OrderItem = db.CrmOrderItems;
const Product = db.crmProduct;
const CrmMake = db.CrmMake;
const PaymentTerm = db.CrmPaymentTerm;
const moment = require("moment");

// Helper function to create lead data
exports.createLeadData = async (body, userId, workspaceId) => {
  return {
    customer_id: body.customerId ?? null,
    created_by_id: userId ?? null,
    workspace_id: workspaceId ?? null,
    telesale_id: body.telesale_id ? parseInt(body.telesale_id) : null,
    name: body.name ?? null,
    email: body.email ?? null,
    phone: body.contactno ?? null,
    gst_tin: body.gstIn ?? null,
    company_name: body.companyName ?? null,
    purchase_officer_name: body.purchaseOfficerName ?? null,
    purchase_officer_phone: body.purchaseOfficerNo ?? null,
    lead_source: body.leadSource ?? null,
    address: body.registeredAddress ?? null,
    state_id: body.customerState ?? null,
    city_id: body.customerCity ?? null,
    pincode: body.customerPincode ?? null,
    shipping_address: body.shipAddress ?? null,
    shipping_state_id: body.shipState ?? null,
    shipping_city_id: body.shipCity ?? null,
    shipping_pincode: body.shippingPincode ?? null,
    estimated_order_value: body.estimateLeadOrderValue ?? null,
    lead_priority: body.leadPriority ?? null,
    sales_remarks: body.salesRemarkForLead ?? null,
    destination_frieght_cost: body.freightCostTillDestination ?? null,
    vehicle_capacity: body.vehicleCapcity ?? null,
    scm_remarks: body.scmRemarkForLead ?? null,
  };
};
//Create new order
exports.prepareOrderData = async (
  orderItems,
  leadId,
  workspaceId,
  type,
  dispatchIsPlanning
) => {
  // Ensure orderItems is an array, if not parse it as JSON
  let requestData;
  try {
    requestData = Array.isArray(orderItems)
      ? orderItems
      : JSON.parse(orderItems);
  } catch (error) {
    console.error("Invalid orderItems format:", error);
    throw new Error("Invalid orderItems data format.");
  }

  // Normalize requestData into an array if it's not already
  const normalizedOrderItems = Array.isArray(requestData)
    ? requestData
    : [requestData];
  const currentYear = moment().format("YYYY");

  // Function to generate a new PoSeries
  const generateNewPoSeries = async () => {
    const lastDispatch = await OrderItem.findOne({
      where: { itemable_type: "dispatch" },
      order: [["id", "desc"]],
    });

    let newSequenceNumber = "001";
    if (lastDispatch && lastDispatch.poSeries) {
      const lastSequenceNumber = parseInt(
        lastDispatch.poSeries.split("-")[2],
        10
      );
      newSequenceNumber = String(lastSequenceNumber + 1).padStart(3, "0");
    }
    return `PO-${currentYear}-${newSequenceNumber}`;
  };

  let orderData = [];

  for (let i = 0; i < normalizedOrderItems.length; i++) {
    const orderItem = normalizedOrderItems[i].orderDetails;
    const vendorDetails = normalizedOrderItems[i].vendorDetails;
    // console.log("++++++++++++++++++++", orderItem);

    // Fetch the Make and Product details
    const make = await CrmMake.findOne({ where: { id: orderItem.makeId } });
    const product = await Product.findOne({
      where: { id: orderItem.productId },
    });
    // Check if Make and Product exist before accessing properties
    // console.log({ product });
    // if (!product) {
    //   return {
    //     success: false,
    //     message: `Product with id ${orderItem.productId} not found.`,
    //   };
    // }
    if (make && product) {
      // Create the OrderItem
      console.log("============", type);
      console.log("dispatchIsPlanning", dispatchIsPlanning);
      // Reuse existing PoSeries for the same vendorId and itemable_id
      let existingPoSeries = null;
      const existingRecord = await OrderItem.findOne({
        where: {
          vendorId: orderItem.vendorId,
          // itemable_id: leadId, 
          itemable_type: "dispatch",
        },
      });
     
      if (existingRecord) {
        existingPoSeries = existingRecord.poSeries;
      } else {
        existingPoSeries = await generateNewPoSeries();
      }
      const createdOrderItem = await OrderItem.create({
        itemable_type: type,
        itemable_id: leadId,
        product_id: orderItem.productId,
        name: product.name,
        make_id: orderItem.makeId,
        hsn: orderItem.hsn,
        make: make.name,
        quantity: orderItem.quantity,
        unit_type_id: orderItem.unit_type_id,
        price: orderItem.salesPrice,
        tat: orderItem.customerTat ? orderItem.customerTat : orderItem.salesTat,
        sales_tat: orderItem.salesTat,
        dispatch_tat: orderItem.dispatchTat,
        sales_price_range: orderItem.customerPriceTarget,
        gst_rate: orderItem.gst_rate,
        // itemable_type: orderItem.type,
        remark: orderItem.remark,
        sales_remarks: orderItem.salesRemark,
        scm_remarks: orderItem.scmRemark,
        length: orderItem.length ? orderItem.length : 0,
        width: orderItem.width ? orderItem.width : 0,
        grade: orderItem.grade ? orderItem.grade : 0,
        thickness: orderItem.thickness ? orderItem.thickness : 0,
        dia: orderItem.dia ? orderItem.dia : 0,
        billing_address: orderItem.billing_address,
        comment: orderItem.comment,
        vendorId: orderItem.vendorId,
        item_attributes: orderItem.item_attributes,
        varientId: orderItem.varientId,
        varientName: orderItem.varientName,
        dispatchIsPlanning: dispatchIsPlanning || 0,
        poSeries: existingPoSeries,
        itemId: orderItem.itemId,
        label:orderItem.label
      });

      orderData.push(createdOrderItem); // Collect created OrderItems
      if (vendorDetails) {
        // Save vendor details to Vendor model
        for (let j = 0; j < vendorDetails.length; j++) {
          const vendorDetail = vendorDetails[j];
          let createdVendor = null;

          if (vendorDetail.vendorId) {
            const vendorData = await CrmAllCustomer.findOne({
              where: { id: vendorDetail.vendorId },
            });
            //paymet term data
            const paymetTerm = await PaymentTerm.findOne({
              where: { id: vendorDetail.payment_term_id },
            });
            if (vendorData) {
              // const existingVendor = await Vendor.findOne({
              //   where: {
              //     lead_id: leadId,
              //     assign_vendor_id: vendorDetail.vendorId,
              //     product_id: orderItem.productId,
              //   },
              // });

              // if (existingVendor) {
              //   await Vendor.destroy({
              //     where: {
              //       id: existingVendor.id,
              //       product_id: orderItem.productId,
              //     },
              //   });
              // }

              createdVendor = await Vendor.create({
                workspaceId: workspaceId,
                assign_vendor_id: vendorDetail.vendorId,
                name: vendorData.name,
                address: vendorData.customerAddress,
                payment_term_id: vendorDetail.payment_term_id,
                payment_term_text: vendorDetail.payment_term_text
                  ? vendorDetail.payment_term_text
                  : paymetTerm.name,
                pickup_address: vendorDetail.pickup_address,
                quantity: vendorDetail.quantity,
                email: vendorData.email,
                contact_name: vendorData.name,
                contact_number: vendorData.mobile,
                gst_tin: vendorData.gst_tin,
                price: vendorDetail.price,
                lead_id: leadId,
                product_id: orderItem.productId,
                unit_id: vendorDetail.unitId,
                movement: vendorDetail.movement,
                freight_details: vendorDetail.freightDetails,
                scm_tat: vendorDetail.scmTat,
                delivery_date: vendorDetail.deliveryDate,
                remark: vendorDetail.remark,
              });
            }
          }

          if (createdVendor) {
            await OrderItemVendor.create({
              order_item_id: createdOrderItem.id,
              vendor_id: createdVendor.id,
            });
          }
        }
      }
    } else {
      console.error(
        `Make or Product not found for orderItem: ${JSON.stringify(orderItem)}`
      );
    }
  }

  return orderData;
};
//update order
exports.updatePrepareOrderData = async (
  orderItems,
  leadId,
  workspaceId,
  type,
  item_attributes
) => {
  console.log("++++++++++++++++++++", orderItems);

  // Ensure orderItems is an array, if not parse it as JSON
  let requestData;
  try {
    requestData = Array.isArray(orderItems)
      ? orderItems
      : JSON.parse(orderItems);
  } catch (error) {
    console.error("Invalid orderItems format:", error);
    throw new Error("Invalid orderItems data format.");
  }

  // Normalize requestData into an array if it's not already
  const normalizedOrderItems = Array.isArray(requestData)
    ? requestData
    : [requestData];

  let orderData = [];

  for (let i = 0; i < normalizedOrderItems.length; i++) {
    
    const orderItem = normalizedOrderItems[i].orderDetails;
    const vendorDetails = normalizedOrderItems[i].vendorDetails;

    // Fetch the Make and Product details
    const make = await CrmMake.findOne({ where: { id: orderItem.makeId } });
    const product = await Product.findOne({
      where: { id: orderItem.productId },
    });
    // Check if Make and Product exist before accessing properties
    // console.log("+++++++++++++++++++++++++++++++", make);
    // console.log("))))))))))))))))))++++++++", product);

    if (make && product) {
      // Create the OrderItem
      const createdOrderItem = await OrderItem.create({
        itemable_type: type,
        itemable_id: leadId,
        product_id: orderItem.productId,
        name: product.name,
        make_id: orderItem.makeId,
        hsn: orderItem.hsn,
        make: make.name,
        quantity: orderItem.quantity,
        unit_type_id: orderItem.unit_type_id,
        price: orderItem.salesPrice,
        tat: orderItem.salesTat,
        salesTat: orderItem.salesTat,
        dispatchTat: orderItem.dispatchTat,
        sales_price_range: orderItem.customerPriceTarget,
        gst_rate: orderItem.gst_rate,
        // itemable_type: orderItem.type,
        remark: orderItem.remark,
        sales_remarks: orderItem.salesRemark,
        scm_remarks: orderItem.scmRemark,
        length: orderItem.length ? orderItem.length : 0,
        width: orderItem.width ? orderItem.width : 0,
        grade: orderItem.grade ? orderItem.grade : 0,
        thickness: orderItem.thickness ? orderItem.thickness : 0,
        dia: orderItem.dia ? orderItem.dia : 0,
        billing_address: orderItem.billing_address,
        comment: orderItem.comment,
        vendorId: orderItem.vendorId,
        item_attributes: orderItem.item_attributes,
        varientId: orderItem.varientId,
        varientName: orderItem.varientName,
      });

      orderData.push(createdOrderItem); // Collect created OrderItems
      if (vendorDetails) {
        // Save vendor details to Vendor model
        for (let j = 0; j < vendorDetails.length; j++) {
          const vendorDetail = vendorDetails[j];
          let createdVendor = null;
          //paymet term data

          if (vendorDetail.vendorId) {
            const vendorData = await CrmAllCustomer.findOne({
              where: { id: vendorDetail.vendorId },
            });
            const paymetTerm = await PaymentTerm.findOne({
              where: { id: vendorDetail.payment_term_id },
            });
            if (vendorData) {
              const existingVendor = await Vendor.findOne({
                where: {
                  lead_id: leadId,
                  assign_vendor_id: vendorDetail.vendorId,
                  product_id: orderItem.productId,
                  pickup_address: vendorDetail.pickup_address,
                },
              });

              if (existingVendor) {
                await Vendor.destroy({
                  where: {
                    id: existingVendor.id,
                    product_id: orderItem.productId,
                  },
                });
              }

              createdVendor = await Vendor.create({
                workspaceId: workspaceId,
                assign_vendor_id: vendorDetail.vendorId,
                name: vendorData.name,
                address: vendorData.customerAddress,
                payment_term_id: vendorDetail.payment_term_id,
                payment_term_text: vendorDetail.payment_term_text
                  ? vendorDetail.payment_term_text
                  : paymetTerm.name,
                pickup_address: vendorDetail.pickup_address,
                quantity: vendorDetail.quantity,
                email: vendorData.email,
                contact_name: vendorData.name,
                contact_number: vendorData.mobile,
                gst_tin: vendorData.gst_tin,
                price: vendorDetail.price,
                lead_id: leadId,
                product_id: orderItem.productId,
                unit_id: vendorDetail.unitId,
                movement: vendorDetail.movement,
                freight_details: vendorDetail.freightDetails,
                scm_tat: vendorDetail.scmTat,
                delivery_date: vendorDetail.deliveryDate,
                remark: vendorDetail.remark,
              });
            }
          }

          if (createdVendor) {
            await OrderItemVendor.create({
              order_item_id: createdOrderItem.id,
              vendor_id: createdVendor.id,
            });
          }
        }
      }
    } else {
      console.error(
        `Make or Product not found for orderItem: ${JSON.stringify(orderItem)}`
      );
    }
  }

  return orderData;
};
// Your updateLead function remains the same except for the adjusted prepareOrderData
// Helper function to handle document uploads
exports.handleDocuments = async (
  documents,
  userId,
  leadId,
  department,
  type
) => {
  console.log({ documents });

  // Ensure orderItems is an array, if not parse it as JSON
  const requestData = Array.isArray(documents)
    ? documents
    : JSON.parse(documents);
  // Normalize requestData into an array if it's not already
  const normalizedDocuments = Array.isArray(requestData)
    ? requestData
    : [requestData];
  let documentArray = [];

  for (let i = 0; i < normalizedDocuments.length; i++) {
    const element = normalizedDocuments[i];
    let companyLogo = null;
    // if (files && files[i]) {
    //   const fileUpload = await aws(files[i], awscompanyLogo);
    //   companyLogo = fileUpload.Location;
    // }

    documentArray.push({
      userId,
      documentTypeId: element.document_type_id,
      documentable_type: type,
      documentable_id: leadId,
      fileName: element.fileName,
      path: element.companyLogo,
      department,
      comment: element.comment,
      status: element.status,
    });
  }

  return documentArray;
};
// // Helper function to prepare MRS lead data
exports.prepareMrsLeadData = async (body, leadId) => {
  // Helper function to validate date
  const validateDate = (date) => {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  // Helper function to validate number
  const validateNumber = (num) => {
    const parsedNumber = parseFloat(num);
    return isNaN(parsedNumber) ? 0 : parsedNumber;
  };

  return {
    lead_id: leadId,
    customer_designation: body.customer_designation ?? null,
    customer_department: body.customer_department ?? null,
    model_no: body.model_no ?? null,
    job_no: body.job_no ?? null,
    requirement: body.remark ?? null,
    date_formal_enquiry_received: validateDate(
      body.date_formal_enquiry_received
    ), // Date validation
    competitor_details: body.competitor_details ?? null,
    setup_for_3_quotes: body.setup_for_3_quotes ?? null,
    offer_received_date: validateDate(body.offer_received_date), // Date validation
    offer_submitted_client: body.offer_submitted_client,
    date_of_budgetary_submission: validateDate(
      body.date_of_budgetary_submission
    ), // Date validation
    budgetary_quote_price: validateNumber(body.budgetary_quote_price), // Number validation
    source_of_firm_enquiry: body.source_of_firm_enquiry ?? null,
    enquiry_date: validateDate(body.enquiry_date), // Date validation
    firm_enquiry_due_date: validateDate(body.firm_enquiry_due_date), // Date validation
    firm_enquiry_submission_date: validateDate(
      body.firm_enquiry_submission_date
    ), // Date validation
    final_price_submission: validateNumber(body.final_price_submission), // Number validation
    firm_enquiry_participated_by: body.firm_enquiry_participated_by ?? null,
    reverse_auction: body.reverse_auction ?? null,
    purchase_order: body.purchase_order ?? null,
    remarks: body.remarks ?? null,
  };
};
