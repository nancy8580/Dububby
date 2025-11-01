"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacMiddlewareFactory = rbacMiddlewareFactory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function rbacMiddlewareFactory(modelsDir, modelName) {
    return function rbacMiddleware(req, res, next) {
        const targetModel = modelName;
        if (!targetModel)
            return res.status(400).json({ error: 'Model not specified' });
        const modelFile = path_1.default.join(modelsDir, `${targetModel}.json`);
        if (!fs_1.default.existsSync(modelFile))
            return res.status(404).json({ error: 'Model not found' });
        const def = JSON.parse(fs_1.default.readFileSync(modelFile, 'utf-8'));
        const role = req.user?.role || 'Viewer';
        const op = (() => {
            if (req.method === 'POST')
                return 'create';
            if (req.method === 'GET')
                return 'read';
            if (req.method === 'PUT' || req.method === 'PATCH')
                return 'update';
            if (req.method === 'DELETE')
                return 'delete';
            return 'read';
        })();
        const permissions = (def.rbac && def.rbac[role]) || [];
        if (permissions.includes('all') || permissions.includes(op))
            return next();
        return res.status(403).json({ error: 'Forbidden by RBAC' });
    };
}
