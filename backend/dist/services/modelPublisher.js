"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishModel = publishModel;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
async function publishModel(modelsDir, model) {
    if (!fs_1.default.existsSync(modelsDir))
        fs_1.default.mkdirSync(modelsDir, { recursive: true });
    const filePath = path_1.default.join(modelsDir, `${model.name}.json`);
    fs_1.default.writeFileSync(filePath, JSON.stringify(model, null, 2), 'utf-8');
    // Append model to prisma/schema.prisma
    const repoRoot = path_1.default.join(__dirname, '..', '..');
    const prismaFile = path_1.default.join(repoRoot, 'prisma', 'schema.prisma');
    if (!fs_1.default.existsSync(prismaFile))
        throw new Error('prisma/schema.prisma not found');
    const modelBlock = buildPrismaModel(model);
    fs_1.default.appendFileSync(prismaFile, '\n' + modelBlock + '\n', 'utf-8');
    // Run prisma migrate & generate (may prompt)
    await runCommand('npx prisma migrate dev --name add_' + model.name);
    await runCommand('npx prisma generate');
}
function buildPrismaModel(model) {
    const fields = model.fields
        .map((f) => {
        const t = mapToPrismaType(f.type);
        const req = f.required ? '' : '?';
        const uniq = f.unique ? ' @unique' : '';
        return `  ${f.name} ${t}${req}${uniq}`;
    })
        .join('\n');
    // include id and ownerField if present
    const ownerLine = model.ownerField ? `  ${model.ownerField} String` : '';
    return `model ${model.name} {
  id String @id @default(uuid())
${ownerLine}
${fields}
  createdAt DateTime @default(now())
}`;
}
function mapToPrismaType(t) {
    switch (t) {
        case 'string':
            return 'String';
        case 'number':
            return 'Float';
        case 'boolean':
            return 'Boolean';
        case 'date':
            return 'DateTime';
        default:
            return 'String';
    }
}
function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        const p = (0, child_process_1.exec)(cmd, { cwd: path_1.default.join(__dirname, '..', '..') }, (err, stdout, stderr) => {
            if (err) {
                console.error('Command failed', cmd, err, stderr);
                return reject(err);
            }
            console.log(stdout);
            resolve();
        });
        p?.stdout?.pipe(process.stdout);
        p?.stderr?.pipe(process.stderr);
    });
}
