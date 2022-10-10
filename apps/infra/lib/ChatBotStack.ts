// import * as cdk from '@aws-cdk/core';
// import * as lambda from '@aws-cdk/aws-lambda';
// import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
// import * as cwactions from '@aws-cdk/aws-cloudwatch-actions';
// import * as sns from '@aws-cdk/aws-sns';
// import * as iam from '@aws-cdk/aws-iam';
// import * as chatbot from '@aws-cdk/aws-chatbot';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ChatBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda
    const helloworldFn = new cdk.aws_lambda.Function(this, 'sample-lambda', {
      code: new cdk.aws_lambda.AssetCode('./lib/lambda'),
      handler: 'hello-world.handler',
      runtime: cdk.aws_lambda.Runtime.NODEJS_10_X,
    });

    // Lambda Log Group setting
    const metricFilter = helloworldFn.logGroup.addMetricFilter(
      'Keyword Filter',
      {
        metricNamespace: 'chatbot-sample',
        metricName: 'filter-by-keyword',
        filterPattern: { logPatternString: '"HELLO, Slack!"' },
      },
    );

    // Chatbot Role & Policy
    const chatbotRole = new cdk.aws_iam.Role(this, 'chatbot-role', {
      roleName: 'chatbot-sample-role',
      assumedBy: new cdk.aws_iam.ServicePrincipal('sns.amazonaws.com'),
    });

    chatbotRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'cloudwatch:Describe*',
          'cloudwatch:Get*',
          'cloudwatch:List*',
        ],
      }),
    );

    // SNS TOPIC
    const topic = new cdk.aws_sns.Topic(this, 'notification-topic', {
      displayName: 'ChatbotNotificationTopic',
      topicName: 'ChatbotNotificationTopic',
    });

    const alarm = new cdk.aws_cloudwatch.Alarm(this, 'Alarm', {
      metric: metricFilter.metric(),
      actionsEnabled: true,
      threshold: 0,
      evaluationPeriods: 5,
      datapointsToAlarm: 1,
      comparisonOperator:
        cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // 通知さきのトピックを指定
    const action = new cdk.aws_cloudwatch_actions.SnsAction(topic);

    alarm.addAlarmAction(action);

    // Chatbot Slack Notification Integration
    const bot = new cdk.aws_chatbot.CfnSlackChannelConfiguration(
      this,
      'sample-slack-notification',
      {
        configurationName: 'sample-slack-notification',
        iamRoleArn: chatbotRole.roleArn,
        slackChannelId: '<YOUR_CHANNEL_ID>',
        slackWorkspaceId: '<YOUR_WS_ID>',
        snsTopicArns: [topic.topicArn],
      },
    );
    console.log('bot: ', bot.logicalId);
  }
}
