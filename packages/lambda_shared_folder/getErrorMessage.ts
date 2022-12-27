type ErrorMap = {
    code: number;
    message: string;
  };
  
  export const ERROR_MESSAGE: { [name: string]: ErrorMap } = {
    UNKNOWN_ERROR: {
      code: -1,
      message: 'Error',
    },
  };
  
  export function getError(errorKeyMap: string | object | any): string {
    if (typeof errorKeyMap === 'string') {
      const errorObj: ErrorMap = ERROR_MESSAGE[errorKeyMap];
      if (errorObj) {
        return JSON.stringify(errorObj);
      }
    }
    const errMsg = errorKeyMap?.message;
    if (typeof errMsg === 'string') {
      if (errMsg.includes('An account with the given email already exists')) {
        const errorObj = ERROR_MESSAGE['ACCOUNT_IS_EXIST'];
        return JSON.stringify({
          ...errorObj,
          detailError: errMsg,
        });
      }
      const errorObj: ErrorMap = ERROR_MESSAGE[errMsg];
      if (errorObj) {
        return JSON.stringify({
          ...errorObj,
          detailError: errMsg,
        });
      }
    }
    // return JSON.stringify(ERROR_MESSAGE.UNKNOWN_ERROR);
    return JSON.stringify({
      ...ERROR_MESSAGE.UNKNOWN_ERROR,
      detailError: JSON.stringify(errorKeyMap?.message),
    });
  }
  
  export const ERROR_MAP = {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  };
  