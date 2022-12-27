export const createLogger = (functionName: string) => (...logs: any) => {
    console.log(`${functionName}: `, JSON.stringify({
      ...logs
    }));
  }