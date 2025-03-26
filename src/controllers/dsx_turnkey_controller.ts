import {Request as ExpressRequest, Response as ExpressResponse} from "express";
import { Turnkey, TurnkeyApiTypes } from "@turnkey/sdk-server";
const axios = require('axios');
import { Email, JSONRPCRequest, MethodName, ParamsType } from "../lib/types";
import { decode, JwtPayload } from "jsonwebtoken";

export const turnkeyConfig = {
    apiBaseUrl: process.env.EXPO_PUBLIC_TURNKEY_API_URL ?? "",
    defaultOrganizationId: process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID ?? "",
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY ?? "",
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY ?? "",
};

const turnkey = new Turnkey({
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
});
const apiClient = turnkey.apiClient();

export function refineNonNull<T>(
    input: T | null | undefined,
    errorMessage?: string
): T {
    if (input == null) {
        throw new Error(errorMessage ?? `Unexpected ${JSON.stringify(input)}`);
    }

    return input;
}

import { DEFAULT_ETHEREUM_ACCOUNTS } from "@turnkey/sdk-server";
type TAttestation = TurnkeyApiTypes["v1Attestation"];
type CreateSubOrgWithWalletRequest = {
    subOrgName: string;
    challenge: string;
    attestation: TAttestation;
    backupAddress: string|null
};

function decodeJwt(credential: string): JwtPayload | null {
    const decoded = decode(credential);

    if (decoded && typeof decoded === "object" && "email" in decoded) {
        return decoded as JwtPayload;
    }

    return null;
}



export async function dsx_turnkey_create_suborg(
    req: ExpressRequest,
    res: ExpressResponse
) {
    const createSubOrgRequest = req.body as CreateSubOrgWithWalletRequest;

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
                accounts: DEFAULT_ETHEREUM_ACCOUNTS,
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
        })

        return res.status(200).json({
            id: walletId,
            address: walletAddress,
            subOrgId: subOrgId,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}

export async function POST(request: Request) {
    const body: JSONRPCRequest<MethodName> = await request.json();
    const { method, params } = body;

    try {
        switch (method) {
            case "getSubOrgId":
                return handleGetSubOrgId(params as ParamsType<"getSubOrgId">);
            case "createSubOrg":
                return handleCreateSubOrg(params as ParamsType<"createSubOrg">);
            case "oAuthLogin":
                return handleOAuthLogin(params as ParamsType<"oAuthLogin">);
            default:
                return Response.json({ error: "Method not found" }, { status: 404 });
        }
    } catch (error: any) {
        console.error("server error", { ...error }, JSON.stringify(error));
        if (error) {
            return Response.json(
                { error: error.message, code: error.code },
                { status: 500 }
            );
        } else {
            return Response.json(
                { error: "An unknown error occurred", code: 0 },
                { status: 500 }
            );
        }
    }
}

async function handleCreateSubOrg(params: ParamsType<"createSubOrg">) {
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
        organizationId: turnkeyConfig.defaultOrganizationId,
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
            accounts: DEFAULT_ETHEREUM_ACCOUNTS,
        },
    });
    return Response.json(result);
}

async function handleGetSubOrgId(params: ParamsType<"getSubOrgId">) {
    const { filterType, filterValue } = params;

    let organizationId: string = turnkeyConfig.defaultOrganizationId;
    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType,
        filterValue,
    });
    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    }
    return Response.json({ organizationId });
}

async function handleOAuthLogin(params: ParamsType<"oAuthLogin">) {
    const { oidcToken, providerName, targetPublicKey, expirationSeconds } =
        params;
    let organizationId: string = turnkeyConfig.defaultOrganizationId;

    const { organizationIds } = await apiClient.getSubOrgIds({
        filterType: "OIDC_TOKEN",
        filterValue: oidcToken,
    });

    if (organizationIds.length > 0) {
        organizationId = organizationIds[0];
    } else {
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

export async function dsx_turnkey_get_backup_address(
    req: ExpressRequest,
    res: ExpressResponse
) {
    try {
        let subOrgId = req.params['suborg_id']

        return res.status(200).json({
            backup_address: 'null',
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}
