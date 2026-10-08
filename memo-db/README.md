# メモDB(自然言語で記録・自然言語で検索)

スマホのブラウザ1画面で「メモを保存」と「質問」の両方ができます。
Cloudflare Workers + D1 上で動くため、PCを閉じていても動作します。

## 仕組み
- **保存**: 原文をそのままD1に保存し、LLMが「一行要約・出来事の日付(年補完)・検索キーワード(別表記含む)」を付与。LLMが失敗しても原文は必ず残ります。
- **質問**: LLMが質問を検索プラン(キーワード+日付範囲)に変換 → D1を検索 → 該当メモだけをLLMに渡して回答(根拠メモ番号付き)。
- 例: 「10月4日に…月額報酬を98,522円にした」を保存 → 1年後「去年登録した従業員の月額報酬は?」→「98,522円です (#1)」

## LLMとコスト
- 既定: Anthropic API の Haiku(`wrangler.toml` の `ANTHROPIC_MODEL`)。1操作あたり概ね0.1〜0.5円。
- ※ Claudeのサブスク(Pro/Max)はサーバーから自動利用できないため、サブスク枠の利用は不可です。
- APIキーを設定しない場合は Cloudflare Workers AI(無料枠あり)に自動フォールバック。日本語精度はやや落ちます。
- Cloudflare Workers/D1 は個人利用なら無料枠内。

## セットアップ(初回のみ・PCで10分)
```bash
cd memo-db
npm i -g wrangler && wrangler login
wrangler d1 create cielis-memo-db        # 出力された database_id を wrangler.toml に貼る
wrangler d1 execute cielis-memo-db --remote --file=schema.sql
wrangler secret put AUTH_TOKEN           # 好きな長いランダム文字列(これがパスワード)
wrangler secret put ANTHROPIC_API_KEY    # 任意(未設定なら Workers AI)
wrangler deploy                          # 表示されたURLがアプリのURL
```
スマホでそのURLを開き、初回にAUTH_TOKENを入力 →「ホーム画面に追加」でメモ帳アプリのように使えます。

## 別の入力方法
iPhoneのショートカット等から `POST /api/note` (`Authorization: Bearer <AUTH_TOKEN>`, body `{"text":"..."}`) でも保存できます。

## 制限
- 検索はキーワード一致+LLMによるキーワード拡張方式です。数万件規模で精度が落ちる場合はD1のFTSやベクトル検索(Vectorize)への置き換えを検討してください。
