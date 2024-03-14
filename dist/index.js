/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 252:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 736:
/***/ ((module) => {

module.exports = eval("require")("@aws-sdk/client-secrets-manager");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(252);
// const github = require('@actions/github');
const { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } = __nccwpck_require__(736);

let secretsPrefix = '';
try {
    process.env.AWS_ACCESS_KEY_ID = core.getInput('aws-access-key-id');
    process.env.AWS_SECRET_ACCESS_KEY = core.getInput('aws-secret-access-key');
    process.env.AWS_DEFAULT_REGION = core.getInput('aws-default-region');
} catch (error) {
    core.setFailed(error.message);
    console.error(error.message);
}

try {
    secretsPrefix = core.getInput('secrets-prefix');
} catch (error) {
    core.setFailed(error.message);
    console.error(error.message);
}

const client = new SecretsManagerClient({ region: core.getInput('aws-default-region') });

const getSecrets = async (secretsPrefix) => {
    let response;
    const allSecrets = [];
    const input = {
        MaxResults: 10,
        NextToken: undefined,
        IncludePlannedDeletion: false,
        Filters: [
            {
                Key: "name",
                Values: [
                    secretsPrefix,
                ],
            },
        ]
    };
    try {
        const command = new ListSecretsCommand(input);
        response = await client.send(command);
    } catch (error) {
        core.setFailed(error.message);
    }
    const pagedSecrets = response.SecretList.slice(0);
    input.NextToken = response.NextToken;
    while (input.NextToken !== undefined) {
        try {
            const command = new ListSecretsCommand(input);
            response = await client.send(command);
            input.NextToken = response.NextToken;
            const secretList = response.SecretList;
            secretList.map(async item => {
                pagedSecrets.push(item);
            });
        } catch (error) {
            core.setFailed(`Error 'List Secrets': ${error}\n${error.stack}`);
        }
    }
    for (const secret of pagedSecrets) {
        if (secret.ARN && secret.Name) {
            allSecrets.push({
                name: secret.Name,
                arn: secret.ARN
            });
        }
    }
    return allSecrets;
}

const getSecretValue = async (secretsName) => {
    const secretItem = [];
    const client = new SecretsManagerClient({ region: core.getInput('aws-default-region') });
    const input = {
        SecretId: secretsName
    };
    const command = new GetSecretValueCommand(input);
    const response = await client.send(command);
    if (response.SecretString) {
        try {
            const secretObject = JSON.parse(response.SecretString);
            for (const key of Object.keys(secretObject)) {
                secretItem.push({
                    name: key,
                    valueFrom: `${response.ARN}:${key}::`
                });
            }
        } catch(error) {
            secretItem.push({
                name: response.Name.replace(secretsPrefix, '').replace(/\//g, '_').toUpperCase(),
                valueFrom: response.ARN
            });
        }
    }
    return secretItem;
}


const handleSecrets = async (secretsPrefix) => {
    const secretsJSONlist = [];
    try {
        const secretsList = await getSecrets(secretsPrefix);
        for (const secret of secretsList) {
            const newItem = await getSecretValue(secret.name);
            newItem.map(item => secretsJSONlist.push(item));
        }
        core.setOutput("SecretsList", secretsJSONlist);
    } catch (error) {
        core.setFailed(error.message);
    }
}

handleSecrets(secretsPrefix);
})();

module.exports = __webpack_exports__;
/******/ })()
;