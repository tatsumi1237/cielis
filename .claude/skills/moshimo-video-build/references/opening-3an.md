# 冒頭0秒・3案の作り方（デザイン未確定の初回だけ。基本は C「シネマ型」で3案は省いてよい）

## ルール
1. **動画と同じ3Dで描く**（Three.js＋models.js）。Canvas 2D のイラスト風にしない（却下された）
2. 良くするのは構図・光・小物・文字だけ。夕景の逆光、rimLight、窓あかりの街、名所、屋上の小物、floaters、鳥で背景を密に
3. タイトルは大きく（明朝90px前後）、キーワードだけ色とサイズを変える。小さい英字ラベル（SIMULATION）を上に。**配置は画面中央**
4. 時間表示は大きく（200px前後・光彩）。ユーザーが「経過時間」と言えば経過時間。下に進行バーと「いまの値」
5. 主役を文字に重ねない（文字は中央、主役は文字の上下に見えるようカメラ調整）
6. 下にひと言のフック（rgba(10,5,20,.88) の帯、y≈1730）
7. 3案は場所・時間帯・文字デザインをはっきり変える（例 A 夕暮れの屋上／B 真昼のビーチ／C 夕陽の逆光）

## 文字デザインの型
- A 枠付きパネル型：キーワードを黄色帯で強調、「経過時間｜いまの値」の2列パネル（橙枠）
- B ポップ型：赤い「⚠ ○○異常 発生」バッジ、太縁取りの白文字タイトル、丸メーター＋白タイマーカード
- C シネマ型：SIMULATION ラベル、明朝タイトル、光る巨大タイマー＋グラデの進行バー＋いまの値、暗い帯のフック

## 手順
1. 作業フォルダに head.html・base.js・models.js を置き、`concept/scene3d.js` を作る。URLの `?v=` で映像と文字を別々に切替（`?v=AC`＝映像A×文字C）
   ```js
   const V=new URLSearchParams(location.search).get('v')||'A';
   const VS=V.length>1?V[0]:V, VT=V.length>1?V[1]:V;
   if(VS==='A'){/* 3Dシーン */} if(VS==='B'){...} if(VS==='C'){...}
   renderer.render(S,cam); $('flash').style.opacity=0;$('dim').style.opacity=0;
   if(VT==='A'){/* 文字 */} ...
   window.ready=true; </script></body></html>
   ```
2. 結合：`cat head.html base.js models.js > pre.js; { cat pre.js; echo 'const $=id=>document.getElementById(id);'; cat scene3d.js; } > c3d.html`
3. Playwright で `?v=A,B,C` を撮影（viewport 1080×1920、launch に swiftshader フラグ、`window.ready===true` を待つ、`#stage` を screenshot）
4. 3枚を横並び：`ffmpeg -i A.png -i B.png -i C.png -filter_complex "[0]scale=540:960[a];[1]scale=540:960[b];[2]scale=540:960[c];[a][b][c]hstack=3" cmp.jpg` → Read で確認
5. チェック：主役の頭・腕が文字に隠れていない／フックの帯が主役と重ならない／時間表示が指定どおり／モデルの見た目が本編と同じ
6. 3枚＋横並びを SendUserFile(render) で送り、「どれで進めるか」を1点だけ聞く。選ばれた組合せで作り直して送り、OKなら本編の冒頭に組み込む
