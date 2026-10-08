# メモDB(自然言語で記録・自然言語で検索)

スマホのブラウザ1画面で「メモを保存」と「質問」の両方ができます。
Cloudflare Workers + D1 上で動くため、PCを閉じていても動作します。

## 仕組み
- **保存**: 原文をそのままD1に保存し、LLMが「一行要約・出来事の日付(年補完)・検索キーワード(別表記含む)」を付与。LLMが失敗しても原文は必ず残ります。
- **質問**: LLMが質問を検索プラン(キーワード+日付範囲)に変換 → D1を検索 → 該当メモだけをLLMに渡して回答(根拠メモ番号付き)。
- 例: 「10月4日に…月額報酬を98,522円にした」を保存 → 1年後「去年登録した従業員の月額報酬は?」→「98,522円です (#1)」

## 無料枠で完結
- LLM: Cloudflare Workers AI(Llama 3.3 70B)。無料枠は1日10,000 neurons、1操作は概ね100〜200 neurons程度なので、1日数十件の保存・質問は無料で収まります。
- 保存先D1・Workers・静的配信も個人利用の無料枠内。クレジットカード登録不要です。
- 日本語精度が足りない場合は `wrangler.toml` の `AI_MODEL` を変更できます。

## セットアップ(初回のみ・GitHub Actionsで自動デプロイ)
1. Cloudflareに無料登録し、ダッシュボードで **Account ID** を控える。
2. 「My Profile → API Tokens」で "Edit Cloudflare Workers" テンプレートからトークンを作り、**D1: Edit** 権限を追加する。
3. このGitHubリポジトリの Settings → Secrets and variables → Actions に3つ登録:
   - `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`
   - `MEMO_AUTH_TOKEN`(パスワード代わりの長いランダム文字列)
4. Actions タブで "Deploy memo-db" を Run workflow。完了後、Workersダッシュボードの `cielis-memo-db` のURLがアプリのURLです。

スマホでそのURLを開き、初回にMEMO_AUTH_TOKENを入力 →「ホーム画面に追加」でメモ帳アプリのように使えます。

## 別の入力方法
iPhoneのショートカット等から `POST /api/note` (`Authorization: Bearer <AUTH_TOKEN>`, body `{"text":"..."}`) でも保存できます。

## 制限
- 検索はキーワード一致+LLMによるキーワード拡張方式です。数万件規模で精度が落ちる場合はD1のFTSやベクトル検索(Vectorize)への置き換えを検討してください。
