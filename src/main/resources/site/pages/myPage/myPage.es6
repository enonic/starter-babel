//import { toStr } from '/lib/enonic/util';
import { assetUrl, getContent, getSiteConfig } from 'xp/portal';
import { render } from 'xp/thymeleaf';


function toStr(value) {
    var replacer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var space = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4;
    return JSON.stringify(value, replacer, space);
};


const name = 'myPage';
const type = 'page';
const viewFile = resolve(`${name}.html`);
const logPrefix = `${name} ${type}`;


export function get(request) {

    const siteConfig = getSiteConfig();
    const content    = getContent();
    const page       = content.page;
    const regions    = page.regions;
    const config     = page.config;
    log.debug(`${logPrefix} request:${toStr(request)}`);
    log.debug(`${logPrefix} siteConfig:${toStr(siteConfig)}`);
    log.debug(`${logPrefix} content:${toStr(content)}`);
    //log.debug(`${logPrefix} page:${toStr(page)}`);
    //log.debug(`${logPrefix} regions:${toStr(regions)}`);
    //log.debug(`${logPrefix} config:${toStr(config)}`);

    const model = {
        mode: request.mode,
        title: 'My page title',
        watch: request.port == 18080
    };
    log.debug(`${logPrefix} model:${toStr(model)}`);

    const res = {
        body: render(viewFile, model),
        pageContributions: {
            bodyEnd: [
                `<script src="${assetUrl({ path: 'js/scripts.js' })}" type="text/javascript"></script>`
            ]
        }
    }
    //log.debug(`${logPrefix} res.pageContributions:${toStr(res.pageContributions)}`);
    return res;

} // function get
