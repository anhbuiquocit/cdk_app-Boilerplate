export const getResolverBuildPath = ({
  typeName,
  fieldName,
  isType = false
}: {
  typeName: string;
  fieldName: string;
  isType?: boolean;
}): string => {
  if (isType) {
    return `build/lambdas/Type/${typeName}/${fieldName}`
  }
  return `build/lambdas/${typeName}/${fieldName}`
};
