import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const _cache: Record<string, string> = {};

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
    if (_cache.pythonPath) return _cache.pythonPath;

    let resolvedPath: string;
    if (app.isPackaged) {
      const archPath = process.arch === 'arm64' ? 'arm64' : 'x64';
      resolvedPath = path.join(
        process.resourcesPath,
        'python-runtime',
        'darwin',
        archPath,
        'bin',
        'python3'
      );
    } else {
      const venvPath = path.join(__dirname, '../../../ml-engine/venv/bin/python3');
      resolvedPath = fs.existsSync(venvPath) ? venvPath : (process.env.AXIOM_PYTHON_PATH ?? 'python3');
    }

    _cache.pythonPath = resolvedPath;
    return resolvedPath;
  },

  getPythonLibPath(): string {
    if (_cache.pythonLibPath) return _cache.pythonLibPath;

    const srcDir = path.join(__dirname, '../../../ml-engine/src');
    const appDir = path.join(srcDir, 'app');
    const paths = [
      srcDir,
      appDir,
      path.join(appDir, 'services'),
      path.join(appDir, 'utils'),
      path.join(appDir, 'core'),
    ];

    const archPath = process.arch === 'arm64' ? 'arm64' : 'x64';
    const packagesDir = app.isPackaged
      ? path.join(process.resourcesPath, 'python-runtime', 'darwin', 'packages-' + archPath)
      : paths.join(':');

    const existing = process.env.PYTHONPATH ?? '';
    const resolvedPath = existing ? `${packagesDir}:${existing}` : packagesDir;
    
    _cache.pythonLibPath = resolvedPath;
    return resolvedPath;
  },

  isAppleSilicon(): boolean {
    return process.arch === 'arm64';
  },

  prefersDarkMode(): boolean {
    return true; 
  },
};
