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

    regexp: {
        //ignore:      /^$/,
        copy:        /^src\/.*\.(html|xml)$/,
        scss:        /^src\/.*\.scss$/,
        webpack:     /^src\/.*asset.*\.es6$/,
        transpile:   /^src\/.*\.es6$/,
        nodeModules: /^node_modules\/.*\.(js|json)$/,
    },

    node: {
      serverSide: [
        'moment'
      ]
    },

    glob: {
        ignore: [
            '.babelrc',
            '.editorconfig',
            '.gitignore',
            '.node-version',
            '.sass-lint.yml',
            '.yarnclean',
            'build.gradle',
            'gradle.properties',
            'gradlew',
            'gradlew.bat',
            'gulpfile.babel.js', // gulper restarts on change of this file
            'npm-debug.log',
            'package.json',
            'LICENSE',
            'LICENSE.txt',
            'README.md',
            'yarn.lock',
            '.git/**/*',
            '.gradle/**/*',
            'build/**/*',
            'dist/**/*',
            'gradle/**/*',
            'node_modules/**/*', // Node modules are handeled seperately
            //'node_modules/**/*.!(js|json)', // Files that are not js or json
            //'node_modules/**/!(*.*)', // Files without extention
            'src/main/java/**/*',
            '**/*.gitkeep'
        ]
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

const allFiles = Glob.sync('**/*', {
    absolute: false,
    dot: true, // Include hidden files
    ignore: config.glob.ignore,
    nodir: true
});
//console.log(allFiles); process.exit();

let dstAbsFilePaths = new Map();
allFiles.forEach(srcRelFilePath => {
    const srcAbsFilePath   = Glob.sync(srcRelFilePath, { absolute: true })[0]; // Note: Glob does not work on files that don't exist yet...
    const dstShortFilePath = srcRelFilePath.replace(`${srcResourcesDir}/`, '');
    const dstRelFilePath   = `${dstResourcesDir}/${dstShortFilePath}`;
    const dstAbsFilePath   = srcAbsFilePath.replace(srcResourcesDir, dstResourcesDir);

    switch (true) {
        //case config.regexp.ignore.test(srcRelFilePath): break;

        case config.regexp.copy.test(srcRelFilePath):
            dstAbsFilePaths.set(dstAbsFilePath, {
                action: 'copy',
                dstRelFilePath,
                dstShortFilePath,
                srcRelFilePath
            });
            break;

        case config.mainScss === srcRelFilePath:
            dstAbsFilePaths.set(dstAbsFilePath.replace(/scss$/, 'css'), {
                action: 'compileScss',
                dstRelFilePath: dstRelFilePath.replace(/scss$/, 'css'),
                dstShortFilePath: dstShortFilePath.replace(/scss$/, 'css'),
                srcRelFilePath
            });
            break;

        case config.regexp.scss.test(srcRelFilePath):
            dstAbsFilePaths.set(dstAbsFilePath, {
                action: 'watch',
                depend: config.mainScss.replace(`${srcResourcesDir}/`, '').replace(/scss$/, 'css'),
                srcRelFilePath,
                srcShortFilePath: srcRelFilePath.replace(`${srcResourcesDir}/`, '')
            });
            break;

        case config.mainBabelAsset === srcRelFilePath:
            dstAbsFilePaths.set(dstAbsFilePath.replace(/asset.es6$/, 'js'), {
                action: 'webpack',
                dstRelFilePath: dstRelFilePath.replace(/asset.es6$/, 'js'),
                dstShortFilePath: dstShortFilePath.replace(/asset.es6$/, 'js'),
                srcRelFilePath
            });
            break;

        case config.regexp.webpack.test(srcRelFilePath):
            dstAbsFilePaths.set(dstAbsFilePath, {
                action: 'watch',
                depend: config.mainBabelAsset.replace(`${srcResourcesDir}/`, '').replace(/asset.es6$/, 'js'),
                srcRelFilePath,
                srcShortFilePath: srcRelFilePath.replace(`${srcResourcesDir}/`, '')
            });
            break;

        case config.regexp.transpile.test(srcRelFilePath):
            dstAbsFilePaths.set(dstAbsFilePath.replace(/es6$/, 'js'), {
                action: 'transpile',
                dstRelFilePath: dstRelFilePath.replace(/es6$/, 'js'),
                dstShortFilePath: dstShortFilePath.replace(/es6$/, 'js'),
                srcRelFilePath
            });
            break;

        //case config.regexp.nodeModules.test(srcRelFilePath): break; // Node modules are handeled seperately

        // Unhandeled leftovers, warn on watch
        //case /\//.test(srcRelFilePath): console.log('What do do with this file is not defined:' + srcRelFilePath); break; // Any left over files in folders
        default: console.log(srcRelFilePath); // Files in root
    }
});

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
    presets      = [
        [
            'es2015', {
                loose: true
            }
        ],
        'react'
    ],
    babelOptions = env === 'dev' ? {
        comments: true,
        compact:  false,
        minified: false,
        presets
    } : {
        comments: false,
        compact:  true,
        minified: true,
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
    presets       = [
        [
            'es2015', {
                loose: true
            }
        ],
        'react'
    ],
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
// Node modules used server-side
//──────────────────────────────────────────────────────────────────────────────
//let seenNodeModules = new Set();
config.node.serverSide.forEach(moduleName => {
    // TODO: Find dependencies
    const srcRelDir       = `${srcNodeModulesRelDir}/${moduleName}`; // TODO: Fail if srcRelDir does not exist
    const glob            = `${srcRelDir}/**/*.{js,json}`;
    const srcRelFilePaths = Glob.sync(`${srcRelDir}/**/*.{js,json}` , { absolute: false });
    dstAbsFilePaths.set(`${__dirname}/${dstResourcesDir}/lib/${moduleName}`, {
        action: 'node',
        dstShortFilePath: `lib/${moduleName}`,
        glob
    });
    srcRelFilePaths.forEach(srcRelFilePath => {
      const dstShortFilePath = srcRelFilePath.replace(srcNodeModulesRelDir, dstNodeModulesRelDir).replace(`${dstResourcesDir}/`, '');
      Gulp.task(`${dstShortFilePath}`, () => {
          copyResource({ filePath: srcRelFilePath, base: srcNodeModulesRelDir, dest: dstNodeModulesRelDir });
      });
      Gulp.task(`${srcRelFilePath}`, () => {
          Gulp.start(dstShortFilePath);
      });
    });
});

//──────────────────────────────────────────────────────────────────────────────
// Define tasks from dstAbsFilePaths
//──────────────────────────────────────────────────────────────────────────────
dstAbsFilePaths.forEach((v, dstAbsFilePath) => {
    if(v.action === 'watch') {
        Gulp.task(`${v.srcShortFilePath}`, [v.depend]);
    } else {
        Gulp.task(`${v.dstShortFilePath}`, () => {
            switch (v.action) {
                case 'copy':        copyResource({ filePath: v.srcRelFilePath }); break;
                case 'transpile':   transpileResource({ filePath: v.srcRelFilePath }); break;
                case 'webpack':     webPackResource({ filePath: v.srcRelFilePath }); break;
                case 'compileScss': compileScssFile({ filePath: v.srcRelFilePath }); break;
                case 'node':        copyResource({ filePath: v.glob, base: srcNodeModulesRelDir, dest: dstNodeModulesRelDir }); break;
                default: console.log(`Unhandeled file: ${v.srcRelFilePath}`);
            }
        }); // Gulp.task
        //if(v.action !== 'node') {
            Gulp.task(`${v.srcRelFilePath}`, () => {
                Gulp.start(v.dstShortFilePath);
            }); // for watch
        //}
    }
}); // dstAbsFilePaths.forEach
//console.log(dstAbsFilePaths); //process.exit();

//──────────────────────────────────────────────────────────────────────────────
// Task dependencies
//──────────────────────────────────────────────────────────────────────────────
const prodTasks = [...dstAbsFilePaths.values()].filter(d => d.action !== 'watch').map(d => d.dstShortFilePath);
const devTasks = prodTasks;
const watchFiles = allFiles;
//const watchFiles = [...dstAbsFilePaths.values()].map(d => d.srcRelFilePath);
//console.log(watchFiles); process.exit();

//──────────────────────────────────────────────────────────────────────────────
// Main tasks:
//──────────────────────────────────────────────────────────────────────────────
Gulp.task('prod', () => {
    prodTasks.forEach(dstShortFilePath => {
        Gulp.start(dstShortFilePath);
    });
});

Gulp.task('dev', () => {
    devTasks.forEach(dstShortFilePath => {
        Gulp.start(dstShortFilePath);
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
