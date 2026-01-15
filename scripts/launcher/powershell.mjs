import { commandExists } from '../cli-utils.mjs';

export const findPowerShell = () => {
  const candidates = ['pwsh', 'powershell'];
  for (const candidate of candidates) {
    if (commandExists(candidate)) {
      return candidate;
    }
  }
  return null;
};
