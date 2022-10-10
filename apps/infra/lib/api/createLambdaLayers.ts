import * as cdk from 'aws-cdk-lib';
import { lambdaLayersConfig } from '../helpers/lambdaLayersConfig';

export const createLambdaLayers = ({
  appName,
  apiStack,
}: {
  appName: string;
  apiStack: cdk.Stack;
}): cdk.aws_lambda.LayerVersion[] => {
  const lambdaLayers: cdk.aws_lambda.LayerVersion[] = [];
  for (let i = 0; i < Object.keys(lambdaLayersConfig).length; i += 1) {
    const layerName = Object.keys(lambdaLayersConfig)[i];
    const layerConfig = lambdaLayersConfig[layerName];
    const lambdaLayerAws = new cdk.aws_lambda.LayerVersion(
      apiStack,
      `${appName}-${layerName}`,
      {
        code: cdk.aws_lambda.Code.fromAsset(layerConfig.assetPath),
        compatibleRuntimes: [
          cdk.aws_lambda.Runtime.NODEJS_12_X,
          cdk.aws_lambda.Runtime.NODEJS_14_X,
        ],
        description: layerConfig.description,
      },
    );
    lambdaLayers.push(lambdaLayerAws);
  }
  return lambdaLayers;
};
