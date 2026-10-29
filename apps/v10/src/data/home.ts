// トップページ（/）の原稿。部品は文言を持たず、ここからページ経由で渡す。
// - 掲載前の確認用原稿。実績・数値・料金・お客様の声・未確定の会社情報は書かない
// - 画面デモ・支援のイメージは説明用の見本であり、実案件や稼働中の製品ではない

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
};

export const hero = {
  /** 文節ごとに分け、語の途中で改行しないようにする */
  title: ['技術を、', '仕事の力に。'],
  lead: ['AI・DX支援、Web制作、システム開発。', '無駄を減らし、伝わる形をつくり、人が力を発揮できる仕事へ。'],
  primary: { label: '提供サービスを見る', anchor: 'services' },
  demo: {
    label: '画面デモの切替',
    badge: '説明用デモ',
    views: [
      {
        id: 'ai',
        tab: 'AI・DX',
        title: 'AI・DXの画面イメージ',
        caption: '情報と手順を整理して、仕事を進めやすく。',
        link: { label: 'AI・DX支援を見る', anchor: 'service-ai' },
      },
      {
        id: 'web',
        tab: 'Web',
        title: 'Webの画面イメージ',
        caption: '伝えたいことが届く、使いやすいWebへ。',
        link: { label: 'Web制作を見る', anchor: 'service-web' },
      },
      {
        id: 'system',
        tab: 'システム',
        title: 'システムの画面イメージ',
        caption: '日々の仕事に合った、扱いやすい仕組みへ。',
        link: { label: 'システム開発を見る', anchor: 'service-system' },
      },
    ] satisfies DemoView[],
  },
};

export type ServiceContent = {
  id: string;
  label: string;
  title: string;
  audience: string;
  body: string;
  examples: string[];
  cta: { label: string; field: ConsultField };
  figure: 'ai' | 'web';
};

export const services = {
  eyebrow: 'Services',
  title: '仕事を整える。価値を伝える。',
  intro: '取り組みたいことに合わせて、AI・DX、Web、システム開発をご相談いただけます。',
  audienceLabel: '対象',
  examplesLabel: '相談例',
  examplesNote: '提供範囲を保証するものではありません',
  items: [
    {
      id: 'service-ai',
      label: 'AI・DX支援',
      title: '仕事の無駄を減らし、人が力を発揮できる現場へ。',
      audience: '中小企業の経営者・決裁者、企業の方',
      body: '今の仕事を整理し、AIやデジタルをどこで活かせるか、一緒に考えます。',
      examples: ['手作業を見直したい', '情報を探しやすくしたい', 'AIの活用を考えたい'],
      cta: { label: 'AI・DX支援を相談する', field: 'ai' },
      figure: 'ai',
    },
    {
      id: 'service-web',
      label: 'Web制作・運用保守',
      title: '伝わるWebをつくり、育てていく。',
      audience: '企業、サービス運営者、個人の方',
      body: '伝える内容と使いやすさを整え、制作から運用保守管理まで支援します。',
      examples: ['会社やサービスを伝えたい', 'サイトを見直したい', '公開後の管理も相談したい'],
      cta: { label: 'Web制作・運用保守を相談する', field: 'web' },
      figure: 'web',
    },
  ] satisfies ServiceContent[],
  systemLink: { label: 'システム開発も相談できます', anchor: 'service-system' },
};

export const system = {
  eyebrow: 'System',
  title: '自社の仕事に合う仕組みを、形に。',
  body: '日々の業務や情報の流れに合わせて、必要な画面・機能を考えます。システム開発単独のご相談にも対応します。',
  stepsLabel: '仕組みの流れ（説明図）',
  steps: ['入力する', '整理する', '確認する'],
  examplesLabel: '相談例',
  examplesNote: '提供範囲を保証するものではありません',
  examples: ['情報を一か所で扱いたい', '仕事の状態を確認しやすくしたい'],
  cta: { label: 'システム開発を相談する', field: 'system' as ConsultField },
};

export const examples = {
  eyebrow: 'Example',
  title: 'どんな変化をつくるのか。',
  demoTitle: '問い合わせの情報を、次の仕事につなげる',
  badge: '説明用デモ',
  stages: [
    { title: 'Webで伝える', body: 'サービスの内容と相談の入口を、Webで分かりやすく示します。' },
    { title: '相談を受け取る', body: '届いた相談の内容を、一か所で確認できるようにします。' },
    { title: '対応を整理する', body: '対応の状態を「未確認／対応中／完了」で見分けられるようにします。' },
  ],
  sampleName: 'サンプル案件A',
  sampleButton: '相談する',
  sampleOther: '見本',
  statuses: ['未確認', '対応中', '完了'],
  note: '機能を説明するための画面イメージです。実案件や稼働中の製品ではありません。',
};

export const about = {
  eyebrow: 'Approach',
  title: '無駄を減らし、人の力を活かす。',
  body: [
    '道具を増やす前に、仕事を見直す。',
    '人が力を発揮できる役割と時間をつくり、事業の前進につなげる。',
    '秋田でも関東でも、必要な技術を使える機会を広げていきます。',
  ],
  flowLabel: '目指す流れ',
  flow: ['無駄を減らす', '人や時間を活かす', '売上の向上を目指す'],
};

export const process = {
  eyebrow: 'Process',
  title: '今の状況を聞くところから。',
  steps: [
    { number: '01', title: '聞く', body: '困っていること、実現したいこと、今のやり方を伺います。' },
    { number: '02', title: '整理する', body: '優先順位と取り組む範囲を整理します。' },
    { number: '03', title: '作る・整える', body: '必要な制作や仕組みづくりを進めます。' },
    { number: '04', title: '確かめる', body: '使いながら確認し、次の改善につなげます。' },
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
  title: 'まずは、今のことを聞かせてください。',
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
