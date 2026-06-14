import { IGoogleOAuthInitResponse, IGoogleUserInfo } from "./auth.interface";
import { IRequestMeta } from "../../application/services/authentication.service";

/**
 * IGoogleOAuthAdapter
 * Port interface for Google OAuth operations.
 */
export interface IGoogleOAuthAdapter {
  /**
   * Initialize OAuth flow: generate state, code verifier, challenge, cache in Redis, and return auth URL.
   */
  initOAuth(
    meta: IRequestMeta,
    redirectUrl?: string,
  ): Promise<IGoogleOAuthInitResponse>;

  /**
   * Handle callback: validate state in Redis, exchange code for token, verify ID token/fetch profile.
   */
  handleCallback(
    code: string,
    state: string,
  ): Promise<{ googleUser: IGoogleUserInfo; redirectUrl?: string }>;
}
