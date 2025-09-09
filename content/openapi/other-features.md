### 其他功能

此页面列出了您可能会发现有用的其他可用功能。

#### 全局前缀

若要忽略通过 `setGlobalPrefix()` 设置的全局前缀，请使用 `ignoreGlobalPrefix`：

```typescript
const document = SwaggerModule.createDocument(app, options, {
  ignoreGlobalPrefix: true,
});
```

#### 全局参数

您可以使用 `DocumentBuilder` 为所有路由定义参数，如下所示：

```typescript
const config = new DocumentBuilder()
  .addGlobalParameters({
    name: 'tenantId',
    in: 'header',
  })
  // 其他配置
  .build();
```

#### 全局响应

您可以使用 `DocumentBuilder` 为所有路由定义全局响应。这有助于为应用程序中的所有端点设置一致的响应，例如 `401 Unauthorized` 或 `500 Internal Server Error` 等错误代码。

```typescript
const config = new DocumentBuilder()
  .addGlobalResponse({
    status: 500,
    description: '内部服务器错误',
  })
  // 其他配置
  .build();
```

#### 多规格支持

`SwaggerModule` 提供了支持多个规格的方式。换句话说，您可以在不同的端点上提供不同的文档和不同的用户界面。

要支持多个规格，您的应用程序必须采用模块化方法编写。`createDocument()` 方法接受第三个参数 `extraOptions`，它是一个包含名为 `include` 的属性的对象。`include` 属性接受一个模块数组作为值。

您可以如下设置多个规格支持：

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CatsModule } from './cats/cats.module';
import { DogsModule } from './dogs/dogs.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * createDocument(application, configurationOptions, extraOptions);
   *
   * createDocument 方法接受一个可选的第三个参数 "extraOptions"，
   * 它是一个包含 "include" 属性的对象，您可以在其中传递一个模块数组，
   * 这些模块将被包含在该 Swagger 规格中。
   * 例如：CatsModule 和 DogsModule 将有两个独立的 Swagger 规格，
   * 它们将在两个不同的端点上暴露两个不同的 SwaggerUI。
   */

  const options = new DocumentBuilder()
    .setTitle('猫咪示例')
    .setDescription('猫咪 API 描述')
    .setVersion('1.0')
    .addTag('cats')
    .build();

  const catDocumentFactory = () =>
    SwaggerModule.createDocument(app, options, {
      include: [CatsModule],
    });
  SwaggerModule.setup('api/cats', app, catDocumentFactory);

  const secondOptions = new DocumentBuilder()
    .setTitle('狗狗示例')
    .setDescription('狗狗 API 描述')
    .setVersion('1.0')
    .addTag('dogs')
    .build();

  const dogDocumentFactory = () =>
    SwaggerModule.createDocument(app, secondOptions, {
      include: [DogsModule],
    });
  SwaggerModule.setup('api/dogs', app, dogDocumentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

现在，您可以使用以下命令启动服务器：

```bash
$ npm run start
```

导航至 `http://localhost:3000/api/cats` 查看猫咪的 Swagger 界面：

<figure><img src="/assets/swagger-cats.png" /></figure>

而 `http://localhost:3000/api/dogs` 将暴露狗狗的 Swagger 界面：

<figure><img src="/assets/swagger-dogs.png" /></figure>

#### 探索栏中的下拉菜单

要在探索栏的下拉菜单中启用多规格支持，您需要在 `SwaggerCustomOptions` 中设置 `explorer: true` 并配置 `swaggerOptions.urls`。

> info **提示** 确保 `swaggerOptions.urls` 指向您的 Swagger 文档的 JSON 格式！要指定 JSON 文档，请在 `SwaggerCustomOptions` 中使用 `jsonDocumentUrl`。有关更多设置选项，请查看[此处](/openapi/introduction#setup-options)。

以下是如何从探索栏的下拉菜单中设置多个规格的方法：

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CatsModule } from './cats/cats.module';
import { DogsModule } from './dogs/dogs.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 主 API 选项
  const options = new DocumentBuilder()
    .setTitle('多规格示例')
    .setDescription('多规格描述')
    .setVersion('1.0')
    .build();

  // 创建主 API 文档
  const document = SwaggerModule.createDocument(app, options);

  // 设置主 API Swagger UI 并支持下拉菜单
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: {
      urls: [
        {
          name: '1. API',
          url: 'api/swagger.json',
        },
        {
          name: '2. Cats API',
          url: 'api/cats/swagger.json',
        },
        {
          name: '3. Dogs API',
          url: 'api/dogs/swagger.json',
        },
      ],
    },
    jsonDocumentUrl: '/api/swagger.json',
  });

  // 猫咪 API 选项
  const catOptions = new DocumentBuilder()
    .setTitle('猫咪示例')
    .setDescription('猫咪 API 描述')
    .setVersion('1.0')
    .addTag('cats')
    .build();

  // 创建猫咪 API 文档
  const catDocument = SwaggerModule.createDocument(app, catOptions, {
    include: [CatsModule],
  });

  // 设置猫咪 API Swagger UI
  SwaggerModule.setup('api/cats', app, catDocument, {
    jsonDocumentUrl: '/api/cats/swagger.json',
  });

  // 狗狗 API 选项
  const dogOptions = new DocumentBuilder()
    .setTitle('狗狗示例')
    .setDescription('狗狗 API 描述')
    .setVersion('1.0')
    .addTag('dogs')
    .build();

  // 创建狗狗 API 文档
  const dogDocument = SwaggerModule.createDocument(app, dogOptions, {
    include: [DogsModule],
  });

  // 设置狗狗 API Swagger UI
  SwaggerModule.setup('api/dogs', app, dogDocument, {
    jsonDocumentUrl: '/api/dogs/swagger.json',
  });

  await app.listen(3000);
}

bootstrap();
```

在此示例中，我们设置了一个主 API 以及猫咪和狗狗的独立规格，每个都可以从探索栏的下拉菜单中访问。