# 楽天ペイ → マネーフォワード ME

楽天ペイを利用した際に毎回送られてくる「楽天ペイアプリご利用内容確認メール」から情報を抜き取り、
マネーフォワード ME に自動入力するスクリプト。

ベタのマネーフォワード ID のアカウントを持ってる人限定。

**⚠️ 取扱注意：めっちゃ雑 ⚠️**

## 使いかた

### 0. MailSlurp

0. [MailSlurp](https://docs.mailslurp.com/) アカウントを作成
0. 受信トレイを作成
0. 「楽天ペイアプリご利用内容確認メール」が自動で受信トレイに転送されるよう設定
    - [Gmail の場合](https://support.google.com/mail/answer/10957)
    - [Outlook の場合](https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-in-outlook-7f2670a1-7fff-4475-8a3c-5822d63b0c8e)

### 1. `npm install`

```sh
$ git clone https://github.com/rikilele/RakutenPay2MoneyForwardME.git
$ npm install
```

### 2. `.env`

```sh
$ touch .env
```

作成した `.env` ファイルに以下の情報を足す

```js
MAILSLURP_API_KEY="MailSlurp の APIキー"
MAILSLURP_INBOX_ID="MailSlurp の 受信トレイID"
MONEY_FORWARD_EMAIL="マネーフォワード ID のメールアドレス"
MONEY_FORWARD_PW="マネーフォワード ID のパスワード"
```

### 3. 実行

```sh
$ npm start
```
