import aws from 'aws-sdk';
// import { CognitoUserPool } from 'amazon-cognito-identity-js';
import {
    APIGatewayProxyEventV2,
    AppSyncIdentityCognito,
    AppSyncResolverEvent,
  } from 'aws-lambda';
  
aws.config.update({
    region: process.env.MAIL_REGION,
  });
  
//   let userPool: CognitoUserPool;
  const isAppSyncIdentityCognito = (
    identity: any,
  ): identity is AppSyncIdentityCognito => {
    return 'groups' in identity;
  };
  export type EventLambda = APIGatewayProxyEventV2 & {
    arguments: any;
    identity: any;
  };
  export const getCognitoIdentity = (
    event: AppSyncResolverEvent<any, Record<string, any> | null>,
  ): AppSyncIdentityCognito => {
    const { identity } = event;
    if (!identity) {
      throw new Error('UNAUTHENTICATED');
    }
    if (!isAppSyncIdentityCognito(identity)) {
      throw new Error('WRONG_IDENTITY_TYPE');
    }
    return identity;
  };
  export const getCognitoUsername = (
    event: AppSyncResolverEvent<any, Record<string, any> | null>,
  ): string => {
    const identity = getCognitoIdentity(event);
    const { username } = identity;
    return username;
  };
  export const getCognitoUserGroups = (
    event: AppSyncResolverEvent<any, Record<string, any> | null>,
  ): string[] => {
    const identity = getCognitoIdentity(event);
    const { claims } = identity;
    const userGroups: string[] = claims['cognito:groups'];
    return userGroups;
  };
  
  export const isAdminUser = (
    event: AppSyncResolverEvent<any, Record<string, any> | null>,
  ) => {
    return getCognitoUserGroups(event).includes('ADMIN');
  };
  