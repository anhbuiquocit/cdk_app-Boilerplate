#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DataStack } from "../lib/DataStack";
import { BuildConfig } from "../lib/helpers/buildConfig";
import { NetworkStack } from "../lib/NetworkStack";
import { AuthStack } from "../lib/AuthStack";
import { ApiStack } from "../lib/api/ApiStack";
import { AccountsStack } from "../lib/AccountsStack";
import { StorageStack } from "../lib/StorageStack";
import { CICDInfraStack } from "../lib/CdkPipeLineStack";
import { CdkFrontend } from "../lib/CdkFrontend";

const ensureString = (
  object: { [name: string]: any },
  propName: string
): string => {
  if (!object[propName] || object[propName].trim().length === 0)
    throw new Error(`${propName} does not exist or is empty`);

  return object[propName];
};

const getConfig = (app: cdk.App): BuildConfig => {
  const env = app.node.tryGetContext("config");
  if (!env)
    throw new Error(
      "Context variable missing on CDK command. Pass in as `-c config=XXX`"
    );

  const unparsedEnv = app.node.tryGetContext(env);

  const buildConfig: BuildConfig = {
    AWSAccountID: ensureString(unparsedEnv, "AWSAccountID"),
    App: ensureString(unparsedEnv, "App"),
    Environment: ensureString(unparsedEnv, "Environment"),
    bastionSshKeyName: ensureString(unparsedEnv, "bastionSshKeyName"),
  };

  return buildConfig;
};

const main1 = async (): Promise<void> => {
  const app = new cdk.App();

  const buildConfig = getConfig(app);
  const appName = buildConfig.App;

  cdk.Tags.of(app).add("App", buildConfig.App);
  cdk.Tags.of(app).add("Environment", buildConfig.Environment);

  const mainStackName = `${buildConfig.App}-${buildConfig.Environment}-main`;

  const env = {
    region: app.node.tryGetContext("region"),
    account: buildConfig.AWSAccountID,
    Environment: buildConfig.Environment,
  };
  const networkStack = new NetworkStack(app, `${mainStackName}-NetworkStack`, {
    appName,
    env,
    bastionSshKeyName: buildConfig.bastionSshKeyName,
  });
  const authStack = new AuthStack(app, `${mainStackName}-AuthStack`, {
    appName,
    env,
  });
  const dataStack = new DataStack(app, `${mainStackName}-DataStack`, {
    appName,
    env,
    vpc: networkStack.vpc,
    privateSg: networkStack.privateSg,
  });
  await ApiStack.prepareAndBuild(app, `${mainStackName}-ApiStack`, {
    appName,
    env,
    vpc: networkStack.vpc,
    privateSg: networkStack.privateSg,
    dbCluster: dataStack.dbCluster,
    userPool: authStack.userPool,
    userPoolClient: authStack.userPoolClient,
  });

  AccountsStack.prepareBuild(app, `${mainStackName}-AccountsStack`, {
    appName,
    env,
  });

  // eslint-disable-next-line no-new
  new StorageStack(app, `${mainStackName}-StorageStack`, {
    appName,
    env,
  });

  new CICDInfraStack(app, "CICDInfraStack", {
    appName,
    env,
  });

  new CdkFrontend(app, "CdkFrontend", {
    appName,
    env,
  });
};
main1().catch((err) => {
  console.error(err);
  process.exit(1);
});
