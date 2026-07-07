import { redactHeaders } from './redaction';
import { retryWithBackoff, type RetryOptions } from './retry';

export type NombaEnvironment = 'production' | 'sandbox';

export interface NombaCredentials {
  clientId: string;
  clientSecret: string;
  accountId: string;
  environment: NombaEnvironment;
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface NombaHttpClientOptions {
  fetchFn?: typeof fetch;
  logger?: Logger;
  retry?: RetryOptions;
}

export interface HttpResponse<T> {
  statusCode: number;
  data: T;
}

interface TokenIssueResponse {
  code: string;
  description: string;
  data: {
    access_token: string;
    refresh_token: string;
    expiresAt: string;
  };
}

interface AccessTokenState {
  token: string;
  expiresAtUnixMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10_000,
};

const BASE_URLS: Record<NombaEnvironment, string> = {
  production: 'https://api.nomba.com',
  sandbox: 'https://sandbox.nomba.com',
};

export function buildAuthHeaders(accessToken: string, accountId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    accountId,
    'Content-Type': 'application/json',
  };
}

export class NombaHttpClient {
  private readonly credentials: NombaCredentials;

  private readonly fetchFn: typeof fetch;

  private readonly logger: Logger;

  private readonly retryOptions: RetryOptions;

  private accessTokenState?: AccessTokenState;

  constructor(credentials: NombaCredentials, options: NombaHttpClientOptions = {}) {
    this.credentials = credentials;
    this.fetchFn = options.fetchFn ?? fetch;
    this.logger = options.logger ?? { debug: () => undefined };
    this.retryOptions = options.retry ?? DEFAULT_RETRY_OPTIONS;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions = {},
  ): Promise<HttpResponse<T>> {
    return retryWithBackoff(
      async () => this.makeRequest<T>(method, path, options),
      this.retryOptions,
      (attempt, delayMs, error) => {
        this.logger.debug('Retrying Nomba request', {
          attempt,
          delayMs,
          error,
          path,
          method,
        });
      },
    );
  }

  async validateCredentials(): Promise<boolean> {
    await this.getAccessToken();
    return true;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions,
  ): Promise<HttpResponse<T>> {
    const url = new URL(path, BASE_URLS[this.credentials.environment]);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    const accessToken = await this.getAccessToken();
    const headers = {
      ...buildAuthHeaders(accessToken, this.credentials.accountId),
      ...(options.headers ?? {}),
    };

    this.logger.debug('Nomba request', {
      method,
      url: url.toString(),
      headers: redactHeaders(headers),
    });

    const timeoutMs = options.timeoutMs ?? 20_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const textBody = await response.text();
      const parsedBody = textBody ? (JSON.parse(textBody) as T) : ({} as T);

      if (!response.ok) {
        throw {
          statusCode: response.status,
          message: `Nomba API request failed with status ${response.status}`,
          body: parsedBody,
        };
      }

      return {
        statusCode: response.status,
        data: parsedBody,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw {
          code: 'ETIMEDOUT',
          message: `Nomba API request timed out after ${timeoutMs}ms`,
        };
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessTokenState && this.accessTokenState.expiresAtUnixMs - now > 60_000) {
      return this.accessTokenState.token;
    }

    const tokenResponse = await this.issueAccessToken();
    this.accessTokenState = tokenResponse;
    return tokenResponse.token;
  }

  private async issueAccessToken(): Promise<AccessTokenState> {
    const url = new URL('/v1/auth/token/issue', BASE_URLS[this.credentials.environment]);
    const headers = {
      'Content-Type': 'application/json',
      accountId: this.credentials.accountId,
    };

    this.logger.debug('Nomba token request', {
      url: url.toString(),
      headers: redactHeaders(headers),
    });

    const response = await this.fetchFn(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    });

    const textBody = await response.text();
    const parsedBody = textBody ? (JSON.parse(textBody) as TokenIssueResponse) : undefined;

    if (!response.ok || !parsedBody?.data?.access_token || !parsedBody?.data?.expiresAt) {
      throw {
        statusCode: response.status,
        message: 'Failed to obtain Nomba access token',
        body: parsedBody,
      };
    }

    return {
      token: parsedBody.data.access_token,
      expiresAtUnixMs: Date.parse(parsedBody.data.expiresAt),
    };
  }
}
