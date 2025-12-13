const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- STARTING CROSS-PLATFORM BUILD ---');

const run = (cmd, cwd) => {
    console.log(`> Running: ${cmd} in ${cwd || '.'}`);
    execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'inherit' });
};

try {
    // 1. Install Frontend
    console.log('\n[1/5] Installing Frontend Dependencies...');
    run('npm install --production=false', 'frontend');

    // 2. Build Frontend
    console.log('\n[2/5] Building Frontend...');
    run('npm run build', 'frontend');

    // 3. Install Backend
    console.log('\n[3/5] Installing Backend Dependencies...');
    run('npm install', 'backend');

    // 4. Clean Public Dir
    console.log('\n[4/5] Cleaning Target Directory...');
    const publicDir = path.join(__dirname, 'backend', 'public');
    if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicDir, { recursive: true });

    // 5. Copy Files
    console.log('\n[5/5] Copying Assets...');
    const distDir = path.join(__dirname, 'frontend', 'dist');
    if (!fs.existsSync(distDir)) {
        throw new Error('Frontend build failed: dist directory missing!');
    }

    // Recursive copy (Node 16.7+)
    fs.cpSync(distDir, publicDir, { recursive: true });

    console.log('\n--- BUILD SUCCESSFUL ---');

} catch (err) {
    console.error('\n!!! BUILD FAILED !!!');
    console.error(err.message);
    process.exit(1);
}
