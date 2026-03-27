import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export const Platform = {

  getDataDir(): string {
    const dir = app.getPath('userData');
    const subdirs = ['data', 'strategies', 'themes', 'plugins', 'logs'];
    subdirs.forEach(sub => {
        const subPath = path.join(dir, sub);
        if (!fs.existsSync(subPath)) {
            fs.mkdirSync(subPath, { recursive: true });
        }
    });
    return dir;
  },

  getPythonPath(): string {
    if (app.isPackaged) {
      return path.join(
        process.resourcesPath,
        'python-runtime',
        'darwin',
        'bin',
        'python3'
      );
    }
    const venvPath = path.join(__dirname, '../../../ml-engine/venv/bin/python3');
    if (fs.existsSync(venvPath)) {
      return venvPath;
    }
    return process.env.AXIOM_PYTHON_PATH ?? 'python3';
  },

  getPythonLibPath(): string {
    const srcDir = path.join(__dirname, '../../../ml-engine/src');
    const appDir = path.join(srcDir, 'app');
    const paths = [
      srcDir,
      appDir,
      path.join(appDir, 'services'),
      path.join(appDir, 'utils'),
      path.join(appDir, 'core'),
    ];

    const packagesDir = app.isPackaged
      ? path.join(process.resourcesPath, 'python-runtime', 'packages')
      : paths.join(':');

    const existing = process.env.PYTHONPATH ?? '';
    return existing ? `${packagesDir}:${existing}` : packagesDir;
  },

  isAppleSilicon(): boolean {
    return process.arch === 'arm64';
  },

  prefersDarkMode(): boolean {
    return true; 
  },
};
