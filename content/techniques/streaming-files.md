### 流式传输文件

> info **注意** 本章展示了如何从您的 **HTTP 应用** 流式传输文件。以下示例不适用于 GraphQL 或微服务应用。

有时您可能希望从 REST API 向客户端发送文件。在 Nest 中通常的做法如下：

```ts
@Controller('file')
export class FileController {
  @Get()
  getFile(@Res() res: Response) {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    file.pipe(res);
  }
}
```

但这样做会导致您失去对控制器后拦截器逻辑的访问权限。为了解决这个问题，您可以返回一个 `StreamableFile` 实例，框架会在底层处理响应流的管道传输。

#### StreamableFile 类

`StreamableFile` 是一个持有待返回流的类。要创建新的 `StreamableFile`，您可以将 `Buffer` 或 `Stream` 传递给 `StreamableFile` 构造函数。

> info **提示** `StreamableFile` 类可从 `@nestjs/common` 导入。

#### 跨平台支持

默认情况下，Fastify 支持发送文件而无需调用 `stream.pipe(res)`，因此您完全不需要使用 `StreamableFile` 类。然而，Nest 在这两种平台类型中都支持使用 `StreamableFile`，所以如果您在 Express 和 Fastify 之间切换，无需担心两个引擎之间的兼容性。

#### 示例

以下是一个简单示例，将 `package.json` 作为文件而非 JSON 返回，但这一概念自然扩展到图像、文档和任何其他文件类型。

```ts
import { Controller, Get, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('file')
export class FileController {
  @Get()
  getFile(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file);
  }
}
```

默认的内容类型（`Content-Type` HTTP 响应头的值）是 `application/octet-stream`。如果您需要自定义此值，可以使用 `StreamableFile` 的 `type` 选项，或者使用 `res.set` 方法或 [`@Header()`](/controllers#response-headers) 装饰器，如下所示：

```ts
import { Controller, Get, StreamableFile, Res } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import type { Response } from 'express'; // 假设我们使用 ExpressJS HTTP 适配器

@Controller('file')
export class FileController {
  @Get()
  getFile(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="package.json"',
      // 如果您想将 Content-Length 值定义为不同于文件长度的值：
      // length: 123,
    });
  }

  // 或者：
  @Get()
  getFileChangingResponseObjDirectly(@Res({ passthrough: true }) res: Response): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="package.json"',
    });
    return new StreamableFile(file);
  }

  // 或者：
  @Get()
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="package.json"')
  getFileUsingStaticValues(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file);
  }  
}
```