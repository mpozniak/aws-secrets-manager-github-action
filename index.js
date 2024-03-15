const core = require('@actions/core');
// const github = require('@actions/github');
const { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { SSMClient, DescribeParametersCommand } = require("@aws-sdk/client-ssm");
const awsRegion = core.getInput('aws-default-region');

let secretsPrefix = '';
try {
    process.env.AWS_ACCESS_KEY_ID = core.getInput('aws-access-key-id');
    process.env.AWS_SECRET_ACCESS_KEY = core.getInput('aws-secret-access-key');
    process.env.AWS_DEFAULT_REGION = awsRegion;
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

const client = new SecretsManagerClient({ region: awsRegion });
const ssmClient = new SSMClient({ region: awsRegion });

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

const getParameters = async (secretsPrefix) => {
    let response;
    const allParameters = [];
    const input = {
        MaxResults: 10,
        NextToken: undefined,
        ParameterFilters: [
            {
                Key: 'Name',
                Option: 'Contains',
                Values: [
                    secretsPrefix
                ]
            },
        ]
    };

    try {
        const command = new DescribeParametersCommand(input);
        response = await ssmClient.send(command);
    } catch (error) {
        core.setFailed(`Error 'DescribeParameters': ${error}\n${error.stack}`);
    }

    const pagedParameters = response.Parameters.slice(0);
    input.NextToken = response.NextToken;
    while (input.NextToken !== undefined) {
        try {
            const command = new DescribeParametersCommand(input);
            const response = await ssmClient.send(command);
            input.NextToken = response.NextToken;
            const paramsData = response.Parameters;
            paramsData.map(async item => {
                pagedParameters.push(item);
            });
        } catch (error) {
            core.setFailed(`Error 'Next page DescribeParameters': ${error}\n${error.stack}`);
        }
    }

    for (const parameter of pagedParameters) {
        if (parameter.ARN && parameter.Name) {
            allParameters.push({
                name: parameter.Name.replace('/' + secretsPrefix, '').toUpperCase(),
                valueFrom: parameter.ARN
            });
        }
    }
    return allParameters;
}

const getSecretValue = async (secretsName) => {
    const secretItem = [];
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
        } catch (error) {
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
        const parametersList = await getParameters(secretsPrefix);
        for (const secret of secretsList) {
            const newItem = await getSecretValue(secret.name);
            newItem.map(item => secretsJSONlist.push(item));
        }
        for (const parameter of parametersList) {
            secretsJSONlist.push(parameter);
        }
        core.setOutput("SecretsList", secretsJSONlist);
    } catch (error) {
        core.setFailed(error.message);
    }
}

handleSecrets(secretsPrefix);
