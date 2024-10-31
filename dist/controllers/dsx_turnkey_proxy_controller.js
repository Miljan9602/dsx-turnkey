"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineNonNull = refineNonNull;
exports.dsx_turnkey_proxy_controller = dsx_turnkey_proxy_controller;
const sdk_server_1 = require("@turnkey/sdk-server");
function refineNonNull(input, errorMessage) {
    if (input == null) {
        throw new Error(errorMessage ?? `Unexpected ${JSON.stringify(input)}`);
    }
    return input;
}
async function dsx_turnkey_proxy_controller(req, res) {
    const createSubOrgRequest = req.body;
    try {
        const turnkey = new sdk_server_1.Turnkey({
            apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
            apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
            apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
            defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        });
        return turnkey.expressProxyHandler({
            allowedMethods: [
                "createSubOrganization",
                "emailAuth",
                "initUserEmailRecovery",
                "getSubOrgIds",
            ],
        });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
