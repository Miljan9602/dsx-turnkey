"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineNonNull = refineNonNull;
exports.dsx_turnkey_controller = dsx_turnkey_controller;
const sdk_server_1 = require("@turnkey/sdk-server");
function refineNonNull(input, errorMessage) {
    if (input == null) {
        throw new Error(errorMessage ?? `Unexpected ${JSON.stringify(input)}`);
    }
    return input;
}
const sdk_server_2 = require("@turnkey/sdk-server");
async function dsx_turnkey_controller(req, res) {
    const createSubOrgRequest = req.body;
    try {
        const turnkey = new sdk_server_1.Turnkey({
            apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
            apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
            apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
            defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID,
        });
        const apiClient = turnkey.apiClient();
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
        const subOrgId = refineNonNull(createSubOrgResponse.subOrganizationId);
        const wallet = refineNonNull(createSubOrgResponse.wallet);
        const walletId = wallet.walletId;
        const walletAddress = wallet.addresses[0];
        res.status(200).json({
            id: walletId,
            address: walletAddress,
            subOrgId: subOrgId,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
