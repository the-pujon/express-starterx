import fs from "fs";
import path from "path";

const moduleName = process.argv[2];
if (!moduleName) {
  console.error("❌ Please provide a module name. Example: npm run create-module blog");
  process.exit(1);
}

// Base directory inside your structure
const baseDir = path.join(__dirname, "src", "app", "modules", moduleName);

if (fs.existsSync(baseDir)) {
  console.error(`⚠️ The module "${moduleName}" already exists!`);
  process.exit(1);
}

// Create the folder recursively
fs.mkdirSync(baseDir, { recursive: true });

// Standard files
const files = [
  `${moduleName}.config.ts`,
  `${moduleName}.controller.ts`,
  `${moduleName}.interface.ts`,
  `${moduleName}.model.ts`,
  `${moduleName}.route.ts`,
  `${moduleName}.service.ts`,
  `${moduleName}.utils.ts`,
  `${moduleName}.validation.ts`,
];

for (const file of files) {
  const filePath = path.join(baseDir, file);
  const content = `// ${file} - ${moduleName} module\n\n`;
  fs.writeFileSync(filePath, content);
}

console.log(`✅ Module "${moduleName}" created successfully at src/app/modules/${moduleName}`);
