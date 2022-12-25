/* eslint-disable max-lines */
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
// import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import { saveStringParameter } from "./helpers/saveStringParameter";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import path from "path";
import { EnvVarStack } from "./helpers/envConfig";

const cognitoGroups = ["USER", "ADMIN"];
interface AuthStackProps extends cdk.StackProps {
  appName: string;
  env: EnvVarStack;
}
export class AuthStack extends cdk.Stack {
  public readonly userPoolClient: cdk.aws_cognito.UserPoolClient;

  public readonly userPool: cdk.aws_cognito.UserPool;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    const { appName, env } = props;

    this.userPool = this.createCognitoUserPool({ appName });
    this.userPoolClient = this.createCognitoUserPoolClient({
      appName,
      userPool: this.userPool,
    });

    saveStringParameter(this, {
      parameterName: `/${appName}/${env.Environment}/UserPoolId`,
      stringValue: this.userPool.userPoolId,
    });
    saveStringParameter(this, {
      parameterName: `/${appName}/${env.Environment}/UserPoolClientId`,
      stringValue: this.userPoolClient.userPoolClientId,
    });
    const cognitoMaillerFunc = new NodejsFunction(this, "autoConfirmUser", {
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      handler: "autoConfirmUser",
      entry: path.join(
        __dirname,
        `../../lambdas/CognitoTriggers/autoConfirmUser/index.ts`
      ),
      environment: {
        Environment: env.Environment || "",
      },
    });
    this.userPool.addTrigger(
      cognito.UserPoolOperation.PRE_SIGN_UP,
      cognitoMaillerFunc
    );
  }

  private createCognitoUserPool({
    appName,
  }: {
    appName: string;
  }): cdk.aws_cognito.UserPool {
    // 👇 User Pool
    const userPool = new cdk.aws_cognito.UserPool(this, `${appName}-pool`, {
      userPoolName: `${appName}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: false,
        // phone: false,
      },
      standardAttributes: {
        givenName: {
          required: false,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        firstName: new cdk.aws_cognito.StringAttribute({
          mutable: true,
        }),
        lastName: new cdk.aws_cognito.StringAttribute({ mutable: true }),
        firstNameKana: new cdk.aws_cognito.StringAttribute({
          mutable: true,
        }),
        lastNameKana: new cdk.aws_cognito.StringAttribute({ mutable: true }),
        isAdmin: new cdk.aws_cognito.StringAttribute({
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cdk.aws_cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    for (let i = 0; i < cognitoGroups.length; i += 1) {
      const cognitoGroup = cognitoGroups[i];

      // eslint-disable-next-line no-new
      new cdk.aws_cognito.CfnUserPoolGroup(
        this,
        `cognito_group_${cognitoGroup}`,
        {
          groupName: cognitoGroup,
          userPoolId: userPool.userPoolId,
        }
      );
    }
    return userPool;
  }

  private createCognitoUserPoolClient({
    appName,
    userPool,
  }: {
    appName: string;
    userPool: cdk.aws_cognito.UserPool;
  }): cdk.aws_cognito.UserPoolClient {
    // 👇 User Pool Client attributes
    const standardCognitoAttributes = {
      email: true,
      givenName: true,
      familyName: true,
      emailVerified: true,
      address: true,
      birthdate: true,
      gender: true,
      locale: true,
      middleName: true,
      fullname: true,
      nickname: true,
      phoneNumber: true,
      phoneNumberVerified: true,
      profilePicture: true,
    };

    const clientReadAttributes =
      new cdk.aws_cognito.ClientAttributes().withStandardAttributes({
        ...standardCognitoAttributes,
      });

    // // 👇 User Pool Client
    const userPoolClient = new cdk.aws_cognito.UserPoolClient(
      this,
      `${appName}-userpool-client`,
      {
        userPool,
        authFlows: {
          custom: true,
          userSrp: true,
        },
        supportedIdentityProviders: [
          cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
        readAttributes: clientReadAttributes,
        accessTokenValidity: cdk.Duration.days(1),
        refreshTokenValidity: cdk.Duration.days(30),
        idTokenValidity: cdk.Duration.days(1),
      }
    );
    return userPoolClient;
  }
}
