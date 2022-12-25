import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { getResolverBuildPath } from "./getResolverBuildPath";
import { EnvVarStack } from "../helpers/envConfig";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

export interface CronStackProps extends cdk.NestedStackProps {
  appName: string;
  vpc: cdk.aws_ec2.Vpc;
  privateSg: cdk.aws_ec2.SecurityGroup;
  cluster: cdk.aws_rds.ServerlessCluster;
  userPool: cdk.aws_cognito.UserPool;
  iotDataEndpoint: string;
  userPoolClient: cdk.aws_cognito.UserPoolClient;
  lambdaLayers: cdk.aws_lambda.LayerVersion[];
  env: EnvVarStack;
  resolvers: CronType[];
}
export interface CronType {
  typeName: string;
  fieldName: string;
  policies?: cdk.aws_iam.PolicyStatementProps[];
  cronOptions: cdk.aws_events.CronOptions;
}

export class CronStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: CronStackProps) {
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
      this.CreateResolverFunctions({
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
  private CreateResolverFunctions({
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
    env: EnvVarStack;
    resolver: CronType;
  }): void {
    // const resolvers = getResolverNames();
    console.log("env: ", env);
    const { typeName, fieldName, policies = [], cronOptions = {} } = resolver;
    const postFn = new cdk.aws_lambda.Function(
      this,
      `${typeName}_${fieldName}_cron`,
      {
        vpc,
        vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_NAT },
        securityGroups: [privateSg],
        runtime: cdk.aws_lambda.Runtime.NODEJS_14_X,
        layers: lambdaLayers,
        code: new cdk.aws_lambda.AssetCode(
          getResolverBuildPath({
            typeName,
            fieldName,
            isType:
              typeName !== "Query" &&
              typeName !== "Mutation" &&
              typeName !== "Subscription" &&
              typeName !== "Cron",
          })
        ),
        handler: "index.handler",
        architecture: cdk.aws_lambda.Architecture.ARM_64,
        memorySize: 1024,
        // logRetention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
        timeout: cdk.Duration.seconds(15),

        environment: {
          COGNITO_USERPOOL_ID: userPoolId,
          USER_POOL_CLIENT_ID: userPoolClientId,
          IOT_DATA_ENDPOINT: iotDataEndpoint,
          SECRET_ID: cluster?.secret?.secretArn || "",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      }
    );

    // Grant extra policies to lambda function
    policies.forEach((policy) => {
      postFn.addToRolePolicy(new cdk.aws_iam.PolicyStatement(policy));
    });

    // Grant access to the cluster from the Lambda function
    cluster?.grantDataApiAccess(postFn);

    new Rule(this, `${typeName}_${fieldName}_CronRule`, {
      schedule: Schedule.cron(cronOptions),
      targets: [new LambdaFunction(postFn)],
    });
  }
}
