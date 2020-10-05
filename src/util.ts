'use strict'

import {
    commands,
    env,
    EventEmitter,
    Position,
    Uri,
    window,
    workspace,
    WorkspaceEdit
} from 'vscode'

const fs = require('fs-extra')
export const resetLinks = new EventEmitter()

export async function getFilePath(text, document) {
    let info = text.replace(/['"]/g, '')
    let viewPath = '/resources/views'

    if (info.includes('::')) {
        let searchFor = info.split('::')
        viewPath = `${viewPath}/vendor/${searchFor[0]}`
        info = searchFor[1]
    }

    return getData(document, viewPath, info)
}

function gtvFileName(list) {
    if (list.startsWith('<x-')) {
        return list.substring(3).replace(/\./g, '/') + '.blade.php';
    } else if (list.startsWith('<livewire:')) {
        return list.substring(10).replace(/\./g, '/') + '.php';
    } else {
        return list.replace(/\./g, '/') + '.blade.php';
    }
}

function gtvFilePath(path, list) {
    if (list.startsWith('<x-')) {
        return path + '/components/' + gtvFileName(list);
    } else if (list.startsWith('<livewire:')) {
        return '/app/Http/Livewire/' + gtvFileName(list);
    } else {
        return path + '/' + gtvFileName(list);
    }
}

async function getData(document, path, list) {
    let workspaceFolder = workspace.getWorkspaceFolder(document.uri).uri.fsPath
    let editor = `${env.uriScheme}://file`
    let fileName = gtvFileName(list);
    let filePath = workspaceFolder + gtvFilePath(path, list);
    let exists = await fs.pathExists(filePath)

    return exists
        ? {
            tooltip: fileName,
            fileUri: Uri.file(filePath)
        }
        : config.createViewIfNotFound
            ? {
                tooltip: `create "${fileName}"`,
                fileUri: Uri
                    .parse(`${editor}${workspaceFolder}${path}/${fileName}`)
                    .with({authority: 'ctf0.laravel-goto-view'})
            }
            : false
}

/* Create ------------------------------------------------------------------- */
export function createFileFromText() {
    window.registerUriHandler({
        async handleUri(uri) {
            let {authority, path} = uri

            if (authority == 'ctf0.laravel-goto-view') {
                let file = Uri.file(path)
                let defVal = config.viewDefaultValue
                let edit = new WorkspaceEdit()
                edit.createFile(file)

                if (defVal) {
                    edit.insert(file, new Position(0, 0), defVal)
                }

                await workspace.applyEdit(edit)

                window.showInformationMessage(`Laravel Goto View: "${path}" created`)
                resetLinks.fire()

                if (config.activateViewAfterCreation) {
                    commands.executeCommand('vscode.openFolder', file)
                }
            }
        }
    })
}

/* Config ------------------------------------------------------------------- */
const escapeStringRegexp = require('escape-string-regexp')
export let config: any = {}
export let methods: any = ''

export function readConfig() {
    config = workspace.getConfiguration('laravel_goto_view')
    methods = config.methods.map((e) => escapeStringRegexp(e)).join('|')
}
