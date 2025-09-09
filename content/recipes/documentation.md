### 文档工具

**Compodoc** 是一款专为 Angular 应用设计的文档生成工具。由于 Nest 与 Angular 在项目和代码结构上高度相似，因此 **Compodoc** 同样适用于 Nest 应用程序。

#### 安装配置

在现有 Nest 项目中配置 Compodoc 非常简单。首先通过系统终端执行以下命令添加开发依赖：

```bash
$ npm i -D @compodoc/compodoc
```

#### 生成文档

使用以下命令生成项目文档（需要 npm 6 及以上版本以支持 `npx`）。更多选项请参阅[官方文档](https://compodoc.app/guides/usage.html)。

```bash
$ npx @compodoc/compodoc -p tsconfig.json -s
```

打开浏览器访问 [http://localhost:8080](http://localhost:8080)，您将看到基于 Nest CLI 创建项目的初始文档界面：

<figure><img src="/assets/documentation-compodoc-1.jpg" /></figure>
<figure><img src="/assets/documentation-compodoc-2.jpg" /></figure>

#### 参与贡献

您可以通过 [GitHub 项目地址](https://github.com/compodoc/compodoc)参与 Compodoc 项目的开发和贡献。