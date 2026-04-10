const path = require('path');

const {
  createFlatRuleOperations,
  createRemappedOperation,
  createInstallTargetAdapter,
} = require('./helpers');
const {
  getCursorAwHookSourceRelativeDir,
  getCursorAwHookConfigSourceRelativePath,
  getCursorAwSharedHookSourceRelativeDir,
} = require('../cursor-aw-hook-files');

module.exports = createInstallTargetAdapter({
  id: 'cursor-project',
  target: 'cursor',
  kind: 'project',
  rootSegments: ['.cursor'],
  installStatePathSegments: ['ecc-install-state.json'],
  nativeRootRelativePath: '.cursor',
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
        if (sourceRelativePath === 'rules') {
          return createFlatRuleOperations({
            moduleId: module.id,
            repoRoot,
            sourceRelativePath,
            destinationDir: path.join(targetRoot, 'rules'),
          });
        }

        if (sourceRelativePath === '.cursor') {
          return [
            adapter.createScaffoldOperation(module.id, sourceRelativePath, planningInput),
            createRemappedOperation(
              adapter,
              module.id,
              path.join('scripts', 'hooks'),
              path.join(targetRoot, 'scripts', 'hooks'),
              { strategy: 'sync-root-children' }
            ),
            createRemappedOperation(
              adapter,
              module.id,
              getCursorAwHookSourceRelativeDir(),
              path.join(targetRoot, 'hooks'),
              { strategy: 'sync-root-children' }
            ),
            createRemappedOperation(
              adapter,
              module.id,
              getCursorAwSharedHookSourceRelativeDir(),
              path.join(targetRoot, 'hooks', 'shared'),
              { strategy: 'sync-root-children' }
            ),
            createRemappedOperation(
              adapter,
              module.id,
              getCursorAwHookConfigSourceRelativePath(),
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
