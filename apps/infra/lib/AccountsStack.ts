import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { saveStringParameter } from "./helpers/saveStringParameter";

interface AccountsStackProps extends cdk.StackProps {
  appName: string;
  env: cdk.Environment & {
    Environment: string;
  };
}

export class AccountsStack extends cdk.Stack {
  public static prepareBuild(
    scope: Construct,
    id: string,
    props: AccountsStackProps
  ): AccountsStack {
    const instance = new AccountsStack(scope, id, props);
    const { appName, env } = props;
    // 👇 create IAM User
    AccountsStack.createMobileAppLogAccount(appName, instance, env);
    return instance;
  }

  private static createMobileAppLogAccount(
    appName: string,
    instance: AccountsStack,
    env: cdk.Environment & {
      Environment: string;
    }
  ): void {
    const runnerUserName = `${appName}-mobile-logger`;
    const user = new cdk.aws_iam.User(instance, runnerUserName);

    const policy = new cdk.aws_iam.ManagedPolicy(
      instance,
      `${appName}-${env.Environment}-MobileLoggerAccountManagedPolicy`,
      {
        statements: [
          new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            actions: ["logs:PutLogEvents"],
            resources: ["*"],
          }),
        ],
        // roles: [role],
      }
    );
    // 👇 create an IAM group
    const group = new cdk.aws_iam.Group(
      instance,
      `${appName}-mobile-log-group`,
      {
        managedPolicies: [
          //   cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'),
          policy,
        ],
      }
    );
    // 👇 add the User to the group
    group.addUser(user);

    // Either use roles property inside ManagedPolicy or use attachToRole below,
    // Both will yield the same result
    // Creates a managed policy and then attaches the policy to role

    // policy.attachToRole(role);

    // const myUserName = 'my-user-name';
    // const user = new cdk.aws_iam.User(instance, 'myUser', {
    //   userName: myUserName,
    // });

    AccountsStack.createCloudwatchLogGroup({
      scope: instance,
      logGroupName: `web-logs-grace-dev-gw`,
    });
    AccountsStack.createCloudwatchLogGroup({
      scope: instance,
      logGroupName: `web-logs-grace-gw`,
    });

    const accessKey = new cdk.aws_iam.CfnAccessKey(
      instance,
      "mobileLogAccountAccessKey",
      {
        userName: user.userName,
      }
    );
    saveStringParameter(instance, {
      parameterName: `/${appName}/${env.Environment}-MobileLoggeraccount/SecretAccessKey`,
      stringValue: accessKey.attrSecretAccessKey,
    });
    saveStringParameter(instance, {
      parameterName: `/${appName}/${env.Environment}-MobileLoggeraccount/AccessKeyId`,
      stringValue: accessKey.ref,
    });
  }

  private static createCloudwatchLogGroup({
    logGroupName,
    scope,
  }: {
    logGroupName: string;
    scope: Construct;
  }): void {
    const appLogGroup = new cdk.aws_logs.LogGroup(
      scope,
      `${logGroupName}-group`,
      {
        logGroupName,
        retention: cdk.aws_logs.RetentionDays.THREE_MONTHS,
      }
    );
    [
      "Info",
      "ScreenTracking",
      "Action",
      "GraphQLError",
      "Error",
      "SlackError",
      "NetworkRequest",
    ].forEach((streamName) => {
      const logStreamName = `${logGroupName}-${streamName}-stream`;
      // eslint-disable-next-line no-new
      new cdk.aws_logs.LogStream(scope, logStreamName, {
        logGroup: appLogGroup,
        // the properties below are optional
        logStreamName,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    });
  }
}
