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
const Categories = db.Categories;
const CrmAttributeValue = db.CrmAttributeValue;
const Make = db.CrmMake;
const Product = db.crmProduct;
const ProductAttrValue = db.crmProductAttributeValue;
const { Op } = require("sequelize");

let baseUrl = process.env.APP_URL;

const generateSlug = (name) => {
  console.log({ name });
  return name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
};
module.exports = {
  categoryList: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      let params = {};

      if (search) {
        params = {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const list = await Categories.findAll({
        where: params,
        ...whereCondition,
      });
      return success(res, "Data fetched successfully.", list);
    } catch (error) {
      return serverError(res, "Internal server error.");
    }
  },
  addCategories: async (req, res) => {
    try {
      console.log("++++++++++++++++++++++++++", req.body);

      const validate = new Validator(req.body, {
        categoryName: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const name = req.body.categoryName;
      const slug = generateSlug(name);
      const reqData = {
        name: name,
        slug: slug,
      };

      let saveData = await Categories.create(reqData);
      return success(res, "Category saved successfully.", saveData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "internalServerError");
    }
  },
  getCategories: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        id: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const id = req.query.id;

      // Find category by ID
      const getData = await Categories.findOne({
        where: { id: id },
      });

      if (!getData) {
        return failed(res, "Category not found.");
      }
      return success(res, "Category saved successfully.", getData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "internalServerError");
    }
  },
  editCategory: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        id: "required|integer",
        categoryName: "required|string",
      });

      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate.errors);
      }

      const id = req.body.id;
      const getData = await Categories.findOne({
        where: { id: id },
      });

      if (!getData) {
        return failed(res, "Category not found.");
      }

      const name = req.body.categoryName;
      const slug = generateSlug(name);

      // Update the category
      await Categories.update(
        { name: name, slug: slug },
        { where: { id: id } }
      );

      return success(res, "Category updated successfully.");
    } catch (error) {
      console.error(error);
      return serverError(res, "Internal server error.");
    }
  },
  addUnit: async (req, res) => {
    try {
      const validate = new Validator(req.body, {
        unitName: "required",
        shortName: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const name = req.body.unitName;
      const shortName = req.body.shortName;
      const slug = generateSlug(name);
      const checkUnit = await Unit.findOne({
        where: { name: { [Op.eq]: name } },
      });
      if (checkUnit) {
        return failed(res, "Unit already exist.");
      }
      const reqData = {
        name: name,
        slug: slug,
        shortName: shortName,
      };

      let saveData = await Unit.create(reqData);
      return success(res, "Unit saved successfully.", saveData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "internalServerError");
    }
  },
  getUnit: async (req, res) => {
    try {
      const validate = new Validator(req.query, {
        id: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const id = req.query.id;

      // Find category by ID
      const getData = await Unit.findOne({
        where: { id: id },
      });

      if (!getData) {
        return failed(res, "Unit not found.");
      }
      return success(res, "Unit saved successfully.", getData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "internalServerError");
    }
  },
  editUnit: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        id: "required",
        unitName: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const id = req.body.id;
      const getData = await Unit.findOne({
        where: { id: id },
      });

      if (!getData) {
        return failed(res, "Unit not found.");
      }

      const name = req.body.unitName;
      const shortName = req.body.shortName;
      const slug = generateSlug(name);
      const checkUnit = await Unit.findOne({
        where: {
          name: { [Op.eq]: name },
          id: { [Op.ne]: id },
        },
      });

      if (checkUnit) {
        return failed(res, "Unit with this name already exists.");
      }
      // Update the unit
      await Unit.update(
        { name: name, slug: slug, shortName: shortName },
        { where: { id: id } }
      );

      return success(res, "Unit updated successfully.");
    } catch (error) {
      console.error(error);
      return serverError(res, "Internal server error.");
    }
  },
  unitList: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      let params = { ...whereCondition };

      if (search) {
        params = {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const list = await Unit.findAll({
        attributes: ["id", "name", "slug", "shortName"],
        where: params,
      });

      return success(res, "Data fetched successfully.", list);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  attributeList: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      let params = { ...whereCondition };

      if (search) {
        params = {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const list = await CrmAttribute.findAll({
        attributes: ["id", "name", "slug", "unitId"],
        where: params,
        include: [
          {
            model: Unit,
            as: "unitData",
            attributes: ["name"],
          },
          {
            model: CrmAttributeValue,
            as: "attributeValues",
            attributes: ["id", "value"],
          },
        ],
      });

      return success(res, "Data fetched successfully.", list);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  addAttribute: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        unitId: "required",
        attributeName: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const { unitId, attributeName } = req.body;
      const slug = generateSlug(attributeName);

      const reqData = {
        unitId,
        name: attributeName,
        slug,
      };
      await CrmAttribute.create(reqData);
      return success(res, "Data inserted successfully.", reqData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  addAttributeValue: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        attributeId: "required|integer",
        values: "required|array",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const { values, attributeId } = req.body;
      const checkAttr = await CrmAttribute.findOne({
        where: { id: attributeId },
      });
      if (!checkAttr) {
        attributeId;
        return failed(res, "Attribute not found.");
      }
         // Delete existing attribute values
         await CrmAttributeValue.destroy({
          where: { attributeId: attributeId },
        });
      // Prepare new values for bulk insert
      const newValues = values.map((value) => ({
        value,
        attributeId,
      }));

      // Insert new attribute values
      await CrmAttributeValue.bulkCreate(newValues);
      return success(res, "Data inserted successfully.", newValues);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  getAtrrValue: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.query, {
        attributeId: "required|integer",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }
      const attributeId = req.query.attributeId;
      const getData = await CrmAttribute.findByPk(attributeId, {
        include: [
          {
            model: CrmAttributeValue,
            as: "attributeValues",
            attributes: ["id", "value"],
          },
        ],
        attributes: ["id", "unitId", "slug", "name"],
      });

      if (!getData) {
        return failed(res, "Attribute not found.");
      }
      return success(res, "Data fected successfully.", getData);
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  updateAttribute: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        attributeId: "required|integer",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { unitId, attributeName, attributeId } = req.body;
      const slug = generateSlug(attributeName);
      const reqData = {
        unitId,
        slug,
        name: attributeName,
      };

      // Update the CrmAttribute
      const [updated] = await CrmAttribute.update(reqData, {
        where: { id: attributeId },
      });

      if (updated) {
        return success(res, "Attribute updated successfully.");
      } else {
        return notFound(res, "Attribute not found.");
      }
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  updateAttributeValue: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        attributeId: "required|integer",
        values: "required|array",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { values, attributeId } = req.body;

      // Delete existing attribute values
      await CrmAttributeValue.destroy({
        where: { attributeId: attributeId },
      });

      // Prepare new values for bulk insert
      const newValues = values.map((value) => ({
        value,
        attributeId,
      }));

      // Insert new attribute values
      await CrmAttributeValue.bulkCreate(newValues);

      return success(res, "Attribute values updated successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  brandList: async (req, res, whereCondition = {}) => {
    try {
      const request = req.query;
      const search = request.search ? request.search : "";
      let params = { ...whereCondition };

      if (search) {
        params = {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${search}%`,
              },
            },
          ],
        };
      }

      const list = await Make.findAll({
        attributes: ["id", "name", "slug"],
        where: params,
      });

      return success(res, "Data fetched successfully.", list);
    } catch (error) {
      return serverError(res, "Internal server error.");
    }
  },
  addBrand: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        name: "required",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { name } = req.body;
      const slug = generateSlug(name);

      await Make.create({ name, slug });

      return success(res, "Brand added successfully.");
    } catch (error) {
      console.log({ error });
      return serverError(res, "Internal server error.");
    }
  },
  getBrand: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.query, {
        brandId: "required|integer",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { brandId } = req.query;
      const data = await Make.findByPk(brandId);
      return success(res, "data fetched successfully.", data);
    } catch (error) {
      return serverError(res, "Internal server error.");
    }
  },
  updateBrand: async (req, res) => {
    try {
      // Validate request body
      const validate = new Validator(req.body, {
        brandId: "required|integer",
      });
      const matched = await validate.check();
      if (!matched) {
        return validateFail(res, validate);
      }

      const { name, brandId } = req.body;
      const slug = generateSlug(name);
      const reqData = {
        slug,
        name,
      };

      // Update the Make(Brand)
      const [updated] = await Make.update(reqData, {
        where: { id: brandId },
      });

      if (updated) {
        return success(res, "Brand updated successfully.");
      } else {
        return notFound(res, "Brand not found.");
      }
    } catch (error) {
      return serverError(res, "Internal server error.");
    }
  },
};
