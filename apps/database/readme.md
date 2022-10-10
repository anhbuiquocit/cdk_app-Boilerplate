# Database

This is used from infra. But due to prisma we have to place `package.json` in this folder.

## Database operations

1. `cp .env.example .env`
2. deploy database with CDK then add database info. details: https://dev.to/prisma/prisma-migrate-with-aws-aurora-serverless-53g7
3. if you are using bastion, open ssh tunnel to localhost. `ssh -N -L 5432:graceapp-dev-main-datas-graceappauroracluster2c-************.cluster-ct80dgkuohgn.ap-northeast-1.rds.amazonaws.com:5432 ubuntu@54.238.***.211 -i ~/.ssh/graceapp_bastion_dev.pem -v`
4. then use `prisma db ...`


## Release

cdk copies node_modules from here. ( to use prisma client )