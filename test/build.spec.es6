const fs = require('fs');

const files = [
    'build/libs/starter-babel-1.1.0.jar',
    'build/resources/main/lib/exampleLib.js',
    'build/resources/main/lib/moment/moment.js',
    'build/resources/main/services/exampleService/exampleService.html',
    'build/resources/main/services/exampleService/exampleService.js',
    'build/resources/main/site/assets/css/styles.css',
    'build/resources/main/site/assets/js/scripts.min.js',
    'build/resources/main/site/pages/myPage/myPage.html',
    'build/resources/main/site/pages/myPage/myPage.js',
    'build/resources/main/site/pages/myPage/myPage.xml',
    'build/resources/main/site/site.xml'
];

describe('Production build: Target files exists:', () => {
    files.forEach(f => {
        it(f, (done) => {
            fs.access(f, fs.constants.F_OK, (err) => { done(err); }); // Asyncronous
            //done(fs.existsSync(f) ? null : new Error(`ENOENT: no such file or directory, access '${f}'`)); // Syncronous
        }); // it
    }) // forEach
}); // describe
