/* eslint-disable no-param-reassign */
const axios = require('axios');

// https://api.slack.com/apps/ALZSVTLEL/incoming-webhooks?success=1
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || '';

const getLogStreamURL = ({
  region,
  logGroupName,
  logStreamName,
}: {
  region: string;
  logGroupName: string;
  logStreamName: string;
}): string | null => {
  if (!region || !logGroupName || !logStreamName) return null;
  const logStreamURL = [
    'https://',
    region,
    '.console.aws.amazon.com/cloudwatch/home?region=',
    region,
    '#logsV2:log-groups/log-group/',
    encodeURIComponent(logGroupName),
    '/log-events/',
    encodeURIComponent(logStreamName),
  ].join('');
  return logStreamURL;
};
export const createSlackLogger = ({
  region = 'ap-northeast-1',
  logGroupName,
  logStreamName,
}: {
  region?: string;
  logGroupName?: string;
  logStreamName?: string;
}) => {
  return async ({
    message,
    type = 'INFO',
  }: {
    message: string | object;
    type?: 'INFO' | 'ERROR' | 'WARN';
  }) => {
    let url = SLACK_WEBHOOK;
    let text = message;

    if (typeof message !== 'string') {
      await axios({
        method: 'post',
        url,
        headers: {
          'Content-type': 'application/json',
        },
        data: message,
      });
      return;
    }

    switch (type.toUpperCase()) {
      case 'ERROR':
        text = `❌ ERROR : ${text}`;
        break;
      case 'WARN':
        text = `⚠️  WARN : ${text}`;
        break;
      case 'INFO':
        text = `ℹ️  INFO : ${text}`;
        break;
      default:
        text = `❌ DEFAULT : ${text}`;
        break;
    }

    if (logGroupName && logStreamName) {
      const logStreamURL = getLogStreamURL({
        region,
        logGroupName,
        logStreamName,
      });
      if (logStreamURL) {
        text += `. <${logStreamURL}|Log link>`;
      }
    }

    const data = JSON.stringify({
      text,
    });

    await axios({
      method: 'post',
      url,
      headers: {
        'Content-type': 'application/json',
      },
      data,
    });
  };
};
