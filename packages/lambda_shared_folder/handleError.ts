import { createSlackLogger } from 'lambda_shared_folder/sendMessageToSlack';
import lambda from 'aws-lambda';
import { getError } from './getErrorMessage';

// class ApiError extends Error {
//   statusCode: number;
//   constructor(message: string, statusCode: number = 400) {
//     super(message);
//     this.statusCode = statusCode;
//   }
// }

export const createHandlerError =
  (functionName: string) =>
  async ({
    error,
    context,
    sendSlackNotification = true,
  }: {
    error: Error | any;
    sendSlackNotification?: boolean;
    context: lambda.Context;
  }) => {
    if (error instanceof Error) {
      const fullErrorName = `${functionName}_${error.message}`;
      const Environment = process.env.Environment || '';
      if (Environment === 'prod') {
        /* istanbul ignore else */
        if (sendSlackNotification) {
          const { logGroupName, logStreamName } = context;
          const slackLogger = createSlackLogger({
            logGroupName,
            logStreamName,
          });
          await slackLogger({ type: 'ERROR', message: fullErrorName });
        }
      }
    }
    return new Error(getError(error));
  };
