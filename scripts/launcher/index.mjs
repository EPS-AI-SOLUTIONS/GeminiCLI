import { createTranslator } from '../i18n.mjs';
import { runCommand } from '../cli-utils.mjs';
import { findPowerShell } from './powershell.mjs';

const main = async () => {
  const { t } = await createTranslator();
  const powerShell = findPowerShell();
  const args = process.argv.slice(2);

  if (powerShell) {
    runCommand(powerShell, ['-NoLogo', '-NoProfile', '-File', './_launcher.ps1', ...args]);
    return;
  }

  console.warn(await t('launcherFallback'));
  console.warn(await t('launcherHint'));
  runCommand(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start']);
};

main();
