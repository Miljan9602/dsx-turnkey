import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { Turnkey, TurnkeyApiTypes } from "@turnkey/sdk-server";
import axios from "axios";
import { Email, JSONRPCRequest, MethodName, ParamsType } from "../lib/types";
import { decode, JwtPayload } from "jsonwebtoken";
import "dotenv/config";

export const turnkeyConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
};

const turnkey = new Turnkey(turnkeyConfig);

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
  backupAddress: string | null;
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

    await axios.post(
      "https://dsx-proxy-server-9af6f2be2780.herokuapp.com/api/v1/wallets",
      {
        address: walletAddress,
        backup_address: createSubOrgRequest.backupAddress,
        sub_org_id: subOrgId,
      }
    );

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

export async function POST(request: ExpressRequest, response: ExpressResponse) {
  const body: JSONRPCRequest<MethodName> = await request.body;
  const { method, params } = body;

  try {
    switch (method) {
      case "getSubOrgId":
        return handleGetSubOrgId(params as ParamsType<"getSubOrgId">, response);
      case "createSubOrg":
        return handleCreateSubOrg(
          params as ParamsType<"createSubOrg">,
          response
        );
      case "oAuthLogin":
        return handleOAuthLogin(params as ParamsType<"oAuthLogin">, response);
      default:
        return response.status(404).json({ error: "Method not found" });
    }
  } catch (error: any) {
    console.error("server error", { ...error }, JSON.stringify(error));
    if (error) {
      return response
        .status(500)
        .json({ error: error.message, code: error.code });
    } else {
      return response
        .status(500)
        .json({ error: "An unknown error occurred", code: 0 });
    }
  }
}

async function handleCreateSubOrg(
  params: ParamsType<"createSubOrg">,
  res: ExpressResponse
) {
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
  let decoded: JwtPayload | null = null;
  if (oauth) {
    decoded = decodeJwt(oauth.oidcToken);
    if (decoded?.email) {
      userEmail = decoded.email;
    }
  }

  const userPhoneNumber = phone;

  const subOrganizationName = `Sub Org - ${email || phone}`;
  const userName = email ? email.split("@")?.[0] || email : "";

  const result = await apiClient.createSubOrganization({
    organizationId: turnkeyConfig.defaultOrganizationId,
    subOrganizationName: decoded?.name || subOrganizationName,
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
  return res.json(result);
}

async function handleGetSubOrgId(
  params: ParamsType<"getSubOrgId">,
  res: ExpressResponse
) {
  const { filterType, filterValue } = params;

  let organizationId: string = turnkeyConfig.defaultOrganizationId;

  const { organizationIds } = await apiClient.getSubOrgIds({
    filterType,
    filterValue,
  });
  if (organizationIds.length > 0) {
    organizationId = organizationIds[0];
  }
  return res.json({ organizationId });
}

async function handleOAuthLogin(
  params: ParamsType<"oAuthLogin">,
  res: ExpressResponse
) {
  const { oidcToken, providerName, targetPublicKey, expirationSeconds } =
    params;

  let organizationId: string = turnkeyConfig.defaultOrganizationId;
  const userInfo: {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: boolean;
    nonce: string;
    nbf: number;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: number;
    exp: number;
    jti: string;
  } = JSON.parse(atob(oidcToken.split(".")[1]));

  const { organizationIds } = await apiClient.getSubOrgIds({
    filterType: "OIDC_TOKEN",
    filterValue: oidcToken,
  });

  if (organizationIds.length > 0) {
    organizationId = organizationIds[0];
  } else {
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

export async function dsx_turnkey_get_backup_address(
  req: ExpressRequest,
  res: ExpressResponse
) {
  try {
    let subOrgId = req.params["suborg_id"];

    return res.status(200).json({
      backup_address: "null",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      message: "Something went wrong.",
    });
  }
}
