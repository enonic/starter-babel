'use strict';
/*──────────────────────────────────────────────────────────────────────────────

 There are currently three main tasks:
 - prod  : no-comments, minify, sourcemaps, uglify
 - dev   : comments, no-minify, no-sourcemap, no-uglify
 - watch : same as dev, but with live reload

 https://github.com/gulpjs/gulp/blob/master/docs/API.md
  Are your tasks running before the dependencies are complete?
  Make sure your dependency tasks are correctly using the async run hints:
  take in a callback or return a promise or event stream.

 http://schickling.me/synchronous-tasks-gulp/
  In the official gulp docs on Github they recommend using callback functions
  to run tasks synchronously, but that does not work. Instead return the
  actual task and gulp knows on its own when it's done.

──────────────────────────────────────────────────────────────────────────────*/

import packageJson     from './package.json';
import express         from 'express';
import glob            from 'glob';
import gulp            from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import httpProxy       from 'http-proxy';
import webpack         from 'webpack';

const $           = gulpLoadPlugins();
const app         = express();
const proxy       = httpProxy.createProxyServer();
const enonic      = 'http://localhost:8080';
const expressPort = 18080;

//──────────────────────────────────────────────────────────────────────────────
// Less logging
//──────────────────────────────────────────────────────────────────────────────
/*const origLog = $.util.log;
$.util.log = function() {
    const args = arguments;
    if(args[0] != 'Starting') {
        return origLog.apply(this, arguments);
    }
};*/

const srcResourcesDir = 'src/main/resources';
const dstResourcesDir = 'build/resources/main';
const dstSiteDir      = `${dstResourcesDir}/site`;

const srcGlob    = srcResourcesDir + '/**/*.*'; // Not folders
const ignoreGlob = srcResourcesDir + '/**/*.{es6,js,jsx,scss}';
const srcFiles   = glob.sync(srcGlob, { absolute: true });
const copyFiles  = glob.sync(srcGlob, { absolute: true, ignore: ignoreGlob });

const scssGlob       = srcResourcesDir + '/**/*.scss';
const mainScssGlob   = srcResourcesDir + '/assets/styles.scss';
const mainScssFile   = glob.sync(mainScssGlob, { absolute: true })[0];
const scssFiles      = glob.sync(scssGlob, { absolute: true, ignore: mainScssGlob }); // Ignore main or main task becomes overridden

const mainBabelAssetGlob = srcResourcesDir + '/assets/scripts.asset.es6';
const babelAssetsGlob    = srcResourcesDir + '/**/*.asset.{es6,jsx}';
const babelGlob          = srcResourcesDir + '/**/*.{es6,jsx}';
const mainBabelAssetFile = glob.sync(mainBabelAssetGlob, { absolute: true })[0];
const babelAssetFiles    = glob.sync(babelAssetsGlob, { absolute: true, ignore: mainBabelAssetGlob }); // Ignore main or main task becomes overridden
const babelFiles         = glob.sync(babelGlob, { absolute: true, ignore: babelAssetsGlob });

const nodeModules          = Object.keys(packageJson.dependencies||[]);
const nodeModuleDirs       = nodeModules.map(nodeModule => glob.sync(`./node_modules/${nodeModule}`, { absolute: true })[0]);
const prodNodeModuleTasks  = nodeModuleDirs.map(nodeModuleDir => `prod:${nodeModuleDir}`);
const devNodeModuleTasks   = nodeModuleDirs.map(nodeModuleDir => `dev:${nodeModuleDir}`);
const watchNodeModuleTasks = nodeModuleDirs.map(nodeModuleDir => `dev:${nodeModuleDir}`);
const nodeModulesFiles     = [].concat.apply([],
    nodeModules.map(module => {
        return glob.sync(`./node_modules/${module}/**/*.js` , { absolute: true });
    })
);
//$.util.log('nodeModules:', nodeModules); // Util log does not list all entries.
//console.log(`nodeModulesFiles:${JSON.stringify(nodeModulesFiles, null, 4)}`);
//process.exit();

// Let's put asyncronous tasks first, so they can finish while syncronous tasks are running.
const prodFiles  = copyFiles.concat(babelFiles, mainScssFile, mainBabelAssetFile);
const devFiles   = prodFiles;
const watchFiles = devFiles.concat(nodeModulesFiles, scssFiles, babelAssetFiles);
const prodTasks  = prodNodeModuleTasks.concat( prodFiles.map( f => `prod:${f}` ));
const devTasks   = devNodeModuleTasks.concat(  devFiles.map(  f => `dev:${f}`  ));

//──────────────────────────────────────────────────────────────────────────────
// xml, html, svg, etc...
//──────────────────────────────────────────────────────────────────────────────
function copyResource({
    filePath,
    base       = srcResourcesDir,
    dest       = dstResourcesDir,
    env        = 'prod',
    plumber    = env === 'dev' ? true : false,
    liveReload = false
}) {
    let stream = gulp.src(filePath, { base });
    if(plumber) { stream = stream.pipe($.plumber()); }
    stream = stream.pipe(gulp.dest(dest));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    return stream;
}

// These can be asyncronous, so do not return anything:
copyFiles.forEach(filePath => {
    gulp.task(`prod:${filePath}`,  () => { copyResource({filePath}); });
    gulp.task(`dev:${filePath}`,   () => { copyResource({filePath, env: 'dev'}); });
    gulp.task(`watch:${filePath}`, () => { copyResource({filePath, env: 'dev', liveReload: true}) });
});

//──────────────────────────────────────────────────────────────────────────────
// Copy package.json dependencies
//──────────────────────────────────────────────────────────────────────────────
nodeModuleDirs.forEach(nodeModuleDir => {
    const base = 'node_modules';
    const dest = `${dstSiteDir}/lib/`;
    const jsFilesInNodeModule = glob.sync(`${nodeModuleDir}/**/*.js` , { absolute: true });
    // These can be asyncronous, so do not return anything:
    gulp.task(`prod:${nodeModuleDir}`,  () => { jsFilesInNodeModule.forEach(filePath => { copyResource({ filePath, base, dest }); }); });
    gulp.task(`dev:${nodeModuleDir}`,   () => { jsFilesInNodeModule.forEach(filePath => { copyResource({ filePath, base, dest, env: 'dev' }); }); });
    // This must be syncronous, so return callback:
    // This becomes a lot for liveReloads, but it seems one cannot liveReload a list, so I guess thats fine for now.
    gulp.task(`watch:${nodeModuleDir}`, (done) => { jsFilesInNodeModule.forEach(filePath => { copyResource({ filePath, base, dest, env: 'dev', liveReload: true }); }); done(); });
});

nodeModulesFiles.forEach(filePath => {
    const nodeModuleDirFromFilePath = glob.sync('node_modules/' + filePath.replace(/^.*?node_modules\//, '').replace(/\/.*$/,'') , { absolute: true })[0];
    gulp.task(`watch:${filePath}`, (done) => { gulp.start(`watch:${nodeModuleDirFromFilePath}`); done(); });
});

//──────────────────────────────────────────────────────────────────────────────
// Serverside es6 -> js
//──────────────────────────────────────────────────────────────────────────────
function transpileResource({
    filePath,
    base         = srcResourcesDir,
    dest         = dstResourcesDir,
    liveReload   = false,
    env          = 'prod',
    plumber      = env === 'dev' ? true : false,
    babelOptions = env === 'dev' ? {
        comments: true,
        compact:  false,
        minified: false,
        presets:  ['es2015', 'react']
    } : {
        comments: false,
        compact:  true,
        minified: true,
        presets:  ['es2015', 'react']
    }
}) {
    let stream = gulp.src(filePath, { base });
    if(plumber) { stream = stream.pipe($.plumber()); }
    stream = stream.pipe($.babel(babelOptions)).pipe(gulp.dest(dest));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    return stream;
}

// These can be asyncronous, so do not return anything:
babelFiles.forEach(function (filePath) {
    gulp.task(`prod:${filePath}`,  () => { transpileResource({filePath}); });
    gulp.task(`dev:${filePath}`,   () => { transpileResource({filePath, env: 'dev'}); });
    gulp.task(`watch:${filePath}`, () => { transpileResource({filePath, env: 'dev', liveReload: true}); });
});

//──────────────────────────────────────────────────────────────────────────────
// Client-side es6, jsx -> js
//──────────────────────────────────────────────────────────────────────────────
function webPackResource({
    filePath,
    liveReload    = false,
    env           = 'prod',
    plumber       = env === 'dev' ? true : false,
    babelComments = env === 'dev' ? true : false,
    compact       = env === 'dev' ? false : true,
    minified      = env === 'dev' ? false : true,
    presets       = ['es2015', 'react'],
    babelOptions  = env === 'dev' ? {
        comments: babelComments,
        compact,
        minified,
        presets
    } : {
        comments: babelComments,
        compact,
        minified,
        presets
    },
    uglify        = env === 'dev' ? false : true,
    debug         = env === 'dev' ? true  : false,
    minimize      = env === 'dev' ? false : true,
    sourceMap     = env === 'dev' ? false : true,
    comments      = env === 'dev' ? true  : false,
    warnings      = env === 'dev' ? true  : false,
    uglifyOptions = { debug, minimize, sourceMap, output: { comments }, compressor: { warnings } },
    plugins       = uglify ? [ new webpack.optimize.UglifyJsPlugin(uglifyOptions) ] : [],
    filename      = (uglify && minimize) ? 'scripts.min.js' : 'scripts.js'
}) {
    //$.util.log('uglifyOptions:', uglifyOptions);
    let stream = gulp.src(filePath);
    if(plumber) { stream = stream.pipe($.plumber()); }
    stream = stream.pipe($.webpack({
        module: {
            loaders: [{
                test: /\.(js|es6)$/,
                loader: 'babel-loader',
                query: babelOptions
            }]
        },
        output: { filename },
        plugins,
    }, webpack))
        .pipe(gulp.dest(`${dstResourcesDir}/site/assets/js/`));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    if(env === 'dev') {
        stream = stream.pipe(gulp.dest('./dist/js/'));
        if(liveReload) { stream = stream.pipe($.livereload()); }
    }
    return stream;
}

// Must be syncronous, so task doesn't finish before webPack, thus return the stream:
gulp.task(`prod:${mainBabelAssetFile}`,  () => { return webPackResource({ filePath: mainBabelAssetFile }); });
gulp.task(`dev:${mainBabelAssetFile}`,   () => { return webPackResource({ filePath: mainBabelAssetFile, env: 'dev' }); });
gulp.task(`watch:${mainBabelAssetFile}`, (done) => { webPackResource({ filePath: mainBabelAssetFile, env: 'dev', liveReload: true }); done(); });

babelAssetFiles.forEach(babelAssetFile => {
    gulp.task(`watch:${babelAssetFile}`, (done) => { gulp.start(`watch:${mainBabelAssetFile}`); done(); });
});

//──────────────────────────────────────────────────────────────────────────────
// scss -> css
//──────────────────────────────────────────────────────────────────────────────

function compileScssFile({
    filePath,
    env        = 'prod',
    sourcemaps = env === 'dev' ? false : true,
    liveReload = false,
    autoprefixerOptions = {
        browsers: ['last 2 versions', 'ie > 8'],
        cascade: false
    },
    sassOptions = {
        includePaths: '..'
    }
}) {
    let stream = gulp.src(filePath);
    if(sourcemaps) { stream = stream.pipe($.sourcemaps.init()); }
    stream = stream.pipe($.sassGlob())
        .pipe($.sass(sassOptions).on('error', $.sass.logError))
        .pipe($.autoprefixer(autoprefixerOptions));
    if(sourcemaps) { stream = stream.pipe($.sourcemaps.write()); }
    stream = stream.pipe(gulp.dest(`${dstSiteDir}/assets/css/`));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    if (env === 'dev') {
        stream = stream.pipe(gulp.dest('./dist/css/'));
        if(liveReload) { stream = stream.pipe($.livereload()); }
    }
    // $.livereload.changed(`${dest}/styles.css`');
    return stream;
}

gulp.task(`prod:${mainScssFile}`,  () => { compileScssFile({ filePath: mainScssFile }); });
gulp.task(`dev:${mainScssFile}`,   () => { compileScssFile({ filePath: mainScssFile, env: 'dev' }); });
// Must be syncronous, so scssWatchTasks don't complete before them, thus return the stream:
gulp.task(`watch:${mainScssFile}`, () => { return compileScssFile({ filePath: mainScssFile, env: 'dev', liveReload: true }); });

scssFiles.forEach(scssFile => {
    gulp.task(`watch:${scssFile}`, (done) => { gulp.start(`watch:${mainScssFile}`); done(); });
});

//──────────────────────────────────────────────────────────────────────────────
// Main tasks:
//──────────────────────────────────────────────────────────────────────────────

gulp.task('prod', prodTasks);

gulp.task('dev', devTasks);

gulp.task('watch', devTasks, () => {
    $.livereload({ start: true });
    app.all(/^(?!\/dist).*$/, (req, res) => proxy.web(req, res, { target: enonic }));
    app.use(express.static(__dirname)).listen(expressPort);
    gulp.watch(watchFiles, event => { gulp.start('watch:' + event.path); });
});

gulp.task('default', ['prod']);
