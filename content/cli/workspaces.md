### 工作区（Workspaces）

Nest 提供两种代码组织模式：

- **标准模式**：适用于构建专注于单个项目的应用程序，这些应用拥有独立的依赖项和设置，无需为共享模块或优化复杂构建流程而调整。这是默认模式。
- **monorepo 模式**：此模式将代码产物视为轻量级**单体仓库（monorepo）**的一部分，更适合开发团队和/或多项目环境。它自动化了构建流程的部分环节，便于创建和组合模块化组件，促进代码重用，简化集成测试，轻松共享项目范围内的构件（如 `eslint` 规则及其他配置策略），并且比 Git 子模块等替代方案更易使用。Monorepo 模式运用**工作区（workspace）**的概念，通过 `nest-cli.json` 文件来协调 monorepo 各组件间的关系。

值得注意的是，Nest 的几乎所有功能都与代码组织模式无关。这一选择**唯一**的影响在于项目的组合方式及构建产物的生成方式。从 CLI 到核心模块，再到附加模块，所有其他功能在两种模式下均保持一致。

此外，您可以随时轻松地从**标准模式**切换到**monorepo 模式**，因此可以等到其中一种方法的优势更加明确时再做决定。

#### 标准模式

当您运行 `nest new` 时，系统会使用内置的示意图（schematic）为您创建一个新**项目**。Nest 会执行以下操作：

1. 创建一个新文件夹，对应您提供给 `nest new` 的 `name` 参数
2. 用最小化的基础级 Nest 应用的默认文件填充该文件夹。您可以在 [typescript-starter](https://github.com/nestjs/typescript-starter) 代码库中查看这些文件
3. 提供额外文件，如 `nest-cli.json`、`package.json` 和 `tsconfig.json`，用于配置并启用编译、测试和运行应用的各种工具

之后，您可以修改初始文件、添加新组件、添加依赖项（例如 `npm install`），并按照本文档其余部分的说明开发您的应用。

#### Monorepo 模式

要启用 monorepo 模式，您需要从一个_标准模式_结构开始，并添加**项目**。项目可以是完整的**应用**（通过 `nest generate app` 命令添加到工作区）或**库**（通过 `nest generate library` 命令添加到工作区）。我们将在下文讨论这些特定类型项目组件的细节。现在需要注意的关键点是，**向现有标准模式结构添加项目**这一操作会**将其转换**为 monorepo 模式。让我们看一个例子。

如果我们运行：

```bash
$ nest new my-project
```

我们就构建了一个_标准模式_结构，其文件夹结构如下：

<div class="file-tree">
  <div class="item">node_modules</div>
  <div class="item">src</div>
  <div class="children">
    <div class="item">app.controller.ts</div>
    <div class="item">app.module.ts</div>
    <div class="item">app.service.ts</div>
    <div class="item">main.ts</div>
  </div>
  <div class="item">nest-cli.json</div>
  <div class="item">package.json</div>
  <div class="item">tsconfig.json</div>
  <div class="item">eslint.config.mjs</div>
</div>

我们可以通过以下方式将其转换为 monorepo 模式结构：

```bash
$ cd my-project
$ nest generate app my-app
```

此时，`nest` 将现有结构转换为 **monorepo 模式**结构。这带来了一些重要变化。文件夹结构现在如下：

<div class="file-tree">
  <div class="item">apps</div>
    <div class="children">
      <div class="item">my-app</div>
      <div class="children">
        <div class="item">src</div>
        <div class="children">
          <div class="item">app.controller.ts</div>
          <div class="item">app.module.ts</div>
          <div class="item">app.service.ts</div>
          <div class="item">main.ts</div>
        </div>
        <div class="item">tsconfig.app.json</div>
      </div>
      <div class="item">my-project</div>
      <div class="children">
        <div class="item">src</div>
        <div class="children">
          <div class="item">app.controller.ts</div>
          <div class="item">app.module.ts</div>
          <div class="item">app.service.ts</div>
          <div class="item">main.ts</div>
        </div>
        <div class="item">tsconfig.app.json</div>
      </div>
    </div>
  <div class="item">nest-cli.json</div>
  <div class="item">package.json</div>
  <div class="item">tsconfig.json</div>
  <div class="item">eslint.config.mjs</div>
</div>

`generate app` 示意图重新组织了代码——将每个**应用**项目移至 `apps` 文件夹下，并在每个项目的根文件夹中添加了项目特定的 `tsconfig.app.json` 文件。我们原始的 `my-project` 应用成为了 monorepo 的**默认项目**，并与刚添加的 `my-app` 并列位于 `apps` 文件夹下。我们将在下文讨论默认项目。

> error **警告** 只有遵循标准 Nest 项目结构的项目才能从标准模式结构转换为 monorepo。具体来说，在转换过程中，示意图会尝试将 `src` 和 `test` 文件夹重新定位到根目录下 `apps` 文件夹内的项目文件夹中。如果项目未使用此结构，转换将失败或产生不可靠的结果。

#### 工作区项目

Monorepo 使用工作区的概念来管理其成员实体。工作区由**项目**组成。项目可以是：

- **应用**：一个完整的 Nest 应用，包含用于引导应用的 `main.ts` 文件。除了编译和构建方面的考虑，工作区中的应用型项目在功能上与_标准模式_结构中的应用完全相同
- **库**：库是一种打包通用功能集（模块、提供者、控制器等）的方式，可在其他项目中使用。库无法独立运行，且没有 `main.ts` 文件。在[库](/cli/libraries)章节中了解更多信息

所有工作区都有一个**默认项目**（应为应用型项目）。这由 `nest-cli.json` 文件中的顶层 `"root"` 属性定义，该属性指向默认项目的根目录（详见下文的 [CLI 属性](/cli/monorepo#cli-properties)）。通常，这是您最初使用的**标准模式**应用，后来通过 `nest generate app` 转换为 monorepo。当您按照这些步骤操作时，此属性会自动填充。

当未提供项目名称时，`nest build` 和 `nest start` 等 `nest` 命令会使用默认项目。

例如，在上述 monorepo 结构中，运行

```bash
$ nest start
```

将启动 `my-project` 应用。要启动 `my-app`，我们需要使用：

```bash
$ nest start my-app
```

#### 应用

应用型项目，或我们非正式地称之为“应用”，是您可以运行和部署的完整 Nest 应用。您可以使用 `nest generate app` 生成应用型项目。

此命令自动生成项目骨架，包括来自 [typescript starter](https://github.com/nestjs/typescript-starter) 的标准 `src` 和 `test` 文件夹。与标准模式不同，monorepo 中的应用项目没有任何包依赖（`package.json`）或其他项目配置构件，如 `.prettierrc` 和 `eslint.config.mjs`。相反，使用 monorepo 范围内的依赖项和配置文件。

但是，示意图会在项目的根文件夹中生成一个项目特定的 `tsconfig.app.json` 文件。此配置文件自动设置适当的构建选项，包括正确设置编译输出文件夹。该文件扩展了顶层（monorepo）的 `tsconfig.json` 文件，因此您可以在 monorepo 范围内管理全局设置，但根据需要可在项目级别覆盖它们。

#### 库

如前所述，库型项目，或简称为“库”，是需要组合到应用中才能运行的 Nest 组件包。您可以使用 `nest generate library` 生成库型项目。决定什么属于库是一个架构设计决策。我们在[库](/cli/libraries)章节中深入讨论库。

#### CLI 属性

Nest 在 `nest-cli.json` 文件中保存了组织和构建标准及 monorepo 结构项目所需的元数据。当您添加项目时，Nest 会自动添加和更新此文件，因此您通常不需要考虑或编辑其内容。但是，有些设置您可能希望手动更改，因此对该文件有个概览性的理解是有帮助的。

运行上述步骤创建 monorepo 后，我们的 `nest-cli.json` 文件如下所示：

```javascript
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/my-project/src",
  "monorepo": true,
  "root": "apps/my-project",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/my-project/tsconfig.app.json"
  },
  "projects": {
    "my-project": {
      "type": "application",
      "root": "apps/my-project",
      "entryFile": "main",
      "sourceRoot": "apps/my-project/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-project/tsconfig.app.json"
      }
    },
    "my-app": {
      "type": "application",
      "root": "apps/my-app",
      "entryFile": "main",
      "sourceRoot": "apps/my-app/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-app/tsconfig.app.json"
      }
    }
  }
}
```

该文件分为几个部分：

- 一个全局部分，包含控制标准和 monorepo 范围设置的顶层属性
- 一个顶层属性（`"projects"`），包含每个项目的元数据。此部分仅存在于 monorepo 模式结构中

顶层属性如下：

- `"collection"`：指向用于生成组件的示意图集合；通常不应更改此值
- `"sourceRoot"`：指向标准模式结构中单个项目的源代码根目录，或 monorepo 模式结构中的_默认项目_
- `"compilerOptions"`：一个映射，键指定编译器选项，值指定选项设置；详见下文
- `"generateOptions"`：一个映射，键指定全局生成选项，值指定选项设置；详见下文
- `"monorepo"`：（仅 monorepo）对于 monorepo 模式结构，此值始终为 `true`
- `"root"`：（仅 monorepo）指向_默认项目_的项目根目录

#### 全局编译器选项

这些属性指定要使用的编译器以及影响**任何**编译步骤的各种选项，无论是作为 `nest build` 或 `nest start` 的一部分，也不管是使用 `tsc` 还是 webpack 编译器。

| 属性名称          | 属性值类型        | 描述                                                                                                                                                                                                                                                               |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `webpack`         | boolean           | 如果为 `true`，使用 [webpack 编译器](https://webpack.js.org/)。如果为 `false` 或不存在，则使用 `tsc`。在 monorepo 模式下，默认为 `true`（使用 webpack），在标准模式下，默认为 `false`（使用 `tsc`）。详见下文。（已弃用：改用 `builder`）                           |
| `tsConfigPath`    | string            | （**仅 monorepo**）指向包含 `tsconfig.json` 设置的文件，这些设置将在调用 `nest build` 或 `nest start` 且未提供 `project` 选项时使用（例如，构建或启动默认项目时）                                                                                                 |
| `webpackConfigPath` | string          | 指向 webpack 选项文件。如果未指定，Nest 会查找 `webpack.config.js` 文件。详见下文                                                                                                                                                                                  |
| `deleteOutDir`    | boolean           | 如果为 `true`，每当调用编译器时，它将首先移除编译输出目录（在 `tsconfig.json` 中配置，默认为 `./dist`）                                                                                                                                                           |
| `assets`          | array             | 在每次编译步骤开始时启用自动分发非 TypeScript 资源（在 `--watch` 模式下的增量编译中，资源分发**不会**发生）。详见下文                                                                                                                                              |
| `watchAssets`     | boolean           | 如果为 `true`，在监视模式下运行，监视**所有**非 TypeScript 资源。（要更精细地控制要监视的资源，请参见下方的[资源](cli/monorepo#assets)部分）                                                                                                                      |
| `manualRestart`   | boolean           | 如果为 `true`，启用快捷键 `rs` 手动重启服务器。默认值为 `false`                                                                                                                                                                                                  |
| `builder`         | string/object     | 指示 CLI 使用哪种 `builder` 编译项目（`tsc`、`swc` 或 `webpack`）。要自定义构建器的行为，可以传递一个包含两个属性的对象：`type`（`tsc`、`swc` 或 `webpack`）和 `options`                                                                                         |
| `typeCheck`       | boolean           | 如果为 `true`，为 SWC 驱动的项目启用类型检查（当 `builder` 为 `swc` 时）。默认值为 `false`                                                                                                                                                                        |

#### 全局生成选项

这些属性指定 `nest generate` 命令使用的默认生成选项。

| 属性名称 | 属性值类型      | 描述                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec`   | boolean _或_ object | 如果值为 boolean，`true` 默认启用 `spec` 生成，`false` 则禁用。命令行上传递的标志会覆盖此设置，项目特定的 `generateOptions` 设置也是如此（详见下文）。如果值为对象，每个键代表一个示意图名称，boolean 值决定是否为该特定示意图启用/禁用默认的 spec 生成 |
| `flat`   | boolean         | 如果为 true，所有生成命令将生成扁平结构                                                                                                                                                                                                                                                                                                                                                                                               |

以下示例使用 boolean 值指定所有项目的 spec 文件生成默认应禁用：

```javascript
{
  "generateOptions": {
    "spec": false
  },
  ...
}
```

以下示例使用 boolean 值指定所有项目的扁平文件生成应为默认：

```javascript
{
  "generateOptions": {
    "flat": true
  },
  ...
}
```

在以下示例中，仅对 `service` 示意图（例如 `nest generate service...`）禁用了 `spec` 文件生成：

```javascript
{
  "generateOptions": {
    "spec": {
      "service": false
    }
  },
  ...
}
```

> warning **警告** 当将 `spec` 指定为对象时，生成示意图的键目前不支持自动别名处理。这意味着，例如指定键 `service: false` 并尝试通过别名 `s` 生成服务时，spec 仍会被生成。为确保正常命令名称和别名都按预期工作，请同时指定正常命令名称和别名，如下所示。
>
> ```javascript
> {
>   "generateOptions": {
>     "spec": {
>       "service": false,
>       "s": false
>     }
>   },
>   ...
> }
> ```

#### 项目特定的生成选项

除了提供全局生成选项外，您还可以指定项目特定的生成选项。项目特定的生成选项遵循与全局生成选项完全相同的格式，但直接在每个项目上指定。

项目特定的生成选项会覆盖全局生成选项。

```javascript
{
  "projects": {
    "cats-project": {
      "generateOptions": {
        "spec": {
          "service": false
        }
      },
      ...
    }
  },
  ...
}
```

> warning **警告** 生成选项的优先级顺序如下。命令行上指定的选项优先于项目特定选项。项目特定选项覆盖全局选项。

#### 指定编译器

不同默认编译器的原因在于，对于较大的项目（例如 monorepo 中更典型的情况），webpack 在构建时间和生成捆绑所有项目组件的单个文件方面具有显著优势。如果您希望生成单独的文件，请将 `"webpack"` 设置为 `false`，这将导致构建过程使用 `tsc`（或 `swc`）。

#### Webpack 选项

Webpack 选项文件可以包含标准的 [webpack 配置选项](https://webpack.js.org/configuration/)。例如，要告诉 webpack 捆绑 `node_modules`（默认排除），请在 `webpack.config.js` 中添加以下内容：

```javascript
module.exports = {
  externals: [],
};
```

由于 webpack 配置文件是一个 JavaScript 文件，您甚至可以暴露一个函数，该函数接收默认选项并返回修改后的对象：

```javascript
module.exports = function (options) {
  return {
    ...options,
    externals: [],
  };
};
```

#### 资源（Assets）

TypeScript 编译会自动将编译器输出（`.js` 和 `.d.ts` 文件）分发到指定的输出目录。分发非 TypeScript 文件（如 `.graphql` 文件、`images`、`.html` 文件和其他资源）也可能很方便。这使您可以将 `nest build`（以及任何初始编译步骤）视为轻量级的**开发构建**步骤，您可以在其中编辑非 TypeScript 文件并进行迭代编译和测试。
资源应位于 `src` 文件夹中，否则它们不会被复制。

`assets` 键的值应是一个指定要分发的文件的元素数组。元素可以是带有 `glob` 式文件规格的简单字符串，例如：

```typescript
"assets": ["**/*.graphql"],
"watchAssets": true,
```

为了更精细的控制，元素可以是具有以下键的对象：

- `"include"`：`glob` 式文件规格，指定要分发的资源
- `"exclude"`：`glob` 式文件规格，指定要从 `include` 列表中**排除**的资源
- `"outDir"`：一个字符串，指定资源应分发到的路径（相对于根文件夹）。默认为为编译器输出配置的相同输出目录
- `"watchAssets"`：boolean；如果为 `true`，在监视模式下运行，监视指定的资源

例如：

```typescript
"assets": [
  { "include": "**/*.graphql", "exclude": "**/omitted.graphql", "watchAssets": true },
]
```

> warning **警告** 在顶层 `compilerOptions` 属性中设置 `watchAssets` 会覆盖 `assets` 属性中的任何 `watchAssets` 设置。

#### 项目属性

此元素仅存在于 monorepo 模式结构中。您通常不应编辑这些属性，因为 Nest 使用它们在 monorepo 中定位项目及其配置选项。