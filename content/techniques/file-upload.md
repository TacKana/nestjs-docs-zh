### 文件上传

为处理文件上传，Nest 提供了一个基于 Express 的 [multer](https://github.com/expressjs/multer) 中间件包的内置模块。Multer 处理以 `multipart/form-data` 格式提交的数据，该格式主要用于通过 HTTP `POST` 请求上传文件。该模块完全可配置，您可以根据应用程序需求调整其行为。

> warning **警告** Multer 无法处理不支持的多部分格式（`multipart/form-data`）数据。另外，请注意此包与 `FastifyAdapter` 不兼容。

为了更好的类型安全，让我们安装 Multer 类型包：

```shell
$ npm i -D @types/multer
```

安装此包后，我们现在可以使用 `Express.Multer.File` 类型（您可以通过以下方式导入此类型：`import {{ '{' }} Express {{ '}' }} from 'express'`）。

#### 基础示例

要上传单个文件，只需将 `FileInterceptor()` 拦截器绑定到路由处理程序，并使用 `@UploadedFile()` 装饰器从 `request` 中提取 `file`。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  console.log(file);
}
@@switch
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@Bind(UploadedFile())
uploadFile(file) {
  console.log(file);
}
```

> info **提示** `FileInterceptor()` 装饰器从 `@nestjs/platform-express` 包导出。`@UploadedFile()` 装饰器从 `@nestjs/common` 导出。

`FileInterceptor()` 装饰器接受两个参数：

- `fieldName`：提供 HTML 表单中包含文件的字段名称的字符串
- `options`：类型为 `MulterOptions` 的可选对象。这与 multer 构造函数使用的对象相同（更多详情[在此](https://github.com/expressjs/multer#multeropts)）。

> warning **警告** `FileInterceptor()` 可能与第三方云提供商（如 Google Firebase 或其他）不兼容。

#### 文件验证

通常，验证传入的文件元数据（如文件大小或文件 MIME 类型）会很有用。为此，您可以创建自己的[管道](/pipes)并将其绑定到用 `UploadedFile` 装饰器注释的参数。以下示例演示了如何实现一个基本的文件大小验证管道：

```typescript
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // "value" 是包含文件属性和元数据的对象
    const oneKb = 1000;
    return value.size < oneKb;
  }
}
```

这可以与 `FileInterceptor` 结合使用，如下所示：

```typescript
@Post('file')
@UseInterceptors(FileInterceptor('file'))
uploadFileAndValidate(@UploadedFile(
  new FileSizeValidationPipe(),
  // 可以在此处添加其他管道
) file: Express.Multer.File, ) {
  return file;
}
```

Nest 提供了一个内置管道来处理常见用例，并促进/标准化新管道的添加。此管道称为 `ParseFilePipe`，您可以按如下方式使用它：

```typescript
@Post('file')
uploadFileAndPassValidation(
  @Body() body: SampleDto,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        // ... 此处设置文件验证器实例
      ]
    })
  )
  file: Express.Multer.File,
) {
  return {
    body,
    file: file.buffer.toString(),
  };
}
```

如您所见，需要指定一个文件验证器数组，这些验证器将由 `ParseFilePipe` 执行。我们将讨论验证器的接口，但值得一提的是，此管道还有两个额外的**可选**选项：

<table>
  <tr>
    <td><code>errorHttpStatusCode</code></td>
    <td>在<b>任何</b>验证器失败时抛出的 HTTP 状态码。默认为 <code>400</code>（错误请求）</td>
  </tr>
  <tr>
    <td><code>exceptionFactory</code></td>
    <td>接收错误消息并返回错误的工厂函数。</td>
  </tr>
</table>

现在，回到 `FileValidator` 接口。要将验证器与此管道集成，您必须使用内置实现或提供自己的自定义 `FileValidator`。请参见以下示例：

```typescript
export abstract class FileValidator<TValidationOptions = Record<string, any>> {
  constructor(protected readonly validationOptions: TValidationOptions) {}

  /**
   * 根据构造函数中传递的选项，指示此文件是否应视为有效。
   * @param file 来自请求对象的文件
   */
  abstract isValid(file?: any): boolean | Promise<boolean>;

  /**
   * 在验证失败时构建错误消息。
   * @param file 来自请求对象的文件
   */
  abstract buildErrorMessage(file: any): string;
}
```

> info **提示** `FileValidator` 接口通过其 `isValid` 函数支持异步验证。为了利用类型安全，如果您使用 express（默认）作为驱动程序，还可以将 `file` 参数类型化为 `Express.Multer.File`。

`FileValidator` 是一个常规类，可以访问文件对象并根据客户端提供的选项对其进行验证。Nest 有两个内置的 `FileValidator` 实现，您可以在项目中使用：

- `MaxFileSizeValidator` - 检查给定文件的大小是否小于提供的值（以 `bytes` 为单位）
- `FileTypeValidator` - 检查给定文件的 MIME 类型是否与给定的字符串或正则表达式匹配。默认使用文件内容的[魔数](https://www.ibm.com/support/pages/what-magic-number)验证 MIME 类型

要理解这些如何与上述 `FileParsePipe` 结合使用，我们将使用最后呈现示例的修改片段：

```typescript
@UploadedFile(
  new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: 1000 }),
      new FileTypeValidator({ fileType: 'image/jpeg' }),
    ],
  }),
)
file: Express.Multer.File,
```

> info **提示** 如果验证器的数量大幅增加或其选项使文件混乱，您可以在单独的文件中定义此数组，并将其作为命名常量（如 `fileValidators`）导入此处。

最后，您可以使用特殊的 `ParseFilePipeBuilder` 类来组合和构建您的验证器。通过如下使用，可以避免手动实例化每个验证器，而是直接传递它们的选项：

```typescript
@UploadedFile(
  new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: 'jpeg',
    })
    .addMaxSizeValidator({
      maxSize: 1000
    })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
    }),
)
file: Express.Multer.File,
```

> info **提示** 默认情况下文件是必需的，但您可以通过在 `build` 函数选项中（与 `errorHttpStatusCode` 同一级别）添加 `fileIsRequired: false` 参数来使其变为可选。

#### 文件数组

要上传文件数组（使用单个字段名标识），请使用 `FilesInterceptor()` 装饰器（注意装饰器名称中的复数形式 **Files**）。此装饰器接受三个参数：

- `fieldName`：如上所述
- `maxCount`：定义要接受的最大文件数的可选数字
- `options`：如上所述的可选 `MulterOptions` 对象

使用 `FilesInterceptor()` 时，使用 `@UploadedFiles()` 装饰器从 `request` 中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FilesInterceptor('files'))
uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
  console.log(files);
}
@@switch
@Post('upload')
@UseInterceptors(FilesInterceptor('files'))
@Bind(UploadedFiles())
uploadFile(files) {
  console.log(files);
}
```

> info **提示** `FilesInterceptor()` 装饰器从 `@nestjs/platform-express` 包导出。`@UploadedFiles()` 装饰器从 `@nestjs/common` 导出。

#### 多个文件

要上传多个文件（所有文件都有不同的字段名键），请使用 `FileFieldsInterceptor()` 装饰器。此装饰器接受两个参数：

- `uploadedFields`：对象数组，每个对象指定一个必需的 `name` 属性（字符串值，指定字段名，如上所述）和一个可选的 `maxCount` 属性（如上所述）
- `options`：如上所述的可选 `MulterOptions` 对象

使用 `FileFieldsInterceptor()` 时，使用 `@UploadedFiles()` 装饰器从 `request` 中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'avatar', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]))
uploadFile(@UploadedFiles() files: { avatar?: Express.Multer.File[], background?: Express.Multer.File[] }) {
  console.log(files);
}
@@switch
@Post('upload')
@Bind(UploadedFiles())
@UseInterceptors(FileFieldsInterceptor([
  { name: 'avatar', maxCount: 1 },
  { name: 'background', maxCount: 1 },
]))
uploadFile(files) {
  console.log(files);
}
```

#### 任意文件

要上传所有具有任意字段名键的字段，请使用 `AnyFilesInterceptor()` 装饰器。此装饰器可以接受一个可选的 `options` 对象，如上所述。

使用 `AnyFilesInterceptor()` 时，使用 `@UploadedFiles()` 装饰器从 `request` 中提取文件。

```typescript
@@filename()
@Post('upload')
@UseInterceptors(AnyFilesInterceptor())
uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
  console.log(files);
}
@@switch
@Post('upload')
@Bind(UploadedFiles())
@UseInterceptors(AnyFilesInterceptor())
uploadFile(files) {
  console.log(files);
}
```

#### 无文件

要接受 `multipart/form-data` 但不允许上传任何文件，请使用 `NoFilesInterceptor`。这会将多部分数据设置为请求正文上的属性。随请求发送的任何文件都将抛出 `BadRequestException`。

```typescript
@Post('upload')
@UseInterceptors(NoFilesInterceptor())
handleMultiPartData(@Body() body) {
  console.log(body)
}
```

#### 默认选项

您可以在文件拦截器中指定 multer 选项，如上所述。要设置默认选项，可以在导入 `MulterModule` 时调用静态 `register()` 方法，传入支持的选项。您可以使用[此处](https://github.com/expressjs/multer#multeropts)列出的所有选项。

```typescript
MulterModule.register({
  dest: './upload',
});
```

> info **提示** `MulterModule` 类从 `@nestjs/platform-express` 包导出。

#### 异步配置

当您需要异步而不是静态地设置 `MulterModule` 选项时，请使用 `registerAsync()` 方法。与大多数动态模块一样，Nest 提供了几种处理异步配置的技术。

一种技术是使用工厂函数：

```typescript
MulterModule.registerAsync({
  useFactory: () => ({
    dest: './upload',
  }),
});
```

像其他[工厂提供者](/fundamentals/custom-providers#factory-providers-usefactory)一样，我们的工厂函数可以是 `async` 的，并且可以通过 `inject` 注入依赖项。

```typescript
MulterModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    dest: configService.get<string>('MULTER_DEST'),
  }),
  inject: [ConfigService],
});
```

或者，您可以使用类而不是工厂来配置 `MulterModule`，如下所示：

```typescript
MulterModule.registerAsync({
  useClass: MulterConfigService,
});
```

上述构造在 `MulterModule` 内部实例化 `MulterConfigService`，使用它来创建所需的选项对象。请注意，在此示例中，`MulterConfigService` 必须实现 `MulterOptionsFactory` 接口，如下所示。`MulterModule` 将在提供的类的实例化对象上调用 `createMulterOptions()` 方法。

```typescript
@Injectable()
class MulterConfigService implements MulterOptionsFactory {
  createMulterOptions(): MulterModuleOptions {
    return {
      dest: './upload',
    };
  }
}
```

如果您想在 `MulterModule` 内部重用现有的选项提供者而不是创建私有副本，请使用 `useExisting` 语法。

```typescript
MulterModule.registerAsync({
  imports: [ConfigModule],
  useExisting: ConfigService,
});
```

您还可以将所谓的 `extraProviders` 传递给 `registerAsync()` 方法。这些提供者将与模块提供者合并。

```typescript
MulterModule.registerAsync({
  imports: [ConfigModule],
  useClass: ConfigService,
  extraProviders: [MyAdditionalProvider],
});
```

当您想为工厂函数或类构造函数提供额外的依赖项时，这很有用。

#### 示例

一个可工作的示例可在[此处](https://github.com/nestjs/nest/tree/master/sample/29-file-upload)找到。
