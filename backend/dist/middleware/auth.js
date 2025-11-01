"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
function authMiddleware(req, res, next) {
    console.log('[auth] sessionID=', req.sessionID, 'session=', req.session && Object.keys(req.session || {}).join(','));
    const user = req.session && req.session.user;
    if (!user)
        return res.status(401).json({ error: 'Not authenticated (session missing)' });
    req.user = user;
    next();
}
