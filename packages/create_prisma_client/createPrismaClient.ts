import { PrismaClient } from '@prisma/client';
import { SecretsManager } from 'aws-sdk';

const sm = new SecretsManager();
let prisma: PrismaClient;
let url: string;

export const getPrismaClient = async () => {
  if (prisma) return prisma;

  const dbURL = await sm
    .getSecretValue({
      SecretId: process.env.SECRET_ID || '',
    })
    .promise();
  const secretString = JSON.parse(dbURL.SecretString || '{}');
  url = `postgresql://${secretString.username}:${secretString.password}@${secretString.host}:${secretString.port}/${secretString.dbname}?connection_limit=1`;
  // url = `postgresql://${secretString.username}:${secretString.password}@ec2-35-77-230-172.ap-northeast-1.compute.amazonaws.com:6432/${secretString.dbname}?pgbouncer=true&connection_limit=100&pool_timeout=0`;
  prisma = new PrismaClient({
    datasources: { db: { url } },
  });
  return prisma;
};
