import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export class PubSub1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const region = cdk.Stack.of(this).region;
    const account = cdk.Stack.of(this).account;

    // appsync api role
    const graphApiRole = new iam.Role(this, 'graph-api-role', {
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      roleName: 'graph-api-role',
      description: 'Role for AppSync API'
    });

    // cloudwatch logs policy
    const cwLogPolicy = new iam.Policy(this, 'cw-log-policy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream'
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:logs:${region}:${account}:log-group:*`
          ]
        }),
        new iam.PolicyStatement({
          actions: [
            'logs:PutLogEvents'
          ],
          effect: iam.Effect.ALLOW,
          resources: [
            `arn:aws:logs:${region}:${account}:log-group:*:log-stream:*`
          ]
        })
      ]
    });
    graphApiRole.attachInlinePolicy(cwLogPolicy);

    const graphApi = new appsync.GraphqlApi(this, 'graph-api', {
      name: 'graph-api',
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY
        }
      },
      logConfig: {
        role: graphApiRole,
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        retention: logs.RetentionDays.ONE_DAY
      },
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../src/schema/sample.graphql'))
    });
    const noneDS = new appsync.NoneDataSource(this, 'pubsub-none-ds', {
      api: graphApi,
      name: 'pubsub',
      description: 'none datasource pubsub'
    });
    // function for mutation
    const sendMessageFunc = new appsync.AppsyncFunction(this, 'send-message-func', {
      api: graphApi,
      name: 'send_message_func',
      dataSource: noneDS,
      requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../src/templates/sendMessage/request/request.vtl')),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../src/templates/sendMessage/response/response.vtl'))
    });
    // Resolver for mutation
    const sendMessageResolver = new appsync.Resolver(this, 'send-message-resolver', {
      api: graphApi,
      fieldName: 'sendMessage',
      typeName: 'Mutation',
      pipelineConfig: [ sendMessageFunc ],
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
$util.qr($ctx.stash.put("typeName", "Mutation"))
$util.qr($ctx.stash.put("fieldName", "sendMessage"))
$util.qr($ctx.stash.put("conditions", []))
$util.qr($ctx.stash.put("metadata", {}))
$util.qr($ctx.stash.metadata.put("dataSourceType", "NONE"))
$util.qr($ctx.stash.metadata.put("apiId", "${graphApi.apiId}"))
$util.qr($ctx.stash.put("connectionAttributes", {}))
$util.toJson({})`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`$util.toJson($context.prev.result)`)
    });
    // function for subscription
    const pubSubFunc = new appsync.AppsyncFunction(this, 'pubsub-func', {
      api: graphApi,
      name: 'pubsub_func',
      dataSource: noneDS,
      requestMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../src/templates/onSendMessage/request/request.vtl')),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(path.join(__dirname, '../src/templates/onSendMessage/response/response.vtl'))
    });
    // Resolver for subscription
    const onSendMessageResolver = new appsync.Resolver(this, 'on-send-message-resolver', {
      api: graphApi,
      fieldName: 'onSendMessage',
      typeName: 'Subscription',
      pipelineConfig: [ pubSubFunc ],
      requestMappingTemplate: appsync.MappingTemplate.fromString(`$util.qr($ctx.stash.put("typeName", "Subscription"))
$util.qr($ctx.stash.put("fieldName", "onSendMessage"))
$util.qr($ctx.stash.put("conditions", []))
$util.qr($ctx.stash.put("metadata", {}))
$util.qr($ctx.stash.metadata.put("dataSourceType", "NONE"))
$util.qr($ctx.stash.metadata.put("apiId", "${graphApi.apiId}"))
$util.qr($ctx.stash.put("connectionAttributes", {}))
$util.toJson({})`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`$util.toJson($ctx.prev.result)`)
    });

    new cdk.CfnOutput(this, 'graphqlUrl', { value: graphApi.graphqlUrl })
    new cdk.CfnOutput(this, 'apiKey', { value: graphApi.apiKey! })
    new cdk.CfnOutput(this, 'apiId', { value: graphApi.apiId })
    new cdk.CfnOutput(this, 'region', { value: region })    

  }
}
