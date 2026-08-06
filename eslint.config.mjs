import nextConfig from 'eslint-config-next';

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...nextConfig,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-img-element': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
];

export default eslintConfig;
