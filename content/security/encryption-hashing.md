### 加密与哈希

**加密**是一种信息编码的过程。该过程将信息的原始表示（称为明文）转换为另一种形式（称为密文）。理想情况下，只有授权方才能将密文解密回明文并访问原始信息。加密本身并不能防止干扰，但会阻止潜在拦截者获取可理解的内容。加密是一种双向功能，使用正确的密钥可以将加密内容解密。

**哈希**是将给定密钥转换为另一个值的过程。哈希函数根据数学算法生成新值。一旦完成哈希处理，从输出返回到输入应该是不可行的。

#### 加密

Node.js 提供了一个内置的 [crypto 模块](https://nodejs.org/api/crypto.html)，可用于加密和解密字符串、数字、缓冲区、流等。Nest 本身并未在该模块之上提供任何额外的包，以避免引入不必要的抽象。

例如，我们使用 AES（高级加密系统）的 `'aes-256-ctr'` 算法 CTR 加密模式。

```typescript
import { createCipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const iv = randomBytes(16);
const password = '用于生成密钥的密码';

// 密钥长度取决于算法。
// 对于 aes256，它是 32 字节。
const key = (await promisify(scrypt)(password, 'salt', 32)) as Buffer;
const cipher = createCipheriv('aes-256-ctr', key, iv);

const textToEncrypt = 'Nest';
const encryptedText = Buffer.concat([
  cipher.update(textToEncrypt),
  cipher.final(),
]);
```

现在解密 `encryptedText` 值：

```typescript
import { createDecipheriv } from 'crypto';

const decipher = createDecipheriv('aes-256-ctr', key, iv);
const decryptedText = Buffer.concat([
  decipher.update(encryptedText),
  decipher.final(),
]);
```

#### 哈希

对于哈希处理，我们推荐使用 [bcrypt](https://www.npmjs.com/package/bcrypt) 或 [argon2](https://www.npmjs.com/package/argon2) 包。Nest 本身并未在这些模块之上提供任何额外的包装器，以避免引入不必要的抽象（缩短学习曲线）。

例如，我们使用 `bcrypt` 来哈希一个随机密码。

首先安装所需的包：

```shell
$ npm i bcrypt
$ npm i -D @types/bcrypt
```

安装完成后，你可以使用 `hash` 函数，如下所示：

```typescript
import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;
const password = 'random_password';
const hash = await bcrypt.hash(password, saltOrRounds);
```

要生成盐，使用 `genSalt` 函数：

```typescript
const salt = await bcrypt.genSalt();
```

要比较/检查密码，使用 `compare` 函数：

```typescript
const isMatch = await bcrypt.compare(password, hash);
```

你可以在[这里](https://www.npmjs.com/package/bcrypt)阅读更多关于可用函数的信息。