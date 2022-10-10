import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface DataStackProps extends cdk.StackProps {
  appName: string;
  vpc: cdk.aws_ec2.Vpc;
  privateSg: cdk.aws_ec2.SecurityGroup;
  env: cdk.Environment & {
    MAIL_SECRET: String;
    MAIL_REGION: String;
    MAIL_FROM: String;
    MAIL_REPLY_TO: String;
    VERIFY_SIGN_UP_PATH: String;
    APP_REGION: String;
    AWS_S3_ASSET_BUCKET_NAME: String;
    WEBSITE_URL: String;
    CLIENT_ID_CLOUD_SIGN: String;
    CONTENT_TYPE_URL_ENCODED: String;
    RESOURCE_URI_CLOUD_SIGN_TOKEN: String;
    Environment: string;
  };
}

export class DataStack extends cdk.Stack {
  public readonly dbCluster: cdk.aws_rds.ServerlessCluster;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { vpc, privateSg, appName, env } = props;

    // Create the Serverless Aurora DB cluster
    const { cluster } = this.CreateServerlessAurora({
      appName,
      vpc,
      privateSg,
      env,
    });
    this.dbCluster = cluster;
  }

  private CreateServerlessAurora({
    appName,
    vpc,
    privateSg,
    env,
  }: {
    appName: string;
    vpc: cdk.aws_ec2.Vpc;
    privateSg: cdk.aws_ec2.SecurityGroup;
    env: cdk.Environment & {
      MAIL_SECRET: String;
      MAIL_REGION: String;
      MAIL_FROM: String;
      MAIL_REPLY_TO: String;
      VERIFY_SIGN_UP_PATH: String;
      APP_REGION: String;
      AWS_S3_ASSET_BUCKET_NAME: String;
      WEBSITE_URL: String;
      CLIENT_ID_CLOUD_SIGN: String;
      CONTENT_TYPE_URL_ENCODED: String;
      RESOURCE_URI_CLOUD_SIGN_TOKEN: String;
      Environment: string;
    };
  }): {
    cluster: cdk.aws_rds.ServerlessCluster;
    subnetGroup: cdk.aws_rds.SubnetGroup;
  } {
    // RDS Subnet Group
    const subnetGroup = new cdk.aws_rds.SubnetGroup(
      this,
      `${appName}-${env.Environment}-rds-subnet-group`,
      {
        vpc,
        subnetGroupName: `${env.Environment}-aurora-grace-bank-subnet-group`,
        vpcSubnets: {
          onePerAz: true,
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        description: 'An all private subnets group for the DB',
      },
    );

    // Create the Serverless Aurora DB cluster
    const cluster = new cdk.aws_rds.ServerlessCluster(
      this,
      `${appName}-${env.Environment}-AuroraCluster`,
      {
        engine: cdk.aws_rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
        // Set the engine to Postgres
        parameterGroup: cdk.aws_rds.ParameterGroup.fromParameterGroupName(
          this,
          'ParameterGroup',
          'default.aurora-postgresql10',
        ),
        defaultDatabaseName: 'main',
        enableDataApi: true,
        vpc,
        subnetGroup,
        scaling: {
          // autoPause: cdk.Duration.seconds(0),
          minCapacity: 2,
          maxCapacity: 2,
        },
        securityGroups: [privateSg],
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );
    return { cluster, subnetGroup };
  }
}
