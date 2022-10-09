// module.exports = {
//   ...require('config/eslint-next.js'),
//   parserOptions: {
//     tsconfigRootDir: __dirname,
//     project: './tsconfig.json',
//   },
// }

const baseSetting = require('config/eslint.base.js')
module.exports = {
  ...baseSetting,
  rules: {
    ...baseSetting.rules,
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
}
