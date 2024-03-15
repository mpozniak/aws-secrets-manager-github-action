# aws-secrets-manager-github-action

This GitHub Action generates a list of secrets in the JSON format for using this list when inserting it into Task Definition in the ECS cluster.
Secrets are taken from the AWS Secrets Manager using the **prefix** specified as an input parameter.
The list of secrets is generated in the **valueForm** format for the **'secrets'** section, not for **'environments'**.

## Inputs
An GH Action has inputs:

 - **aws-access-key-id**: AWS_ACCESS_KEY_ID AWS key
 - **aws-secret-access-key**: AWS_SECRET_ACCESS_KEY
 - **aws-default-region**: AWS_DEFAULT_REGION
 - **secrets-prefix**: secrets prefix in AWS Secrets Manager (e.g. *'app_name/env_name/'*)

### Secrets list view
ECS Task-definition 'secrets' section:

```json
"secrets": [
                {
                    "name": "ENV_VAR01_NAME",
                    "valueFrom": "arn:aws:secretsmanager:aws-region:aws-account-id:secret:secret01-name-HaSh:SECRET_KEY01_NAME::"
                },
                {
                    "name": "ENV_VAR02_NAME",
                    "valueFrom": "arn:aws:secretsmanager:aws-region:aws-account-id:secret:secret02-name-HaSh:SECRET_KEY01_NAME::"
                }
 ]
```
## Outputs
An GH Action has one output:

 - **json_secrets_list**: **JSON** list of secrets (valueFrom format)

### Output format
   
```json
[
    {
        name: "ENV_VAR01_NAME",
    	valueFrom: "ARN"
    },
    {
    	name: "ENV_VAR02_NAME",
    	valueFrom: "ARN"
    }
]
 ```

## Example
```yaml
- name: Get JSON list of secrets
  id: get-json-list
  uses:  mpozniak/aws-secrets-manager-github-action@v1.0.2
  with:
    aws-access-key-id: ${{ secrets.ECS_DEPLOYMENT_ACCESS_KEY }}
    aws-secret-access-key: ${{ secrets.ECS_DEPLOYMENT_SECRET_KEY }}
    aws-default-region: ${{ env.AWS_REGION }}
    secrets-prefix:  project_name/app_name/environment/

- name: Get ECS task-definition JSON
  id: get-task-definition
  env:
    SECRETS_JSON: ${{ steps.get-json-list.outputs.SecretsList }}
  run: |
    echo $SECRETS_JSON | jq '.'
```