import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../features/users/user.model.js";
import Category from "../features/categories/category.model.js";
import Product from "../features/products/product.model.js";

const SEED_PASSWORD = "password123";

const vendorsData = [
  { name: "Asha Traders", email: "asha.vendor@seed.shopsphere.dev" },
  { name: "Ravi Store", email: "ravi.vendor@seed.shopsphere.dev" },
];

const categoryNames = ["Books", "Electronics", "Fashion"];

const productsData = [
  { name: "Clean Code", price: 499, stock: 25, category: "Books", vendor: 0 },
  {
    name: "The Pragmatic Programmer",
    price: 599,
    stock: 18,
    category: "Books",
    vendor: 0,
  },
  {
    name: "Atomic Habits",
    price: 399,
    stock: 40,
    category: "Books",
    vendor: 1,
  },
  {
    name: "Wireless Mouse",
    price: 799,
    stock: 60,
    category: "Electronics",
    vendor: 1,
  },
  {
    name: "Mechanical Keyboard",
    price: 3499,
    stock: 15,
    category: "Electronics",
    vendor: 0,
  },
  {
    name: "USB-C Charger 65W",
    price: 1299,
    stock: 32,
    category: "Electronics",
    vendor: 1,
  },
  {
    name: "Cotton T-Shirt",
    price: 349,
    stock: 100,
    category: "Fashion",
    vendor: 0,
  },
  {
    name: "Denim Jeans",
    price: 1499,
    stock: 45,
    category: "Fashion",
    vendor: 1,
  },
  {
    name: "Running Shoes",
    price: 2499,
    stock: 22,
    category: "Fashion",
    vendor: 0,
  },
];

const seed = async () => {
  await mongoose.connect(env.mongoUri);

  const categories = {};
  for (const name of categoryNames) {
    const existing = await Category.findOne({ name }).collation({
      locale: "en",
      strength: 2,
    });
    categories[name] = existing ?? (await Category.create({ name }));
  }

  const vendors = [];
  for (const vendor of vendorsData) {
    const existing = await User.findOne({ email: vendor.email });
    vendors.push(
      existing ??
        (await User.create({
          ...vendor,
          role: "vendor",
          password: SEED_PASSWORD,
        })),
    );
  }

  await Product.deleteMany({ vendor: { $in: vendors.map((v) => v._id) } });

  const docs = productsData.map(({ category, vendor, ...rest }) => ({
    ...rest,
    description: `${rest.name} - sample product for ShopSphere`,
    images: [
      `https://picsum.photos/seed/${encodeURIComponent(rest.name)}/400/300`,
    ],
    category: categories[category]._id,
    vendor: vendors[vendor]._id,
  }));

  const created = await Product.insertMany(docs);

  console.log("Categories:", categoryNames.length);
  console.log("Vendors:", vendors.length);
  console.log("Products created:", created.length);
};

try {
  await seed();
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
