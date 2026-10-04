# Photo Choice 設計

## 要件と画面

アカウントなしで期限付きRoomを作り、Fragment付き参加者URL/管理者URLを共有する。トップ、Room作成Dialog、参加者名Dialog、写真Grid/拡大表示、Admin Panelを画面単位とする。HEICはブラウザ間のデコード品質が安定しないためMVP外とし、JPEG/PNG/WebPをCanvasでJPEG化する拡張点をFrontend featureに置く。

## Security architecture

- Room IDは144 bit、Access/Admin/Participant secretは256 bitのCSPRNG値。Access/Adminは別値でSHA-256 digestだけをD1へ保存する。
- SecretはURL Fragmentから読み、`sessionStorage`へ移した直後に`history.replaceState`でアドレスバーから消す。APIはAuthorization headerのみ使用する。
- 認証は不存在Roomにもdummy digest比較を行い、失敗を同じ404 bodyに統一する。これは完全な定時間処理を保証するものではなく、Cloudflare Rate Limitingを併用する。
- R2は非公開Bindingだけで接続し、写真はRoom認証、Room所属、期限を毎回検証するWorker routeから`no-store`で返す。
- Same-origin API、JSON/FormData、Bearer secretのため単純なcross-site formによるCSRFを避ける。CSP、nosniff、no-referrerもWorker/HTMLで設定する。
- Worker内rate limitだけではPoP間で正確に共有されないため、本番はCloudflare WAF Rate Limiting ruleを必須とする。認証/作成/参加/写真/投票/AdminをIP単位で保護する。

## Cleanup consistency

Roomを`deleting`にして新規アクセスを止め、R2 prefixを全削除してからD1 Roomを削除する。D1関連行はcascadeする。失敗時はCronが`deleting` Roomを再取得するためidempotentに再実行できる。R2 Lifecycle 60日を最後の安全網とする。

## API

| Method | Path                                         | Authority           | Purpose           |
| ------ | -------------------------------------------- | ------------------- | ----------------- |
| POST   | `/api/rooms`                                 | public + rate limit | Room作成          |
| GET    | `/api/rooms/:roomId`                         | participant/admin   | Room/写真一覧     |
| POST   | `/api/rooms/:roomId/participants`            | participant/admin   | 参加/再訪         |
| POST   | `/api/rooms/:roomId/photos`                  | admin               | 写真Upload        |
| GET    | `/api/rooms/:roomId/photos/:photoId/content` | participant/admin   | private image     |
| PUT    | `/api/rooms/:roomId/photos/:photoId/vote`    | participant/admin   | 種別別vote toggle |
| GET    | `/api/rooms/:roomId/admin/results.csv`       | admin               | CSV               |
| GET    | `/api/rooms/:roomId/admin/results.txt`       | admin               | text              |
| DELETE | `/api/rooms/:roomId`                         | admin               | 即時削除          |

## Test strategy / phases

PureなID、hash、expiry、MIME、集計、sort、CSVはUnit。認証Serviceと後続のD1/R2 Miniflare suiteをIntegration。利用者Journeyと拒否ScenarioをPlaywright E2Eで扱う。各PhaseはRed→Green→Refactorを小さいcommit単位で行い、CI gateを通過してから`develop`へmergeする。
