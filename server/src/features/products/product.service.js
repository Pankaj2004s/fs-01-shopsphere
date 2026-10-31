import ApiError from "../../utils/ApiError.js";
import Category from "../categories/category.model.js";
import Product from "./product.model.js";

const productPopulate = [
  { path: "category", select: "name slug" },
  { path: "vendor", select: "name" },
];

const sortOptions = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
};

const findProductForModification = async (user, id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const isOwner = product.vendor.equals(user._id);

  if (!isOwner && user.role !== "admin") {
    throw new ApiError(403, "You can only modify your own products");
  }

  return product;
};

export const createProduct = async (vendorId, data) => {
  const categoryExists = await Category.exists({ _id: data.category });

  if (!categoryExists) {
    throw new ApiError(404, "Category not found");
  }

  const product = await Product.create({ ...data, vendor: vendorId });

  return product.populate(productPopulate);
};

export const getProductById = async (id) => {
  const product = await Product.findById(id).populate(productPopulate);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

export const listProducts = async ({
  page,
  limit,
  search,
  category,
  minPrice,
  maxPrice,
  sort,
}) => {
  const filter = {};

  if (search) {
    filter.$text = { $search: search };
  }

  if (category) {
    filter.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOptions[sort])
      .skip(skip)
      .limit(limit)
      .populate(productPopulate),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateProduct = async (user, id, data) => {
  const product = await findProductForModification(user, id);

  if (data.category) {
    const categoryExists = await Category.exists({ _id: data.category });

    if (!categoryExists) {
      throw new ApiError(404, "Category not found");
    }
  }

  product.set(data);
  await product.save();

  return product.populate(productPopulate);
};

export const deleteProduct = async (user, id) => {
  const product = await findProductForModification(user, id);

  await product.deleteOne();
};
