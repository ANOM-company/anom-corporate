// 冒頭の「部品の組み立て」の動きを、同じタブで1回だけにする小さなスクリプト（head で同期的に読み込む）。
// - 1回目の表示: 印を記録するだけ（動きは CSS のまま再生される）
// - 同じタブでの2回目以降（再読み込み・ページ間の移動で戻ったとき）: <html data-hero-seen> を付け、
//   global.css の [data-hero-seen] .assemble で動きを止めて、完成した図をすぐに表示する
// - 保存できない環境（プライベートブラウズなど）では何もしない（毎回再生されるだけで、表示は壊れない）
/* global window, document */
(function () {
  try {
    var key = 'anom-hero-seen';
    if (window.sessionStorage.getItem(key) === '1') {
      document.documentElement.setAttribute('data-hero-seen', '');
    } else {
      window.sessionStorage.setItem(key, '1');
    }
  } catch {
    // 何もしない
  }
})();
