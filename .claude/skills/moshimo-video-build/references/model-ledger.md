### モデル台帳
新しいモデルを作ったら、ここに1行足して models.js にコードを追記する（「4-3」）。

| 関数 | 種類 | 内容・大きさ | 状態の引数 | 初出 |
|---|---|---|---|---|
| `sky(top,bot,near,far)` / `lights(s,COLD\|WARM)` | 画質 | 空のグラデ＋霧／半球光＋影付き太陽 | COLD=寒い曇天、WARM=晴れ | 第2作冒頭 |
| `building(w,h,d,col,snow)` / `city(s,{n,rmin,rmax,snow,skip})` | 汎用 | 窓テクスチャ付きビル／中心を囲む街並み | snow | 第2作冒頭 |
| `blizzard(s,n,c,spread,hgt,size)` | 汎用 | 丸い粒の吹雪。update(t,速度,風) を返す | — | 第2作冒頭 |
| `icicles(g,x0,x1,y,z,n,len)` | 汎用 | つらら | — | 第2作冒頭 |
| `pine(s)` | 汎用 | 雪をかぶった松 | — | 第2作冒頭 |
| `hipRoof(w,d,h,col)` | 汎用 | 寄棟屋根 | — | 第2作冒頭 |
| `screenSign(s,text,x,y,z,ry,w,h,color)` | 汎用 | 3D内の電光掲示板（文字入り） | text | 第2作冒頭 |
| `beam(p,q,th,mat)` | 汎用 | 2点間の角材（鉄骨・トラス） | — | 第2作冒頭 |
| `tokyoTower(frozen)` | 名所 | 東京タワー（鉄骨トラス・展望台2つ・アンテナ・フットタウン）高さ約150 | frozen=雪・つらら・くすんだ色 | 第2作冒頭 |
| `kinkaku(snow=true)` | 名所 | 金閣寺（3層・金色・鳳凰）幅15・高さ21 | snow | 第2作冒頭 |
| `torii(snow=true)` | 名所 | 厳島神社の大鳥居（両部鳥居）幅23・高さ17 | snow | 第2作冒頭 |
| `sceneTowerSnow()` | 完成シーン | 吹雪の東京タワー＋雪の街 | — | 第2作冒頭 |
| `sceneTowerAutumn()` | 完成シーン | 秋晴れの東京タワー＋紅葉＋街 | — | 第2作冒頭 |
| `sceneKinkakuSnow()` | 完成シーン | 雪の金閣寺＋凍った鏡湖池＋松 | — | 第2作冒頭 |
| `sceneShibuyaSnow(text)` | 完成シーン | 雪の渋谷スクランブル交差点（ビジョンに text、埋もれた車、信号） | text | 第2作冒頭 |
| `sceneToriiIce()` | 完成シーン | 凍った海に立つ大鳥居＋流氷＋雪山 | — | 第2作冒頭 |
| `particles(s,n,c,spread,hgt,size,color,opacity)` | 汎用 | 色を選べる粒（桜の花びら・雪）。update(t,落下,風,揺れ) | color | 第3作 |
| `vehicle(type,color,{lights,cargo,logo})` / `vehicleAnim(v,t,回転,ワイパー)` | 動く | 車（kei/suv/truck）。タイヤ回転・ワイパー・ライト | lights | 第3作 |
| `human({coat,pants,hair,hat,scarf,kid,suit,tie})` / `walkAnim` `shiverAnim` | 動く | 人。歩く・震える。腕は userData.arms で自由に動かせる | hat・scarf=冬服、suit=白シャツ＋ネクタイ（第4作で追加） | 第3作 |
| `deerM()` / `deerAnim` | 動く | シカ（脚が動く） | — | 第3作 |
| `bird(color,s)` / `birdAnim` | 動く | 鳥・カモメ（羽ばたき） | color | 第3作 |
| `airliner()` | 動く | 旅客機 | — | 第3作 |
| `houseM({snow,ice,night,lit})` | 汎用 | 日本の家（MS版。雪・つらら・夜の明かり） | snow/ice/night/lit | 第3作 |
| `utilityPole(h)` / `vending(lit,snow)` | 汎用 | 電柱／自販機（日本らしさ） | lit・snow | 第3作 |
| `streetJ(s,{snow,depth,ice,night,lit})` | 汎用 | 日本の道路沿いの街（家・歩道・電柱と電線・自販機）。z方向に伸びる | snow・night | 第3作 |
| `nightCity(s,{snow,stopT})` | 汎用 | 夜の街。update(t,offAt(d,t)) で明かりを1棟ずつ消せる（停電の波） | snow | 第3作 |
| `storeShelf(full,len)` / `cart()` | 汎用 | スーパーの棚（商品びっしり／空っぽ＋霜）・カート | full | 第3作 |
| `cargoShip(snow)` / `gantryCrane(frozen)` / `waterPlane(w,d,seg,color)` | 汎用 | 貨物船・クレーン（トロリーが動く）・波打つ海 | snow・frozen | 第3作 |
| `sakura(s,bloom)` | 汎用 | 桜（満開／雪の枯れ木） | bloom | 第3作 |
| `fuji(snow)` | 名所 | 富士山（半径260・高さ125） | 'cap'=山頂だけ雪／'all'=全部雪 | 第3作 |
| `shinkansen(cars,snow)` / `railTrack(s,len,snowy)` | 名所 | 新幹線（先頭車のノーズ・青帯・車輪が回る）／線路と架線柱 | snow | 第3作 |
| `sceneTowerBuried()` | 完成シーン | 雪に埋もれた夜の東京タワー＋月＋歩くシカ（{s,bz,deers}） | — | 第3作 |
| `rising(s,n,c,r,h,size,color,opacity,speed)` | 汎用 | 立ちのぼる粒（湯気・焚き火の火の粉） | color | 第4作 |
| `palmM(s)` | 汎用 | ヤシの木（MS版） | — | 第4作 |
| `laptop()` / `typeAnim(p,t)` / `sitPose(p)` | 動く | ノートPC（画面にSNSの管理画面）／打鍵する腕／座る姿勢 | — | 第4作 |
| `chair(col)` / `table(w,d,h,col)` / `cupSteam(s,x,y,z,soft)` | 汎用 | 椅子・机・湯気の立つコーヒー | — | 第4作 |
| `trainInterior(s,{crowd,night})` | 汎用 | 通勤電車の車内（つり革が揺れる・窓の外の景色が流れる・満員の乗客）。update(t,揺れ) | crowd・night | 第4作 |
| `officeFloor(s,{night})` | 汎用 | オフィス（机・モニター・蛍光灯・窓の外のビル・打鍵する社員）。{workers} | night=残業（人と照明が少ない） | 第4作 |
| `conbini()` | 汎用 | コンビニの外観（緑・橙・青の帯、明るいガラス） | — | 第4作 |
| `machiya()` / `nodategasa()` | 汎用 | 京都の町家（格子・のれん・提灯）／野点傘と縁台 | — | 第4作 |
| `pagoda5()` | 名所 | 五重塔（八坂の塔）高さ約30 | — | 第4作 |
| `onsenScene()` | 完成シーン | 露天風呂（岩・湯気・竹垣・紅葉）{s,st} | — | 第4作 |
| `tent(col)` / `campfire(s,x,z)` | 汎用 | テント／焚き火（炎がゆらぐ・火の粉・灯り）。campfire は update を返す | — | 第4作 |
| `platformJ(s,{sign})` / `signPlaneS(text,bg,fg,w,h)` | 汎用 | 駅のホーム（黄色い点字ブロック・屋根・駅名標）／文字入りの看板 | sign | 第4作 |
| `sceneOkinawaBeach({sunset})` | 完成シーン | 沖縄の海辺（白い砂浜・エメラルドの浅瀬・波・ヤシ）{s,water,update} | sunset=夕焼け | 第4作 |
| `human({hd:true,...})`（=`humanHD`） | 動く | **高精細の人物**。顔（白目・黒目・眉・鼻・口・耳）、髪型、首、肩幅のある胴、襟・ラペル、ひじ・ひざの関節、手、靴。walkAnim/typeAnim/sitPose はそのまま使える（ひじ・ひざも曲がる） | style:'short'/'side'/'long'、glasses、beard、suit（チャコール紺）、shirt、tie、skin | 第4作後の改良 |
| `groundTex(kind,repeat)` / `groundPlane(s,kind,w,d,x,z,y,repeat)` | 画質 | 質感付きの地面（sand/grass/asphalt/tile/wood/concrete） | kind | 第4作後の改良 |
| `skyline(s,kind,dist,color,n,arc)` | 画質 | 遠景のシルエット（city/hills/forest）。地平線を空っぽにしない | kind | 第4作後の改良 |
| `floaters(s,n,c,spread,hgt,color,size,opacity)` / `rimLight(s,color,i,pos)` | 画質 | 漂う光の粒（空気感）／逆光の縁取り（人物を背景から浮かせる） | — | 第4作後の改良 |
| `elder(o)` / `elderWalk(p,t)` | 動く | 高齢者（HD人物＋白髪・前かがみ・杖）。ゆっくり歩く | v=髪色0〜2、cane、glasses、style | 第5作 |
| `cane()` / `hatM(col)` / `shopBag(col)` | 汎用 | 杖・帽子・買い物袋（「人が消えた」演出の置き去りの小物） | — | 第5作 |
| `bankFront(s)` | 汎用 | 銀行の前（ガラス張りの1階・看板「みらい銀行」・外向きATM3台・歩道・電柱）。歩道は z=2〜6 | — | 第5作 |
| `hospitalLobby(s,{num})` | 汎用 | 病院の待合室（青いベンチ×12・受付・呼出番号の電光表示・観葉植物）。{g,seats,call} | num=呼出番号 | 第5作 |
| `mountainVillage(s,{seed,lit,smoke,harvest})` | 汎用 | 山あいの集落（山・紅葉の木・棚田・家・電柱・道）。seed が同じなら上下で同じ配置 | lit=窓の明かり、smoke=煙、harvest=黄金の田 | 第5作 |
| `shoppingArcade(s,{seed,shutter})` | 汎用 | アーケード商店街（店28軒・ひさし・看板・提灯・アーチ屋根） | shutter=シャッター街 | 第5作 |
| `dietBuilding()` | 名所 | 国会議事堂（中央塔の段々屋根・左右の翼・列柱）幅約206・高さ約65 | — | 第5作 |

基準実装の asset library にある `person` `tree` `palm` `car('kei'|'suv')` `house` `apartment` `modernHouse` `plate` `coin` も再利用できる（旧画質の Lambert なので、主役にするときは `MS()` で色を付け直すか shadowAll を掛ける）。


### assets/gw.js（万里の長城シーン用。models.js の後に結合する）
| 関数 | 内容 |
|---|---|
| `terrain(s,o)` / `terrainH(x,z)` | 海岸から山岳へ続く地形と高さ関数（ノイズ`gwNoise`、尾根`pathX`） |
| `greatWall(s,o)` | 尾根に沿う城壁（レンガUV付き・マージ済み） |
| `watchtower(warm)` / `pavilion()` / `seaHead(s,z0,x0,y)` | 敵楼／東屋／老龍頭（海に突き出る城壁） |
| `brickTex` `brickMat` `boxUV` `mergeGeo` | 引き伸ばしのないレンガ質感と結合ジオメトリの部品 |

### 人間消失シーン（examples/scene-ningen-kietara.js 内。必要なら models.js へ移す）
スクランブル交差点の群衆と歩行者、電車＋水没するサブウェイ、吹き出し付き動物、崩れる橋、東京タワー倒壊、大仏／ピラミッド／万里の長城の遠景、CTAカード。
