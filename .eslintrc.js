module.exports = {
  extends: ['next/core-web-vitals'],
  env: {
    node: true,
    browser: true,
  },
  globals: {
    REACT_APP_ENV: true,
  },
  rules: {
    'import/no-anonymous-default-export': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    '@next/next/no-img-element': 'warn',
  },
}
