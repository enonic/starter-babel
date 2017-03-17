# Babel Starter for Enonic XP

## Use ES2015 (ES6) as well as React with JSX

Some web browsers, and the Java 8 Nashorn JavaScript engine, do not support ES6 without a transpiler like [Babel](https://babeljs.io/). The purpose of this starter kit is to enable the use of ES6 and/or JSX in XP applications. This starter kit contains a webjar dependency that will download the [React](https://facebook.github.io/react/) files when the app is built. It also contains the required folder structure for creating an app to run on Enonic XP.

## How it works

This project's build.gradle file contains a task that will transpile ES6 files with the `.es6` extension into ES5 files with the `.js` extension. It will also transpile JSX files with the `.jsx` extension into ES5 files that end in `.js`. For example, if a part is named "my-part" then the controller should be named `my-part.es6` and it will be transpiled into `my-part.js`. The transpiled files can be found in the project's `build` folder.

All references to `.es6` and `.jsx` files should use the `.js` extension. For example, a client side file named `utilities.es6` would be included in a script element like this: `src="utilities.js"`

Files cannot contain both ES6 and JSX.

To use React in the project, include the react.min.js and react-dom.min.js files with a `<script>` element in your page. These files are included by the webjar dependency. You won't see these files in your project's `assets` folder, but they will be accessible at `/src/main/resources/assets/react/0.14.7/`.

If React and JSX will not be used in your project, simply make the following edits to the build.gradle file: remove the reference to the React webjar dependency and remove references to `.jsx` and `react` in the babelJs task. Also remove the line with `babel-preset-react` in the package.json file.

## App development with continuous transpile and live reload

TIPS: If you have set the environment variable `$XP_INSTALL` to your xp installation directory, you can't start the Enonic XP server in development mode by entering `npm run dev` in a terminal.

Even when XP is started in dev-mode, transpiling does not occur upon changes to `.es6` or `.jsx` files.
So we use gulp to watch the files and transpile them automatically on changes.

Open a terminal and enter `npm run gwatch` to start watching for changes. As long as watch is running you can also get live reload in the browser. In the browser url field simply prefix the port number with a `1`, such that it says `18080` instead of just `8080`.

## Installation

To initialize an app based on this starter kit, run the following command from the XP installation's toolbox folder (for more info on project initialization, read [the documentation for init-project](http://xp.readthedocs.org/en/stable/reference/toolbox/init-project.html)).

OSX/Linux
```shell
$ ./toolbox.sh init-project -d /path/to/project/directory -n com.company.myapp -r starter-babel
```

Windows
```shell
$ toolbox.bat init-project -d C:\path\to\project\directory -n com.company.myapp -r starter-babel
```

## Compatibility

| Version       | XP version |
| ------------- | ---------- |
| 1.1.0         | 6.9.2      |
| 1.0.0         | 6.4.0      |

## Changelog

### 1.1.0

* Let gulp build everything except Java
* liveReload
* Compile sass assets
* Compile es6/jsx assets
* Copy node modules which are direct dependencies in package.json
* Different build options for production and development

## WebJars

The React files are added with a [WebJar](http://www.webjars.org/) dependency in build.gradle and will be downloaded the first time the app is built. They can be viewed in the project's `/build/webjars/META-INF/resources/react` folder, but they are accessed as if they were in the project's `assets/react/<version>/` folder. To use a different version of React, just update the version number in build.gradle (make sure that it is listed on the WebJar site). To add React manually, just remove this WebJar dependency in build.gradle. React files can then be manually added to `/src/main/resources/assets`.

```
webjar "org.webjars:react:0.14.7"
```

## Copyright and license

This software is licensed under [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
Babel Code released under [the MIT license](https://github.com/babel/babel/blob/master/LICENSE).
React is released under the [BSD license](https://github.com/facebook/react/blob/master/LICENSE).
