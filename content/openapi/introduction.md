### 介绍

[OpenAPI](https://swagger.io/specification/) 规范是一种与语言无关的定义格式，用于描述 RESTful API。Nest 提供了一个专用的[模块](https://github.com/nestjs/swagger)，允许通过装饰器生成此类规范。

#### 安装

要开始使用，首先需要安装所需的依赖项。

```bash
$ npm install --save @nestjs/swagger
```

#### 初始化

安装完成后，打开 `main.ts` 文件，使用 `SwaggerModule` 类初始化 Swagger：

```typescript
@@filename(main)
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

> info **提示** 工厂方法 `SwaggerModule.createDocument()` 专门用于在请求时生成 Swagger 文档。这种方法有助于节省初始化时间，生成的文档是一个可序列化的对象，符合 [OpenAPI 文档](https://swagger.io/specification/#openapi-document)规范。除了通过 HTTP 提供文档外，你还可以将其保存为 JSON 或 YAML 文件，并以多种方式使用。

`DocumentBuilder` 有助于构建符合 OpenAPI 规范的基础文档。它提供了多个方法，允许设置标题、描述、版本等属性。为了创建完整的文档（包含所有定义的 HTTP 路由），我们使用 `SwaggerModule` 类的 `createDocument()` 方法。该方法接受两个参数：应用程序实例和 Swagger 配置对象。或者，我们可以提供第三个参数，类型为 `SwaggerDocumentOptions`。更多信息请参阅[文档选项部分](/openapi/introduction#document-options)。

创建文档后，我们可以调用 `setup()` 方法。它接受以下参数：

1. 挂载 Swagger UI 的路径
2. 应用程序实例
3. 上面实例化的文档对象
4. 可选的配置参数（更多信息请参阅[此处](/openapi/introduction#setup-options)）

现在，你可以运行以下命令来启动 HTTP 服务器：

```bash
$ npm run start
```

应用程序运行时，打开浏览器并访问 `http://localhost:3000/api`。你应该能看到 Swagger UI。

<figure><img src="/assets/swagger1.png" /></figure>

如你所见，`SwaggerModule` 自动反映了所有端点。

> info **提示** 要生成并下载 Swagger JSON 文件，请访问 `http://localhost:3000/api-json`（假设你的 Swagger 文档可在 `http://localhost:3000/api` 访问）。
> 也可以仅使用 `@nestjs/swagger` 中的 setup 方法将其暴露在你选择的路径上，例如：
>
> ```typescript
> SwaggerModule.setup('swagger', app, documentFactory, {
>   jsonDocumentUrl: 'swagger/json',
> });
> ```
>
> 这将在 `http://localhost:3000/swagger/json` 处暴露它。

> warning **警告** 使用 `fastify` 和 `helmet` 时，可能会遇到 [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) 问题。要解决此冲突，请按如下方式配置 CSP：
>
> ```typescript
> app.register(helmet, {
>   contentSecurityPolicy: {
>     directives: {
>       defaultSrc: [`'self'`],
>       styleSrc: [`'self'`, `'unsafe-inline'`],
>       imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
>       scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
>     },
>   },
> });
>
> // 如果完全不想使用 CSP，可以使用以下方式：
> app.register(helmet, {
>   contentSecurityPolicy: false,
> });
> ```

#### 文档选项

创建文档时，可以提供一些额外的选项来微调库的行为。这些选项应为 `SwaggerDocumentOptions` 类型，可能包含以下内容：

```TypeScript
export interface SwaggerDocumentOptions {
  /**
   * 要包含在规范中的模块列表
   */
  include?: Function[];

  /**
   * 应检查并包含在规范中的额外模型
   */
  extraModels?: Function[];

  /**
   * 如果为 `true`，swagger 将忽略通过 `setGlobalPrefix()` 方法设置的全局前缀
   */
  ignoreGlobalPrefix?: boolean;

  /**
   * 如果为 `true`，swagger 还将加载由 `include` 模块导入的模块中的路由
   */
  deepScanRoutes?: boolean;

  /**
   * 用于基于 `controllerKey`、`methodKey` 和版本生成 `operationId` 的自定义 operationIdFactory
   * @默认值 () => controllerKey_methodKey_version
   */
  operationIdFactory?: OperationIdFactory;

  /**
   * 用于在响应的 `links` 字段中生成链接名称的自定义 linkNameFactory
   *
   * @see [链接对象](https://swagger.io/docs/specification/links/)
   *
   * @默认值 () => `${controllerKey}_${methodKey}_from_${fieldKey}`
   */
  linkNameFactory?: (
    controllerKey: string,
    methodKey: string,
    fieldKey: string
  ) => string;

  /*
   * 基于控制器名称自动生成标签。
   * 如果为 `false`，则必须使用 `@ApiTags()` 装饰器定义标签。
   * 否则，将使用不带 `Controller` 后缀的控制器名称。
   * @默认值 true
   */
  autoTagControllers?: boolean;
}
```

例如，如果你希望库生成像 `createUser` 这样的操作名称，而不是 `UsersController_createUser`，可以设置以下内容：

```TypeScript
const options: SwaggerDocumentOptions =  {
  operationIdFactory: (
    controllerKey: string,
    methodKey: string
  ) => methodKey
};
const documentFactory = () => SwaggerModule.createDocument(app, config, options);
```

#### 设置选项

你可以通过将满足 `SwaggerCustomOptions` 接口的选项对象作为 `SwaggerModule#setup` 方法的第四个参数传递来配置 Swagger UI。

```TypeScript
export interface SwaggerCustomOptions {
  /**
   * 如果为 `true`，Swagger 资源路径将通过 `setGlobalPrefix()` 设置的全局前缀进行前缀。
   * 默认值：`false`。
   * @see https://docs.nestjs.com/faq/global-prefix
   */
  useGlobalPrefix?: boolean;

  /**
   * 如果为 `false`，Swagger UI 将不会被提供。只有 API 定义（JSON 和 YAML）
   * 可访问（在 `/{path}-json` 和 `/{path}-yaml` 上）。要完全禁用 Swagger UI 和 API 定义，请使用 `raw: false`。
   * 默认值：`true`。
   * @已弃用 使用 `ui` 代替。
   */
  swaggerUiEnabled?: boolean;

  /**
   * 如果为 `false`，Swagger UI 将不会被提供。只有 API 定义（JSON 和 YAML）
   * 可访问（在 `/{path}-json` 和 `/{path}-yaml` 上）。要完全禁用 Swagger UI 和 API 定义，请使用 `raw: false`。
   * 默认值：`true`。
   */
  ui?: boolean;

  /**
   * 如果为 `true`，将提供所有格式的原始定义。
   * 或者，你可以传递一个数组来指定要提供的格式，例如 `raw: ['json']` 以仅提供 JSON 定义。
   * 如果省略或设置为空数组，则不提供任何定义（JSON 或 YAML）。
   * 使用此选项控制 Swagger 相关端点的可用性。
   * 默认值：`true`。
   */
  raw?: boolean | Array<'json' | 'yaml'>;

  /**
   * 指向要在 Swagger UI 中加载的 API 定义的 URL。
   */
  swaggerUrl?: string;

  /**
   * 要提供的 JSON API 定义的路径。
   * 默认值：`<path>-json`。
   */
  jsonDocumentUrl?: string;

  /**
   * 要提供的 YAML API 定义的路径。
   * 默认值：`<path>-yaml`。
   */
  yamlDocumentUrl?: string;

  /**
   * 在提供 OpenAPI 文档之前允许修改文档的钩子。
   * 它在文档生成之后、作为 JSON 和 YAML 提供之前调用。
   */
  patchDocumentOnRequest?: <TRequest = any, TResponse = any>(
    req: TRequest,
    res: TResponse,
    document: OpenAPIObject
  ) => OpenAPIObject;

  /**
   * 如果为 `true`，OpenAPI 定义的选择器将显示在 Swagger UI 界面中。
   * 默认值：`false`。
   */
  explorer?: boolean;

  /**
   * 额外的 Swagger UI 选项
   */
  swaggerOptions?: SwaggerUiOptions;

  /**
   * 要注入到 Swagger UI 页面中的自定义 CSS 样式。
   */
  customCss?: string;

  /**
   * 要在 Swagger UI 页面中加载的自定义 CSS 样式表的 URL。
   */
  customCssUrl?: string | string[];

  /**
   * 要在 Swagger UI 页面中加载的自定义 JavaScript 文件的 URL。
   */
  customJs?: string | string[];

  /**
   * 要在 Swagger UI 页面中加载的自定义 JavaScript 脚本。
   */
  customJsStr?: string | string[];

  /**
   * Swagger UI 页面的自定义 favicon。
   */
  customfavIcon?: string;

  /**
   * Swagger UI 页面的自定义标题。
   */
  customSiteTitle?: string;

  /**
   * 包含静态 Swagger UI 资源的文件系统路径（例如：./node_modules/swagger-ui-dist）。
   */
  customSwaggerUiPath?: string;

  /**
   * @已弃用 此属性无效。
   */
  validatorUrl?: string;

  /**
   * @已弃用 此属性无效。
   */
  url?: string;

  /**
   * @已弃用 此属性无效。
   */
  urls?: Record<'url' | 'name', string>[];
}
```

> info **提示** `ui` 和 `raw` 是独立的选项。禁用 Swagger UI (`ui: false`) 不会禁用 API 定义（JSON/YAML）。相反，禁用 API 定义 (`raw: []`) 不会禁用 Swagger UI。
>
> 例如，以下配置将禁用 Swagger UI，但仍允许访问 API 定义：
>
> ```typescript
> const options: SwaggerCustomOptions = {
>   ui: false, // Swagger UI 被禁用
>   raw: ['json'], // JSON API 定义仍可访问（YAML 被禁用）
> };
> SwaggerModule.setup('api', app, options);
> ```
>
> 在这种情况下，http://localhost:3000/api-json 仍可访问，但 http://localhost:3000/api (Swagger UI) 将不可访问。

#### 示例

可用的工作示例请参见[此处](https://github.com/nestjs/nest/tree/master/sample/11-swagger)。