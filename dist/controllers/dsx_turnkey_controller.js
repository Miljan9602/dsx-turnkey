"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnkeyConfig = void 0;
exports.refineNonNull = refineNonNull;
exports.dsx_turnkey_create_suborg = dsx_turnkey_create_suborg;
exports.POST = POST;
exports.dsx_turnkey_get_backup_address = dsx_turnkey_get_backup_address;
const sdk_server_1 = require("@turnkey/sdk-server");
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = require("jsonwebtoken");
require("dotenv/config");
exports.turnkeyConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
};
const turnkey = new sdk_server_1.Turnkey(exports.turnkeyConfig);
const apiClient = turnkey.apiClient();
function refineNonNull(input, errorMessage) {
    if (input == null) {
        throw new Error(errorMessage ?? `Unexpected ${JSON.stringify(input)}`);
    }
    return input;
}
const sdk_server_2 = require("@turnkey/sdk-server");
function decodeJwt(credential) {
    const decoded = (0, jsonwebtoken_1.decode)(credential);
    if (decoded && typeof decoded === "object" && "email" in decoded) {
        return decoded;
    }
    return null;
}
async function dsx_turnkey_create_suborg(req, res) {
    const createSubOrgRequest = req.body;
    try {
        const walletName = `Default ETH Wallet`;
        const createSubOrgResponse = await apiClient.createSubOrganization({
            subOrganizationName: createSubOrgRequest.subOrgName,
            rootQuorumThreshold: 1,
            rootUsers: [
                {
                    userName: "New user",
                    apiKeys: [],
                    oauthProviders: [],
                    authenticators: [
                        {
                            authenticatorName: "Passkey",
                            challenge: createSubOrgRequest.challenge,
                            attestation: createSubOrgRequest.attestation,
                        },
                    ],
                },
            ],
            wallet: {
                walletName: walletName,
                accounts: sdk_server_2.DEFAULT_ETHEREUM_ACCOUNTS,
            },
        });
        const wallet = refineNonNull(createSubOrgResponse.wallet);
        const walletId = wallet.walletId;
        const walletAddress = wallet.addresses[0];
        const subOrgId = refineNonNull(createSubOrgResponse.subOrganizationId);
        await axios_1.default.post("https://dsx-proxy-server-9af6f2be2780.herokuapp.com/api/v1/wallets", {
            address: walletAddress,
            backup_address: createSubOrgRequest.backupAddress,
            sub_org_id: subOrgId,
        });
        return res.status(200).json({
            id: walletId,
            address: walletAddress,
            subOrgId: subOrgId,
        });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
async function POST(request, response) {
    const body = await request.body;
    const { method, params } = body;
    try {
        switch (method) {
            case "getSubOrgId":
                return handleGetSubOrgId(params, response);
            case "createSubOrg":
                return handleCreateSubOrg(params, response);
            case "oAuthLogin":
                return handleOAuthLogin(params, response);
            default:
                return response.status(404).json({ error: "Method not found" });
        }
    }
    catch (error) {
        console.error("server error", { ...error }, JSON.stringify(error));
        if (error) {
            return response
                .status(500)
                .json({ error: error.message, code: error.code });
        }
        else {
            return response
                .status(500)
                .json({ error: "An unknown error occurred", code: 0 });
        }
    }
}
async function handleCreateSubOrg(params, res) {
    const { email, phone, passkey, oauth } = params;
    const authenticators = passkey
        ? [
            {
                authenticatorName: "Passkey",
                challenge: passkey.challenge,
                attestation: passkey.attestation,
            },
        ]
        : [];
    const oauthProviders = oauth
        ? [
            {
                providerName: oauth.providerName,
                oidcToken: oauth.oidcToken,
            },
        ]
        : [];
    let userEmail = email;
    // If the user is logging in with a Google Auth credential, use the email from the decoded OIDC token (credential
    // Otherwise, use the email from the email parameter
    if (oauth) {
        const decoded = decodeJwt(oauth.oidcToken);
        if (decoded?.email) {
            userEmail = decoded.email;
        }
    }
    const userPhoneNumber = phone;
    const subOrganizationName = `Sub Org - ${email || phone}`;
    const userName = email ? email.split("@")?.[0] || email : "";
    const result = await apiClient.createSubOrganization({
        organizationId: exports.turnkeyConfig.defaultOrganizationId,
        subOrganizationName: subOrganizationName,
        rootUsers: [
            {
                userName,
                userEmail,
                userPhoneNumber,
                oauthProviders,
                authenticators,
                apiKeys: [],
            },
        ],
        rootQuorumThreshold: 1,
        wallet: {
            walletName: "Default Wallet",
            accounts: sdk_server_2.DEFAULT_ETHEREUM_ACCOUNTS,
        },
    });
    return res.json(result);
}
async function handleGetSubOrgId(params, res) {
    const { filterType, filterValue } = params;
    // let organizationId: string = turnkeyConfig.defaultOrganizationId;
    let organizationId = "5a94e5eb-05a7-41b6-a415-69b82b4cb58e";
    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType,
        filterValue,
    });
    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    }
    return res.json({ organizationId });
}
async function handleOAuthLogin(params, res) {
    const { oidcToken, providerName, targetPublicKey, expirationSeconds } = params;
    // let organizationId: string = turnkeyConfig.defaultOrganizationId;
    let organizationId = "5a94e5eb-05a7-41b6-a415-69b82b4cb58e";
    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType: "OIDC_TOKEN",
        filterValue: oidcToken,
    });
    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    }
    else {
        const createSubOrgParams = { oauth: { oidcToken, providerName } };
        const result = await handleCreateSubOrg(createSubOrgParams, res);
        // @ts-ignore
        const { subOrganizationId } = await result.json();
        organizationId = subOrganizationId;
    }
    const oauthResponse = await apiClient.oauth({
        organizationId,
        oidcToken,
        targetPublicKey,
        expirationSeconds,
    });
    return res.json(oauthResponse);
}
async function dsx_turnkey_get_backup_address(req, res) {
    try {
        let subOrgId = req.params["suborg_id"];
        return res.status(200).json({
            backup_address: "null",
        });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
