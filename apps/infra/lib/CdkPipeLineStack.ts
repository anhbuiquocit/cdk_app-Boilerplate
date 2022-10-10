import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BuildSpec,
  ComputeType,
  LinuxBuildImage,
  PipelineProject,
} from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
  CodeCommitSourceAction,
  S3DeployAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

interface CICDProps extends StackProps {
  appName: string;
  env: cdk.Environment & {
    Environment: string;
  };
}

export class CICDInfraStack extends Stack {
  constructor(scope: Construct, id: string, props: CICDProps) {
    super(scope, id, props);

    const { appName, env } = props;
    // Define  context
    const reponame = this.node.tryGetContext('reponame') || 'grace-web';
    const prd_branchname = this.node.tryGetContext('prd_branch') || 'develop';
    // const dev_branchname = this.node.tryGetContext('dev_branch') || 'develop';
    // const dev_gw_branchname =
    //   this.node.tryGetContext('dev_rk_branch') || 'develop-rk';
    const storybook_branchname =
      this.node.tryGetContext('storybook_branch') || 'storybook';

    // Connect to codecommit repository
    const repo = codecommit.Repository.fromRepositoryName(
      this,
      'Import Codecommit repo',
      reponame,
    );

    const WEB_BUCKET_PRD = s3.Bucket.fromBucketName(
      this,
      `${appName}-${env.Environment}-web-s3-bucket`,
      `${appName}-${env.Environment}-web-s3-bucket`,
    );
    // const WEB_BUCKET_DEV_GW = s3.Bucket.fromBucketName(this, `${appName}-dev-gw-s3-bucket`, `${appName}-dev-gw-s3-bucket`)

    const ARTIFACT_BUCKET = new s3.Bucket(
      this,
      `${appName}-${env.Environment}-artifact-s3-bucket`,
      {
        bucketName: `${appName}-${env.Environment}-artifact-s3-bucket`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        versioned: false,
        publicReadAccess: false,
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      },
    );

    // Build project backend for product environtment
    const buildbackend = new PipelineProject(
      this,
      `Build-Deploy-backend-${env.Environment}-project`,
      {
        projectName: `Build-Deploy-backend-${env.Environment}-project`,
        buildSpec: BuildSpec.fromSourceFilename(
          'buildspec/backend-product-environment-buildspec.yml',
        ),
        environment: {
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
          computeType: ComputeType.SMALL,
          privileged: true,
        },
      },
    );
    buildbackend.addToRolePolicy(
      new iam.PolicyStatement({ resources: ['*'], actions: ['*'] }),
    );


    // Build project web prd environment
    const buildweb = new PipelineProject(
      this,
      `Build-web-${env.Environment}-project`,
      {
        projectName: `Build-web-${env.Environment}-project`,
        buildSpec: BuildSpec.fromSourceFilename(
          'buildspec/web-product-buildspec.yml',
        ),
        environment: {
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
          computeType: ComputeType.SMALL,
          privileged: true,
        },
      },
    );
    WEB_BUCKET_PRD.grantReadWrite(buildweb.grantPrincipal);

  // build storybook for product environtment
  const buildStorybook = new PipelineProject(
    this,
    `Build-storybook-${env.Environment}-project`,
    {
      projectName: `Build-storybook-${env.Environment}-project`,
      buildSpec: BuildSpec.fromSourceFilename(
        'buildspec/storybook-product-environtment-buildspec.yml',
      ),
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
    },
  );

    // Create Artifact Output
    const prd_sourceOutput = new Artifact('prd_sourceOutput');

    const storybook_sourceOutput = new Artifact('storybook_sourceOutput');

    const prd_buildwebOutput = new Artifact('prd_buildwebOutput');
    const prd_buildStorybookOutput = new Artifact('prd_buildStorybookOutput');

    new Pipeline(this, 'web_pipeline_product', {
      pipelineName: 'web_pipeline_product',
      stages: [
        {
          // Create source stage
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'Source',
              output: prd_sourceOutput,
              repository: repo,
              branch: prd_branchname,
            }),
          ],
        },
        {
          // Create Build Test Deploy backend and Build web FE
          stageName: 'Build-test-deploy-backend-and-web',
          actions: [
            new CodeBuildAction({
              actionName: 'Build-test-deploy-backend-action',
              input: prd_sourceOutput,
              project: buildbackend,
              environmentVariables: {
                ACCESS_KEY: {
                  value: '/cdk-grace-bank/ACCESS_KEY',
                  type: cdk.aws_codebuild.BuildEnvironmentVariableType
                    .PARAMETER_STORE,
                },
                SECRET_KEY: {
                  value: '/cdk-grace-bank/SECRET_KEY',
                  type: cdk.aws_codebuild.BuildEnvironmentVariableType
                    .PARAMETER_STORE,
                },
              },
            }),
            new CodeBuildAction({
              actionName: 'Build-web-project',
              input: prd_sourceOutput,
              project: buildweb,
              outputs: [prd_buildwebOutput],
            }),
          ],
        },

        // Deploy web FE to S3
        {
          stageName: 'Deploy-web-project',
          actions: [
            new S3DeployAction({
              actionName: 'Deploy_to_S3',
              input: prd_buildwebOutput,
              bucket: WEB_BUCKET_PRD,
            }),
          ],
        },
      ],
      artifactBucket: ARTIFACT_BUCKET,
    });


    // pipeline storybook prod enviroment

    new Pipeline(this, 'web_pipeline_storybook', {
      pipelineName: 'web_pipeline_storybook',
      stages: [
        {
          // Create source stage
          stageName: 'Source',
          actions: [
            new CodeCommitSourceAction({
              actionName: 'Source',
              output: storybook_sourceOutput,
              repository: repo,
              branch: storybook_branchname,
            }),
          ],
        },
        {
          // Create Build Test Deploy storybook
          stageName: 'Build-deploy-storybook',
          actions: [
            new CodeBuildAction({
              actionName: 'Build-storybook-project',
              input: storybook_sourceOutput,
              project: buildStorybook,
              outputs: [prd_buildStorybookOutput],
            }),
          ],
        },
        // Deploy web FE to S3
        {
          stageName: 'Deploy-storybook-project',
          actions: [
            new S3DeployAction({
              actionName: 'Deploy_storybook_to_S3',
              input: prd_buildStorybookOutput,
              bucket: WEB_BUCKET_PRD,
            }),
          ],
        },
      ],
      artifactBucket: ARTIFACT_BUCKET,
    });
  }
}
