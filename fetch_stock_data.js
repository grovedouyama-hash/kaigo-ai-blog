// 掲載15社の株価(日足・約6ヶ月)をYahoo Financeの公開APIから取得し、
// stock_data.js（window.STOCK_DATA）として書き出す。
// スケジュールタスクから `node fetch_stock_data.js` で毎日実行される想定。
// ※サーバー側(node)で取得するのでCORSの制約を受けない。株価は終値ベースの参考値。
const https = require('https');
const fs = require('fs');
const OUT = 'C:\\Work\\仏\\site\\stock_data.js';

const COMPANIES = [
  ['6702', '富士通'], ['7012', '川崎重工業'], ['6954', 'ファナック'], ['6506', '安川電機'],
  ['7779', 'サイバーダイン'], ['8020', '兼松'], ['9984', 'ソフトバンクグループ'], ['7203', 'トヨタ自動車'],
  ['2678', 'アスクル'], ['9843', 'ニトリHD'], ['8113', 'ユニ・チャーム'], ['4452', '花王'],
  ['3861', '王子HD'], ['7817', 'パラマウントベッドHD'], ['7840', 'フランスベッドHD']
];

function fetchOne(code) {
  return new Promise(function (resolve) {
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + code + '.T?range=6mo&interval=1d';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function (res) {
      var d = '';
      res.on('data', function (c) { d += c; });
      res.on('end', function () {
        try {
          var j = JSON.parse(d);
          var r = j.chart.result[0];
          var ts = r.timestamp || [];
          var cl = r.indicators.quote[0].close || [];
          var dates = [], closes = [];
          for (var i = 0; i < ts.length; i++) {
            if (cl[i] == null) continue;
            dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10));
            closes.push(Math.round(cl[i] * 10) / 10);
          }
          var meta = r.meta || {};
          resolve({
            code: code, ok: closes.length > 1, currency: meta.currency || 'JPY',
            last: closes.length ? closes[closes.length - 1] : null,
            prev: closes.length > 1 ? closes[closes.length - 2] : null,
            hi: meta.fiftyTwoWeekHigh, lo: meta.fiftyTwoWeekLow,
            d: dates, c: closes
          });
        } catch (e) { resolve({ code: code, ok: false, err: e.message }); }
      });
    }).on('error', function (e) { resolve({ code: code, ok: false, err: e.message }); });
  });
}

(async function () {
  var out = {};
  for (var k = 0; k < COMPANIES.length; k++) {
    var code = COMPANIES[k][0], name = COMPANIES[k][1];
    var r = await fetchOne(code);
    if (r.ok) {
      out[code] = { name: name, currency: r.currency, last: r.last, prev: r.prev, hi: r.hi, lo: r.lo, d: r.d, c: r.c };
      console.log('ok  ', code, name, r.c.length + 'pts', 'last', r.last);
    } else {
      out[code] = { name: name, ok: false };
      console.log('FAIL', code, name, r.err);
    }
    await new Promise(function (z) { setTimeout(z, 300); });
  }
  out._updated = new Date().toISOString();
  fs.writeFileSync(OUT, 'window.STOCK_DATA=' + JSON.stringify(out) + ';\n', 'utf8');
  console.log('written', OUT);
})();
