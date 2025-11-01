"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModelsAndRegisterRoutes = loadModelsAndRegisterRoutes;
exports.watchModelsDir = watchModelsDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const dynamicController_1 = require("../controllers/dynamicController");
function readModelFile(fp) {
    try {
        const raw = fs_1.default.readFileSync(fp, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        console.error('Failed to read model file', fp, err);
        return null;
    }
}
async function loadModelsAndRegisterRoutes(app, modelsDir) {
    if (!fs_1.default.existsSync(modelsDir))
        fs_1.default.mkdirSync(modelsDir, { recursive: true });
    const files = fs_1.default.readdirSync(modelsDir).filter((f) => f.endsWith('.json'));
    for (const f of files) {
        const fp = path_1.default.join(modelsDir, f);
        const def = readModelFile(fp);
        if (!def)
            continue;
        try {
            (0, dynamicController_1.registerCrudRoutesForModel)(app, def);
            console.log(`Registered routes for model ${def.name}`);
        }
        catch (err) {
            console.error('Failed register for', def.name, err);
        }
    }
}
function watchModelsDir(app, modelsDir) {
    const watcher = chokidar_1.default.watch(modelsDir, { ignoreInitial: true });
    watcher.on('add', (fp) => {
        console.log('Model added', fp);
        const def = readModelFile(fp);
        if (def)
            (0, dynamicController_1.registerCrudRoutesForModel)(app, def);
    });
    watcher.on('change', (fp) => {
        console.log('Model changed', fp);
        const def = readModelFile(fp);
        if (def)
            (0, dynamicController_1.registerCrudRoutesForModel)(app, def);
    });
    watcher.on('unlink', (fp) => {
        console.log('Model removed', fp);
        // For simplicity we won't remove routes at runtime in this scaffold.
    });
}
