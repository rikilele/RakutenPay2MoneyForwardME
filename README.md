# 楽天ペイ → マネーフォワード ME

楽天ペイを利用した際に毎回送られてくる「楽天ペイアプリご利用内容確認メール」と「楽天ペイ 注文受付（自動配信メール）」から情報を抜き取り、
マネーフォワード ME に自動入力するスクリプト。

## 制限

- マネーフォワード ID にメールアドレスで登録しているアカウントにのみ対応

> [!WARNING]
> MailSlurp の仕様変更により、新規セットアップに課金（月 ¥3,000）が必要となってしまいました...

## 使いかた

### 1. ✉️ MailSlurp 設定

1. [MailSlurp](https://docs.mailslurp.com/) アカウントを作成
1. 受信トレイを作成
1. 「楽天ペイアプリご利用内容確認メール」と「楽天ペイ 注文受付（自動配信メール）」が自動で受信トレイに転送されるよう設定
    - [Gmail の場合](https://support.google.com/mail/answer/10957)
    - [Outlook の場合](https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-in-outlook-7f2670a1-7fff-4475-8a3c-5822d63b0c8e)

### 2. ⬇️ `npm install`

```sh
$ git clone https://github.com/rikilele/RakutenPay2MoneyForwardME.git
$ npm install
```

### 3. 🌎 `.env` 設定

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

### 4. 🏃 実行

```sh
$ npm start
```
