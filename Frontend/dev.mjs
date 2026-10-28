import { spawn } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const mappedArgs = [];
let hasPort = false;
let hasHost = false;

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    hasHost = true;
    mappedArgs.push('-H');
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
      mappedArgs.push(rawArgs[++i]);
    }
  } else if (arg.startsWith('--host=')) {
    hasHost = true;
    mappedArgs.push('-H', arg.slice('--host='.length));
  } else if (arg === '-H' || arg === '--hostname' || arg.startsWith('--hostname=')) {
    hasHost = true;
    mappedArgs.push(arg);
  } else if (arg === '-p' || arg === '--port' || arg.startsWith('--port=')) {
    hasPort = true;
    mappedArgs.push(arg);
  } else {
    mappedArgs.push(arg);
  }
}

if (!hasPort) {
  mappedArgs.push('-p', '3000');
}
if (!hasHost) {
  mappedArgs.push('-H', '0.0.0.0');
}

const childEnv = { ...process.env };
delete childEnv.__NEXT_AGENT_UPGRADE;
delete childEnv.ANTIGRAVITY_AGENT;
delete childEnv.ANTIGRAVITY_AGENTAPI_EXE;

const child = spawn('npx', ['next', 'dev', ...mappedArgs], {
  stdio: 'inherit',
  shell: true,
  env: childEnv,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
