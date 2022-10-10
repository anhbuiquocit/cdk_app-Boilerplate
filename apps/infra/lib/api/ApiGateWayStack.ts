import * as cdk from 'aws-cdk-lib';
import {
  LambdaIntegration,
  PassthroughBehavior,
} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { EnvApiStack } from '../helpers/envConfig';

export interface ApiGateWayStackProps extends cdk.NestedStackProps {
  appName: string;
  vpc: cdk.aws_ec2.Vpc;
  privateSg: cdk.aws_ec2.SecurityGroup;
  cluster: cdk.aws_rds.ServerlessCluster;
  userPool: cdk.aws_cognito.UserPool;
  iotDataEndpoint: string;
  userPoolClient: cdk.aws_cognito.UserPoolClient;
  lambdaLayers: cdk.aws_lambda.LayerVersion[];
  env: EnvApiStack;
  resolvers: FuncType[];
}
export interface FuncType {
  policies?: cdk.aws_iam.PolicyStatementProps[];
  funcName: string;
}
export const getResolverBuildPathCustomLambFunc = ({
  funcName,
}: {
  funcName: string;
}): string => {
  return `build/lambdas/CustomLambdaFunc/${funcName}`;
};

export class ApiGateWayStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: ApiGateWayStackProps) {
    super(scope, id, props);
    const {
      vpc,
      privateSg,
      lambdaLayers,
      cluster,
      iotDataEndpoint,
      userPool,
      userPoolClient,
      env,
      resolvers,
    } = props;
    for (const resolver of resolvers) {
      this.CreateCustomLambdaFunctions({
        vpc,
        privateSg,
        lambdaLayers,
        cluster,
        iotDataEndpoint,
        userPoolId: userPool.userPoolId,
        userPoolClientId: userPoolClient.userPoolClientId,
        env,
        resolver,
      });
    }
  }
  private CreateCustomLambdaFunctions({
    vpc,
    privateSg,
    lambdaLayers,
    cluster,
    iotDataEndpoint,
    userPoolId,
    userPoolClientId,
    env,
    resolver,
  }: {
    vpc: cdk.aws_ec2.Vpc;
    privateSg: cdk.aws_ec2.SecurityGroup;
    cluster: cdk.aws_rds.ServerlessCluster;
    lambdaLayers: cdk.aws_lambda.LayerVersion[];
    iotDataEndpoint: string;
    userPoolId: string;
    userPoolClientId: string;
    env: EnvApiStack;
    resolver: FuncType;
  }): void {
    // const resolvers = getResolverNames();

    const { policies = [], funcName } = resolver;
    const postFn = new cdk.aws_lambda.Function(
      this,
      `${funcName}_customLambdaFunc`,
      {
        vpc,
        vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT },
        securityGroups: [privateSg],
        runtime: cdk.aws_lambda.Runtime.NODEJS_14_X,
        layers: lambdaLayers,
        code: new cdk.aws_lambda.AssetCode(
          getResolverBuildPathCustomLambFunc({ funcName }),
        ),
        handler: 'index.handler',
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        memorySize: 1024,
        // logRetention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
        timeout: cdk.Duration.seconds(15),
        environment: {
          COGNITO_USERPOOL_ID: userPoolId,
          USER_POOL_CLIENT_ID: userPoolClientId,
          IOT_DATA_ENDPOINT: iotDataEndpoint,
          SECRET_ID: cluster?.secret?.secretArn || '',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          MAIL_FROM: env.MAIL_FROM || '',
          VERIFY_SIGN_UP_PATH: env.VERIFY_SIGN_UP_PATH || '',
          MAIL_SECRET: env.MAIL_SECRET || '',
          MAIL_REGION: env.MAIL_REGION || '',
          AWS_S3_BUCKET_NAME: env.AWS_S3_ASSET_BUCKET_NAME || '',
          WEBSITE_URL: env.WEBSITE_URL,
          Environment: env.Environment,
          CLIENT_ID_CLOUD_SIGN: env.CLIENT_ID_CLOUD_SIGN,
          CONTENT_TYPE_URL_ENCODED: env.CONTENT_TYPE_URL_ENCODED,
          RESOURCE_URI_CLOUD_SIGN_TOKEN: env.RESOURCE_URI_CLOUD_SIGN_TOKEN,
        },
      },
    );

    // Grant extra policies to lambda function
    policies.forEach((policy) => {
      postFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement(policy));
    });

    // Grant access to the cluster from the Lambda function
    cluster?.grantDataApiAccess(postFn);
    const funcApi = new cdk.aws_apigateway.LambdaRestApi(
      this,
      `${funcName}-EndPoint`,
      {
        handler: postFn,
        proxy: false,
      },
    );
    const funcfuncApiGateway = funcApi.root.addResource(
      `${funcName}_apiGateway`,
    );
    funcfuncApiGateway.addMethod(
      'POST',
      new LambdaIntegration(postFn, {
        integrationResponses: [{ statusCode: '200' }],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': '{ "statusCode": 200 }',
        },
        proxy: false,
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      },
    );
  }
}
