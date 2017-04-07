//──────────────────────────────────────────────────────────────────────────────
// Imports:
//──────────────────────────────────────────────────────────────────────────────
const fs           = require('fs');
const glob         = require('glob');
const touch        = require('touch');
const childProcess = require('child_process');
const execSync     = childProcess.execSync
const spawn        = childProcess.spawn;

//──────────────────────────────────────────────────────────────────────────────
// Constants:
//──────────────────────────────────────────────────────────────────────────────
const buildTimeout = 4000;
const watchTimeOut = 3900; // Should be less than buildTimeout.

const srcResourcesDir = 'src/main/resources';
const srcFiles = glob.sync(`${srcResourcesDir}/**/*`, { nodir: true });
//console.log('srcFiles:', srcFiles);

const dstFiles = [
    'build/resources/main/lib/exampleLib.js',
    'build/resources/main/services/exampleService/exampleService.html',
    'build/resources/main/services/exampleService/exampleService.js',
    'build/resources/main/site/assets/css/styles.css',
    'build/resources/main/site/pages/myPage/myPage.html',
    'build/resources/main/site/pages/myPage/myPage.js',
    'build/resources/main/site/pages/myPage/myPage.xml',
    'build/resources/main/site/site.xml'
];

const prodDstFiles = dstFiles.slice();
//prodDstFiles.push('build/libs/starter-babel-1.1.0.jar'); // Running gradle is slow
prodDstFiles.push('build/resources/main/site/assets/js/scripts.min.js');
prodDstFiles.push('build/resources/main/lib/moment/moment.js');

const devDstFiles = dstFiles.slice();
devDstFiles.push('build/resources/main/site/assets/js/scripts.js');
devDstFiles.push('dist/css/styles.css');
devDstFiles.push('dist/js/scripts.js');

const watchDstFiles = devDstFiles.slice();

devDstFiles.push('build/resources/main/lib/moment/moment.js');

//──────────────────────────────────────────────────────────────────────────────
// Tests:
//──────────────────────────────────────────────────────────────────────────────

describe('Production build: Target files exists:', () => {
    before(function(beforeCb) {
        this.timeout(buildTimeout);
        const cmd = 'yarn run clean; yarn run gprod';
        console.log(`Running cmd:${cmd} timeout:${buildTimeout} ...`);
        const output = execSync(cmd);
        beforeCb();
    });
    prodDstFiles.forEach(f => {
        it(f, (done) => {
            fs.access(f, fs.constants.F_OK, (err) => { done(err); }); // Asyncronous
            //done(fs.existsSync(f) ? null : new Error(`ENOENT: no such file or directory, access '${f}'`)); // Syncronous
        }); // it
    }) // forEach
}); // describe


describe('Development build: Target files exists:', () => {
    before(function(beforeCb) {
        this.timeout(buildTimeout);
        const cmd = 'yarn run clean; yarn run gdev';
        console.log(`Running cmd:${cmd} timeout:${buildTimeout} ...`);
        const output = execSync(cmd);
        beforeCb();
    });
    devDstFiles.forEach(f => {
        it(f, (done) => {
            fs.access(f, fs.constants.F_OK, (err) => { done(err); }); // Asyncronous
            //done(fs.existsSync(f) ? null : new Error(`ENOENT: no such file or directory, access '${f}'`)); // Syncronous
        }); // it
    }) // forEach
}); // describe


describe('Watch build: Target files exists:', () => {
    before(function(beforeCb) {
        this.timeout(buildTimeout);
        const cmd = 'yarn run clean; yarn run gwatch';
        console.log(`Running cmd:"${cmd}" timeout:${buildTimeout}...`);
        const child = spawn('bash', ['-c', cmd]); // TODO: Does detached leave processes? only if child.undef(); ?
        //child.stdout.on('data', (data) => { console.log(`stdout: ${data}`); });
        child.stderr.on('data', (data) => { console.log(`stderr: ${data}`); });
        child.on('close', (code) => { console.log(`child process exited with code ${code}`); });
        setTimeout(() => {
            console.log(`Reached watchTimeOut:${watchTimeOut} stopping cmd:"${cmd}"...`);
            child.kill();
            beforeCb();
        }, watchTimeOut);
    });
    srcFiles.forEach(srcFile => {
        //touch(srcFile, { nocreate: true }, () => {});
        touch.sync(srcFile, { nocreate: true });
    });
    watchDstFiles.forEach(f => {
        it(f, (done) => {
            fs.access(f, fs.constants.F_OK, (err) => { done(err); }); // Asyncronous
            //done(fs.existsSync(f) ? null : new Error(`ENOENT: no such file or directory, access '${f}'`)); // Syncronous
        }); // it
    }) // forEach
}); // describe
