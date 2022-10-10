export interface BuildConfig {
  readonly AWSAccountID: string;
  readonly bastionSshKeyName: string;
  // readonly AWSProfileName: string;
  // readonly AWSProfileRegion: string;

  readonly App: string;
  readonly Environment: string;
  readonly tempIotCoreThingCertificateArn: string;
  readonly iotDataEndpoint: string;
}

export interface BuildParameters {
  readonly LambdaInsightsLayer: string;
  readonly SomeExternalApiUrl: string;
}
