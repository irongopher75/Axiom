// packages/desktop/scripts/download-python-runtime.js
// Pulls portable Python 3.11 for macOS (indygreg's python-build-standalone)
// Supports UNIVERSAL builds by bundling both x86_64 and aarch64

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RUNTIME_VERSION = '20241016';
const PYTHON_VERSION = '3.11.10';

const ARCHS = [
  { id: 'x86_64', label: 'x64' },
  { id: 'aarch64', label: 'arm64' }
];

async function setupArch(archInfo) {
  const { id: arch, label: folder } = archInfo;
  const targetDir = path.join(__dirname, `../resources/python-runtime/darwin/${folder}`);
  const URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${RUNTIME_VERSION}/cpython-${PYTHON_VERSION}+${RUNTIME_VERSION}-${arch}-apple-darwin-install_only.tar.gz`;
  const tarPath = path.join(__dirname, `python-runtime-${folder}.tar.gz`);

  if (fs.existsSync(targetDir)) {
    console.log(`[${folder}] Python runtime already exists at: ${targetDir}`);
    return;
  }

  console.log(`[${folder}] Downloading Python ${PYTHON_VERSION} from ${URL}...`);
  
  if (!fs.existsSync(path.dirname(targetDir))) {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  }

  try {
    // SECURITY: Use curl which follows redirects and is more robust for large binaries
    execSync(`curl -L -o "${tarPath}" "${URL}"`, { stdio: 'inherit' });
    console.log(`[${folder}] Download complete. Extracting...`);
    
    fs.mkdirSync(targetDir, { recursive: true });
    
    const tar = require('tar');
    await tar.x({
      file: tarPath,
      cwd: targetDir,
      strip: 1
    });
    
    fs.unlinkSync(tarPath);
    console.log(`[${folder}] Extraction complete. Installing dependencies...`);
    
    // --- Dependency Installation ---
    const pythonExe = path.join(targetDir, 'bin/python3');
    const reqPath = path.resolve(__dirname, '../../ml-engine/requirements.txt');
    const targetLib = path.join(targetDir, '../../packages'); // Shared packages folder
    
    if (!fs.existsSync(targetLib)) fs.mkdirSync(targetLib, { recursive: true });
    
    console.log(`[${folder}] Running: ${pythonExe} -m pip install -r requirements.txt`);
    execSync(`"${pythonExe}" -m pip install --upgrade pip`, { stdio: 'inherit' });
    
    // Note: --target makes it arch-agnostic if only pure python, but some libs are binary.
    // For true universal, we might need separate package folders per arch if there are binary wheels.
    // For now, we'll use a shared folder and hope scikit-learn/pandas handle it or we use universal wheels.
    // Actually, scikit-learn is binary. Let's use separate package folders.
    const archSpecificLib = path.join(targetDir, '../packages-' + folder);
    if (!fs.existsSync(archSpecificLib)) fs.mkdirSync(archSpecificLib, { recursive: true });

    execSync(`"${pythonExe}" -m pip install -r "${reqPath}" --target "${archSpecificLib}"`, { stdio: 'inherit' });
    console.log(`[${folder}] Dependencies bundled successfully.`);
    
    // --- Pruning ---
    console.log(`[${folder}] Pruning runtime to reduce bundle size...`);
    pruneRuntime(targetDir);
    
  } catch (err) {
    if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
    console.error(`[${folder}] Setup failed:`, err.message);
    throw err;
  }
}

function pruneRuntime(runtimePath) {
  const toDelete = [
    'lib/python3.11/test',
    'lib/python3.11/idlelib',
    'lib/python3.11/turtledemo',
    'lib/python3.11/tkinter',
    'lib/python3.11/ensurepip',
    'share',
    'include',
    'bin/python3-config',
    'bin/2to3',
    'bin/idle3'
  ];

  toDelete.forEach(relPath => {
    const fullPath = path.join(runtimePath, relPath);
    if (fs.existsSync(fullPath)) {
      console.log(`  Deleting ${relPath}...`);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  });

  // Remove all __pycache__ and .pyc files
  const { execSync } = require('child_process');
  try {
    execSync(`find "${runtimePath}" -name "__pycache__" -type d -exec rm -rf {} +`, { stdio: 'ignore' });
    execSync(`find "${runtimePath}" -name "*.pyc" -delete`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors from find
  }
}

async function main() {
  console.log('Starting Universal Python Runtime Setup...');
  for (const arch of ARCHS) {
    await setupArch(arch);
  }
  console.log('Universal Python runtime ready.');
}

main().catch(err => {
  console.error('Global setup failed:', err);
  process.exit(1);
});
