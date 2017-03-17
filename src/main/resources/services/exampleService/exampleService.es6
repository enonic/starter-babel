/*
    NOTE: This is not perfect code, just something put together as an example
*/

import { toStr } from '/lib/exampleLib';
import { connect } from '/lib/xp/node';
import {
    create       as repoCreate,
    createBranch as repoCreateBranch,
    delete       as repoDelete,
    deleteBranch as repoDeleteBranch,
    get          as repoGet,
    list         as repoList,
    refresh      as repoRefresh
} from '/lib/xp/repo';
import { render as thymeleafRender } from '/lib/xp/thymeleaf';


const name      = 'exampleService';
const type      = 'service';
const viewFile  = resolve(`${name}.html`);
const logPrefix = `${name} ${type}`;
const repoId    = 'example-repo-id';
const branchId  = 'exampleBranch';

let global = {};


export function get(request) {
    log.debug(`${logPrefix} request:${toStr(request)}`);
    global.request = request;
    global.model = {
        title: name,
        messages: [],
        watch: request.port == 18080
    }

    listRepos();
    let repo = getOrCreateRepo();
    createBranchInRepo(repo);
    listRepos();

    let repoConnection;
    try {
        repoConnection = connect({
            repoId,
            branch: branchId
        });
        log.debug(`${logPrefix} repoConnection:${toStr(repoConnection)}`);
    } catch (e) { handleError(e); }

    let queryResult;
    try {
        queryResult = repoConnection.query({
            count: 10,
            //query: ''
            //start: 0
            //sort
        });
        log.debug(`${logPrefix} queryResult:${toStr(queryResult)}`);
    } catch (e) { handleError(e); }

    let nodeId;
    let nodeName = 'myName';
    const nodePath = `/${nodeName}`;
    let createNodeResult;
    try {
        createNodeResult = repoConnection.create({
            _name: nodeName,
            displayName: "This is brand new node"
        });
        log.debug(`${logPrefix} createNodeResult:${toStr(createNodeResult)}`);
        nodeId = createNodeResult._id;
    } catch (e) {
        if(e.class.name === 'com.enonic.xp.node.NodeAlreadyExistAtPathException') {
            nodeId = repoConnection.get(nodePath)._id;
        } else {
            return handleError(e);
        }
    }


    let getNodeResult;
    try {
        getNodeResult = repoConnection.get(nodeId);
        log.debug(`${logPrefix} getNodeResult:${toStr(getNodeResult)}`);
    } catch (e) { handleError(e); }

    let moveNodeResult;
    try {
        moveNodeResult = repoConnection.move({
            source: nodeId,
            target: 'renamed'
        });
        log.debug(`${logPrefix} moveNodeResult:${toStr(moveNodeResult)}`);
    } catch (e) { handleError(e); }

    let masterRepoConnection;
    try {
        masterRepoConnection = connect({
            repoId,
            branch: 'master'
        });
        log.debug(`${logPrefix} masterRepoConnection:${toStr(masterRepoConnection)}`);
    } catch (e) { handleError(e); }

    let getNodeResult2;
    try {
        getNodeResult2 = masterRepoConnection.get(nodeId);
        log.debug(`${logPrefix} getNodeResult2:${toStr(getNodeResult2)}`);
    } catch (e) { handleError(e); }

    let pushNodeResult;
    try {
        pushNodeResult = repoConnection.push({
            key: nodeId,
            //keys: [nodeId],
            target: 'master',
            resolve: false
        });
        log.debug(`${logPrefix} pushNodeResult:${toStr(pushNodeResult)}`);
    } catch (e) { handleError(e); }

    masterRepoConnection.refresh();

    let getNodeResult3;
    try {
        getNodeResult3 = masterRepoConnection.get(nodeId);
        log.debug(`${logPrefix} getNodeResult3:${toStr(getNodeResult3)}`);
    } catch (e) { handleError(e); }

    //findChildren parentKey
    repoConnection.refresh(); // query needs an index

    let queryResult2;
    try {
        queryResult2 = repoConnection.query({
            count: 10,
            //query: ''
            //start: 0
            //sort
        });
        log.debug(`${logPrefix} queryResult2:${toStr(queryResult2)}`);
    } catch (e) { handleError(e); }

    let deleteNodeResult;
    try {
        deleteNodeResult = repoConnection.delete(nodeId);
        log.debug(`${logPrefix} deleteNodeResult:${toStr(deleteNodeResult)}`);
    } catch (e) { handleError(e); }

    //deleteBranchFromRepo(branchId, repo)
    //deleteRepo(repoId);
    listRepos();

    global.model.status = '200 OK';
    log.debug(`${logPrefix} model:${toStr(global.model)}`);
    return { body: thymeleafRender(viewFile, global.model) };

} // get


function listRepos() {
    let repoListResult;
    try {
        repoListResult = repoList();
        log.debug(`${logPrefix} repoListResult:${toStr(repoListResult)}`);
    } catch (e) { return handleError(e); }
}


function getOrCreateRepo() {
    let repo;
    try {
        repo = repoGet(repoId);
        log.debug(`${logPrefix} repo:${toStr(repo)}`);
    } catch (e) { return handleError(e); }

    if(!repo) {
        try {
            repo = repoCreate({ id: repoId });
        } catch (e) { return handleError(e); }
    }
    return repo;
}

function createBranchInRepo(repo) {
    let createBranchResult;
    try {
        createBranchResult = repoCreateBranch({ branchId, repoId });
        log.debug(`${logPrefix} createBranchResult:${toStr(createBranchResult)}`);
    } catch (e) {
        if(e.message === `Branch [{${branchId}}] already exists`) {
            global.model.messages.push(e.message);
        } else { return handleError(e); }
    }
}


function deleteBranchFromRepo(branchId, repo) {
    let deleteBranchResult;
    try {
        deleteBranchResult = repoDeleteBranch({ branchId, repoId });
        log.debug(`${logPrefix} deleteBranchResult:${toStr(deleteBranchResult)}`);
    } catch (e) { return handleError(e); }
}


function deleteRepo(repoId) {
    let repoDeleteResult;
    try {
        repoDeleteResult = repoDelete(repoId);
        log.debug(`${logPrefix} repoDeleteResult:${toStr(repoDeleteResult)}`);
    } catch (e) { return handleError(e); }
}


function handleError(error) {
    log.error(error);
    global.model.status = '500 Internal Server Error';
    global.model.messages.push(error.message);
    log.error(`${logPrefix} model:${toStr(global.model)}`);
    return { body: thymeleafRender(viewFile, global.model) };
} // handleError
