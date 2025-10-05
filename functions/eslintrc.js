module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    'eslint:recommended',
    'google',
  ],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    'quotes': ['error', 'single', {allowTemplateLiterals: true}],
    'max-len': ['error', {code: 100, ignoreStrings: true, ignoreTemplateLiterals: true}],
    'object-curly-spacing': ['error', 'never'],
    'indent': ['error', 2],
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};