import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import fs from 'fs';
import { mergedSdlPath } from '../helpers/resolverList';

const separateSdlPathPattern = `${__dirname}/graphql/**/*.graphql`;
export const mergeGraphqlDefinitions = (): void => {
  const loadedFiles = loadFilesSync(separateSdlPathPattern);
  const typeDefs = mergeTypeDefs(loadedFiles, {
    commentDescriptions: true,
  });
  fs.writeFileSync(mergedSdlPath, typeDefs);
};
