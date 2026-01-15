import { spawn, spawnSync } from 'node:child_process';

export const commandExists = (command, args = ['-v']) => {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return result.status === 0;
};

export const runCommand = (command, args) => {
  const child = spawn(command, args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
};
