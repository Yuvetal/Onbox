const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

async function getAllFiles(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relPath = base ? `${base}/${file}` : file;
    const stat = fs.statSync(filePath);

    // Skip node_modules, .git, dist, build, .env files, temporary folders
    if (
      file === 'node_modules' ||
      file === '.git' ||
      file === 'dist' ||
      file === 'build' ||
      file === '.tempmediaStorage' ||
      file === '.system_generated' ||
      file === '.user_uploaded' ||
      file === 'scratch' ||
      file === 'browser' ||
      file.endsWith('.log')
    ) {
      continue;
    }

    if (file === '.env' || file.startsWith('.env.')) {
      if (file !== '.env.example') {
        continue;
      }
    }

    if (stat.isDirectory()) {
      results = results.concat(await getAllFiles(filePath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

async function main() {
  console.log(`🚀 Initializing Git repository in: ${rootDir}`);
  await git.init({ fs, dir: rootDir, defaultBranch: 'main' });

  console.log('📂 Scanning and staging files...');
  const files = await getAllFiles(rootDir);
  console.log(`Found ${files.length} files to stage.`);

  for (const filepath of files) {
    await git.add({ fs, dir: rootDir, filepath });
  }
  console.log('✅ All files staged.');

  console.log('📝 Creating initial commit...');
  const sha = await git.commit({
    fs,
    dir: rootDir,
    author: {
      name: 'Logu Ajith Kumar',
      email: 'kumarajithlogu@gmail.com',
    },
    message: 'Initial commit: Mail Scheduler & Dispatch Service with full documentation and verification',
  });
  console.log(`✅ Commit created: ${sha}`);

  console.log('🌐 Adding remote origin: https://github.com/Yuvetal/Onbox.git');
  await git.addRemote({
    fs,
    dir: rootDir,
    remote: 'origin',
    url: 'https://github.com/Yuvetal/Onbox.git',
    force: true,
  });

  console.log('🎉 Git repository initialized, committed, and remote added successfully!');
}

main().catch((err) => {
  console.error('❌ Git operation failed:', err);
  process.exit(1);
});
