import { lambdaLayersConfig } from '../helpers/lambdaLayersConfig';
import { mergeGraphqlDefinitions } from './mergeGraphqlDefinitions';

export const prepareApiStack = async (): Promise<void> => {
  mergeGraphqlDefinitions();
  for (let i = 0; i < Object.keys(lambdaLayersConfig).length; i += 1) {
    const layerName = Object.keys(lambdaLayersConfig)[i];
    const layerConfig = lambdaLayersConfig[layerName];
    if (layerConfig.prepare) {
      // eslint-disable-next-line no-await-in-loop
      await layerConfig.prepare();
    }
  }
};
