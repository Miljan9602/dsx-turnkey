import {Request, Response} from "express";
import { Turnkey, TurnkeyApiTypes } from "@turnkey/sdk-server";
import {config} from "dotenv";

config()
const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL
});

(async () => {
    // Connect to redis server
    await client.connect();
})();

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
    backupAddress: string|null
};

type ErrorMessage = {
    message: string;
};

export async function dsx_turnkey_controller(
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
                accounts: DEFAULT_ETHEREUM_ACCOUNTS,
            },
        });
        const subOrgId = refineNonNull(createSubOrgResponse.subOrganizationId);
        const wallet = refineNonNull(createSubOrgResponse.wallet);
        const walletId = wallet.walletId;
        const walletAddress = wallet.addresses[0];
        const savedBackupAddress = await client.get(subOrgId)

        /**
         * We are not going to allow overriding of backup address.
         */
        if (createSubOrgRequest.backupAddress && !savedBackupAddress) {
            await client.set(subOrgId, createSubOrgRequest.backupAddress);
        }

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

export async function dsx_turnkey_get_backup_address(
    req: Request,
    res: Response
) {
    try {
        let subOrgId = req.params['suborg_id']

        return res.status(200).json({
            backup_address: await client.get(subOrgId),
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            message: "Something went wrong.",
        });
    }
}