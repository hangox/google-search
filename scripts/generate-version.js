import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json
const packagePath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 生成 version.ts 文件
const versionContent = `// Auto-generated file. Do not edit manually.
export const version = "${pkg.version}";
`;

const versionPath = join(__dirname, '..', 'src', 'version.ts');
fs.writeFileSync(versionPath, versionContent);

console.log(`Generated version.ts with version ${pkg.version}`);