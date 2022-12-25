import * as fs from 'fs';
import * as moment from 'moment';

// create folder api
let type = '';
let apiName = '';

const args = process.argv[process.argv.length - 1].split(':');
type = args[0].toLowerCase();
type = type.charAt(0).toUpperCase() + type.slice(1);
apiName = args[1];
if (
  !(
    type === 'Query' ||
    type === 'Mutation' ||
    type === 'Cron' ||
    type === 'Type'
  )
) {
  throw new Error('Invalid params');
}

let data = `{
  "createdAt": ${moment.utc().valueOf()}
}`;
const cron = ` "cronOptions": {
  "minute": "0",
  "hour": "0",
  "day": "0",
  "month": "1",
  "year": "*"
}`;
if (type === 'Query' || type === 'Mutation') {
  fs.mkdirSync(`../../apps/lambdas/${type}/${apiName}`);
  fs.writeFileSync(`../../apps/lambdas/${type}/${apiName}/index.ts`, '');
  fs.writeFileSync(`../../apps/lambdas/${type}/${apiName}/settings.json`, data);
} else if (type === 'Cron') {
  fs.mkdirSync(`../../apps/lambdas/${type}/${apiName}`);
  fs.writeFileSync(`../../apps/lambdas/${type}/${apiName}/index.ts`, '');
  fs.writeFileSync(
    `../../apps/lambdas/${type}/${apiName}/settings.json`,
    (data + cron).replace(/\}\{/, ','),
  );
} else if (type === 'Type') {
  let typeName = apiName.split('-')[0].toLowerCase();
  const subTypeName = apiName.split('-')[1];
  typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
  const typeIndexPath = `../../apps/lambdas/${type}/${typeName}/${subTypeName}/index.ts`;
  if (fs.existsSync(typeIndexPath)) {
    throw new Error(`${type}/${typeName}/${subTypeName}/index.ts is exist`);
  }
  if (fs.existsSync(`../../apps/lambdas/${type}/${typeName}`)) {
    fs.mkdirSync(`../../apps/lambdas/${type}/${typeName}/${subTypeName}`);
    fs.writeFileSync(
      `../../apps/lambdas/${type}/${typeName}/${subTypeName}/index.ts`,
      '',
    );
    fs.writeFileSync(
      `../../apps/lambdas/${type}/${typeName}/${subTypeName}/settings.json`,
      data,
    );
  } else {
    fs.mkdirSync(`../../apps/lambdas/${type}/${typeName}`);
    fs.mkdirSync(`../../apps/lambdas/${type}/${typeName}/${subTypeName}`);
    fs.writeFileSync(
      `../../apps/lambdas/${type}/${typeName}/${subTypeName}/index.ts`,
      '',
    );
    fs.writeFileSync(
      `../../apps/lambdas/${type}/${typeName}/${subTypeName}/settings.json`,
      data,
    );
  }
}
