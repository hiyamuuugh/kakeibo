import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const defaultCategories = [
  { name: "食費", color: "#ef4444", icon: "utensils" },
  { name: "交通費", color: "#f97316", icon: "train" },
  { name: "日用品", color: "#eab308", icon: "shopping-cart" },
  { name: "娯楽", color: "#22c55e", icon: "gamepad-2" },
  { name: "衣類", color: "#3b82f6", icon: "shirt" },
  { name: "医療", color: "#8b5cf6", icon: "heart-pulse" },
  { name: "光熱費", color: "#06b6d4", icon: "zap" },
  { name: "通信費", color: "#ec4899", icon: "smartphone" },
  { name: "その他", color: "#6b7280", icon: "circle-ellipsis" },
];

async function main() {
  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("Seeded default categories.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
