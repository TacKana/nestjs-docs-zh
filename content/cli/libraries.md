### 库（Libraries）

许多应用程序需要解决相同的通用问题，或在多种不同上下文中复用模块化组件。Nest 提供了多种方式来解决这个问题，每种方式在不同层面上运作，以满足不同的架构和组织目标。

Nest [模块（modules）](/modules) 对于提供执行上下文非常有用，使得在单个应用程序内共享组件成为可能。模块还可以通过 [npm](https://npmjs.com) 打包，创建可复用的库，并安装到不同项目中。这是分发可配置、可复用库的有效方式，适用于不同、松散关联或无关联的组织（例如，通过分发/安装第三方库）。

对于在紧密组织的团队（例如，公司/项目内部）之间共享代码，采用更轻量级的组件共享方式会很有帮助。单体仓库（monorepo）应运而生，实现了这一点，而在单体仓库中，**库（library）** 提供了一种简单、轻量级的代码共享方式。在 Nest 单体仓库中，使用库可以轻松组装共享组件的应用程序。实际上，这鼓励了单体应用程序的分解和开发流程，专注于构建和组合模块化组件。

#### Nest 库

Nest 库是一个 Nest 项目，与应用程序的不同之处在于它不能独立运行。库必须被导入到包含它的应用程序中，其代码才能执行。本节描述的内置库支持仅适用于**单体仓库**（标准模式项目可以通过 npm 包实现类似功能）。

例如，一个组织可能开发一个 `AuthModule`，通过实施管理所有内部应用程序的公司策略来处理身份验证。与其为每个应用程序分别构建该模块，或通过 npm 物理打包代码并要求每个项目安装，单体仓库可以将此模块定义为一个库。以这种方式组织时，所有库模块的使用者都可以看到提交的最新版本的 `AuthModule`。这对于协调组件开发和组装，以及简化端到端测试具有显著好处。

#### 创建库

任何适合复用的功能都是作为库管理的候选。决定什么应该是库，什么应该是应用程序的一部分，是一个架构设计决策。创建库不仅仅是简单地从现有应用程序复制代码到新库。当打包为库时，库代码必须与应用程序解耦。这可能需要**更多**的前期时间，并迫使您面对更紧密耦合代码时可能不会遇到的一些设计决策。但是，当库能够用于跨多个应用程序实现更快速的应用程序组装时，这些额外的努力是值得的。

要开始创建库，请运行以下命令：

```bash
$ nest g library my-library
```

运行命令时，`library` 原理图会提示您输入库的前缀（也称为别名）：

```bash
What prefix would you like to use for the library (default: @app)?
```

这将在您的工作区中创建一个名为 `my-library` 的新项目。
库类型的项目，与应用程序类型的项目一样，通过原理图生成到指定文件夹中。库在单体仓库根目录的 `libs` 文件夹下管理。Nest 在首次创建库时会创建 `libs` 文件夹。

为库生成的文件与为应用程序生成的文件略有不同。以下是执行上述命令后 `libs` 文件夹的内容：

<div class="file-tree">
  <div class="item">库</div>
  <div class="children">
    <div class="item">my-library</div>
    <div class="children">
      <div class="item">src</div>
      <div class="children">
        <div class="item">index.ts</div>
        <div class="item">my-library.module.ts</div>
        <div class="item">my-library.service.ts</div>
      </div>
      <div class="item">tsconfig.lib.json</div>
    </div>
  </div>
</div>

`nest-cli.json` 文件将在 `"projects"` 键下有一个新的库条目：

```javascript
...
{
    "my-library": {
      "type": "library",
      "root": "libs/my-library",
      "entryFile": "index",
      "sourceRoot": "libs/my-library/src",
      "compilerOptions": {
        "tsConfigPath": "libs/my-library/tsconfig.lib.json"
      }
}
...
```

库和应用程序在 `nest-cli.json` 元数据中有两个区别：

- `"type"` 属性设置为 `"library"` 而不是 `"application"`
- `"entryFile"` 属性设置为 `"index"` 而不是 `"main"`

这些差异指示构建过程适当地处理库。例如，库通过 `index.js` 文件导出其功能。

与应用程序类型的项目一样，每个库都有自己的 `tsconfig.lib.json` 文件，该文件扩展了根（单体仓库范围内）的 `tsconfig.json` 文件。如果需要，您可以修改此文件以提供特定于库的编译器选项。

您可以使用 CLI 命令构建库：

```bash
$ nest build my-library
```

#### 使用库

有了自动生成的配置文件，使用库就变得简单直接。我们如何将 `MyLibraryService` 从 `my-library` 库导入到 `my-project` 应用程序中？

首先，请注意使用库模块与使用任何其他 Nest 模块相同。单体仓库的作用是以一种透明的方式管理路径，以便导入库和生成构建。要使用 `MyLibraryService`，我们需要导入其声明模块。我们可以修改 `my-project/src/app.module.ts` 如下，以导入 `MyLibraryModule`。

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MyLibraryModule } from '@app/my-library';

@Module({
  imports: [MyLibraryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

注意上面我们在 ES 模块的 `import` 行中使用了 `@app` 的路径别名，这是我们在上面的 `nest g library` 命令中提供的 `prefix`。在底层，Nest 通过 tsconfig 路径映射处理这一点。当添加库时，Nest 会更新全局（单体仓库）的 `tsconfig.json` 文件的 `"paths"` 键，如下所示：

```javascript
"paths": {
    "@app/my-library": [
        "libs/my-library/src"
    ],
    "@app/my-library/*": [
        "libs/my-library/src/*"
    ]
}
```

因此，简而言之，单体仓库和库功能的结合使得将库模块包含到应用程序中变得简单直观。

同样的机制支持构建和部署组合库的应用程序。一旦您导入了 `MyLibraryModule`，运行 `nest build` 会自动处理所有模块解析，并将应用程序与任何库依赖项捆绑在一起，以便部署。单体仓库的默认编译器是 **webpack**，因此生成的发行文件是一个单独的文件，将所有转译后的 JavaScript 文件捆绑到一个文件中。您也可以切换到 `tsc`，如<a href="https://docs.nestjs.com/cli/monorepo#global-compiler-options">此处</a>所述。