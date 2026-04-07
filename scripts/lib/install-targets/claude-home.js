const path = require('path');

const {
  createInstallTargetAdapter,
  createRemappedOperation,
} = require('./helpers');
const {
  getClaudeAwHookConfigSourceRelativePath,
} = require('../claude-aw-hook-files');

module.exports = createInstallTargetAdapter({
  id: 'claude-home',
  target: 'claude',
  kind: 'home',
  rootSegments: ['.claude'],
  installStatePathSegments: ['ecc', 'install-state.json'],
  nativeRootRelativePath: '.claude-plugin',
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
        if (sourceRelativePath === 'hooks') {
          return [
            adapter.createScaffoldOperation(module.id, sourceRelativePath, planningInput),
            createRemappedOperation(
              adapter,
              module.id,
              getClaudeAwHookConfigSourceRelativePath(),
              path.join(targetRoot, 'hooks', 'hooks.json'),
              { strategy: 'flatten-copy' }
            ),
          ];
        }

        return [adapter.createScaffoldOperation(module.id, sourceRelativePath, planningInput)];
      });
    });
  },
});
