// packages/desktop/scripts/download-python-runtime.js
// Pulls portable Python 3.11 for macOS (indygreg's python-build-standalone)

const fs = require('fs');
const path = require('path');
const https = require('https');
const tar = require('tar');

const RUNTIME_VERSION = '20241016';
const PYTHON_VERSION = '3.11.10';

// Determine architecture (or just pull universal if available)
const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
const URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${RUNTIME_VERSION}/cpython-${PYTHON_VERSION}+${RUNTIME_VERSION}-${arch}-apple-darwin-install_only.tar.gz`;

const targetDir = path.join(__dirname, '../resources/python-runtime/darwin');

async function download() {
  if (fs.existsSync(targetDir)) {
    console.log('Python runtime already exists at:', targetDir);
    return;
  }

  console.log(`Downloading Python ${PYTHON_VERSION} for ${arch} from ${URL}...`);
  
  if (!fs.existsSync(path.dirname(targetDir))) {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  }

  const tarPath = path.join(__dirname, 'python-runtime.tar.gz');
  const { execSync } = require('child_process');

  try {
    // SECURITY: Use curl which follows redirects and is more robust for large binaries
    execSync(`curl -L -o "${tarPath}" "${URL}"`, { stdio: 'inherit' });
    console.log('Download complete. Extracting...');
    
    fs.mkdirSync(targetDir, { recursive: true });
    
    const tar = require('tar');
    await tar.x({
      file: tarPath,
      cwd: targetDir,
      strip: 1
    });
    
    fs.unlinkSync(tarPath);
    console.log('Extraction complete. Installing dependencies...');
    
    // --- Dependency Installation ---
    const pythonExe = path.join(targetDir, 'bin/python3');
    const reqPath = path.resolve(__dirname, '../../ml-engine/requirements.txt');
    const targetLib = path.join(targetDir, '../packages'); // Folder Platform.ts expects
    
    if (!fs.existsSync(targetLib)) fs.mkdirSync(targetLib, { recursive: true });
    
    console.log(`Running: ${pythonExe} -m pip install -r ${reqPath} --target ${targetLib}`);
    execSync(`"${pythonExe}" -m pip install --upgrade pip`, { stdio: 'inherit' });
    execSync(`"${pythonExe}" -m pip install -r "${reqPath}" --target "${targetLib}"`, { stdio: 'inherit' });
    console.log('Dependencies bundled successfully.');
    
    console.log('Python runtime ready.');
  } catch (err) {
    if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
    console.error('Setup failed:', err.message);
    process.exit(1);
  }
}

download().catch(console.error);
