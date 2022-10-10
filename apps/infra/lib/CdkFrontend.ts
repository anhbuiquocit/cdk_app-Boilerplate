import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  ViewerCertificate,
  ViewerProtocolPolicy,
  PriceClass,
  OriginAccessIdentity,
  FunctionCode,
  // HttpVersion,
} from 'aws-cdk-lib/aws-cloudfront';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  CfnByteMatchSet,
  // CfnByteMatchSet,
  CfnIPSet,
  CfnRule,
  CfnWebACL,
} from 'aws-cdk-lib/aws-waf';

interface CICDProps extends StackProps {
  appName: string;
  env: cdk.Environment & {
    Environment: string;
    ARN_ACM_CLOUDFRONT: string;
  };
}

export class CdkFrontend extends Stack {
  constructor(scope: Construct, id: string, props: CICDProps) {
    super(scope, id, props);

    const { appName, env } = props;
    // bucket for dev-gw environment
    const WEB_BUCKET = new s3.Bucket(
      this,
      `${appName}-${env.Environment}-web-s3-bucket`,
      {
        bucketName: `${appName}-${env.Environment}-web-s3-bucket`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        versioned: false,
        publicReadAccess: false,
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      },
    );

    // create policy for dev-gw environment
    const accessIdentity_web = new OriginAccessIdentity(
      this,
      `CloudfrontAccess_web_${env.Environment}`,
      {
        comment: `OAI-${WEB_BUCKET.bucketName}`,
      },
    );
    const cloudfrontUserAccessPolicy_web = new PolicyStatement();
    cloudfrontUserAccessPolicy_web.addActions('s3:GetObject');
    cloudfrontUserAccessPolicy_web.addPrincipals(
      accessIdentity_web.grantPrincipal,
    );
    cloudfrontUserAccessPolicy_web.addResources(WEB_BUCKET.arnForObjects('*'));
    WEB_BUCKET.addToResourcePolicy(cloudfrontUserAccessPolicy_web);

    // Cloudfront distribution for web admin
    const ROOT_INDEX_FILE = 'grace-app/index.html';
    const ROOT_INDEX_FILE_STORYBOOK = 'storybook/index.html';
    // 👇 Point to certificate ARN
    const cert = Certificate.fromCertificateArn(
      this,
      'WebCert',
      `${env.ARN_ACM_CLOUDFRONT}`,
    );

    // 👇 Create WAF IP list
    const listip = new CfnIPSet(this, 'listip', {
      name: 'listip',
      ipSetDescriptors: [
        {
          type: 'IPV4',
          value: ' 106.72.42.1/32',
        },
        {
          type: 'IPV4',
          value: '153.240.149.130/32',
        },
        {
          type: 'IPV4',
          value: '60.157.85.161/32',
        },
        {
          type: 'IPV4',
          value: '113.185.47.240/32',
        },
        {
          type: 'IPV4',
          value: '118.70.146.171/32',
        },
        {
          type: 'IPV4',
          value: '222.252.25.178/32',
        },
        {
          type: 'IPV4',
          value: '118.21.134.211/32',
        },
        {
          type: 'IPV4',
          value: '113.20.108.37/32',
        },
        {
          type: 'IPV4',
          value: '203.136.39.154/32',
        },
        {
          type: 'IPV4',
          value: '118.70.184.62/32',
        },
        {
          type: 'IPV4',
          value: '101.99.14.10/32',
        },
        {
          type: 'IPV6',
          value: '2400:4050:2560:8f00:b077:7b2f:e1d2:f639/128',
        },
        {
          type: 'IPV6',
          value: '2400:4050:2560:8f00:c03a:d05c:4b0:44a7/128',
        },
        {
          type: 'IPV6',
          value: '2400:4050:2560:8f00::/64',
        },
      ],
    });

    // 👇 Create WAF String Match
    const path = new CfnByteMatchSet(this, 'path', {
      name: 'path',
      byteMatchTuples: [
        {
          fieldToMatch: {
            type: 'URI',
          },
          positionalConstraint: 'STARTS_WITH',
          textTransformation: 'LOWERCASE',
          targetString: '/admin',
        },
      ],
    });
    // 👇 Create WAF Rule
    const rule = new CfnRule(this, 'rule', {
      metricName: 'rule',
      name: 'rule',
      predicates: [
        {
          dataId: listip.ref,
          negated: true,
          type: 'IPMatch',
        },
        {
          dataId: path.ref,
          negated: false,
          type: 'ByteMatch'
        }
      ],
    });

    // 👇 Create WAF WebACL
    const CloudfrontWebACL = new CfnWebACL(this, 'cloudfrontWebACL', {
      name: 'cloudfrontWebACL',
      // scope: "CLOUDFRONT",
      defaultAction: { type: 'ALLOW' },
      metricName: 'cloudfrontWebACL',
      rules: [
        {
          priority: 0,
          ruleId: rule.ref,
          action: {
            type: 'BLOCK',
          },
        },
      ],
    });

    // 👇 Cloudfront function
    const cloudfront_web_index_func = new cloudfront.Function(
      this,
      'cloudfront_web_index_func',
      {
        code: FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var uri = request.uri;
          
          // Check whether the URI is missing a file name.
          if (uri.endsWith('/')) {
              request.uri += 'index.html';
          } 
          // Check whether the URI is missing a file extension.
          else if (!uri.includes('.')) {
              request.uri += '/index.html';
          }
          return request;
        }
      `),
        comment: 'Redirect to index.html at subfolder level',
        functionName: 'cloudfront_web_index_func',
      },
    );

    // create cloudfront for environment
    const cloudfront_web = new cloudfront.CloudFrontWebDistribution(
      this,
      `CfDistribution_web_${env.Environment}`,
      {
        comment: `Cloudfront for ${env.Environment} environment`,
        viewerCertificate: ViewerCertificate.fromAcmCertificate(cert, {
          aliases: ['gg.gracebank.jp'],
        }),
        defaultRootObject: ROOT_INDEX_FILE,
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        // viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        //   httpVersion: HttpVersion.HTTP2,
        priceClass: PriceClass.PRICE_CLASS_100, // the cheapest
        webACLId: CloudfrontWebACL.ref,
        originConfigs: [
          {
            s3OriginSource: {
              originAccessIdentity: accessIdentity_web,
              s3BucketSource: WEB_BUCKET,
            },
            behaviors: [
              {
                compress: true,
                isDefaultBehavior: true,
                functionAssociations: [
                  {
                    function: cloudfront_web_index_func,
                    eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                  },
                ],
              },
            ],
          },
        ],
        errorConfigurations: [
          {
            errorCode: 403,
            errorCachingMinTtl: 10,
            responsePagePath: '/grace-app/index.html',
            responseCode: 200,
          },
        ],
      },
    );
    const cloudfront_storybook = new cloudfront.CloudFrontWebDistribution(
      this,
      `CfDistribution_storybook_${env.Environment}`,
      {
        comment: `Cloudfront for storybook ${env.Environment} environment`,
        // viewerCertificate: ViewerCertificate.fromAcmCertificate(cert, {
        //   aliases: ['staging.gracebank.jp'],
        // }),
        defaultRootObject: ROOT_INDEX_FILE_STORYBOOK,
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        // viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        //   httpVersion: HttpVersion.HTTP2,
        priceClass: PriceClass.PRICE_CLASS_100, // the cheapest
        originConfigs: [
          {
            s3OriginSource: {
              originAccessIdentity: accessIdentity_web,
              s3BucketSource: WEB_BUCKET,
            },
            behaviors: [
              {
                compress: true,
                isDefaultBehavior: true,
                pathPattern: 'storybook/*',
              },
            ],
          },
        ],
        errorConfigurations: [
          {
            errorCode: 403,
            errorCachingMinTtl: 10,
            responsePagePath: '/storybook/index.html',
            responseCode: 200,
          },
        ],
      },
    );

    // create cfnoutput for web
    new CfnOutput(this, `web ${env.Environment} Address`, {
      value: cloudfront_web.distributionDomainName,
    });
    // create cfnoutput for storybook
    new CfnOutput(this, `storybook ${env.Environment} Address`, {
      value: cloudfront_storybook.distributionDomainName,
    });
  }
}
