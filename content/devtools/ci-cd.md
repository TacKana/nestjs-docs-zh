### CI/CD 集成

> info **提示** 本章节介绍 Nest Devtools 与 Nest 框架的集成。如需了解 Devtools 应用，请访问 [Devtools](https://devtools.nestjs.com) 网站。

CI/CD 集成功能适用于拥有 **[企业版（Enterprise）](/settings)** 计划的用户。

您可以通过以下视频了解 CI/CD 集成的作用及使用方法：

<figure>
  <iframe
    width="1000"
    height="565"
    src="https://www.youtube.com/embed/r5RXcBrnEQ8"
    title="YouTube 视频播放器"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  ></iframe>
</figure>

#### 发布图表

首先配置应用启动文件（`main.ts`），使用 `GraphPublisher` 类（从 `@nestjs/devtools-integration` 导出，详见前一章节），如下所示：

```typescript
async function bootstrap() {
  const shouldPublishGraph = process.env.PUBLISH_GRAPH === "true";

  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    preview: shouldPublishGraph,
  });

  if (shouldPublishGraph) {
    await app.init();

    const publishOptions = { ... } // 注意：此选项对象会根据您使用的 CI/CD 提供商而有所不同
    const graphPublisher = new GraphPublisher(app);
    await graphPublisher.publish(publishOptions);

    await app.close();
  } else {
    await app.listen(process.env.PORT ?? 3000);
  }
}
```

如您所见，这里我们使用 `GraphPublisher` 将序列化后的图表发布到中央注册表。`PUBLISH_GRAPH` 是一个自定义环境变量，用于控制是否发布图表（CI/CD 工作流）或不发布（常规应用启动）。同时，我们将 `preview` 属性设置为 `true`。启用此标志后，我们的应用将在预览模式下启动——这意味着应用中所有控制器、增强器和提供者的构造函数（及生命周期钩子）都不会执行。注意——这并非**必需**，但能简化操作，因为在此模式下，我们在 CI/CD 流水线中运行应用时无需连接数据库等。

`publishOptions` 对象会根据您使用的 CI/CD 提供商而有所不同。我们将在后续章节中为您提供最流行的 CI/CD 提供商的说明。

图表成功发布后，您将在工作流视图中看到以下输出：

<figure><img src="/assets/devtools/graph-published-terminal.png" /></figure>

每次图表发布后，我们应在项目的对应页面看到新条目：

<figure><img src="/assets/devtools/project.png" /></figure>

#### 报告

**如果**中央注册表中已存在对应的快照，Devtools 会为每次构建生成报告。例如，如果您针对已发布图表的 `master` 分支创建 PR，应用将能够检测差异并生成报告。否则，不会生成报告。

要查看报告，请导航至项目的对应页面（参见组织部分）。

<figure><img src="/assets/devtools/report.png" /></figure>

这尤其有助于识别在代码审查中可能被忽略的更改。例如，假设有人更改了**深度嵌套提供者**的作用域。这一更改可能不会立即被审查者察觉，但借助 Devtools，我们可以轻松发现此类更改并确保它们是故意的。或者，如果我们从特定端点移除守卫，报告会显示受影响的部分。如果我们没有为该路由设置集成或端到端测试，可能不会注意到它不再受保护，等到发现时可能为时已晚。

同样，如果我们在**大型代码库**中工作，并将模块修改为全局，我们会看到图表中添加了多少边——在大多数情况下，这表明我们做错了什么。

#### 构建预览

对于每个已发布的图表，我们可以通过点击**预览（Preview）**按钮回溯查看其之前的状态。此外，如果生成了报告，我们应在图表上看到高亮显示的差异：

- 绿色节点代表新增元素
- 浅白色节点代表更新元素
- 红色节点代表删除元素

参见以下截图：

<figure><img src="/assets/devtools/nodes-selection.png" /></figure>

回溯功能让您可以通过比较当前图表与先前图表来调查和解决问题。根据您的设置，每个拉取请求（甚至每次提交）都会在注册表中有一个对应的快照，因此您可以轻松回溯查看更改。将 Devtools 视为 Git，但它理解 Nest 如何构建应用图表，并能够**可视化**它。

#### 集成：GitHub Actions

首先，我们在项目的 `.github/workflows` 目录中创建一个新的 GitHub 工作流，例如命名为 `publish-graph.yml`。在该文件中，使用以下定义：

```yaml
name: Devtools

on:
  push:
    branches:
      - master
  pull_request:
    branches:
      - '*'

jobs:
  publish:
    if: github.actor!= 'dependabot[bot]'
    name: Publish graph
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Setup Environment (PR)
        if: {{ '${{' }} github.event_name == 'pull_request' {{ '}}' }}
        shell: bash
        run: |
          echo "COMMIT_SHA={{ '${{' }} github.event.pull_request.head.sha {{ '}}' }}" >>\${GITHUB_ENV}
      - name: Setup Environment (Push)
        if: {{ '${{' }} github.event_name == 'push' {{ '}}' }}
        shell: bash
        run: |
          echo "COMMIT_SHA=\${GITHUB_SHA}" >> \${GITHUB_ENV}
      - name: Publish
        run: PUBLISH_GRAPH=true npm run start
        env:
          DEVTOOLS_API_KEY: CHANGE_THIS_TO_YOUR_API_KEY
          REPOSITORY_NAME: {{ '${{' }} github.event.repository.name {{ '}}' }}
          BRANCH_NAME: {{ '${{' }} github.head_ref || github.ref_name {{ '}}' }}
          TARGET_SHA: {{ '${{' }} github.event.pull_request.base.sha {{ '}}' }}
```

理想情况下，`DEVTOOLS_API_KEY` 环境变量应从 GitHub Secrets 中获取，详见[此处](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository)。

此工作流将在每个针对 `master` 分支的拉取请求时运行，或在直接提交到 `master` 分支时运行。请根据项目需要调整此配置。关键点在于为 `GraphPublisher` 类提供必要的环境变量（以运行）。

但是，在开始使用此工作流之前，有一个变量需要更新——`DEVTOOLS_API_KEY`。我们可以在此[页面](https://devtools.nestjs.com/settings/manage-api-keys)为我们的项目生成专用的 API 密钥。

最后，让我们再次导航到 `main.ts` 文件，更新之前留空的 `publishOptions` 对象。

```typescript
const publishOptions = {
  apiKey: process.env.DEVTOOLS_API_KEY,
  repository: process.env.REPOSITORY_NAME,
  owner: process.env.GITHUB_REPOSITORY_OWNER,
  sha: process.env.COMMIT_SHA,
  target: process.env.TARGET_SHA,
  trigger: process.env.GITHUB_BASE_REF ? 'pull' : 'push',
  branch: process.env.BRANCH_NAME,
};
```

为了获得最佳开发者体验，请确保通过点击“集成 GitHub 应用（Integrate GitHub app）”按钮为您的项目集成 **GitHub 应用**（参见下图）。注意——这不是必需的。

<figure><img src="/assets/devtools/integrate-github-app.png" /></figure>

通过此集成，您将能够在拉取请求中直接看到预览/报告生成过程的状态：

<figure><img src="/assets/devtools/actions-preview.png" /></figure>

#### 集成：Gitlab Pipelines

首先，在项目的根目录中创建一个新的 Gitlab CI 配置文件，例如命名为 `.gitlab-ci.yml`。在该文件中，使用以下定义：

```typescript
const publishOptions = {
  apiKey: process.env.DEVTOOLS_API_KEY,
  repository: process.env.REPOSITORY_NAME,
  owner: process.env.GITHUB_REPOSITORY_OWNER,
  sha: process.env.COMMIT_SHA,
  target: process.env.TARGET_SHA,
  trigger: process.env.GITHUB_BASE_REF ? 'pull' : 'push',
  branch: process.env.BRANCH_NAME,
};
```

> info **提示** 理想情况下，`DEVTOOLS_API_KEY` 环境变量应从密钥中获取。

此工作流将在每个针对 `master` 分支的拉取请求时运行，或在直接提交到 `master` 分支时运行。请根据项目需要调整此配置。关键点在于为 `GraphPublisher` 类提供必要的环境变量（以运行）。

但是，在开始使用此工作流之前，有一个变量（在此工作流定义中）需要更新——`DEVTOOLS_API_KEY`。我们可以在此**页面**为我们的项目生成专用的 API 密钥。

最后，让我们再次导航到 `main.ts` 文件，更新之前留空的 `publishOptions` 对象。

```yaml
image: node:16

stages:
  - build

cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: always
    - if: $CI_COMMIT_BRANCH == "master" && $CI_PIPELINE_SOURCE == "push"
      when: always
    - when: never

install_dependencies:
  stage: build
  script:
    - npm ci

publish_graph:
  stage: build
  needs:
    - install_dependencies
  script: npm run start
  variables:
    PUBLISH_GRAPH: 'true'
    DEVTOOLS_API_KEY: 'CHANGE_THIS_TO_YOUR_API_KEY'
```

#### 其他 CI/CD 工具

Nest Devtools CI/CD 集成可与您选择的任何 CI/CD 工具一起使用（例如 [Bitbucket Pipelines](https://bitbucket.org/product/features/pipelines)、[CircleCI](https://circleci.com/) 等），因此不要局限于我们在此描述的提供商。

查看以下 `publishOptions` 对象配置，了解发布给定提交/构建/PR 的图表所需的信息：

```typescript
const publishOptions = {
  apiKey: process.env.DEVTOOLS_API_KEY,
  repository: process.env.CI_PROJECT_NAME,
  owner: process.env.CI_PROJECT_ROOT_NAMESPACE,
  sha: process.env.CI_COMMIT_SHA,
  target: process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA,
  trigger: process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA ? 'pull' : 'push',
  branch: process.env.CI_COMMIT_BRANCH ?? process.env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
};
```

大部分信息通过 CI/CD 内置的环境变量提供（参见 [CircleCI 内置环境变量列表](https://circleci.com/docs/variables/#built-in-environment-variables) 和 [Bitbucket 变量](https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/)）。

关于发布图表的流水线配置，我们建议使用以下触发器：

- `push` 事件——仅当当前分支代表部署环境时，例如 `master`、`main`、`staging`、`production` 等。
- `pull request` 事件——始终，或当**目标分支**代表部署环境时（见上文）