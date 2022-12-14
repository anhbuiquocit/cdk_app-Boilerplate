import * as cdk from "aws-cdk-lib";
interface StorageStackProps extends cdk.StackProps {
  appName: string;
  env: cdk.Environment & {
    Environment: string;
  };
}
export class StorageStack extends cdk.Stack {
  bucket: cdk.aws_s3.Bucket;
  assetBucket: cdk.aws_s3.Bucket;
  constructor(scope: cdk.App, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { appName, env } = props;

    // 👇 create bucket
    this.bucket = new cdk.aws_s3.Bucket(
      this,
      `${appName}-${env.Environment}-s3-bucket`,
      {
        bucketName: `${appName}-${env.Environment}-s3-bucket`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        versioned: false,
        publicReadAccess: false,
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        // cors: [
        //   {
        //     allowedMethods: [
        //       cdk.aws_s3.HttpMethods.GET,
        //       cdk.aws_s3.HttpMethods.POST,
        //       cdk.aws_s3.HttpMethods.PUT,
        //     ],
        //     allowedOrigins: ['http://localhost:3000'],
        //     allowedHeaders: ['*'],
        //   },
        // ],
        // lifecycleRules: [
        //   {
        //     abortIncompleteMultipartUploadAfter: cdk.Duration.days(90),
        //     expiration: cdk.Duration.days(365),
        //     transitions: [
        //       {
        //         storageClass: cdk.aws_s3.StorageClass.INFREQUENT_ACCESS,
        //         transitionAfter: cdk.Duration.days(30),
        //       },
        //     ],
        //   },
        // ],
      }
    );

    this.assetBucket = new cdk.aws_s3.Bucket(
      this,
      `${appName}-${env.Environment}-asset-s3-bucket`,
      {
        bucketName: `${appName}-${env.Environment}-asset-s3-bucket`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        versioned: false,
        publicReadAccess: false,
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        cors: [
          {
            allowedMethods: [
              cdk.aws_s3.HttpMethods.GET,
              cdk.aws_s3.HttpMethods.POST,
              cdk.aws_s3.HttpMethods.PUT,
            ],
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
          },
        ],
      }
    );

    // 👇 grant access to bucket
    // s3Bucket.grantRead(new iam.AccountRootPrincipal());
  }
}
