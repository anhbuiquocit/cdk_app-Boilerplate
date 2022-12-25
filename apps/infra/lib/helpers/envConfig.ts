import * as cdk from "aws-cdk-lib";
export interface EnvVarStack extends cdk.Environment {
  readonly Environment: string;
}
