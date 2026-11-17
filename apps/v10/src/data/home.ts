// トップページ（/）の原稿。部品は文言を持たず、ここからページ経由で渡す。
// - 2026-11 の大幅改修の仮コピー。掲載前に事実と提供範囲を確認する
// - 実績・数値・料金・お客様の声・未確定の会社情報は書かない
// - 画面デモ・支援のイメージは説明用の見本であり、実案件や稼働中の製品ではない
// 読み順: 冒頭 → 考え方 → 提供サービス（AI・DX／Web／システム開発）→ お悩み別 → 支援のイメージ → ANOMについて → 進め方 → 学び → 相談

/** 相談分野（フォームの選択肢と、サービス欄のボタンから引き継ぐ値） */
export const consultFields = [
  { value: 'ai', label: 'AI・DX支援' },
  { value: 'web', label: 'Web制作・運用保守' },
  { value: 'system', label: 'システム開発' },
  { value: 'other', label: 'その他・まだ決まっていない' },
] as const;
export type ConsultField = (typeof consultFields)[number]['value'];

export type DemoView = {
  id: 'ai' | 'web' | 'system';
  tab: string;
  /** JavaScript 無効時に各パネルの見出しとして出す名前 */
  title: string;
  caption: string;
  link: { label: string; anchor: string };
  /** 画面の見出し（装飾。英字の補助ラベル） */
  screenLabel: string;
  /** 画面の中の3つの部品（装飾）。label は英字の補助ラベル、text は日本語 */
  parts: { label: string; text: string }[];
  /** 画面の左右に浮かぶ小さな札（装飾） */
  notes: { from: { label: string; text: string }; to: { label: string; text: string } };
};

export const hero = {
  /** 英字の補助ラベル（扱う3つの分野）。意味は説明文の日本語で伝える */
  eyebrow: ['AI / DX', 'WEB', 'SYSTEM'],
  /** 文節ごとに分け、語の途中で改行しないようにする */
  title: ['仕事を、', 'もっと自由に。'],
  /** 説明文。外側の配列が広い幅の行、内側の配列が狭い幅の行（書体が変わっても改行位置を変えない） */
  lead: [['AI・DX支援、Web制作、', 'システム開発で、'], ['仕事と事業の可能性を広げる。']],
  primary: { label: 'サービスを見る', anchor: 'services' },
  secondary: { label: '相談する', anchor: 'contact' },
  demo: {
    label: '画面デモの切替',
    badge: '説明用イメージ',
    views: [
      {
        id: 'ai',
        tab: 'AI・DX',
        title: 'AI・DXの画面イメージ',
        caption: '散らばった情報と手順を整理し、仕事に使える流れへ。',
        link: { label: 'AI・DX支援を見る', anchor: 'service-ai' },
        screenLabel: 'ANOM / WORKFLOW',
        parts: [
          { label: 'INPUT', text: '集める' },
          { label: 'ORGANIZE', text: '整理する' },
          { label: 'SHARE', text: '共有する' },
        ],
        notes: {
          from: { label: '現場の情報', text: '必要な形へ整理' },
          to: { label: '仕事に使える', text: '流れと手順' },
        },
      },
      {
        id: 'web',
        tab: 'Web',
        title: 'Webの画面イメージ',
        caption: '伝えたいことを整理し、見る人に届くWebへ。',
        link: { label: 'Web制作・運用保守を見る', anchor: 'service-web' },
        screenLabel: 'ANOM / WEBSITE',
        parts: [
          { label: 'MESSAGE', text: '見出し' },
          { label: 'VISUAL', text: '画像' },
          { label: 'ACTION', text: '導線' },
        ],
        notes: {
          from: { label: '伝えたいこと', text: '強みを言葉に' },
          to: { label: '見る人に届く', text: 'Webサイト' },
        },
      },
      {
        id: 'system',
        tab: 'System',
        title: 'システムの画面イメージ',
        caption: '日々の入力と確認を、一つの扱いやすい画面へ。',
        link: { label: 'システム開発を見る', anchor: 'service-system' },
        screenLabel: 'ANOM / SYSTEM',
        parts: [
          { label: 'INPUT', text: '入力する' },
          { label: 'LIST', text: '整理する' },
          { label: 'CHECK', text: '確認する' },
        ],
        notes: {
          from: { label: '日々の入力', text: '一か所に集める' },
          to: { label: '状況が分かる', text: '業務の画面' },
        },
      },
    ] satisfies DemoView[],
  },
};

export const philosophy = {
  eyebrow: 'Philosophy',
  /** 強調（スクロールに合わせて下線が伸びる部分）は emphasis。配列の区切りは文節（ここでだけ折り返す） */
  title: { before: '無駄を減らし、', emphasis: ['人が', '力を発揮できる'], after: '仕事へ。' },
  body: [
    '散らばった情報や手間を整理し、技術とデザインで、人が本来の仕事に集中できる状態へつなぎます。',
    '道具を増やす前に、まず今の仕事を見直すところから始めます。',
  ],
  link: { label: '考え方を読む', anchor: 'about' },
};

export type ServiceContent = {
  id: string;
  number: string;
  label: string;
  title: string;
  body: string;
  audience: string;
  examples: string[];
  cta: { label: string; field: ConsultField };
  figure: 'ai' | 'web';
};

export const services = {
  eyebrow: 'Our Services',
  title: '技術とデザインで、仕事の可能性を広げる。',
  intro: '取り組みたいことに合わせて、AI・DX、Web、システム開発をご相談いただけます。',
  audienceLabel: '対象',
  examplesLabel: '相談例',
  examplesNote: '提供範囲を保証するものではありません',
  items: [
    {
      id: 'service-ai',
      number: '01',
      label: 'AI・DX支援',
      title: '業務を整える。',
      body: '日々の仕事を見直し、人が力を発揮できる仕組みへ。今の仕事を整理し、AIやデジタルをどこで活かせるか、一緒に考えます。',
      audience: '中小企業の経営者・決裁者、企業の方',
      examples: ['手作業を見直したい', '情報を探しやすくしたい', 'AIの活用を考えたい'],
      cta: { label: 'AI・DX支援を相談する', field: 'ai' },
      figure: 'ai',
    },
    {
      id: 'service-web',
      number: '02',
      label: 'Web制作・運用保守',
      title: '魅力を伝える。',
      body: '事業の強みを整理し、伝わるWebサイトをつくる。伝える内容と使いやすさを整え、制作から運用保守管理まで支援します。',
      audience: '企業、サービス運営者、個人の方',
      examples: ['会社やサービスを伝えたい', 'サイトを見直したい', '公開後の管理も相談したい'],
      cta: { label: 'Web制作・運用保守を相談する', field: 'web' },
      figure: 'web',
    },
  ] satisfies ServiceContent[],
};

export const system = {
  number: '03',
  label: 'システム開発',
  title: '仕事に合う仕組みをつくる。',
  body: '日々の業務や情報の流れに合わせて、必要な画面・機能を考えます。システム開発単独のご相談にも対応します。',
  stepsLabel: '仕組みの流れ（説明図）',
  steps: ['入力する', '整理する', '確認する'],
  examplesLabel: '相談例',
  examplesNote: '提供範囲を保証するものではありません',
  examples: ['情報を一か所で扱いたい', '仕事の状態を確認しやすくしたい'],
  cta: { label: 'システム開発を相談する', field: 'system' as ConsultField },
};

export type ChallengeContent = {
  id: string;
  title: string;
  support: string;
  link: { label: string; anchor: string };
};

export const challenges = {
  eyebrow: 'Challenges',
  title: 'いま、こんなことに困っていませんか。',
  intro: 'よくあるお悩みから、合う支援を探せます。どれにも当てはまらなくても、ご相談いただけます。',
  supportLabel: 'できる支援',
  items: [
    {
      id: 'challenge-transcribe',
      title: '同じ情報を、何度も書き写している。',
      support: '仕事の流れを整理し、転記や確認の手間を減らせるところを一緒に探します。',
      link: { label: 'AI・DX支援を見る', anchor: 'service-ai' },
    },
    {
      id: 'challenge-message',
      title: '会社の魅力が、うまく伝わっていない。',
      support: '伝えたいことと届けたい相手を整理し、伝わる形のWebをつくります。公開後の更新や管理も相談できます。',
      link: { label: 'Web制作・運用保守を見る', anchor: 'service-web' },
    },
    {
      id: 'challenge-tools',
      title: '今のツールが、仕事に合っていない。',
      support: '日々の業務や情報の流れに合わせて、必要な画面や機能を考えます。',
      link: { label: 'システム開発を見る', anchor: 'service-system' },
    },
  ] satisfies ChallengeContent[],
  contact: { label: 'まずは相談する', anchor: 'contact' },
};

export const examples = {
  eyebrow: 'Work in Action',
  title: 'どんな変化をつくるのか。',
  demoTitle: '問い合わせの情報を、次の仕事につなげる',
  badge: '説明用イメージ',
  before: {
    label: 'Before',
    title: '情報が、あちこちに散らばっている',
    body: 'メール、紙のメモ、表計算に同じ情報が分かれ、確認や書き写しに手間がかかる状態。',
    sources: ['メール', '紙のメモ', '表計算'],
  },
  after: {
    label: 'After',
    title: '一つの画面で、状況が分かる',
    body: '届いた相談を一か所にまとめ、対応の状態を「未確認／対応中／完了」で見分けられる状態。',
  },
  sampleName: 'サンプル案件A',
  sampleOther: '見本',
  statuses: ['未確認', '対応中', '完了'],
  note: '機能を説明するための画面イメージです。実案件や稼働中の製品ではありません。',
  link: { label: '支援の流れを見る', anchor: 'process' },
};

export const about = {
  eyebrow: 'About ANOM',
  title: '場所に関係なく、挑戦できる未来へ。',
  body: [
    '住む場所によって、使える技術や挑戦の機会に差が生まれないように。',
    '秋田と関東の機会の差を小さくしたい。その想いから、技術とデザインで仕事を支えます。',
  ],
  /** 図の中の語（本文と同じ内容を示す装飾。2つの場所と、その間をつなぐもの） */
  figure: { from: '秋田', to: '関東', bridge: '技術とデザイン' },
  flowLabel: '目指す流れ',
  flow: ['無駄を減らす', '人や時間を活かす', '売上の向上を目指す'],
};

export const process = {
  eyebrow: 'Process',
  title: '今の状況を聞くところから。',
  steps: [
    { number: '01', title: '相談', body: '困っていること、実現したいこと、今のやり方を伺います。' },
    { number: '02', title: '現状整理', body: '仕事の流れと課題を整理し、優先順位と取り組む範囲を決めます。' },
    { number: '03', title: '提案', body: '必要な制作や仕組みづくりの進め方をご提案します。' },
    { number: '04', title: '伴走', body: '制作や導入を進め、使いながら確かめて次の改善につなげます。' },
  ],
  note: '進め方や支援範囲は、ご相談内容に合わせてご案内します。',
};

export const learning = {
  eyebrow: 'Learning',
  title: 'AIを、もっと身近な選択肢に。',
  items: [
    { title: '企業向けAIセミナー', body: '企業でAIに触れ、活用を考える機会を構想しています。', status: '構想中' },
    {
      title: 'AI勉強会',
      body: '企業の方から会社員、学生、個人事業主、主婦の方まで、学び合える場を構想しています。',
      status: '構想中',
    },
  ],
  note: '内容や開催時期は未定です。',
  contactNote: '学びの計画についてのご相談は、相談フォームの分野で「その他・まだ決まっていない」をお選びください。',
};

export const contact = {
  eyebrow: 'Contact',
  title: 'まずは、いまの悩みから。',
  body: '取り組む内容がまだ決まっていなくても、ご相談いただけます。困っていることや、実現したいことをお知らせください。',
  previewNotice: '確認用プレビューです。入力内容は送信されません。',
  requiredNote: '「必須」の項目は入力が必要です。「任意」の項目は空欄のままでもかまいません。',
  legend: 'ご相談の内容',
  fields: {
    name: { label: 'お名前', maxlength: 100 },
    company: { label: '会社名・屋号', maxlength: 100 },
    email: { label: 'メールアドレス', maxlength: 254 },
    field: { label: 'ご相談の分野', placeholder: '選択してください' },
    message: { label: 'ご相談内容', hint: '困っていること、実現したいことなど', maxlength: 3000 },
    privacy: {
      label: '個人情報の取り扱いを確認しました',
      hint: '内容は下の「個人情報の取り扱い（確認用案）」をご覧ください。',
      link: '個人情報の取り扱い（確認用案）を読む',
    },
  },
  /** 分野を引き継いだときの状態文（{field} に分野名が入る） */
  handoffMessage: 'ご相談の分野を「{field}」にしました。ほかの入力内容はそのままです。',
  sendNote: '確認用プレビューのため、送信ボタンは押せません。入力内容はどこにも送信されません。',
  sendLabel: '送信する',
  helperLinks: [
    { label: 'サービスに戻る', anchor: 'services' },
    { label: 'ページ上部へ', anchor: 'top' },
  ],
  privacy: {
    title: '個人情報の取り扱い（確認用案）',
    body: '記載内容は確認中です。フォームは送信されません。',
  },
};
