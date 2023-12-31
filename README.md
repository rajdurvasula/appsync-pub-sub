# AppSync Pub-Sub CDK TypeScript project

This is a project for CDK development with TypeScript.

This projects demonstrates AWS AppSync GraphQL Subscription feature.

This is the `backend` setup.

Refer to `frontend` ReactJS project: [simplews-app](https://github.com/rajdurvasula/simplews-app.git)

## Resources
Following resources are created:
- AppSync API
  - Mutation
  - Subscription
  - Functions, Resolvers in VTL
  - NONE Datasource

## Prerequisites

- Setup AWS Credentials profile

- Install npm dependencies in `Project ROOT folder`
```
npm install
```

- Bootstrap CDK
```
cdk bootstrap aws://ACCOUNT_ID/REGION
```

## Deployment
- Synthesize CDK Project
```
cdk synth
```
- Deploy Project
```
cdk deploy --require-approval=never
```

## Cleanup
- Delete deployed Stack
```
cdk destroy
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
