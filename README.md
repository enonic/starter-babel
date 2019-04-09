# Babel Starter for Enonic XP

## Use ES2015 (ES6) as well as React with JSX

Some web browsers, and the Java 8 Nashorn JavaScript engine, do not support ES6 without a transpiler like [Babel](https://babeljs.io/). The purpose of this starter kit is to enable the use of ES6 and/or JSX in XP applications. This starter kit contains a webjar dependency that will download the [React](https://reactjs.org/) files when the app is built. It also contains the required folder structure for creating an app to run on Enonic XP. 

## How it works

This project's `build.gradle` file contains a task that will transpile JS files with extension, different from the default `.js`, e.g. `.es6` or `.jsx`. For example, if a part is named "my-part" then the controller should be named `my-part.es6` and it will be transpiled into `my-part.js`. The transpiled files can be found in the project's `build` folder. 

All references to `.es6` and `.jsx` files should use the `.js` extension. For example, a client side file named `utilities.es6` would be included in a script element like this: `src="utilities.js"`.

To use React in the project, include the react.min.js and react-dom.min.js files with a `<script>` element in your page. These files are included by the webjar dependency. You won't see these files in your project's `assets` folder, but they will be accessible at `/src/main/resources/assets/react/0.14.7/`.

If React and JSX will not be used in your project, simply make the following edits to the build.gradle file: remove the reference to the React webjar dependency and remove references to `.jsx` and `react` in the babelJs task. Also remove the line with `babel-preset-react` in the package.json file.

## Target environment

The target environment is set to ES5 (that is supported by node.js v0.12.0). If you want to transpile the client side files only, you can change the taget environment in [.browserslistrc](.browserslistrc). For more information, read the official Browserslist [documentation](https://github.com/browserslist/browserslist#browserslist-). Enviroment list can be tested [here](https://browserl.ist/).

## App development with continuous transpile

Even when XP is started in dev-mode, transpiling does not occur upon changes to `.es6` or `.jsx` files. But these files can be watched so that the `babelJs` task will be run automatically. Open the terminal and enter `./gradlew babelJs -Pwatch`. There should be at least one change in a watched file before running the task with `-Pwatch` or else the task may complete and stop watching as expected.

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
| 1.0.0         | 6.4.0 - 6.11.1 |
| 1.1.0         | 6.4.0 -  |
| 1.2.0         | 6.12.0+ |
| 1.3.0         | 6.12.0+ |
| 1.4.0         | 6.15.0+ |
| 1.5.0         | 7.0.0 |

## WebJars

The React files are added with a [WebJar](http://www.webjars.org/) dependency in build.gradle and will be downloaded the first time the app is built. They can be viewed in the project's `/build/webjars/META-INF/resources/react` folder, but they are accessed as if they were in the project's `assets/react/<version>/` folder. To use a different version of React, just update the version number in build.gradle (make sure that it is listed on the WebJar site). To add React manually, just remove this WebJar dependency in build.gradle. React files can then be manually added to `/src/main/resources/assets`.

```
webjar "org.webjars:react:0.14.7"
```

## Copyright and license

This software is licensed under [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).<br/>
Babel Code released under [the MIT license](https://github.com/babel/babel/blob/master/LICENSE).<br/>
React is released under the [BSD license](https://github.com/facebook/react/blob/master/LICENSE).
