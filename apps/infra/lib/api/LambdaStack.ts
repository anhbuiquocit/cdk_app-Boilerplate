import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { getResolverBuildPath } from "./getResolverBuildPath";
import { EnvVarStack } from "../helpers/envConfig";
import { LambdaDataSource, Resolver } from "@aws-cdk/aws-appsync-alpha";

export interface LambdaStackProps extends cdk.NestedStackProps {
  appName: string;
  vpc: cdk.aws_ec2.Vpc;
  privateSg: cdk.aws_ec2.SecurityGroup;
  cluster: cdk.aws_rds.ServerlessCluster;
  userPool: cdk.aws_cognito.UserPool;
  iotDataEndpoint: string;
  userPoolClient: cdk.aws_cognito.UserPoolClient;
  lambdaLayers: cdk.aws_lambda.LayerVersion[];
  api: appsync.GraphqlApi;
  env: EnvVarStack;
  resolvers: ResolverType[];
}
export interface ResolverType {
  typeName: string;
  fieldName: string;
  policies?: cdk.aws_iam.PolicyStatementProps[];
  // number: number;
  createdAt: number;
}

export class LambdaStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);
    const {
      vpc,
      privateSg,
      lambdaLayers,
      cluster,
      api,
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
        api,
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
    api,
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
    api: appsync.GraphqlApi;
    iotDataEndpoint: string;
    userPoolId: string;
    userPoolClientId: string;
    env: EnvVarStack;
    resolver: ResolverType;
  }): void {
    // const resolvers = getResolverNames();
    console.log("env: ", env);
    const { typeName, fieldName, policies = [] } = resolver;
    const postFn = new cdk.aws_lambda.Function(
      this,
      `${typeName}_${fieldName}`,
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
              typeName !== "Subscription",
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
    // Set the new Lambda function as a data source for the AppSync API

    // const lambdaDs = api.addLambdaDataSource(
    //   `${typeName}_${fieldName}_lambdaDatasource`,
    //   postFn,
    // );

    // lambdaDs.createResolver({
    //   typeName,
    //   fieldName,
    //   // requestMappingTemplate: appsync.MappingTemplate.fromFile(
    //   //   path.join(__dirname, `${functionFolderPath}/before.vtl`),
    //   // ),
    //   // responseMappingTemplate: appsync.MappingTemplate.fromFile(
    //   //   path.join(__dirname, `${functionFolderPath}/after.vtl`),
    //   // ),
    // });

    const lambdaDataSource = new LambdaDataSource(
      this,
      `${typeName}_${fieldName}_lambdaDatasource`,
      {
        api,
        lambdaFunction: postFn,
      }
    );
    new Resolver(this, `${typeName}_${fieldName}_Resolver`, {
      api,
      dataSource: lambdaDataSource,
      typeName,
      fieldName,
    });
  }
}
