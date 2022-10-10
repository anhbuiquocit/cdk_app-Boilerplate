/* eslint-disable no-new */
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import fs from 'fs';

export const PUBLIC_CONFIG_DIR = './public_config';
export const PUBLIC_CONFIG_FILENAME = `${PUBLIC_CONFIG_DIR}/public_config_file.json`;
type PublicConfigDataStructure = {
  [fileName: string]: {
    [key: string]: string;
  };
};
const readPublicConfigJsonFile = (): PublicConfigDataStructure => {
  if (!fs.existsSync(PUBLIC_CONFIG_FILENAME)) {
    return {};
  }
  const rawdata = fs.readFileSync(PUBLIC_CONFIG_FILENAME);
  const jsonData = JSON.parse(rawdata.toString());
  return jsonData;
};

const appendPublicConfigJsonFile = ({
  filename,
  key,
  value,
}: {
  filename: string;
  key: string;
  value: string;
}): void => {
  const currentData = readPublicConfigJsonFile();

  currentData[filename] = {
    [key]: value,
  };

  fs.writeFileSync(PUBLIC_CONFIG_FILENAME, JSON.stringify(currentData));
};

const appendStringToPublicS3 = ({
  filename,
  secretName,
  secretValue,
}: {
  filename: string;
  secretName: string;
  secretValue: string;
}): void => {
  appendPublicConfigJsonFile({
    filename,
    key: secretName,
    value: secretValue,
  });
};

export const saveStringParameter = (
  scope: Construct,
  props: cdk.aws_ssm.StringParameterProps & {
    isPublic?: boolean;
  },
): void => {
  const { parameterName, isPublic } = props;
  if (!parameterName) {
    throw new Error('saveStringParameter : parameterName is required');
  }
  // you can look params at : aws console -> AWS Systems Manager -> Parameter Store
  const ssmParameter = new cdk.aws_ssm.StringParameter(
    scope,
    `${props.parameterName}-Parameter`,
    {
      type: cdk.aws_ssm.ParameterType.STRING,
      tier: cdk.aws_ssm.ParameterTier.STANDARD,
      allowedPattern: '.*',
      ...props,
    },
  );

  new cdk.CfnOutput(scope, `${props.parameterName}-Output`, {
    value: ssmParameter.stringValue,
  });
  if (isPublic) {
    appendStringToPublicS3({
      filename: 'some_filename.json',
      secretName: parameterName,
      secretValue: ssmParameter.stringValue,
    });
  }
};
