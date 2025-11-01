import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

type Field = { name: string; type: string; required?: boolean; unique?: boolean; default?: any };

export async function publishModel(modelsDir: string, model: { name: string; fields: Field[]; ownerField?: string; rbac?: any }) {
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  const filePath = path.join(modelsDir, `${model.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(model, null, 2), 'utf-8');

  // Append model to prisma/schema.prisma
  const repoRoot = path.join(__dirname, '..', '..');
  const prismaFile = path.join(repoRoot, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaFile)) throw new Error('prisma/schema.prisma not found');

  const modelBlock = buildPrismaModel(model);
  fs.appendFileSync(prismaFile, '\n' + modelBlock + '\n', 'utf-8');

  // Run prisma migrate & generate (may prompt)
  await runCommand('npx prisma migrate dev --name add_' + model.name);
  await runCommand('npx prisma generate');
}

function buildPrismaModel(model: any) {
  const fields = model.fields
    .map((f: any) => {
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

function mapToPrismaType(t: string) {
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

function runCommand(cmd: string) {
  return new Promise<void>((resolve, reject) => {
    const p = exec(cmd, { cwd: path.join(__dirname, '..', '..') }, (err, stdout, stderr) => {
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
