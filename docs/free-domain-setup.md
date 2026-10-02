# 無料ホスト名による公開手順

調査日: 2026-10-02

## 結論

取り急ぎ公開する場合は、ドメインを新規取得せず、Cloudflareが払い出す次のホスト名を使う。

- Web: `<pages-project>.pages.dev`
- API Worker: `photo-voting-api.<account-subdomain>.workers.dev`

ただし、このアプリのブラウザ側は`/api/*`というsame-origin URLを使用する。WebとAPIのホスト名をそのまま分けると動かないため、Pages FunctionsのService bindingで`/api/*`をWorkerへ中継し、利用者には`pages.dev`だけを公開する構成を推奨する。

```text
Browser
  └─ https://<pages-project>.pages.dev
       ├─ /*      → Pages static assets
       └─ /api/*  → Pages Function → Service binding → photo-voting-api Worker
```

この方法なら、DNSレコードや有料ドメインを用意せずHTTPSで試験公開できる。`pages.dev`と`workers.dev`はCloudflare所有のサービス用ホスト名であり、自分が所有する「カスタムドメイン」ではない点には注意する。

## 推奨する設定手順

### 1. Workerの開発用URLを有効にする

1. Cloudflare Dashboardで **Workers & Pages** → `photo-voting-api` → **Settings** → **Domains & Routes** を開く。
2. `workers.dev` routeを有効にする。
3. `https://photo-voting-api.<account-subdomain>.workers.dev/api/...`へ到達できることを確認する。

`wrangler deploy`時に表示されるURLも記録する。API URLをエンドユーザーへ配布する必要はない。

### 2. Pagesプロジェクトを作成する

Cloudflare Dashboardの **Workers & Pages**からGit repositoryを接続し、次を設定する。

| 項目                   | 値              |
| ---------------------- | --------------- |
| Production branch      | `develop`       |
| Build command          | `npm run build` |
| Build output directory | `dist`          |

初回deploy後、`https://<pages-project>.pages.dev`が発行される。プロジェクト名は未使用の範囲で選べるため、用途が分かる短い名前にする。

### 3. `/api/*`用Pages Functionを追加する

本番反映時には、repositoryへ`functions/api/[[path]].ts`を追加し、Service bindingへリクエストを渡す。

```ts
interface Env {
  API: Fetcher;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) => env.API.fetch(request);
```

Cloudflare DashboardのPagesプロジェクトで **Settings** → **Bindings** → **Service bindings** を開き、次を設定する。

| 項目          | 値                 |
| ------------- | ------------------ |
| Variable name | `API`              |
| Service       | `photo-voting-api` |
| Environment   | `production`       |

Preview環境でもAPIを試す場合は、Preview側にもbindingを明示的に設定する。本番データとの混在を避けるには、Preview専用Worker・D1・R2を別途用意する。

> このFunctionは現在のrepositoryには未実装である。実装・test・deploy設定を別作業として行ってから公開すること。

### 4. Room作成のレート制限を設定する

`pages.dev`と`workers.dev`は利用者が管理するCloudflare Zoneではないため、これらのhostnameにZoneのWAF Rate Limiting ruleを設定することはできない。そこで、公開前にWorkerのRate Limiting bindingを必ずdeployする。このrepositoryでは`wrangler.toml`の`ROOM_CREATION_RATE_LIMITER`を`5 requests / 60 seconds`に設定し、認証不要の`POST /api/rooms`を`CF-Connecting-IP`単位で制限している。上限超過時は`429 Too Many Requests`と`Retry-After: 60`を返す。

```toml
[[unsafe.bindings]]
name = "ROOM_CREATION_RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 5, period = 60 }
```

`namespace_id`は同一account内でbindingごとに一意な整数文字列にする。Service binding経由でも実行先Workerのbindingが適用されるため、Pages Functionへ同じbindingを追加する必要はない。Rate Limiting APIはローカル開発では正確に再現されないため、deploy後に連続してRoomを作成し、6回目が`429`になることを確認する。

ZoneのWAFを利用できる独自ドメインへの移行後も、このWorker側の制限を多層防御として維持する。Room作成以外のendpointには、READMEと`docs/design.md`に記載したWAFルールを追加する。

### 5. 動作を確認する

少なくとも次を確認する。

1. `https://<pages-project>.pages.dev`がHTTPSで表示される。
2. Browser DevToolsのNetworkで`POST /api/rooms`が同じ`pages.dev` originへ送信され、成功する。
3. Room作成、参加、画像表示、投票、削除が動作する。
4. APIレスポンスおよび画像に意図した`Cache-Control`が付く。
5. `workers.dev` URLを直接開いても、鍵なしでRoom情報や画像を取得できない。
6. 同じ接続元から60秒以内にRoom作成を6回試し、6回目が`429`になり、60秒後に再び作成できる。

## 代替案

### 一時的にWebとAPIを別ホストで使う

FrontendへAPI base URLを追加し、CORSを厳密に設定すれば、`pages.dev`から`workers.dev`を直接呼び出すこともできる。ただし、現在の相対URL実装の変更、許可originの管理、preflight対応が必要になる。将来カスタムドメインへ移行する際もsame-originの方が単純なため、緊急時以外は推奨しない。

### 第三者の無料サブドメインを使う

無料DNS・Dynamic DNS事業者が提供するサブドメインをCloudflareへ向ける案もあるが、次の理由から本アプリの第一候補にはしない。

- 提供終了、失効、名称変更などを自分で制御できない。
- DNSや証明書の設定可否が事業者ごとに異なる。
- 共有元ドメインの評判がメール、SNS、フィルタリングへ影響する可能性がある。
- 写真共有URLの継続性や利用者の信頼性が`pages.dev`より読みにくい。

### 独自ドメインへ移行する

正式公開時は取得したドメインをCloudflareへ追加し、例えば次の形にする。

- Web: `photos.example.com`
- API: same-originの`https://photos.example.com/api/*`

Cloudflare PagesのCustom domainsからWeb用hostnameを登録する。apex domainを使う場合はnameserverをCloudflareへ向ける必要があり、subdomainの場合はCNAME構成を選べる。先にCloudflare DashboardへCustom domainを関連付け、DNSだけを手動で先行追加しない。

Service bindingによるsame-origin構成を維持すれば、FrontendのAPI URLを変更せずに`pages.dev`から独自ドメインへ切り替えられる。切替後は共有済みURLへの影響を考慮し、必要な期間だけ`pages.dev`から正式hostnameへredirectする。

## 制約と運用上の注意

- 無料なのはドメインの**所有**ではなく、Cloudflareサービス配下のホスト名利用である。
- `pages.dev`のプロジェクト名や`workers.dev`のaccount subdomainは、希望名を必ず取得できるとは限らない。
- Free planにはリクエスト数、build回数、CPU、D1、R2などの上限がある。公開前にDashboardのUsageと現行の料金ページを確認する。
- `pages.dev`を本番相当で使う場合も、推測困難な鍵、非公開R2、WorkerのRate Limiting binding、期限切れ削除など、適用可能なsecurity要件は省略しない。Zone WAFが必要な要件は独自ドメインへ移行するまで満たせないため、無料hostnameでの運用は暫定公開に限定する。
- `workers.dev` routeは疎通確認には便利だが、不要になったら無効化を検討する。無効化前にPagesのService bindingが引き続き動作することを確認する。

## 公式資料

- [Cloudflare Pages: Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages: Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare Pages Functions: Routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Cloudflare Workers: `workers.dev`](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Workers: Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

料金・上限・Dashboard上の名称は変更される可能性があるため、実際の設定時には上記公式資料とDashboardの表示を優先する。
