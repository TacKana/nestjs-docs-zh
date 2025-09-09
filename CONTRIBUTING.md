# 贡献指南

我们非常欢迎你为 Nest 做出贡献，帮助它变得更好！作为贡献者，请遵循以下指南：

- [行为准则](#coc)
- [有问题或疑问？](#question)
- [报告问题和 Bug](#issue)
- [功能请求](#feature)
- [提交指南](#submit)
- [编码规范](#rules)
- [提交信息规范](#commit)
<!-- - [签署 CLA](#cla) -->

<!-- ## <a name="coc"></a> 行为准则
帮助我们保持 Nest 的开放和包容性。请阅读并遵守我们的[行为准则][coc]。 -->

## <a name="question"></a> 有问题或疑问？

**请不要为一般性支持问题创建 issue，我们希望将 GitHub issue 用于 Bug 报告和功能请求。** 你在 [Stack Overflow](https://stackoverflow.com/questions/tagged/nestjs) 上提问（使用 `nestjs` 标签）会更容易获得解答。

选择 Stack Overflow 的原因：

- 问题和答案会公开保存，可能帮助到其他人
- Stack Overflow 的投票系统能让最佳答案更突出

为了节省你和我们的时间，我们会系统性地关闭所有一般性支持请求，并引导大家去 Stack Overflow。

如果你想实时交流，可以加入[我们的 Discord 频道][discord]。

## <a name="issue"></a> 发现 Bug？

如果你在源码中发现了 Bug，可以通过[提交 issue](#submit-issue)到我们的 [GitHub 仓库][github] 来帮助我们。更棒的是，你也可以[提交 Pull Request](#submit-pr) 修复它。

## <a name="feature"></a> 缺少某个功能？

你可以通过[提交 issue](#submit-issue)到我们的 GitHub 仓库来*请求*新功能。如果你想*实现*新功能，请先提交 issue 说明你的方案，以便我们确认可用性。
请考虑你的更改属于哪种类型：

- **重大功能**：请先创建 issue 并描述你的方案，以便讨论。这有助于我们协调工作、避免重复，并帮助你更好地让更改被接受。请在 issue 标题前加上 `[discussion]`，如 "[discussion]: 你的功能想法"。
- **小功能**：可以直接[提交 Pull Request](#submit-pr)。

## <a name="submit"></a> 提交指南

### <a name="submit-issue"></a> 提交 Issue

在提交 issue 前，请先搜索 issue 列表，看看是否已有类似问题，相关讨论可能会给你现成的解决方法。

如果没有最小复现，我们无法调查或修复 Bug。如果你没有补充足够的信息，issue 可能会被关闭。

你可以通过填写我们的 [新 issue 表单](https://github.com/nestjs/nest/issues/new) 来提交问题。

### <a name="submit-pr"></a> 提交 Pull Request (PR)

在提交 PR 前，请遵循以下指南：

1. 在 [GitHub](https://github.com/nestjs/nest/pulls) 搜索相关 PR，避免重复劳动。
<!-- 1. 请在提交 PR 前签署我们的 [贡献者许可协议 (CLA)](#cla)。未签署无法接受代码。 -->
1. Fork nestjs/nest 仓库。
1. 在新分支上进行更改：

```shell
git checkout -b my-fix-branch master
```

1. 创建补丁，**包括相应的测试用例**。
1. 遵循我们的[编码规范](#rules)。
1. 运行完整的 Nest 测试套件（见[常用脚本](https://github.com/nestjs/nest/blob/master/CONTRIBUTING.md#common-scripts)），确保所有测试通过。
1. 使用符合[提交信息规范](#commit)的描述性提交信息提交更改。我们会根据这些信息自动生成发布说明。

```shell
git commit -a
```

    注意：可选的 `-a` 参数会自动 "add" 和 "rm" 已编辑的文件。

1. 推送分支到 GitHub：

   ```shell
   git push origin my-fix-branch
   ```

1. 在 GitHub 上向 `nestjs:master` 发起 Pull Request。

- 如果我们建议修改：

  - 按要求更新代码。
  - 重新运行测试，确保全部通过。
  - 变基并强制推送到你的仓库（会更新 PR）：

    ```shell
    git rebase master -i
    git push -f
    ```

就是这样！感谢你的贡献！

#### Pull Request 合并后

PR 合并后，你可以安全地删除分支，并从主仓库拉取最新更改：

- 在 GitHub 网页或本地 shell 删除远程分支：

  ```shell
  git push origin --delete my-fix-branch
  ```

- 切换回 master 分支：

  ```shell
  git checkout master -f
  ```

- 删除本地分支：

  ```shell
  git branch -D my-fix-branch
  ```

- 用主仓库最新内容更新 master：

  ```shell
  git pull --ff upstream master
  ```

## <a name="rules"></a> 编码规范

为保证代码一致性，请遵循以下规则：

- 所有功能或 Bug 修复**必须有一个或多个单元测试**。
<!--
// 我们正在开发自动文档功能。
- 所有公共 API 方法**必须有文档**。（细节待定） -->
- 遵循 [Google JavaScript 风格指南][js-style-guide]，但所有代码**每行不超过 100 字符**。可用自动格式化工具（`npm run format`）。

## <a name="commit"></a> 提交信息规范

我们对 git 提交信息有严格的格式要求，这有助于**提高可读性**，方便**追溯项目历史**，并用于**自动生成变更日志**。

### 提交信息格式

每条提交信息包括**头部**、**正文**和**页脚**。头部格式为：**类型**、**范围**和**主题**：

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**头部**必填，**范围**可选。

每行不能超过 100 字符，便于在 GitHub 和各种 git 工具中阅读。

页脚应包含[关闭 issue 的引用](https://help.github.com/articles/closing-issues-via-commit-messages/)（如有）。

示例：（更多[示例](https://github.com/nestjs/nest/commits/master)）

```
docs(changelog): update change log to beta.5
```

```
fix(@nestjs/core): need to depend on latest rxjs and zone.js

The version in our package.json gets copied to the one we publish, and users need the latest of these.
```

### 回滚

如果提交用于回滚之前的提交，应以 `revert: ` 开头，后接被回滚提交的头部。正文应写明：`This reverts commit <hash>.`，其中 `<hash>` 是被回滚提交的 SHA。

### 类型

必须为以下之一：

- **build**: 构建系统或外部依赖变更（如 gulp、broccoli、npm）
- **chore**: 任务更新等，无生产代码变更
- **ci**: CI 配置文件和脚本变更（如 Travis、Circle、BrowserStack、SauceLabs）
- **docs**: 仅文档变更
- **feat**: 新功能
- **fix**: Bug 修复
- **perf**: 性能优化
- **refactor**: 代码重构，既非修复 Bug 也非新增功能
- **style**: 格式、空格、缺失分号等不影响代码含义的更改
- **test**: 添加或修正测试

### 主题

主题简明描述更改内容：

- 使用祈使句、现在时，如 "change" 而非 "changed" 或 "changes"
- 不要首字母大写
- 末尾不加句号

### 正文

正文同样使用祈使句、现在时。应说明更改动机，并与之前行为对比。

### 页脚

页脚应包含**重大变更**信息，并引用本次提交**关闭的 GitHub issue**。

**重大变更**应以 `BREAKING CHANGE:` 开头，后面详细说明。

详细说明见[此文档][commit-message-format]。

<!-- ## <a name="cla"></a> 签署 CLA

请在提交 Pull Request 前签署我们的贡献者许可协议（CLA）。任何代码更改都必须签署 CLA。流程很快，请放心！

* 个人可通过[简单表单][individual-cla]签署。
* 公司需[打印、签字并通过扫描邮件、传真或邮寄][corporate-cla]。 -->

<!-- [angular-group]: https://groups.google.com/forum/#!forum/angular -->
<!-- [coc]: https://github.com/angular/code-of-conduct/blob/master/CODE_OF_CONDUCT.md -->

[commit-message-format]: https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#
[corporate-cla]: http://code.google.com/legal/corporate-cla-v1.0.html
[dev-doc]: https://github.com/nestjs/nest/blob/master/docs/DEVELOPER.md
[github]: https://github.com/nestjs/nest
[discord]: https://discord.gg/nestjs
[individual-cla]: http://code.google.com/legal/individual-cla-v1.0.html
[js-style-guide]: https://google.github.io/styleguide/jsguide.html
[jsfiddle]: http://jsfiddle.net
[plunker]: http://plnkr.co/edit
[runnable]: http://runnable.com

<!-- [stackoverflow]: http://stackoverflow.com/questions/tagged/angular -->
