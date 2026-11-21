// Import boundaries (docs/architecture.md). The rules are the same in meritum-frontend,
// meritum-extension and meritum-mocks; only `repo` below differs.
// Run: pnpm depcruise (CI: verify job).
const repo = {
  roots: ['src'], // folders to cruise
  domainRoot: 'src', // domains live in <domainRoot>/<domain>/ with index.ts as their API
  // Folders under domainRoot that are not domains: imported directly.
  notDomains: ['components', 'contracts', 'copy', 'lib', 'routes', 'styles'],
  // Code that may use frameworks and build adapters: entry point, routes, UI, the
  // meritum-backend HTTP client (src/api, an outbound adapter) and factories.
  wiring: [
    '^src/main\\.tsx$',
    '^src/routes/',
    '^src/components/',
    '^src/api/',
    '(^|/)factory\\.tsx?$',
  ],
  frameworks: ['react', 'react-dom', '@tanstack', 'radix-ui'],
  excluded: ['^src/routeTree\\.gen\\.ts$'], // generated
}

// Matches the package folder also inside pnpm's node_modules/.pnpm/<pkg>/node_modules/.
const npm = (names) => `node_modules/(${names.join('|')})/`

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Cycles hide which module owns a concept.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-private-import',
      severity: 'error',
      comment: 'A _private.ts file is imported only from its own folder (rule 2).',
      from: { path: '^(.*)/[^/]+$' },
      to: { path: '(^|/)_[^/]+$', pathNot: '^$1/_[^/]+$' },
    },
    {
      name: 'no-deep-domain-import',
      severity: 'error',
      comment: 'Another domain is imported only through its index.ts (rule 1).',
      from: { path: `^${repo.domainRoot}/([^/]+)/` },
      to: {
        path: `^${repo.domainRoot}/[^/]+/.+`,
        pathNot: [
          `^${repo.domainRoot}/$1/`,
          `^${repo.domainRoot}/[^/]+/index\\.tsx?$`,
          `^${repo.domainRoot}/(${repo.notDomains.join('|')})/`,
        ],
      },
    },
    {
      name: 'adapters-only-from-factory',
      severity: 'error',
      comment: 'Only a factory (or the app wiring) builds adapters (rule 3).',
      from: { pathNot: repo.wiring },
      to: { path: '(^|/)adapters/' },
    },
    {
      name: 'domain-without-frameworks',
      severity: 'error',
      comment: 'Domain code depends on ports, not on frameworks (rule 3).',
      from: { path: `^${repo.domainRoot}/`, pathNot: repo.wiring },
      to: { path: npm(repo.frameworks), dependencyTypesNot: ['type-only'] },
    },
  ],
  options: {
    includeOnly: repo.roots.map((root) => `^${root}/`).concat('node_modules'),
    exclude: { path: repo.excluded },
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.app.json' },
    parser: 'swc', // TypeScript 7.0 has no compiler API dependency-cruiser can use yet
  },
}
