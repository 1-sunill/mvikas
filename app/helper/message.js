const {
  Query
} = require("typeorm/driver/Query.js");

const USER_CONSTANTS = {
  INVALID_CURRENT_PASSWORD: "Current password is incorrect.",
  TOKEN_EXPIRE: "Reset token has expired. Please request a new one.",
  TOKEN_NOT_PRESET: "Invalid token",
  USER_BLOCK_INACTIVE: "Your account has been blocked by admin",
  STATUS_NOT_ROVIDED: "please provide status.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  INVALID_PASSWORD: "Invalid password.",
  ACCOUNT_UPDATE_SUCCESS: "Account updated successfully.",
  ACCOUNT_FETCH_SUCCESS: "Account fetch successfully.",
  INVALID_PASSWORD: "Invalid email or password.",
  USER_FOUND: "User details fetched successfully.",
  USER_VERIFY: "User details fetched successfully.",
  OTP_NOT_FOUND: "Otp data not found",
  PASSWORD_NOT_FOUND: "Password not found.",
  USERNAME_TAKEN: "Username already taken.",
  USER_INACTIVE: "User is not Active",
  INVALID_PASSWORD: "Invalid password.",
  USER_NOT_FOUND: "User not found.",
  USER_UPDATED: "User updated successfully.",
  USER_UPDATED_ERROR: "Failed to updated user.",
  EMAIL_ALREADY_EXISTS: "Email already registered.",
  ERROR_VALID_EMAIL: "Please enter valid email.",
  MOBILE_EMAIL_ALREADY_EXISTS: "Email or mobile already registered.",
  MOBILE_ALREADY_EXISTS: "Phone no. is already registered.",
  USERNAME_ALREADY_EXISTS: "User already exists",
  ALREADY_EXISTS: "Data already exists",
  LOGGED_IN: "Logged in successfully.",
  REGISTERED_SUCCESSFULLY: "Your account has been successfully created.",
  DELETED_USER: "User deleted successfully.",
  DELETED_LISTENER: "Listener deleted successfully.",
  DELETED_SPEAKER: "Speaker deleted successfully.",
  PASSWORD_RESET_SUCCESS: "Password resetted successfully.",
  VERIFICATION_SUCCESS: "Your details have been verified succesfully.",
  INVALID_USER: "User not found.",
  INVALID_REFERRAL_CODE: "Referral code is Invalid/Expired.",
  USER_ALREADY_EXISTS: "User already exist.",
  ADDED_LISTENER: "Listener added successfully.",
  ADDED_SPEAKER: "Speaker added successfully.",
  MULTI_LOGIN: "Multiple login not allowed.",
  DATA_FETCHED: "Data fetched successfully.",
  KAM_FETCHED: "KAM fetched successfully.",
  KAM_ASSINGED: "KAM Assigned successfully.",
  VENDOR_ASSIGNED: "Vendor Assigned successfully.",
};


const CHARGES_CONSTANT = {
  CHARGE_CREATED: "Additional charges created sucessfully.",
  CHARGE_UPDATED: "Additional charges updated sucessfully.",
  CHARGE_FETCH: "Additional charges fetched sucessfully.",
  CHARGE_ALREADY_EXIST: "Additional charges already exist.",
  RATE_ALREADY_EXIST: "Cargo rate already exist.",
  CHARGE_NOT_EXIST: "Additional charges does not exist.",
  CALCULATIVE_REQUIRED: "Calculative data required.",
  CARGO_CREATED: "Cargo rates created successfully.",
  CARGO_FETCHED: "Cargo rates fetched successfully."
}

const ADMIN_CONSTANTS = {
  APPLICATION_UPDATED: "Application updated successfully.",
  VENDOR_DELETE_SUCCESS: "Vendor deleted successfully.",
  VENDOR_INACTIVE: "endor In active successfully.",
  DATA_UPDATED: "Data updated successfully.",
  DATA_ADDED: "Data added successfully.",
  ORDER_REFUNDED_SUCCESSFULLY: "Order refunded successfully.",
  REFUND_FAILED: "Order refund failed, Please try after some time.",
  EMAIL_ALREADY_EXISTS: "Email already registered",
  NOT_FOUND: "User not found.",
  DELETED: "User deleted successfully.",
  PASSWORD_SENT_TO_EMAIL: "New password has been sent to your registered email.",
  INVALID_CREDENTIALS: "Invalid username or password.",
  INVALID_PASSWORD: "Login failed. Try again with correct details.",
  LOGGED_IN: "Logged in successfully",
  INVALID_ADMIN: "Admin not found",
  USER_FETCHED: "User Data fetched Succesfully"
};

const MIDDLEWARE_AUTH_CONSTANTS = {
  ACCESS_DENIED: "Access denied. No authorization token provided",
  RESOURCE_FORBIDDEN: "You don't have access to the request resource.",
  INVALID_AUTH_TOKEN: "Invalid token",
};
const ADDRESS_CONSTANTS = {
  ADDRESS_CREATE: "Address added Succesfully.",
  ADDRESS_FETCH: "Address details get Succesfully.",
  ADDRESS_UPDATE: "Address details updated Succesfully.",
  ADDRESS_NOT_FOUND: "Address details not found.",
  ADDRESS_DELETED: "Address details deleted Succesfully.",
  INVALID_AUTH_TOKEN: "Invalid token",
};

const AUTH_CONSTANTS = {
  INVALID_USER: "INVALID_USER",
  INVALID_CREDENTIALS: "Your credentials are incorrect, Try again",
  INVALID_PASSWORD: "You have entered incorrect password. Please try again with valid password.",
  CHANGE_PASSWORD_REQUEST_SUCCESS: "Password recovery link has been sent to your registered email.",
  CHANGE_PASSWORD_REQUEST_EMAIL_FAILURE: "Email sending failed due to some application issue.",
  INVALID_EMAIL: "The email provided is not registered. Please sign up to continue.",
  INVALID_RECOVERY_LINK: "Password link expired or not valid.",
  PASSWORD_CHANGE_SUCCESS: "Password changed successfully",
  INVALID_OTP: "Invalid OTP passed",
  SEND_OTP: "Otp send successfully.",
  SEND_OTP_FAILED: "Otp sending failed.",
  EXPIRE_OTP: "Your otp is expired, please resend otp.",
  INVALID_MOBILE: "No user found with given mobile.",
  MOBILE_REQUIRED: '"mobile" is required',
  EXPIRE_TOKEN: "Password reset token is invalid or has expired.",
  OTP_TOKEN_REQUIRED: '"otpToken" is required',
  OLD_NEW_PASSWORD_NOTSAME: "Old password and new password must not be same",
  INACTIVE_ACCOUNT: "Your account is currently deactivated",
  UPDATE_FLAG: "Flag updated successfully"
};

const SYSTEM_FAILURE = "Internal Server Error";


const VALIDATION_FAILED = "Medatory fields required or Validation failed";


// upload file
const UPLOAD_CONSTANTS = {
  UPLOAD_SUCCESS: "File Uploaded Successfully",
  UPLOAD_FAILED: "File Upload Failed",
};
const KYC_CONSTANTS = {
  KYC_SUCCESS: "Kyc added Successfully.",
  KYC_ALRADY_EXIST: "Kyc aleady exist.",
  KYC_PLEASE_UPDATE: "Please update your kyc, your kyc is rejected.",
  KYC_UPDATE_SUCCESS: "Kyc updated Successfully.",
  USER_NOT_FOUND: "User not found",
  KYC_NOT_FOUND: "Kyc data not found",
  KYC_FETCH: "Kyc fetched Successfully",
  KYC_APPROVED: "Kyc approved Successfully",
  KYC_REJECTED: "Kyc rejected Successfully",
  KYC_: "Kyc approved Successfully",
  KYC_APPROVED_ALREADY: "Kyc already approved.",
  KYC_FETCH_FAILED: "Kyc approved failed."
};

const EMAIL_CONSTANTS = {
  EMAIL_SEND_SUCCESS: "Email has been sent.",
  EMAIL_FAILURE: "Email sending Failed.",
};
const PINCODE_CONSTANTS = {
  QUERY_NOT_FOUND: "Query not found.",
  PINCODE_FETCH_SUCCESS: "Pincode fetched successfully.",
  STATE_FETCH_SUCCESS: "State fetched successfully.",
  ODA_DOWNLOAD_SUCCESS: "ODA downloaded successfully.",
  CITY_FETCH_SUCCESS: "City fetched successfully.",
  PINCODE_FETCH_FAILURE: "Pincode fetching failed.",
  INVALID_CITY_STATE: 'Either state or city is required'
};
const BANK_CONSTANTS = {
  BANK_ADD_SUCCESS: "Bank Details added Successfully.",
  BANK_NOT_FOUND: "No bank data found.",
  BANK_ALREADY_EXIST: "This bank already exists.",
  BANK_INVALID: "Invalid Bank Details.",
  BANK_DELETE_SUCCESS: "Bank Details deleted Successfully.",
  BANK_FETCH_SUCCESS: "Bank Details fetched Successfully.",
  BANK_UPDATE_SUCCESS: "Bank Details updated Successfully.",
  BANK_ADD_FAILURE: "Email sending Failed.",
};
const SERVICE_CONSTANTS = {
  SERVICE_ADD_SUCCESS: "Service Details added Successfully.",
  SERVICE_FETCH_SUCCESS: "Service Details fetched Successfully.",
  SERVICE_UPDATE_SUCCESS: "Service Details updated Successfully.",
  ALRADY_EXIST_SERVICE: "Service already exists.",
  No_DATA_FOUND: "Data not found.",
  SERVICE_DELETED_SUCCESS: "Service DELETED Successfully.",

};
const RULE_CONSTANTS = {
  RULE_ADD_SUCCESS: "Rule Details added Successfully.",
  RULE_FETCH_SUCCESS: "Rule Details fetched Successfully.",
  RULE_UPDATE_SUCCESS: "Rule Details updated Successfully.",
  ALRADY_EXIST_RULE: "Rule already exists.",
  No_DATA_FOUND: " Data not found.",
  RULE_DELETED_SUCCESS: "Rule DELETED Successfully.",
};

const PICUPSLOT_CONSTANTS = {
  PICUPSLOT_ADD_SUCCESS: "PicupSlot Details added Successfully.",
  PICUPSLOT_FETCH_SUCCESS: "PicupSlot Details fetched Successfully.",
  PICUPSLOT_UPDATE_SUCCESS: "PicupSlot Details updated Successfully.",
  ALRADY_EXIST_PICUPSLOT: "PicupSlot already exists.",
  No_DATA_FOUND: " Data not found.",
  PICUPSLOT_DELETED_SUCCESS: "PicupSlot DELETED Successfully.",
  PINCODE_NOT_SERCHED: "No records found matching the search criteria."
};
const DELIVERY_CONSTANTS = {
  DELIVERY_ADD_SUCCESS: "Delivery Details added Successfully.",
  DELIVERY_FETCH_SUCCESS: "Delivery Details fetched Successfully.",
  DELIVERY_UPDATE_SUCCESS: "Delivery Details updated Successfully.",
  ALRADY_EXIST_DELIVERY: "Delivery already exists.",
  No_DATA_FOUND: "Data not found.",
  DELIVERY_DELETED_SUCCESS: "Delivery DELETED Successfully.",
};
const CARGORATE_CONSTANTS = {
  ADDITIONAL_CHARGERS_ADD_SUCCESS: "Additional charges added Successfully.",
  ADDITIONAL_CHARGERS_GET_SUCCESS: "Additional charges fetched Successfully.",
  ADDITIONAL_CHARGERS_UPDATED: "Additional charges updated Successfully.",

};
const ZONE_CONSTANTS = {
  ZONE_ADD_SUCCESS: "Zone Details added Successfully.",
  ZONE_SERVICE_REQUIRED: "Service id required.",
  ODA_UPDATE_SUCCESS: "ODA uploaded Successfully.",
  TAT_UPDATE_SUCCESS: "TAT uploaded Successfully.",
  TAT_DOWNLOAD_SUCCESS: "TAT sheet downloaded Successfully.",
  INVALID_DATA_FORMATE: "Invalid data format.",
  ZONE_SERVICE_CREATE_SUCCESS: "Zone service created Successfully.",
  ZONE_SERVICE_UPDATE_SUCCESS: "Zone service update Successfully.",
  ZONE_SERVICE_NOT_EXIST: "Zone service not exist.",
  ZONE_ERROR: "Error in adding zone details .",
  ZONE_SERVICE_GET_SUCESS: "service zone fetched Successfully .",
  ZONE_SERVICE_PINCODE_GET_SUCESS: "service zone fetched Successfully .",
  ZONE_SERVICE_ERROR: "Error in adding zone  service details .",
  ZONE_FETCH_SUCCESS: "Zone Details fetched Successfully.",
  ZONE_UPDATE_SUCCESS: "Zone Details updated Successfully.",
  ALRADY_EXIST_ZONE: "Zone already exists.",
  No_DATA_FOUND: "Data not found.",
  CREATE_SERVICE_FIRST: "Create service first.",
  ZONE_DELETED_SUCCESS: "Zone deleted Successfully.",
  ZONE_SERVICE_ALREADY_EXIST: "ServiceZone already exists."
};

const ORDER_CONSTANTS = {
  VENDORS: "Vendor details",
  VENDOR_NOT_FOUND: "Vendor not found",
  ORDER: "Order list",
  STATUS_CHANGED: "Status changed successfully",
  ORDER_ITEM: "Order item list",
  INVALID_STATUS: "Invalid status type",
  STATUS_CHANGED: "Status changed successfully",
  PLACED: "Order placed successfully",
  ORDER_DENIED: "You are not allowed to place an order.",
  RAZORPAY_ORDER_ID: "Razorpay order id."
}
const GENERAL_MESSAGE = {
  SUCCESS: "Success"
}
const RazorPayPaymentStatus = {
  CAPTURED: "captured",
  FAILED: "failed",
  AUTHORIZED: "authorized",
  CREATED: "created",
}
const RazorPayPaymentRefundStatus = {
  PROCESSED: "processed",
  REFUNDED: "refunded",
  FAILED: "failed",
  CREATED: "created",
  SPEEDCHANGED: "speed_changed",
}
module.exports = {
  DELIVERY_CONSTANTS,
  PICUPSLOT_CONSTANTS,
  CARGORATE_CONSTANTS,
  ZONE_CONSTANTS,
  BANK_CONSTANTS,
  MIDDLEWARE_AUTH_CONSTANTS,
  AUTH_CONSTANTS,
  SYSTEM_FAILURE,
  UPLOAD_CONSTANTS,
  USER_CONSTANTS,
  ADMIN_CONSTANTS,
  EMAIL_CONSTANTS,
  SERVICE_CONSTANTS,
  PINCODE_CONSTANTS,
  ADDRESS_CONSTANTS,
  RULE_CONSTANTS,
  KYC_CONSTANTS,
  VALIDATION_FAILED,
  CHARGES_CONSTANT,
  ORDER_CONSTANTS,
  GENERAL_MESSAGE,
  RazorPayPaymentStatus,
  RazorPayPaymentRefundStatus
};