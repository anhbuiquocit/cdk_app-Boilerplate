import * as cdk from 'aws-cdk-lib';
export interface EnvApiStack extends cdk.Environment {
  readonly MAIL_SECRET: string;
  readonly MAIL_REGION: string;
  readonly MAIL_FROM: string;
  readonly MAIL_REPLY_TO: string;
  readonly VERIFY_SIGN_UP_PATH: string;
  readonly APP_REGION: string;
  readonly Environment: string;
  readonly AWS_S3_ASSET_BUCKET_NAME: string;
  readonly WEBSITE_URL: string;
  readonly CLIENT_ID_CLOUD_SIGN: string;
  readonly CONTENT_TYPE_URL_ENCODED: string;
  readonly RESOURCE_URI_CLOUD_SIGN_TOKEN: string;
  readonly SOFTBANK_ENDPOINT_URL: string;
  readonly SOFTBANK_MERCHANT_ID: string;
  readonly SOFTBANK_HASH_KEY: string;
  readonly SOFTBANK_SERVICE_ID: string;
  readonly SLACK_WEBHOOK_URL: string;
}
