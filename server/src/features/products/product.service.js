import ApiError from "../../utils/ApiError.js";
import Category from "../categories/category.model.js";
import Product from "./product.model.js";
import { env } from "../../config/env.js";
import { getOrSet, invalidate } from "../../utils/cache.js";
import {
  indexProduct,
  removeProductFromIndex,
} from "../search/product.sync.js";
import { searchProductIds } from "../search/product.search.js";

const PRODUCTS_NAMESPACE = "products";
const PRODUCTS_TTL_SECONDS = 60;

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
  await indexProduct(product);
  await invalidate(PRODUCTS_NAMESPACE);

  return product.populate(productPopulate);
};

export const getProductById = async (id) => {
  const product = await Product.findById(id).populate(productPopulate);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const queryProductsFromMongo = async ({
  page,
  limit,
  search,
  category,
  minPrice,
  maxPrice,
  sort,
}, { vendorId } = {}) => {
  const filter = {};

  if (vendorId) {
    filter.vendor = vendorId;
  }

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

const loadSearchPage = async ({ ids, total }, { page, limit }) => {
  const products = await Product.find({ _id: { $in: ids } }).populate(
    productPopulate,
  );
  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );

  return {
    products: ids.map((id) => byId.get(id)).filter(Boolean),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const queryProducts = async (query, { vendorId } = {}) => {
  const useSearchEngine =
    query.search && !vendorId && env.searchEngine === "elasticsearch";

  if (useSearchEngine) {
    let found;

    try {
      found = await searchProductIds(query);
    } catch (err) {
      console.error(
        "Elasticsearch search failed, using MongoDB:",
        err.message,
      );
    }

    if (found) {
      return loadSearchPage(found, query);
    }
  }

  return queryProductsFromMongo(query, { vendorId });
};

export const listProducts = async (query, { vendorId } = {}) => {
  if (vendorId) {
    return queryProducts(query, { vendorId });
  }

  return getOrSet(PRODUCTS_NAMESPACE, query, PRODUCTS_TTL_SECONDS, () =>
    queryProducts(query),
  );
};

export const listMyProducts = (vendorId, query) =>
  listProducts(query, { vendorId });

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
  await indexProduct(product);
  await invalidate(PRODUCTS_NAMESPACE);

  return product.populate(productPopulate);
};

export const deleteProduct = async (user, id) => {
  const product = await findProductForModification(user, id);

  await product.deleteOne();
  await removeProductFromIndex(product._id);
  await invalidate(PRODUCTS_NAMESPACE);
};
