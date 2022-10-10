import { parse, visit } from 'graphql';
import fs from 'fs';

const getDirectories = (source: string) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

type ObjectType = {
  name: string;
  fieldNames: string[];
};

export function extractOperationNamesFromSDL({ path }: { path: string }): {
  Queries: string[];
  Mutations: string[];
  Subscriptions: string[];
  Types: ObjectType[];
} {
  // load from a single schema file
  // const schema = await loadSchema(
  //   `${__dirname}/../../api/mergedSchema.graphql`,
  //   {
  //     loaders: [new GraphQLFileLoader()],
  //   },
  // );
  const typeNames = getDirectories('../../apps/lambdas/Type');
  const graphqlString = fs.readFileSync(path, 'utf8');

  const ast = parse(graphqlString);
  const Queries: string[] = [];
  const Mutations: string[] = [];
  const Subscriptions: string[] = [];
  const Types: ObjectType[] = typeNames.map((typeName) => {
    const fieldNames = getDirectories(`../../apps/lambdas/Type/${typeName}`);
    return {
      name: typeName,
      fieldNames,
    };
  });
  visit(ast, {
    // tslint:disable-next-line:function-name
    FieldDefinition: {
      enter(node: any, _key, _parent, _path, ancestors) {
        if (ancestors.find((a: any) => a.name?.value === 'Mutation')) {
          Mutations.push(node.name?.value);
          return undefined;
        }
        if (ancestors.find((a: any) => a.name?.value === 'Subscription')) {
          Subscriptions.push(node.name?.value);
          return undefined;
        }
        if (ancestors.find((a: any) => a.name?.value === 'Query')) {
          Queries.push(node.name?.value);
          return undefined;
        }
        return false;
      },
    },
  });

  return {
    Queries,
    Mutations,
    Subscriptions,
    Types,
  };
}
