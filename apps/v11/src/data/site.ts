// v11 トップページの原稿。部品は文言を持たず、ここからページ経由で渡す。
// - 構成と見出しはオーナーのデザイン画像（PC・スマホ）に合わせる
// - 料金・期間・会社情報は現行サイトに載っている内容だけを使う
// - 実績の数値・顧客名・お客様の声は書かない

export type ServiceId = 'ai' | 'automation' | 'web-dx' | 'inquiry';

export const site = {
  name: 'ANOM',
  title: 'ANOM｜頭の中にあるその悩みを、AIとDXで前に進める。',
  description:
    '「何をDXしたいか分からない」「AIを使ったらどうなる？」その声を起点に、AI導入支援・業務自動化・Web/DX設計・問い合わせ導線改善まで伴走するANOMのサイト（確認用 v11）。',
  email: 'info@anom-ai.com',
  privacyUrl: 'https://anom-ai.com/privacy.html',
};

export const nav = {
  label: 'サイト内メニュー',
  items: [
    { label: '課題', href: '#worries' },
    { label: 'できること', href: '#solution' },
    { label: 'サービス', href: '#services' },
    { label: '理念', href: '#philosophy' },
    { label: 'お問い合わせ', href: '#contact' },
  ],
  cta: { label: '無料相談をする', href: '#contact' },
  menuOpen: 'メニューを開く',
  menuClose: 'メニューを閉じる',
  menuTitle: 'メニュー',
};

/**
 * ヒーローの悩みチップ。service はタップしたときに表示するサービス。
 * parts は改行してよい位置で区切った文言（チップの中ではこの区切りでだけ折り返す）
 */
const worryList: { id: string; parts: string[]; service: ServiceId }[] = [
  { id: 'dx-unclear', parts: ['何をDXしたいか', '整理できない'], service: 'web-dx' },
  { id: 'ai-change', parts: ['AIを使ったら', '何が変わる？'], service: 'ai' },
  { id: 'automate', parts: ['これを', '自動化したい'], service: 'automation' },
  { id: 'inquiry-time', parts: ['問い合わせ対応に', '時間がかかる'], service: 'inquiry' },
  { id: 'person-dependent', parts: ['属人化を', 'なくしたい'], service: 'inquiry' },
  { id: 'documents', parts: ['資料作成を', '効率化したい'], service: 'automation' },
  { id: 'complex', parts: ['社内業務が', '煩雑'], service: 'ai' },
  { id: 'staffing', parts: ['人手不足を', '補いたい'], service: 'automation' },
  { id: 'where-start', parts: ['まず何から', '始めるべき？'], service: 'ai' },
];

export const worries = worryList.map((w) => ({ ...w, label: w.parts.join('') }));

/** 最初に選ばれている悩み（デザイン画像と同じ「これを自動化したい」） */
export const initialWorry = 'automate';

export const hero = {
  eyebrow: 'その悩みを、ただの悩みで終わらせない。',
  title: ['頭の中にある', 'その悩みを、'],
  accent: ['AIとDXで', '前に進める。'],
  /** 行ごと・改行してよい位置ごとに区切った文言 */
  lead: [
    ['「何をDXしたいか分からない」', '「AIを使ったらどうなる？」', '「これを自動化したい」'],
    ['──その声を起点に、', '解決策を設計します。'],
  ],
  primary: { label: '無料相談をする', href: '#contact' },
  secondary: { label: '課題からサービスを見る', href: '#services' },
  chipsLabel: 'よくある悩み（選ぶと対応するサービスを表示します）',
  hint: '悩みを選ぶと、対応サービスへ移動',
  previewLabel: 'この悩みに対応するサービス',
  previewLink: 'サービスの詳細を見る',
  pause: '動きを止める',
  play: '動きを再開する',
  /** 背景でぼんやり漂う言葉（装飾。読み上げない） */
  ambient: [
    '請求書づくりを自動化したい',
    '会議の記録をまとめたい',
    '情報が散らばっている',
    '紙の書類が多い',
    '同じ質問に何度も答えている',
    'ツールを使いこなせていない',
    'データ入力を減らしたい',
    '日報をまとめたい',
  ],
};

export const solution = {
  id: 'solution',
  title: 'その悩みを、',
  accent: '実装できる解決策へ。',
  lead: '現場の課題を丁寧に整理し、AI・DXの力で「使える仕組み」として実装します。',
  steps: [
    { no: '01', title: '課題を言語化', body: '現場の悩みを整理し、改善テーマを明確化します。', icon: 'chat' },
    { no: '02', title: 'AI・DXを設計', body: '目的に合った自動化・導入方法を提案します。', icon: 'bulb' },
    { no: '03', title: '運用まで伴走', body: '導入後も使われる仕組みとして定着支援します。', icon: 'team' },
  ] as const,
};

export type Service = {
  id: ServiceId;
  anchor: string;
  name: string;
  /** サービス一覧の説明 */
  summary: string;
  /** ヒーローの「この悩みに対応するサービス」に出す説明 */
  pitch: string;
  tags: string[];
  forWhom: string[];
  offers: string[];
  price: string;
};

export const services = {
  id: 'services',
  title: 'サービス内容',
  note: '悩みから選んだキーワードに対応するサービスへ移動できます。',
  expandAll: 'サービスの詳細をすべて見る',
  collapseAll: 'サービスの詳細をすべて閉じる',
  tagLabel: '対応する悩み',
  open: '詳しく見る',
  close: '閉じる',
  forWhomLabel: 'こんな方へ',
  offersLabel: '主な支援内容',
  priceLabel: '料金の目安',
  consult: 'このサービスについて相談する',
  promise: '初回のご相談・診断は無料です。お見積もりには作業範囲をはっきり書き、先に合意していない追加費用はあとから出しません。',
  items: [
    {
      id: 'ai',
      anchor: 'service-ai',
      name: 'AI導入支援',
      summary: '生成AIをはじめとした最適なAI活用を、業務に合わせて設計・導入します。',
      pitch: '業務に合ったAIの使い方を設計し、導入から定着まで支えます。',
      tags: ['AIを使ったら何が変わる？', 'まず何から始めるべき？', '社内業務が煩雑'],
      forWhom: ['何から手を付けるべきか、整理したい', 'ツールは入れたが、活用が進んでいない'],
      offers: ['現状診断（DX・AI準備度調査）', 'ツール選定の中立アドバイス', 'AIツール導入支援（設定・研修）', '導入後の定着サポート'],
      price: '月額顧問は月5万円からが目安です。プロジェクト型は範囲と期間を決めて個別にお見積もりします。',
    },
    {
      id: 'automation',
      anchor: 'service-automation',
      name: '業務自動化',
      summary: '定型業務の自動化で、生産性の高い組織へ。',
      pitch: '繰り返し業務を自動化し、コア業務に集中できる環境を構築します。',
      tags: ['これを自動化したい', '資料作成を効率化したい', '人手不足を補いたい'],
      forWhom: ['日報や書類づくりに時間を取られている', '同じ作業を毎回手作業でくり返している'],
      offers: [
        '業務フロー改善設計',
        '定型業務の自動化（書類仕事・バックオフィスなど）',
        '既製ツールで足りない部分は、AIを組み込んだ小さな仕組みで開発',
        '業務手順やツールの使い方のマニュアル作成',
      ],
      price: '範囲と期間、成果物を決めて個別にお見積もりします。新しいツールを勧める前に、いま使っているツールで眠っている機能から確かめます。',
    },
    {
      id: 'web-dx',
      anchor: 'service-web-dx',
      name: 'Web / DX設計',
      summary: '業務・顧客体験を見据えたWeb活用・DX戦略を設計します。',
      pitch: '業務と顧客体験を見据えて、Web活用とDXの進め方を設計します。',
      tags: ['何をDXしたいか整理できない', '新しい仕組みを作りたい'],
      forWhom: ['何をDXすればいいか、まだ言葉にできていない', 'サイトが古い、または持っていない'],
      offers: [
        'DXの進め方・ツール・体制の設計',
        'Web制作・運用（LP・コーポレートサイト）',
        '保守・管理（更新・トラブル対応・解析にもとづく改善）',
        'このサイトも、ANOMが設計から実装まで制作しています',
      ],
      price: 'Webサイト制作は18万円からが目安です。DXの設計は内容を伺って個別にお見積もりします。',
    },
    {
      id: 'inquiry',
      anchor: 'service-inquiry',
      name: '問い合わせ導線改善',
      summary: '問い合わせ対応を効率化し、顧客満足度と業務効率を両立します。',
      pitch: '問い合わせ対応を効率化し、顧客満足度と業務効率を両立します。',
      tags: ['問い合わせ対応に時間がかかる', '属人化をなくしたい', '対応品質を上げたい'],
      forWhom: ['問い合わせ対応と定型文書づくりに時間を取られる', '担当者によって対応の質がばらつく'],
      offers: [
        'AIによる問い合わせの一次対応',
        '回答文・文書の下書きの自動化',
        '問い合わせフォームと導線の設計・改善',
        '対応手順のマニュアル化で、属人化を減らす',
      ],
      price: '内容を伺って個別にお見積もりします。',
    },
  ] satisfies Service[],
};

export const philosophy = {
  id: 'philosophy',
  label: '理念',
  /** 行ごと・改行してよい位置ごとに区切った文言 */
  quote: [['テクノロジーを、'], ['分かる・', '使える・', '成果につながる形で'], ['社会実装する。']],
  body: [
    '私たちANOMは、AI・DXを特別なものではなく、すべての企業が使いこなし、成果につなげられる現実的な手段として社会に実装します。',
    '複雑なテクノロジーを分かりやすく、使いやすく、そして確かな成果へ。',
    '人と組織の可能性を広げるパートナーであり続けます。',
  ],
};

export const contact = {
  id: 'contact',
  title: 'お問い合わせ',
  lead: ['まずは、', 'お気軽に', 'ご相談ください。'],
  body: '貴社の課題をヒアリングし、最適なご提案をいたします。課題が整理できていない段階でも問題ありません。',
  free: '初回のご相談・診断は無料です（訪問またはオンライン・30〜45分）。',
  required: '必須',
  optional: '任意',
  fields: {
    name: { label: 'お名前', placeholder: '山田 太郎', error: 'お名前を入力してください。' },
    company: { label: '会社名・屋号', placeholder: '株式会社example', hint: '個人の方は空欄で大丈夫です。' },
    email: {
      label: 'メールアドレス',
      placeholder: 'taro@example.com',
      error: 'メールアドレスを「taro@example.com」の形で入力してください。',
    },
    worries: { legend: '気になっていること（いくつでも）', hint: '上で選んだ悩みは、最初から選ばれています。' },
    message: {
      label: 'ご相談内容',
      placeholder: '現在の課題やご相談内容をご記入ください（まだ整理できていなくても大丈夫です）',
    },
  },
  privacy: { before: '', link: 'プライバシーポリシー', after: 'に同意のうえ送信します。' },
  submit: '相談してみる',
  previewNote: '確認用のページのため、入力内容はどこにも送信されません。',
  /** 送信ボタンを押して入力に問題がなかったときの表示 */
  previewDone: '入力内容を確認できました。公開版ではここで送信されます（確認用のため、実際には送信していません）。',
  invalidSummary: '入力内容を確認してください。',
  aside: {
    title: ['まずは課題整理から', 'でもOK'],
    body: '「何から相談すればいいか分からない」という段階でも、お気軽にご相談いただけます。',
    button: '無料で相談する',
  },
  mail: { before: 'フォームが苦手な方は、メールでもどうぞ。', after: '返信は代表本人からお送りします。' },
};

export const bottomBar = {
  label: 'ご相談の入口',
  title: '課題の言語化からご相談ください',
  body: 'AI・DXの専門家が、貴社の状況に合わせて最適な解決策をご提案します。',
  primary: { label: '無料相談・お問い合わせ', href: '#contact' },
  secondary: { label: 'サービスを見る', href: '#services' },
};

export const footer = {
  rows: [
    { term: '屋号', value: 'ANOM（アノム）※法人化準備中' },
    { term: '代表', value: '菊地 隆雅' },
    { term: '所在地', value: '秋田県' },
    { term: '対応エリア', value: '全国（リモート対応）／秋田県内は訪問可' },
    { term: '連絡先', value: 'info@anom-ai.com' },
  ],
  privacy: 'プライバシーポリシー',
  top: 'ページの先頭へ',
  copyright: '© 2026 ANOM',
  previewNote: 'このページは確認用（v11）です。',
};
