### 任务调度

任务调度功能允许您安排任意代码（方法/函数）在固定日期/时间、按重复间隔或指定间隔后执行一次。在 Linux 世界中，这通常由操作系统级别的 [cron](https://en.wikipedia.org/wiki/Cron) 等包处理。对于 Node.js 应用，有几个包可以模拟类似 cron 的功能。Nest 提供了 `@nestjs/schedule` 包，该包与流行的 Node.js [cron](https://github.com/kelektiv/node-cron) 包集成。本章将介绍这个包。

#### 安装

要开始使用，首先安装所需的依赖项。

```bash
$ npm install --save @nestjs/schedule
```

要激活任务调度，请将 `ScheduleModule` 导入到根 `AppModule` 中，并运行 `forRoot()` 静态方法，如下所示：

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
})
export class AppModule {}
```

`.forRoot()` 调用会初始化调度器，并注册应用中存在的所有声明式 <a href="techniques/task-scheduling#declarative-cron-jobs">cron 作业</a>、<a href="techniques/task-scheduling#declarative-timeouts">超时任务</a> 和 <a href="techniques/task-scheduling#declarative-intervals">间隔任务</a>。注册发生在 `onApplicationBootstrap` 生命周期钩子时，确保所有模块都已加载并声明了任何计划任务。

#### 声明式 cron 作业

cron 作业安排任意函数（方法调用）自动运行。cron 作业可以：

- 在指定的日期/时间运行一次。
- 定期运行；重复作业可以在指定间隔内的特定时刻运行（例如，每小时一次、每周一次、每 5 分钟一次）

在包含要执行代码的方法定义前使用 `@Cron()` 装饰器来声明 cron 作业，如下所示：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('45 * * * * *')
  handleCron() {
    this.logger.debug('在当前秒数为 45 时调用');
  }
}
```

在此示例中，`handleCron()` 方法将在当前秒数为 `45` 时每次被调用。换句话说，该方法将在每分钟的第 45 秒运行一次。

`@Cron()` 装饰器支持以下标准 [cron 模式](http://crontab.org/)：

- 星号（例如 `*`）
- 范围（例如 `1-3,5`）
- 步长（例如 `*/2`）

在上面的示例中，我们向装饰器传递了 `45 * * * * *`。以下键显示了如何解释 cron 模式字符串中的每个位置：

<pre class="language-javascript"><code class="language-javascript">
* * * * * *
| | | | | |
| | | | | 星期几
| | | | 月份
| | | 日期
| | 小时
| 分钟
秒（可选）
</code></pre>

一些示例 cron 模式包括：

<table>
  <tbody>
    <tr>
      <td><code>* * * * * *</code></td>
      <td>每秒</td>
    </tr>
    <tr>
      <td><code>45 * * * * *</code></td>
      <td>每分钟，在第 45 秒</td>
    </tr>
    <tr>
      <td><code>0 10 * * * *</code></td>
      <td>每小时，在第 10 分钟开始时</td>
    </tr>
    <tr>
      <td><code>0 */30 9-17 * * *</code></td>
      <td>上午 9 点到下午 5 点之间每 30 分钟一次</td>
    </tr>
   <tr>
      <td><code>0 30 11 * * 1-5</code></td>
      <td>周一至周五上午 11:30</td>
    </tr>
  </tbody>
</table>

`@nestjs/schedule` 包提供了一个方便的枚举，包含常用的 cron 模式。您可以按如下方式使用此枚举：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    this.logger.debug('每 30 秒调用一次');
  }
}
```

在此示例中，`handleCron()` 方法将每 `30` 秒调用一次。如果发生异常，它将被记录到控制台，因为每个用 `@Cron()` 注释的方法都会自动包装在 `try-catch` 块中。

或者，您可以将 JavaScript `Date` 对象提供给 `@Cron()` 装饰器。这样做会导致作业在指定日期精确执行一次。

> info **提示** 使用 JavaScript 日期算术来安排相对于当前日期的作业。例如，`@Cron(new Date(Date.now() + 10 * 1000))` 安排一个在应用启动后 10 秒运行的作业。

此外，您可以将其他选项作为第二个参数提供给 `@Cron()` 装饰器。

<table>
  <tbody>
    <tr>
      <td><code>name</code></td>
      <td>
        用于在声明后访问和控制 cron 作业。
      </td>
    </tr>
    <tr>
      <td><code>timeZone</code></td>
      <td>
        指定执行的时区。这将根据您的时区修改实际时间。如果时区无效，将抛出错误。您可以在 <a href="http://momentjs.com/timezone/">Moment Timezone</a> 网站上查看所有可用的时区。
      </td>
    </tr>
    <tr>
      <td><code>utcOffset</code></td>
      <td>
        这允许您指定时区的偏移量，而不是使用 <code>timeZone</code> 参数。
      </td>
    </tr>
    <tr>
      <td><code>waitForCompletion</code></td>
      <td>
        如果为 <code>true</code>，则在当前 onTick 回调完成之前，不会运行 cron 作业的其他实例。在当前 cron 作业运行时发生的任何新计划的执行都将被完全跳过。
      </td>
    </tr>
    <tr>
      <td><code>disabled</code></td>
      <td>
       指示作业是否完全执行。
      </td>
    </tr>
  </tbody>
</table>

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationService {
  @Cron('* * 0 * * *', {
    name: 'notifications',
    timeZone: 'Europe/Paris',
  })
  triggerNotifications() {}
}
```

您可以在声明后访问和控制 cron 作业，或使用 <a href="/techniques/task-scheduling#dynamic-schedule-module-api">动态 API</a> 动态创建 cron 作业（其 cron 模式在运行时定义）。要通过 API 访问声明式 cron 作业，您必须通过将 `name` 属性作为装饰器的第二个参数的可选选项对象中传递来将作业与名称关联。

#### 声明式间隔任务

要声明方法应以（重复）指定的间隔运行，请在方法定义前加上 `@Interval()` 装饰器。将间隔值（以毫秒为单位的数字）传递给装饰器，如下所示：

```typescript
@Interval(10000)
handleInterval() {
  this.logger.debug('每 10 秒调用一次');
}
```

> info **提示** 此机制在底层使用 JavaScript `setInterval()` 函数。您也可以使用 cron 作业来安排重复作业。

如果您想通过 <a href="/techniques/task-scheduling#dynamic-schedule-module-api">动态 API</a> 从声明类外部控制您的声明式间隔，请使用以下构造将间隔与名称关联：

```typescript
@Interval('notifications', 2500)
handleInterval() {}
```

如果发生异常，它将被记录到控制台，因为每个用 `@Interval()` 注释的方法都会自动包装在 `try-catch` 块中。

<a href="techniques/task-scheduling#dynamic-intervals">动态 API</a> 还支持**创建**动态间隔，其中间隔的属性在运行时定义，以及**列出和删除**它们。

<app-banner-enterprise></app-banner-enterprise>

#### 声明式超时任务

要声明方法应在应用启动后的指定超时时间运行（一次），请在方法定义前加上 `@Timeout()` 装饰器。将相对时间偏移（以毫秒为单位）传递给装饰器，如下所示：

```typescript
@Timeout(5000)
handleTimeout() {
  this.logger.debug('在 5 秒后调用一次');
}
```

> info **提示** 此机制在底层使用 JavaScript `setTimeout()` 函数。

如果发生异常，它将被记录到控制台，因为每个用 `@Timeout()` 注释的方法都会自动包装在 `try-catch` 块中。

如果您想通过 <a href="/techniques/task-scheduling#dynamic-schedule-module-api">动态 API</a> 从声明类外部控制您的声明式超时，请使用以下构造将超时与名称关联：

```typescript
@Timeout('notifications', 2500)
handleTimeout() {}
```

<a href="techniques/task-scheduling#dynamic-timeouts">动态 API</a> 还支持**创建**动态超时，其中超时的属性在运行时定义，以及**列出和删除**它们。

#### 动态调度模块 API

`@nestjs/schedule` 模块提供了一个动态 API，用于管理声明式 <a href="techniques/task-scheduling#declarative-cron-jobs">cron 作业</a>、<a href="techniques/task-scheduling#declarative-timeouts">超时任务</a> 和 <a href="techniques/task-scheduling#declarative-intervals">间隔任务</a>。该 API 还支持创建和管理**动态** cron 作业、超时和间隔，其中属性在运行时定义。

#### 动态 cron 作业

使用 `SchedulerRegistry` API 从代码中的任何位置按名称获取对 `CronJob` 实例的引用。首先，使用标准构造函数注入注入 `SchedulerRegistry`：

```typescript
constructor(private schedulerRegistry: SchedulerRegistry) {}
```

> info **提示** 从 `@nestjs/schedule` 包导入 `SchedulerRegistry`。

然后在类中使用它。假设使用以下声明创建了一个 cron 作业：

```typescript
@Cron('* * 8 * * *', {
  name: 'notifications',
})
triggerNotifications() {}
```

使用以下方式访问此作业：

```typescript
const job = this.schedulerRegistry.getCronJob('notifications');

job.stop();
console.log(job.lastDate());
```

`getCronJob()` 方法返回命名的 cron 作业。返回的 `CronJob` 对象具有以下方法：

- `stop()` - 停止计划运行的作业。
- `start()` - 重新启动已停止的作业。
- `setTime(time: CronTime)` - 停止作业，为其设置新时间，然后启动它
- `lastDate()` - 返回作业上次执行日期的 `DateTime` 表示。
- `nextDate()` - 返回作业下次计划执行日期的 `DateTime` 表示。
- `nextDates(count: number)` - 提供一个数组（大小为 `count`），其中包含将触发作业执行的下一个日期集的 `DateTime` 表示。`count` 默认为 0，返回空数组。

> info **提示** 在 `DateTime` 对象上使用 `toJSDate()` 以将其呈现为与此 DateTime 等效的 JavaScript 日期。

使用 `SchedulerRegistry#addCronJob` 方法**创建**新的动态 cron 作业，如下所示：

```typescript
addCronJob(name: string, seconds: string) {
  const job = new CronJob(`${seconds} * * * * *`, () => {
    this.logger.warn(`作业 ${name} 在 ${seconds} 秒运行的时间到了！`);
  });

  this.schedulerRegistry.addCronJob(name, job);
  job.start();

  this.logger.warn(
    `作业 ${name} 已添加，每分钟在 ${seconds} 秒运行！`,
  );
}
```

在此代码中，我们使用 `cron` 包中的 `CronJob` 对象创建 cron 作业。`CronJob` 构造函数将 cron 模式（就像 <a href="techniques/task-scheduling#declarative-cron-jobs">装饰器</a> `@Cron()` 一样）作为其第一个参数，并将要在 cron 计时器触发时执行的回调作为其第二个参数。`SchedulerRegistry#addCronJob` 方法接受两个参数：`CronJob` 的名称和 `CronJob` 对象本身。

> warning **警告** 在访问之前记住注入 `SchedulerRegistry`。从 `cron` 包导入 `CronJob`。

使用 `SchedulerRegistry#deleteCronJob` 方法**删除**命名的 cron 作业，如下所示：

```typescript
deleteCron(name: string) {
  this.schedulerRegistry.deleteCronJob(name);
  this.logger.warn(`作业 ${name} 已删除！`);
}
```

使用 `SchedulerRegistry#getCronJobs` 方法**列出**所有 cron 作业，如下所示：

```typescript
getCrons() {
  const jobs = this.schedulerRegistry.getCronJobs();
  jobs.forEach((value, key, map) => {
    let next;
    try {
      next = value.nextDate().toJSDate();
    } catch (e) {
      next = '错误：下次触发日期在过去！';
    }
    this.logger.log(`作业：${key} -> 下次：${next}`);
  });
}
```

`getCronJobs()` 方法返回一个 `map`。在此代码中，我们遍历 map 并尝试访问每个 `CronJob` 的 `nextDate()` 方法。在 `CronJob` API 中，如果作业已触发且没有未来的触发日期，则会抛出异常。

#### 动态间隔任务

使用 `SchedulerRegistry#getInterval` 方法获取对间隔的引用。如上所述，使用标准构造函数注入注入 `SchedulerRegistry`：

```typescript
constructor(private schedulerRegistry: SchedulerRegistry) {}
```

并按如下方式使用：

```typescript
const interval = this.schedulerRegistry.getInterval('notifications');
clearInterval(interval);
```

使用 `SchedulerRegistry#addInterval` 方法**创建**新的动态间隔，如下所示：

```typescript
addInterval(name: string, milliseconds: number) {
  const callback = () => {
    this.logger.warn(`间隔 ${name} 在 ${milliseconds} 毫秒执行！`);
  };

  const interval = setInterval(callback, milliseconds);
  this.schedulerRegistry.addInterval(name, interval);
}
```

在此代码中，我们创建一个标准的 JavaScript 间隔，然后将其传递给 `SchedulerRegistry#addInterval` 方法。
该方法接受两个参数：间隔的名称和间隔本身。

使用 `SchedulerRegistry#deleteInterval` 方法**删除**命名的间隔，如下所示：

```typescript
deleteInterval(name: string) {
  this.schedulerRegistry.deleteInterval(name);
  this.logger.warn(`间隔 ${name} 已删除！`);
}
```

使用 `SchedulerRegistry#getIntervals` 方法**列出**所有间隔，如下所示：

```typescript
getIntervals() {
  const intervals = this.schedulerRegistry.getIntervals();
  intervals.forEach(key => this.logger.log(`间隔：${key}`));
}
```

#### 动态超时任务

使用 `SchedulerRegistry#getTimeout` 方法获取对超时的引用。如上所述，使用标准构造函数注入注入 `SchedulerRegistry`：

```typescript
constructor(private readonly schedulerRegistry: SchedulerRegistry) {}
```

并按如下方式使用：

```typescript
const timeout = this.schedulerRegistry.getTimeout('notifications');
clearTimeout(timeout);
```

使用 `SchedulerRegistry#addTimeout` 方法**创建**新的动态超时，如下所示：

```typescript
addTimeout(name: string, milliseconds: number) {
  const callback = () => {
    this.logger.warn(`超时 ${name} 在 ${milliseconds} 毫秒后执行！`);
  };

  const timeout = setTimeout(callback, milliseconds);
  this.schedulerRegistry.addTimeout(name, timeout);
}
```

在此代码中，我们创建一个标准的 JavaScript 超时，然后将其传递给 `SchedulerRegistry#addTimeout` 方法。
该方法接受两个参数：超时的名称和超时本身。

使用 `SchedulerRegistry#deleteTimeout` 方法**删除**命名的超时，如下所示：

```typescript
deleteTimeout(name: string) {
  this.schedulerRegistry.deleteTimeout(name);
  this.logger.warn(`超时 ${name} 已删除！`);
}
```

使用 `SchedulerRegistry#getTimeouts` 方法**列出**所有超时，如下所示：

```typescript
getTimeouts() {
  const timeouts = this.schedulerRegistry.getTimeouts();
  timeouts.forEach(key => this.logger.log(`超时：${key}`));
}
```

#### 示例

一个可工作的示例可在 [这里](https://github.com/nestjs/nest/tree/master/sample/27-scheduling) 找到。