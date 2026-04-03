#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error(
    'Usage: node skills/aw-execute/scripts/build-worker-bundle.js --feature <slug> --tasks-file <path> [--output <path>] [--allow-parallel]'
  );
}

function parseArgs(argv) {
  const args = {
    allowParallel: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--allow-parallel') {
      args.allowParallel = true;
      continue;
    }

    if (!current.startsWith('--')) {
      throw new Error(`Unexpected argument: ${current}`);
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${current}`);
    }

    if (current === '--feature') {
      args.featureSlug = next;
    } else if (current === '--tasks-file') {
      args.tasksFile = next;
    } else if (current === '--output') {
      args.output = next;
    } else {
      throw new Error(`Unknown argument: ${current}`);
    }

    index += 1;
  }

  if (!args.featureSlug || !args.tasksFile) {
    usage();
    throw new Error('--feature and --tasks-file are required');
  }

  return args;
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function parseTaskUnits(content) {
  const units = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:- \[[ xX]\]|-|\*|\d+\.)\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const title = match[1].trim();
    if (!title) {
      continue;
    }

    units.push(title);
  }

  if (units.length === 0) {
    throw new Error('No task units found in tasks file');
  }

  return units;
}

function buildRolePrompt({ roleGuide, featureSlug, taskUnitTitle, tasksFilePath, roleName }) {
  return [
    `Load role guide: ${roleGuide}`,
    `Feature slug: ${featureSlug}`,
    `Task unit: ${taskUnitTitle}`,
    `Approved task source: ${tasksFilePath}`,
    `Role: ${roleName}`,
    'Stay within the repo-local AW execute contract and keep the scope bounded.',
  ].join('\n');
}

function buildBundle({ featureSlug, tasksFilePath, allowParallel, repoRoot }) {
  const taskUnits = parseTaskUnits(fs.readFileSync(tasksFilePath, 'utf8'));
  const referencePaths = {
    implementer: 'skills/aw-execute/references/worker-implementer.md',
    spec_reviewer: 'skills/aw-execute/references/worker-spec-reviewer.md',
    quality_reviewer: 'skills/aw-execute/references/worker-quality-reviewer.md',
    parallel_worker: 'skills/aw-execute/references/worker-parallel-worker.md',
  };

  const relativeTasksFile = toPosixPath(path.relative(repoRoot, tasksFilePath) || path.basename(tasksFilePath));
  const bundle = {
    schema_version: 'aw.execute.worker-bundle.v1',
    feature_slug: featureSlug,
    generated_at: new Date().toISOString(),
    source_tasks_file: relativeTasksFile,
    role_reference_paths: referencePaths,
    task_units: taskUnits.map((title, index) => {
      const taskUnitId = `task-${index + 1}`;
      const parallelCandidate = allowParallel && taskUnits.length > 1;

      const taskUnit = {
        id: taskUnitId,
        title,
        parallel_candidate: parallelCandidate,
        roles: {
          implementer: {
            reference_path: referencePaths.implementer,
            prompt: buildRolePrompt({
              roleGuide: referencePaths.implementer,
              featureSlug,
              taskUnitTitle: title,
              tasksFilePath: relativeTasksFile,
              roleName: 'implementer',
            }),
          },
          spec_reviewer: {
            reference_path: referencePaths.spec_reviewer,
            prompt: buildRolePrompt({
              roleGuide: referencePaths.spec_reviewer,
              featureSlug,
              taskUnitTitle: title,
              tasksFilePath: relativeTasksFile,
              roleName: 'spec_reviewer',
            }),
          },
          quality_reviewer: {
            reference_path: referencePaths.quality_reviewer,
            prompt: buildRolePrompt({
              roleGuide: referencePaths.quality_reviewer,
              featureSlug,
              taskUnitTitle: title,
              tasksFilePath: relativeTasksFile,
              roleName: 'quality_reviewer',
            }),
          },
        },
      };

      if (parallelCandidate) {
        taskUnit.roles.parallel_worker = {
          reference_path: referencePaths.parallel_worker,
          prompt: buildRolePrompt({
            roleGuide: referencePaths.parallel_worker,
            featureSlug,
            taskUnitTitle: title,
            tasksFilePath: relativeTasksFile,
            roleName: 'parallel_worker',
          }),
        };
      }

      return taskUnit;
    }),
    orchestration_plan: allowParallel
      ? {
          sessionName: `aw-execute-${featureSlug}`,
          repoRoot,
          baseRef: 'HEAD',
          seedPaths: [
            'skills/aw-execute/scripts/build-worker-bundle.js',
            ...Object.values(referencePaths),
          ],
          launcherCommand: 'codex exec --skip-git-repo-check "$(cat {task_file_sh})"',
          workers: taskUnits.map((title, index) => ({
            name: `implementer-task-${index + 1}`,
            task: buildRolePrompt({
              roleGuide: referencePaths.parallel_worker,
              featureSlug,
              taskUnitTitle: title,
              tasksFilePath: relativeTasksFile,
              roleName: 'parallel_worker',
            }),
          })),
        }
      : null,
  };

  return bundle;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.cwd();
    const tasksFilePath = path.resolve(repoRoot, args.tasksFile);
    const outputPath = args.output ? path.resolve(repoRoot, args.output) : null;
    const bundle = buildBundle({
      featureSlug: args.featureSlug,
      tasksFilePath,
      allowParallel: args.allowParallel,
      repoRoot,
    });

    const payload = `${JSON.stringify(bundle, null, 2)}\n`;
    if (outputPath) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, payload, 'utf8');
    } else {
      process.stdout.write(payload);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
