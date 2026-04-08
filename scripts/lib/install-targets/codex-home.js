const path = require('path');

const {
  createInstallTargetAdapter,
  createRemappedOperation,
} = require('./helpers');
const {
  getCodexAwHookConfigSourceRelativePath,
  getCodexAwHookSourceRelativeDir,
} = require('../codex-aw-hook-files');

module.exports = createInstallTargetAdapter({
  id: 'codex-home',
  target: 'codex',
  kind: 'home',
  rootSegments: ['.codex'],
  installStatePathSegments: ['ecc-install-state.json'],
  nativeRootRelativePath: '.codex',
  planOperations(input, adapter) {
    const modules = Array.isArray(input.modules)
      ? input.modules
      : (input.module ? [input.module] : []);
    const {
      repoRoot,
      projectRoot,
      homeDir,
    } = input;
    const planningInput = {
      repoRoot,
      projectRoot,
      homeDir,
    };
    const targetRoot = adapter.resolveRoot(planningInput);

    return modules.flatMap(module => {
      const paths = Array.isArray(module.paths) ? module.paths : [];
      return paths.flatMap(sourceRelativePath => {
        if (sourceRelativePath === '.codex') {
          return [
            adapter.createScaffoldOperation(module.id, sourceRelativePath, planningInput),
            createRemappedOperation(
              adapter,
              module.id,
              getCodexAwHookSourceRelativeDir(),
              path.join(targetRoot, 'hooks'),
              { strategy: 'sync-root-children' }
            ),
            createRemappedOperation(
              adapter,
              module.id,
              getCodexAwHookConfigSourceRelativePath(),
              path.join(targetRoot, 'hooks.json'),
              { strategy: 'flatten-copy' }
            ),
          ];
        }

        return [adapter.createScaffoldOperation(module.id, sourceRelativePath, planningInput)];
      });
    });
  },
});
