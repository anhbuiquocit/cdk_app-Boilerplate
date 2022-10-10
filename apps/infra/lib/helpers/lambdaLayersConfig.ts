import fs from 'fs-extra';
import glob from 'glob';
import { execSync } from 'node:child_process';
import path from 'path';

const prismaClientBuildPath = 'build/lambda-layers-prisma-client';

const copyPrismaEngines = async (): Promise<void> => {
  fs.removeSync(prismaClientBuildPath);
  fs.copySync(
    '../../node_modules/.prisma/client',
    `${prismaClientBuildPath}/nodejs/node_modules/.prisma/client`,
    { dereference: true },
  );
  fs.copySync(
    '../../node_modules/@prisma',
    `${prismaClientBuildPath}/nodejs/node_modules/@prisma`,
    { dereference: true },
  );
  // glob
  //   .sync('../database/node_modules/.prisma/client/libquery_engine-rhel-*')
  //   .forEach(async (file) => {
  //     const filename = path.basename(file);
  //     fs.copySync(file, `/tmp/${filename}`);
  //   });
  glob
    .sync('../../node_modules/.prisma/client/libquery_engine-linux-arm64-*')
    .forEach(async (file) => {
      const filename = path.basename(file);
      fs.copySync(file, `/tmp/${filename}`);
    });
  glob
    .sync(
      `${prismaClientBuildPath}/nodejs/node_modules/.prisma/client/libquery_engine-*`,
    )
    .forEach(async (file) => {
      fs.removeSync(file);
    });
  glob
    .sync(
      `${prismaClientBuildPath}/nodejs/node_modules/prisma/libquery_engine-*`,
    )
    .forEach(async (file) => {
      fs.removeSync(file);
    });

  fs.removeSync(`${prismaClientBuildPath}/nodejs/node_modules/@prisma/engines`);
  // glob.sync('/tmp/libquery_engine-rhel-*').forEach(async (file) => {
  //   const filename = path.basename(file);
  //   fs.copySync(
  //     file,
  //     `build/lambda-layers-prisma-client/nodejs/node_modules/.prisma/client/${filename}`,
  //   );
  // });
  glob.sync('/tmp/libquery_engine-linux-arm64-*').forEach(async (file) => {
    const filename = path.basename(file);
    fs.copySync(
      file,
      `build/lambda-layers-prisma-client/nodejs/node_modules/.prisma/client/${filename}`,
    );
  });
};

export const lambdaLayersConfig: Record<
  string,
  {
    prepare?: () => Promise<void>;
    assetPath: string;
    description: string;
  }
> = {
  createPrismaClient: {
    assetPath: 'build/create_prisma_client',
    description: 'creates prisma client',
  },
  prismaLibrary: {
    prepare: copyPrismaEngines,
    assetPath: prismaClientBuildPath,
    // destroy: async () => {},
    description: '3rd party prisma client',
  },
  externalLibraries: {
    prepare: async () => {
      let command = 'echo "start external libraries prep"';
      // assume we are in apps/infra directory. move to packages/external_libraries
      command += '\\n && cd ../../packages/external_libraries ';

      // install node modules. cannot use yarn, cuz it willl intsall workplace
      command += '\\n && npm install';

      execSync(command, {
        stdio: 'inherit',
      });
      // copy node modules
      fs.copySync(
        '../../packages/external_libraries/node_modules',
        'build/external_libraries/nodejs/node_modules',
        {
          dereference: true,
        },
      );
    },
    assetPath: 'build/external_libraries',
    description: '3rd party shared external libraires',
  },
  sharedCode: {
    assetPath: 'build/lambda_shared_folder',
    description: 'shared code of all lambdas',
  },
};
