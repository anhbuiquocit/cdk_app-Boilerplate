import { AppSyncResolverHandler } from 'aws-lambda';
import { createLogger } from 'lambda_shared_folder/logger';
// import { createHandlerError } from 'lambda_shared_folder/handleError';

const functionName = 'userMe';
// const handlerError = createHandlerError(functionName);
const logger = createLogger(functionName);

export const handler: AppSyncResolverHandler<null,string> = async (event, context) => {
    logger('event are', event, context);
    return 'Hello world'
}

