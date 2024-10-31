import {Request, Response} from "express";
import { Turnkey, TurnkeyApiTypes } from "@turnkey/sdk-server";

export type TWalletDetails = {
    id: string;
    address: string;
    subOrgId: string;
};

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
};
type ErrorMessage = {
    message: string;
};


export async function dsx_turnkey_proxy_controller(
    req: Request,
    res: Response
) {
    const createSubOrgRequest = req.body as CreateSubOrgWithWalletRequest;
    try {
        const turnkey = new Turnkey({
            apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
            apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
            apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
            defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        });

        return turnkey.expressProxyHandler({
            allowedMethods: [
                "createSubOrganization",
                "emailAuth",
                "initUserEmailRecovery",
                "getSubOrgIds",
            ],
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}