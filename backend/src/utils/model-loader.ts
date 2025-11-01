import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { Express, Request, Response } from 'express';
import { registerCrudRoutesForModel } from '../controllers/dynamicController';

type ModelDef = {
  name: string;
  fields: Array<{ name: string; type: string; required?: boolean; unique?: boolean; default?: any }>;
  ownerField?: string;
  rbac?: Record<string, string[]>;
};

function readModelFile(fp: string): ModelDef | null {
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    return JSON.parse(raw) as ModelDef;
  } catch (err) {
    console.error('Failed to read model file', fp, err);
    return null;
  }
}

export async function loadModelsAndRegisterRoutes(app: Express, modelsDir: string) {
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const fp = path.join(modelsDir, f);
    const def = readModelFile(fp);
    if (!def) continue;
    try {
      registerCrudRoutesForModel(app, def);
      console.log(`Registered routes for model ${def.name}`);
    } catch (err) {
      console.error('Failed register for', def.name, err);
    }
  }
}

export function watchModelsDir(app: Express, modelsDir: string) {
  const watcher = chokidar.watch(modelsDir, { ignoreInitial: true });
  watcher.on('add', (fp) => {
    console.log('Model added', fp);
    const def = readModelFile(fp);
    if (def) registerCrudRoutesForModel(app, def);
  });
  watcher.on('change', (fp) => {
    console.log('Model changed', fp);
    const def = readModelFile(fp);
    if (def) registerCrudRoutesForModel(app, def);
  });
  watcher.on('unlink', (fp) => {
    console.log('Model removed', fp);
    // For simplicity we won't remove routes at runtime in this scaffold.
  });
}
