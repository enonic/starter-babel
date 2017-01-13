'use strict';
import packageJson     from './package.json';
import express         from 'express';
import glob            from 'glob';
import gulp            from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import httpProxy       from 'http-proxy';
import webpack         from 'webpack';
//const express         = require('express');
//const httpProxy       = require('http-proxy');
//const glob            = require('glob');
//const gulp            = require('gulp');
//const gulpLoadPlugins = require('gulp-load-plugins');
//const packageJson     = require('./package.json');

const $           = gulpLoadPlugins();
const app         = express();
const proxy       = httpProxy.createProxyServer();
const enonic      = 'http://localhost:8080';
const expressPort = 8889;

const srcResourcesDir = 'src/main/resources';
const dstResourcesDir = 'build/resources/main';
const dstSiteDir      = `${dstResourcesDir}/site`;

const srcGlob    = srcResourcesDir + '/**/*.*'; // Not folders
const ignoreGlob = srcResourcesDir + '/**/*.{es6,js,jsx,scss}';
const srcFiles   = glob.sync(srcGlob, { absolute: true });
const copyFiles  = glob.sync(srcGlob, { absolute: true, ignore: ignoreGlob });
const copyTasks  = copyFiles.map(f => 'copy:'+ f);
//console.log('srcGlob:' + JSON.stringify(srcGlob, null, 4));
//console.log('ignoreGlob:' + JSON.stringify(ignoreGlob, null, 4));
//console.log('srcFiles:' + JSON.stringify(srcFiles, null, 4));
//console.log('copyFiles:' + JSON.stringify(copyFiles, null, 4));

const scssGlob     = srcResourcesDir + '/**/*.scss';
const mainScssGlob = srcResourcesDir + '/assets/styles.scss';
const mainScssFile = glob.sync(mainScssGlob, { absolute: true })[0];
const scssFiles    = glob.sync(scssGlob, { absolute: true });
//console.log('scssGlob:' + JSON.stringify(scssGlob, null, 4));
//console.log('mainScssGlob:' + JSON.stringify(mainScssGlob, null, 4));
//console.log('mainScssFile:' + JSON.stringify(mainScssFile, null, 4));
//console.log('scssFiles:' + JSON.stringify(scssFiles, null, 4));

const mainBabelAssetGlob = srcResourcesDir + '/assets/scripts.asset.es6';
const babelAssetsGlob    = srcResourcesDir + '/**/*.asset.{es6,jsx}';
const babelGlob          = srcResourcesDir + '/**/*.{es6,jsx}';
const mainBabelAssetFile = glob.sync(mainBabelAssetGlob, { absolute: true })[0];
const babelAssetFiles    = glob.sync(babelAssetsGlob);
const babelFiles         = glob.sync(babelGlob, { absolute: true, ignore: babelAssetsGlob });
const babelBuildTasks    = babelFiles.map(f => 'transpile:'+ f);
//console.log('mainBabelAssetGlob:' + JSON.stringify(mainBabelAssetGlob, null, 4));
//console.log('mainBabelAssetFile:' + JSON.stringify(mainBabelAssetFile, null, 4));
//console.log('babelAssetsGlob:' + JSON.stringify(babelAssetsGlob, null, 4));
//console.log('babelGlob:' + JSON.stringify(babelGlob, null, 4));
//console.log('babelAssetFiles:' + JSON.stringify(babelAssetFiles, null, 4));
//console.log('babelFiles:' + JSON.stringify(babelFiles, null, 4));

const watchFiles = copyFiles.concat(babelFiles);
//process.exit()


//──────────────────────────────────────────────────────────────────────────────
// xml, html, svg, etc...
//──────────────────────────────────────────────────────────────────────────────

copyFiles.forEach(function (filePath) {
    function copyFile() {
        return gulp.src(filePath, { base: srcResourcesDir })
            .pipe(gulp.dest(dstResourcesDir));
    }
    gulp.task('copy:' + filePath, (done) => {
        copyFile();
        done();
    });
    gulp.task('watch:' + filePath, (done) => {
        copyFile().pipe($.livereload());
        done();
    });
});

//──────────────────────────────────────────────────────────────────────────────
// Serverside es6 -> js
//──────────────────────────────────────────────────────────────────────────────
babelFiles.forEach(function (filePath) {
    gulp.task('transpile:' + filePath, (done) => {
        gulp.src(filePath, { base: srcResourcesDir })
            .pipe($.plumber())
            //.pipe(debug({ title: 'babel:'}))
            .pipe($.babel({
                comments: false,
                compact:  true,
                minified: true,
                presets:  ['es2015', 'react']
            }))
            .pipe(gulp.dest(dstResourcesDir));
            done();
    });
    gulp.task('watch:' + filePath, (done) => {
        gulp.src(filePath, { base: srcResourcesDir })
            .pipe($.plumber())
            //.pipe(debug({ title: 'babel:'}))
            .pipe($.babel({
                comments: true,
                compact:  false,
                minified: false,
                presets:  ['es2015', 'react']
            }))
            .pipe(gulp.dest(dstResourcesDir))
            .pipe($.livereload());
            done();
    });
});

//──────────────────────────────────────────────────────────────────────────────
// Client-side es6, jsx -> js
//──────────────────────────────────────────────────────────────────────────────
gulp.task('build:transpile:assets', (done) => {
    gulp.src(mainBabelAssetFile)
        .pipe($.plumber())
        //.pipe(debug({ title: 'babel:'}))
        /*.pipe($.babel({
            comments: false,
            compact:  true,
            minified: true,
            presets:  ['es2015', 'react']
        }))*/
        .pipe($.webpack({
            module: {
                loaders: [{
                    test: /\.(js|es6)$/,
                    loader: 'babel-loader',
                    query: {
                        presets: ['es2015', 'react']
                    }
                }]
            },
            output: { filename: 'scripts.js', },
            //output: { filename: 'scripts.min.js', },
            //plugins: [ new webpack.optimize.UglifyJsPlugin({ minimize: false, sourceMap: true, comments: true })],
            //plugins: [ new webpack.optimize.UglifyJsPlugin() ],
        }, webpack))
        .pipe($.rename('scripts.js'))
        .pipe(gulp.dest(dstResourcesDir + '/site/assets/js/'));
        done();
});

/*gulp.task('watch:transpile:assets', (done) => {
    gulp.src(mainBabelAssetFile)
        .pipe($.plumber())
        //.pipe(debug({ title: 'babel:'}))
        .pipe($.babel({
            comments: true,
            compact:  false,
            minified: false,
            presets:  ['es2015', 'react']
        }))
        .pipe($.rename('scripts.js'))
        .pipe(gulp.dest(dstResourcesDir + '/site/assets/js/'));
        done();
});*/

//──────────────────────────────────────────────────────────────────────────────
// Copy package.json dependencies
//──────────────────────────────────────────────────────────────────────────────

gulp.task('build:node_modules', function () {
    const deps = Object.keys(packageJson.dependencies).map(function (module) {
        return './node_modules/' + module + '/**/*.js';
    });
    if(deps) {
        return gulp.src(deps, { base: 'node_modules'})
        //.pipe($.debug({ title: 'nodeModules:'}))
        .pipe(gulp.dest(dstSiteDir + '/lib'));
    }
});

//──────────────────────────────────────────────────────────────────────────────
// scss -> css
//──────────────────────────────────────────────────────────────────────────────

function buildCss() {
    return gulp.src(mainScssFile)
        .pipe($.sourcemaps.init())
        .pipe($.sassGlob())
        .pipe($.sass({ includePaths: '..' }).on('error', $.sass.logError))
        .pipe($.autoprefixer({ browsers: ['last 2 versions', 'ie > 8'], cascade: false }))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest(dstSiteDir + '/assets/css'));
}

gulp.task('build:' + mainScssFile, () => {
    buildCss();
});

gulp.task('watch:' + mainScssFile, () => {
    buildCss().pipe($.livereload());
});

//──────────────────────────────────────────────────────────────────────────────

//gulp.task('build', ['build:node_modules', 'build:' + mainScssFile ].concat(copyTasks, babelBuildTasks));
gulp.task('build', ['build:' + mainScssFile, 'build:transpile:assets' ].concat(copyTasks, babelBuildTasks));

gulp.task('watch', ['build'], function() {
    $.livereload({ start: true });
    app.all(/^(?!\/dist).*$/, (req, res) => proxy.web(req, res, { target: enonic }));
    app.use(express.static(__dirname)).listen(expressPort);
    //gulp.watch(assetJsFiles, ['distJsTask']);
    gulp.watch(scssFiles, [ 'watch:' + mainScssFile ]);
    gulp.watch(watchFiles, event => { gulp.start('watch:' + event.path); });
});

gulp.task('default', ['build']);
