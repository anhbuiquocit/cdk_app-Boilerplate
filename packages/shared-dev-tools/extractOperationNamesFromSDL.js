"use strict";
exports.__esModule = true;
exports.extractOperationNamesFromSDL = void 0;
var graphql_1 = require("graphql");
var fs_1 = require("fs");
var getDirectories = function (source) {
    return fs_1["default"].readdirSync(source, { withFileTypes: true })
        .filter(function (dirent) { return dirent.isDirectory(); })
        .map(function (dirent) { return dirent.name; });
};
function extractOperationNamesFromSDL(_a) {
    var path = _a.path;
    // load from a single schema file
    // const schema = await loadSchema(
    //   `${__dirname}/../../api/mergedSchema.graphql`,
    //   {
    //     loaders: [new GraphQLFileLoader()],
    //   },
    // );
    var typeNames = getDirectories('../../apps/lambdas/Type');
    var graphqlString = fs_1["default"].readFileSync(path, 'utf8');
    var ast = (0, graphql_1.parse)(graphqlString);
    // console.log('ast: ', ast);
    var Queries = [];
    var Mutations = [];
    var Subscriptions = [];
    var Types = typeNames.map(function (typeName) {
        var fieldNames = getDirectories("../../apps/lambdas/Type/".concat(typeName));
        return {
            name: typeName,
            fieldNames: fieldNames
        };
    });
    (0, graphql_1.visit)(ast, {
        // tslint:disable-next-line:function-name
        FieldDefinition: {
            enter: function (node, _key, _parent, _path, ancestors) {
                var _a, _b, _c;
                if (ancestors.find(function (a) { var _a; return ((_a = a.name) === null || _a === void 0 ? void 0 : _a.value) === 'Mutation'; })) {
                    Mutations.push((_a = node.name) === null || _a === void 0 ? void 0 : _a.value);
                    return undefined;
                }
                if (ancestors.find(function (a) { var _a; return ((_a = a.name) === null || _a === void 0 ? void 0 : _a.value) === 'Subscription'; })) {
                    Subscriptions.push((_b = node.name) === null || _b === void 0 ? void 0 : _b.value);
                    return undefined;
                }
                if (ancestors.find(function (a) { var _a; return ((_a = a.name) === null || _a === void 0 ? void 0 : _a.value) === 'Query'; })) {
                    Queries.push((_c = node.name) === null || _c === void 0 ? void 0 : _c.value);
                    return undefined;
                }
                return false;
            }
        }
    });
    return {
        Queries: Queries,
        Mutations: Mutations,
        Subscriptions: Subscriptions,
        Types: Types
    };
}
exports.extractOperationNamesFromSDL = extractOperationNamesFromSDL;
