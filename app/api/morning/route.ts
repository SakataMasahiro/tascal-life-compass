import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/google';

// ── Wisdom database ────────────────────────────────────────────────────────────
interface Wisdom {
  tradition: string;
  author: string;
  quote: string;
  reflection: string;
  action: string;
}

const WISDOM: Wisdom[] = [
  // 聖書
  {
    tradition: '聖書',
    author: '詩篇 23:1–3',
    quote: '主は私の羊飼い。私には乏しいことがない。主は私を緑の牧場に伏させ、いこいの水のほとりに導かれる。主は私のたましいを生き返らせ、御名のために、私を義の道に導かれる。',
    reflection: '今日あなたが直面する試練も、嵐の後に来る静けさを知っている羊飼いが見守っています。乏しいことがないという確信は、外部の状況ではなく、内なる信頼から生まれます。',
    action: '今日、5分間だけ静かに座り、自分が今持っているものを一つひとつ数えてみてください。感謝の視点が、一日のトーンを変えます。',
  },
  {
    tradition: '聖書',
    author: '箴言 3:5–6',
    quote: '心を尽くして主に拠り頼め。自分の悟りに頼るな。あなたの行く道すべてにおいて、主を認めよ。そうすれば、主はあなたの道をまっすぐにされる。',
    reflection: '「自分の悟りに頼るな」という言葉は、完璧な計画よりも開かれた心を大切にすることを教えています。最善の道は、しばしば予期せぬ方向から現れます。',
    action: '今日取り組む大切なことを一つ選び、その結果への執着を手放して行動してみてください。プロセスを丁寧に生きることに集中しましょう。',
  },
  {
    tradition: '聖書',
    author: 'フィリピ 4:11–13',
    quote: '私はどんな境遇にあっても満足することを学んだ。貧しくあることも知っており、豊かであることも知っている。あらゆる状況で、満腹することも飢えることも、富むことも乏しいことも、そのすべてに秘訣を心得ている。私を強くしてくださる方によって、私にはすべてのことができる。',
    reflection: '「学んだ」という動詞が鍵です。満足は生まれつきの資質ではなく、毎日少しずつ培われる技術です。今日という一日も、その学びの場です。',
    action: '今日、不満や欠如を感じた瞬間を記録し、その裏にある「満たされたい本質的な望み」を一言で書き留めてみてください。',
  },
  {
    tradition: '聖書',
    author: 'ローマ 8:28',
    quote: '神を愛する人々、すなわち、神のご計画に従って召された人々のためには、すべてのことが協力して益をもたらすことを、私たちは知っています。',
    reflection: 'すべてが「益をもたらす」とは、すべてが快適であるという意味ではありません。困難でさえも、長い視点で見れば成長の素材になるという深い信頼の言葉です。',
    action: '最近うまくいかなかった出来事を一つ思い出し、そこから得られた気づきや成長を三つ書き出してみてください。',
  },
  {
    tradition: '聖書',
    author: 'マタイ 5:3–5',
    quote: '心の貧しい人たちは幸いです。天の御国はその人たちのものだから。悲しむ人たちは幸いです。その人たちは慰められるから。柔和な人たちは幸いです。その人たちは地を受け継ぐから。',
    reflection: '「心の貧しい人」とは、自分の限界を知り、何かより大きなものを必要としていると認める謙虚な人のことです。その開かれた器にこそ、本物が注がれます。',
    action: '今日、誰かの話を最後まで遮らずに聞いてみてください。「理解しようとする聞き方」が、あなたの柔和さを育てます。',
  },

  // ギリシャ哲学
  {
    tradition: 'ギリシャ哲学',
    author: 'ソクラテス',
    quote: '汝自身を知れ。よく生きることは、よく考えることから始まる。吟味されない人生は、生きるに値しない。',
    reflection: '自己知識は一度の発見ではなく、毎朝新たに問い直す習慣です。昨日の自分と今日の自分はすでに異なっています。その変化を丁寧に観察することが哲学の出発点です。',
    action: '今日の終わりに「今日の自分は何を恐れていたか」「何を避けていたか」を正直に一行書いてみてください。',
  },
  {
    tradition: 'ギリシャ哲学',
    author: 'アリストテレス',
    quote: '卓越とは行為ではなく、習慣である。私たちは繰り返し行うことで決まる。だとすれば、卓越とは行為ではなく習慣なのだ。',
    reflection: '才能は可能性であり、習慣は現実です。今日の小さな選択が積み重なって、一年後の自分になります。大きな変革より、今日の一つの良い習慣を選びましょう。',
    action: '今日から始められる「5分以内でできる良い習慣」を一つ決め、今すぐカレンダーに予定を入れてください。',
  },
  {
    tradition: 'ギリシャ哲学',
    author: 'マルクス・アウレリウス（自省録）',
    quote: '朝、床から起き上がるのが億劫に感じられたとき、こう思え。私は人として為すべき仕事をするために起きる。私はこのために生まれ、このためにやってきた。',
    reflection: '皇帝でありながら毎朝自分に言い聞かせる必要があった。その誠実さが2000年後の私たちを励ます。偉大さとは完璧さではなく、日々の自己への約束を守ることです。',
    action: '今日の「これだけは必ずやる」ことを朝のうちに一つ決め、就寝前にそれが完了したか確認してください。',
  },
  {
    tradition: 'ギリシャ哲学',
    author: 'エピクテトス（エンキリディオン）',
    quote: 'ものごとは人を悩ませるのではない。ものごとに対する人の考え方が人を悩ませるのだ。自分の力の及ぶことと及ばないことを区別し、及ぶことにのみ集中せよ。',
    reflection: '奴隷から哲学者へ。エピクテトスは外的な自由をすべて奪われても、内的な自由は誰にも奪えないことを生き証明しました。今日あなたを悩ませているものは、どちら側ですか？',
    action: '今日の悩みを「自分でコントロールできるもの」と「できないもの」に分けてリストアップし、前者だけに全精力を注いでください。',
  },

  // 欧州思想
  {
    tradition: '欧州思想',
    author: 'ヨハン・ヴォルフガング・フォン・ゲーテ',
    quote: '知るだけでは不十分だ、実践しなければならない。望むだけでは不十分だ、実行しなければならない。',
    reflection: '知識と意志は橋の両岸です。橋を渡るのは行動だけです。今日、あなたが「わかっているけどやっていないこと」はなんですか？',
    action: '長らく「いつかやろう」と思っていたことの最初の一歩だけを、今日中に踏み出してください。完成ではなく開始が目標です。',
  },
  {
    tradition: '欧州思想',
    author: 'フリードリヒ・ニーチェ',
    quote: '生きる理由を持つ者は、いかなる困難にも耐えられる。',
    reflection: 'ニーチェが語ったのは楽観主義ではなく、目的論です。あなたが今している仕事・営み・関係が、誰かの、何かの役に立っているという確信が、嵐の中でも舵を握らせてくれます。',
    action: '今日、自分が「なぜこれをしているのか」を紙に書いてみてください。その理由が、今日一日の燃料になります。',
  },
  {
    tradition: '欧州思想',
    author: 'ウィンストン・チャーチル',
    quote: '成功とは、情熱を失わずに失敗から失敗へと歩み続ける能力のことだ。',
    reflection: '第二次世界大戦最大の危機の中で語られた言葉です。失敗を避ける人生ではなく、失敗に動じない心を育てることが、真のレジリエンスです。',
    action: '最近うまくいかなかった挑戦を一つ振り返り、「次回はどう変えるか」を具体的に一行書いてください。そして次の挑戦の日付を決めてください。',
  },
  {
    tradition: '欧州思想',
    author: 'ブレーズ・パスカル',
    quote: '人間は考える葦である。宇宙は人間を飲み込めるが、人間は宇宙を理解できる。この理解の中に人間の尊厳がある。',
    reflection: 'どんなに小さく感じる日も、あなたは意味を作り出せる唯一の存在です。問いを持つこと、考えること——それ自体が人間の偉大さです。',
    action: '今日、一つの問いを立ててください。答えを求めるのではなく、問いとともに一日を過ごしてみてください。',
  },
  {
    tradition: '欧州思想',
    author: 'イマヌエル・カント',
    quote: '頭上の星空と心の中の道徳律——この二つは、熟考すればするほど、新たなそして高まる驚嘆と崇敬の念で満たしてくれる。',
    reflection: '宇宙の広大さと自分の内なる良心は、同じくらい神秘的です。今日あなたが下す倫理的な選択は、宇宙と同じ重さを持っています。',
    action: '今日、小さな不正直や手抜きをしたくなった瞬間に気づき、より誠実な選択を意識的にしてみてください。',
  },

  // 中国哲学
  {
    tradition: '中国哲学',
    author: '孔子（論語）',
    quote: '学びて思わざれば則ち罔し（くらし）、思いて学ばざれば則ち殆（あやう）し。',
    reflection: '学習と思索はセットです。読むだけでは表面、考えるだけでは根拠がない。今日学んだことを自分の言葉で語れるようになるまで咀嚼しましょう。',
    action: '今日読んだ・聞いた・学んだことを、夜寝る前に誰かに話せるレベルで要約し、自分の言葉で一段落書き留めてください。',
  },
  {
    tradition: '中国哲学',
    author: '老子（道徳経）',
    quote: '上善は水の如し。水は万物を利して争わず、衆人の悪む所に処る。故に道に幾し。',
    reflection: '水は最も柔らかく、最も強い。争わず、低い場所に向かいながら、最終的に岩をも穿ちます。今日の柔軟さが、長期の強さになります。',
    action: '今日、誰かと意見が違ったとき、すぐに反論するのではなく、まず相手の立場を完全に理解しようとしてみてください。',
  },
  {
    tradition: '中国哲学',
    author: '荘子',
    quote: '昔者、荘周、夢に胡蝶と為る。蝴蝶として自得たり。周と為るを知らず……今、周は覚めたり。知らず、周の蝴蝶と為れる夢か、蝴蝶の周と為れる夢か。',
    reflection: '胡蝶の夢が問うのは「現実とは何か」という哲学的な問いだけでなく、「あなたは今、何者として生きているか」という問いでもあります。',
    action: '今日、一つの「当たり前」を疑ってみてください。なぜそれをそうしているのか、別の視点から考えてみましょう。',
  },
  {
    tradition: '中国哲学',
    author: '孟子',
    quote: '天の将に大任を是の人に降さんとする也、必ず先ず其の心志を苦しめ、其の筋骨を労せしめ、其の体膚を餓やかしめ……',
    reflection: '大きな役割を担う人には、必ず試練が先に来ます。今あなたが経験している困難は、準備の過程かもしれません。諦めることと、鍛えられることは、紙一重です。',
    action: '今あなたが最も困難だと感じていることに、「これは自分を鍛えている」というラベルを貼り直してみてください。',
  },

  // インド哲学
  {
    tradition: 'インド哲学',
    author: 'バガヴァッド・ギーター（2:47）',
    quote: '行為そのものにのみ、あなたには権利がある。その果実には決してない。行為の果実を動機とするな。しかし無行為に執着するな。',
    reflection: '結果は自分でコントロールできない。でも今の選択と行動はできる。その真実を知ることが、執着から解放される第一歩です。',
    action: '今日取り組む一つのことについて、「結果がどうあれ、最善の行為をする」と心に決めてから始めてみてください。',
  },
  {
    tradition: 'インド哲学',
    author: 'ブッダ（ダンマパダ）',
    quote: 'あなたを除いて、あなたを傷つけられる者はいない。あなたを除いて、あなたを助けられる者もいない。自灯明・法灯明——自らを燈明とせよ。',
    reflection: '最後の教えとして語られた言葉です。外に光を求めるのをやめて、内なる本質に帰ること。その旅は毎朝始まります。',
    action: '今日10分間、何も生産しないで、ただ静かに自分の呼吸を観察してみてください。内なる光に接続する時間です。',
  },
  {
    tradition: 'インド哲学',
    author: 'マハトマ・ガンジー',
    quote: 'あなたが世界に見たいと思う変化に、あなた自身がなりなさい。弱さに許しはない。許しは強者の属性だ。',
    reflection: '変革は外に向けたエネルギーではなく、まず自分の内側からの一致から始まります。今日あなたが社会に望む姿を、自分が体現していますか？',
    action: '今日、自分が社会に望む「良い変化」を一つ選び、それを今日の自分の行動で表現してみてください。',
  },
  {
    tradition: 'インド哲学',
    author: 'ラビンドラナート・タゴール',
    quote: '眠っている間に夢を見るのが幸せなのではない。眠りから覚めて夢を追い続けるのが幸せなのだ。',
    reflection: '現実の中で理想を生き続けることの難しさと美しさ。毎朝目覚めて、また夢に向かって歩き出す——それがあなたの物語です。',
    action: '今日、あなたの「大きな夢」に向けた、たった一つの具体的な行動を選んでください。規模は関係ありません。',
  },

  // 日本の偉人
  {
    tradition: '日本の偉人',
    author: '松下幸之助',
    quote: '素直な心になりなさい。素直な心とは、自分自身に何も飾らない、ありのままの心のことである。そういう心になれば、物事の実相がよく見え、何をなすべきかが、自ずとわかってくる。',
    reflection: 'パナソニックを一代で築いた人物が最も大切にしたのは、能力でも戦略でも資本でもなく、「素直な心」でした。先入観のない視点が、最大の資本です。',
    action: '今日、自分が「絶対正しい」と思っていることを一つ選び、反対の立場からも真剣に考えてみてください。',
  },
  {
    tradition: '日本の偉人',
    author: '渋沢栄一（論語と算盤）',
    quote: '道徳と経済は合一すべきである。利益を求めることと、善を行うことは、決して矛盾しない。誠実な商いこそが、永続する繁栄の根本である。',
    reflection: '近代日本資本主義の父が示したのは、利益と倫理の両立という普遍的な真理です。今日あなたが行う取引や決断は、道義にかなっていますか？',
    action: '今日の仕事の中に「誰かが喜ぶ」要素を意識的に一つ加えてみてください。価値と価格の両方を意識しましょう。',
  },
  {
    tradition: '日本の偉人',
    author: '西郷隆盛',
    quote: '敬天愛人。天を敬い、人を愛する。命もいらぬ、名もいらぬ、官位も金もいらぬ人でなければ、艱難をともにして国家の大業は成し遂げられぬ。',
    reflection: '自己利益を超えた大きな目的のために生きること。それが真のリーダーシップです。今日あなたは、何のために仕事をしていますか？',
    action: '今日、自分のためではなく、誰か特定の人のためになることを一つだけ意識してやってみてください。',
  },
  {
    tradition: '日本の偉人',
    author: '宮本武蔵（五輪書）',
    quote: '千日の稽古を鍛とし、万日の稽古を錬とす。よく吟味すべきものなり。',
    reflection: '3年の基礎、30年の熟達。どんな道も、一万時間の真剣な反復なしには深まりません。今日の稽古が、10年後の自分を作ります。',
    action: '今日、最も重要なスキルの鍛錬に、集中した30分を意識的に確保してください。量より質の深い反復を。',
  },
  {
    tradition: '日本の偉人',
    author: '福沢諭吉（学問のすゝめ）',
    quote: '天は人の上に人を造らず、人の下に人を造らずと言えり。されども今、広くこの人間世界を見渡すに、賢い人あり、愚かな人あり……その差はただ学ぶと学ばざるとによりて出来るものなり。',
    reflection: '生まれた環境は選べない。でも学ぶかどうかは選べます。今日あなたが選ぶ一冊、一つの問い、一つの経験が、格差を生む側になるか縮める側になるかを分けます。',
    action: '今日15分、自分が弱いと感じる分野の本を読むか、その分野に詳しい人に話を聞いてみてください。',
  },

  // Vipassana・仏教
  {
    tradition: 'Vipassana',
    author: '仏教の教え（無常）',
    quote: 'この瞬間のみが真に存在する。過去は記憶であり、未来は想像である。今この息吹の中に、全宇宙が宿っている。',
    reflection: '焦りも後悔も、今ここにはありません。今のあなたの体、呼吸、感覚——これだけが現実です。その現実の豊かさに気づくことが、Vipassanaの入口です。',
    action: '今日3回、作業の合間に立ち止まり、5秒間だけ呼吸に意識を向けてください。その瞬間、あなたは完全に今にいます。',
  },
  {
    tradition: 'Vipassana',
    author: '仏教の教え（慈悲・メッタ）',
    quote: '自分自身に慈悲を。あなたは全宇宙の中で、あなたの愛と慈悲に最も値する存在だ。自分を愛せる人だけが、本当に他者を愛せる。',
    reflection: 'まず自分への慈しみ（自慈悲）。次に愛する人へ。そして中立な人へ。最後には難しい人へと広げていく——メッタ瞑想の輪は、ここから始まります。',
    action: '今日、自分に対して使っている言葉を観察してください。批判的な内なる声があれば、親友に言うように言い直してみてください。',
  },
  {
    tradition: 'Vipassana',
    author: '仏教の教え（執着と解放）',
    quote: 'すべての苦しみは、無常なるものへの執着から生まれる。執着を手放すことは諦めではない。それは流れとともに、より深く生きることである。',
    reflection: '川の流れに逆らって泳ぐと疲れます。流れを感じながら、泳ぐ方向を選ぶ。それが執着を手放した後に現れる自由です。',
    action: '今日、手放せていない「こうあるべき」という思いを一つ見つけ、それを紙に書いて手放す儀式をしてみてください。',
  },
  {
    tradition: 'Vipassana',
    author: 'S.N. ゴエンカ',
    quote: '観察せよ、反応するな。感覚が生じたとき、ただそれを見つめよ。嫌悪も渇愛もなく、ただ観察の中に、真の自由がある。',
    reflection: '10日間の沈黙の中で師が繰り返した言葉。反応から応答へ。刺激と反応の間に一瞬の空間を作ること——それが修行の全てです。',
    action: '今日、誰かの言葉や行動に反応したくなった瞬間、まず3秒待ってから行動してみてください。その3秒が人生を変えます。',
  },
  {
    tradition: 'Vipassana',
    author: '仏教の教え（四無量心）',
    quote: '慈・悲・喜・捨。すべての生命の幸せを願い、苦しみに共感し、喜びを共に喜び、そして偏りなく受け入れる——これが解脱への道である。',
    reflection: '四無量心は感情のリストではなく、存在の質です。今日あなたが出会う一人一人に、この四つの眼差しを向けてみてください。',
    action: '今日、難しいと感じる人を一人思い浮かべ、「この人も苦しみを持つ人間だ」と心の中で唱えながら接してみてください。',
  },
];

// ── HTML email builder ────────────────────────────────────────────────────────
function buildMorningHtml(wisdom: Wisdom, dateStr: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Compass</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif;color:#e0e0e0;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);">
    <tr>
      <td style="padding:48px 52px 40px;">
        <div style="font-size:11px;color:#818cf8;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:10px;">
          🧭 &nbsp; M O R N I N G &nbsp; C O M P A S S
        </div>
        <div style="font-size:34px;font-weight:200;color:#f0f0f0;line-height:1.2;letter-spacing:-0.02em;">
          ${dateStr}
        </div>
        <div style="margin-top:12px;display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:100px;padding:5px 16px;">
          <span style="font-size:12px;color:#a5b4fc;">${wisdom.tradition}</span>
          <span style="color:#4b5563;margin:0 8px;">·</span>
          <span style="font-size:12px;color:#9ca3af;">${wisdom.author}</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Quote -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
    <tr>
      <td style="padding:44px 52px;">
        <div style="border-left:3px solid #6366f1;padding-left:28px;">
          <div style="font-size:11px;color:#6366f1;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">
            ✦ &nbsp; Today's Wisdom
          </div>
          <p style="font-size:20px;font-weight:300;color:#e8e8e8;line-height:1.9;margin:0;letter-spacing:0.01em;">
            「${wisdom.quote}」
          </p>
          <p style="font-size:13px;color:#818cf8;margin:20px 0 0;font-style:italic;">
            — ${wisdom.author}
          </p>
        </div>
      </td>
    </tr>
  </table>

  <!-- Reflection -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#151515;border-top:1px solid #1f1f1f;">
    <tr>
      <td style="padding:36px 52px;">
        <div style="font-size:11px;color:#8b5cf6;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:14px;">
          ✨ &nbsp; 今日の一省
        </div>
        <p style="font-size:15px;color:#9ca3af;line-height:1.95;margin:0;">
          ${wisdom.reflection}
        </p>
      </td>
    </tr>
  </table>

  <!-- Action -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-top:1px solid #1f1f1f;">
    <tr>
      <td style="padding:36px 52px;">
        <div style="font-size:11px;color:#818cf8;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:14px;">
          🎯 &nbsp; 今日のアクション
        </div>
        <div style="background:#0d0d0d;border:1px solid #2d2d4e;border-radius:12px;padding:22px 26px;">
          <p style="font-size:15px;color:#e0e0e0;line-height:1.85;margin:0;font-weight:500;">
            ${wisdom.action}
          </p>
        </div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-top:1px solid #1a1a1a;">
    <tr>
      <td style="padding:28px 52px;text-align:center;">
        <p style="font-size:12px;color:#374151;margin:0;letter-spacing:0.05em;">
          🧭 &nbsp; Life Compass &nbsp;·&nbsp; 自分の内なる羅針盤を信じて
        </p>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Gmail send helper ────────────────────────────────────────────────────────
function buildRawHtmlEmail(to: string, subject: string, html: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  const message = [
    `To: ${to}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = process.env.REMINDER_TO_EMAIL ?? '';
  if (!to) {
    return NextResponse.json({ error: 'REMINDER_TO_EMAIL not set' }, { status: 500 });
  }

  try {
    // Pick today's wisdom (changes each day)
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jst = new Date(now.getTime() + jstOffset);
    const dayOfYear = Math.floor(
      (jst.getTime() - new Date(jst.getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    const wisdom = WISDOM[dayOfYear % WISDOM.length];

    const dateStr = jst.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const subject = `🧭 Morning Compass — ${dateStr}`;
    const html = buildMorningHtml(wisdom, dateStr);

    const gmail = getGmailClient();
    const raw = buildRawHtmlEmail(to, subject, html);
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

    return NextResponse.json({
      ok: true,
      to,
      tradition: wisdom.tradition,
      author: wisdom.author,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
