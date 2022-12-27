/* eslint-disable no-new */
/* eslint-disable no-console */
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { mergedSdlPath } from "../helpers/resolverList";
import { saveStringParameter } from "../helpers/saveStringParameter";
import { prepareApiStack } from "./prepareApiStack";
import { createLambdaLayers } from "./createLambdaLayers";
import { LambdaStack, ResolverType } from "./LambdaStack";
import {
  getResolverNames,
  getCronNames,
  getCustomLambFuncs,
} from "../helpers/resolverList";
import { EnvVarStack } from "../helpers/envConfig";
import { CronStack } from "./CronStack";
import { ApiGateWayStack } from "./ApiGateWayStack";

interface ApiStackProps extends cdk.StackProps {
  appName: string;
  vpc: cdk.aws_ec2.Vpc;
  privateSg: cdk.aws_ec2.SecurityGroup;
  dbCluster: cdk.aws_rds.ServerlessCluster;
  userPool: cdk.aws_cognito.UserPool;
  userPoolClient: cdk.aws_cognito.UserPoolClient;
  env: EnvVarStack;
}

export class ApiStack extends cdk.Stack {
  public static async prepareAndBuild(
    scope: Construct,
    id: string,
    props: ApiStackProps
  ): Promise<ApiStack> {
    await prepareApiStack();
    const instance = new ApiStack(scope, id, props);

    const {
      vpc,
      privateSg,
      dbCluster,
      userPool,
      appName,
      userPoolClient,
      env,
    } = props;
    const lambdaLayers: cdk.aws_lambda.LayerVersion[] = createLambdaLayers({
      apiStack: instance,
      appName,
    });

    // Create the AppSync API
    const api = instance.CreateAppSync({ appName, userPool });

    instance.createNestedStack({
      appName,
      vpc,
      privateSg,
      dbCluster,
      lambdaLayers,
      api,
      userPool,
      userPoolClient,
      env,
    });
    // createNestStack(
    //   instance,
    //   appName,
    //   vpc,
    //   privateSg,
    //   dbCluster,
    //   lambdaLayers,
    //   api,
    //   iotDataEndpoint,
    //   userPool,
    //   userPoolClient,
    //   env,
    // );

    // instance.CreateResolverFunctions({
    //   vpc,
    //   privateSg,
    //   lambdaLayers,
    //   cluster: dbCluster,
    //   api,
    //   iotDataEndpoint,
    //   userPoolId: userPool.userPoolId,
    //   userPoolClientId: userPoolClient.userPoolClientId,
    //   env,
    // });

    saveStringParameter(instance, {
      parameterName: `/${appName}/AppSyncAPIURL`,
      stringValue: api.graphqlUrl,
    });
    saveStringParameter(instance, {
      parameterName: `/${appName}/AppSyncAPIKey`,
      stringValue: api.apiKey || "",
    });
    return instance;
  }
  private createNestedStack({
    appName,
    vpc,
    privateSg,
    dbCluster,
    lambdaLayers,
    api,
    userPool,
    userPoolClient,
    env,
  }: {
    appName: string;
    vpc: cdk.aws_ec2.Vpc;
    privateSg: cdk.aws_ec2.SecurityGroup;
    dbCluster: cdk.aws_rds.ServerlessCluster;
    userPool: cdk.aws_cognito.UserPool;
    userPoolClient: cdk.aws_cognito.UserPoolClient;
    lambdaLayers: cdk.aws_lambda.LayerVersion[];
    api: appsync.GraphqlApi;
    env: EnvVarStack;
  }) {
    // // Create the Lambda functions for each resolver
    const resolvers = getResolverNames();
    console.log("resolvers: ", resolvers);
    new cdk.aws_ec2.InterfaceVpcEndpoint(this, "secrets-manager", {
      service: cdk.aws_ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      vpc,
      privateDnsEnabled: false,
      subnets: { subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [privateSg],
    });
    const numberOfApisEachStack = 50;
    const numberOfNestStacks = Math.ceil(
      resolvers.length / numberOfApisEachStack
    );
    const splitApiArray: ResolverType[][] = [];

    for (let i = 0; i < numberOfNestStacks; i++) {
      splitApiArray.push([]);
    }
    let currentProcessingArrIndex = 0;
    for (let i = 0; i < resolvers.length; i++) {
      splitApiArray[currentProcessingArrIndex].push(resolvers[i]);
      if (
        splitApiArray[currentProcessingArrIndex].length >= numberOfApisEachStack
      ) {
        currentProcessingArrIndex++;
      }
    }
    for (let i = 0; i < splitApiArray.length; i++) {
      let indexNestStack = i + 1;
      new LambdaStack(this, `${appName}-nestedStack-${indexNestStack}`, {
        vpc,
        privateSg,
        lambdaLayers,
        cluster: dbCluster,
        api,
        userPool,
        userPoolClient,
        env,
        appName,
        resolvers: splitApiArray[i],
      });
    }
    const crons = getCronNames();
    new CronStack(this, `${appName}-cronStack`, {
      vpc,
      privateSg,
      lambdaLayers,
      cluster: dbCluster,
      userPool,
      userPoolClient,
      env,
      appName,
      resolvers: crons,
    });
    const customLambdaFunc = getCustomLambFuncs();
    new ApiGateWayStack(this, `${appName}-apiGateWayStack`, {
      vpc,
      privateSg,
      lambdaLayers,
      cluster: dbCluster,
      userPool,
      userPoolClient,
      env,
      appName,
      resolvers: customLambdaFunc,
    });
  }

  private CreateAppSync({
    appName,
    userPool,
  }: {
    appName: string;
    userPool: cdk.aws_cognito.UserPool;
  }): appsync.GraphqlApi {
    // The Lambda authorizer
    // const authorizerLambda = this.createAuthorizerLambda();
    return new appsync.GraphqlApi(this, `${appName}-Api`, {
      name: "graceapp-api",
      schema: appsync.Schema.fromAsset(mergedSdlPath),
      authorizationConfig: {
        defaultAuthorization: {
          // default authorization with api key
          authorizationType: appsync.AuthorizationType.API_KEY,

          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
        additionalAuthorizationModes: [
          // {
          //   authorizationType: appsync.AuthorizationType.LAMBDA,
          //   lambdaAuthorizerConfig: {
          //     handler: authorizerLambda,
          //     resultsCacheTtl: Duration.seconds(300),
          //     validationRegex: '^[a-zA-Z0-9_]+$',
          //   },
          // },
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool,
            },
          },
        ],
      },
      xrayEnabled: true,
    });
  }
}
