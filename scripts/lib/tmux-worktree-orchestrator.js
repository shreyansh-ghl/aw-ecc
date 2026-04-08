'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function renderTemplate(template, variables) {
  return String(template).replace(/\{([^}]+)\}/g, (match, variableName) => {
    if (!Object.prototype.hasOwnProperty.call(variables, variableName)) {
      throw new Error(`Unknown template variable: ${variableName}`);
    }

    return String(variables[variableName]);
  });
}

function normalizeSeedPaths(seedPaths, repoRoot) {
  const normalized = [];
  const absoluteRepoRoot = path.resolve(repoRoot);

  for (const rawSeedPath of seedPaths || []) {
    if (typeof rawSeedPath !== 'string') {
      continue;
    }

    const trimmed = rawSeedPath.trim();
    if (!trimmed) {
      continue;
    }

    const resolvedPath = path.resolve(absoluteRepoRoot, trimmed);
    const relativePath = path.relative(absoluteRepoRoot, resolvedPath);
    if (!relativePath || relativePath === '.') {
      throw new Error('Seed paths must point to files or directories inside repoRoot');
    }

    const escapesRepo =
      relativePath.startsWith(`..${path.sep}`) ||
      relativePath === '..' ||
      path.isAbsolute(relativePath);
    if (escapesRepo) {
      throw new Error(`Seed path must stay inside repoRoot: ${rawSeedPath}`);
    }

    normalized.push(relativePath.split(path.sep).join('/'));
  }

  return [...new Set(normalized)];
}

function ensureUniqueWorkerSlugs(workerPlans) {
  const slugs = new Set();

  for (const workerPlan of workerPlans) {
    if (slugs.has(workerPlan.workerSlug)) {
      throw new Error('Worker names must resolve to unique slugs');
    }
    slugs.add(workerPlan.workerSlug);
  }
}

function normalizeMaxParallelWorkers(options, workerCount) {
  const rawValue = options.maxParallelWorkers ?? options.max_parallel_workers;
  if (rawValue === null || rawValue === undefined) {
    return workerCount;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error('maxParallelWorkers must be a positive integer');
  }

  return parsedValue;
}

function chunkWorkerPlans(workerPlans, maxParallelWorkers) {
  const waves = [];

  for (let index = 0; index < workerPlans.length; index += maxParallelWorkers) {
    waves.push(workerPlans.slice(index, index + maxParallelWorkers));
  }

  return waves;
}

function buildWaveLaunchCommand({ command, waitForSignals, completionSignal }) {
  const shellSteps = [];

  for (const signal of waitForSignals) {
    shellSteps.push(`tmux wait-for ${shellQuote(signal)}`);
  }

  shellSteps.push(command);
  shellSteps.push(`tmux wait-for -S ${shellQuote(completionSignal)}`);

  return `sh -lc ${shellQuote(shellSteps.join(' ; '))}`;
}

function buildWorkerTemplateVariables(workerPlan) {
  return {
    worker_name: workerPlan.workerName,
    worker_name_sh: shellQuote(workerPlan.workerName),
    worker_slug: workerPlan.workerSlug,
    worker_slug_sh: shellQuote(workerPlan.workerSlug),
    repo_root: workerPlan.repoRoot,
    repo_root_sh: shellQuote(workerPlan.repoRoot),
    worktree_path: workerPlan.worktreePath,
    worktree_path_sh: shellQuote(workerPlan.worktreePath),
    task_file: workerPlan.taskFilePath,
    task_file_sh: shellQuote(workerPlan.taskFilePath),
    handoff_file: workerPlan.handoffFilePath,
    handoff_file_sh: shellQuote(workerPlan.handoffFilePath),
    status_file: workerPlan.statusFilePath,
    status_file_sh: shellQuote(workerPlan.statusFilePath),
    coordination_dir: workerPlan.coordinationDir,
    coordination_dir_sh: shellQuote(workerPlan.coordinationDir),
    branch_name: workerPlan.branchName,
    branch_name_sh: shellQuote(workerPlan.branchName),
  };
}

function buildOrchestrationPlan(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const sessionName = slugify(options.sessionName);
  const baseRef = options.baseRef || 'HEAD';
  const coordinationRoot = path.resolve(options.coordinationRoot || path.join(repoRoot, '.orchestration'));
  const coordinationDir = path.join(coordinationRoot, sessionName);
  const workers = Array.isArray(options.workers) ? options.workers : [];
  const maxParallelWorkers = normalizeMaxParallelWorkers(options, workers.length);

  if (!sessionName) {
    throw new Error('sessionName is required');
  }

  if (workers.length === 0) {
    throw new Error('buildOrchestrationPlan requires at least one worker');
  }

  if (!options.launcherCommand) {
    throw new Error('launcherCommand is required');
  }

  const globalSeedPaths = normalizeSeedPaths(options.seedPaths || [], repoRoot);
  const workerPlans = workers.map((worker) => {
    const workerSlug = slugify(worker.name);
    if (!workerSlug) {
      throw new Error('Each worker must have a non-empty name');
    }

    const branchName = `orchestrator-${sessionName}-${workerSlug}`;
    const worktreePath = path.join(
      path.dirname(repoRoot),
      `${path.basename(repoRoot)}-${sessionName}-${workerSlug}`
    );
    const workerDir = path.join(coordinationDir, workerSlug);
    const taskFilePath = path.join(workerDir, 'task.md');
    const handoffFilePath = path.join(workerDir, 'handoff.md');
    const statusFilePath = path.join(workerDir, 'status.md');
    const seedPaths = [
      ...globalSeedPaths,
      ...normalizeSeedPaths(worker.seedPaths || [], repoRoot),
    ];

    const workerPlan = {
      workerName: worker.name,
      workerSlug,
      completionSignal: `${sessionName}-${workerSlug}-done`,
      repoRoot,
      baseRef,
      coordinationDir,
      workerDir,
      task: worker.task || '',
      seedPaths: [...new Set(seedPaths)],
      branchName,
      worktreePath,
      taskFilePath,
      handoffFilePath,
      statusFilePath,
      gitArgs: ['worktree', 'add', '-b', branchName, worktreePath, baseRef],
    };

    workerPlan.rawLaunchCommand = renderTemplate(
      options.launcherCommand,
      buildWorkerTemplateVariables(workerPlan)
    );

    return workerPlan;
  });

  ensureUniqueWorkerSlugs(workerPlans);

  const workerWaves = chunkWorkerPlans(workerPlans, maxParallelWorkers);
  workerWaves.forEach((wave, waveIndex) => {
    const waitForSignals = waveIndex === 0
      ? []
      : workerWaves[waveIndex - 1].map((workerPlan) => workerPlan.completionSignal);

    wave.forEach((workerPlan) => {
      workerPlan.waveIndex = waveIndex;
      workerPlan.waitForSignals = waitForSignals;
      workerPlan.launchCommand = buildWaveLaunchCommand({
        command: workerPlan.rawLaunchCommand,
        waitForSignals,
        completionSignal: workerPlan.completionSignal,
      });
    });
  });

  const bannerCommand = `printf '%s\\n' ${shellQuote(`Session: ${sessionName}`)} ${shellQuote(`Coordination: ${coordinationDir}`)}`;
  const tmuxCommands = [
    { program: 'tmux', args: ['new-session', '-d', '-s', sessionName, '-c', repoRoot] },
    { program: 'tmux', args: ['send-keys', '-t', `${sessionName}:0.0`, bannerCommand, 'Enter'] },
  ];

  workerPlans.forEach((workerPlan, index) => {
    if (index === 0) {
      tmuxCommands.push({
        program: 'tmux',
        args: ['send-keys', '-t', `${sessionName}:0.0`, workerPlan.launchCommand, 'Enter'],
      });
      return;
    }

    tmuxCommands.push({
      program: 'tmux',
      args: ['split-window', '-t', `${sessionName}:0`, '-c', workerPlan.worktreePath],
    });
    tmuxCommands.push({
      program: 'tmux',
      args: ['send-keys', '-t', `${sessionName}:0.${index}`, workerPlan.launchCommand, 'Enter'],
    });
  });

  if (workerPlans.length > 1) {
    tmuxCommands.push({
      program: 'tmux',
      args: ['select-layout', '-t', `${sessionName}:0`, 'tiled'],
    });
  }

  return {
    repoRoot,
    baseRef,
    sessionName,
    coordinationRoot,
    coordinationDir,
    maxParallelWorkers,
    launcherCommand: options.launcherCommand,
    replaceExisting: Boolean(options.replaceExisting),
    workers,
    workerPlans,
    workerWaves,
    tmuxCommands,
  };
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function materializePlan(plan) {
  fs.mkdirSync(plan.coordinationDir, { recursive: true });

  for (const workerPlan of plan.workerPlans) {
    fs.mkdirSync(workerPlan.workerDir, { recursive: true });

    writeFile(
      workerPlan.taskFilePath,
      [
        `# Worker Task: ${workerPlan.workerName}`,
        '',
        '## Objective',
        workerPlan.task || 'No objective provided.',
        '',
        '## Constraints',
        '- Work only inside this worktree.',
        '- Report results in your final response.',
        '- Do not spawn subagents or external agents for this task.',
        '',
        '## Seed Paths',
        ...(workerPlan.seedPaths.length > 0 ? workerPlan.seedPaths.map((seedPath) => `- ${seedPath}`) : ['- none']),
        '',
      ].join('\n')
    );

    writeFile(
      workerPlan.handoffFilePath,
      [
        `# Handoff: ${workerPlan.workerName}`,
        '',
        '- Summary: pending',
        '- Validation: pending',
        '- Remaining Risks: pending',
        '',
      ].join('\n')
    );

    writeFile(
      workerPlan.statusFilePath,
      [
        `# Status: ${workerPlan.workerName}`,
        '',
        '- state: planned',
        `- branch: ${workerPlan.branchName}`,
        `- worktree: ${workerPlan.worktreePath}`,
        '',
      ].join('\n')
    );
  }

  writeFile(
    path.join(plan.coordinationDir, 'plan.json'),
    `${JSON.stringify(
      {
        sessionName: plan.sessionName,
        repoRoot: plan.repoRoot,
        coordinationDir: plan.coordinationDir,
        maxParallelWorkers: plan.maxParallelWorkers,
        workerWaves: plan.workerWaves.map((wave) => wave.map((workerPlan) => workerPlan.workerSlug)),
        workers: plan.workerPlans.map((workerPlan) => ({
          workerSlug: workerPlan.workerSlug,
          branchName: workerPlan.branchName,
          worktreePath: workerPlan.worktreePath,
          waveIndex: workerPlan.waveIndex,
        })),
      },
      null,
      2
    )}\n`
  );
}

function overlaySeedPaths({ repoRoot, seedPaths, worktreePath }) {
  for (const seedPath of normalizeSeedPaths(seedPaths, repoRoot)) {
    const sourcePath = path.join(repoRoot, seedPath);
    const destinationPath = path.join(worktreePath, seedPath);
    const sourceStat = fs.statSync(sourcePath);

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    if (sourceStat.isDirectory()) {
      fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function runCommand(program, args, options = {}) {
  try {
    const stdout = execFileSync(program, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      status: typeof error.status === 'number' ? error.status : 1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
    };
  }
}

function rollbackCreatedResources(plan, createdState, dependencies = {}) {
  const runCommandImpl = dependencies.runCommand || runCommand;

  if (createdState.sessionCreated) {
    runCommandImpl('tmux', ['kill-session', '-t', plan.sessionName], { cwd: plan.repoRoot });
  }

  for (const workerPlan of [...createdState.workerPlans].reverse()) {
    runCommandImpl('git', ['worktree', 'remove', '--force', workerPlan.worktreePath], {
      cwd: plan.repoRoot,
    });
    runCommandImpl('git', ['branch', '-D', workerPlan.branchName], { cwd: plan.repoRoot });
  }
}

function executePlan(plan, dependencies = {}) {
  const runCommandImpl = dependencies.runCommand || runCommand;
  const spawnSyncImpl = dependencies.spawnSync || spawnSync;
  const materializePlanImpl = dependencies.materializePlan || materializePlan;
  const overlaySeedPathsImpl = dependencies.overlaySeedPaths || overlaySeedPaths;
  const rollbackCreatedResourcesImpl =
    dependencies.rollbackCreatedResources ||
    ((currentPlan, createdState) => rollbackCreatedResources(currentPlan, createdState, { runCommand: runCommandImpl }));

  const createdState = {
    sessionCreated: false,
    workerPlans: [],
  };

  try {
    const gitCheck = runCommandImpl('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: plan.repoRoot,
    });
    if (gitCheck.status !== 0 || String(gitCheck.stdout).trim() !== 'true') {
      throw new Error('repoRoot must be inside a git work tree');
    }

    const tmuxCheck = runCommandImpl('tmux', ['-V'], { cwd: plan.repoRoot });
    if (tmuxCheck.status !== 0) {
      throw new Error('tmux is required to execute orchestration plans');
    }

    const existingSession = spawnSyncImpl('tmux', ['has-session', '-t', plan.sessionName], {
      cwd: plan.repoRoot,
      encoding: 'utf8',
    });
    if (existingSession.status === 0 && !plan.replaceExisting) {
      throw new Error(`tmux session already exists: ${plan.sessionName}`);
    }

    materializePlanImpl(plan);

    for (const workerPlan of plan.workerPlans) {
      const worktreeResult = runCommandImpl('git', workerPlan.gitArgs, { cwd: plan.repoRoot });
      if (worktreeResult.status !== 0) {
        throw new Error(worktreeResult.stderr || `Failed to create worktree for ${workerPlan.workerName}`);
      }

      createdState.workerPlans.push(workerPlan);

      if (workerPlan.seedPaths.length > 0) {
        overlaySeedPathsImpl({
          repoRoot: plan.repoRoot,
          seedPaths: workerPlan.seedPaths,
          worktreePath: workerPlan.worktreePath,
        });
      }
    }

    for (const command of plan.tmuxCommands) {
      const result = runCommandImpl(command.program, command.args, { cwd: plan.repoRoot });
      if (result.status !== 0) {
        throw new Error(result.stderr || `Failed to run ${command.program} ${command.args.join(' ')}`);
      }

      if (command.program === 'tmux' && command.args[0] === 'new-session') {
        createdState.sessionCreated = true;
      }
    }

    return plan;
  } catch (error) {
    rollbackCreatedResourcesImpl(plan, createdState);
    throw error;
  }
}

module.exports = {
  slugify,
  renderTemplate,
  buildOrchestrationPlan,
  executePlan,
  materializePlan,
  normalizeSeedPaths,
  overlaySeedPaths,
  rollbackCreatedResources,
};
