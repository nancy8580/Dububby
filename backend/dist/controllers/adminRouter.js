"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const modelPublisher_1 = require("../services/modelPublisher");
const router = (0, express_1.Router)();
// Publish model endpoint
router.post('/models/publish', async (req, res) => {
    const body = req.body;
    if (!body || !body.name)
        return res.status(400).json({ error: 'Missing model name' });
    try {
        const root = path_1.default.join(__dirname, '..');
        const modelsDir = path_1.default.join(root, 'models-definitions');
        await (0, modelPublisher_1.publishModel)(modelsDir, body);
        return res.json({ ok: true });
    }
    catch (err) {
        console.error('Publish failed', err);
        return res.status(500).json({ error: String(err) });
    }
});
// List models
router.get('/models/list', (req, res) => {
    const root = path_1.default.join(__dirname, '..');
    const modelsDir = path_1.default.join(root, 'models-definitions');
    if (!fs_1.default.existsSync(modelsDir))
        return res.json({ models: [] });
    const files = fs_1.default.readdirSync(modelsDir).filter((f) => f.endsWith('.json'));
    const models = files.map((f) => {
        try {
            return JSON.parse(fs_1.default.readFileSync(path_1.default.join(modelsDir, f), 'utf-8'));
        }
        catch (e) {
            return null;
        }
    }).filter(Boolean);
    return res.json({ models });
});
// Login (sets session) — simple dev helper
router.post('/login', (req, res) => {
    const { userId, role } = req.body || {};
    if (!userId || !role)
        return res.status(400).json({ error: 'Provide userId and role' });
    req.session = req.session || {};
    req.session.user = { userId, role };
    // Ensure session is saved to the store before responding so cookie+session
    // are persisted when using async DB-backed stores.
    if (typeof req.session.save === 'function') {
        req.session.save((err) => {
            if (err)
                return res.status(500).json({ error: 'Failed to save session' });
            return res.json({ ok: true });
        });
    }
    else {
        return res.json({ ok: true });
    }
});
exports.default = router;
