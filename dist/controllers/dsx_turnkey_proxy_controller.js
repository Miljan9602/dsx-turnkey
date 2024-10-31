"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnkeyProxyHandler = void 0;
const sdk_server_1 = require("@turnkey/sdk-server");
const turnkey = new sdk_server_1.Turnkey({
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
});
exports.turnkeyProxyHandler = turnkey.expressProxyHandler({
    allowedMethods: [
        "createSubOrganization",
        "emailAuth",
        "initUserEmailRecovery",
        "getSubOrgIds",
    ],
});
