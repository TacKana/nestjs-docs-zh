### Necord

Necord 是一个强大的模块，可简化 [Discord](https://discord.com) 机器人的创建过程，并实现与 NestJS 应用的无缝集成。

> info **注意** Necord 是第三方包，并非由 NestJS 核心团队官方维护。如遇问题，请前往[官方仓库](https://github.com/necordjs/necord)提交报告。

#### 安装

首先，你需要安装 Necord 及其依赖 [`Discord.js`](https://discord.js.org)。

```bash
$ npm install necord discord.js
```

#### 使用方式

要在项目中使用 Necord，请导入 `NecordModule` 并使用必要的配置选项进行设置。

```typescript
@@filename(app.module)
import { Module } from '@nestjs/common';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { AppService } from './app.service';

@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN,
      intents: [IntentsBitField.Flags.Guilds],
      development: [process.env.DISCORD_DEVELOPMENT_GUILD_ID],
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
```

> info **提示** 完整的可用意图列表可在[此处](https://discord.com/developers/docs/topics/gateway#gateway-intents)查看。

完成此设置后，你可以在提供者中注入 `AppService` 来轻松注册命令、事件等。

```typescript
@@filename(app.service)
import { Injectable, Logger } from '@nestjs/common';
import { Context, On, Once, ContextOf } from 'necord';
import { Client } from 'discord.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`机器人以 ${client.user.username} 身份登录成功`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }
}
```

##### 理解上下文

你可能已经注意到上面的示例中使用了 `@Context` 装饰器。这个装饰器将事件上下文注入到你的方法中，让你能够访问各种事件特定的数据。由于有多种类型的事件，上下文的类型通过 `ContextOf<type: string>` 类型推断得出。你可以轻松使用 `@Context()` 装饰器来访问上下文变量，该装饰器会使用与事件相关的参数数组填充变量。

#### 文本命令

> warning **注意** 文本命令依赖于消息内容，该功能对已验证的机器人和拥有超过 100 个服务器的应用将被弃用。这意味着如果你的机器人无法访问消息内容，文本命令将无法工作。更多关于此变更的信息请[参阅此处](https://support-dev.discord.com/hc/en-us/articles/4404772028055-Message-Content-Access-Deprecation-for-Verified-Bots)。

以下是如何使用 `@TextCommand` 装饰器为消息创建一个简单的命令处理程序。

```typescript
@@filename(app.commands)
import { Injectable } from '@nestjs/common';
import { Context, TextCommand, TextCommandContext, Arguments } from 'necord';

@Injectable()
export class AppCommands {
  @TextCommand({
    name: 'ping',
    description: '回复 pong！',
  })
  public onPing(
    @Context() [message]: TextCommandContext,
    @Arguments() args: string[],
  ) {
    return message.reply('pong!');
  }
}
```

#### 应用命令

应用命令为用户在 Discord 客户端内与应用交互提供了一种原生方式。有三种类型的应用命令可以通过不同的界面访问：聊天输入命令、消息上下文菜单（通过右键单击消息访问）和用户上下文菜单（通过右键单击用户访问）。

<figure><img class="illustrative-image" src="https://i.imgur.com/4EmG8G8.png" /></figure>

#### 斜杠命令

斜杠命令是以结构化方式与用户互动的绝佳方式。它们允许你创建具有精确参数和选项的命令，显著提升用户体验。

使用 Necord 定义斜杠命令时，可以使用 `SlashCommand` 装饰器。

```typescript
@@filename(app.commands)
import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class AppCommands {
  @SlashCommand({
    name: 'ping',
    description: '回复 pong！',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!' });
  }
}
```

> info **提示** 当你的机器人客户端登录时，它会自动注册所有已定义的命令。请注意，全局命令会被缓存长达一小时。为避免全局缓存的问题，请使用 Necord 模块中的 `development` 参数，该参数将命令的可见性限制在单个公会内。

##### 选项

你可以使用选项装饰器为斜杠命令定义参数。为此，我们先创建一个 `TextDto` 类：

```typescript
@@filename(text.dto)
import { StringOption } from 'necord';

export class TextDto {
  @StringOption({
    name: 'text',
    description: '在此输入你的文本',
    required: true,
  })
  text: string;
}
```

然后你可以在 `AppCommands` 类中使用这个 DTO：

```typescript
@@filename(app.commands)
import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, Options, SlashCommandContext } from 'necord';
import { TextDto } from './length.dto';

@Injectable()
export class AppCommands {
  @SlashCommand({
    name: 'length',
    description: '计算你文本的长度',
  })
  public async onLength(
    @Context() [interaction]: SlashCommandContext,
    @Options() { text }: TextDto,
  ) {
    return interaction.reply({
      content: `你文本的长度是: ${text.length}`,
    });
  }
}
```

完整的选项装饰器列表，请查看[此文档](https://necord.org/interactions/slash-commands#options)。

##### 自动完成

要为斜杠命令实现自动完成功能，你需要创建一个拦截器。该拦截器将在用户在自动完成字段中输入时处理请求。

```typescript
@@filename(cats-autocomplete.interceptor)
import { Injectable } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import { AutocompleteInterceptor } from 'necord';

@Injectable()
class CatsAutocompleteInterceptor extends AutocompleteInterceptor {
  public transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    let choices: string[];

    if (focused.name === 'cat') {
      choices = ['暹罗猫', '波斯猫', '缅因猫'];
    }

    return interaction.respond(
      choices
        .filter((choice) => choice.startsWith(focused.value.toString()))
        .map((choice) => ({ name: choice, value: choice })),
    );
  }
}
```

你还需要在你的选项类中标记 `autocomplete: true`：

```typescript
@@filename(cat.dto)
import { StringOption } from 'necord';

export class CatDto {
  @StringOption({
    name: 'cat',
    description: '选择一个猫的品种',
    autocomplete: true,
    required: true,
  })
  cat: string;
}
```

最后，将拦截器应用到你的斜杠命令上：

```typescript
@@filename(cats.commands)
import { Injectable, UseInterceptors } from '@nestjs/common';
import { Context, SlashCommand, Options, SlashCommandContext } from 'necord';
import { CatDto } from '/cat.dto';
import { CatsAutocompleteInterceptor } from './cats-autocomplete.interceptor';

@Injectable()
export class CatsCommands {
  @UseInterceptors(CatsAutocompleteInterceptor)
  @SlashCommand({
    name: 'cat',
    description: '获取特定猫品种的信息',
  })
  public async onSearch(
    @Context() [interaction]: SlashCommandContext,
    @Options() { cat }: CatDto,
  ) {
    return interaction.reply({
      content: `我找到了关于 ${cat} 猫品种的信息！`,
    });
  }
}
```

#### 用户上下文菜单

用户命令出现在右键单击（或点击）用户时出现的上下文菜单中。这些命令提供了直接针对用户的快速操作。

```typescript
@@filename(app.commands)
import { Injectable } from '@nestjs/common';
import { Context, UserCommand, UserCommandContext, TargetUser } from 'necord';
import { User } from 'discord.js';

@Injectable()
export class AppCommands {
  @UserCommand({ name: '获取头像' })
  public async getUserAvatar(
    @Context() [interaction]: UserCommandContext,
    @TargetUser() user: User,
  ) {
    return interaction.reply({
      embeds: [
        new MessageEmbed()
          .setTitle(`${user.username} 的头像`)
          .setImage(user.displayAvatarURL({ size: 4096, dynamic: true })),
      ],
    });
  }
}
```

#### 消息上下文菜单

消息命令出现在右键单击消息时的上下文菜单中，允许针对这些消息进行快速操作。

```typescript
@@filename(app.commands)
import { Injectable } from '@nestjs/common';
import { Context, MessageCommand, MessageCommandContext, TargetMessage } from 'necord';
import { Message } from 'discord.js';

@Injectable()
export class AppCommands {
  @MessageCommand({ name: '复制消息' })
  public async copyMessage(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    return interaction.reply({ content: message.content });
  }
}
```

#### 按钮

[按钮](https://discord.com/developers/docs/interactions/message-components#buttons)是可以包含在消息中的交互式元素。当点击时，它们会向你的应用发送一个[交互](https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object)。

```typescript
@@filename(app.components)
import { Injectable } from '@nestjs/common';
import { Context, Button, ButtonContext } from 'necord';

@Injectable()
export class AppComponents {
  @Button('BUTTON')
  public onButtonClick(@Context() [interaction]: ButtonContext) {
    return interaction.reply({ content: '按钮已点击！' });
  }
}
```

#### 选择菜单

[选择菜单](https://discord.com/developers/docs/interactions/message-components#select-menus)是另一种出现在消息上的交互式组件类型。它们提供了一个下拉式 UI，供用户选择选项。

```typescript
@@filename(app.components)
import { Injectable } from '@nestjs/common';
import { Context, StringSelect, StringSelectContext, SelectedStrings } from 'necord';

@Injectable()
export class AppComponents {
  @StringSelect('SELECT_MENU')
  public onSelectMenu(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() values: string[],
  ) {
    return interaction.reply({ content: `你选择了: ${values.join(', ')}` });
  }
}
```

完整的内置选择菜单组件列表，请访问[此链接](https://necord.org/interactions/message-components#select-menu)。

#### 模态框

模态框是弹出式表单，允许用户提交格式化的输入。以下是使用 Necord 创建和处理模态框的方法：

```typescript
@@filename(app.modals)
import { Injectable } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';

@Injectable()
export class AppModals {
  @Modal('pizza')
  public onModal(@Context() [interaction]: ModalContext) {
    return interaction.reply({
      content: `你最喜欢的披萨是: ${interaction.fields.getTextInputValue('pizza')}`
    });
  }
}
```

#### 更多信息

更多信息，请访问 [Necord](https://necord.org) 网站。