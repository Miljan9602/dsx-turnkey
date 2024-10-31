import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
});


export const turnkeyProxyHandler = turnkey.expressProxyHandler({
    allowedMethods: [
        "createSubOrganization",
        "emailAuth",
        "initUserEmailRecovery",
        "getSubOrgIds",
        "oauth"
    ],
});