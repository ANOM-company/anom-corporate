# 確認用プレビュー（PRごと・閲覧制限あり）

PRを作る・更新するたびに `apps/v10` をビルドし、本番とは別の Cloudflare Worker「anom-site-preview」のプレビューURLへ載せて、URLをPRのコメントに書きます。スマホからでもPRのコメントのURLを開けば確認できます。

- 本番には反映しません（`wrangler versions upload` は版を置くだけで、どの Worker の本番の版も切り替えません）。
- プレビューURLは Cloudflare Access で閲覧を制限します。Access が効いていない（ログインなしで中身が見える）ときは、ワークフローを失敗にしてURLを出しません。
- フォークからのPR、`apps/v10` が無いPRでは何もしません。
- 資格情報は依存の導入・ビルドの手順には渡さず、Cloudflare へ送る手順にだけ渡します。

## ファイル

| ファイル | 役割 |
|---|---|
| `.github/workflows/preview.yml` | ワークフロー本体（PRで自動実行／初回作成は手動実行） |
| `.github/preview/wrangler.jsonc` | プレビュー用 Worker の設定（常設URLなし・プレビューURLのみ） |
| `.github/preview/placeholder/index.html` | 初回作成時に置く「準備中」ページ |

## 準備（Cloudflare と GitHub の管理者が一度だけ行う）

順番を守ってください。Access を設定する前にプレビューを作らないためです。

1. Cloudflare で API トークンを作る。権限は「アカウント › Workers Scripts › 編集」だけ、対象はこのアカウントだけにする。
2. GitHub のリポジトリ設定 › Environments に `preview` を作り、Secrets に次の2つを登録する。
   - `CLOUDFLARE_API_TOKEN`（1 のトークン）
   - `CLOUDFLARE_ACCOUNT_ID`（Cloudflare のアカウントID）
3. このワークフローが `main` に入ったあと、Actions › preview › Run workflow で `init` を実行する。準備中ページだけを持つ Worker「anom-site-preview」ができる（常設URLは作らない）。
4. Cloudflare のダッシュボードで Worker「anom-site-preview」› 設定 › ドメインとルート › プレビューURL の Cloudflare Access を有効にし、閲覧を許可するメールアドレスだけを Access のポリシーに入れる。
5. GitHub のリポジトリ設定 › Variables に `PREVIEW_ENABLED` = `true` を登録する。ここから PR ごとのプレビューが作られる。

止めたいときは `PREVIEW_ENABLED` を `true` 以外にします。

## URLの種類

- `https://pr-<PR番号>-anom-site-preview.<アカウントのサブドメイン>.workers.dev` … そのPRの最新。更新のたびに中身が新しくなる。
- `https://<版ID先頭8文字>-anom-site-preview.<アカウントのサブドメイン>.workers.dev` … その版に固定。見比べたいときに使う。

## 注意

- プレビューに本番の顧客データ・認証情報を入れない。
- E2E などの検証は `v10-ci`（job `v10-quality`）が別に行う。プレビューができても検証に合格したとは限らないので、PRのチェック結果も見る。
- PRを閉じてもプレビューの版は Cloudflare に残る（閲覧制限は残る）。
