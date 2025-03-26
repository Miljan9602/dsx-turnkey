"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnkeyConfig = void 0;
exports.refineNonNull = refineNonNull;
exports.dsx_turnkey_create_suborg = dsx_turnkey_create_suborg;
exports.POST = POST;
exports.dsx_turnkey_get_backup_address = dsx_turnkey_get_backup_address;
const sdk_server_1 = require("@turnkey/sdk-server");
const axios = require('axios');
const jsonwebtoken_1 = require("jsonwebtoken");
exports.turnkeyConfig = {
    apiBaseUrl: process.env.EXPO_PUBLIC_TURNKEY_API_URL ?? "",
    defaultOrganizationId: process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID ?? "",
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY ?? "",
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY ?? "",
};
const turnkey = new sdk_server_1.Turnkey({
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
});
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
        await axios.post('https://dsx-proxy-server-9af6f2be2780.herokuapp.com/api/v1/wallets', {
            'address': walletAddress,
            'backup_address': createSubOrgRequest.backupAddress,
            'sub_org_id': subOrgId
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
                return handleGetSubOrgId(params);
            case "createSubOrg":
                return handleCreateSubOrg(params);
            case "oAuthLogin":
                return handleOAuthLogin(params);
            default:
                return response.status(404).json({ error: "Method not found" });
        }
    }
    catch (error) {
        console.error("server error", { ...error }, JSON.stringify(error));
        if (error) {
            return response.status(500).json({ error: error.message, code: error.code });
        }
        else {
            return response.status(500).json({ error: "An unknown error occurred", code: 0 });
        }
    }
}
async function handleCreateSubOrg(params) {
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
    return Response.json(result);
}
async function handleGetSubOrgId(params) {
    const { filterType, filterValue } = params;
    let organizationId = exports.turnkeyConfig.defaultOrganizationId;
    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType,
        filterValue,
    });
    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    }
    return Response.json({ organizationId });
}
async function handleOAuthLogin(params) {
    const { oidcToken, providerName, targetPublicKey, expirationSeconds } = params;
    let organizationId = exports.turnkeyConfig.defaultOrganizationId;
    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType: "OIDC_TOKEN",
        filterValue: oidcToken,
    });
    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    }
    else {
        const createSubOrgParams = { oauth: { oidcToken, providerName } };
        const result = await handleCreateSubOrg(createSubOrgParams);
        const { subOrganizationId } = await result.json();
        organizationId = subOrganizationId;
    }
    const oauthResponse = await apiClient.oauth({
        organizationId,
        oidcToken,
        targetPublicKey,
        expirationSeconds,
    });
    return Response.json(oauthResponse);
}
async function dsx_turnkey_get_backup_address(req, res) {
    try {
        let subOrgId = req.params['suborg_id'];
        return res.status(200).json({
            backup_address: 'null',
        });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
