# 楽天ペイ → マネーフォワード ME

楽天ペイを利用した際に毎回送られてくる「楽天ペイアプリご利用内容確認メール」と「楽天ペイ 注文受付（自動配信メール）」から情報を抜き取り、
マネーフォワード ME に自動入力するスクリプト。

## 制限

- Node.js v18 以上
- マネーフォワード ID にメールアドレスで登録しているアカウントにのみ対応
- 月間１００件まで対応

## 使いかた

### 1. ✉️ testmail.app をセットアップ

1. [testmail.app アカウントを作成](https://testmail.app/signup)
1. 自動で割り当てられた `namespace` をメモ
1. 「Money Forward ID Additional Authentication via Email」が自動で `{namespace}.mf@inbox.testmail.app` に転送されるよう設定
1. 「楽天ペイアプリご利用内容確認メール」が自動で `{namespace}.rp@inbox.testmail.app` に転送されるよう設定
1. 「楽天ペイ 注文受付（自動配信メール）」が自動で `{namespace}.rp@inbox.testmail.app` に転送されるよう設定

    > メールの自動転送の設定方法
    > - [Gmail の場合](https://support.google.com/mail/answer/10957)
    > - [Outlook の場合](https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-in-outlook-7f2670a1-7fff-4475-8a3c-5822d63b0c8e)

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
TESTMAIL_API_KEY="testmail.app の APIキー"
TESTMAIL_NAMESPACE="testmail.app の namespace"
MONEY_FORWARD_EMAIL="マネーフォワード ID のメールアドレス"
MONEY_FORWARD_PW="マネーフォワード ID のパスワード"
```

### 4. 🏃 実行

```sh
$ npm start
```
