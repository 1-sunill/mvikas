const { Validator } = require("node-input-validator");
const {
  serverError,
  success,
  validateFail,
  failed,
} = require("../../../helper/response");
const db = require("../../../../models");
const Unit = db.Unit;
const CrmAttribute = db.CrmAttribute;
const CrmAttributeValue = db.CrmAttributeValue;
const ProductAttrValue = db.crmProductAttributeValue;
const Categories = db.Categories;
const Make = db.CrmMake;
const Product = db.crmProduct;
const Category = db.Categories;
const Brand = db.CrmMake;
const ProductCombination = db.productAttributeCombination;
const ProductCombinationValue = db.attributeValueCombination;
const User = db.crmuser;
const sequelize = db.sequelize;
const { USER_CONSTANTS } = require("../../../helper/message");
const { Op } = require("sequelize");
let baseUrl = process.env.APP_URL;
module.exports = {
  addProduct: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      // Validate request body
      const validate = new Validator(req.body, {
        productName: "required",
        brandId: "required",
        categoryId: "required",
        hsn: "required",
        attributeData: "required|array",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const {
        productName,
        brandId,
        categoryId,
        hsn,
        attributeData,
        workspaceId,
      } = req.body;
      const user = await User.findOne({ where: { id: req.decodedData.id } });

      const reqData = {
        workspaceId,
        name: productName,
        hsn,
        makeId: brandId,
        categoryId: categoryId,
      };

      // Assuming you have a Product model and want to create a new product
      const product = await Product.create(reqData);

      if (attributeData && attributeData.length > 0) {
        for (let i = 0; i < attributeData.length; i++) {
          const attributes = attributeData[i];

          const values = attributes.values;

          for (let j = 0; j < values.length; j++) {
            const value = values[j];

            const attributeId = attributes.attributeId;
            const productId = product.id;
            const newData = {
              productId,
              productAttributeValueId: value,
              productAttributeId: attributeId,
            };
            console.log(newData);
            await ProductAttrValue.create(newData);
          }
        }
      }
      await transaction.commit();

      return success(res, "Product added successfully.", product);
    } catch (error) {
      await transaction.rollback();

      console.error({ error });
      return serverError(res, "Internal server error.");
    }
  },
  getProduct: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.query, {
        productId: "required|integer",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const productId = req.query.productId;
      const checkProduct = await Product.findOne({
        where: { id: productId },
      });
      if (!checkProduct) {
        return failed(res, "Product not found.");
      }

      const getProductData = await Product.findByPk(productId, {
        include: [
          {
            model: ProductAttrValue,
            as: "productAttributeValues",
            attributes: [
              "id",
              "productId",
              "productAttributeId",
              "productAttributeValueId",
            ],
            include: [
              {
                model: CrmAttribute,
                as: "productAttributeData",
                attributes: ["id", "name"],
              },
              {
                model: CrmAttributeValue,
                as: "productAttributeValueData",
                attributes: ["id", "value"],
              },
            ],
          },
        ],
        attributes: ["id", "name", "hsn", "makeId", "categoryId", "createdAt"],
      });

      // Group the product attributes by attributeId
      const attributeGroups = {};

      for (let i = 0; i < getProductData.productAttributeValues.length; i++) {
        const attribute = getProductData.productAttributeValues[i];
        const {
          productAttributeId,
          productAttributeData,
          productAttributeValueData,
        } = attribute;

        if (!attributeGroups[productAttributeId]) {
          attributeGroups[productAttributeId] = {
            productAttributeId,
            attributeName: productAttributeData.name,
            values: [],
          };
        }
        console.log({ productAttributeValueData });
        if (productAttributeValueData) {
          let data = {
            id: productAttributeValueData.id,
            value: productAttributeValueData.value,
          };
          attributeGroups[productAttributeId].values.push(data);
        }
      }

      // Transform the grouped attributes into an array
      const transformedAttributeData = [];
      for (const key in attributeGroups) {
        if (attributeGroups.hasOwnProperty(key)) {
          transformedAttributeData.push(attributeGroups[key]);
        }
      }

      // Prepare the final data object
      const finalData = {
        id: getProductData.id,
        name: getProductData.name,
        hsn: getProductData.hsn,
        makeId: getProductData.makeId,
        categoryId: getProductData.categoryId,
        createdAt: getProductData.createdAt,
        productAttributeValues: transformedAttributeData,
      };

      return success(res, USER_CONSTANTS.DATA_FETCHED, finalData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  updateProduct: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        productId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const {
        productId,
        productName,
        brandId,
        categoryId,
        hsn,
        attributeData,
      } = req.body;

      //   console.log(productId);
      //   return 1;
      const checkProduct = await Product.findOne({ where: { id: productId } });
      if (!checkProduct) {
        return failed(res, "Product not found.");
      }

      const reqData = {
        name: productName,
        hsn,
        makeId: brandId,
        categoryId: categoryId,
      };
      await updateProductAttributes(productId, reqData, attributeData);
      return success(res, "Product updated successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  productList: async (req, res, whereCondition = {}) => {
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
      const userId = req.decodedData.id;
      const checkUser = await User.findOne({ where: { id: userId } });
      // console.log({ userId });
      let params;
      params = { ...whereCondition };

      // if (checkUser.userType === 0) {
      //   params = { ...whereCondition };
      //   if (request.workspaceId > 1) {
      //     // console.log({ user });

      //     params = {
      //       ...params,
      //       [Op.and]: [
      //         { id: { [Op.ne]: checkUser.id } },
      //         // { workspaceId: request.workspaceId },
      //       ],
      //     };
      //   }
      // }
      // else {
      //   params = { workspaceId: request.workspaceId };
      // }

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
      if (request.isPagination == 1) {
        //with pagination
        list = await Product.findAll({
          where: params,
          include: [
            {
              model: Category,
              as: "categoryData",
              attributes: ["name"],
            },
            {
              model: Brand,
              as: "brandData",
              attributes: ["id", "name"],
            },
            {
              model: ProductAttrValue,
              as: "productAttributeValues",
              include: [
                {
                  model: CrmAttribute,
                  as: "productAttributeData",
                  attributes: ["name"], // Include only the necessary attributes
                },
              ],
            },
          ],
          attributes: [
            "id",
            "name",
            "hsn",
            "makeId",
            "categoryId",
            "createdAt",
          ], // Include createdAt if needed
          order: [["id", "DESC"]],
          limit: parseInt(pageSize),
          offset: offset,
        });
      } else {
        list = await Product.findAll({
          where: params,
          include: [
            {
              model: Category,
              as: "categoryData",
              attributes: ["name"],
            },
            {
              model: Brand,
              as: "brandData",
              attributes: ["id", "name"],
            },
            {
              model: ProductAttrValue,
              as: "productAttributeValues",
              include: [
                {
                  model: CrmAttribute,
                  as: "productAttributeData",
                  attributes: ["name"], // Include only the necessary attributes
                },
              ],
            },
          ],
          attributes: [
            "id",
            "name",
            "hsn",
            "makeId",
            "categoryId",
            "createdAt",
          ], // Include createdAt if needed
          order: [["id", "DESC"]],
        });
      }

      console.log("++++++++++++++++", list);

      const listData = list.map((element) => {
        // Get attribute names, ensuring no duplicates
        const attributeValues = [
          ...new Set(
            element.productAttributeValues.map(
              (attrValue) => attrValue.productAttributeData.name
            )
          ),
        ];

        return {
          id: element.id,
          name: element.name,
          hsn: element.hsn,
          categoryName: element.categoryData ? element.categoryData.name : null,
          brandName: element.brandData ? element.brandData.name : null,
          brandId: element.brandData ? element.brandData.id : null,
          createdAt: element.createdAt,
          attributes: attributeValues,
        };
      });

      const totalProducts = await Product.findAll({ where: params });
      const count = totalProducts.length;
      return success(res, USER_CONSTANTS.DATA_FETCHED, {
        listData,
        count,
      });
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  addVariant: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        productId: "required",
        variantName: "required",
        variantData: "required|array",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { productId, variantName, variantData } = req.body;
      const reqData = {
        productId,
        variantName,
      };

      // Assuming you have a ProductCombination model and want to create a new product combination
      const productCombination = await ProductCombination.create(reqData);

      if (variantData && variantData.length > 0) {
        for (let i = 0; i < variantData.length; i++) {
          const attributes = variantData[i];
          const values = attributes.values;
          for (let j = 0; j < values.length; j++) {
            const value = values[j];
            console.log(value);
            const newData = {
              productId,
              attributeValueId: value,
              attributeId: attributes.attributeId,
              combinationId: productCombination.id,
            };
            await ProductCombinationValue.create(newData);
          }
        }
      }

      return success(res, "Varient added successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  updateVariant: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const validate = new Validator(req.body, {
        productId: "required",
        variantId: "required",
        // combinationId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const {
        productId,
        variantId,
        variantName,
        combinationId,
        variantData,
        value,
        combinationValueId,
        attributeId,
      } = req.body;
      const reqData = {
        productId,
        variantName,
      };

      // Update the product combination
      await ProductCombination.update(reqData, {
        where: { id: variantId },
        transaction,
      });

      if (combinationValueId) {
        const newData = {
          productId,
          attributeId,
          attributeValueId: value,
          combinationId,
        };

        await ProductCombinationValue.update(newData, {
          where: { id: combinationValueId },
          transaction,
        });
      }

      if (variantData && variantData.length > 0) {
        // Fetch existing ProductCombinationValue entries for the combination
        const existingValues = await ProductCombinationValue.findAll({
          where: { combinationId: variantId },
          // attributes: ["id", "productAttributeId", "productAttributeValueId"],
          transaction,
        });

        // Track new values and entries to keep
        let newValues = [];
        let valuesToKeep = [];

        for (let i = 0; i < variantData.length; i++) {
          const attributes = variantData[i];
          const values = attributes.values;
          const attributeId = attributes.attributeId;

          for (let j = 0; j < values.length; j++) {
            const valueId = values[j];
            let valueExists = false;

            // Check if the value already exists
            for (const existingValue of existingValues) {
              if (
                existingValue.attributeId === attributeId &&
                existingValue.attributeValueId === valueId
              ) {
                valueExists = true;
                valuesToKeep.push(existingValue.id);
                break;
              }
            }

            if (!valueExists) {
              // Add to new values
              newValues.push({
                productId,
                attributeId: attributeId,
                attributeValueId: valueId,
                combinationId: variantId,
              });
            }
          }
        }

        // Delete old values that are not in the new values
        for (const existingValue of existingValues) {
          if (!valuesToKeep.includes(existingValue.id)) {
            await ProductCombinationValue.destroy({
              where: {
                id: existingValue.id,
              },
              transaction,
            });
          }
        }

        // Insert new values
        if (newValues.length > 0) {
          await ProductCombinationValue.bulkCreate(newValues, { transaction });
        }
      }

      await transaction.commit();
      return success(res, "Variant updated successfully.");
    } catch (error) {
      await transaction.rollback();
      console.error({ error });
      return serverError(res, "Internal server error.");
    }
  },
  variantList: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        productId: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const request = req.query;
      const search = request.search ? request.search : "";
      const page = request.page ? parseInt(request.page) : 1;
      const pageSize = request.limit ? request.limit : process.env.PAGE_LIMIT;
      const offset = (page - 1) * pageSize;
      let params = { productId: request.productId };

      if (search) {
        params = {
          ...params,
          [Op.or]: [
            {
              variantName: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const list = await ProductCombination.findAll({
        where: params,
        include: [
          {
            model: ProductCombinationValue,
            as: "combinationValueData",
            attributes: [
              "id",
              "productId",
              "combinationId",
              "attributeId",
              "attributeValueId",
            ],
            include: [
              {
                model: CrmAttribute,
                as: "productAttribute",
                attributes: ["id", "name"],
              },
              {
                model: CrmAttributeValue,
                as: "productAttributeValue",
                attributes: ["id", "value"],
              },
            ],
          },
        ],
        attributes: ["id", "productId", "variantName"],
        order: [["id", "DESC"]],
        limit: parseInt(pageSize),
        offset: offset,
      });
      // // Process and structure the data
      const result = [];

      list.forEach((item) => {
        const product = {
          id: item.id,
          productId: item.productId,
          variantName: item.variantName,
          combinationValueData: [],
        };

        const attributeMap = {};

        item.combinationValueData.forEach((combination) => {
          const attr = combination.productAttribute
            ? combination.productAttribute.dataValues
            : null;
          const attrValue = combination.productAttributeValue
            ? combination.productAttributeValue.dataValues
            : null;
          if (attr && attrValue) {
            if (!attributeMap[attr.id]) {
              attributeMap[attr.id] = {
                id: attr.id,
                name: attr.name,
                values: [],
              };
            }

            attributeMap[attr.id].values.push({
              id: attrValue.id,
              value: attrValue.value,
            });
          }
        });

        product.combinationValueData = Object.values(attributeMap);

        result.push(product);
      });

      const attributesData = result.flatMap((item) =>
        item.combinationValueData.map((attr) => attr.name)
      );
      const uniqueAttributes = [...new Set(attributesData)];

      // const totalCount = await ProductCombinationValue.count({ where: {params} });
      return success(res, USER_CONSTANTS.DATA_FETCHED, {
        attributesData: uniqueAttributes,
        list: result,
        // count: totalCount,
      });
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.", error);
    }
  },
};
const updateProductAttributes = async (productId, reqData, attributeData) => {
  try {
    // Update product with reqData
    const product = await Product.update(reqData, { where: { id: productId } });

    if (attributeData && attributeData.length > 0) {
      // Fetch existing ProductAttrValue entries for the product
      const existingValues = await ProductAttrValue.findAll({
        where: { productId },
        attributes: ["id", "productAttributeId", "productAttributeValueId"],
      });

      // Track new values and entries to keep
      let newValues = [];
      let valuesToKeep = [];

      for (let i = 0; i < attributeData.length; i++) {
        const attributes = attributeData[i];
        const values = attributes.values;
        const attributeId = attributes.attributeId;

        for (let j = 0; j < values.length; j++) {
          const valueId = values[j];
          let valueExists = false;

          // Check if the value already exists
          for (const existingValue of existingValues) {
            if (
              existingValue.productAttributeId === attributeId &&
              existingValue.productAttributeValueId === valueId
            ) {
              valueExists = true;
              valuesToKeep.push(existingValue.id);
              break;
            }
          }

          if (!valueExists) {
            // Add to new values
            newValues.push({
              productId,
              productAttributeId: attributeId,
              productAttributeValueId: valueId,
            });
          }
        }
      }

      // Delete old values that are not in the new values
      for (const existingValue of existingValues) {
        if (!valuesToKeep.includes(existingValue.id)) {
          await ProductAttrValue.destroy({
            where: {
              id: existingValue.id,
            },
          });
        }
      }

      // Insert new values
      if (newValues.length > 0) {
        await ProductAttrValue.bulkCreate(newValues);
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error("Internal server error.");
  }
};
