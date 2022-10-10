import * as cdk from "aws-cdk-lib";
import { extractOperationNamesFromSDL } from "shared-dev-tools/extractOperationNamesFromSDL";
import { join } from "path";
import fs from "fs";
import { customFunctions } from "../../../lambdas/CustomLambdaFunc/index";

export const mergedSdlPath = `${__dirname}/../api/mergedSchema.graphql`;
type ResolverConfigType = {
  typeName: string;
  fieldName: string;
  policies?: cdk.aws_iam.PolicyStatementProps[];
  // number: number;
  createdAt: number;
};
type CronConfigType = {
  typeName: "Cron";
  fieldName: string;
  cronOptions: cdk.aws_events.CronOptions;
  policies?: cdk.aws_iam.PolicyStatementProps[];
  createdAt: number;
};
type FuncType = {
  funcName: string;
  policies?: cdk.aws_iam.PolicyStatementProps[];
};
const getResolverSourcePath = ({
  typeName,
  fieldName,
  isCustomField = false,
}: {
  typeName: string;
  fieldName: string;
  isCustomField?: boolean;
}): string => {
  if (isCustomField) {
    return join(process.cwd(), `/../lambdas/Type/${typeName}/${fieldName}`);
  }
  return join(process.cwd(), `/../lambdas/${typeName}/${fieldName}`);
};
const getCustomLambdaFuncSourcePath = ({
  funcName,
}: {
  funcName: string;
}): string => {
  return join(process.cwd(), `/../lambdas/CustomLambdaFunc/${funcName}`);
};
const getJsonContent = (path: string): any => {
  const strinContent = fs.readFileSync(path, "utf8");
  return JSON.parse(strinContent);
};
const checkResolverHandlerFileExists = ({
  typeName,
  fieldName,
}: {
  typeName: string;
  fieldName: string;
}): ResolverConfigType => {
  const indexPath = `${getResolverSourcePath({
    typeName,
    fieldName,
    isCustomField:
      typeName !== "Query" &&
      typeName !== "Mutation" &&
      typeName !== "Subscription",
  })}/index.ts`;
  if (!fs.existsSync(indexPath)) {
    throw new Error(`${indexPath} does not exist`);
  }

  const settingPath = `${getResolverSourcePath({
    typeName,
    fieldName,
    isCustomField:
      typeName !== "Query" &&
      typeName !== "Mutation" &&
      typeName !== "Subscription",
  })}/settings.json`;
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingPath)) {
    settings = getJsonContent(settingPath);
    // if (!settings.policies) {
    //   throw new Error(`${settingPath} does not have "policies" key`);
    // }
    if (!settings.createdAt) {
      throw new Error(`${settingPath} does not have "createdAt" key`);
    }
  }
  return {
    typeName,
    fieldName,
    policies: settings.policies || [],
    createdAt: settings.createdAt,
  };
};

const checkCronHandlerFileExists = ({
  typeName,
  fieldName,
}: {
  typeName: "Cron";
  fieldName: string;
}): CronConfigType => {
  const indexPath = `${getResolverSourcePath({
    typeName,
    fieldName,
  })}/index.ts`;
  if (!fs.existsSync(indexPath)) {
    throw new Error(`${indexPath} does not exist`);
  }

  const settingPath = `${getResolverSourcePath({
    typeName,
    fieldName,
  })}/settings.json`;
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingPath)) {
    settings = getJsonContent(settingPath);
    // if (!settings.policies) {
    //   throw new Error(`${settingPath} does not have "policies" key`);
    // }
    if (!settings.createdAt) {
      throw new Error(`${settingPath} does not have "createdAt" key`);
    }
  }
  if (!settings.cronOptions) {
    throw new Error(`${settingPath} does not have "cronOptions" key`);
  }
  return {
    typeName,
    fieldName,
    policies: settings.policies || [],
    cronOptions: settings.cronOptions || {},
    createdAt: settings.createdAt,
  };
};

const getCronOperationNames = (): {
  Crons: string[];
} => {
  let listCrons: string[] = [];
  const dir = join(process.cwd(), `/../lambdas/Cron`);
  if (fs.existsSync(dir)) {
    listCrons = fs.readdirSync(dir);
  }

  return {
    Crons: listCrons,
  };
};

export const getCronNames = (): CronConfigType[] => {
  const { Crons } = getCronOperationNames();
  const resolverList: CronConfigType[] = [];
  Crons.forEach((m) => {
    const res = checkCronHandlerFileExists({
      typeName: "Cron",
      fieldName: m,
    });
    resolverList.push(res);
  });
  return resolverList;
};

// Func handle functionName
const checkCustomLambdaFuncHandlerFileExists = ({
  funcName,
}: {
  funcName: string;
}): FuncType => {
  const indexPath = `${getCustomLambdaFuncSourcePath({
    funcName,
  })}/index.ts`;
  if (!fs.existsSync(indexPath)) {
    throw new Error(`${indexPath} does not exist`);
  }

  const settingPath = `${getCustomLambdaFuncSourcePath({
    funcName,
  })}/settings.json`;
  let settings: Record<string, any> = {};
  if (fs.existsSync(settingPath)) {
    settings = getJsonContent(settingPath);
    if (!settings.policies) {
      throw new Error(`${settingPath} does not have "policies" key`);
    }
  }
  return {
    funcName,
    policies: settings.policies || [],
  };
};

const getCustomLambFuncNames = (): {
  LambdaFunc: string[];
} => {
  return {
    LambdaFunc: customFunctions,
  };
};

export const getCustomLambFuncs = (): FuncType[] => {
  const { LambdaFunc } = getCustomLambFuncNames();
  const funcList: FuncType[] = [];
  LambdaFunc.forEach((m) => {
    const res = checkCustomLambdaFuncHandlerFileExists({
      funcName: m,
    });
    funcList.push(res);
  });
  return funcList;
};
export const getResolverNames = (): ResolverConfigType[] => {
  const { Queries, Mutations, Subscriptions, Types } =
    extractOperationNamesFromSDL({
      path: mergedSdlPath,
    });
  const resolverList: ResolverConfigType[] = [];
  Mutations.forEach((m) => {
    const res = checkResolverHandlerFileExists({
      typeName: "Mutation",
      fieldName: m,
    });
    resolverList.push(res);
  });
  Subscriptions.forEach((s) => {
    const res = checkResolverHandlerFileExists({
      typeName: "Subscription",
      fieldName: s,
    });
    resolverList.push(res);
  });
  Queries.forEach((q) => {
    const res = checkResolverHandlerFileExists({
      typeName: "Query",
      fieldName: q,
    });
    resolverList.push(res);
  });
  Types.forEach((type) => {
    type.fieldNames.forEach((fieldName) => {
      const res = checkResolverHandlerFileExists({
        typeName: type.name,
        fieldName: fieldName,
      });

      resolverList.push(res);
    });
  });

  return resolverList.sort((a, b) => a.createdAt - b.createdAt);
};
