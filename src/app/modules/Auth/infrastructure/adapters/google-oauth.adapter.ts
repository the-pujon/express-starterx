import crypto from "crypto";
import { IGoogleOAuthAdapter } from "../../domain/interfaces/google-oauth.adapter.interface";
import {
  IGoogleOAuthInitResponse,
  IGoogleOAuthState,
  IGoogleOAuthTokenResponse,
  IGoogleUserInfo,
  IGoogleIdTokenClaims,
} from "../../domain/interfaces/auth.interface";
import { IRequestMeta } from "../../application/services/authentication.service";
import { AUTH_CONFIG } from "../../domain/config/auth.config";
import {
  cacheData,
  getCachedData,
  deleteCachedData,
} from "../../../../utils/redis.utils";
import config from "../../../../config";
import {
  OAuthErrorException,
  InvalidTokenException,
} from "../../domain/exceptions/auth.exceptions";
import { generateSecureId } from "../../application/utils/auth.utils";

export class GoogleOAuthAdapter implements IGoogleOAuthAdapter {
  private getGoogleCredentials() {
    const clientId = config.google_client_id;
    const clientSecret = config.google_client_secret;
    const redirectUri = config.google_redirect_uri;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new OAuthErrorException(
        "Google OAuth credentials are not configured",
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
  }

  private mapGoogleUserInfo(
    claims: Partial<IGoogleIdTokenClaims>,
  ): IGoogleUserInfo {
    return {
      sub: claims.sub || "",
      email: claims.email || "",
      email_verified: claims.email_verified || false,
      name: claims.name || "",
      given_name: claims.given_name,
      family_name: claims.family_name,
      picture: claims.picture,
      locale: claims.locale,
    };
  }

  async initOAuth(
    meta: IRequestMeta,
    redirectUrl?: string,
  ): Promise<IGoogleOAuthInitResponse> {
    const { clientId, redirectUri } = this.getGoogleCredentials();

    const state = generateSecureId();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const stateData: IGoogleOAuthState = {
      state,
      codeVerifier,
      redirectUrl,
      ip: meta.ip,
      userAgent: meta.userAgent,
      createdAt: new Date().toISOString(),
    };

    const stateKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.GOOGLE_OAUTH_STATE}${state}`;
    await cacheData(
      stateKey,
      stateData,
      AUTH_CONFIG.GOOGLE_OAUTH.STATE_TTL_SECONDS,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: AUTH_CONFIG.GOOGLE_OAUTH.RESPONSE_TYPE,
      scope: AUTH_CONFIG.GOOGLE_OAUTH.SCOPES.join(" "),
      access_type: AUTH_CONFIG.GOOGLE_OAUTH.ACCESS_TYPE,
      prompt: AUTH_CONFIG.GOOGLE_OAUTH.PROMPT,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      url: `${AUTH_CONFIG.GOOGLE_OAUTH.ENDPOINTS.AUTHORIZATION}?${params.toString()}`,
      state,
    };
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<IGoogleOAuthTokenResponse> {
    const { clientId, clientSecret, redirectUri } = this.getGoogleCredentials();

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(AUTH_CONFIG.GOOGLE_OAUTH.ENDPOINTS.TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new OAuthErrorException(
        "Failed to exchange authorization code for tokens",
      );
    }

    return response.json() as Promise<IGoogleOAuthTokenResponse>;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<IGoogleUserInfo> {
    const { clientId } = this.getGoogleCredentials();
    const tokenInfoUrl = `${AUTH_CONFIG.GOOGLE_OAUTH.ENDPOINTS.TOKEN_INFO}?id_token=${encodeURIComponent(idToken)}`;

    const response = await fetch(tokenInfoUrl);
    if (!response.ok) {
      throw new InvalidTokenException(
        "Failed to verify Google token signature",
      );
    }

    const claims = (await response.json()) as Partial<IGoogleIdTokenClaims>;

    if (
      claims.aud !== clientId ||
      !claims.email_verified ||
      !claims.sub ||
      !claims.email
    ) {
      throw new InvalidTokenException(
        "Google token aud/email_verified check failed",
      );
    }

    return this.mapGoogleUserInfo({
      iss: claims.iss || "accounts.google.com",
      aud: claims.aud!,
      sub: claims.sub!,
      email: claims.email!,
      email_verified: Boolean(claims.email_verified),
      name: claims.name || "",
      picture: claims.picture,
      given_name: claims.given_name,
      family_name: claims.family_name,
      locale: claims.locale,
      iat: claims.iat || Math.floor(Date.now() / 1000),
      exp: claims.exp || Math.floor(Date.now() / 1000),
    });
  }

  private async fetchGoogleUserInfo(
    accessToken: string,
  ): Promise<IGoogleUserInfo> {
    const response = await fetch(AUTH_CONFIG.GOOGLE_OAUTH.ENDPOINTS.USERINFO, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new OAuthErrorException(
        "Failed to retrieve user information from Google",
      );
    }

    return response.json() as Promise<IGoogleUserInfo>;
  }

  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ googleUser: IGoogleUserInfo; redirectUrl?: string }> {
    const stateKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.GOOGLE_OAUTH_STATE}${state}`;
    const stateData = (await getCachedData(
      stateKey,
    )) as IGoogleOAuthState | null;

    if (!stateData) {
      throw new OAuthErrorException(
        "Invalid or expired OAuth state. Please try again.",
      );
    }

    await deleteCachedData(stateKey);

    if (stateData.state !== state) {
      throw new OAuthErrorException("OAuth state mismatch");
    }

    const tokenResponse = await this.exchangeCodeForTokens(
      code,
      stateData.codeVerifier,
    );

    const googleUser = tokenResponse.id_token
      ? await this.verifyGoogleIdToken(tokenResponse.id_token)
      : await this.fetchGoogleUserInfo(tokenResponse.access_token);

    return { googleUser, redirectUrl: stateData.redirectUrl };
  }
}
