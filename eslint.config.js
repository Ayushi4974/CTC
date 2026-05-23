import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // 1. Global Ignores
  {
    ignores: [
      '**/dist/**',
      'dist/**',
      '**/node_modules/**',
      'node_modules/**',
      'admin/dist/**',
      'build/**',
      '**/.git/**',
      'lint_errors.txt'
    ]
  },
  // 2. Client & Admin React/Browser Config
  {
    files: [
      'src/**/*.{js,jsx}', 
      'admin/src/**/*.{js,jsx}', 
      'vite.config.mjs',
      'admin/vite.config.mjs'
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'error',
      'react-hooks/exhaustive-deps': 'off'
    },
  },
  // 3. Server-side Node.js Config
  {
    files: [
      'server/**/*.js', 
      '*.js', // root scripts like test_db.js, add_testing_package.js
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2020,
        ...globals.commonjs,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'commonjs',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off'
    },
  }
];
