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

  // JWT audience is mounted as env var by Cloud Run from Secret Manager
  // The env var JWT_AUDIENCE_SECRET contains the actual secret value, not the secret name
  const jwtAudience = process.env.JWT_AUDIENCE_SECRET || projectId;
  console.info('JWT audience configured');

  return {
    projectId,
    region,
    port,
    allowLocalDevBypass,
    jwtAudience,
  };
}
