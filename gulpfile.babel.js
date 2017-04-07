'use strict';
//──────────────────────────────────────────────────────────────────────────────
// Information
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

 Notes:
 - KISS define single mainScssFile and single mainAssetJsFile
 - short paths in STDOUT
 - prod and dev tasks are destination files.
 - watch tasks are source files, which depends on source files.
 - Globbing all files with ignore(blacklist) to create whitelist is slow,
    so lets use as small globs as possible instead.

 Node modules:
 - Only copy modules listed in config (and in the future their dependencies)
 - If the module is missing in the node_modules/ directory build should fail.
*/

//──────────────────────────────────────────────────────────────────────────────
// Configuration
//──────────────────────────────────────────────────────────────────────────────
const config = {
    enonic:      'http://localhost:8080',
    expressPort: 18080,

    mainScss:       'src/main/resources/assets/styles.scss',
    mainBabelAsset: 'src/main/resources/assets/scripts.asset.es6',

    node: {
      serverSide: [
        'moment'
      ]
    },

    glob: {
        extentions: {
            copy:        '{html,jpeg,properties,png,svg,ttf,xml,xsl,woff}',
            scss:        'scss',
            webpack:     'asset.es6',
            transpile:   'es6',
            nodeModules: '{js,json}'
        }
    }
};

//──────────────────────────────────────────────────────────────────────────────
// Imports
//──────────────────────────────────────────────────────────────────────────────
import packageJson     from './package.json';
import express         from 'express';
import Glob            from 'glob';
import Gulp            from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import HttpProxy       from 'http-proxy';
import webpack         from 'webpack';

//──────────────────────────────────────────────────────────────────────────────
// Constants
//──────────────────────────────────────────────────────────────────────────────
const $           = gulpLoadPlugins();
const app         = express();
const proxy       = HttpProxy.createProxyServer();

const srcNodeModulesRelDir = 'node_modules';
const srcResourcesDir      = 'src/main/resources';

const dstResourcesDir      = 'build/resources/main';
const dstSiteDir           = `${dstResourcesDir}/site`;
const dstAssetsDir         = `${dstSiteDir}/assets`;
const dstNodeModulesRelDir = `${dstResourcesDir}/lib`;

const isProd               = $.util.env._.includes('prod');
const isWatch              = $.util.env._.includes('watch');

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

//──────────────────────────────────────────────────────────────────────────────
// xml, html, svg, etc...
//──────────────────────────────────────────────────────────────────────────────
function copyResource({
    filePath,
    base       = srcResourcesDir,
    dest       = dstResourcesDir,
    env        = isProd ? 'prod' : 'dev',
    plumber    = env === 'dev' ? true : false,
    liveReload = isWatch
}) {
    let stream = Gulp.src(filePath, { base });
    if(plumber) { stream = stream.pipe($.plumber()); }
    stream = stream.pipe(Gulp.dest(dest));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    return stream;
}

//──────────────────────────────────────────────────────────────────────────────
// Serverside es6 -> js
//──────────────────────────────────────────────────────────────────────────────
function transpileResource({
    filePath,
    base         = srcResourcesDir,
    dest         = dstResourcesDir,
    liveReload   = isWatch,
    env          = isProd ? 'prod' : 'dev',
    plumber      = env === 'dev' ? true : false,
    comments     = env === 'dev' ? true : false,
    compact      = env === 'dev' ? false : true,
    minified     = env === 'dev' ? false : true,
    plugins      = [],
    presets      = [
        [
            'es2015', {
                loose: true
            }
        ],
        'react'
    ],
    babelOptions = {
        comments,
        compact,
        minified,
        plugins,
        presets
    }
}) {
    let stream = Gulp.src(filePath, { base });
    if(plumber) { stream = stream.pipe($.plumber()); }
    stream = stream.pipe($.babel(babelOptions)).pipe(Gulp.dest(dest));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    return stream;
}

//──────────────────────────────────────────────────────────────────────────────
// Client-side es6, jsx -> js
//──────────────────────────────────────────────────────────────────────────────
function webPackResource({
    filePath,
    liveReload    = isWatch,
    env           = isProd ? 'prod' : 'dev',
    plumber       = env === 'dev' ? true : false,
    babelComments = env === 'dev' ? true : false,
    compact       = env === 'dev' ? false : true,
    minified      = env === 'dev' ? false : true,
    babelPlugins  = [],
    presets       = [
        [
            'es2015', {
                loose: true
            }
        ],
        'react'
    ],
    babelOptions  = {
        comments: babelComments,
        compact,
        minified,
        plugins: babelPlugins,
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
    let stream = Gulp.src(filePath);
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
        .pipe(Gulp.dest(`${dstResourcesDir}/site/assets/js/`));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    if(env === 'dev') {
        stream = stream.pipe(Gulp.dest('./dist/js/'));
        if(liveReload) { stream = stream.pipe($.livereload()); }
    }
    return stream;
}

//──────────────────────────────────────────────────────────────────────────────
// scss -> css
//──────────────────────────────────────────────────────────────────────────────
function compileScssFile({
    filePath,
    env        = isProd ? 'prod' : 'dev',
    sourcemaps = env === 'dev' ? false : true,
    liveReload = isWatch,
    autoprefixerOptions = {
        browsers: ['last 2 versions', 'ie > 8'],
        cascade: false
    },
    sassOptions = {
        includePaths: '..'
    }
}) {
    let stream = Gulp.src(filePath);
    if(sourcemaps) { stream = stream.pipe($.sourcemaps.init()); }
    stream = stream.pipe($.sassGlob())
        .pipe($.sass(sassOptions).on('error', $.sass.logError))
        .pipe($.autoprefixer(autoprefixerOptions));
    if(sourcemaps) { stream = stream.pipe($.sourcemaps.write()); }
    stream = stream.pipe(Gulp.dest(`${dstSiteDir}/assets/css/`));
    if(liveReload) { stream = stream.pipe($.livereload()); }
    if (env === 'dev') {
        stream = stream.pipe(Gulp.dest('./dist/css/'));
        if(liveReload) { stream = stream.pipe($.livereload()); }
    }
    // $.livereload.changed(`${dest}/styles.css`');
    return stream;
}

//──────────────────────────────────────────────────────────────────────────────
// Generate tasks and watchFiles
//──────────────────────────────────────────────────────────────────────────────
let prodTasks  = new Set();
let watchFiles = new Set();

const mainScssDst       = config.mainScss.replace(/.*\//, `${dstAssetsDir}/css/`).replace(/scss$/, 'css');
const mainBabelAssetDst = config.mainBabelAsset.replace(/.*\//, `${dstAssetsDir}/js/`).replace(/asset.es6$/, 'js');
//console.log('mainScssDst:', mainScssDst); //process.exit();
//console.log('mainBabelAssetDst:', mainBabelAssetDst); //process.exit();

Gulp.task(mainScssDst, () => {
    compileScssFile({ filePath: config.mainScss });
});
prodTasks.add(mainScssDst);

Gulp.task(mainBabelAssetDst, () => {
    webPackResource({ filePath: config.mainBabelAsset });
});
prodTasks.add(mainBabelAssetDst);

Glob.sync(`${srcResourcesDir}/**/*.${config.glob.extentions.copy}`).forEach(srcRelFilePath => {
    const dstRelFilePath = srcRelFilePath.replace(srcResourcesDir, dstResourcesDir);
    //console.log('copy      srcRelFilePath:', srcRelFilePath, ' dstRelFilePath:', dstRelFilePath);
    Gulp.task(dstRelFilePath, () => {
        copyResource({ filePath: srcRelFilePath });
    });
    prodTasks.add(dstRelFilePath);

    Gulp.task(srcRelFilePath, () => {
        Gulp.start(dstRelFilePath);
    });
    watchFiles.add(srcRelFilePath);
});

Glob.sync(`${srcResourcesDir}/**/*.${config.glob.extentions.scss}`).forEach(srcRelFilePath => {
    const dstRelFilePath = mainScssDst;
    //console.log('scss      srcRelFilePath:', srcRelFilePath, ' dstRelFilePath:', dstRelFilePath);
    Gulp.task(srcRelFilePath, () => {
        Gulp.start(dstRelFilePath);
    });
    watchFiles.add(srcRelFilePath);
});

Glob.sync(`${srcResourcesDir}/**/*.${config.glob.extentions.transpile}`).forEach(srcRelFilePath => {
    const dstRelFilePath = srcRelFilePath.replace(srcResourcesDir, dstResourcesDir);
    //console.log('transpile srcRelFilePath:', srcRelFilePath, ' dstRelFilePath:', dstRelFilePath);
    Gulp.task(dstRelFilePath, () => {
        transpileResource({ filePath: srcRelFilePath });
    });
    prodTasks.add(dstRelFilePath);

    Gulp.task(srcRelFilePath, () => {
        Gulp.start(dstRelFilePath);
    });
    watchFiles.add(srcRelFilePath);
});

Glob.sync(`${srcResourcesDir}/**/*.${config.glob.extentions.webpack}`).forEach(srcRelFilePath => {
    const dstRelFilePath = mainBabelAssetDst;
    //console.log('webpack   srcRelFilePath:', srcRelFilePath, ' dstRelFilePath:', dstRelFilePath);
    Gulp.task(srcRelFilePath, () => {
        Gulp.start(dstRelFilePath);
    });
    watchFiles.add(srcRelFilePath);
});

config.node.serverSide.forEach(m => {
    const prodTask = `${dstNodeModulesRelDir}/${m}`;
    Gulp.task(prodTask, () => {
        const files = Glob.sync(`${srcNodeModulesRelDir}/${m}/**/*.${config.glob.extentions.nodeModules}`, { absolute: true });
        copyResource({ filePath: files, base: srcNodeModulesRelDir, dest: dstNodeModulesRelDir });
    });
    prodTasks.add(prodTask);
    // NOTE: You're not supposed to change files in node_modules, so lets not watch them
});

prodTasks = [...prodTasks];
//console.log('prodTasks:', prodTasks); //process.exit();
const devTasks = prodTasks;
watchFiles = [...watchFiles];
//console.log('watchFiles:', watchFiles); //process.exit();

//──────────────────────────────────────────────────────────────────────────────
// Main tasks:
//──────────────────────────────────────────────────────────────────────────────
Gulp.task('prod', () => {
    prodTasks.forEach(dstRelFilePath => {
        Gulp.start(dstRelFilePath);
    });
});

Gulp.task('dev', () => {
    devTasks.forEach(dstRelFilePath => {
        Gulp.start(dstRelFilePath);
    });
});

Gulp.task('watch', ['dev'], () => {
    $.livereload({ start: true });
    app.all(/^(?!\/dist).*$/, (req, res) => proxy.web(req, res, { target: config.enonic }));
    app.use(express.static(__dirname)).listen(config.expressPort);
    Gulp.watch(watchFiles, event => {
        Gulp.start(event.path.replace(`${__dirname}/`, ''));
    });
});

Gulp.task('default', ['prod']);
