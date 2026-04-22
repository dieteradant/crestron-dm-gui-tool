const { spawn } = require('child_process');
const path = require('path');

const serverEntry = path.join(__dirname, '..', 'server', 'index.js');
const child = spawn(process.execPath, [serverEntry], {
  env: {
    ...process.env,
    SERVER_PORT: '0',
    SWITCHER_HOST: '',
    SWITCHER_PORT: '41795'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let done = false;
let stdout = '';
let stderr = '';

const timeout = setTimeout(() => {
  fail(new Error('Timed out waiting for the server to start'));
}, 8000);

function succeed() {
  if (done) return;
  done = true;
  clearTimeout(timeout);

  child.once('exit', (code, signal) => {
    if (code === 0 || signal === 'SIGINT') {
      process.exit(0);
      return;
    }

    console.error(`Smoke test server exited unexpectedly (code: ${code}, signal: ${signal})`);
    process.exit(1);
  });

  child.kill('SIGINT');
  setTimeout(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  }, 2000).unref();
}

function fail(error) {
  if (done) return;
  done = true;
  clearTimeout(timeout);

  console.error(error.message);
  if (stdout.trim()) console.error(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());

  if (!child.killed) child.kill('SIGINT');
  setTimeout(() => process.exit(1), 500).unref();
}

child.stdout.on('data', (chunk) => {
  stdout += chunk.toString();

  if (stdout.includes('GUI running at http://localhost:')) {
    succeed();
  }
});

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

child.on('exit', (code, signal) => {
  if (!done) {
    fail(new Error(`Server exited before startup completed (code: ${code}, signal: ${signal})`));
  }
});
