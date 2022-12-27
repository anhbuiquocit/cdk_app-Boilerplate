import { createLogger } from 'lambda_shared_folder/logger';
import { createHandlerError } from 'lambda_shared_folder/handleError';
const functionName = 'Functest';
const logger = createLogger(functionName);
const handlerError = createHandlerError(functionName);

export const handler = async (event, context) => {
    try{

        logger('event are', event, context);
        console.log(event);
        console.log(context);
        return 'this is tesst function';
    }catch(error: any){
        throw await handlerError({
            error,
            context,
          });
      
    }
}