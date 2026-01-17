import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export interface AppConfig {
  readonly projectId: string;
  readonly region: string;
  readonly port: number;
  readonly allowLocalDevBypass: boolean;
  jwtAudience: string;
}

/**
 * Load configuration from environment variables and Secret Manager
 */
export async function loadConfig(): Promise<AppConfig> {
  const projectId = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION || 'northamerica-northeast1';
  const port = parseInt(process.env.PORT || '8080', 10);
  const allowLocalDevBypass = process.env.ALLOW_LOCAL_DEV_BYPASS === 'true';

  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable is required');
  }

  // Load JWT audience from Secret Manager
  let jwtAudience = projectId; // Default fallback

  try {
    const secretName = process.env.JWT_AUDIENCE_SECRET || 'jwt-audience';
    jwtAudience = await getSecret(projectId, secretName);
    console.info(`Loaded JWT audience from Secret Manager: ${secretName}`);
  } catch (error) {
    console.warn('Failed to load JWT audience from Secret Manager, using default:', error);
  }

  return {
    projectId,
    region,
    port,
    allowLocalDevBypass,
    jwtAudience,
  };
}

/**
 * Retrieve a secret from Google Cloud Secret Manager
 */
async function getSecret(projectId: string, secretId: string): Promise<string> {
  const client = new SecretManagerServiceClient();

  const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });

  const payload = version.payload?.data;
  if (!payload) {
    throw new Error(`Secret ${secretId} has no data`);
  }

  return payload.toString();
}
